import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

dotenv.config();

export default defineConfig({
	schema: "prisma/schema.prisma",
	migrations: {
		path: "prisma/migrations",
		seed: "pnpm tsx prisma/seed.ts",
	},
	datasource: {
		url: env("DIRECT_URL"),
	},
});
