import Anthropic from "@anthropic-ai/sdk";
import { Injectable, Logger } from "@nestjs/common";
import { env } from "@/config/env";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { DemandService } from "@/demand/demand.service";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService } from "@/prisma/prisma.service";

@Injectable()
export class MrpService {
	private readonly logger = new Logger(MrpService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly demandService: DemandService,
	) {}

	async computeMrp(days: number) {
		const predictions = await this.demandService.predictNextDays(days);

		const productIds = [...new Set(predictions.map((p) => p.productId))];

		const recipes = await this.prisma.recipe.findMany({
			where: { productId: { in: productIds } },
			include: {
				ingredient: { select: { id: true, name: true, unit: true, stock: true } },
			},
		});

		const ingredientNeeds = new Map<
			string,
			{ name: string; unit: string; stock: number; needed: number }
		>();

		for (const pred of predictions) {
			const productRecipes = recipes.filter((r) => r.productId === pred.productId);
			for (const recipe of productRecipes) {
				const ingId = recipe.ingredientId;
				const needed = pred.quantity * Number(recipe.quantity);

				if (!ingredientNeeds.has(ingId)) {
					ingredientNeeds.set(ingId, {
						name: recipe.ingredient.name,
						unit: recipe.ingredient.unit,
						stock: Number(recipe.ingredient.stock),
						needed: 0,
					});
				}

				const entry = ingredientNeeds.get(ingId);
				if (entry) entry.needed += needed;
			}
		}

		const items = [...ingredientNeeds.entries()].map(([id, data]) => ({
			ingredient_id: id,
			ingredient_name: data.name,
			unit: data.unit,
			current_stock: data.stock,
			needed: Math.ceil(data.needed),
			to_order: Math.max(0, Math.ceil(data.needed) - data.stock),
		}));

		const summary = await this.buildNaturalLanguageSummary(items, days);

		return { days, items, summary };
	}

	private async buildNaturalLanguageSummary(
		items: { ingredient_name: string; unit: string; to_order: number }[],
		days: number,
	): Promise<string> {
		const needsOrdering = items.filter((i) => i.to_order > 0);

		if (needsOrdering.length === 0) {
			return `Para los próximos ${days} días, el stock actual es suficiente para cubrir la demanda estimada.`;
		}

		const tableText = needsOrdering
			.map((i) => `- ${i.ingredient_name}: ${i.to_order} ${i.unit}`)
			.join("\n");

		const fallback = `Para los próximos ${days} días, necesitas pedir:\n${tableText}`;

		if (!env.ANTHROPIC_API_KEY) return fallback;

		try {
			const anthropic = new Anthropic({
				apiKey: env.ANTHROPIC_API_KEY,
				timeout: env.CLAUDE_TIMEOUT_INTERACTIVE,
			});

			const prompt = `Redacta en español, de forma concisa y profesional, la lista de insumos a pedir para los próximos ${days} días en un restaurante. Los insumos son:\n${tableText}\n\nSé directo y usa máximo 3 oraciones.`;

			const response = await Promise.race([
				anthropic.messages.create({
					model: "claude-haiku-4-5-20251001",
					max_tokens: 256,
					messages: [{ role: "user", content: prompt }],
				}),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error("timeout")), env.CLAUDE_TIMEOUT_INTERACTIVE),
				),
			]);

			const text = response.content.find((b) => b.type === "text");
			if (text && text.type === "text") {
				return text.text.trim();
			}
		} catch {
			this.logger.warn("Claude no disponible para resumen MRP; usando formato tabla");
		}

		return fallback;
	}
}
