# Reportes · docs/api/03-reports.md

> Dashboard, reportes por período, rentabilidad y cierre de caja.
>
> **Base URL:** `http://localhost:3000/api/v1`
>
> **Formato de respuestas:** ver `01-auth.md#formato-de-respuestas` — éxito en `data: {}`, validación en `errors: []`.

---

## Índice

- [Dashboard · GET /dashboard](#dashboard--get-dashboard)
- [Reportes por período · GET /reports/periods](#reportes-por-período--get-reportsperiods)
- [Rentabilidad · GET /reports/profitability](#rentabilidad--get-reportsprofitability)
- [Listar cierres · GET /cash-closes](#listar-cierres--get-cash-closes)
- [Generar cierre · POST /cash-closes](#generar-cierre--post-cash-closes)
- [Obtener cierre · GET /cash-closes/:id](#obtener-cierre--get-cash-closesid)

---

## Dashboard · GET /dashboard

> Resumen en tiempo real del día: ventas totales, desglose efectivo vs digital, productos más vendidos y ganancia estimada.

**Autenticación:** Requiere Bearer token
**Roles permitidos:** `OWNER`

---

### Ejemplo de request

```
GET /api/v1/dashboard
Authorization: Bearer <token>
```

---

### Respuesta exitosa · `200 OK`

```json
{
  "data": {
    "cash_income": 4800,
    "digital_income": 800,
    "total_income": 5600,
    "open_orders": 1,
    "paid_orders": 2,
    "total_expenses": 1200,
    "estimated_profit": 4400,
    "top_products": [
      {
        "product_id": "89c04027-59c0-4e4e-885e-fab292015dae",
        "name": "Hamburguesa Doble",
        "quantity_sold": 4
      },
      {
        "product_id": "e9da7c23-05ff-4176-a8f3-883908636183",
        "name": "Papas Fritas",
        "quantity_sold": 2
      }
    ]
  }
}
```

> Si no hay ventas en el día, todos los campos numéricos son `0` y `top_products` es `[]`.

---

### Casos de error

| Status | Mensaje | Causa |
| ------ | ------- | ----- |
| 401 | `"Token ausente"` | Token ausente o inválido |
| 403 | `"No tienes permiso para esta acción"` | Rol sin permiso (requiere OWNER) |

---

## Reportes por período · GET /reports/periods

> Ventas agrupadas por día, semana o mes con comparación entre períodos.
> Filtro por empleado para análisis de rendimiento individual.

**Autenticación:** Requiere Bearer token
**Roles permitidos:** `OWNER`

---

### Query parameters

| Parámetro | Tipo   | Requerido | Descripción                            |
| --------- | ------ | --------- | -------------------------------------- |
| `from`    | date   | ✅         | Fecha de inicio `YYYY-MM-DD`           |
| `to`      | date   | ✅         | Fecha de fin `YYYY-MM-DD`              |
| `groupBy` | string | ❌         | `day`, `week`, `month`. Default: `day` |
| `user_id` | UUID   | ❌         | Filtra por empleado                    |

> **Nota:** un valor inválido en `groupBy` (ej: `year`) no retorna error — silenciosamente hace fallback a `week`.

---

### Ejemplo de request

```
GET /api/v1/reports/periods?from=2026-04-01&to=2026-04-30&groupBy=day
Authorization: Bearer <token>
```

---

### Respuesta exitosa · `200 OK` — `groupBy=day`

```json
{
  "data": [
    {
      "period": "2026-04-16",
      "total_income": 5600,
      "order_count": 2
    }
  ]
}
```

### Respuesta exitosa · `200 OK` — `groupBy=week`

> El campo `period` indica el **lunes** de la semana correspondiente.

```json
{
  "data": [
    {
      "period": "2026-04-13",
      "total_income": 5600,
      "order_count": 2
    }
  ]
}
```

### Respuesta exitosa · `200 OK` — `groupBy=month`

```json
{
  "data": [
    {
      "period": "2026-04",
      "total_income": 5600,
      "order_count": 2
    }
  ]
}
```

> Si no hay ventas en el rango, `data` es un array vacío `[]`.

---

### Casos de error

| Status | Mensaje | Causa |
| ------ | ------- | ----- |
| 400 | `"Fechas inválidas. Formato esperado: YYYY-MM-DD"` | `from` o `to` ausentes o con formato incorrecto |
| 401 | `"Token ausente"` | Token ausente o inválido |
| 403 | `"No tienes permiso para esta acción"` | Rol sin permiso (requiere OWNER) |

---

## Rentabilidad · GET /reports/profitability

> Ganancia unitaria por producto: precio de venta menos costo de insumos
> según la receta. Ordena de mayor a menor margen.

**Autenticación:** Requiere Bearer token
**Roles permitidos:** `OWNER`

---

### Ejemplo de request

```
GET /api/v1/reports/profitability
Authorization: Bearer <token>
```

---

### Respuesta exitosa · `200 OK`

```json
{
  "data": [
    {
      "product_id": "89c04027-59c0-4e4e-885e-fab292015dae",
      "name": "Hamburguesa Doble",
      "category": "Hamburguesas",
      "sale_price": 2000,
      "unit_cost": 0,
      "unit_margin": 2000,
      "margin_percentage": 100
    },
    {
      "product_id": "e9da7c23-05ff-4176-a8f3-883908636183",
      "name": "Papas Fritas",
      "category": "Acompañamientos",
      "sale_price": 800,
      "unit_cost": 30,
      "unit_margin": 770,
      "margin_percentage": 96.25
    }
  ]
}
```

> `unit_cost` es `0` si el producto no tiene receta registrada. `margin_percentage` se expresa como número entre `0` y `100`.

---

### Casos de error

| Status | Mensaje | Causa |
| ------ | ------- | ----- |
| 401 | `"Token ausente"` | Token ausente o inválido |
| 403 | `"No tienes permiso para esta acción"` | Rol sin permiso (requiere OWNER) |

---

## Listar cierres · GET /cash-closes

> Lista el historial de cierres de caja ordenado por fecha descendente. La respuesta incluye metadatos de paginación.

**Autenticación:** Requiere Bearer token
**Roles permitidos:** `OWNER`

---

### Query parameters

| Parámetro | Tipo | Default | Descripción          |
| --------- | ---- | ------- | -------------------- |
| `from`    | date | —       | Fecha de inicio `YYYY-MM-DD` |
| `to`      | date | —       | Fecha de fin `YYYY-MM-DD` |
| `page`    | int  | `1`     | Página               |
| `limit`   | int  | `20`    | Registros por página |

---

### Ejemplo de request

```
GET /api/v1/cash-closes?from=2026-04-01&to=2026-04-30&page=1&limit=20
Authorization: Bearer <token>
```

---

### Respuesta exitosa · `200 OK`

```json
{
  "data": {
    "data": [
      {
        "id": "05c28ff2-a581-47bb-b051-32464314a64e",
        "date": "2026-04-18T00:00:00.000Z",
        "cash_income": 4800,
        "digital_income": 800,
        "total_income": 5600,
        "total_expenses": 1200,
        "net_profit": 4400,
        "closed_by": "e510d36a-10ea-45b9-9415-0e9a3d201643",
        "parent_close_id": null,
        "created_at": "2026-04-18T19:26:23.261Z"
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "pages": 1
    }
  }
}
```

> La respuesta está doblemente anidada en `data.data` porque el interceptor global envuelve la respuesta paginada. `data.meta` contiene los metadatos de paginación.

---

### Casos de error

| Status | Mensaje | Causa |
| ------ | ------- | ----- |
| 401 | `"Token ausente"` | Token ausente o inválido |
| 403 | `"No tienes permiso para esta acción"` | Rol sin permiso (requiere OWNER) |

---

## Generar cierre · POST /cash-closes

> Genera el cierre de caja del día actual. Solo se puede generar uno por día.
> El registro es inmutable: no se puede modificar ni eliminar después.

**Autenticación:** Requiere Bearer token
**Roles permitidos:** `OWNER`

---

### Request body

No requiere body. El sistema calcula automáticamente todos los totales
a partir de las ventas y gastos del día.

---

### Ejemplo de request

```
POST /api/v1/cash-closes
Authorization: Bearer <token>
```

---

### Respuesta exitosa · `201 Created`

```json
{
  "data": {
    "id": "05c28ff2-a581-47bb-b051-32464314a64e",
    "date": "2026-04-18T00:00:00.000Z",
    "cash_income": 4800,
    "digital_income": 800,
    "total_income": 5600,
    "total_expenses": 1200,
    "net_profit": 4400,
    "closed_by": "e510d36a-10ea-45b9-9415-0e9a3d201643",
    "parent_close_id": null,
    "created_at": "2026-04-18T19:26:23.261Z"
  }
}
```

---

### Casos de error

| Status | Mensaje | Causa |
| ------ | ------- | ----- |
| 401 | `"Token ausente"` | Token ausente o inválido |
| 403 | `"No tienes permiso para esta acción"` | Rol sin permiso (requiere OWNER) |
| 409 | `"Ya existe un cierre de caja para el día de hoy."` | Ya se generó el cierre de hoy |

---

## Obtener cierre · GET /cash-closes/:id

> Devuelve el detalle de un cierre de caja por su ID.

**Autenticación:** Requiere Bearer token
**Roles permitidos:** `OWNER`

---

### Parámetros de ruta

| Parámetro | Tipo | Descripción   |
| --------- | ---- | ------------- |
| `id`      | UUID | ID del cierre |

---

### Ejemplo de request

```
GET /api/v1/cash-closes/05c28ff2-a581-47bb-b051-32464314a64e
Authorization: Bearer <token>
```

---

### Respuesta exitosa · `200 OK`

```json
{
  "data": {
    "id": "05c28ff2-a581-47bb-b051-32464314a64e",
    "date": "2026-04-18T00:00:00.000Z",
    "cash_income": 4800,
    "digital_income": 800,
    "total_income": 5600,
    "total_expenses": 1200,
    "net_profit": 4400,
    "closed_by": "e510d36a-10ea-45b9-9415-0e9a3d201643",
    "parent_close_id": null,
    "created_at": "2026-04-18T19:26:23.261Z"
  }
}
```

---

### Casos de error

| Status | Mensaje | Causa |
| ------ | ------- | ----- |
| 400 | `"Validation failed (uuid is expected)"` | UUID mal formado |
| 401 | `"Token ausente"` | Token ausente o inválido |
| 403 | `"No tienes permiso para esta acción"` | Rol sin permiso (requiere OWNER) |
| 404 | `"Cierre de caja no encontrado."` | ID no existe |
