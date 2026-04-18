import { BadRequestException, Injectable } from "@nestjs/common";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService } from "@/prisma/prisma.service";

type GroupBy = "day" | "week" | "month";

interface ProfitabilityRow {
	id: unknown;
	name: unknown;
	category: unknown;
	sale_price: unknown;
	unit_cost: unknown;
	unit_margin: unknown;
	margin_percentage: unknown;
}

@Injectable()
export class ReportsService {
	constructor(private readonly prisma: PrismaService) {}

	async getByPeriod(from: string, to: string, groupBy: GroupBy = "day", userId?: string) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
			throw new BadRequestException("Fechas inválidas. Formato esperado: YYYY-MM-DD");
		}

		const fromDate = new Date(from);
		const toDate = new Date(to);
		toDate.setDate(toDate.getDate() + 1);

		if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
			throw new BadRequestException("Fechas inválidas.");
		}

		const sales = await this.prisma.sale.findMany({
			where: {
				status: { notIn: ["OPEN", "CANCELLED"] },
				createdAt: { gte: fromDate, lt: toDate },
				...(userId ? { userId } : {}),
			},
			select: {
				total: true,
				status: true,
				createdAt: true,
			},
			orderBy: { createdAt: "asc" },
		});

		const grouped = new Map<string, { total: number; count: number }>();

		for (const sale of sales) {
			const key = getPeriodKey(sale.createdAt, groupBy);
			const current = grouped.get(key) ?? { total: 0, count: 0 };
			grouped.set(key, {
				total: current.total + Number(sale.total),
				count: current.count + 1,
			});
		}

		return Array.from(grouped.entries()).map(([period, data]) => ({
			period,
			total_income: data.total,
			order_count: data.count,
		}));
	}

	async getProfitability() {
		const rows = await this.prisma.$queryRaw<ProfitabilityRow[]>`
      SELECT * FROM v_product_profitability ORDER BY unit_margin DESC
    `;

		return rows.map((r) => ({
			product_id: r.id,
			name: r.name,
			category: r.category,
			sale_price: Number(r.sale_price),
			unit_cost: Number(r.unit_cost),
			unit_margin: Number(r.unit_margin),
			margin_percentage: Number(r.margin_percentage),
		}));
	}
}

function getPeriodKey(date: Date, groupBy: GroupBy): string {
	const d = new Date(date);
	if (groupBy === "day") {
		return d.toISOString().slice(0, 10);
	}
	if (groupBy === "month") {
		return d.toISOString().slice(0, 7);
	}
	// week: ISO week start (Monday)
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1);
	const monday = new Date(d.setDate(diff));
	return monday.toISOString().slice(0, 10);
}
