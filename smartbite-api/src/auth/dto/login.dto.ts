import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const LoginSchema = z.object({
	username: z
		.string()
		.min(1, "El usuario es requerido")
		.max(50, "El usuario no puede exceder 50 caracteres"),
	password: z
		.string()
		.min(1, "La contraseña es requerida")
		.max(128, "La contraseña no puede exceder 128 caracteres"),
});

export type LoginDto = z.infer<typeof LoginSchema>;

export class LoginDtoClass extends createZodDto(LoginSchema) {}
