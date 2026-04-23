import { beforeEach, describe, expect, it, vi } from "vitest";
import { DemandService } from "../demand.service";

vi.mock("@/config/env", () => ({
	env: { SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-key" },
}));

const mockPrisma = {
	product: {
		findMany: vi.fn(),
	},
	saleItem: {
		findMany: vi.fn(),
	},
	referenceBaseline: {
		findMany: vi.fn(),
	},
};

describe("DemandService", () => {
	let service: DemandService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new DemandService(mockPrisma as never);
	});

	describe("holtwinters (via predictForProduct)", () => {
		it("predice con datos sintéticos de 28 días", async () => {
			const syntheticHistory = Array.from({ length: 28 }, (_, i) => {
				const dayOfWeek = i % 7;
				return dayOfWeek === 0 || dayOfWeek === 6 ? 15 : 8;
			});

			mockPrisma.saleItem.findMany.mockResolvedValue(
				syntheticHistory.flatMap((qty, i) => {
					const d = new Date();
					d.setDate(d.getDate() - (27 - i));
					return Array(qty).fill({ quantity: "1", sale: { createdAt: d } });
				}),
			);

			const result = await service.predictForProduct("prod-1", 7);

			expect(result).toHaveLength(7);
			for (const pred of result) {
				expect(pred.quantity).toBeGreaterThanOrEqual(0);
				expect(pred.productId).toBe("prod-1");
			}
		});

		it("usa reference baselines cuando hay < 14 días de historial", async () => {
			mockPrisma.saleItem.findMany.mockResolvedValue([
				{ quantity: "5", sale: { createdAt: new Date() } },
			]);
			mockPrisma.referenceBaseline.findMany.mockResolvedValue([
				{ dayOfWeek: 0, quantity: "10" },
				{ dayOfWeek: 1, quantity: "8" },
				{ dayOfWeek: 2, quantity: "8" },
				{ dayOfWeek: 3, quantity: "8" },
				{ dayOfWeek: 4, quantity: "9" },
				{ dayOfWeek: 5, quantity: "12" },
				{ dayOfWeek: 6, quantity: "15" },
			]);

			const result = await service.predictForProduct("prod-1", 3);

			expect(result).toHaveLength(3);
			expect(mockPrisma.referenceBaseline.findMany).toHaveBeenCalled();
		});
	});

	describe("predictNextDays()", () => {
		it("predice para todos los productos activos", async () => {
			mockPrisma.product.findMany.mockResolvedValue([{ id: "prod-1" }, { id: "prod-2" }]);

			mockPrisma.saleItem.findMany.mockResolvedValue([]);
			mockPrisma.referenceBaseline.findMany.mockResolvedValue([]);

			const result = await service.predictNextDays(3);

			expect(result.length).toBeGreaterThanOrEqual(6);
		});
	});
});
