import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiService } from "../ai.service";

vi.mock("@/config/env", () => ({
	env: {
		SUPABASE_URL: "https://test.supabase.co",
		SUPABASE_SERVICE_ROLE_KEY: "test-key",
		ANTHROPIC_API_KEY: "sk-ant-test",
		ANTHROPIC_MODEL: "claude-haiku-4-5-20251001",
		CLAUDE_TIMEOUT_INTERACTIVE: 10000,
	},
}));

const mockAnthropicCreate = vi.hoisted(() =>
	vi.fn().mockResolvedValue({
		content: [{ type: "text", text: "SELECT * FROM products" }],
	}),
);

vi.mock("@anthropic-ai/sdk", () => ({
	default: class {
		messages = { create: mockAnthropicCreate };
	},
}));

const mockReadonlyPrisma = {
	$queryRawUnsafe: vi.fn(),
};

describe("AiService", () => {
	let service: AiService;

	beforeEach(() => {
		vi.clearAllMocks();
		mockAnthropicCreate.mockResolvedValue({
			content: [{ type: "text", text: "SELECT * FROM products" }],
		});
		service = new AiService(mockReadonlyPrisma as never);
	});

	it("ejecuta una consulta SELECT válida", async () => {
		mockReadonlyPrisma.$queryRawUnsafe.mockResolvedValue([{ id: "1", name: "Pizza" }]);

		const result = await service.query("¿Cuáles son los productos?");

		expect(result.sql).toBe("SELECT * FROM products");
		expect(result.result).toBeDefined();
	});

	it("rechaza SQL que no es SELECT", async () => {
		mockAnthropicCreate.mockResolvedValueOnce({
			content: [{ type: "text", text: "DELETE FROM products" }],
		});

		await expect(service.query("Elimina todos los productos")).rejects.toThrow(BadRequestException);
	});

	it("lanza ServiceUnavailableException si Anthropic falla", async () => {
		mockAnthropicCreate.mockRejectedValueOnce(new Error("network error"));

		await expect(service.query("test")).rejects.toThrow(ServiceUnavailableException);
	});

	it("rechaza SQL con semicolon", async () => {
		mockAnthropicCreate.mockResolvedValueOnce({
			content: [{ type: "text", text: "SELECT 1; DROP TABLE users" }],
		});

		await expect(service.query("test")).rejects.toThrow(BadRequestException);
	});

	it("rechaza SQL con EXEC/EXECUTE", async () => {
		mockAnthropicCreate.mockResolvedValueOnce({
			content: [{ type: "text", text: "EXEC sp_tables" }],
		});

		await expect(service.query("test")).rejects.toThrow(BadRequestException);
	});

	it("rechaza SQL con UNION y subquery SELECT", async () => {
		mockAnthropicCreate.mockResolvedValueOnce({
			content: [{ type: "text", text: "SELECT 1 UNION SELECT password FROM users" }],
		});

		await expect(service.query("test")).rejects.toThrow(BadRequestException);
	});

	it("acepta SELECT con whitespace inicial", async () => {
		mockAnthropicCreate.mockResolvedValueOnce({
			content: [{ type: "text", text: "  SELECT * FROM products" }],
		});
		mockReadonlyPrisma.$queryRawUnsafe.mockResolvedValue([]);

		const result = await service.query("test");

		expect(result.sql).toBe("SELECT * FROM products");
	});
});
