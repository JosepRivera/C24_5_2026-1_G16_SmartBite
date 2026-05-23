import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const ResetUserPasswordSchema = z.object({
	password: z
		.string()
		.min(8, "La contraseña debe tener al menos 8 caracteres")
		.max(128, "La contraseña no puede exceder 128 caracteres"),
});

export type ResetUserPassword = z.infer<typeof ResetUserPasswordSchema>;

export class ResetUserPasswordDto extends createZodDto(ResetUserPasswordSchema) {}
