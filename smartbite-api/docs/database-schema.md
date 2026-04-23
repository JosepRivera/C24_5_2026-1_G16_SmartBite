# Esquema de base de datos

SmartBite usa PostgreSQL 16 con Prisma ORM. La fuente de verdad técnica es `prisma/schema.prisma`. Este documento describe la intención de diseño y las decisiones no evidentes en el schema.

---

## Convenciones generales

- Todas las PKs son UUID. Los generados por la BD usan `gen_random_uuid()`. El `id` de `users` es el UUID de Supabase Auth (no se genera en la BD).
- Todos los timestamps usan `TIMESTAMPTZ` (con zona horaria).
- `created_at` tiene `DEFAULT NOW()`. `updated_at` se actualiza automáticamente vía Prisma (`@updatedAt`).
- Las credenciales y API Keys nunca se guardan en texto plano. Las API Keys de dispositivos Kotlin se almacenan como hash bcrypt. Las contraseñas de empleados las gestiona Supabase Auth internamente.
- Los índices, constraints y reglas ON DELETE completos viven en `prisma/schema.prisma`.

---

## Tablas

### users
Perfil de aplicación. Las credenciales y sesiones las gestiona Supabase Auth — esta tabla almacena solo los datos propios del negocio.

| Columna | Tipo | Descripción |
| ------- | ---- | ----------- |
| id | UUID PK | UUID de Supabase Auth. El mismo ID en Supabase y en esta tabla. |
| name | VARCHAR NOT NULL | Nombre completo del empleado |
| username | VARCHAR UNIQUE NOT NULL | Nombre de usuario para iniciar sesión |
| role | role_enum NOT NULL | `OWNER`, `CASHIER`, `WAITER`, `COOK` |
| is_active | BOOLEAN DEFAULT true | Soft delete. Un empleado inactivo no puede iniciar sesión. |
| created_at | TIMESTAMPTZ | Fecha de creación |
| updated_at | TIMESTAMPTZ | Última modificación |

> No hay campo `password` en esta tabla. Las contraseñas las gestiona Supabase Auth. El email del dueño vive en Supabase Auth, no aquí.

**Índices:** `idx_users_role` sobre `role` — filtrado por rol en los Guards.

---

### products
Carta de productos del negocio.

| Columna | Tipo | Descripción |
| ------- | ---- | ----------- |
| id | UUID PK | Generado por la BD |
| name | VARCHAR NOT NULL | Nombre del producto |
| price | DECIMAL(10,2) CHECK > 0 | Precio de venta en soles |
| category | VARCHAR NOT NULL | Categoría (hamburguesas, bebidas, etc.) |
| is_active | BOOLEAN DEFAULT true | Soft delete. El historial de ventas se conserva. |
| created_at / updated_at | TIMESTAMPTZ | Timestamps |

**Índices:** `idx_products_is_active`, `idx_products_category`.

---

### ingredients
Insumos con control de stock.

| Columna | Tipo | Descripción |
| ------- | ---- | ----------- |
| id | UUID PK | |
| name | VARCHAR NOT NULL | Nombre del insumo |
| unit | VARCHAR NOT NULL | Unidad de medida (kg, unidades, litros) |
| stock | DECIMAL(10,3) DEFAULT 0 CHECK ≥ 0 | Stock actual |
| min_stock | DECIMAL(10,3) DEFAULT 0 CHECK ≥ 0 | Umbral mínimo para la alerta OPS-7 |
| cost_per_unit | DECIMAL(10,4) CHECK > 0 | Costo unitario en soles. Requerido para REP-3. |
| created_at / updated_at | TIMESTAMPTZ | |

> `is_low_stock` NO es columna de BD. Es un campo calculado (`stock <= min_stock`) que `IngredientsService` agrega a la respuesta. No se persiste.

