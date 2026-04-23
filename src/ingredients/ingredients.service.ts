import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaIngredient, PrismaService } from "@/prisma/prisma.service";
import type { CreateIngredient } from "./dto/create-ingredient.dto";
import type { UpdateIngredient } from "./dto/update-ingredient.dto";

export type IngredientWithLowStock = PrismaIngredient & { is_low_stock: boolean };

@Injectable()
export class IngredientsService {
	constructor(private readonly prisma: PrismaService) {}

	private withLowStock(ingredient: PrismaIngredient): IngredientWithLowStock {
		return {
			...ingredient,
			is_low_stock: Number(ingredient.stock) <= Number(ingredient.minStock),
		};
	}

	async findAll(lowStock: boolean): Promise<IngredientWithLowStock[]> {
		const ingredients = await this.prisma.ingredient.findMany({
			orderBy: { name: "asc" },
		});

		const result = ingredients.map((i) => this.withLowStock(i));

		if (lowStock) {
			return result.filter((i) => i.is_low_stock);
		}

		return result;
	}

	async findOne(id: string): Promise<IngredientWithLowStock> {
		const ingredient = await this.prisma.ingredient.findUnique({ where: { id } });

		if (!ingredient) {
			throw new NotFoundException("Insumo no encontrado");
		}

		return this.withLowStock(ingredient);
	}

	async create(dto: CreateIngredient): Promise<IngredientWithLowStock> {
		const existing = await this.prisma.ingredient.findFirst({ where: { name: dto.name } });

		if (existing) {
			throw new ConflictException("Nombre ya existe");
		}

		const ingredient = await this.prisma.ingredient.create({
			data: {
				name: dto.name,
				unit: dto.unit,
				stock: dto.stock,
				minStock: dto.min_stock,
				costPerUnit: dto.cost_per_unit,
			},
		});

		return this.withLowStock(ingredient);
	}

	async update(id: string, dto: UpdateIngredient): Promise<IngredientWithLowStock> {
		const ingredient = await this.prisma.ingredient.findUnique({ where: { id } });

		if (!ingredient) {
			throw new NotFoundException("Insumo no encontrado");
		}

		if (dto.stock !== undefined && dto.stock < 0) {
			throw new BadRequestException("El stock no puede ser negativo");
		}

		if (dto.name && dto.name !== ingredient.name) {
			const conflict = await this.prisma.ingredient.findFirst({
				where: { name: dto.name, NOT: { id } },
			});

			if (conflict) {
				throw new ConflictException("Nombre ya existe");
			}
		}

		const updated = await this.prisma.ingredient.update({
			where: { id },
			data: {
				...(dto.name !== undefined && { name: dto.name }),
				...(dto.unit !== undefined && { unit: dto.unit }),
				...(dto.stock !== undefined && { stock: dto.stock }),
				...(dto.min_stock !== undefined && { minStock: dto.min_stock }),
				...(dto.cost_per_unit !== undefined && { costPerUnit: dto.cost_per_unit }),
			},
		});

		return this.withLowStock(updated);
	}
}
