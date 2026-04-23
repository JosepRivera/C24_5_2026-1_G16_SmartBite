# Funcionalidades del sistema

SmartBite tiene 19 funcionalidades distribuidas en 6 módulos. La columna **Acceso** indica qué roles pueden usar cada funcionalidad. La columna **Voz** indica si el formulario admite entrada por voz (VOZ-1).

---

## Roles del sistema

| Rol | Responsabilidades |
| --- | ----------------- |
| **OWNER** (Dueño) | Acceso completo. Gestiona empleados, productos, insumos, recetas, gastos, reportes, cierres de caja y configuración. |
| **CASHIER** (Cajero) | Cobra órdenes en caja, confirma pagos digitales, consulta notificaciones de Yape/Plin/Ágora. |
| **WAITER** (Mozo) | Registra pedidos desde su dispositivo. No toca dinero ni accede a finanzas. |
| **COOK** (Cocinero) | Consulta pedidos en tiempo real y el plan de producción diaria. Solo lectura. |

---

## Módulo 1 · Autenticación y control de acceso

### AUTH-1 · Autenticación y sesiones
**Acceso:** Todos · **Voz:** No

Supabase Auth gestiona toda la identidad: tokens, sesiones y credenciales. NestJS solo valida el JWT emitido por Supabase.

- Todos los usuarios (dueño y empleados) se autentican con email y contraseña desde el formulario de login. No hay OAuth de terceros (sin Google, sin GitHub).
- El dueño usa su email real. Los empleados usan email sintético `{username}@smartbite.local` creado por el dueño.
- El access token expira en 15 minutos. El refresh token rota en cada uso.
- En desarrollo local se usa Supabase CLI (`supabase start`) — levanta BD + Auth local sin depender de la nube.

**Decisiones de diseño:**
- NestJS no firma JWT. Supabase los firma con RS256 y los publica en su JWKS endpoint.
- No hay `JWT_SECRET` en el proyecto. El `JwtGuard` valida contra el JWKS público de Supabase.
- Sin OAuth externo. Flujo único y predecible para todos los roles: formulario → Supabase → token → API.
- Empleados no tienen recuperación de contraseña por email — usan emails sintéticos. El dueño resetea sus contraseñas desde AUTH-2.

### AUTH-2 · Gestión de empleados y roles
**Acceso:** OWNER · **Voz:** No

El dueño crea, edita y desactiva cuentas de empleados. No existe registro público. Cada cuenta tiene nombre, usuario, contraseña y rol asignado.

- La desactivación es un soft delete: el historial de ventas del empleado se conserva.
- El dueño puede resetear la contraseña de cualquier empleado — esto reemplaza la recuperación por email para empleados.
- Si el dueño pierde acceso a su email, la recuperación debe hacerse desde el dashboard de Supabase.

---

## Módulo 2 · Gestión operativa

### OPS-1 · Productos y precios
**Acceso:** OWNER (escritura), todos (lectura) · **Voz:** No

CRUD de productos con nombre, precio de venta y categoría. Solo el dueño puede crear o modificar precios. La desactivación es un soft delete: el producto deja de aparecer en la carta pero su historial de ventas se conserva.

### OPS-2 · Insumos y stock
**Acceso:** OWNER · **Voz:** Sí (VOZ-1)

CRUD de insumos con nombre, unidad, stock actual, umbral mínimo y costo por unidad. Al confirmar una venta, el sistema descuenta automáticamente los insumos según la receta del producto (OPS-3). Si el stock cae al umbral mínimo, se activa la alerta OPS-7.

El costo por unidad es requerido para calcular márgenes en REP-3.

### OPS-3 · Recetas por producto
**Acceso:** OWNER · **Voz:** No

Cada producto tiene una receta que define los insumos requeridos y sus cantidades exactas. Las recetas son el nexo entre tres módulos: descuento automático de stock (OPS-2), motor MRP (IA-3) y cálculo de rentabilidad (REP-3). Sin recetas, estas tres funcionalidades no operan.

**Ejemplo:** Hamburguesa Simple → 1 pan, 120 g de carne, 2 hojas de lechuga, 20 g de salsa.

### OPS-4 · Registro de ventas con cobro
**Acceso:** OWNER, CASHIER, WAITER · **Voz:** Sí (VOZ-1)

