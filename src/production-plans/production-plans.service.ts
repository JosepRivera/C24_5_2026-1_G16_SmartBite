import { Injectable, NotFoundException } from "@nestjs/common";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { DemandScheduler } from "@/demand/demand.scheduler";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService } from "@/prisma/prisma.service";
import { toLimaDayRange, getLimaDate } from "@/common/utils/timezone";

@Injectable()
export class ProductionPlansService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly demandScheduler: DemandScheduler,
	) {}

	async getToday() {
		const { start: today, end: tomorrow } = toLimaDayRange();

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
			date: getLimaDate(today),
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
