import { createZodDto } from "nestjs-zod";
import type { z } from "zod";
import { CreateIngredientSchema } from "./create-ingredient.dto";

export const UpdateIngredientSchema = CreateIngredientSchema.partial();

export type UpdateIngredient = z.infer<typeof UpdateIngredientSchema>;

export class UpdateIngredientDto extends createZodDto(UpdateIngredientSchema) {}
