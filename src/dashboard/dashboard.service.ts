import { Injectable } from "@nestjs/common";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService } from "@/prisma/prisma.service";
import type {
	YesterdayComparison,
	TimeSeriesEntry,
} from "./dto/response-dashboard.dto";

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
	margin: unknown;
}

interface YesterdaySummaryRow {
	total_income: unknown;
	total_expenses: unknown;
	tickets: unknown;
}

interface TimeSeriesRow {
	date: unknown;
	income: unknown;
	expenses: unknown;
}

@Injectable()
export class DashboardService {
	constructor(private readonly prisma: PrismaService) {}

	async getDailySummary(today: Date) {
		const tomorrow = new Date(today);
		tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

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

		const [expensesAgg, topProducts, yesterdayComparison, timeSeries] = await Promise.all([
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
					SUM(si.quantity * si.unit_price)              AS revenue,
					vpp.margin_percentage                          AS margin
				FROM sale_items si
				JOIN products p ON p.id = si.product_id
				JOIN sales s    ON s.id = si.sale_id
				LEFT JOIN v_product_profitability vpp ON vpp.id = si.product_id
				WHERE s.status NOT IN ('OPEN', 'CANCELLED')
					AND s.created_at >= ${today}
					AND s.created_at <  ${tomorrow}
				GROUP BY si.product_id, p.name, p.category, vpp.margin_percentage
				ORDER BY quantity DESC
			`,
			this.getYesterdayComparison(today),
			this.getTimeSeries(today),
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
				margin: p.margin != null ? Number(p.margin) : null,
			})),
			yesterday_comparison: yesterdayComparison,
			time_series: timeSeries,
		};
	}

	async getYesterdayComparison(today: Date): Promise<YesterdayComparison | null> {
		const yesterday = new Date(today);
		yesterday.setUTCDate(yesterday.getUTCDate() - 1);

		const [summary] = await this.prisma.$queryRaw<YesterdaySummaryRow[]>`
      SELECT
        COALESCE(SUM(CASE WHEN status NOT IN ('CANCELLED','OPEN') THEN total ELSE 0 END), 0) AS total_income,
        COUNT(CASE WHEN status NOT IN ('CANCELLED','OPEN') THEN 1 END) AS tickets
      FROM sales
      WHERE created_at >= ${yesterday} AND created_at < ${today}
    `;

		const expenseAgg = await this.prisma.expense.aggregate({
			_sum: { amount: true },
			where: { createdAt: { gte: yesterday, lt: today } },
		});

		const todayIncome = await this.prisma.$queryRaw<{ total_income: unknown; tickets: unknown }[]>`
      SELECT
        COALESCE(SUM(CASE WHEN status NOT IN ('CANCELLED','OPEN') THEN total ELSE 0 END), 0) AS total_income,
        COUNT(CASE WHEN status NOT IN ('CANCELLED','OPEN') THEN 1 END) AS tickets
      FROM sales
      WHERE created_at >= ${today} AND created_at < ${new Date(today.getTime() + 86400000)}
    `;

		const todayExpenses = await this.prisma.expense.aggregate({
			_sum: { amount: true },
			where: { createdAt: { gte: today, lt: new Date(today.getTime() + 86400000) } },
		});

		const yIncome = Number(summary.total_income ?? 0);
		const yExpenses = Number(expenseAgg._sum.amount ?? 0);
		const yProfit = yIncome - yExpenses;
		const yTickets = Number(summary.tickets ?? 0);

		const tIncome = Number(todayIncome[0]?.total_income ?? 0);
		const tExpenses = Number(todayExpenses._sum.amount ?? 0);
		const tProfit = tIncome - tExpenses;
		const tTickets = Number(todayIncome[0]?.tickets ?? 0);

		// If yesterday has no data at all, return null
		if (yIncome === 0 && yExpenses === 0 && yTickets === 0) {
			return null;
		}

		const calcDelta = (todayVal: number, yesterdayVal: number) => ({
			delta: todayVal - yesterdayVal,
			percent: yesterdayVal !== 0 ? ((todayVal - yesterdayVal) / Math.abs(yesterdayVal)) * 100 : null,
		});

		return {
			income: calcDelta(tIncome, yIncome),
			expenses: calcDelta(tExpenses, yExpenses),
			profit: calcDelta(tProfit, yProfit),
			tickets: calcDelta(tTickets, yTickets),
		};
	}

	async getTimeSeries(today: Date): Promise<TimeSeriesEntry[]> {
		const startDate = new Date(today);
		startDate.setUTCDate(startDate.getUTCDate() - 29);

		const salesData = await this.prisma.$queryRaw<TimeSeriesRow[]>`
      SELECT
        DATE(created_at) AS date,
        COALESCE(SUM(CASE WHEN status NOT IN ('CANCELLED','OPEN') THEN total ELSE 0 END), 0) AS income
      FROM sales
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

		const expenseData = await this.prisma.$queryRaw<{ date: unknown; expenses: unknown }[]>`
      SELECT
        DATE(created_at) AS date,
        COALESCE(SUM(amount), 0) AS expenses
      FROM expenses
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

		// Build lookup maps
		const incomeMap = new Map<string, number>();
		for (const row of salesData) {
			const dateStr = String(row.date);
			incomeMap.set(dateStr, Number(row.income));
		}

		const expenseMap = new Map<string, number>();
		for (const row of expenseData) {
			const dateStr = String(row.date);
			expenseMap.set(dateStr, Number(row.expenses));
		}

		// Generate 30-day series with zero-fill
		const result: TimeSeriesEntry[] = [];
		for (let i = 0; i < 30; i++) {
			const d = new Date(startDate);
			d.setUTCDate(d.getUTCDate() + i);
			const dateStr = d.toISOString().split("T")[0];
			const income = incomeMap.get(dateStr) ?? 0;
			const expenses = expenseMap.get(dateStr) ?? 0;
			result.push({ date: dateStr, income, expenses, profit: income - expenses });
		}

		return result;
	}
}
