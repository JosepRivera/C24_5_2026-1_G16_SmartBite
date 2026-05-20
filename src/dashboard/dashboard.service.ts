import { Injectable } from "@nestjs/common";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService } from "@/prisma/prisma.service";
import { toLimaDayRange } from "@/common/utils/timezone";

interface DailySummaryRow {
	cash_income: unknown;
	digital_income: unknown;
	total_income: unknown;
	open_orders: unknown;
	paid_orders: unknown;
}

interface TopProductRow {
	product_id: string;
	name: string;
	category: string | null;
	quantity: bigint;
	revenue: unknown;
}

@Injectable()
export class DashboardService {
	constructor(private readonly prisma: PrismaService) {}

	async getDailySummary(dateParam?: string) {
		const { start: today, end: tomorrow } = toLimaDayRange(dateParam);

		const [summary] = await this.prisma.$queryRaw<DailySummaryRow[]>`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'PAID_CASH' THEN total ELSE 0 END), 0) AS cash_income,
        COALESCE(SUM(CASE WHEN status IN ('PAID_YAPE','PAID_PLIN','PAID_AGORA') THEN total ELSE 0 END), 0) AS digital_income,
        COALESCE(SUM(CASE WHEN status NOT IN ('CANCELLED','OPEN') THEN total ELSE 0 END), 0) AS total_income,
        COUNT(CASE WHEN status = 'OPEN' THEN 1 END) AS open_orders,
        COUNT(CASE WHEN status NOT IN ('CANCELLED','OPEN') THEN 1 END) AS paid_orders
      FROM sales
      WHERE created_at >= ${today} AND created_at < ${tomorrow}
    `;

		const [expensesAgg, topProducts] = await Promise.all([
			this.prisma.expense.aggregate({
				_sum: { amount: true },
				where: { createdAt: { gte: today, lt: tomorrow } },
			}),
			this.prisma.$queryRaw<TopProductRow[]>`
				SELECT
					si.product_id,
					p.name,
					p.category,
					SUM(si.quantity)::int                         AS quantity,
					SUM(si.quantity * si.unit_price)              AS revenue
				FROM sale_items si
				JOIN products p ON p.id = si.product_id
				JOIN sales s    ON s.id = si.sale_id
				WHERE s.status NOT IN ('OPEN', 'CANCELLED')
					AND s.created_at >= ${today}
					AND s.created_at <  ${tomorrow}
				GROUP BY si.product_id, p.name, p.category
				ORDER BY quantity DESC
				LIMIT 5
			`,
		]);

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
				product_id: p.product_id,
				name: p.name,
				category: p.category,
				quantity: Number(p.quantity),
				revenue: Math.round(Number(p.revenue) * 100) / 100,
			})),
		};
	}
}