**Índices:** `idx_ingredients_stock`. Hay un índice parcial adicional `idx_ingredients_low_stock` (`WHERE stock <= min_stock`) declarado en `prisma/sql/03_indexes.sql` — Prisma no puede expresar índices parciales en el schema.

---

### recipes
Relación producto-insumo. Define cuánto de cada insumo consume una unidad del producto. Sin recetas no funcionan OPS-2 (descuento de stock), IA-3 (MRP) ni REP-3 (rentabilidad).

| Columna | Tipo | Descripción |
| ------- | ---- | ----------- |
| id | UUID PK | |
| product_id | UUID FK → products | |
| ingredient_id | UUID FK → ingredients | |
| quantity | DECIMAL(10,4) CHECK > 0 | Cantidad del insumo por unidad de producto |

**Constraints:** `uq_recipes_product_ingredient` UNIQUE sobre `(product_id, ingredient_id)`.
**ON DELETE:** `product_id` → CASCADE. `ingredient_id` → RESTRICT (no se puede eliminar un insumo en una receta activa).

---

### sales
Registro de cada orden. El `id` funciona como número de ticket del cliente.

| Columna | Tipo | Descripción |
| ------- | ---- | ----------- |
| id | UUID PK | Número de ticket del cliente |
| status | sale_status_enum DEFAULT OPEN | Ver estados abajo |
| total | DECIMAL(10,2) CHECK > 0 | Suma de items. Desnormalizado intencionalmente — se calcula al crear y nunca se edita. |
| table_number | VARCHAR(10) NULL | Número de mesa. VARCHAR para admitir "A3", "Terraza-2". NULL para mostrador. |
| customer_name | VARCHAR NULL | Nombre del cliente, opcional |
| user_id | UUID FK → users | Empleado que registró la orden |
| updated_by | UUID FK → users NULL | Usuario que realizó la última corrección (OPS-6) |
| cancelled_by | UUID FK → users NULL | Usuario que canceló |
| cancelled_at | TIMESTAMPTZ NULL | Fecha de cancelación |
| created_at / updated_at | TIMESTAMPTZ | |

**Estados:** `OPEN`, `PAID_CASH`, `PAID_YAPE`, `PAID_PLIN`, `PAID_AGORA`, `CANCELLED`.

**Regla crítica:** el stock se descuenta **solo al confirmar el cobro** (`PAID_*`), nunca al crear la orden ni al cancelarla.

**Transiciones:**
- `OPEN` → `PAID_*`: OWNER o CASHIER. Descuenta stock.
- `OPEN` → `CANCELLED`: OWNER, CASHIER, o el WAITER que creó la orden.
- `PAID_*` → `CANCELLED`: no permitido (422).
- Corrección OPS-6 (`PATCH /sales/:id`): solo OWNER. Registra `updated_by` y `updated_at`. No revierte stock.

**Índices:** `idx_sales_status`, `idx_sales_table_number`, `idx_sales_user_id`, `idx_sales_created_at`. Hay un índice parcial adicional `idx_sales_open_today` (`WHERE status = 'OPEN'`) en `prisma/sql/03_indexes.sql`.

---

### sale_items
Detalle de productos dentro de una orden.

| Columna | Tipo | Descripción |
| ------- | ---- | ----------- |
| id | UUID PK | |
| sale_id | UUID FK → sales CASCADE | |
| product_id | UUID FK → products RESTRICT | |
| quantity | INT CHECK > 0 | |
| unit_price | DECIMAL(10,2) CHECK > 0 | Precio al momento de la orden. Un cambio de precio futuro no altera el historial. |

---

### expenses
Gastos operativos. Base del cálculo de ganancia en REP-4.

| Columna | Tipo | Descripción |
| ------- | ---- | ----------- |
| id | UUID PK | |
| description | VARCHAR NOT NULL | |
| amount | DECIMAL(10,2) CHECK > 0 | Monto en soles |
| category | VARCHAR NOT NULL | insumos, alquiler, servicios, otros |
| user_id | UUID FK → users RESTRICT | Usuario que registró el gasto |
| created_at | TIMESTAMPTZ | |

