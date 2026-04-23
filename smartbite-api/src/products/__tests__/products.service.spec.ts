import { ConflictException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductsService } from "../products.service";

vi.mock("@/config/env", () => ({ env: {} }));

const mockProduct = {
	id: "uuid-product-1",
	name: "Hamburguesa Clásica",
	price: 15.5,
	category: "hamburguesas",
	isActive: true,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockPrisma = {
	product: {
		findMany: vi.fn(),
		findUnique: vi.fn(),
		findFirst: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
	},
	saleItem: {
		findFirst: vi.fn(),
	},
};

describe("ProductsService", () => {
	let service: ProductsService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new ProductsService(mockPrisma as never);
	});

	// ──────────────────────────────────────────
	// findAll
	// ──────────────────────────────────────────

	describe("findAll()", () => {
		it("devuelve productos activos por defecto", async () => {
			mockPrisma.product.findMany.mockResolvedValue([mockProduct]);

			const result = await service.findAll(false);

			expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
				expect.objectContaining({ where: { isActive: true } }),
			);
			expect(result).toEqual([mockProduct]);
		});

		it("incluye inactivos cuando includeInactive=true", async () => {
			mockPrisma.product.findMany.mockResolvedValue([mockProduct]);

			await service.findAll(true);

			expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
				expect.objectContaining({ where: {} }),
			);
		});

		it("filtra por categoría cuando se provee", async () => {
			mockPrisma.product.findMany.mockResolvedValue([mockProduct]);

			await service.findAll(false, "hamburguesas");

			expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { isActive: true, category: "hamburguesas" },
				}),
			);
		});

		it("devuelve resultado desde caché en la segunda llamada", async () => {
			mockPrisma.product.findMany.mockResolvedValue([mockProduct]);

			await service.findAll(false);
			await service.findAll(false);

			expect(mockPrisma.product.findMany).toHaveBeenCalledTimes(1);
		});

		it("cachés distintos para claves distintas", async () => {
			mockPrisma.product.findMany.mockResolvedValue([mockProduct]);

			await service.findAll(false);
			await service.findAll(true);

			expect(mockPrisma.product.findMany).toHaveBeenCalledTimes(2);
		});
	});

	// ──────────────────────────────────────────
	// findOne
	// ──────────────────────────────────────────

	describe("findOne()", () => {
		it("devuelve el producto cuando existe", async () => {
			mockPrisma.product.findUnique.mockResolvedValue(mockProduct);

			const result = await service.findOne("uuid-product-1");

			expect(result).toEqual(mockProduct);
		});

		it("lanza 404 cuando no existe", async () => {
			mockPrisma.product.findUnique.mockResolvedValue(null);

			await expect(service.findOne("uuid-inexistente")).rejects.toThrow(NotFoundException);
		});
	});

	// ──────────────────────────────────────────
	// create
	// ──────────────────────────────────────────

	describe("create()", () => {
		it("crea el producto y devuelve el nuevo registro", async () => {
			mockPrisma.product.findFirst.mockResolvedValue(null);
			mockPrisma.product.create.mockResolvedValue(mockProduct);

			const result = await service.create({
				name: "Hamburguesa Clásica",
				price: 15.5,
				category: "hamburguesas",
			});

			expect(mockPrisma.product.create).toHaveBeenCalledWith({
				data: { name: "Hamburguesa Clásica", price: 15.5, category: "hamburguesas" },
			});
			expect(result).toEqual(mockProduct);
		});

		it("lanza 409 cuando el nombre ya existe", async () => {
			mockPrisma.product.findFirst.mockResolvedValue(mockProduct);

			await expect(
				service.create({ name: "Hamburguesa Clásica", price: 15.5, category: "hamburguesas" }),
			).rejects.toThrow(ConflictException);
		});

		it("invalida la caché tras crear", async () => {
			mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
			mockPrisma.product.findFirst.mockResolvedValue(null);
			mockPrisma.product.create.mockResolvedValue(mockProduct);

			await service.findAll(false);
			await service.create({ name: "Nuevo", price: 10, category: "bebidas" });
			await service.findAll(false);

			expect(mockPrisma.product.findMany).toHaveBeenCalledTimes(2);
		});
	});

	// ──────────────────────────────────────────
	// update
	// ──────────────────────────────────────────

	describe("update()", () => {
		it("actualiza los campos provistos", async () => {
			mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
			mockPrisma.product.findFirst.mockResolvedValue(null);
			mockPrisma.product.update.mockResolvedValue({ ...mockProduct, price: 18 });

			const result = await service.update("uuid-product-1", { price: 18 });

			expect(mockPrisma.product.update).toHaveBeenCalledWith({
				where: { id: "uuid-product-1" },
				data: { price: 18 },
			});
			expect(result.price).toBe(18);
		});

		it("lanza 404 cuando el producto no existe", async () => {
			mockPrisma.product.findUnique.mockResolvedValue(null);

			await expect(service.update("uuid-inexistente", { price: 18 })).rejects.toThrow(
				NotFoundException,
			);
		});

		it("lanza 409 cuando el nombre nuevo ya lo tiene otro producto", async () => {
			mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
			mockPrisma.product.findFirst.mockResolvedValue({ id: "otro-uuid", name: "Doble Carne" });

			await expect(service.update("uuid-product-1", { name: "Doble Carne" })).rejects.toThrow(
				ConflictException,
			);
		});

		it("no verifica conflicto de nombre si el nombre no cambia", async () => {
			mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
			mockPrisma.product.update.mockResolvedValue(mockProduct);

			await service.update("uuid-product-1", { name: mockProduct.name });

			expect(mockPrisma.product.findFirst).not.toHaveBeenCalled();
		});
	});

	// ──────────────────────────────────────────
	// deactivate
	// ──────────────────────────────────────────

	describe("deactivate()", () => {
		it("desactiva el producto correctamente", async () => {
			mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
			mockPrisma.saleItem.findFirst.mockResolvedValue(null);
			mockPrisma.product.update.mockResolvedValue({ ...mockProduct, isActive: false });

			const result = await service.deactivate("uuid-product-1");

			expect(mockPrisma.product.update).toHaveBeenCalledWith({
				where: { id: "uuid-product-1" },
				data: { isActive: false },
			});
			expect(result.isActive).toBe(false);
		});

		it("lanza 404 cuando el producto no existe", async () => {
			mockPrisma.product.findUnique.mockResolvedValue(null);

			await expect(service.deactivate("uuid-inexistente")).rejects.toThrow(NotFoundException);
		});

		it("lanza 422 cuando hay órdenes abiertas", async () => {
			mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
			mockPrisma.saleItem.findFirst.mockResolvedValue({ id: "item-uuid" });

			await expect(service.deactivate("uuid-product-1")).rejects.toThrow(
				UnprocessableEntityException,
			);
		});
	});
});
