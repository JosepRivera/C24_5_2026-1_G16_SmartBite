import { beforeEach, describe, expect, it, vi } from "vitest";
import { DevicesService } from "../devices.service";

vi.mock("@/config/env", () => ({
	env: { SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-key" },
}));

const mockPrisma = {
	deviceToken: {
		create: vi.fn(),
		findMany: vi.fn(),
		update: vi.fn(),
	},
};

describe("DevicesService", () => {
	let service: DevicesService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new DevicesService(mockPrisma as never);
	});

	describe("register()", () => {
		it("crea un dispositivo y retorna la api_key en texto plano", async () => {
			mockPrisma.deviceToken.create.mockResolvedValue({
				id: "device-1",
				name: "POS Principal",
				apiKeyHash: "hashedkey",
				isActive: true,
				registeredBy: "user-1",
				lastUsedAt: null,
				revokedAt: null,
				createdAt: new Date(),
			});

			const result = await service.register("user-1", { name: "POS Principal" });

			expect(result.api_key).toBeDefined();
			expect(result.api_key).toHaveLength(64);
			expect(result.id).toBe("device-1");

			const call = mockPrisma.deviceToken.create.mock.calls[0][0];
			expect(call.data.apiKeyHash).toBeDefined();
			expect(call.data.apiKeyHash).not.toBe(result.api_key);
		});
	});

	describe("findAll()", () => {
		it("retorna lista de dispositivos formateada", async () => {
			mockPrisma.deviceToken.findMany.mockResolvedValue([
				{
					id: "device-1",
					name: "POS Principal",
					isActive: true,
					registeredBy: "user-1",
					lastUsedAt: null,
					revokedAt: null,
					createdAt: new Date(),
				},
			]);

			const result = await service.findAll();

			expect(result).toHaveLength(1);
			expect(result[0].is_active).toBe(true);
			expect(result[0]).not.toHaveProperty("apiKeyHash");
		});
	});

	describe("revoke()", () => {
		it("revoca el dispositivo correctamente", async () => {
			mockPrisma.deviceToken.update.mockResolvedValue({});

			const result = await service.revoke("device-1");

			expect(result.revoked).toBe(true);
			expect(mockPrisma.deviceToken.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: "device-1" },
					data: expect.objectContaining({ isActive: false }),
				}),
			);
		});
	});
});
