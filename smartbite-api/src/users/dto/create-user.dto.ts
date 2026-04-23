import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const ASSIGNABLE_ROLES = ["CASHIER", "WAITER", "COOK"] as const;

export const CreateUserSchema = z.object({
	name: z
		.string()
		.min(1, "El nombre es requerido")
		.max(100, "El nombre no puede exceder 100 caracteres"),
	username: z
		.string()
		.min(3, "El usuario debe tener al menos 3 caracteres")
		.max(50, "El usuario no puede exceder 50 caracteres")
		.regex(
			/^[a-zA-Z0-9_-]+$/,
			"El usuario solo puede contener letras, números, guiones y guiones bajos",
		),
	password: z
		.string()
		.min(6, "La contraseña debe tener al menos 6 caracteres")
		.max(128, "La contraseña no puede exceder 128 caracteres"),
	role: z.enum(ASSIGNABLE_ROLES),
});

export type CreateUser = z.infer<typeof CreateUserSchema>;

export class CreateUserDto extends createZodDto(CreateUserSchema) {}
