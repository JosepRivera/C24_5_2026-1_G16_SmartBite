import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const PaySaleSchema = z.object({
	payment_method: z.enum(["CASH", "YAPE", "PLIN", "AGORA"]),
});

export type PaySale = z.infer<typeof PaySaleSchema>;

export class PaySaleDto extends createZodDto(PaySaleSchema) {}
