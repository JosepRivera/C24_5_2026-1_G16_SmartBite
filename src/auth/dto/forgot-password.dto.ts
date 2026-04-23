import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const ForgotPasswordSchema = z.object({
	email: z.email("Formato de email inválido"),
});

export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;

export class ForgotPasswordDtoClass extends createZodDto(ForgotPasswordSchema) {}
