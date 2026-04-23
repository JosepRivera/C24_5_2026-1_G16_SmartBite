import {
	ConflictException,
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaProduct, PrismaService, SaleStatus } from "@/prisma/prisma.service";
import type { CreateProduct } from "./dto/create-product.dto";
import type { UpdateProduct } from "./dto/update-product.dto";

interface CacheEntry {
	data: PrismaProduct[];
	expiresAt: number;
}

@Injectable()
export class ProductsService {
	private readonly cache = new Map<string, CacheEntry>();
	private readonly CACHE_TTL_MS = 5 * 60 * 1000;

	constructor(private readonly prisma: PrismaService) {}

	async findAll(includeInactive: boolean, category?: string): Promise<PrismaProduct[]> {
		const key = `${includeInactive}:${category ?? ""}`;
		const cached = this.cache.get(key);

		if (cached && cached.expiresAt > Date.now()) {
			return cached.data;
		}

		const data = await this.prisma.product.findMany({
			where: {
				...(includeInactive ? {} : { isActive: true }),
				...(category ? { category } : {}),
			},
			orderBy: [{ category: "asc" }, { name: "asc" }],
		});

		this.cache.set(key, { data, expiresAt: Date.now() + this.CACHE_TTL_MS });

		return data;
	}

	async findOne(id: string): Promise<PrismaProduct> {
		const product = await this.prisma.product.findUnique({ where: { id } });

		if (!product) {
			throw new NotFoundException("Producto no encontrado");
		}

		return product;
	}

	async create(dto: CreateProduct): Promise<PrismaProduct> {
		const existing = await this.prisma.product.findFirst({ where: { name: dto.name } });

		if (existing) {
			throw new ConflictException("Nombre ya existe");
		}

		const product = await this.prisma.product.create({
			data: {
				name: dto.name,
				price: dto.price,
				category: dto.category,
			},
		});

		this.cache.clear();

		return product;
	}

	async update(id: string, dto: UpdateProduct): Promise<PrismaProduct> {
		const product = await this.prisma.product.findUnique({ where: { id } });

		if (!product) {
			throw new NotFoundException("Producto no encontrado");
		}

		if (dto.name && dto.name !== product.name) {
			const conflict = await this.prisma.product.findFirst({
				where: { name: dto.name, NOT: { id } },
			});

			if (conflict) {
				throw new ConflictException("Nombre ya existe");
			}
		}

		const updated = await this.prisma.product.update({
			where: { id },
			data: {
				...(dto.name !== undefined && { name: dto.name }),
				...(dto.price !== undefined && { price: dto.price }),
				...(dto.category !== undefined && { category: dto.category }),
			},
		});

		this.cache.clear();

		return updated;
	}

	async deactivate(id: string): Promise<PrismaProduct> {
		const product = await this.prisma.product.findUnique({ where: { id } });

		if (!product) {
			throw new NotFoundException("Producto no encontrado");
		}

		const openOrder = await this.prisma.saleItem.findFirst({
			where: {
				productId: id,
				sale: { status: "OPEN" as SaleStatus },
			},
		});

		if (openOrder) {
			throw new UnprocessableEntityException("El producto tiene órdenes abiertas activas");
		}

		const updated = await this.prisma.product.update({
			where: { id },
			data: { isActive: false },
		});

		this.cache.clear();

		return updated;
	}
}
