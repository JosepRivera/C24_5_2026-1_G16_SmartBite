import { Injectable } from "@nestjs/common";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService } from "@/prisma/prisma.service";

export type OperationalAlertType = "cash_close" | "open_orders" | "production_plan";

export interface OperationalAlert {
	type: OperationalAlertType;
	title: string;
	sub: string;
	to: string;
}

@Injectable()
export class AlertsService {
	constructor(private readonly prisma: PrismaService) {}

	async getLowStock() {
		const ingredients = await this.prisma.ingredient.findMany({
			where: { stock: { lte: this.prisma.ingredient.fields.minStock } },
			orderBy: { name: "asc" },
		});

		return ingredients.map((i) => ({
			id: i.id,
			name: i.name,
			unit: i.unit,
			stock: Number(i.stock),
			min_stock: Number(i.minStock),
			shortage: Number(i.minStock) - Number(i.stock),
		}));
	}

	async getOperational(): Promise<OperationalAlert[]> {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const [cashClose, openOrders, productionPlan] = await Promise.all([
			this.prisma.cashClose.findFirst({
				where: { date: today, parentCloseId: null },
				select: { id: true },
			}),
			this.prisma.sale.count({
				where: { status: "OPEN", createdAt: { gte: today, lt: tomorrow } },
			}),
			this.prisma.dailyProductionPlan.count({
				where: { date: { gte: today, lt: tomorrow } },
			}),
		]);

		const alerts: OperationalAlert[] = [];

		if (!cashClose) {
			const yesterday = new Date(today);
			yesterday.setDate(yesterday.getDate() - 1);
			const lastClose = await this.prisma.cashClose.findFirst({
				where: { parentCloseId: null },
				orderBy: { date: "desc" },
				select: { date: true },
			});
			const lastDateStr = lastClose
				? lastClose.date.toLocaleDateString("es-PE", {
						weekday: "long",
						day: "numeric",
						month: "long",
					})
				: "nunca";
			alerts.push({
				type: "cash_close",
				title: "Caja sin cerrar hoy",
				sub: `Último cierre: ${lastDateStr}`,
				to: "/cash-closes",
			});
		}

		if (openOrders > 0) {
			alerts.push({
				type: "open_orders",
				title: `${openOrders} ${openOrders === 1 ? "orden abierta" : "órdenes abiertas"} sin cobrar`,
				sub: "Pendientes de pago hoy",
				to: "/sales/new",
			});
		}

		if (productionPlan === 0) {
			alerts.push({
				type: "production_plan",
				title: "Sin plan de producción para hoy",
				sub: "El scheduler no generó el plan",
				to: "/production-plan",
			});
		}

		return alerts;
	}
}
