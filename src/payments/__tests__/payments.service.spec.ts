import { HttpException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentsService } from "../payments.service";

vi.mock("@/config/env", () => ({
	env: { SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-key" },
}));

const mockPrisma = {
	paymentNotification: {
		findUnique: vi.fn(),
		create: vi.fn(),
		findMany: vi.fn(),
		update: vi.fn(),
	},
};

const makeNotification = (overrides = {}) => ({
	id: "notif-1",
	notificationId: "ext-123",
	amount: "50.00",
	senderName: "Juan Pérez",
	source: "YAPE",
	rawText: "Pago de 50 soles",
	isReviewed: false,
	reviewedBy: null,
	reviewedAt: null,
	createdAt: new Date(),
	...overrides,
});

describe("PaymentsService", () => {
	let service: PaymentsService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new PaymentsService(mockPrisma as never);
	});

	describe("createNotification()", () => {
		it("crea una notificación nueva", async () => {
			mockPrisma.paymentNotification.findUnique.mockResolvedValue(null);
			mockPrisma.paymentNotification.create.mockResolvedValue(makeNotification());

			const result = await service.createNotification("device-1", {
				notification_id: "ext-123",
				amount: 50,
				sender_name: "Juan Pérez",
				source: "YAPE",
				raw_text: "Pago de 50 soles",
			});

			expect(result.notification_id).toBe("ext-123");
			expect(result.amount).toBe(50);
		});

		it("retorna existente si notification_id duplicado (idempotencia)", async () => {
			mockPrisma.paymentNotification.findUnique.mockResolvedValue(makeNotification());

			const result = await service.createNotification("device-1", {
				notification_id: "ext-123",
				amount: 50,
				sender_name: "Juan Pérez",
				source: "YAPE",
				raw_text: "Pago de 50 soles",
			});

			expect(mockPrisma.paymentNotification.create).not.toHaveBeenCalled();
			expect(result.notification_id).toBe("ext-123");
		});

		it("lanza 429 al superar rate limit", async () => {
			mockPrisma.paymentNotification.findUnique.mockResolvedValue(null);
			mockPrisma.paymentNotification.create.mockResolvedValue(makeNotification());

			const dto = {
				notification_id: "ext-xxx",
				amount: 10,
				sender_name: "Test",
				source: "PLIN" as const,
				raw_text: "test",
			};

			for (let i = 0; i < 20; i++) {
				dto.notification_id = `ext-${i}`;
				await service.createNotification("device-rl", dto);
			}

			dto.notification_id = "ext-overflow";
			await expect(service.createNotification("device-rl", dto)).rejects.toThrow(HttpException);
		});
	});

	describe("review()", () => {
		it("marca la notificación como revisada", async () => {
			mockPrisma.paymentNotification.findUnique.mockResolvedValue(makeNotification());
			mockPrisma.paymentNotification.update.mockResolvedValue(
				makeNotification({ isReviewed: true, reviewedBy: "owner-1" }),
			);

			const result = await service.review("notif-1", "owner-1");

			expect(result.is_reviewed).toBe(true);
		});

		it("lanza NotFoundException si no existe", async () => {
			mockPrisma.paymentNotification.findUnique.mockResolvedValue(null);

			await expect(service.review("no-existe", "owner-1")).rejects.toThrow(NotFoundException);
		});
	});
});
