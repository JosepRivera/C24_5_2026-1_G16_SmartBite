import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const CorrectSaleSchema = z
	.object({
		items: z
			.array(
				z.object({
					product_id: z.string().uuid(),
					quantity: z.number().int().positive(),
				}),
			)
			.min(1)
			.optional(),
		payment_method: z.enum(["CASH", "YAPE", "PLIN", "AGORA"]).optional(),
	})
	.refine((data) => data.items !== undefined || data.payment_method !== undefined, {
		message: "Debe especificar al menos items o payment_method",
	});

export type CorrectSale = z.infer<typeof CorrectSaleSchema>;

export class CorrectSaleDto extends createZodDto(CorrectSaleSchema) {}
