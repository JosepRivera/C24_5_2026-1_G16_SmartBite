import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportsService } from "../reports.service";

vi.mock("@/config/env", () => ({
	env: { SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-key" },
}));

const mockPrisma = {
	$queryRaw: vi.fn(),
	sale: {
		findMany: vi.fn(),
	},
};

describe("ReportsService", () => {
	let service: ReportsService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new ReportsService(mockPrisma as never);
	});

	describe("getByPeriod()", () => {
		it("agrupa ventas por día correctamente", async () => {
			mockPrisma.sale.findMany.mockResolvedValue([
				{ total: "100.00", status: "PAID_CASH", createdAt: new Date("2025-03-01T10:00:00Z") },
				{ total: "50.00", status: "PAID_YAPE", createdAt: new Date("2025-03-01T14:00:00Z") },
				{ total: "200.00", status: "PAID_CASH", createdAt: new Date("2025-03-02T09:00:00Z") },
			]);

			const result = await service.getByPeriod("2025-03-01", "2025-03-02", "day");

			expect(result).toHaveLength(2);
			const day1 = result.find((r) => r.period === "2025-03-01");
			expect(day1?.total_income).toBe(150);
			expect(day1?.order_count).toBe(2);
		});

		it("formato de fecha inválido → BadRequestException", async () => {
			await expect(service.getByPeriod("01-03-2025", "2025-03-31")).rejects.toThrow(
				BadRequestException,
			);
		});
	});

	describe("getProfitability()", () => {
		it("retorna productos ordenados por margen descendente", async () => {
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
