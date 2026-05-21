import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import Groq from "groq-sdk";
import { env } from "@/config/env";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService } from "@/prisma/prisma.service";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { DemandService } from "./demand.service";

@Injectable()
export class DemandScheduler {
	private readonly logger = new Logger(DemandScheduler.name);

	constructor(
		private readonly demandService: DemandService,
		private readonly prisma: PrismaService,
	) {}

	@Cron("0 6 * * *")
	async runDailyPlan() {
		this.logger.log("Generando plan de producción diario...");

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const predictions = await this.demandService.predictNextDays(1);

		const multiplier = await this.getGroqMultiplier(predictions);

		await this.prisma.$transaction(async (tx) => {
			await tx.dailyProductionPlan.deleteMany({
				where: { date: { gte: today, lt: tomorrow } },
			});

			for (const pred of predictions) {
				const adjustedQty = pred.quantity * multiplier;
				await tx.dailyProductionPlan.create({
					data: {
						date: pred.date,
						productId: pred.productId,
						quantity: Math.max(0, Math.round(adjustedQty)),
						predictionSource: multiplier !== 1 ? "holt-winters+groq" : "holt-winters",
					},
				});
			}
		});

		this.logger.log(`Plan diario generado: ${predictions.length} productos`);
	}

	private async getGroqMultiplier(
		predictions: { productId: string; quantity: number }[],
	): Promise<number> {
		if (!env.GROQ_API_KEY) return 1;

		const total = predictions.reduce((sum, p) => sum + p.quantity, 0);
		const prompt = `Se estima producir ${total} unidades totales mañana según el algoritmo Holt-Winters. Considerando el día de la semana y tendencias típicas de restaurante, ¿deberías ajustar la producción? Responde ÚNICAMENTE con un número decimal entre 0.5 y 2.0 que multiplique la predicción base. Ejemplo: 1.0 si no hay ajuste, 1.2 si debes aumentar 20%.`;

		try {
			const groq = new Groq({
				apiKey: env.GROQ_API_KEY,
				timeout: env.GROQ_TIMEOUT,
			});

			const response = await Promise.race([
				groq.chat.completions.create({
					model: env.GROQ_TEXT_MODEL,
					max_tokens: 16,
					messages: [{ role: "user", content: prompt }],
				}),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error("timeout")), env.GROQ_TIMEOUT),
				),
			]);

			const content = response.choices[0]?.message?.content;
			if (content) {
				const val = Number.parseFloat(content.trim());
				if (!Number.isNaN(val) && val >= 0.5 && val <= 2.0) {
					return val;
				}
			}
		} catch (_err) {
			this.logger.warn("Groq no disponible para ajuste; usando predicción base");
		}

		return 1;
	}

	async triggerManually(): Promise<void> {
		await this.runDailyPlan();
	}
}
