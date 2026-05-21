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
};

describe("DashboardService", () => {
	let service: DashboardService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new DashboardService(mockPrisma as never);
	});

	describe("getDailySummary()", () => {
		it("retorna resumen del día con ingresos y top productos con margen", async () => {
			// Mock order follows actual call sequence:
			// 1. getDailySummary: $queryRaw (summary)
			// 2. Promise.all[0]: expense.aggregate (today expenses)
			// 3. Promise.all[1]: $queryRaw (top products)
			// 4. getYesterdayComparison: $queryRaw (yesterday summary)
			// 5. getYesterdayComparison: $queryRaw (today summary)
			// 6. getYesterdayComparison: expense.aggregate (yesterday expenses)
			// 7. getYesterdayComparison: expense.aggregate (today expenses)
			// 8. getTimeSeries: $queryRaw (sales)
			// 9. getTimeSeries: $queryRaw (expenses)
			mockPrisma.$queryRaw
				.mockResolvedValueOnce([{
					cash_income: "500.00",
					digital_income: "300.00",
					total_income: "800.00",
					open_orders: "2",
					paid_orders: "10",
				}])
				.mockResolvedValueOnce([{
					product_id: "prod-1",
					name: "Hamburguesa",
					category: "hamburguesas",
					quantity: 8,
					revenue: "120.00",
					margin: "45.50",
				}])
				.mockResolvedValueOnce([{ total_income: "700.00", tickets: "8" }])
				.mockResolvedValueOnce([{ total_income: "800.00", tickets: "10" }])
				.mockResolvedValueOnce([{ date: "2026-05-19", income: "800.00" }])
				.mockResolvedValueOnce([{ date: "2026-05-19", expenses: "150.00" }]);
			mockPrisma.expense.aggregate
				.mockResolvedValueOnce({ _sum: { amount: "150.00" } })   // getDailySummary today
				.mockResolvedValueOnce({ _sum: { amount: "120.00" } })   // yesterday expenses
				.mockResolvedValue({ _sum: { amount: "150.00" } });       // today expenses (default)

			const today = new Date("2026-05-19T05:00:00.000Z");
			const result = await service.getDailySummary(today);

			expect(result.cash_income).toBe(500);
			expect(result.digital_income).toBe(300);
			expect(result.total_income).toBe(800);
			expect(result.total_expenses).toBe(150);
			expect(result.estimated_profit).toBe(650);
			expect(result.top_products).toHaveLength(1);
			expect(result.top_products[0].name).toBe("Hamburguesa");
			expect(result.top_products[0].margin).toBe(45.5);
			expect(result.yesterday_comparison).not.toBeNull();
			expect(result.time_series).toHaveLength(30);
		});

		it("retorna ceros cuando no hay ventas ni gastos", async () => {
			mockPrisma.$queryRaw
				.mockResolvedValueOnce([
					{
						cash_income: "0",
						digital_income: "0",
						total_income: "0",
						open_orders: "0",
						paid_orders: "0",
					},
				])
				.mockResolvedValueOnce([]);
			mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: null } });
			// getYesterdayComparison: yesterday has zero data → returns null
			mockPrisma.$queryRaw
				.mockResolvedValueOnce([{ total_income: "0", tickets: "0" }])
				.mockResolvedValueOnce([{ total_income: "0", tickets: "0" }]);
			mockPrisma.expense.aggregate
				.mockResolvedValueOnce({ _sum: { amount: null } })
				.mockResolvedValueOnce({ _sum: { amount: null } });
			// getTimeSeries
			mockPrisma.$queryRaw
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([]);

			const today = new Date("2026-05-19T05:00:00.000Z");
			const result = await service.getDailySummary(today);

			expect(result.total_income).toBe(0);
			expect(result.estimated_profit).toBe(0);
			expect(result.top_products).toHaveLength(0);
			expect(result.yesterday_comparison).toBeNull();
			expect(result.time_series).toHaveLength(30);
		});
	});

	describe("getYesterdayComparison()", () => {
		it("retorna deltas cuando ambos días tienen datos", async () => {
			// yesterday summary
			mockPrisma.$queryRaw.mockResolvedValueOnce([{ total_income: "800", tickets: "4" }]);
			// today summary
			mockPrisma.$queryRaw.mockResolvedValueOnce([{ total_income: "1000", tickets: "5" }]);
			mockPrisma.expense.aggregate
				.mockResolvedValueOnce({ _sum: { amount: "150" } })   // yesterday expenses
				.mockResolvedValueOnce({ _sum: { amount: "200" } });  // today expenses

			const today = new Date("2026-05-19T05:00:00.000Z");
			const result = await service.getYesterdayComparison(today);

			expect(result).not.toBeNull();
			expect(result!.income.delta).toBe(200);
			expect(result!.income.percent).toBe(25);
			expect(result!.tickets.delta).toBe(1);
			expect(result!.expenses.delta).toBe(50);
		});

		it("retorna null cuando ayer no tiene ventas ni gastos", async () => {
			// yesterday summary: zero
			mockPrisma.$queryRaw.mockResolvedValueOnce([{ total_income: "0", tickets: "0" }]);
			// today summary
			mockPrisma.$queryRaw.mockResolvedValueOnce([{ total_income: "500", tickets: "3" }]);
			mockPrisma.expense.aggregate
				.mockResolvedValueOnce({ _sum: { amount: null } })  // yesterday: no expenses
				.mockResolvedValueOnce({ _sum: { amount: "100" } }); // today expenses

			const today = new Date("2026-05-19T05:00:00.000Z");
			const result = await service.getYesterdayComparison(today);

			expect(result).toBeNull();
		});

		it("retorna percent null cuando ayer el valor es cero", async () => {
			// yesterday summary: zero income
			mockPrisma.$queryRaw.mockResolvedValueOnce([{ total_income: "0", tickets: "2" }]);
			// today summary
			mockPrisma.$queryRaw.mockResolvedValueOnce([{ total_income: "500", tickets: "3" }]);
			mockPrisma.expense.aggregate
				.mockResolvedValueOnce({ _sum: { amount: "100" } })  // yesterday expenses
				.mockResolvedValueOnce({ _sum: { amount: "150" } }); // today expenses

			const today = new Date("2026-05-19T05:00:00.000Z");
			const result = await service.getYesterdayComparison(today);

			expect(result).not.toBeNull();
			expect(result!.income.delta).toBe(500);
			expect(result!.income.percent).toBeNull();
		});
	});

	describe("getTimeSeries()", () => {
		it("retorna 30 registros ordenados cronológicamente con zero-fill", async () => {
			mockPrisma.$queryRaw
				.mockResolvedValueOnce([
					{ date: "2026-04-20", income: "500" },
					{ date: "2026-04-22", income: "300" },
				])
				.mockResolvedValueOnce([
					{ date: "2026-04-20", expenses: "100" },
				]);

			const today = new Date("2026-05-19T05:00:00.000Z");
			const result = await service.getTimeSeries(today);

			expect(result).toHaveLength(30);
			expect(result[0].date).toBe("2026-04-20");
			expect(result[29].date).toBe("2026-05-19");
			// Day with sales but no expenses
			const day22 = result.find((d) => d.date === "2026-04-22")!;
			expect(day22.income).toBe(300);
			expect(day22.expenses).toBe(0);
			expect(day22.profit).toBe(300);
			// Day with no data at all
			const day21 = result.find((d) => d.date === "2026-04-21")!;
			expect(day21.income).toBe(0);
			expect(day21.expenses).toBe(0);
			expect(day21.profit).toBe(0);
		});

		it("retorna 30 días en cero cuando no hay datos", async () => {
			mockPrisma.$queryRaw
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([]);

			const today = new Date("2026-05-19T05:00:00.000Z");
			const result = await service.getTimeSeries(today);

			expect(result).toHaveLength(30);
			expect(result.every((d) => d.income === 0 && d.expenses === 0 && d.profit === 0)).toBe(true);
		});
	});

	describe("top products con margen", () => {
		it("retorna margin null cuando el producto no tiene receta", async () => {
			mockPrisma.$queryRaw
				.mockResolvedValueOnce([{ cash_income: "0", digital_income: "0", total_income: "100", open_orders: "0", paid_orders: "1" }])
				.mockResolvedValueOnce([
					{ product_id: "p1", name: "Sin receta", category: "otros", quantity: 1, revenue: "50", margin: null },
				]);
			mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: null } });
			// getYesterdayComparison
			mockPrisma.$queryRaw
				.mockResolvedValueOnce([{ total_income: "0", tickets: "0" }])
				.mockResolvedValueOnce([{ total_income: "100", tickets: "1" }]);
			mockPrisma.expense.aggregate
				.mockResolvedValueOnce({ _sum: { amount: null } })
				.mockResolvedValueOnce({ _sum: { amount: null } });
			// getTimeSeries
			mockPrisma.$queryRaw
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([]);

			const today = new Date("2026-05-19T05:00:00.000Z");
			const result = await service.getDailySummary(today);

			expect(result.top_products[0].margin).toBeNull();
		});

		it("retorna 100% margen cuando el costo es cero", async () => {
			mockPrisma.$queryRaw
				.mockResolvedValueOnce([{ cash_income: "0", digital_income: "0", total_income: "100", open_orders: "0", paid_orders: "1" }])
				.mockResolvedValueOnce([
					{ product_id: "p1", name: "Gratis", category: "promo", quantity: 1, revenue: "50", margin: "100.00" },
				]);
			mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: null } });
			// getYesterdayComparison
			mockPrisma.$queryRaw
				.mockResolvedValueOnce([{ total_income: "0", tickets: "0" }])
				.mockResolvedValueOnce([{ total_income: "100", tickets: "1" }]);
			mockPrisma.expense.aggregate
				.mockResolvedValueOnce({ _sum: { amount: null } })
				.mockResolvedValueOnce({ _sum: { amount: null } });
			// getTimeSeries
			mockPrisma.$queryRaw
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([]);

			const today = new Date("2026-05-19T05:00:00.000Z");
			const result = await service.getDailySummary(today);

			expect(result.top_products[0].margin).toBe(100);
		});
	});
});