> Registrar un gasto no actualiza el stock. Son operaciones separadas: el gasto es un movimiento financiero; el stock es el inventario físico.

---

### cash_closes
Cierre de caja diario. Registro inmutable.

| Columna | Tipo | Descripción |
| ------- | ---- | ----------- |
| id | UUID PK | |
| date | DATE | Fecha del cierre |
| cash_income | DECIMAL(10,2) DEFAULT 0 | Suma de órdenes PAID_CASH del día |
| digital_income | DECIMAL(10,2) DEFAULT 0 | Suma de PAID_YAPE + PAID_PLIN + PAID_AGORA |
| total_income | DECIMAL(10,2) | cash + digital. Desnormalizado intencionalmente. |
| total_expenses | DECIMAL(10,2) DEFAULT 0 | Total de gastos del día |
| net_profit | DECIMAL(10,2) | total_income − total_expenses. Desnormalizado. |
| closed_by | UUID FK → users RESTRICT | |
| parent_close_id | UUID FK → cash_closes NULL | Si es un cierre de ajuste, apunta al original |
| created_at | TIMESTAMPTZ | |

> `total_income` y `net_profit` violan la 3FN intencionalmente para preservar la integridad del registro histórico inmutable. Si los valores base cambian después, el cierre ya generado no se altera.

**Unicidad:** solo un cierre normal por día. Implementado como índice parcial `uq_cash_closes_date_normal` (`WHERE parent_close_id IS NULL`) en `prisma/sql/03_indexes.sql` — los cierres de ajuste no tienen restricción de fecha única.

**Inmutabilidad:** además de no exponer PUT/DELETE en la API, el rol de la aplicación en PostgreSQL no tiene permisos UPDATE ni DELETE sobre esta tabla (`prisma/sql/02_roles.sql`).

---

### payment_notifications
Notificaciones de pago recibidas por el listener Kotlin (PAG-1). Puramente informativas.

| Columna | Tipo | Descripción |
| ------- | ---- | ----------- |
| id | UUID PK | |
| notification_id | VARCHAR UNIQUE NOT NULL | ID único de la notificación. Garantiza idempotencia. |
| amount | DECIMAL(10,2) CHECK > 0 | Monto recibido |
| sender_name | VARCHAR NOT NULL | Nombre del remitente |
| source | payment_source_enum NOT NULL | `YAPE`, `PLIN`, `AGORA` |
| raw_text | VARCHAR(500) NOT NULL | Texto completo de la notificación. Útil para debugging y re-parseo. |
| is_reviewed | BOOLEAN DEFAULT false | El cajero ya atendió esta notificación |
| reviewed_by | UUID FK → users NULL SET NULL | |
| reviewed_at | TIMESTAMPTZ NULL | |
| created_at | TIMESTAMPTZ | |

> No hay FK hacia `sales`. El cajero conecta visualmente la notificación con la orden por nombre, monto y número de mesa. La relación es operativa, no estructural.

---

### device_tokens
Dispositivos Android autorizados para enviar notificaciones de pago.

| Columna | Tipo | Descripción |
| ------- | ---- | ----------- |
| id | UUID PK | |
| name | VARCHAR NOT NULL | Nombre descriptivo ("Celular caja") |
| api_key_hash | VARCHAR UNIQUE NOT NULL | Hash bcrypt de la API Key. Nunca texto plano. |
| is_active | BOOLEAN DEFAULT true | false cuando el dueño revoca el dispositivo |
| registered_by | UUID FK → users RESTRICT | Dueño que registró el dispositivo |
| last_used_at | TIMESTAMPTZ NULL | Última vez que se usó la clave |
| revoked_at | TIMESTAMPTZ NULL | Fecha de revocación |
| created_at | TIMESTAMPTZ | |

> La API Key se retorna en texto plano una sola vez al registrar el dispositivo. Si se pierde, hay que revocar y registrar uno nuevo.

