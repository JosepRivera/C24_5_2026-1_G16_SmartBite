# Pagos · docs/api/06-payments.md

> Notificaciones del listener Kotlin y gestión de dispositivos autorizados.

---

## Índice

- [Pagos · docs/api/06-payments.md](#pagos--docsapi06-paymentsmd)
  - [Índice](#índice)
  - [Notificaciones](#notificaciones)
    - [Recibir notificación · POST /payments/notifications](#recibir-notificación--post-paymentsnotifications)
      - [Request body](#request-body)
      - [Ejemplo de request](#ejemplo-de-request)
      - [Respuesta exitosa · `201 Created`](#respuesta-exitosa--201-created)
      - [Casos de error](#casos-de-error)
    - [Listar notificaciones · GET /payments/notifications](#listar-notificaciones--get-paymentsnotifications)
      - [Ejemplo de request](#ejemplo-de-request-1)
      - [Respuesta exitosa · `200 OK`](#respuesta-exitosa--200-ok)
      - [Casos de error](#casos-de-error-1)
    - [Marcar como revisada · PATCH /payments/notifications/:id/review](#marcar-como-revisada--patch-paymentsnotificationsidreview)
      - [Parámetros de ruta](#parámetros-de-ruta)
      - [Ejemplo de request](#ejemplo-de-request-2)
      - [Respuesta exitosa · `200 OK`](#respuesta-exitosa--200-ok-1)
      - [Casos de error](#casos-de-error-2)
  - [Dispositivos](#dispositivos)
    - [Registrar dispositivo · POST /devices/register](#registrar-dispositivo--post-devicesregister)
      - [Request body](#request-body-1)
      - [Ejemplo de request](#ejemplo-de-request-3)
      - [Respuesta exitosa · `201 Created`](#respuesta-exitosa--201-created-1)
      - [Casos de error](#casos-de-error-3)
    - [Listar dispositivos · GET /devices](#listar-dispositivos--get-devices)
      - [Ejemplo de request](#ejemplo-de-request-4)
      - [Respuesta exitosa · `200 OK`](#respuesta-exitosa--200-ok-2)
      - [Casos de error](#casos-de-error-4)
    - [Revocar dispositivo · POST /devices/:id/revoke](#revocar-dispositivo--post-devicesidrevoke)
      - [Parámetros de ruta](#parámetros-de-ruta-1)
      - [Ejemplo de request](#ejemplo-de-request-5)
      - [Respuesta exitosa · `200 OK`](#respuesta-exitosa--200-ok-3)
      - [Casos de error](#casos-de-error-5)

---

## Notificaciones

### Recibir notificación · POST /payments/notifications

> Endpoint exclusivo para la app Kotlin. Recibe una notificación de pago
> interceptada del celular del negocio y la guarda en BD.
> Implementa idempotencia: si llega el mismo `notification_id` dos veces,
> el segundo se ignora silenciosamente y devuelve el registro existente.

**Autenticación:** API Key en header `X-API-Key`
**Roles permitidos:** Solo dispositivos registrados y activos
**Rate limit:** 20 requests/min por dispositivo

---

#### Request body

| Campo             | Tipo                | Requerido | Descripción                                |
| ----------------- | ------------------- | --------- | ------------------------------------------ |
| `notification_id` | string              | ✅         | ID único de la notificación (idempotencia) |
| `amount`          | number              | ✅         | Monto recibido en soles                    |
| `sender_name`     | string              | ✅         | Nombre del remitente                       |
| `source`          | payment_source_enum | ✅         | `YAPE`, `PLIN` o `AGORA`                   |
| `raw_text`        | string              | ✅         | Texto crudo de la notificación             |

---

#### Ejemplo de request

**Headers**
```
POST /api/v1/payments/notifications
X-API-Key: 5ea3e462dd7647d7e2854a1fe641d1e89179af049430c6edbf4ff02ccda05211
Content-Type: application/json
```

**Body**
```json
{
  "notification_id": "yape-test-001",
  "amount": 25.50,
  "sender_name": "Juan Pérez",
  "source": "YAPE",
  "raw_text": "Juan Pérez te envió S/25.50 por YAPE"
}
```

---

#### Respuesta exitosa · `201 Created`
```json
{
  "data": {
    "id": "20fe7530-393d-4a1f-954c-32da2328f15e",
    "notification_id": "yape-test-001",
    "amount": 25.5,
    "sender_name": "Juan Pérez",
    "source": "YAPE",
    "raw_text": "Juan Pérez te envió S/25.50 por YAPE",
    "is_reviewed": false,
    "reviewed_by": null,
    "reviewed_at": null,
    "created_at": "2026-04-18T21:23:06.315Z"
  }
}
```

> Si el `notification_id` ya existe, devuelve `200 OK` con el registro original (sin crear duplicado).

---

#### Casos de error

| Status | Error             | Causa                                |
| ------ | ----------------- | ------------------------------------ |
| 400    | Bad Request       | Validación fallida                   |
| 401    | Unauthorized      | API Key ausente, inválida o revocada |
| 429    | Too Many Requests | Más de 20 requests por minuto        |

---

### Listar notificaciones · GET /payments/notifications

> Lista todas las notificaciones de pago ordenadas por fecha descendente.
> El dueño las consulta como referencia visual para confirmar pagos digitales.

**Autenticación:** Requiere Bearer token
**Roles permitidos:** `OWNER`

---

#### Ejemplo de request

**Headers**
```
GET /api/v1/payments/notifications
Authorization: Bearer <token>
```

---

#### Respuesta exitosa · `200 OK`
```json
{
  "data": [
    {
      "id": "20fe7530-393d-4a1f-954c-32da2328f15e",
      "notification_id": "yape-test-001",
      "amount": 25.5,
      "sender_name": "Juan Pérez",
      "source": "YAPE",
      "raw_text": "Juan Pérez te envió S/25.50 por YAPE",
      "is_reviewed": false,
      "reviewed_by": null,
      "reviewed_at": null,
      "created_at": "2026-04-18T21:23:06.315Z"
    }
  ]
}
```

---

#### Casos de error

| Status | Error        | Causa                    |
| ------ | ------------ | ------------------------ |
| 401    | Unauthorized | Token ausente o inválido |
| 403    | Forbidden    | Rol sin permiso          |

---

### Marcar como revisada · PATCH /payments/notifications/:id/review

> El dueño marca una notificación como revisada después de haber
> identificado y cobrado la orden correspondiente.

**Autenticación:** Requiere Bearer token
**Roles permitidos:** `OWNER`

---

#### Parámetros de ruta

| Parámetro | Tipo | Descripción           |
| --------- | ---- | --------------------- |
| `id`      | UUID | ID de la notificación |

---

#### Ejemplo de request

**Headers**
```
PATCH /api/v1/payments/notifications/20fe7530-393d-4a1f-954c-32da2328f15e/review
Authorization: Bearer <token>
```

---

#### Respuesta exitosa · `200 OK`
```json
{
  "data": {
    "id": "20fe7530-393d-4a1f-954c-32da2328f15e",
    "notification_id": "yape-test-001",
    "amount": 25.5,
    "sender_name": "Juan Pérez",
    "source": "YAPE",
    "raw_text": "Juan Pérez te envió S/25.50 por YAPE",
    "is_reviewed": true,
    "reviewed_by": "e510d36a-10ea-45b9-9415-0e9a3d201643",
    "reviewed_at": "2026-04-18T21:23:16.642Z",
    "created_at": "2026-04-18T21:23:06.315Z"
  }
}
```

---

#### Casos de error

| Status | Error        | Causa                      |
| ------ | ------------ | -------------------------- |
| 400    | Bad Request  | UUID mal formado           |
| 401    | Unauthorized | Token ausente o inválido   |
| 403    | Forbidden    | Rol sin permiso            |
| 404    | Not Found    | Notificación no encontrada |

---

## Dispositivos

### Registrar dispositivo · POST /devices/register

> Registra la app Kotlin como dispositivo autorizado. El dueño llama a este
> endpoint, obtiene la API Key y la transfiere a la app mediante un QR.
> La API Key se retorna **una sola vez** en texto plano y no se puede recuperar después.
> El servidor guarda únicamente el hash SHA-256.

**Autenticación:** Requiere Bearer token
**Roles permitidos:** `OWNER`

---

#### Request body

| Campo  | Tipo   | Requerido | Validación     | Descripción                        |
| ------ | ------ | --------- | -------------- | ---------------------------------- |
| `name` | string | ✅         | min 1, max 100 | Nombre descriptivo del dispositivo |

---

#### Ejemplo de request

**Headers**
```
POST /api/v1/devices/register
Authorization: Bearer <token>
Content-Type: application/json
```

**Body**
```json
{
  "name": "POS-01"
}
```

---

#### Respuesta exitosa · `201 Created`
```json
{
  "data": {
    "id": "dccea519-6e9d-405b-9f7b-93e8ebcd7e66",
    "name": "POS-01",
    "api_key": "5ea3e462dd7647d7e2854a1fe641d1e89179af049430c6edbf4ff02ccda05211",
    "created_at": "2026-04-18T21:22:51.970Z"
  }
}
```

> `api_key` se muestra una única vez. Si se pierde, hay que revocar el dispositivo y registrar uno nuevo.

---

#### Casos de error

| Status | Error        | Causa                    |
| ------ | ------------ | ------------------------ |
| 400    | Bad Request  | Validación fallida       |
| 401    | Unauthorized | Token ausente o inválido |
| 403    | Forbidden    | Rol sin permiso          |

---

### Listar dispositivos · GET /devices

> Lista todos los dispositivos registrados con su estado activo o revocado.

**Autenticación:** Requiere Bearer token
**Roles permitidos:** `OWNER`

---

#### Ejemplo de request

**Headers**
```
GET /api/v1/devices
Authorization: Bearer <token>
```

---

#### Respuesta exitosa · `200 OK`
```json
{
  "data": [
    {
      "id": "dccea519-6e9d-405b-9f7b-93e8ebcd7e66",
      "name": "POS-01",
      "is_active": true,
      "registered_by": "e510d36a-10ea-45b9-9415-0e9a3d201643",
      "last_used_at": null,
      "revoked_at": null,
      "created_at": "2026-04-18T21:22:51.970Z"
    }
  ]
}
```

---

#### Casos de error

| Status | Error        | Causa                    |
| ------ | ------------ | ------------------------ |
| 401    | Unauthorized | Token ausente o inválido |
| 403    | Forbidden    | Rol sin permiso          |

---

### Revocar dispositivo · POST /devices/:id/revoke

> Revoca el acceso de un dispositivo. A partir de este momento cualquier
> request del listener con esa API Key recibe `401` de inmediato.
> Usar cuando el celular del negocio se pierde o es robado.

**Autenticación:** Requiere Bearer token
**Roles permitidos:** `OWNER`

---

#### Parámetros de ruta

| Parámetro | Tipo | Descripción        |
| --------- | ---- | ------------------ |
| `id`      | UUID | ID del dispositivo |

---

#### Ejemplo de request

**Headers**
```
POST /api/v1/devices/dccea519-6e9d-405b-9f7b-93e8ebcd7e66/revoke
Authorization: Bearer <token>
```

---

#### Respuesta exitosa · `200 OK`
```json
{
  "data": {
    "id": "dccea519-6e9d-405b-9f7b-93e8ebcd7e66",
    "revoked": true
  }
}
```

---

#### Casos de error

| Status | Error        | Causa                    |
| ------ | ------------ | ------------------------ |
| 400    | Bad Request  | UUID mal formado         |
| 401    | Unauthorized | Token ausente o inválido |
| 403    | Forbidden    | Rol sin permiso          |
| 404    | Not Found    | Dispositivo no encontrado |
