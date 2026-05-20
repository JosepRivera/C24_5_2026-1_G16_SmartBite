import { z } from "zod";
import { SaleStatus } from "@/prisma/prisma.service";

export const SaleItemResponseSchema = z.object({
	id: z.string().uuid(),
	product_id: z.string().uuid(),
	product_name: z.string(),
	quantity: z.number().int(),
	unit_price: z.number(),
	subtotal: z.number(),
});

export const SaleResponseSchema = z.object({
	id: z.string().uuid(),
	status: z.nativeEnum(SaleStatus),
	total: z.number(),
	table_number: z.string().nullable(),
	customer_name: z.string().nullable(),
	created_at: z.date(),
	user: z.object({
		id: z.string(),
		name: z.string(),
		username: z.string(),
	}),
	items: z.array(SaleItemResponseSchema),
});

export type SaleResponse = z.infer<typeof SaleResponseSchema>;