El mozo o cajero registra cada orden. La venta nace con estado `OPEN`. Al crearse, el sistema genera el ticket con el ID único de la orden. El cajero busca la orden por ID, confirma el cobro seleccionando el método de pago y el sistema descuenta el stock.

**Estados de una orden:**
- `OPEN` — registrada, en preparación o lista para cobrar
- `PAID_CASH` — cobrada en efectivo
- `PAID_YAPE` / `PAID_PLIN` / `PAID_AGORA` — cobrada por billetera digital, confirmada manualmente por el cajero
- `CANCELLED` — cancelada antes de cobrar. El stock no se toca.

**Transiciones permitidas:**
- `OPEN` → `PAID_*` — solo OWNER o CASHIER. Descuenta stock según recetas.
- `OPEN` → `CANCELLED` — OWNER, CASHIER, o el WAITER que creó la orden.
- `PAID_*` → `CANCELLED` — no permitido (422).

**Cobro múltiple:** Si un cliente paga por varias personas, el cajero selecciona todas las órdenes correspondientes y las cobra en una sola operación.

### OPS-5 · Gastos y compras
**Acceso:** OWNER · **Voz:** Sí (VOZ-1)

El dueño registra gastos operativos: compras de insumos, alquiler, servicios y otros. Este registro es la base para calcular la ganancia real en el cierre de caja (REP-4). Registrar un gasto no actualiza el stock automáticamente — son operaciones separadas.

**Ejemplo:** "Compré 50 panes por 45 soles" → el sistema pre-rellena monto S/ 45, descripción "panes", fecha de hoy. El dueño confirma.

### OPS-6 · Historial y corrección de ventas
**Acceso:** OWNER (completo), CASHIER y WAITER (solo órdenes OPEN del día) · **Voz:** No

Listado filtrable de todas las ventas. El dueño puede filtrar por empleado, fecha y estado. El dueño puede corregir una venta errónea; la corrección registra quién la realizó y cuándo.

**Campos editables:** productos, cantidades, método de pago. El precio al momento de la venta y la fecha nunca se editan. La corrección no revierte el stock.

### OPS-7 · Alertas de stock bajo
**Acceso:** Todos · **Voz:** No

El backend verifica el stock después de cada venta confirmada. Si un insumo cae al umbral mínimo configurado, la alerta queda disponible para todos los roles. El cliente Kotlin la consulta al cargar la pantalla.

**Ejemplo:** "Pan de hamburguesa" con umbral 20 unidades — stock llega a 18 → alerta: "Stock bajo: Pan de hamburguesa (18 uds — mínimo: 20)."

---

## Módulo 3 · Reportes y análisis

### REP-1 · Dashboard en tiempo real
**Acceso:** OWNER · **Voz:** No

Panel con el resumen del día: ventas totales, desglose efectivo vs digital (Yape, Plin, Ágora), productos más vendidos y ganancia estimada. El desglose efectivo vs digital permite cuadrar la caja física al final del día.

Usa la vista SQL `v_daily_summary` para evitar JOINs costosos en cada request.

### REP-2 · Reportes por período
**Acceso:** OWNER · **Voz:** No

Ventas agrupadas por día, semana o mes. Comparación entre períodos y filtro por empleado para analizar rendimiento individual.

### REP-3 · Rentabilidad por producto
**Acceso:** OWNER · **Voz:** No

Calcula la ganancia unitaria de cada producto: precio de venta menos el costo de los insumos según la receta (OPS-3). Identifica los productos más y menos rentables, ordenados de mayor a menor margen.

Usa la vista SQL `v_product_profitability`. Requiere que los insumos tengan `cost_per_unit` configurado.

**Ejemplo:** Hamburguesa Doble: venta S/ 9.00, costo S/ 3.80, margen S/ 5.20 (57.8%).

### REP-4 · Cierre de caja diario
**Acceso:** OWNER · **Voz:** No

Al finalizar el día se genera el cierre: ingresos en efectivo, ingresos digitales, gastos y ganancia neta. El cierre de caja es un registro **inmutable** — una vez generado no puede modificarse ni eliminarse, igual que un ticket fiscal.

Si se detecta un error post-cierre, se crea un cierre de ajuste que referencia al original; el registro original nunca se toca.

**Inmutabilidad a dos niveles:** la API solo expone POST (sin PUT ni DELETE) y el rol de la aplicación en PostgreSQL no tiene permisos UPDATE ni DELETE sobre la tabla `cash_closes`.

---

