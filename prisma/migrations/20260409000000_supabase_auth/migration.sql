-- Migration: SmartBite schema completo con Supabase Auth
--
-- LOCAL (Supabase CLI): esta migration corre normalmente con `prisma migrate deploy`.
--   pnpm supabase:start → pnpm db:deploy (o pnpm db:migrate en dev)
--
-- CLOUD (Supabase existente con tablas ya creadas): registrar como baseline.
--   pnpm db:baseline   → marca esta migration como aplicada sin tocar la BD.
--
-- Cambios respecto a la migration anterior (20260326180610_init):
--   - users: eliminado campo `password` (Supabase Auth lo gestiona)
--   - users: id sin DEFAULT — viene de auth.users vía Supabase Auth
--   - eliminada tabla `refresh_tokens` (Supabase Auth la gestiona internamente)

-- CreateEnum
CREATE TYPE "role_enum" AS ENUM ('OWNER', 'CASHIER', 'WAITER', 'COOK');

-- CreateEnum
CREATE TYPE "sale_status_enum" AS ENUM ('OPEN', 'PAID_CASH', 'PAID_YAPE', 'PAID_PLIN', 'PAID_AGORA', 'CANCELLED');

-- CreateEnum
CREATE TYPE "payment_source_enum" AS ENUM ('YAPE', 'PLIN', 'AGORA');

-- CreateTable: users
-- El id viene de Supabase Auth (auth.users). Sin password ni refresh tokens.
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "role" "role_enum" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "category" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "stock" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "min_stock" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "cost_per_unit" DECIMAL(10,4) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "quantity" DECIMAL(10,4) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "status" "sale_status_enum" NOT NULL DEFAULT 'OPEN',
    "total" DECIMAL(10,2) NOT NULL,
    "table_number" VARCHAR(10),
    "customer_name" TEXT,
    "user_id" UUID NOT NULL,
    "updated_by" UUID,
    "cancelled_by" UUID,
    "cancelled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sale_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_closes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date" DATE NOT NULL,
    "cash_income" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "digital_income" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_income" DECIMAL(10,2) NOT NULL,
    "total_expenses" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "net_profit" DECIMAL(10,2) NOT NULL,
    "closed_by" UUID NOT NULL,
    "parent_close_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_closes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notification_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "sender_name" TEXT NOT NULL,
    "source" "payment_source_enum" NOT NULL,
    "raw_text" VARCHAR(500) NOT NULL,
    "is_reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "api_key_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "registered_by" UUID NOT NULL,
    "last_used_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_baselines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "reference_baselines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_production_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date" DATE NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "prediction_source" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_production_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE INDEX "idx_users_role" ON "users"("role");
CREATE INDEX "idx_products_is_active" ON "products"("is_active");
CREATE INDEX "idx_products_category" ON "products"("category");
CREATE INDEX "idx_ingredients_stock" ON "ingredients"("stock");
CREATE UNIQUE INDEX "uq_recipes_product_ingredient" ON "recipes"("product_id", "ingredient_id");
CREATE INDEX "idx_recipes_product_id" ON "recipes"("product_id");
CREATE INDEX "idx_sales_status" ON "sales"("status");
CREATE INDEX "idx_sales_table_number" ON "sales"("table_number");
CREATE INDEX "idx_sales_user_id" ON "sales"("user_id");
CREATE INDEX "idx_sales_created_at" ON "sales"("created_at");
CREATE INDEX "idx_sale_items_sale_id" ON "sale_items"("sale_id");
CREATE INDEX "idx_sale_items_product_id" ON "sale_items"("product_id");
CREATE INDEX "idx_expenses_created_at" ON "expenses"("created_at");
CREATE INDEX "idx_expenses_user_id" ON "expenses"("user_id");
CREATE UNIQUE INDEX "payment_notifications_notification_id_key" ON "payment_notifications"("notification_id");
CREATE INDEX "idx_payment_notifications_notification_id" ON "payment_notifications"("notification_id");
CREATE INDEX "idx_payment_notifications_is_reviewed" ON "payment_notifications"("is_reviewed");
CREATE INDEX "idx_payment_notifications_created_at" ON "payment_notifications"("created_at");
CREATE UNIQUE INDEX "device_tokens_api_key_hash_key" ON "device_tokens"("api_key_hash");
CREATE INDEX "idx_device_tokens_is_active" ON "device_tokens"("is_active");
CREATE UNIQUE INDEX "uq_reference_baselines_product_day" ON "reference_baselines"("product_id", "day_of_week");
CREATE INDEX "idx_daily_production_plans_date" ON "daily_production_plans"("date");
CREATE UNIQUE INDEX "uq_daily_production_plans_date_product" ON "daily_production_plans"("date", "product_id");

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_closes" ADD CONSTRAINT "cash_closes_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_closes" ADD CONSTRAINT "cash_closes_parent_close_id_fkey" FOREIGN KEY ("parent_close_id") REFERENCES "cash_closes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_notifications" ADD CONSTRAINT "payment_notifications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reference_baselines" ADD CONSTRAINT "reference_baselines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_production_plans" ADD CONSTRAINT "daily_production_plans_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
