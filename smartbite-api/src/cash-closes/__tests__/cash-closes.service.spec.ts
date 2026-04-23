import { ConflictException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CashClosesService } from "../cash-closes.service";

vi.mock("@/config/env", () => ({
	env: { SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-key" },
}));

const mockPrisma = {
	cashClose: {
		findFirst: vi.fn(),
		findMany: vi.fn(),
		findUnique: vi.fn(),
		create: vi.fn(),
		count: vi.fn(),
	},
	sale: {
		groupBy: vi.fn(),
	},
	expense: {
		aggregate: vi.fn(),
	},
};

describe("CashClosesService", () => {
	let service: CashClosesService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new CashClosesService(mockPrisma as never);
	});

	describe("create()", () => {
		it("calcula totales y crea el cierre correctamente", async () => {
			mockPrisma.cashClose.findFirst.mockResolvedValue(null);
			mockPrisma.sale.groupBy.mockResolvedValue([
				{ status: "PAID_CASH", _sum: { total: "500.00" } },
				{ status: "PAID_YAPE", _sum: { total: "200.00" } },
			]);
			mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: "100.00" } });
			mockPrisma.cashClose.create.mockResolvedValue({
				id: "close-1",
				date: new Date(),
				cashIncome: 500,
				digitalIncome: 200,
				totalIncome: 700,
				totalExpenses: 100,
				netProfit: 600,
				closedBy: "owner-id",
				parentCloseId: null,
				createdAt: new Date(),
			});

			const result = await service.create("owner-id");

			expect(mockPrisma.cashClose.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						cashIncome: 500,
						digitalIncome: 200,
						totalIncome: 700,
						totalExpenses: 100,
						netProfit: 600,
					}),
				}),
			);
			expect(result.net_profit).toBe(600);
		});

		it("ya existe cierre hoy → ConflictException", async () => {
			mockPrisma.cashClose.findFirst.mockResolvedValue({ id: "existing-close" });

			await expect(service.create("owner-id")).rejects.toThrow(ConflictException);
			expect(mockPrisma.cashClose.create).not.toHaveBeenCalled();
		});
	});

	describe("findOne()", () => {
		it("retorna el cierre si existe", async () => {
			mockPrisma.cashClose.findUnique.mockResolvedValue({
				id: "close-1",
				date: new Date(),
				cashIncome: 500,
				digitalIncome: 200,
				totalIncome: 700,
				totalExpenses: 100,
				netProfit: 600,
				closedBy: "owner-id",
				parentCloseId: null,
				createdAt: new Date(),
			});

			const result = await service.findOne("close-1");

			expect(result.id).toBe("close-1");
		});

		it("no existe → NotFoundException", async () => {
			mockPrisma.cashClose.findUnique.mockResolvedValue(null);

			await expect(service.findOne("no-existe")).rejects.toThrow(NotFoundException);
		});
	});
});
