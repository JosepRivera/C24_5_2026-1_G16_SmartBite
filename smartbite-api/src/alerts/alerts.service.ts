import { Injectable } from "@nestjs/common";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService } from "@/prisma/prisma.service";

@Injectable()
export class AlertsService {
	constructor(private readonly prisma: PrismaService) {}

	async getLowStock() {
		const ingredients = await this.prisma.ingredient.findMany({
			orderBy: { name: "asc" },
		});

		return ingredients
			.filter((i) => Number(i.stock) <= Number(i.minStock))
			.map((i) => ({
				id: i.id,
				name: i.name,
				unit: i.unit,
				stock: Number(i.stock),
				min_stock: Number(i.minStock),
				shortage: Number(i.minStock) - Number(i.stock),
			}));
	}
}
