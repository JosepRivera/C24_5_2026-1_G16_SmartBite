-- prisma/sql/01_views.sql
-- Vistas SQL de SmartBite
-- Este archivo se ejecuta automáticamente cuando Docker crea el contenedor
-- por primera vez (docker-entrypoint-initdb.d).
-- Usar CREATE OR REPLACE para que sea idempotente.
-- Si se modifica una vista: pnpm clean → pnpm dev:build

-- ─────────────────────────────────────────────
-- Vista: v_daily_summary
-- Usada por: REP-1 Dashboard
-- Agrega los totales del día actual sin recalcular JOINs en cada request.
--
-- NOTA: Esta vista solo agrega ingresos por método de pago.
-- La "ganancia estimada" del dashboard se calcula en DashboardService
-- combinando esta vista con una query separada a expenses.
-- No se incluyen gastos aquí para mantener la vista con una sola
-- responsabilidad y evitar un JOIN costoso en cada SELECT.
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW v_daily_summary AS
SELECT
  COALESCE(SUM(CASE WHEN status = 'PAID_CASH'  THEN total ELSE 0 END), 0)                      AS cash_income,
  COALESCE(SUM(CASE WHEN status IN ('PAID_YAPE','PAID_PLIN','PAID_AGORA') THEN total ELSE 0 END), 0) AS digital_income,
  COALESCE(SUM(CASE WHEN status NOT IN ('CANCELLED','OPEN') THEN total ELSE 0 END), 0)         AS total_income,
  COUNT(CASE WHEN status = 'OPEN' THEN 1 END)                                                   AS open_orders,
  COUNT(CASE WHEN status NOT IN ('CANCELLED','OPEN') THEN 1 END)                               AS paid_orders
FROM sales
WHERE created_at::date = CURRENT_DATE;


-- ─────────────────────────────────────────────
-- Vista: v_product_profitability
-- Usada por: REP-3 Rentabilidad
-- Calcula margen unitario de cada producto activo cruzando precio,
-- receta y costo de insumos.
--
-- Requiere: ingredients.cost_per_unit (campo obligatorio desde ADR-0013).
-- Si un producto no tiene receta o sus insumos no tienen cost_per_unit,
-- unit_cost = 0.00 y el margen equivale al precio de venta completo.
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW v_product_profitability AS
SELECT
  p.id,
  p.name,
  p.category,
  p.price                                                                     AS sale_price,
  COALESCE(SUM(r.quantity * i.cost_per_unit), 0)                             AS unit_cost,
  p.price - COALESCE(SUM(r.quantity * i.cost_per_unit), 0)                   AS unit_margin,
  CASE
    WHEN p.price > 0
    THEN ROUND(
      ((p.price - COALESCE(SUM(r.quantity * i.cost_per_unit), 0)) / p.price * 100)::numeric,
      2
    )
    ELSE 0
  END                                                                          AS margin_percentage
FROM products p
LEFT JOIN recipes r     ON r.product_id    = p.id
LEFT JOIN ingredients i ON i.id            = r.ingredient_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.category, p.price;