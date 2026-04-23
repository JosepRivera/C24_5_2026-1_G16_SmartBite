# Usuarios · docs/api/02-users.md

> Gestión de empleados y roles. Solo el dueño puede crear y administrar cuentas — no existe registro público. La autenticación de cada usuario la gestiona Supabase Auth.

**Base URL:** `/api/v1/users`  
**Autenticación:** Bearer token requerido en todos los endpoints.  
**Formato de respuestas:** ver `01-auth.md#formato-de-respuestas` — éxito en `data: {}`, validación en `errors: []`.

---

## Índice

- [GET /users](#get-users)
- [POST /users](#post-users)
- [GET /users/:id](#get-usersid)
- [PATCH /users/:id](#patch-usersid)
- [DELETE /users/:id](#delete-usersid)

---

## GET /users

Lista todos los empleados del sistema, incluyendo los desactivados.

**Roles:** OWNER

```
GET /api/v1/users
Authorization: Bearer <token>
```

### Respuesta exitosa · `200 OK`

```json
{
  "data": [
    {
      "id": "uuid-juan",
      "name": "Juan García",
      "username": "juan",
      "role": "CASHIER",
      "isActive": true,
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z"
    },
    {
      "id": "uuid-maria",
      "name": "María López",
      "username": "maria",
      "role": "WAITER",
      "isActive": false,
      "createdAt": "2026-01-10T08:00:00Z",
      "updatedAt": "2026-03-01T14:00:00Z"
    }
  ]
}
```

### Errores

| Status | Causa |
| ------ | ----- |
| 401 | Token ausente o inválido |
| 403 | Rol sin permiso (requiere OWNER) |

---

## POST /users

Crea una cuenta de empleado. Crea el usuario en Supabase Auth (con email sintético `{username}@smartbite.local`) y luego el perfil en la BD con el mismo UUID.

**Roles:** OWNER

### Request body

| Campo | Tipo | Requerido | Validación | Descripción |
| ----- | ---- | --------- | ---------- | ----------- |
| `name` | string | ✅ | mín. 1 | Nombre completo del empleado |
| `username` | string | ✅ | mín. 3, sin espacios | Nombre de usuario para iniciar sesión |
| `password` | string | ✅ | mín. 6 · máx. 128 | Contraseña inicial |
| `role` | string | ✅ | `CASHIER`, `WAITER`, `COOK` | Rol asignado |

```json
{
  "name": "Juan García",
  "username": "juan",
  "password": "ClaveSeg123",
  "role": "CASHIER"
}
```

### Respuesta exitosa · `201 Created`

```json
{
  "data": {
    "id": "uuid-generado-por-supabase",
    "name": "Juan García",
    "username": "juan",
    "role": "CASHIER",
    "isActive": true,
    "createdAt": "2026-04-10T10:00:00Z",
    "updatedAt": "2026-04-10T10:00:00Z"
  }
}
```

### Errores

| Status | Causa |
| ------ | ----- |
| 400 | Validación fallida |
| 401 | Token ausente o inválido |
| 403 | Rol sin permiso (requiere OWNER) |
| 409 | El username ya está en uso |
| 500 | Error al crear el usuario en Supabase Auth |

---

## GET /users/:id

Obtiene el perfil de un empleado. OWNER puede ver cualquier perfil. Los demás roles solo pueden ver el suyo propio.

**Roles:** Todos (con restricción)

### Parámetros de ruta

| Parámetro | Tipo | Descripción |
| --------- | ---- | ----------- |
| `id` | UUID | ID del usuario |

```
GET /api/v1/users/uuid-juan
Authorization: Bearer <token>
```

### Respuesta exitosa · `200 OK`

```json
{
  "data": {
    "id": "uuid-juan",
    "name": "Juan García",
    "username": "juan",
    "role": "CASHIER",
    "isActive": true,
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-01-15T10:00:00Z"
  }
}
```

### Errores

| Status | Causa |
| ------ | ----- |
| 400 | UUID mal formado |
| 401 | Token ausente o inválido |
| 403 | Intento de ver el perfil de otro empleado sin ser OWNER |
| 404 | Usuario no encontrado |

---

## PATCH /users/:id

Actualiza un empleado. El comportamiento depende del rol del solicitante:

**OWNER:** puede actualizar `name`, `username`, `role`, `is_active` y `password` de cualquier empleado. Si cambia `role`, se sincroniza en Supabase `app_metadata`. Si cambia `is_active` a `false`, la cuenta queda baneada en Supabase (sesiones activas quedan invalidadas).

**Empleado (no OWNER):** solo puede cambiar su propia contraseña (`password`). Cualquier otro campo retorna 403.

**Roles:** Todos (con restricción)

### Parámetros de ruta

| Parámetro | Tipo | Descripción |
| --------- | ---- | ----------- |
| `id` | UUID | ID del usuario a actualizar |

### Request body (todos los campos son opcionales)

| Campo | Tipo | Solo OWNER | Descripción |
| ----- | ---- | ---------- | ----------- |
| `name` | string | ✅ | Nombre completo |
| `username` | string | ✅ | Nombre de usuario (debe ser único) |
| `role` | string | ✅ | `CASHIER`, `WAITER`, `COOK` |
| `is_active` | boolean | ✅ | `false` desactiva la cuenta (soft delete) |
| `password` | string | No | Nueva contraseña (mín. 6 caracteres) |

**Ejemplo — OWNER resetea contraseña de empleado:**
```json
{ "password": "NuevaClave789" }
```

**Ejemplo — OWNER cambia rol y nombre:**
```json
{ "name": "Juan G. Actualizado", "role": "WAITER" }
```

**Ejemplo — OWNER desactiva empleado:**
```json
{ "is_active": false }
```

**Ejemplo — Empleado cambia su propia contraseña:**
```json
{ "password": "MiNuevaClave456" }
```

### Respuesta exitosa · `200 OK`

```json
{
  "data": {
    "id": "uuid-juan",
    "name": "Juan García",
    "username": "juan",
    "role": "WAITER",
    "isActive": true,
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-04-10T12:30:00Z"
  }
}
```

### Errores

| Status | Mensaje | Causa |
| ------ | ------- | ----- |
| 400 | Validation failed | UUID mal formado o validación de campo fallida |
| 401 | Token ausente o inválido | Sin Bearer token o token expirado |
| 403 | No tienes permiso para esta acción | Empleado intentando editar perfil de otro usuario |
| 403 | Solo puedes cambiar tu contraseña | Empleado enviando `name`, `username`, `role` o `is_active` |
| 404 | Usuario no encontrado | UUID no existe en BD |
| 409 | El username ya está en uso | Nuevo username ya tomado |
| 500 | Error actualizando contraseña | Fallo en Supabase Auth |

---

## DELETE /users/:id

Desactiva un empleado (soft delete). Marca `isActive = false` en la BD y banea la cuenta en Supabase Auth. El historial de ventas y gastos del empleado se conserva intacto.

No se puede desactivar al único OWNER activo del sistema.

**Roles:** OWNER

### Parámetros de ruta

| Parámetro | Tipo | Descripción |
| --------- | ---- | ----------- |
| `id` | UUID | ID del empleado a desactivar |

```
DELETE /api/v1/users/uuid-juan
Authorization: Bearer <token>
```

### Respuesta exitosa · `200 OK`

```json
{
  "data": {
    "id": "uuid-juan",
    "name": "Juan García",
    "username": "juan",
    "role": "CASHIER",
    "isActive": false,
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-04-10T15:00:00Z"
  }
}
```

### Errores

| Status | Causa |
| ------ | ----- |
| 400 | UUID mal formado |
| 401 | Token ausente o inválido |
| 403 | Rol sin permiso (requiere OWNER) |
| 404 | Usuario no encontrado |
| 422 | No se puede desactivar al único OWNER activo |
