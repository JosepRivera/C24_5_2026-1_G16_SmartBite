import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardService } from "../dashboard.service";

vi.mock("@/config/env", () => ({
	env: { SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-key" },
}));

const mockPrisma = {
	$queryRaw: vi.fn(),
	expense: {
		aggregate: vi.fn(),
	},
	saleItem: {
		groupBy: vi.fn(),
	},
	product: {
		findMany: vi.fn(),
	},
};

describe("DashboardService", () => {
	let service: DashboardService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new DashboardService(mockPrisma as never);
	});

	describe("getDailySummary()", () => {
		it("retorna resumen del día con ingresos y top productos", async () => {
			mockPrisma.$queryRaw.mockResolvedValue([
				{
					cash_income: "500.00",
					digital_income: "300.00",
					total_income: "800.00",
					open_orders: "2",
					paid_orders: "10",
				},
			]);
			mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: "150.00" } });
			mockPrisma.saleItem.groupBy.mockResolvedValue([
				{ productId: "prod-1", _sum: { quantity: 8 } },
			]);
			mockPrisma.product.findMany.mockResolvedValue([{ id: "prod-1", name: "Hamburguesa" }]);

			const result = await service.getDailySummary();

			expect(result.cash_income).toBe(500);
			expect(result.digital_income).toBe(300);
			expect(result.total_income).toBe(800);
			expect(result.total_expenses).toBe(150);
			expect(result.estimated_profit).toBe(650);
			expect(result.top_products).toHaveLength(1);
			expect(result.top_products[0].product_name).toBe("Hamburguesa");
		});

		it("retorna ceros cuando no hay ventas ni gastos", async () => {
			mockPrisma.$queryRaw.mockResolvedValue([
				{
					cash_income: "0",
					digital_income: "0",
					total_income: "0",
					open_orders: "0",
					paid_orders: "0",
				},
			]);
			mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: null } });
			mockPrisma.saleItem.groupBy.mockResolvedValue([]);
			mockPrisma.product.findMany.mockResolvedValue([]);

			const result = await service.getDailySummary();

			expect(result.total_income).toBe(0);
			expect(result.estimated_profit).toBe(0);
			expect(result.top_products).toHaveLength(0);
		});
	});
});
