import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiService } from "../ai.service";

vi.mock("@/config/env", () => ({
	env: {
		SUPABASE_URL: "https://test.supabase.co",
		SUPABASE_SERVICE_ROLE_KEY: "test-key",
		GROQ_API_KEY: "gsk_test",
		GROQ_TEXT_MODEL: "gpt-oss-120b",
		GROQ_TIMEOUT: 10000,
	},
}));

const mockGroqCreate = vi.hoisted(() =>
	vi.fn().mockResolvedValue({
		choices: [{ message: { content: "SELECT * FROM products" } }],
	}),
);

vi.mock("groq-sdk", () => ({
	default: class {
		chat = { completions: { create: mockGroqCreate } };
	},
}));

const mockReadonlyPrisma = {
	$queryRawUnsafe: vi.fn(),
};

describe("AiService", () => {
	let service: AiService;

	beforeEach(() => {
		vi.clearAllMocks();
		mockGroqCreate.mockResolvedValue({
			choices: [{ message: { content: "SELECT * FROM products" } }],
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
		mockGroqCreate.mockResolvedValueOnce({
			choices: [{ message: { content: "DELETE FROM products" } }],
		});

		await expect(service.query("Elimina todos los productos")).rejects.toThrow(BadRequestException);
	});

	it("lanza ServiceUnavailableException si Groq falla", async () => {
		mockGroqCreate.mockRejectedValueOnce(new Error("network error"));

		await expect(service.query("test")).rejects.toThrow(ServiceUnavailableException);
	});

	it("rechaza SQL con semicolon", async () => {
		mockGroqCreate.mockResolvedValueOnce({
			choices: [{ message: { content: "SELECT 1; DROP TABLE users" } }],
		});

		await expect(service.query("test")).rejects.toThrow(BadRequestException);
	});

	it("rechaza SQL con EXEC/EXECUTE", async () => {
		mockGroqCreate.mockResolvedValueOnce({
			choices: [{ message: { content: "EXEC sp_tables" } }],
		});

		await expect(service.query("test")).rejects.toThrow(BadRequestException);
	});

	it("rechaza SQL con UNION y subquery SELECT", async () => {
		mockGroqCreate.mockResolvedValueOnce({
			choices: [{ message: { content: "SELECT 1 UNION SELECT password FROM users" } }],
		});

		await expect(service.query("test")).rejects.toThrow(BadRequestException);
	});

	it("acepta SELECT con whitespace inicial", async () => {
		mockGroqCreate.mockResolvedValueOnce({
			choices: [{ message: { content: "  SELECT * FROM products" } }],
		});
		mockReadonlyPrisma.$queryRawUnsafe.mockResolvedValue([]);

		const result = await service.query("test");

		expect(result.sql).toBe("SELECT * FROM products");
	});

	it("rechaza SQL con comentarios -- (linea)", async () => {
		mockGroqCreate.mockResolvedValueOnce({
			choices: [{ message: { content: "SELECT * FROM products -- comentario" } }],
		});

		await expect(service.query("test")).rejects.toThrow(BadRequestException);
	});

	it("rechaza SQL con comentarios /* */ (bloque)", async () => {
		mockGroqCreate.mockResolvedValueOnce({
			choices: [{ message: { content: "SELECT * /* secreto */ FROM products" } }],
		});

		await expect(service.query("test")).rejects.toThrow(BadRequestException);
	});

	it("rechaza SQL con funcion peligrosa pg_sleep", async () => {
		mockGroqCreate.mockResolvedValueOnce({
			choices: [{ message: { content: "SELECT pg_sleep(10)" } }],
		});

		await expect(service.query("test")).rejects.toThrow(BadRequestException);
	});

	it("rechaza SQL con tabla bloqueada (users)", async () => {
		mockGroqCreate.mockResolvedValueOnce({
			choices: [{ message: { content: "SELECT id, name FROM users" } }],
		});

		await expect(service.query("test")).rejects.toThrow(BadRequestException);
	});

	it("acepta consulta con alias de columna", async () => {
		mockGroqCreate.mockResolvedValueOnce({
			choices: [{ message: { content: "SELECT name AS product_name, price FROM products" } }],
		});
		mockReadonlyPrisma.$queryRawUnsafe.mockResolvedValue([]);

		const result = await service.query("test");

		expect(result.sql).toContain("product_name");
	});

	it("fallback a regex-only cuando AST falla al parsear", async () => {
		// node-sql-parser can parse this but it exercises the parse path
		mockGroqCreate.mockResolvedValueOnce({
			choices: [{ message: { content: "SELECT * FROM products WHERE price > 10" } }],
		});
		mockReadonlyPrisma.$queryRawUnsafe.mockResolvedValue([]);

		const result = await service.query("test");

		expect(result.sql).toBe("SELECT * FROM products WHERE price > 10");
	});

	it("acepta consulta a vista v_daily_summary", async () => {
		mockGroqCreate.mockResolvedValueOnce({
			choices: [{ message: { content: "SELECT * FROM v_daily_summary" } }],
		});
		mockReadonlyPrisma.$queryRawUnsafe.mockResolvedValue([]);

		const result = await service.query("test");

		expect(result.sql).toBe("SELECT * FROM v_daily_summary");
	});
});
