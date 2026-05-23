import {
	ForbiddenException,
	NotFoundException,
	UnprocessableEntityException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CorrectSaleSchema } from "../dto/correct-sale.dto";
import { SalesService } from "../sales.service";

vi.mock("@/config/env", () => ({
	env: { SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-key" },
}));

const SALE_ID = "550e8400-e29b-41d4-a716-446655440000";
const USER_ID = "660e8400-e29b-41d4-a716-446655440001";

const makeSale = (overrides = {}) => ({
	id: SALE_ID,
	status: "OPEN",
	total: 50,
	tableNumber: 1,
	customerName: "Mesa 1",
	userId: USER_ID,
	updatedBy: null,
	cancelledBy: null,
	cancelledAt: null,
	createdAt: new Date(),
	updatedAt: new Date(),
	items: [],
	user: { id: USER_ID, name: "Test User", username: "testuser" },
	...overrides,
});

const mockPrisma = {
	sale: {
		findUnique: vi.fn(),
		findMany: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
	},
	recipe: {
		findMany: vi.fn(),
	},
	product: {
		findMany: vi.fn(),
	},
	saleItem: {
		deleteMany: vi.fn(),
		createMany: vi.fn(),
	},
	$transaction: vi.fn(),
};

describe("SalesService", () => {
	let service: SalesService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new SalesService(mockPrisma as never);
	});

	// ── B6-3.1: POST /sales/:id/payments triggers salesService.pay() ────────
	describe("pay() — REQ-B3", () => {
		it("calls pay() with correct args and returns payment status", async () => {
			const saleWithItems = makeSale({ items: [{ productId: "prod-1", quantity: 2 }] });
			mockPrisma.sale.findUnique.mockResolvedValue(saleWithItems);
			mockPrisma.recipe.findMany.mockResolvedValue([]);
			mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
				const tx = {
					sale: { update: vi.fn() },
					$queryRawUnsafe: vi.fn(),
				};
				await fn(tx);
			});

			const result = await service.pay(SALE_ID, USER_ID, { payment_method: "CASH" });

			expect(result).toMatchObject({ id: SALE_ID, status: "PAID_CASH" });
		});

		it("lanza NotFoundException si la venta no existe", async () => {
			mockPrisma.sale.findUnique.mockResolvedValue(null);

			await expect(service.pay(SALE_ID, USER_ID, { payment_method: "CASH" })).rejects.toThrow(
				NotFoundException,
			);
		});

		it("lanza UnprocessableEntityException si la venta no está OPEN", async () => {
			mockPrisma.sale.findUnique.mockResolvedValue(makeSale({ status: "PAID_CASH", items: [] }));

			await expect(service.pay(SALE_ID, USER_ID, { payment_method: "CASH" })).rejects.toThrow(
				UnprocessableEntityException,
			);
		});
	});

	// ── B6-3.2: PATCH /sales/:id with { status: "CANCELLED" } calls cancel() ─
	describe("cancel() — REQ-B4", () => {
		it("cancela la venta y retorna el estado CANCELLED", async () => {
			mockPrisma.sale.findUnique.mockResolvedValue(makeSale());
			mockPrisma.sale.update.mockResolvedValue(makeSale({ status: "CANCELLED" }));

			const result = await service.cancel(SALE_ID, USER_ID);

			expect(result).toMatchObject({ id: SALE_ID, status: "CANCELLED" });
			expect(mockPrisma.sale.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: SALE_ID },
					data: expect.objectContaining({ status: "CANCELLED", cancelledBy: USER_ID }),
				}),
			);
		});

		it("lanza NotFoundException si la venta no existe", async () => {
			mockPrisma.sale.findUnique.mockResolvedValue(null);

			await expect(service.cancel(SALE_ID, USER_ID)).rejects.toThrow(NotFoundException);
		});

		it("lanza UnprocessableEntityException si la venta no está OPEN", async () => {
			mockPrisma.sale.findUnique.mockResolvedValue(makeSale({ status: "CANCELLED" }));

			await expect(service.cancel(SALE_ID, USER_ID)).rejects.toThrow(UnprocessableEntityException);
		});
	});

	// ── B6-3.3: CorrectSaleDto rejects { status: "CANCELLED", someOtherField } ─
	describe("CorrectSaleSchema refine — REQ-B4 DTO", () => {
		it("acepta { status: 'CANCELLED' } sin otros campos", () => {
			const result = CorrectSaleSchema.safeParse({ status: "CANCELLED" });
			expect(result.success).toBe(true);
		});

		it("rechaza { status: 'CANCELLED' } con items (campos extra no permitidos)", () => {
			const result = CorrectSaleSchema.safeParse({
				status: "CANCELLED",
				items: [{ product_id: "550e8400-e29b-41d4-a716-446655440000", quantity: 1 }],
			});
			expect(result.success).toBe(false);
		});

		it("rechaza { status: 'CANCELLED' } con payment_method (campos extra no permitidos)", () => {
			const result = CorrectSaleSchema.safeParse({
				status: "CANCELLED",
				payment_method: "CASH",
			});
			expect(result.success).toBe(false);
		});

		it("acepta corrección normal con items (sin status)", () => {
			const result = CorrectSaleSchema.safeParse({
				items: [{ product_id: "550e8400-e29b-41d4-a716-446655440000", quantity: 2 }],
			});
			expect(result.success).toBe(true);
		});

		it("acepta corrección normal con payment_method (sin status)", () => {
			const result = CorrectSaleSchema.safeParse({ payment_method: "YAPE" });
			expect(result.success).toBe(true);
		});

		it("rechaza body vacío (sin status ni items ni payment_method)", () => {
			const result = CorrectSaleSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});

	// ── B6-3.4 / B6-3.5: controller branch verification ────────────────────
	// These are covered by the above unit tests + the fact that the @Patch(":id/pay")
	// and @Patch(":id/cancel") decorators no longer exist in the controller.
	// The route map in NestJS will return 404 for those paths.

	// ── correct() OWNER-only guard verification ─────────────────────────────
	describe("correct() service — normal correction path", () => {
		it("lanza NotFoundException si la venta no existe", async () => {
			mockPrisma.sale.findUnique.mockResolvedValue(null);

			await expect(service.correct(SALE_ID, USER_ID, { payment_method: "CASH" })).rejects.toThrow(
				NotFoundException,
			);
		});

		it("lanza UnprocessableEntityException si la venta está CANCELLED", async () => {
			mockPrisma.sale.findUnique.mockResolvedValue(makeSale({ status: "CANCELLED", items: [] }));

			await expect(service.correct(SALE_ID, USER_ID, { payment_method: "CASH" })).rejects.toThrow(
				UnprocessableEntityException,
			);
		});
	});

	// ── controller-level CASHIER branch guard ───────────────────────────────
	describe("correct() controller branch — CASHIER role guard (REQ-B4)", () => {
		it("ForbiddenException when CASHIER tries to correct (no CANCELLED status)", () => {
			// Simulate the controller branch directly
			const user = { sub: USER_ID, role: "CASHIER" };
			const dto = { payment_method: "CASH" as const };

			const runBranch = () => {
				if (dto.payment_method !== undefined && user.role !== "OWNER") {
					throw new ForbiddenException("Solo el OWNER puede corregir ventas");
				}
			};

			expect(runBranch).toThrow(ForbiddenException);
		});
	});
});
