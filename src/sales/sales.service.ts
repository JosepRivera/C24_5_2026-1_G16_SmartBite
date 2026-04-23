import {
	BadRequestException,
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
} from "@nestjs/common";
import type { SaleGetPayload, SaleInclude, SaleWhereInput } from "@/generated/prisma/models/Sale";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService, SaleStatus } from "@/prisma/prisma.service";
import type { CorrectSale } from "./dto/correct-sale.dto";
import type { CreateSale } from "./dto/create-sale.dto";
import type { PaySale } from "./dto/pay-sale.dto";

const PAYMENT_STATUS: Record<PaySale["payment_method"], SaleStatus> = {
	CASH: SaleStatus.PAID_CASH,
	YAPE: SaleStatus.PAID_YAPE,
	PLIN: SaleStatus.PAID_PLIN,
	AGORA: SaleStatus.PAID_AGORA,
};

const SALE_INCLUDE = {
	items: {
		include: { product: { select: { id: true, name: true } } },
	},
	user: { select: { id: true, name: true, username: true } },
} satisfies SaleInclude;

type SaleFull = SaleGetPayload<{ include: typeof SALE_INCLUDE }>;

function formatSale(sale: SaleFull) {
	return {
		id: sale.id,
		status: sale.status,
		total: Number(sale.total),
		table_number: sale.tableNumber,
		customer_name: sale.customerName,
		created_at: sale.createdAt,
		user: sale.user,
		items: sale.items.map((item) => ({
			id: item.id,
			product_id: item.productId,
			product_name: item.product.name,
			quantity: item.quantity,
			unit_price: Number(item.unitPrice),
			subtotal: item.quantity * Number(item.unitPrice),
		})),
	};
}

@Injectable()
export class SalesService {
	constructor(private readonly prisma: PrismaService) {}

	async create(userId: string, dto: CreateSale) {
		const productIds = dto.items.map((i) => i.product_id);

		const products = await this.prisma.product.findMany({
			where: { id: { in: productIds }, isActive: true },
			select: { id: true, name: true, price: true },
		});

		const itemsData = dto.items.map((item) => {
			const product = products.find((p) => p.id === item.product_id);
			if (!product)
				throw new NotFoundException(`Producto no encontrado o inactivo: ${item.product_id}`);
			return {
				productId: item.product_id,
				quantity: item.quantity,
				unitPrice: product.price,
			};
		});

		const total = itemsData.reduce((acc, item) => acc + Number(item.unitPrice) * item.quantity, 0);

		const sale = await this.prisma.sale.create({
			data: {
				userId,
				status: SaleStatus.OPEN,
				total,
				tableNumber: dto.table_number,
				customerName: dto.customer_name,
				items: {
					create: itemsData,
				},
			},
			include: SALE_INCLUDE,
		});

		return formatSale(sale);
	}

	async findAll(role: string, status?: string, date?: string, userId?: string) {
		const where: SaleWhereInput = {};
		const isOwner = role === "OWNER";

		if (!isOwner) {
			// Non-OWNER roles: only OPEN orders of today
			where.status = SaleStatus.OPEN;
			const todayStart = new Date();
			todayStart.setHours(0, 0, 0, 0);
			const todayEnd = new Date(todayStart);
			todayEnd.setDate(todayEnd.getDate() + 1);
			where.createdAt = { gte: todayStart, lt: todayEnd };
		} else {
			// OWNER: full control
			if (status) {
				if (!(status in SaleStatus)) {
					throw new BadRequestException(`Estado inválido: ${status}`);
				}
				where.status = status as SaleStatus;
			}

			if (date) {
				if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
					throw new BadRequestException("Fecha inválida. Formato esperado: YYYY-MM-DD");
				}
				const start = new Date(date);
				if (Number.isNaN(start.getTime())) {
					throw new BadRequestException("Fecha inválida. Formato esperado: YYYY-MM-DD");
				}
				const end = new Date(start);
				end.setDate(end.getDate() + 1);
				where.createdAt = { gte: start, lt: end };
			}

			if (userId) {
				where.userId = userId;
			}
		}

		const sales = await this.prisma.sale.findMany({
			where,
			orderBy: { createdAt: "desc" },
			include: SALE_INCLUDE,
		});

