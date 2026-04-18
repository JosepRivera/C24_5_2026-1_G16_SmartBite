import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { CashCloseWhereInput } from "@/generated/prisma/models/CashClose";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService } from "@/prisma/prisma.service";

@Injectable()
export class CashClosesService {
	constructor(private readonly prisma: PrismaService) {}

	async create(userId: string) {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		// 409 si ya existe un cierre normal para hoy
		const existing = await this.prisma.cashClose.findFirst({
			where: {
				date: today,
				parentCloseId: null,
			},
		});
		if (existing) {
			throw new ConflictException("Ya existe un cierre de caja para el día de hoy.");
		}

		const [salesAgg, expensesAgg] = await Promise.all([
			this.prisma.sale.groupBy({
				by: ["status"],
				_sum: { total: true },
				where: {
					status: { notIn: ["OPEN", "CANCELLED"] },
					createdAt: { gte: today, lt: tomorrow },
				},
			}),
			this.prisma.expense.aggregate({
				_sum: { amount: true },
				where: { createdAt: { gte: today, lt: tomorrow } },
			}),
		]);

		let cashIncome = 0;
		let digitalIncome = 0;

		for (const row of salesAgg) {
			const amount = Number(row._sum.total ?? 0);
			if (row.status === "PAID_CASH") {
				cashIncome += amount;
			} else {
				digitalIncome += amount;
			}
		}

		const totalIncome = cashIncome + digitalIncome;
		const totalExpenses = Number(expensesAgg._sum.amount ?? 0);
		const netProfit = totalIncome - totalExpenses;

		const cashClose = await this.prisma.cashClose.create({
			data: {
				date: today,
				cashIncome,
				digitalIncome,
				totalIncome,
				totalExpenses,
				netProfit,
				closedBy: userId,
			},
		});

		return formatCashClose(cashClose);
	}

	async findAll(from?: string, to?: string, page = 1, limit = 20) {
		const where: CashCloseWhereInput = {};

		if (from) {
			const fromDate = new Date(from);
			where.date = { gte: fromDate };
		}
		if (to) {
			const toDate = new Date(to);
			where.date = { ...(where.date as object), lte: toDate };
		}

		const [total, cashCloses] = await Promise.all([
			this.prisma.cashClose.count({ where }),
			this.prisma.cashClose.findMany({
				where,
				orderBy: { date: "desc" },
				skip: (page - 1) * limit,
				take: limit,
			}),
		]);

		return {
			data: cashCloses.map(formatCashClose),
			meta: { total, page, limit, pages: Math.ceil(total / limit) },
		};
	}

	async findOne(id: string) {
		const cashClose = await this.prisma.cashClose.findUnique({ where: { id } });
		if (!cashClose) throw new NotFoundException("Cierre de caja no encontrado.");
		return formatCashClose(cashClose);
	}
}

type CashClose = Awaited<ReturnType<PrismaService["cashClose"]["findUnique"]>>;

function formatCashClose(c: NonNullable<CashClose>) {
	return {
		id: c.id,
		date: c.date,
		cash_income: Number(c.cashIncome),
		digital_income: Number(c.digitalIncome),
		total_income: Number(c.totalIncome),
		total_expenses: Number(c.totalExpenses),
		net_profit: Number(c.netProfit),
		closed_by: c.closedBy,
		parent_close_id: c.parentCloseId,
		created_at: c.createdAt,
	};
}
