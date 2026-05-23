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
		status: z.literal("CANCELLED").optional(),
	})
	.refine(
		(data) => {
			// When status === "CANCELLED", no other fields are allowed
			if (data.status === "CANCELLED") {
				return data.items === undefined && data.payment_method === undefined;
			}
			// Otherwise, at least one field must be present
			return data.items !== undefined || data.payment_method !== undefined;
		},
		{
			message:
				"Cuando status es CANCELLED no se permiten otros campos. En corrección normal debe especificar al menos items o payment_method.",
		},
	);

export type CorrectSale = z.infer<typeof CorrectSaleSchema>;

export class CorrectSaleDto extends createZodDto(CorrectSaleSchema) {}
