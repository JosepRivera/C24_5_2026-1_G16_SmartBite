import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import Groq from "groq-sdk";
import { env } from "@/config/env";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { ReadOnlyPrismaService } from "@/prisma/read-only.service";
import { TEXT_TO_SQL_SYSTEM_PROMPT } from "./prompts/text-to-sql.prompt";

const SQL_DANGEROUS_PATTERN =
	/\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|REPLACE|MERGE|GRANT|REVOKE|EXEC|EXECUTE)\b/i;
const SQL_SELECT_PATTERN = /^\s*SELECT\b/i;
const SQL_UNION_SUBQUERY_PATTERN = /\bUNION\b[\s\S]*\bSELECT\b/i;

/** Extract SQL from markdown code blocks (e.g. ```sql ... ```) */
function extractSql(content: string): string {
	const match = content.match(/```(?:sql)?\s*\n?([\s\S]*?)```/);
	if (match) return match[1].trim();
	return content.trim();
}

/** Recursively convert BigInt and Decimal values for JSON serialization */
function sanitizeResult(data: unknown): unknown {
	if (typeof data === "bigint") return data.toString();
	// Prisma Decimal (decimal.js) objects have s, e, d properties
	if (
		data !== null &&
		typeof data === "object" &&
		"s" in data &&
		"e" in data &&
		"d" in data &&
		Array.isArray((data as Record<string, unknown>).d)
	)
		return Number(data.toString());
	if (Array.isArray(data)) return data.map(sanitizeResult);
	if (data !== null && typeof data === "object")
		return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, sanitizeResult(v)]));
	return data;
}

@Injectable()
export class AiService {
	constructor(private readonly readonlyPrisma: ReadOnlyPrismaService) {}

	private get groq() {
		return new Groq({
			apiKey: env.GROQ_API_KEY,
			timeout: env.GROQ_TIMEOUT,
		});
	}

	async query(question: string) {
		if (!env.GROQ_API_KEY) {
			throw new ServiceUnavailableException("Servicio de IA no disponible");
		}

		let sql: string;

		try {
			const response = await this.groq.chat.completions.create({
				model: env.GROQ_TEXT_MODEL,
				max_tokens: 512,
				messages: [
					{ role: "system", content: TEXT_TO_SQL_SYSTEM_PROMPT },
					{ role: "user", content: question },
				],
			});

			const content = response.choices[0]?.message?.content;
			if (!content) {
				throw new ServiceUnavailableException("Respuesta inválida del modelo");
			}

			sql = extractSql(content).replace(/;+$/, "");
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
				this.readonlyPrisma.$queryRawUnsafe(sql),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error("timeout")), env.GROQ_TIMEOUT),
				),
			]);

			return { sql, result: sanitizeResult(result) };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Error al ejecutar la consulta";
			if (message === "timeout") {
				throw new ServiceUnavailableException("La consulta tardó demasiado");
			}
			throw new BadRequestException(`Error en la consulta: ${message}`);
		}
	}
}
