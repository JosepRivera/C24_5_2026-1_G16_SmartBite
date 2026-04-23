# Auth · docs/api/01-auth.md

> Autenticación delegada a Supabase Auth. NestJS actúa como proxy thin: no firma tokens ni gestiona contraseñas. Todos los usuarios (dueño y empleados) se autentican con email y contraseña. Sin OAuth de terceros.

**Base URL:** `http://localhost:3000/api/v1/auth`

---

## Índice

- [Formato de respuestas](#formato-de-respuestas)
- [POST /auth/login](#post-authlogin)
- [POST /auth/logout](#post-authlogout)
- [POST /auth/refresh](#post-authrefresh)
- [POST /auth/forgot-password](#post-authforgot-password)
- [POST /auth/reset-password](#post-authreset-password)
- [PATCH /auth/owner-email](#patch-authowner-email)
- [Recuperación de acceso del dueño](#recuperación-de-acceso-del-dueño)

---

## Formato de respuestas

### Éxito

Todas las respuestas exitosas (excepto `204 No Content`) vienen envueltas en un objeto `data`:

```json
{
  "data": { ... }
}
```

### Error de autenticación / negocio

```json
{
  "message": "Credenciales inválidas",
  "error": "Unauthorized",
  "statusCode": 401
}
```

### Error de validación · `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "code": "invalid_type",
      "path": ["username"],
      "message": "Invalid input: expected string, received undefined"
    }
  ]
}
```

---

## POST /auth/login

Login con usuario y contraseña. Válido para todos los usuarios: dueño y empleados.

**Autenticación:** No requerida

### Request body

| Campo | Tipo | Requerido | Validación | Descripción |
| ----- | ---- | --------- | ---------- | ----------- |
| `username` | string | ✅ | mín. 1 · máx. 50 | Nombre de usuario |
| `password` | string | ✅ | mín. 1 · máx. 128 | Contraseña |

```json
{
  "username": "juan",
  "password": "MiClave123"
}
```

### Respuesta exitosa · `200 OK`

```json
{
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "v1.AKd9...",
    "expires_in": 3600,
    "user": {
      "id": "uuid-del-usuario",
      "name": "Juan García",
      "username": "juan",
      "role": "CASHIER",
      "isActive": true
    }
  }
}
```

> `expires_in` está en segundos. El access token expira en 3600 s (1 hora).

### Errores

| Status | Causa |
| ------ | ----- |
| 400 | Validación fallida (campos vacíos o exceden límite) |
| 401 | Credenciales inválidas o cuenta desactivada |
| 404 | Perfil de usuario no encontrado en la BD |

---

## POST /auth/logout

Invalida todas las sesiones activas del usuario en Supabase Auth.

**Autenticación:** Bearer token requerido

```
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

### Respuesta exitosa · `204 No Content`

Sin cuerpo de respuesta.

### Errores

| Status | Causa |
| ------ | ----- |
| 401 | Token ausente o inválido |

---

## POST /auth/refresh

Renueva el access token con el refresh token. Supabase rota el refresh token en cada uso — el token anterior queda invalidado.

**Autenticación:** No requerida

### Request body

| Campo | Tipo | Requerido | Descripción |
| ----- | ---- | --------- | ----------- |
| `refresh_token` | string | ✅ | Refresh token activo |

```json
{
  "refresh_token": "v1.AKd9..."
}
```

### Respuesta exitosa · `200 OK`

```json
{
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "v1.BXe0...",
    "expires_in": 900
  }
}
```

### Errores

| Status | Causa |
| ------ | ----- |
| 400 | Campo `refresh_token` vacío |
| 401 | Refresh token inválido o expirado |

---

## POST /auth/forgot-password

Solicita recuperación de contraseña vía email.

**Solo aplica al dueño.** Los empleados usan emails sintéticos `@smartbite.local` — no tienen recuperación por email. Sus contraseñas las resetea el dueño desde `PATCH /users/:id`.

**Autenticación:** No requerida

> Siempre retorna éxito para evitar email enumeration attacks.

### Request body

| Campo | Tipo | Requerido | Validación | Descripción |
| ----- | ---- | --------- | ---------- | ----------- |
| `email` | string | ✅ | formato email válido | Email del dueño |

```json
{
  "email": "dueno@gmail.com"
}
```

### Respuesta exitosa · `200 OK`

```json
{
  "data": {
    "message": "Si el email existe, recibirás las instrucciones de recuperación."
  }
}
```

### Errores

| Status | Causa |
| ------ | ----- |
| 400 | Formato de email inválido |

---

## POST /auth/reset-password

Actualiza la contraseña del usuario autenticado. El usuario debe enviar el JWT de recovery que Supabase incluyó en el email de recuperación.

**Autenticación:** Bearer token requerido (JWT de recovery de Supabase)

```
POST /api/v1/auth/reset-password
Authorization: Bearer <recovery_jwt>
```

### Request body

| Campo | Tipo | Requerido | Validación | Descripción |
| ----- | ---- | --------- | ---------- | ----------- |
| `password` | string | ✅ | mín. 6 · máx. 128 | Nueva contraseña |

```json
{
  "password": "NuevaClave456"
}
```

### Respuesta exitosa · `200 OK`

```json
{
  "data": {
    "message": "Contraseña actualizada correctamente."
  }
}
```

### Errores

| Status | Causa |
| ------ | ----- |
| 400 | Contraseña no cumple el mínimo de 6 caracteres |
| 401 | Token de recovery inválido o expirado |
| 500 | Error interno al actualizar en Supabase |

---

## PATCH /auth/owner-email

Actualiza el email del dueño en Supabase Auth. Solo aplica para el OWNER — los empleados usan emails sintéticos `@smartbite.local` gestionados internamente.

**Autenticación:** Bearer token requerido · Solo OWNER

```
PATCH /api/v1/auth/owner-email
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Request body

| Campo | Tipo | Requerido | Validación | Descripción |
| ----- | ---- | --------- | ---------- | ----------- |
| `email` | string | ✅ | formato email válido | Nuevo email del dueño |

```json
{
  "email": "nuevo@gmail.com"
}
```

### Respuesta exitosa · `200 OK`

```json
{
  "data": {
    "message": "Email actualizado correctamente."
  }
}
```

### Errores

| Status | Causa |
| ------ | ----- |
| 400 | Formato de email inválido |
| 401 | Token ausente o inválido |
| 403 | Rol sin permiso (requiere OWNER) |
| 500 | Error al actualizar en Supabase |

> **Gotcha:** si cambiás el email, el login seguirá usando `{username}@smartbite.local` internamente. Este endpoint solo actualiza el email de contacto del dueño en Supabase Auth (usado para `forgot-password`).

---

## Recuperación de acceso del dueño

Si el dueño **pierde acceso a su email**, ningún endpoint de la API puede ayudarlo — todos requieren un JWT válido emitido por Supabase Auth.

**Pasos para recuperar el acceso:**

1. Intentar recuperar la cuenta de email directamente con el proveedor de correo.
2. Si el email es irrecuperable, contactar al administrador de Supabase para:
   - Acceder al dashboard de Supabase → Authentication → Users
   - Localizar al usuario OWNER por su UUID
   - Actualizar el email manualmente desde el dashboard

> Esta operación requiere acceso al dashboard de Supabase del proyecto. El dueño debe tener guardadas las credenciales de acceso al proyecto de Supabase como parte de la gestión del negocio.
