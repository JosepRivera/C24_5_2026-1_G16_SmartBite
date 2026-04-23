import { createZodDto } from "nestjs-zod";
import type { z } from "zod";
import { CreateProductSchema } from "./create-product.dto";

export const UpdateProductSchema = CreateProductSchema.partial();

export type UpdateProduct = z.infer<typeof UpdateProductSchema>;

export class UpdateProductDto extends createZodDto(UpdateProductSchema) {}
