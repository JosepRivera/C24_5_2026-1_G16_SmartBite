import Anthropic from "@anthropic-ai/sdk";
import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { env } from "@/config/env";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService } from "@/prisma/prisma.service";
import { TEXT_TO_SQL_SYSTEM_PROMPT } from "./prompts/text-to-sql.prompt";

const _ALLOWED_MODELS = ["claude-haiku-4-5-20251001"];
const SQL_DANGEROUS_PATTERN =
	/\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|REPLACE|MERGE|GRANT|REVOKE|EXEC|EXECUTE)\b/i;
const SQL_SELECT_PATTERN = /^\s*SELECT\b/i;
const SQL_UNION_SUBQUERY_PATTERN = /\bUNION\b[\s\S]*\bSELECT\b/i;

@Injectable()
export class AiService {
	constructor(private readonly prisma: PrismaService) {}

	private get anthropic() {
		return new Anthropic({
			apiKey: env.ANTHROPIC_API_KEY,
			timeout: env.CLAUDE_TIMEOUT_INTERACTIVE,
		});
	}

	async query(question: string) {
		if (!env.ANTHROPIC_API_KEY) {
			throw new ServiceUnavailableException("Servicio de IA no disponible");
		}

		let sql: string;

		try {
			const response = await this.anthropic.messages.create({
				model: "claude-haiku-4-5-20251001",
				max_tokens: 512,
				system: [
					{
						type: "text",
						text: TEXT_TO_SQL_SYSTEM_PROMPT,
						cache_control: { type: "ephemeral" },
					},
				],
				messages: [{ role: "user", content: question }],
			});

			const textBlock = response.content.find((b) => b.type === "text");
			if (!textBlock || textBlock.type !== "text") {
				throw new ServiceUnavailableException("Respuesta inválida del modelo");
			}

			sql = textBlock.text.trim().replace(/;+$/, "");
		} catch (err) {
			if (err instanceof ServiceUnavailableException) throw err;
			throw new ServiceUnavailableException("Error al contactar el servicio de IA");
		}

		const upperSql = sql.toUpperCase().trim();
		if (!SQL_SELECT_PATTERN.test(upperSql)) {
			throw new BadRequestException("Solo se permiten consultas SELECT");
		}

		if (SQL_DANGEROUS_PATTERN.test(sql)) {
			throw new BadRequestException("Consulta no permitida");
		}

		if (SQL_UNION_SUBQUERY_PATTERN.test(sql)) {
			throw new BadRequestException("UNION con subqueries no permitido");
		}

		if (sql.includes(";")) {
			throw new BadRequestException("Sentencias múltiples no permitidas");
		}

		try {
			const result = await Promise.race([
				this.prisma.$queryRawUnsafe(sql),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error("timeout")), env.CLAUDE_TIMEOUT_INTERACTIVE),
				),
			]);

			return { sql, result };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Error al ejecutar la consulta";
			if (message === "timeout") {
				throw new ServiceUnavailableException("La consulta tardó demasiado");
			}
			throw new BadRequestException(`Error en la consulta: ${message}`);
		}
	}
}
