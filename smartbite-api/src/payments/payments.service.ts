import { HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService } from "@/prisma/prisma.service";
import type { CreatePaymentNotification } from "./dto/create-payment-notification.dto";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

@Injectable()
export class PaymentsService {
	constructor(private readonly prisma: PrismaService) {}

	private readonly rateLimitMap = new Map<string, { count: number; resetAt: number }>();

	private checkRateLimit(deviceId: string): void {
		const now = Date.now();
		const entry = this.rateLimitMap.get(deviceId);

		if (!entry || now >= entry.resetAt) {
			this.rateLimitMap.set(deviceId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
			return;
		}

		if (entry.count >= RATE_LIMIT_MAX) {
			throw new HttpException(
				"Rate limit excedido: 20 req/min por dispositivo",
				HttpStatus.TOO_MANY_REQUESTS,
			);
		}

		entry.count++;
	}

	async createNotification(deviceId: string, dto: CreatePaymentNotification) {
		this.checkRateLimit(deviceId);

		const existing = await this.prisma.paymentNotification.findUnique({
			where: { notificationId: dto.notification_id },
		});

		if (existing) {
			return formatNotification(existing);
		}

		const notification = await this.prisma.paymentNotification.create({
			data: {
				notificationId: dto.notification_id,
				amount: dto.amount,
				senderName: dto.sender_name,
				source: dto.source,
				rawText: dto.raw_text,
			},
		});

		return formatNotification(notification);
	}

	async findAll() {
		const notifications = await this.prisma.paymentNotification.findMany({
			orderBy: { createdAt: "desc" },
		});
		return notifications.map(formatNotification);
	}

	async review(id: string, reviewerId: string) {
		const notification = await this.prisma.paymentNotification.findUnique({ where: { id } });
		if (!notification) throw new NotFoundException("Notificación no encontrada");

		const updated = await this.prisma.paymentNotification.update({
			where: { id },
			data: { isReviewed: true, reviewedBy: reviewerId, reviewedAt: new Date() },
		});

		return formatNotification(updated);
	}
}

type Notification = Awaited<ReturnType<PrismaService["paymentNotification"]["findUnique"]>>;

function formatNotification(n: NonNullable<Notification>) {
	return {
		id: n.id,
		notification_id: n.notificationId,
		amount: Number(n.amount),
		sender_name: n.senderName,
		source: n.source,
		raw_text: n.rawText,
		is_reviewed: n.isReviewed,
		reviewed_by: n.reviewedBy,
		reviewed_at: n.reviewedAt,
		created_at: n.createdAt,
	};
}
