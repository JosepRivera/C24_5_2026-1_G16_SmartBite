import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const ResetPasswordSchema = z.object({
	password: z
		.string()
		.min(6, "La contraseña debe tener al menos 6 caracteres")
		.max(128, "La contraseña no puede exceder 128 caracteres"),
});

export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;

export class ResetPasswordDtoClass extends createZodDto(ResetPasswordSchema) {}
