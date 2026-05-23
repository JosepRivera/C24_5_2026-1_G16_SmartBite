import { Injectable, UnprocessableEntityException } from "@nestjs/common";
import { getLimaDate } from "@/common/utils/timezone";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService } from "@/prisma/prisma.service";
import { Prisma } from "../generated/prisma/client";

type GroupBy = "day" | "week" | "month";

const VALID_GROUP_BY: readonly GroupBy[] = ["day", "week", "month"] as const;

interface ProfitabilityRow {
	id: unknown;
	name: unknown;
	category: unknown;
	sale_price: unknown;
	unit_cost: unknown;
	unit_margin: unknown;
	margin_percentage: unknown;
}

interface PeriodRow {
	period: Date;
	total_income: unknown;
	order_count: unknown;
}

@Injectable()
export class ReportsService {
	constructor(private readonly prisma: PrismaService) {}

	async getByPeriod(from: Date, to: Date, groupBy: GroupBy = "day", userId?: string) {
		if (!VALID_GROUP_BY.includes(groupBy)) {
			throw new UnprocessableEntityException(
				`groupBy must be one of: ${VALID_GROUP_BY.join(", ")}`,
			);
		}

		const toDate = new Date(to);
		toDate.setUTCDate(toDate.getUTCDate() + 1);

		// groupBy is validated against the whitelist above — safe to inline.
		// Wrap in single quotes so DATE_TRUNC receives a string literal, not a column ref.
		const period = Prisma.raw(`'${groupBy}'`);

		let rows: PeriodRow[];

		if (userId) {
			rows = await this.prisma.$queryRaw<PeriodRow[]>`
				SELECT
					DATE_TRUNC(${period}, "created_at" AT TIME ZONE 'America/Lima') AS period,
					SUM("total") AS total_income,
					COUNT(*) AS order_count
				FROM "sales"
				WHERE "status" NOT IN ('OPEN', 'CANCELLED')
					AND "created_at" >= ${from}
					AND "created_at" < ${toDate}
					AND "user_id" = ${userId}
				GROUP BY 1
				ORDER BY 1 ASC
			`;
		} else {
			rows = await this.prisma.$queryRaw<PeriodRow[]>`
				SELECT
					DATE_TRUNC(${period}, "created_at" AT TIME ZONE 'America/Lima') AS period,
					SUM("total") AS total_income,
					COUNT(*) AS order_count
				FROM "sales"
				WHERE "status" NOT IN ('OPEN', 'CANCELLED')
					AND "created_at" >= ${from}
					AND "created_at" < ${toDate}
				GROUP BY 1
				ORDER BY 1 ASC
			`;
		}

		return rows.map((row) => ({
			period: formatPeriod(row.period, groupBy),
			total_income: Number(row.total_income),
			order_count: Number(row.order_count),
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

function formatPeriod(date: Date, groupBy: GroupBy): string {
	const limaDate = getLimaDate(date);
	if (groupBy === "month") {
		return limaDate.slice(0, 7);
	}
	return limaDate;
}
