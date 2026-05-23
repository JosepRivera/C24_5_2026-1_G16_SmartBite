import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const PasswordRecoveryRequestSchema = z.object({
	email: z.email("Formato de email inválido"),
});

export type PasswordRecoveryRequestDto = z.infer<typeof PasswordRecoveryRequestSchema>;

export class PasswordRecoveryRequestDtoClass extends createZodDto(PasswordRecoveryRequestSchema) {}

// Backward-compat aliases (kept to avoid breaking any other imports)
export const ForgotPasswordSchema = PasswordRecoveryRequestSchema;
export type ForgotPasswordDto = PasswordRecoveryRequestDto;
export class ForgotPasswordDtoClass extends PasswordRecoveryRequestDtoClass {}
