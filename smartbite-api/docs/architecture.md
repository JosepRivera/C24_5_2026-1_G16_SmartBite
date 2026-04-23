# Arquitectura del sistema

SmartBite es un sistema de gestión para restaurantes con backend en NestJS, clientes en Kotlin (web y Android) y una app Android nativa en Kotlin para la integración de pagos digitales.

---

## Stack tecnológico

| Capa | Tecnología | Rol |
| ---- | ---------- | --- |
| Backend | NestJS v11 + TypeScript | API REST, Guards, módulos de negocio |
| ORM | Prisma v7 | Queries, migraciones, tipado de BD |
| Base de datos | PostgreSQL 16 | Persistencia principal |
| Autenticación | Supabase Auth | JWT (RS256), sesiones, email/contraseña — sin OAuth de terceros |
| Plataforma | Supabase | BD en producción + Auth en todos los entornos |
| Desarrollo local | Supabase CLI | BD + Auth local en un solo comando (`supabase start`) |
| Clientes | Kotlin (Jetpack Compose) | Web y Android — acceso por rol |
| App de pagos | Kotlin Android nativo | Listener de notificaciones Yape/Plin/Ágora |
| IA conversacional | Claude API (Anthropic) | Text-to-SQL, ajuste de predicción, extracción de entidades, MRP narrativo |
| Transcripción | Groq Whisper API | Audio a texto en español peruano |
| Validación | Zod + class-validator | DTOs y variables de entorno |
| Linter / Format | Biome v2 | Lint y formato en un solo paso |
| Testing | Vitest + Supertest | Tests unitarios y e2e |
| Deploy | Render | Hosting del backend en producción |

---

## Roles y accesos

| Rol | Acceso |
| --- | ------ |
| **OWNER** | Acceso completo. Gestiona empleados, productos, insumos, recetas, gastos, reportes y configuración. |
| **CASHIER** | Cobra órdenes, confirma pagos digitales, consulta notificaciones. |
| **WAITER** | Registra pedidos. No toca dinero ni finanzas. |
| **COOK** | Solo lectura: pedidos en tiempo real y plan de producción diario. |

Los Guards de NestJS validan el JWT y el rol en cada endpoint. El rol viene en el claim `user_metadata.role` del token de Supabase.

---

## Módulos del backend

| Módulo | Responsabilidad | Feature |
| ------ | --------------- | ------- |
| `AuthModule` | Login, logout, refresh, reset de contraseñas | AUTH-1 |
| `UsersModule` | CRUD de empleados y roles, reset de contraseña por el dueño | AUTH-2 |
| `ProductsModule` | CRUD de productos y precios | OPS-1 |
| `IngredientsModule` | CRUD de insumos, stock y alertas | OPS-2, OPS-7 |
| `RecipesModule` | Relación producto-insumo con cantidades | OPS-3 |
| `SalesModule` | Registro, cobro, historial y corrección de órdenes | OPS-4, OPS-6 |
| `ExpensesModule` | Registro de gastos operativos | OPS-5 |
| `CashClosesModule` | Cierre de caja inmutable | REP-4 |
| `DashboardModule` | Resumen del día en tiempo real | REP-1 |
| `ReportsModule` | Reportes por período y rentabilidad por producto | REP-2, REP-3 |
| `AIModule` | Asistente Text-to-SQL con Claude API | IA-1 |
| `DemandModule` | Holt-Winters propio + ajuste Claude API | IA-2 |
| `MRPModule` | Motor de recomendación de compras | IA-3 |
| `ProductionPlansModule` | Plan diario precalculado + cron job 6 a.m. | IA-4 |
| `VoiceModule` | Transcripción Groq Whisper + extracción Claude API | VOZ-1 |
| `PaymentsModule` | Notificaciones del listener Kotlin | PAG-1 |
| `DevicesModule` | Registro y revocación de dispositivos Kotlin | PAG-1 |
| `PrismaModule` | Acceso a base de datos (transversal, singleton) | — |
| `SupabaseModule` | Cliente admin de Supabase (transversal, singleton) | — |

---

## Modelo de autenticación

Supabase Auth es la fuente de verdad para identidad. NestJS no firma tokens ni gestiona contraseñas.

**Dueño y empleados:** todos se autentican con email y contraseña vía el formulario de login. No hay OAuth de terceros (sin Google, sin GitHub). El dueño usa su email real. Los empleados usan email sintético `{username}@smartbite.local` — no tienen recuperación de contraseña por email. El dueño resetea sus contraseñas desde AUTH-2.

En desarrollo local, Supabase CLI (`supabase start`) levanta la instancia de Auth local. Las features de autenticación se prueban contra esa instancia sin depender de la nube.

