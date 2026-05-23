import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const UpdatePaymentNotificationSchema = z.object({
	status: z.enum(["REVIEWED"]),
});

export type UpdatePaymentNotification = z.infer<typeof UpdatePaymentNotificationSchema>;

export class UpdatePaymentNotificationDto extends createZodDto(UpdatePaymentNotificationSchema) {}
