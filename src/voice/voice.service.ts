import Anthropic from "@anthropic-ai/sdk";
import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import Groq from "groq-sdk";
import { env } from "@/config/env";
import { ENTITY_EXTRACTION_SYSTEM_PROMPTS } from "./prompts/entity-extraction.prompt";

type FormType = "sale" | "expense" | "ingredient_update";

@Injectable()
export class VoiceService {
	private readonly logger = new Logger(VoiceService.name);

	async transcribeAndExtract(audioBuffer: Buffer, mimeType: string, formType: FormType) {
		const transcription = await this.transcribe(audioBuffer, mimeType);
		const fields = await this.extractFields(transcription, formType);

		return { transcription, fields };
	}

	private async transcribe(audioBuffer: Buffer, mimeType: string): Promise<string> {
		if (!env.GROQ_API_KEY) {
			throw new ServiceUnavailableException("Servicio de transcripción no disponible");
		}

		const groq = new Groq({
			apiKey: env.GROQ_API_KEY,
			timeout: env.GROQ_TIMEOUT,
		});

		try {
			const file = new File([audioBuffer], "audio.webm", { type: mimeType });

			const result = await groq.audio.transcriptions.create({
				file,
				model: env.GROQ_WHISPER_MODEL,
				language: "es",
			});

			return result.text;
		} catch (err) {
			this.logger.error("Error en transcripción Groq", err);
			throw new ServiceUnavailableException("Error al transcribir el audio");
		}
	}

	private async extractFields(
		transcription: string,
		formType: FormType,
	): Promise<Record<string, unknown> | null> {
		if (!env.ANTHROPIC_API_KEY) return null;

		const systemPrompt = ENTITY_EXTRACTION_SYSTEM_PROMPTS[formType];
		if (!systemPrompt) return null;

		try {
			const anthropic = new Anthropic({
				apiKey: env.ANTHROPIC_API_KEY,
				timeout: env.CLAUDE_TIMEOUT_INTERACTIVE,
			});

			const response = await Promise.race([
				anthropic.messages.create({
					model: "claude-haiku-4-5-20251001",
					max_tokens: 512,
					system: [
						{
							type: "text",
							text: systemPrompt,
							cache_control: { type: "ephemeral" },
						},
					],
					messages: [{ role: "user", content: transcription }],
				}),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error("timeout")), env.CLAUDE_TIMEOUT_INTERACTIVE),
				),
			]);

			const textBlock = response.content.find((b) => b.type === "text");
			if (!textBlock || textBlock.type !== "text") return null;

			return JSON.parse(textBlock.text.trim()) as Record<string, unknown>;
		} catch {
			this.logger.warn("Claude no disponible para extracción de campos");
			return null;
		}
	}
}
