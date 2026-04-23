import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const CreateSaleSchema = z.object({
	items: z
		.array(
			z.object({
				product_id: z.string().uuid(),
				quantity: z.number().int().positive(),
			}),
		)
		.min(1),
	table_number: z.string().max(10).optional(),
	customer_name: z.string().max(100).optional(),
});

export type CreateSale = z.infer<typeof CreateSaleSchema>;

export class CreateSaleDto extends createZodDto(CreateSaleSchema) {}
