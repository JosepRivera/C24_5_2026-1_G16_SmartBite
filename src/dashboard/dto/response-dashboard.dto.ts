import { z } from "zod";

export const TopProductResponseSchema = z.object({
	product_id: z.string().uuid(),
	name: z.string(),
	category: z.string().nullable(),
	quantity: z.number().int(),
	revenue: z.number(),
});

export const DailySummaryResponseSchema = z.object({
	cash_income: z.number(),
	digital_income: z.number(),
	total_income: z.number(),
	open_orders: z.number().int(),
	paid_orders: z.number().int(),
	total_expenses: z.number(),
	estimated_profit: z.number(),
	top_products: z.array(TopProductResponseSchema),
});

export type DailySummaryResponse = z.infer<typeof DailySummaryResponseSchema>;
