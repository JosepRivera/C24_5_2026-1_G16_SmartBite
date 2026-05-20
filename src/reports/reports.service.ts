import { Injectable } from "@nestjs/common";
import { getLimaDate } from "@/common/utils/timezone";
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

	async getByPeriod(from: Date, to: Date, groupBy: GroupBy = "day", userId?: string) {
		const toDate = new Date(to);
		toDate.setUTCDate(toDate.getUTCDate() + 1);

		const sales = await this.prisma.sale.findMany({
			where: {
				status: { notIn: ["OPEN", "CANCELLED"] },
				createdAt: { gte: from, lt: toDate },
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
	if (groupBy === "day") {
		return getLimaDate(date);
	}
	if (groupBy === "month") {
		return getLimaDate(date).slice(0, 7);
	}
	// week: ISO week start (Monday) in Lima timezone
	const limaDateStr = getLimaDate(date);
	const d = new Date(`${limaDateStr}T12:00:00`); // noon to avoid DST edge cases
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1);
	const monday = new Date(d.setDate(diff));
	return monday.toISOString().slice(0, 10);
}
