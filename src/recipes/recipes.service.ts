import { Injectable, NotFoundException } from "@nestjs/common";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService } from "@/prisma/prisma.service";
import type { UpsertRecipe } from "./dto/upsert-recipe.dto";

@Injectable()
export class RecipesService {
	constructor(private readonly prisma: PrismaService) {}

	async findByProduct(productId: string) {
		const items = await this.prisma.recipe.findMany({
			where: { productId },
			include: {
				ingredient: {
					select: { id: true, name: true, unit: true },
				},
			},
			orderBy: { ingredient: { name: "asc" } },
		});

		if (items.length === 0) {
			throw new NotFoundException("Producto sin receta registrada");
		}

		return {
			product_id: productId,
			items: items.map((r) => ({
				id: r.id,
				ingredient_id: r.ingredientId,
				ingredient_name: r.ingredient.name,
				unit: r.ingredient.unit,
				quantity: Number(r.quantity),
			})),
		};
	}

	async upsert(productId: string, dto: UpsertRecipe) {
		const product = await this.prisma.product.findUnique({ where: { id: productId } });
		if (!product) {
			throw new NotFoundException("Producto no encontrado");
		}

		const ingredientIds = dto.items.map((i) => i.ingredient_id);
		const ingredients = await this.prisma.ingredient.findMany({
			where: { id: { in: ingredientIds } },
			select: { id: true, name: true, unit: true },
		});

		if (ingredients.length !== ingredientIds.length) {
			const foundIds = new Set(ingredients.map((i) => i.id));
			const missing = ingredientIds.find((id) => !foundIds.has(id));
			throw new NotFoundException(`Insumo no encontrado: ${missing}`);
		}

		const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));

		const newItems = await this.prisma.$transaction(async (tx) => {
			await tx.recipe.deleteMany({ where: { productId } });

			return tx.recipe.createManyAndReturn({
				data: dto.items.map((item) => ({
					productId,
					ingredientId: item.ingredient_id,
					quantity: item.quantity,
				})),
			});
		});

		return {
			product_id: productId,
			items: newItems.map((r) => {
				const ingredient = ingredientMap.get(r.ingredientId);
				if (!ingredient) {
					throw new Error(`Invariant violated: ingredient ${r.ingredientId} not found in map`);
				}
				return {
					id: r.id,
					ingredient_id: r.ingredientId,
					ingredient_name: ingredient.name,
					unit: ingredient.unit,
					quantity: Number(r.quantity),
				};
			}),
		};
	}
}
