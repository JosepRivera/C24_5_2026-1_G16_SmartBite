import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validate } from "@/config/env";
import { AlertsModule } from "./alerts/alerts.module";
import { AuthModule } from "./auth/auth.module";
import { CashClosesModule } from "./cash-closes/cash-closes.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { ExpensesModule } from "./expenses/expenses.module";
import { IngredientsModule } from "./ingredients/ingredients.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProductsModule } from "./products/products.module";
import { RecipesModule } from "./recipes/recipes.module";
import { ReportsModule } from "./reports/reports.module";
import { SalesModule } from "./sales/sales.module";
import { SupabaseModule } from "./supabase/supabase.module";
import { UsersModule } from "./users/users.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			validate,
		}),
		PrismaModule,
		SupabaseModule,
		AuthModule,
		UsersModule,
		ProductsModule,
		IngredientsModule,
		RecipesModule,
		SalesModule,
		ExpensesModule,
		AlertsModule,
		DashboardModule,
		ReportsModule,
		CashClosesModule,
	],
})
export class AppModule {}
