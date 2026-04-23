import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const UpsertRecipeSchema = z.object({
	items: z
		.array(
			z.object({
				ingredient_id: z.string().uuid(),
				quantity: z.number().positive(),
			}),
		)
		.min(1),
});

export type UpsertRecipe = z.infer<typeof UpsertRecipeSchema>;

export class UpsertRecipeDto extends createZodDto(UpsertRecipeSchema) {}
