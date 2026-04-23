import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const CreateProductSchema = z.object({
	name: z.string().min(1).max(100),
	price: z.number().positive(),
	category: z.string().min(1).max(50),
});

export type CreateProduct = z.infer<typeof CreateProductSchema>;

export class CreateProductDto extends createZodDto(CreateProductSchema) {}
