import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const RefreshSchema = z.object({
	refresh_token: z.string().min(1, "El refresh token es requerido"),
});

export type RefreshDto = z.infer<typeof RefreshSchema>;

export class RefreshDtoClass extends createZodDto(RefreshSchema) {}
