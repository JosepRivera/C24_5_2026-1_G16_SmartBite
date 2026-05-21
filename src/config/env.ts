import { config } from "dotenv";
import { z } from "zod";

// Solo carga el .env si no estamos en Docker (donde las vars ya vienen del entorno)
if (process.env.NODE_ENV !== "production") {
	config();
}

/**
 * Environment configuration schema
 * @source Single source of truth for all environment variables
 */
export const envSchema = z.object({
	// Server Configuration
	PORT: z.coerce.number().int().positive().default(3000).describe("Server port"),
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development")
		.describe("Node environment"),

	// Database Configuration (Supabase)
	DATABASE_URL: z.string().describe("Supabase Transaction Pooler URL (runtime queries)"),
	DIRECT_URL: z.string().describe("Supabase Direct Connection URL (migrations, db execute)"),
	DATABASE_URL_READONLY: z
		.string()
		.optional()
		.describe("Supabase read-only connection URL (AI queries)"),

	// Supabase Configuration
	SUPABASE_URL: z.string().url().describe("Supabase project URL"),
	SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).describe("Supabase service role key (admin SDK)"),

	// CORS Configuration
	CORS_ORIGIN: z.string().url().optional().describe("CORS origin URL"),

	// Groq API Configuration
	GROQ_API_KEY: z.string().startsWith("gsk_").optional().describe("Groq API key"),
	GROQ_TEXT_MODEL: z
		.string()
		.default("gpt-oss-120b")
		.describe("Groq model for text generation"),
	GROQ_WHISPER_MODEL: z
		.string()
		.default("whisper-large-v3-turbo")
		.describe("Groq Whisper model to use"),
	GROQ_TIMEOUT: z.coerce
		.number()
		.int()
		.positive()
		.default(15_000)
		.describe("Timeout (ms) for Groq requests"),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);

export function validate(config: Record<string, unknown>): Env {
	return envSchema.parse(config);
}
