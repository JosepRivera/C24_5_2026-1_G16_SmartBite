import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const RegisterDeviceSchema = z.object({
	name: z.string().min(1).max(100),
});

export type RegisterDevice = z.infer<typeof RegisterDeviceSchema>;

export class RegisterDeviceDto extends createZodDto(RegisterDeviceSchema) {}
