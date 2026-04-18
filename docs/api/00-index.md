# Índice de la API · docs/api/00-index.md

> Referencia completa de todos los endpoints de SmartBite.
> Ver el Swagger en `http://localhost:3000/api/docs` para explorar los endpoints interactivamente.

---

## Autenticación · `docs/api/01-auth.md`

| Método | Endpoint              | Descripción                              | Roles   |
| ------ | --------------------- | ---------------------------------------- | ------- |
| POST   | /auth/login           | Iniciar sesión con usuario y contraseña  | Público |
| POST   | /auth/logout          | Cerrar todas las sesiones activas        | Todos   |
| POST   | /auth/refresh         | Renovar access token                     | Público |
| POST   | /auth/forgot-password | Solicitar recuperación de contraseña     | Público |
| POST   | /auth/reset-password  | Cambiar contraseña con token de recovery | JWT     |
| PATCH  | /auth/owner-email     | Actualizar email del dueño               | OWNER   |

---

## Empleados y roles · `docs/api/02-users.md`

| Método | Endpoint   | Descripción                                  | Roles               |
| ------ | ---------- | -------------------------------------------- | ------------------- |
| GET    | /users     | Listar empleados                             | OWNER               |
| POST   | /users     | Crear empleado                               | OWNER               |
| GET    | /users/:id | Obtener perfil (propio o ajeno si es OWNER)  | Todos               |
| PATCH  | /users/:id | Editar empleado (OWNER) o cambiar contraseña | Todos (con límites) |
| DELETE | /users/:id | Desactivar empleado (soft delete)            | OWNER               |

---

## Gestión operativa · `docs/api/02-ops.md`

| Método | Endpoint              | Descripción               | Roles              |
| ------ | --------------------- | ------------------------- | ------------------ |
| GET    | /products             | Listar productos          | Todos              |
| POST   | /products             | Crear producto            | OWNER              |
| GET    | /products/:id         | Obtener producto          | Todos              |
| PATCH  | /products/:id         | Editar producto           | OWNER              |
| DELETE | /products/:id         | Desactivar producto       | OWNER              |
| GET    | /ingredients          | Listar insumos            | OWNER              |
| POST   | /ingredients          | Crear insumo              | OWNER              |
| GET    | /ingredients/:id      | Obtener insumo            | OWNER              |
| PATCH  | /ingredients/:id      | Editar insumo / stock     | OWNER              |
| GET    | /recipes/:productId   | Obtener receta            | OWNER              |
| PUT    | /recipes/:productId   | Crear o reemplazar receta | OWNER              |
| POST   | /sales                | Crear venta               | OWNER/CASHIER/WAITER |
| GET    | /sales                | Listar ventas             | Todos              |
| GET    | /sales/:id            | Obtener venta             | Todos              |
| PATCH  | /sales/:id/pay        | Cobrar venta              | OWNER/CASHIER      |
| PATCH  | /sales/:id/cancel     | Cancelar venta            | OWNER/CASHIER      |
| POST   | /expenses             | Registrar gasto           | OWNER/CASHIER      |
| GET    | /expenses             | Listar gastos             | OWNER/CASHIER      |
| GET    | /expenses/:id         | Obtener gasto             | OWNER/CASHIER      |
| DELETE | /expenses/:id         | Eliminar gasto            | OWNER              |

---

## Reportes y cierres · `docs/api/03-reports.md`

| Método | Endpoint                 | Descripción                        | Roles |
| ------ | ------------------------ | ---------------------------------- | ----- |
| GET    | /dashboard               | Resumen del día en tiempo real     | OWNER |
| GET    | /reports/periods         | Ventas agrupadas por período       | OWNER |
| GET    | /reports/profitability   | Rentabilidad por producto          | OWNER |
| GET    | /cash-closes             | Listar cierres de caja (paginado)  | OWNER |
| POST   | /cash-closes             | Generar cierre del día             | OWNER |
| GET    | /cash-closes/:id         | Obtener cierre por ID              | OWNER |

---

## No implementado

Los siguientes módulos están documentados como referencia pero aún no tienen endpoints:

- **Inteligencia artificial** (`04-ai.md`): asistente conversacional, MRP, planes de producción
- **Voz** (`05-voice.md`): transcripción de audio
- **Pagos** (`06-payments.md`): notificaciones, dispositivos
