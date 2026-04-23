import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const CreateExpenseSchema = z.object({
	description: z.string().min(1).max(200),
	amount: z.number().positive(),
	category: z.string().min(1).max(50),
});

export type CreateExpense = z.infer<typeof CreateExpenseSchema>;

export class CreateExpenseDto extends createZodDto(CreateExpenseSchema) {}
