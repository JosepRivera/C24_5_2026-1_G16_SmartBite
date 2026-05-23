import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const UpdatePasswordSchema = z.object({
	password: z
		.string()
		.min(6, "La contraseña debe tener al menos 6 caracteres")
		.max(128, "La contraseña no puede exceder 128 caracteres"),
});

export type UpdatePasswordDto = z.infer<typeof UpdatePasswordSchema>;

export class UpdatePasswordDtoClass extends createZodDto(UpdatePasswordSchema) {}

// Backward-compat aliases (kept to avoid breaking service imports)
export const ResetPasswordSchema = UpdatePasswordSchema;
export type ResetPasswordDto = UpdatePasswordDto;
export class ResetPasswordDtoClass extends UpdatePasswordDtoClass {}
