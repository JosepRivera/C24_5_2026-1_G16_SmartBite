import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const CreatePaymentNotificationSchema = z.object({
	notification_id: z.string().min(1),
	amount: z.number().positive(),
	sender_name: z.string().min(1).max(100),
	source: z.enum(["YAPE", "PLIN", "AGORA"]),
	raw_text: z.string().min(1),
});

export type CreatePaymentNotification = z.infer<typeof CreatePaymentNotificationSchema>;

export class CreatePaymentNotificationDto extends createZodDto(CreatePaymentNotificationSchema) {}