---

### reference_baselines
Promedios de referencia por producto y día de la semana. Se usan en IA-2 cuando hay menos de 14 días de historial propio.

| Columna | Tipo | Descripción |
| ------- | ---- | ----------- |
| id | UUID PK | |
| product_id | UUID FK → products CASCADE | |
| day_of_week | INT CHECK 0-6 | 0 = lunes … 6 = domingo |
| quantity | DECIMAL(10,2) CHECK > 0 | Cantidad de referencia sugerida |
| updated_at | TIMESTAMPTZ | |

**Constraints:** `uq_reference_baselines_product_day` UNIQUE sobre `(product_id, day_of_week)`.

---

### daily_production_plans
Plan de producción diario precalculado por el cron job de las 6 a.m.

| Columna | Tipo | Descripción |
| ------- | ---- | ----------- |
| id | UUID PK | |
| date | DATE | Fecha del plan |
| product_id | UUID FK → products CASCADE | |
| quantity | DECIMAL(10,2) CHECK > 0 | Unidades sugeridas a producir |
| prediction_source | VARCHAR(50) | `holt_winters_with_adjustment`, `holt_winters_base`, `reference_baselines` |
| created_at | TIMESTAMPTZ | |

> `prediction_source` permite al cliente Kotlin mostrar un aviso si el plan no es el óptimo (por falta de historial o fallo de Claude API).

**Constraints:** `uq_daily_production_plans_date_product` UNIQUE sobre `(date, product_id)`.

---

## Vistas SQL

Declaradas en `prisma/sql/01_views.sql` y tipadas en Prisma con `view` para obtener tipado en el cliente. Solo lectura.

| Vista | Uso | Descripción |
| ----- | --- | ----------- |
| `v_daily_summary` | REP-1 Dashboard | Agrega totales del día: ingresos por método de pago, órdenes abiertas y pagadas. Evita JOINs costosos en cada request del dashboard. |
| `v_product_profitability` | REP-3 Rentabilidad | Calcula el margen unitario por producto cruzando precio de venta, recetas e ingredientes. Sin esta vista, REP-3 requiere un JOIN de cuatro tablas en cada consulta. |

---

## Enums

| Enum | Valores |
| ---- | ------- |
| `role_enum` | `OWNER`, `CASHIER`, `WAITER`, `COOK` |
| `sale_status_enum` | `OPEN`, `PAID_CASH`, `PAID_YAPE`, `PAID_PLIN`, `PAID_AGORA`, `CANCELLED` |
| `payment_source_enum` | `YAPE`, `PLIN`, `AGORA` |

---

## Relaciones principales

| Origen | Destino | Tipo | ON DELETE | Descripción |
| ------ | ------- | ---- | --------- | ----------- |
| users | sales | 1 a N | RESTRICT | Un usuario registra muchas órdenes |
| users | expenses | 1 a N | RESTRICT | Un usuario registra muchos gastos |
| users | cash_closes | 1 a N | RESTRICT | Un usuario genera muchos cierres |
| users | device_tokens | 1 a N | RESTRICT | Un dueño registra varios dispositivos |
| sales | sale_items | 1 a N | CASCADE | Una orden tiene uno o más ítems |
| products | sale_items | 1 a N | RESTRICT | Un producto aparece en muchas órdenes |
| products | recipes | 1 a N | CASCADE | Un producto tiene receta con insumos |
| ingredients | recipes | 1 a N | RESTRICT | Un insumo aparece en varias recetas |
| cash_closes | cash_closes | 1 a 1 | RESTRICT | Un ajuste referencia al cierre original |
| products | reference_baselines | 1 a N | CASCADE | Un producto tiene referencias por día |
| products | daily_production_plans | 1 a N | CASCADE | Un producto aparece en varios planes |
| users | payment_notifications | 1 a N | SET NULL | Un cajero revisa muchas notificaciones |
