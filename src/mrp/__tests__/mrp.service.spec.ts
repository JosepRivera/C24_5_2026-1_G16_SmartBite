import { beforeEach, describe, expect, it, vi } from "vitest";
import { MrpService } from "../mrp.service";

vi.mock("@/config/env", () => ({
	env: {
		SUPABASE_URL: "https://test.supabase.co",
		SUPABASE_SERVICE_ROLE_KEY: "test-key",
		GROQ_API_KEY: undefined,
		GROQ_TEXT_MODEL: "gpt-oss-120b",
		GROQ_TIMEOUT: 10000,
	},
}));

const mockPrisma = {
	recipe: {
		findMany: vi.fn(),
	},
};

const mockDemandService = {
	predictNextDays: vi.fn(),
};

describe("MrpService", () => {
	let service: MrpService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new MrpService(mockPrisma as never, mockDemandService as never);
	});

	it("calcula correctamente los insumos a pedir", async () => {
		mockDemandService.predictNextDays.mockResolvedValue([
			{ productId: "prod-1", date: new Date(), quantity: 10 },
			{ productId: "prod-1", date: new Date(), quantity: 8 },
		]);

		mockPrisma.recipe.findMany.mockResolvedValue([
			{
				productId: "prod-1",
				ingredientId: "ing-1",
				quantity: "0.5",
				ingredient: { id: "ing-1", name: "Harina", unit: "kg", stock: "5" },
			},
		]);

		const result = await service.computeMrp(2);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].ingredient_name).toBe("Harina");
		expect(result.items[0].needed).toBe(9);
		expect(result.items[0].to_order).toBe(4);
	});

	it("retorna to_order=0 cuando el stock es suficiente", async () => {
		mockDemandService.predictNextDays.mockResolvedValue([
			{ productId: "prod-1", date: new Date(), quantity: 2 },
		]);

		mockPrisma.recipe.findMany.mockResolvedValue([
			{
				productId: "prod-1",
				ingredientId: "ing-1",
				quantity: "1",
				ingredient: { id: "ing-1", name: "Tomate", unit: "kg", stock: "100" },
			},
		]);

		const result = await service.computeMrp(1);

		expect(result.items[0].to_order).toBe(0);
	});
});
