import { z } from "zod";

export const KpiDeltaSchema = z.object({
	delta: z.number(),
	percent: z.number().nullable(),
});

export const YesterdayComparisonSchema = z.object({
	income: KpiDeltaSchema,
	expenses: KpiDeltaSchema,
	profit: KpiDeltaSchema,
	tickets: KpiDeltaSchema,
});

export const TimeSeriesEntrySchema = z.object({
	date: z.string(),
	income: z.number(),
	expenses: z.number(),
	profit: z.number(),
});

export const TopProductResponseSchema = z.object({
	product_id: z.string().uuid(),
	name: z.string(),
	category: z.string().nullable(),
	quantity: z.number().int(),
	revenue: z.number(),
	margin: z.number().nullable(),
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
	yesterday_comparison: YesterdayComparisonSchema.nullable().optional(),
	time_series: z.array(TimeSeriesEntrySchema).optional(),
});

export type KpiDelta = z.infer<typeof KpiDeltaSchema>;
export type YesterdayComparison = z.infer<typeof YesterdayComparisonSchema>;
export type TimeSeriesEntry = z.infer<typeof TimeSeriesEntrySchema>;
export type TopProductResponse = z.infer<typeof TopProductResponseSchema>;
export type DailySummaryResponse = z.infer<typeof DailySummaryResponseSchema>;
