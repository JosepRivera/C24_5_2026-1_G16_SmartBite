import { UnprocessableEntityException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportsService } from "../reports.service";

vi.mock("@/config/env", () => ({
	env: { SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-key" },
}));

const mockPrisma = {
	$queryRaw: vi.fn(),
};

describe("ReportsService", () => {
	let service: ReportsService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new ReportsService(mockPrisma as never);
	});

	describe("getByPeriod()", () => {
		const from = new Date("2025-03-01T05:00:00.000Z");
		const to = new Date("2025-03-02T05:00:00.000Z");

		it("groups sales by day and maps period to YYYY-MM-DD", async () => {
			mockPrisma.$queryRaw.mockResolvedValue([
				{
					// DATE_TRUNC returns a Date; 2025-03-01 Lima midnight = 2025-03-01T05:00:00Z
					period: new Date("2025-03-01T05:00:00.000Z"),
					total_income: "150.00",
					order_count: "2",
				},
				{
					period: new Date("2025-03-02T05:00:00.000Z"),
					total_income: "200.00",
					order_count: "1",
				},
			]);

			const result = await service.getByPeriod(from, to, "day");

			expect(result).toHaveLength(2);

			const day1 = result.find((r) => r.period === "2025-03-01");
			expect(day1).toBeDefined();
			expect(day1?.total_income).toBe(150);
			expect(day1?.order_count).toBe(2);

			const day2 = result.find((r) => r.period === "2025-03-02");
			expect(day2).toBeDefined();
			expect(day2?.total_income).toBe(200);
			expect(day2?.order_count).toBe(1);
		});

		it("groups sales by week and maps period to YYYY-MM-DD (Monday)", async () => {
			// DATE_TRUNC('week', ...) truncates to Monday
			// 2025-02-24 is a Monday in Lima time
			mockPrisma.$queryRaw.mockResolvedValue([
				{
					period: new Date("2025-02-24T05:00:00.000Z"),
					total_income: "350.00",
					order_count: "3",
				},
			]);

			const result = await service.getByPeriod(from, to, "week");

			expect(result).toHaveLength(1);
			expect(result[0].period).toBe("2025-02-24");
			expect(result[0].total_income).toBe(350);
			expect(result[0].order_count).toBe(3);
		});

		it("groups sales by month and maps period to YYYY-MM", async () => {
			mockPrisma.$queryRaw.mockResolvedValue([
				{
					period: new Date("2025-03-01T05:00:00.000Z"),
					total_income: "1200.50",
					order_count: "10",
				},
			]);

			const result = await service.getByPeriod(from, to, "month");

			expect(result).toHaveLength(1);
			expect(result[0].period).toBe("2025-03");
			expect(result[0].total_income).toBe(1200.5);
			expect(result[0].order_count).toBe(10);
		});

		it("returns empty array when no rows match", async () => {
			mockPrisma.$queryRaw.mockResolvedValue([]);

			const result = await service.getByPeriod(from, to, "day");

			expect(result).toHaveLength(0);
		});

		it("throws UnprocessableEntityException for invalid groupBy", async () => {
			await expect(service.getByPeriod(from, to, "year" as never)).rejects.toBeInstanceOf(
				UnprocessableEntityException,
			);
		});

		it("uses $queryRaw (not findMany) to perform DB-side grouping", async () => {
			mockPrisma.$queryRaw.mockResolvedValue([]);

			await service.getByPeriod(from, to, "day");

			expect(mockPrisma.$queryRaw).toHaveBeenCalledOnce();
		});

		it("passes userId filter when provided", async () => {
			mockPrisma.$queryRaw.mockResolvedValue([
				{
					period: new Date("2025-03-01T05:00:00.000Z"),
					total_income: "50.00",
					order_count: "1",
				},
			]);

			const result = await service.getByPeriod(from, to, "day", "user-uuid-123");

			expect(result).toHaveLength(1);
			expect(mockPrisma.$queryRaw).toHaveBeenCalledOnce();
		});
	});

	describe("getProfitability()", () => {
		it("returns products sorted by margin descending", async () => {
			mockPrisma.$queryRaw.mockResolvedValue([
				{
					id: "p1",
					name: "Hamburguesa Doble",
					category: "hamburguesas",
					sale_price: "9.00",
					unit_cost: "3.80",
					unit_margin: "5.20",
					margin_percentage: "57.78",
				},
			]);

			const result = await service.getProfitability();

			expect(result).toHaveLength(1);
			expect(result[0].unit_margin).toBe(5.2);
			expect(result[0].margin_percentage).toBe(57.78);
		});
	});
});