		return sales.map(formatSale);
	}

	async findOne(id: string) {
		const sale = await this.prisma.sale.findUnique({
			where: { id },
			include: SALE_INCLUDE,
		});

		if (!sale) throw new NotFoundException("Venta no encontrada");

		return formatSale(sale);
	}

	async pay(id: string, userId: string, dto: PaySale) {
		const sale = await this.prisma.sale.findUnique({
			where: { id },
			include: { items: true },
		});

		if (!sale) throw new NotFoundException("Venta no encontrada");
		if (sale.status !== SaleStatus.OPEN) {
			throw new UnprocessableEntityException(`La venta ya está en estado: ${sale.status}`);
		}

		const productIds = sale.items.map((i) => i.productId);

		const recipes = await this.prisma.recipe.findMany({
			where: { productId: { in: productIds } },
			select: { productId: true, ingredientId: true, quantity: true },
		});

		await this.prisma.$transaction(async (tx) => {
			await tx.sale.update({
				where: { id },
				data: {
					status: PAYMENT_STATUS[dto.payment_method],
					updatedBy: userId,
				},
			});

			const stockDeltas = new Map<string, number>();
			for (const item of sale.items) {
				for (const r of recipes.filter((r) => r.productId === item.productId)) {
					const delta = item.quantity * Number(r.quantity);
					stockDeltas.set(r.ingredientId, (stockDeltas.get(r.ingredientId) ?? 0) + delta);
				}
			}

			for (const [ingredientId, delta] of stockDeltas) {
				await tx.ingredient.update({
					where: { id: ingredientId },
					data: { stock: { decrement: delta } },
				});
			}
		});

		return { id, status: PAYMENT_STATUS[dto.payment_method] };
	}

	async cancel(id: string, userId: string) {
		const sale = await this.prisma.sale.findUnique({ where: { id } });

		if (!sale) throw new NotFoundException("Venta no encontrada");
		if (sale.status !== SaleStatus.OPEN) {
			throw new UnprocessableEntityException(`La venta ya está en estado: ${sale.status}`);
		}

		await this.prisma.sale.update({
			where: { id },
			data: {
				status: SaleStatus.CANCELLED,
				cancelledBy: userId,
				cancelledAt: new Date(),
			},
		});

		return { id, status: SaleStatus.CANCELLED };
	}

	async correct(id: string, userId: string, dto: CorrectSale) {
		const sale = await this.prisma.sale.findUnique({
			where: { id },
			include: { items: true },
		});

		if (!sale) throw new NotFoundException("Venta no encontrada");
		if (sale.status === SaleStatus.CANCELLED) {
			throw new UnprocessableEntityException("No se puede corregir una venta cancelada");
		}

		await this.prisma.$transaction(async (tx) => {
			const updates: Record<string, unknown> = { updatedBy: userId };

			if (dto.items) {
				const productIds = dto.items.map((i) => i.product_id);
				const products = await tx.product.findMany({
					where: { id: { in: productIds }, isActive: true },
					select: { id: true, price: true },
				});

				const itemsData = dto.items.map((item) => {
					const product = products.find((p) => p.id === item.product_id);
					if (!product)
						throw new NotFoundException(`Producto no encontrado o inactivo: ${item.product_id}`);
					return {
						productId: item.product_id,
						quantity: item.quantity,
						unitPrice: product.price,
					};
				});

				const newTotal = itemsData.reduce(
					(acc, item) => acc + Number(item.unitPrice) * item.quantity,
					0,
				);

				await tx.saleItem.deleteMany({ where: { saleId: id } });
				await tx.saleItem.createMany({
					data: itemsData.map((item) => ({ ...item, saleId: id })),
				});

				updates.total = newTotal;
			}

			if (dto.payment_method) {
				updates.status = PAYMENT_STATUS[dto.payment_method];
			}

			await tx.sale.update({ where: { id }, data: updates });
		});

		const updated = await this.prisma.sale.findUnique({
			where: { id },
			include: SALE_INCLUDE,
		});

		if (!updated) throw new NotFoundException("Venta no encontrada");
		return formatSale(updated);
	}
}
