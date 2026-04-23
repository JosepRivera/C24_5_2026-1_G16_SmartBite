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

	// Supabase Configuration
	SUPABASE_URL: z.string().url().describe("Supabase project URL"),
	SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).describe("Supabase service role key (admin SDK)"),

	// CORS Configuration
	CORS_ORIGIN: z.string().url().optional().describe("CORS origin URL"),

	// Anthropic Claude API Configuration
	ANTHROPIC_API_KEY: z
		.string()
		.startsWith("sk-ant-")
		.optional()
		.describe("Anthropic API key for Claude models"),
	ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-6").describe("Anthropic model to use"),
	CLAUDE_TIMEOUT_INTERACTIVE: z.coerce
		.number()
		.int()
		.positive()
		.default(10_000)
		.describe("Timeout (ms) for interactive Claude requests"),
	CLAUDE_TIMEOUT_BATCH: z.coerce
		.number()
		.int()
		.positive()
		.default(30_000)
		.describe("Timeout (ms) for batch Claude requests"),

	// Groq Whisper API Configuration
	GROQ_API_KEY: z.string().startsWith("gsk_").optional().describe("Groq API key for Whisper model"),
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
