import { Injectable, NotFoundException } from "@nestjs/common";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { DemandScheduler } from "@/demand/demand.scheduler";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService } from "@/prisma/prisma.service";

@Injectable()
export class ProductionPlansService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly demandScheduler: DemandScheduler,
	) {}

	async getToday() {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const plans = await this.prisma.dailyProductionPlan.findMany({
			where: { date: { gte: today, lt: tomorrow } },
			include: {
				product: { select: { id: true, name: true } },
			},
			orderBy: { product: { name: "asc" } },
		});

		if (plans.length === 0) {
			throw new NotFoundException("No hay plan de producción para hoy");
		}

		return {
			date: today.toISOString().slice(0, 10),
			items: plans.map((p) => ({
				id: p.id,
				product_id: p.productId,
				product_name: p.product.name,
				quantity: Number(p.quantity),
				prediction_source: p.predictionSource,
			})),
		};
	}

	async regenerate() {
		await this.demandScheduler.triggerManually();
		return { message: "Plan de producción regenerado exitosamente" };
	}
}
