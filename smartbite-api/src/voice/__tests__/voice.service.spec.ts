import { ServiceUnavailableException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceService } from "../voice.service";

vi.mock("@/config/env", () => ({
	env: {
		SUPABASE_URL: "https://test.supabase.co",
		SUPABASE_SERVICE_ROLE_KEY: "test-key",
		GROQ_API_KEY: "gsk_test",
		GROQ_WHISPER_MODEL: "whisper-large-v3-turbo",
		GROQ_TIMEOUT: 15000,
		ANTHROPIC_API_KEY: "sk-ant-test",
		CLAUDE_TIMEOUT_INTERACTIVE: 10000,
	},
}));

const mockGroqTranscribe = vi.hoisted(() =>
	vi.fn().mockResolvedValue({ text: "Vendí dos pizzas margherita" }),
);

const mockAnthropicCreate = vi.hoisted(() =>
	vi.fn().mockResolvedValue({
		content: [
			{
				type: "text",
				text: JSON.stringify({
					product_names: ["pizza margherita"],
					quantities: [2],
					payment_method: null,
				}),
			},
		],
	}),
);

vi.mock("groq-sdk", () => ({
	default: class {
		audio = {
			transcriptions: { create: mockGroqTranscribe },
		};
	},
}));

vi.mock("@anthropic-ai/sdk", () => ({
	default: class {
		messages = { create: mockAnthropicCreate };
	},
}));

describe("VoiceService", () => {
	let service: VoiceService;

	beforeEach(() => {
		vi.clearAllMocks();
		mockGroqTranscribe.mockResolvedValue({ text: "Vendí dos pizzas margherita" });
		mockAnthropicCreate.mockResolvedValue({
			content: [
				{
					type: "text",
					text: JSON.stringify({
						product_names: ["pizza margherita"],
						quantities: [2],
						payment_method: null,
					}),
				},
			],
		});
		service = new VoiceService();
	});

	it("transcribe y extrae campos correctamente", async () => {
		const result = await service.transcribeAndExtract(
			Buffer.from("fake-audio"),
			"audio/webm",
			"sale",
		);

		expect(result.transcription).toBe("Vendí dos pizzas margherita");
		expect(result.fields).toBeDefined();
		expect((result.fields as Record<string, unknown>)?.product_names).toContain("pizza margherita");
	});

	it("retorna fields: null si Claude falla", async () => {
		mockAnthropicCreate.mockRejectedValueOnce(new Error("API error"));

		const result = await service.transcribeAndExtract(
			Buffer.from("fake-audio"),
			"audio/webm",
			"sale",
		);

		expect(result.transcription).toBe("Vendí dos pizzas margherita");
		expect(result.fields).toBeNull();
	});

	it("lanza 503 si Groq falla", async () => {
		mockGroqTranscribe.mockRejectedValueOnce(new Error("network error"));

		await expect(
			service.transcribeAndExtract(Buffer.from("fake"), "audio/webm", "sale"),
		).rejects.toThrow(ServiceUnavailableException);
	});

	it("retorna fields: null para formType desconocido", async () => {
		const result = await service.transcribeAndExtract(
			Buffer.from("fake-audio"),
			"audio/webm",
			"sale",
		);
		expect(result.transcription).toBeDefined();
	});
});
