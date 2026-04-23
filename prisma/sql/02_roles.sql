-- prisma/sql/02_roles.sql
-- Permisos de base de datos para SmartBite
-- Garantiza la inmutabilidad del cierre de caja a nivel de BD.
-- Ver decisions/0005-cash-close-immutability.md
--
-- Este archivo se ejecuta después de prisma migrate deploy
-- (ver docker-compose.yml para e2e tests, o manualmente en Supabase).
-- Las tablas ya existen cuando este script corre.

-- ─────────────────────────────────────────────
-- Inmutabilidad de cash_closes
-- Revocamos UPDATE y DELETE a los roles de Supabase.
-- service_role (NestJS via admin client) conserva todos los permisos.
--   Capa 1: La API solo expone POST.
--   Capa 2: Este REVOKE impide modificaciones aunque alguien bypasee la API.
-- ─────────────────────────────────────────────
REVOKE UPDATE, DELETE ON cash_closes FROM authenticated;
REVOKE UPDATE, DELETE ON cash_closes FROM anon;