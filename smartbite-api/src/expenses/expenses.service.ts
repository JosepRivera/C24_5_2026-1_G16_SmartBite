import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { ExpenseWhereInput } from "@/generated/prisma/models/Expense";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService } from "@/prisma/prisma.service";
import type { CreateExpense } from "./dto/create-expense.dto";

@Injectable()
export class ExpensesService {
	constructor(private readonly prisma: PrismaService) {}

	async create(userId: string, dto: CreateExpense) {
		const expense = await this.prisma.expense.create({
			data: {
				userId,
				description: dto.description,
				amount: dto.amount,
				category: dto.category,
			},
		});

		return formatExpense(expense);
	}

	async findAll(date?: string, category?: string) {
		const where: ExpenseWhereInput = {};

		if (date) {
			if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
				throw new BadRequestException("Fecha inválida. Formato esperado: YYYY-MM-DD");
			}
			const start = new Date(date);
			if (Number.isNaN(start.getTime())) {
				throw new BadRequestException("Fecha inválida. Formato esperado: YYYY-MM-DD");
			}
			const end = new Date(start);
			end.setDate(end.getDate() + 1);
			where.createdAt = { gte: start, lt: end };
		}

		if (category) {
			where.category = { equals: category, mode: "insensitive" };
		}

		const expenses = await this.prisma.expense.findMany({
			where,
			orderBy: { createdAt: "desc" },
		});

		return expenses.map(formatExpense);
	}

	async findOne(id: string) {
		const expense = await this.prisma.expense.findUnique({ where: { id } });
		if (!expense) throw new NotFoundException("Gasto no encontrado");
		return formatExpense(expense);
	}

	async remove(id: string) {
		const expense = await this.prisma.expense.findUnique({ where: { id } });
		if (!expense) throw new NotFoundException("Gasto no encontrado");

		await this.prisma.expense.delete({ where: { id } });

		return { id, deleted: true };
	}
}

type Expense = Awaited<ReturnType<PrismaService["expense"]["findUnique"]>>;

function formatExpense(expense: NonNullable<Expense>) {
	return {
		id: expense.id,
		description: expense.description,
		amount: Number(expense.amount),
		category: expense.category,
		created_at: expense.createdAt,
		user_id: expense.userId,
	};
}
