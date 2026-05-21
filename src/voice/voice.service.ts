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
		if (!env.GROQ_API_KEY) return null;

		const systemPrompt = ENTITY_EXTRACTION_SYSTEM_PROMPTS[formType];
		if (!systemPrompt) return null;

		try {
			const groq = new Groq({
				apiKey: env.GROQ_API_KEY,
				timeout: env.GROQ_TIMEOUT,
			});

			const response = await Promise.race([
				groq.chat.completions.create({
					model: env.GROQ_TEXT_MODEL,
					max_tokens: 512,
					messages: [
						{ role: "system", content: systemPrompt },
						{ role: "user", content: transcription },
					],
				}),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error("timeout")), env.GROQ_TIMEOUT),
				),
			]);

			const content = response.choices[0]?.message?.content;
			if (!content) return null;

			return JSON.parse(content.trim()) as Record<string, unknown>;
		} catch {
			this.logger.warn("Groq no disponible para extracción de campos");
			return null;
		}
	}
}
