import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const CreateIngredientSchema = z.object({
	name: z.string().min(1).max(100),
	unit: z.string().min(1).max(20),
	stock: z.number().min(0),
	min_stock: z.number().min(0),
	cost_per_unit: z.number().min(0).default(0),
});

export type CreateIngredient = z.infer<typeof CreateIngredientSchema>;

export class CreateIngredientDto extends createZodDto(CreateIngredientSchema) {}
