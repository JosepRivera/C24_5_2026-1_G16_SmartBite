import { Injectable } from "@nestjs/common";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService } from "@/prisma/prisma.service";

interface DailySummaryRow {
	cash_income: unknown;
	digital_income: unknown;
	total_income: unknown;
	open_orders: unknown;
	paid_orders: unknown;
}

@Injectable()
export class DashboardService {
	constructor(private readonly prisma: PrismaService) {}

	async getDailySummary() {
		const [summary] = await this.prisma.$queryRaw<DailySummaryRow[]>`
      SELECT * FROM v_daily_summary
    `;

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const [expensesAgg, topProducts] = await Promise.all([
			this.prisma.expense.aggregate({
				_sum: { amount: true },
				where: { createdAt: { gte: today, lt: tomorrow } },
			}),
			this.prisma.saleItem.groupBy({
				by: ["productId"],
				_sum: { quantity: true },
				where: {
					sale: {
						status: { notIn: ["OPEN", "CANCELLED"] },
						createdAt: { gte: today, lt: tomorrow },
					},
				},
				orderBy: { _sum: { quantity: "desc" } },
				take: 5,
			}),
		]);

		const productIds = topProducts.map((p) => p.productId);
		const products = await this.prisma.product.findMany({
			where: { id: { in: productIds } },
			select: { id: true, name: true },
		});

		const productMap = new Map(products.map((p) => [p.id, p.name]));

		const totalIncome = Number(summary.total_income ?? 0);
		const totalExpenses = Number(expensesAgg._sum.amount ?? 0);

		return {
			cash_income: Number(summary.cash_income ?? 0),
			digital_income: Number(summary.digital_income ?? 0),
			total_income: totalIncome,
			open_orders: Number(summary.open_orders ?? 0),
			paid_orders: Number(summary.paid_orders ?? 0),
			total_expenses: totalExpenses,
			estimated_profit: totalIncome - totalExpenses,
			top_products: topProducts.map((p) => ({
				product_id: p.productId,
				product_name: productMap.get(p.productId) ?? "Desconocido",
				quantity_sold: p._sum.quantity ?? 0,
			})),
		};
	}
}