## Módulo 4 · Inteligencia artificial

Todas las funcionalidades de IA tienen estrategia de fallback: si Claude API no está disponible, el sistema sigue operando.

### IA-1 · Asistente conversacional (Text-to-SQL)
**Acceso:** OWNER · **Voz:** No

El dueño hace preguntas sobre su negocio en lenguaje natural. Claude API genera el SQL correspondiente, NestJS lo valida y lo ejecuta en modo solo lectura, y la respuesta se devuelve en lenguaje natural.

**Decisiones de diseño:**
- SQL en modo solo lectura sobre tablas explícitamente permitidas.
- Las consultas que intenten modificar datos se rechazan con 422 antes de ejecutarse.
- Fallback: si Claude API falla o hace timeout (10 s), el asistente responde "No está disponible ahora" sin romper el flujo.

### IA-2 · Predicción de demanda (Holt-Winters)
**Acceso:** OWNER · **Voz:** No

Predice las unidades a vender combinando dos componentes:
1. Algoritmo Holt-Winters implementado en NestJS sin librerías externas — detecta tendencia y estacionalidad semanal.
2. Claude API aplica un factor de ajuste multiplicativo según contexto externo (feriados, fechas especiales).

El cálculo corre en un cron job a las 6 a.m. Los clientes leen el plan precalculado.

Con menos de 14 días de historial propio, el sistema usa `reference_baselines` (promedios configurables) y muestra un aviso claro. Fallback: si Claude API falla, se usa la predicción base de Holt-Winters sin ajuste.

### IA-3 · Recomendador de compras (MRP)
**Acceso:** OWNER · **Voz:** No

Calcula qué insumos comprar y en qué cantidad, basándose en las predicciones de IA-2 y el stock actual. Claude API redacta la lista en lenguaje natural con justificación. Si Claude API falla, se muestra la lista en formato tabla directamente.

**Fórmula:** demanda = predicción × cantidad en receta. Cantidad a comprar = demanda − stock actual (si es ≤ 0, no se compra).

### IA-4 · Plan de producción diario
**Acceso:** Todos · **Voz:** No

La cara visible de IA-2. Muestra a todos los roles cuántas unidades producir de cada producto para el día. El plan lo calcula el cron job a las 6 a.m.; los clientes leen el resultado precalculado sin ejecutar IA en tiempo real.

El campo `prediction_source` indica si el plan usó Holt-Winters con ajuste, Holt-Winters base o promedios de referencia.

---

## Módulo 5 · Registro por voz

### VOZ-1 · Registro por voz (Voice-to-Form)
**Acceso:** Todos · **Voz:** Sí

El usuario pulsa el botón de micrófono en un formulario, describe verbalmente la operación, Groq Whisper transcribe el audio en español y Claude API extrae los campos del formulario. La app pre-rellena el formulario para que el usuario revise y confirme.

**Operaciones con soporte de voz:** registro de ventas (OPS-4), gastos (OPS-5) y actualización de stock (OPS-2).

**Fallback:** si Claude API falla, se muestra la transcripción cruda para que el usuario llene manualmente. Si Groq falla, el formulario queda vacío con un mensaje de error. La transcripción nunca se pierde.

---

## Módulo 6 · Pagos digitales

### PAG-1 · Listener Yape / Plin / Ágora
**Acceso:** Automático (app Kotlin) · **Voz:** No

App Android nativa en Kotlin que corre en segundo plano en el celular del negocio. Usa `NotificationListenerService` para interceptar notificaciones de Yape, Plin y Ágora, extrae el monto y el nombre del remitente, y los envía al backend con una API Key.

El cajero consulta las notificaciones recibidas como referencia visual para confirmar los pagos manualmente. No hay matching automático: la confirmación siempre la realiza el cajero.

**Decisiones de diseño:**
- API Key fija generada al registrar el dispositivo. Se guarda hasheada en BD.
- El dueño escanea un QR generado por Kotlin para registrar el dispositivo — sin copiar claves a mano.
- Revocación: el dueño pulsa "Revocar dispositivo" en Kotlin. Cualquier POST con esa clave recibe 401.
- Idempotencia: ID único por notificación. El backend rechaza duplicados.
- Los patrones de parseo por billetera son configurables desde el backend — si Yape cambia el formato, se actualiza el patrón sin publicar una nueva versión de la app.
- Rate limit: máximo 20 requests por minuto por `device_id`.
