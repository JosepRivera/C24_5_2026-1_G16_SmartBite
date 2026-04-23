import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			{
				resolve: {
					alias: {
						"@": resolve(__dirname, "src"),
					},
				},
				test: {
					name: "unit",
					globals: true,
					environment: "node",
					include: ["src/**/__tests__/**/*.spec.ts"],
				},
			},
			{
				resolve: {
					alias: {
						"@": resolve(__dirname, "src"),
					},
				},
				test: {
					name: "e2e",
					globals: true,
					environment: "node",
					include: ["test/**/*.e2e-spec.ts"],
					fileParallelism: false,
					maxWorkers: 1,
					isolate: false,
					setupFiles: ["dotenv/config"],
				},
			},
		],
		coverage: {
			provider: "v8",
			include: ["src/**/*.service.ts"],
			exclude: ["src/prisma/**", "src/main.ts", "src/app.module.ts"],
		},
	},
});