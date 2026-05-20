import { z } from "zod";

export const ExpenseResponseSchema = z.object({
	id: z.string().uuid(),
	description: z.string(),
	amount: z.number(),
	category: z.string(),
	created_at: z.date(),
	user_id: z.string().uuid(),
});

export type ExpenseResponse = z.infer<typeof ExpenseResponseSchema>;
