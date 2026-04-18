# Voz · docs/api/05-voice.md

> Transcripción de audio y extracción de entidades para registro por voz.

---

## Índice

- [Transcribir y extraer · POST /voice/transcribe](#transcribir-y-extraer--post-voicetranscribe)

---

### Transcribir y extraer · POST /voice/transcribe

> Recibe un archivo de audio, lo transcribe con Groq Whisper
> (`whisper-large-v3-turbo`) y extrae los campos del formulario activo
> con Claude API (claude-haiku-4-5-20251001).
> Si Claude API falla, devuelve la transcripción cruda para que el usuario
> llene el formulario manualmente. La transcripción **nunca** se pierde.

**Autenticación:** Requiere Bearer token
**Roles permitidos:** `OWNER`, `CASHIER`, `WAITER`, `COOK`

---

#### Request body (multipart/form-data)

| Campo       | Tipo   | Requerido | Descripción                                                |
| ----------- | ------ | --------- | ---------------------------------------------------------- |
| `audio`     | file   | ✅         | Archivo de audio (wav, mp3, m4a, webm). Máximo 10 MB       |
| `form_type` | string | No        | Tipo de formulario: `sale`, `expense`, `ingredient_update`. Default: `sale` |

---

#### Ejemplo de request

**Headers**
```
POST /api/v1/voice/transcribe?form_type=expense
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (multipart)**
```
audio: <archivo de audio>
```

---

#### Respuesta exitosa · `200 OK`

Con extracción de campos (`form_type=sale`):
```json
{
  "data": {
    "transcription": "tres hamburguesas dobles y dos papas fritas",
    "fields": {
      "items": [
        { "name": "hamburguesa doble", "quantity": 3 },
        { "name": "papas fritas", "quantity": 2 }
      ]
    }
  }
}
```

Cuando Claude API no está disponible (`fields` es `null`):
```json
{
  "data": {
    "transcription": "tres hamburguesas dobles y dos papas fritas",
    "fields": null
  }
}
```

> Si `fields` es `null`, usar `transcription` para que el usuario llene el formulario manualmente.

---

#### Campos extraídos por `form_type`

**`sale`**
| Campo    | Tipo  | Descripción               |
| -------- | ----- | ------------------------- |
| `items`  | array | Lista de `{ name, quantity }` |

**`expense`**
| Campo         | Tipo   | Descripción           |
| ------------- | ------ | --------------------- |
| `description` | string | Descripción del gasto |
| `amount`      | number | Monto en soles        |
| `category`    | string | Categoría del gasto   |

**`ingredient_update`**
| Campo        | Tipo   | Descripción              |
| ------------ | ------ | ------------------------ |
| `ingredient` | string | Nombre del ingrediente   |
| `quantity`   | number | Cantidad a actualizar    |
| `unit`       | string | Unidad de medida         |

---

#### Casos de error

| Status | Error               | Causa                                  |
| ------ | ------------------- | -------------------------------------- |
| 400    | Bad Request         | Archivo ausente                        |
| 401    | Unauthorized        | Token ausente o inválido               |
| 413    | Payload Too Large   | Archivo mayor a 10 MB                  |
| 503    | Service Unavailable | Groq Whisper no disponible             |
