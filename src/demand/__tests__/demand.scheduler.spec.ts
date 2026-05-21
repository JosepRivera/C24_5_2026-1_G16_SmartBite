import { beforeEach, describe, expect, it, vi } from "vitest";
import { DemandScheduler } from "../demand.scheduler";

vi.mock("@/config/env", () => ({
	env: {
		GROQ_TEXT_MODEL: "gpt-oss-120b",
		GROQ_TIMEOUT: 10000,
	},
}));

const mockGroqCreate = vi.hoisted(() =>
	vi.fn().mockResolvedValue({
		choices: [{ message: { content: "1.0" } }],
	}),
);

const mockGroqClient = {
	chat: { completions: { create: mockGroqCreate } },
};

describe("DemandScheduler", () => {
	let scheduler: DemandScheduler;
	let mockDemandService: { predictNextDays: ReturnType<typeof vi.fn> };
	let mockTx: {
		dailyProductionPlan: {
			deleteMany: ReturnType<typeof vi.fn>;
			create: ReturnType<typeof vi.fn>;
		};
	};
	let mockPrisma: { $transaction: ReturnType<typeof vi.fn> };
	let mockGetClient: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();

		mockGetClient = vi.fn().mockReturnValue(mockGroqClient);

		const mockGroqService = {
			getClient: mockGetClient,
			isAvailable: () => mockGetClient.mock.results[0]?.value !== null,
		};

		mockDemandService = {
			predictNextDays: vi.fn().mockResolvedValue([
				{ productId: "prod-1", date: new Date("2026-05-22"), quantity: 100 },
				{ productId: "prod-2", date: new Date("2026-05-22"), quantity: 50 },
			]),
		};

		mockTx = {
			dailyProductionPlan: {
				deleteMany: vi.fn(),
				create: vi.fn(),
			},
		};

		mockPrisma = {
			$transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<void>) => {
				await cb(mockTx);
			}),
		};

		scheduler = new DemandScheduler(
			mockDemandService as never,
			mockPrisma as never,
			mockGroqService as never,
		);
	});

	it("generates daily plan with base predictions when Groq is unavailable", async () => {
		mockGetClient.mockReturnValue(null);

		await scheduler.triggerManually();

		expect(mockDemandService.predictNextDays).toHaveBeenCalledWith(1);
		expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
		expect(mockTx.dailyProductionPlan.deleteMany).toHaveBeenCalledTimes(1);
		expect(mockTx.dailyProductionPlan.create).toHaveBeenCalledTimes(2);
		expect(mockTx.dailyProductionPlan.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					predictionSource: "holt-winters",
					quantity: 100,
				}),
			}),
		);
	});

	it("applies Groq multiplier when response is valid", async () => {
		mockGroqCreate.mockResolvedValueOnce({
			choices: [{ message: { content: "1.2" } }],
		});

		await scheduler.triggerManually();

		expect(mockTx.dailyProductionPlan.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					predictionSource: "holt-winters+groq",
					quantity: 120,
				}),
			}),
		);
	});

	it("falls back to multiplier 1 when Groq throws", async () => {
		mockGroqCreate.mockRejectedValueOnce(new Error("network"));

		await scheduler.triggerManually();

		expect(mockTx.dailyProductionPlan.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					predictionSource: "holt-winters",
					quantity: 100,
				}),
			}),
		);
	});

	it("falls back to multiplier 1 when Groq returns out of range", async () => {
		mockGroqCreate.mockResolvedValueOnce({
			choices: [{ message: { content: "5.0" } }],
		});

		await scheduler.triggerManually();

		expect(mockTx.dailyProductionPlan.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					predictionSource: "holt-winters",
					quantity: 100,
				}),
			}),
		);
	});

	it("does not create plans when predictions are empty", async () => {
		mockDemandService.predictNextDays.mockResolvedValueOnce([]);

		await scheduler.triggerManually();

		expect(mockTx.dailyProductionPlan.deleteMany).toHaveBeenCalledTimes(1);
		expect(mockTx.dailyProductionPlan.create).not.toHaveBeenCalled();
	});
});
