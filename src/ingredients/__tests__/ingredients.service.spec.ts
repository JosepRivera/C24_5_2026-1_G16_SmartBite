import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IngredientsService } from "../ingredients.service";

vi.mock("@/config/env", () => ({ env: {} }));

const mockIngredient = {
	id: "uuid-ingredient-1",
	name: "Carne de res",
	unit: "kg",
	stock: 10,
	minStock: 2,
	costPerUnit: 25.5,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockLowStockIngredient = {
	id: "uuid-ingredient-2",
	name: "Lechuga",
	unit: "kg",
	stock: 1,
	minStock: 2,
	costPerUnit: 3.0,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockPrisma = {
	ingredient: {
		findMany: vi.fn(),
		findUnique: vi.fn(),
		findFirst: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
	},
};

describe("IngredientsService", () => {
	let service: IngredientsService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new IngredientsService(mockPrisma as never);
	});

	// ──────────────────────────────────────────
	// findAll
	// ──────────────────────────────────────────

	describe("findAll()", () => {
		it("devuelve todos los insumos con is_low_stock calculado", async () => {
			mockPrisma.ingredient.findMany.mockResolvedValue([mockIngredient, mockLowStockIngredient]);

			const result = await service.findAll(false);

			expect(result).toHaveLength(2);
			expect(result[0].is_low_stock).toBe(false); // stock 10 > minStock 2
			expect(result[1].is_low_stock).toBe(true); // stock 1 <= minStock 2
		});

		it("is_low_stock = true cuando stock === minStock (en el límite)", async () => {
			const exactLimit = { ...mockIngredient, stock: 2, minStock: 2 };
			mockPrisma.ingredient.findMany.mockResolvedValue([exactLimit]);

			const result = await service.findAll(false);

			expect(result[0].is_low_stock).toBe(true);
		});

		// U-ING-1: getLowStock() filtra correctamente
		it("lowStock=true devuelve solo los que están bajo el umbral mínimo", async () => {
			mockPrisma.ingredient.findMany.mockResolvedValue([mockIngredient, mockLowStockIngredient]);

			const result = await service.findAll(true);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("uuid-ingredient-2");
			expect(result[0].is_low_stock).toBe(true);
		});

		it("lowStock=false devuelve todos los insumos", async () => {
			mockPrisma.ingredient.findMany.mockResolvedValue([mockIngredient, mockLowStockIngredient]);

			const result = await service.findAll(false);

			expect(result).toHaveLength(2);
		});
	});

	// ──────────────────────────────────────────
	// findOne
	// ──────────────────────────────────────────

	describe("findOne()", () => {
		it("devuelve el insumo con is_low_stock calculado", async () => {
			mockPrisma.ingredient.findUnique.mockResolvedValue(mockIngredient);

			const result = await service.findOne("uuid-ingredient-1");

			expect(result).toMatchObject({ id: "uuid-ingredient-1", is_low_stock: false });
		});

		it("lanza 404 cuando no existe", async () => {
			mockPrisma.ingredient.findUnique.mockResolvedValue(null);

			await expect(service.findOne("uuid-inexistente")).rejects.toThrow(NotFoundException);
		});
	});

	// ──────────────────────────────────────────
	// create
	// ──────────────────────────────────────────

	describe("create()", () => {
		it("crea el insumo y devuelve el nuevo registro con is_low_stock", async () => {
			mockPrisma.ingredient.findFirst.mockResolvedValue(null);
			mockPrisma.ingredient.create.mockResolvedValue(mockIngredient);

			const result = await service.create({
				name: "Carne de res",
				unit: "kg",
				stock: 10,
				min_stock: 2,
				cost_per_unit: 25.5,
			});

			expect(mockPrisma.ingredient.create).toHaveBeenCalledWith({
				data: {
					name: "Carne de res",
					unit: "kg",
					stock: 10,
					minStock: 2,
					costPerUnit: 25.5,
				},
			});
			expect(result).toMatchObject({ id: "uuid-ingredient-1", is_low_stock: false });
		});

		it("lanza 409 cuando el nombre ya existe", async () => {
			mockPrisma.ingredient.findFirst.mockResolvedValue(mockIngredient);

			await expect(
				service.create({
					name: "Carne de res",
					unit: "kg",
					stock: 10,
					min_stock: 2,
					cost_per_unit: 0,
				}),
			).rejects.toThrow(ConflictException);
		});
	});

	// ──────────────────────────────────────────
	// update
	// ──────────────────────────────────────────

	describe("update()", () => {
		it("actualiza los campos provistos y devuelve is_low_stock recalculado", async () => {
			mockPrisma.ingredient.findUnique.mockResolvedValue(mockIngredient);
			mockPrisma.ingredient.findFirst.mockResolvedValue(null);
			mockPrisma.ingredient.update.mockResolvedValue({ ...mockIngredient, stock: 1 });

			const result = await service.update("uuid-ingredient-1", { stock: 1 });

			expect(mockPrisma.ingredient.update).toHaveBeenCalledWith({
				where: { id: "uuid-ingredient-1" },
				data: { stock: 1 },
			});
			expect(result.is_low_stock).toBe(true); // stock 1 <= minStock 2
		});

		it("lanza 404 cuando el insumo no existe", async () => {
			mockPrisma.ingredient.findUnique.mockResolvedValue(null);

			await expect(service.update("uuid-inexistente", { stock: 5 })).rejects.toThrow(
				NotFoundException,
			);
		});

		// U-ING-2: updateStock() no permite negativo
		it("lanza 400 cuando el stock nuevo es negativo", async () => {
			mockPrisma.ingredient.findUnique.mockResolvedValue(mockIngredient);

			await expect(service.update("uuid-ingredient-1", { stock: -1 })).rejects.toThrow(
				BadRequestException,
			);
		});

		it("lanza 409 cuando el nombre nuevo ya lo tiene otro insumo", async () => {
			mockPrisma.ingredient.findUnique.mockResolvedValue(mockIngredient);
			mockPrisma.ingredient.findFirst.mockResolvedValue({ id: "otro-uuid", name: "Tomate" });

			await expect(service.update("uuid-ingredient-1", { name: "Tomate" })).rejects.toThrow(
				ConflictException,
			);
		});

		it("no verifica conflicto de nombre si el nombre no cambia", async () => {
			mockPrisma.ingredient.findUnique.mockResolvedValue(mockIngredient);
			mockPrisma.ingredient.update.mockResolvedValue(mockIngredient);

			await service.update("uuid-ingredient-1", { name: mockIngredient.name });

			expect(mockPrisma.ingredient.findFirst).not.toHaveBeenCalled();
		});
	});
});
