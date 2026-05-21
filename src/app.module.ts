import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { validate } from "@/config/env";
import { AiModule } from "./ai/ai.module";
import { GroqModule } from "./groq/groq.module";
import { AlertsModule } from "./alerts/alerts.module";
import { AuthModule } from "./auth/auth.module";
import { CashClosesModule } from "./cash-closes/cash-closes.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { DemandModule } from "./demand/demand.module";
import { DevicesModule } from "./devices/devices.module";
import { ExpensesModule } from "./expenses/expenses.module";
import { IngredientsModule } from "./ingredients/ingredients.module";
import { MrpModule } from "./mrp/mrp.module";
import { PaymentsModule } from "./payments/payments.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProductionPlansModule } from "./production-plans/production-plans.module";
import { ProductsModule } from "./products/products.module";
import { RecipesModule } from "./recipes/recipes.module";
import { ReportsModule } from "./reports/reports.module";
import { SalesModule } from "./sales/sales.module";
import { SupabaseModule } from "./supabase/supabase.module";
import { UsersModule } from "./users/users.module";
import { VoiceModule } from "./voice/voice.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			validate,
		}),
		ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
		ScheduleModule.forRoot(),
		GroqModule,
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
		DevicesModule,
		PaymentsModule,
		AiModule,
		DemandModule,
		MrpModule,
		ProductionPlansModule,
		VoiceModule,
	],
	providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