**Validación del JWT en NestJS:**
1. El cliente envía `Authorization: Bearer <token>` en cada request.
2. `JwtGuard` valida la firma del token contra el JWKS público de Supabase (`/auth/v1/.well-known/jwks.json`).
3. Extrae el `sub` (userId) y el rol del payload del token.
4. El `RolesGuard` verifica el rol contra el decorador `@Roles()` del endpoint.

**Tabla `users`:** perfil de aplicación. Almacena nombre, username, rol y estado activo. El `id` del usuario es el UUID de Supabase Auth — son la misma entidad vinculada por ID.

---

## APIs externas

### Claude API (Anthropic)

| Módulo | Uso | Timeout | Fallback |
| ------ | --- | ------- | -------- |
| `AIModule` | Genera SQL desde lenguaje natural | 10 s | Muestra "No disponible ahora" |
| `DemandModule` | Factor de ajuste de predicción | 30 s | Usa predicción Holt-Winters sin ajuste |
| `MRPModule` | Redacta lista de compras en lenguaje natural | 30 s | Muestra lista en formato tabla |
| `VoiceModule` | Extrae campos del formulario desde transcripción | 10 s | Muestra la transcripción cruda |

Modelo en producción: `claude-haiku-4-5`. Las llamadas de `AIModule` y `VoiceModule` usan prompt caching de Anthropic (`cache_control`) para reutilizar el system prompt con el schema de la BD al 10% del costo normal.

### Groq Whisper API

Usada exclusivamente en `VoiceModule` para transcripción de audio a texto en español peruano. Modelo: `whisper-large-v3-turbo`. Fallback: si Groq falla, el formulario queda vacío con mensaje de error.

---

## Caché en memoria

Se usa `@nestjs/cache-manager` con store en memoria. Sin Redis — no se justifica la infraestructura adicional para una instancia única.

| Clave | Módulo | TTL | Se invalida cuando |
| ----- | ------ | --- | ------------------ |
| `db_schema` | IA-1, VOZ-1 | Indefinido | Reinicio del servidor |
| `active_products` | IA-4 | 5 minutos | Dueño actualiza un producto |
| `wallet_patterns` | PAG-1 | Indefinido | Reinicio del servidor |

---

## Decisiones de diseño clave

- **Stock se descuenta al cobrar, no al crear la orden.** Si la orden se cancela, el stock no se tocó nunca.
- **Cierres de caja inmutables a dos niveles:** la API solo expone POST y el rol de la aplicación en PostgreSQL no tiene permisos UPDATE ni DELETE sobre `cash_closes`.
- **La app Kotlin usa API Key, no JWT.** Es un proceso automático sin sesión de usuario. La clave se registra una sola vez vía QR y se guarda hasheada.
- **Plan de producción precalculado.** El cron job de las 6 a.m. ejecuta Holt-Winters + Claude API y guarda el resultado. Los clientes leen una fila de BD — no ejecutan IA en tiempo real.
- **`total` en ventas está desnormalizado** para evitar JOINs costosos en el dashboard. Se calcula una vez al crear la orden y nunca se edita directamente.
- **`total_income` y `net_profit` en cierres de caja violan la 3FN intencionalmente** para preservar la integridad del registro histórico inmutable.
- **Sin registro público.** Solo el dueño crea cuentas de empleados.

---

## Estructura de carpetas

```
src/
├── app.module.ts
├── main.ts
├── auth/               # AUTH-1: login, logout, refresh, reset
├── users/              # AUTH-2: empleados y roles
├── products/           # OPS-1
├── ingredients/        # OPS-2, OPS-7
├── recipes/            # OPS-3
├── sales/              # OPS-4, OPS-6
├── expenses/           # OPS-5
├── cash-closes/        # REP-4
├── dashboard/          # REP-1
├── reports/            # REP-2, REP-3
├── ai/                 # IA-1
│   └── prompts/
├── demand/             # IA-2
├── mrp/                # IA-3
│   └── prompts/
├── production-plans/   # IA-4
├── voice/              # VOZ-1
│   └── prompts/
├── payments/           # PAG-1 (notificaciones)
├── devices/            # PAG-1 (dispositivos)
├── supabase/           # Cliente admin Supabase (transversal)
├── common/
│   ├── guards/         # JwtGuard, RolesGuard, ApiKeyGuard
│   ├── decorators/     # @CurrentUser(), @Roles()
│   ├── interceptors/
│   └── pipes/
├── config/             # Validación de variables de entorno con Zod
└── prisma/             # Módulo global de Prisma
```
