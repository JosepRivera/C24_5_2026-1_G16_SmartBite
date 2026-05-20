import { Injectable, NotFoundException } from "@nestjs/common";
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

	async findAll(date?: Date, category?: string) {
		const where: ExpenseWhereInput = {};

		if (date) {
			const end = new Date(date);
			end.setUTCDate(end.getUTCDate() + 1);
			where.createdAt = { gte: date, lt: end };
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
