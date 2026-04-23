import { UnauthorizedException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiKeyGuard } from "../api-key.guard";

vi.mock("@/config/env", () => ({
	env: { SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-key" },
}));

const mockPrisma = {
	deviceToken: {
		findUnique: vi.fn(),
		update: vi.fn(),
	},
};

const makeContext = (headers: Record<string, string>) => ({
	switchToHttp: () => ({
		getRequest: () => ({ headers, device: undefined }),
	}),
});

describe("ApiKeyGuard", () => {
	let guard: ApiKeyGuard;

	beforeEach(() => {
		vi.clearAllMocks();
		guard = new ApiKeyGuard(mockPrisma as never);
	});

	it("lanza UnauthorizedException si no hay X-API-Key", async () => {
		await expect(guard.canActivate(makeContext({}) as never)).rejects.toThrow(
			UnauthorizedException,
		);
	});

	it("lanza UnauthorizedException si el hash no existe en DB", async () => {
		mockPrisma.deviceToken.findUnique.mockResolvedValue(null);

		await expect(
			guard.canActivate(makeContext({ "x-api-key": "invalid-key" }) as never),
		).rejects.toThrow(UnauthorizedException);
	});

	it("lanza UnauthorizedException si el dispositivo está revocado", async () => {
		mockPrisma.deviceToken.findUnique.mockResolvedValue({
			id: "device-1",
			isActive: false,
			revokedAt: new Date(),
		});

		await expect(
			guard.canActivate(makeContext({ "x-api-key": "some-key" }) as never),
		).rejects.toThrow(UnauthorizedException);
	});

	it("permite acceso con API key válida y activa", async () => {
		mockPrisma.deviceToken.findUnique.mockResolvedValue({
			id: "device-1",
			isActive: true,
			revokedAt: null,
		});
		mockPrisma.deviceToken.update.mockResolvedValue({});

		const request = { headers: { "x-api-key": "valid-key" }, device: undefined };
		const ctx = {
			switchToHttp: () => ({ getRequest: () => request }),
		};

		const result = await guard.canActivate(ctx as never);

		expect(result).toBe(true);
		expect(request.device).toBeDefined();
	});
});
