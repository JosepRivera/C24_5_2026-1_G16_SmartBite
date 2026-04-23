-- prisma/sql/03_indexes.sql
-- Índices parciales y especiales de SmartBite
-- Estos índices no pueden crearse completamente via Prisma schema
-- y se gestionan aquí para evitar pasos manuales.
-- Usar IF NOT EXISTS para que sean idempotentes.
--
-- Este archivo se ejecuta automáticamente cuando Docker crea el contenedor
-- por primera vez (docker-entrypoint-initdb.d).

-- ─────────────────────────────────────────────
-- Índice parcial para OPS-7: Alertas de stock bajo
-- Optimiza la consulta que busca insumos con stock <= min_stock
-- sin escanear toda la tabla ingredients.
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ingredients_low_stock
  ON ingredients (stock)
  WHERE stock <= min_stock;


-- ─────────────────────────────────────────────
-- Índice parcial para órdenes OPEN del día
-- OPS-6 y el dashboard consultan frecuentemente órdenes en estado OPEN.
-- Este índice evita escanear órdenes cerradas o canceladas.
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sales_open_today
  ON sales (created_at, table_number)
  WHERE status = 'OPEN';


-- ─────────────────────────────────────────────
-- Índice UNIQUE parcial para cash_closes
--
-- El UNIQUE sobre (date) en el schema de Prisma aplica a TODAS las filas.
-- Eso impediría crear múltiples cierres de ajuste para el mismo día,
-- ya que los ajustes también tienen la misma fecha que el cierre original.
--
-- Solución: reemplazar el UNIQUE de Prisma por este índice parcial que
-- solo aplica la restricción de unicidad a los cierres normales
-- (parent_close_id IS NULL). Los cierres de ajuste pueden ser múltiples
-- para el mismo día.
--
-- Para que esto funcione, el campo `date` en Prisma debe declararse
-- sin @unique y confiar en este índice. Prisma schema:
--   date DateTime @db.Date  ← sin @unique aquí
-- ─────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_closes_date_normal
  ON cash_closes (date)
  WHERE parent_close_id IS NULL;