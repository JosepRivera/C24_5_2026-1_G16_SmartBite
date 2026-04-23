import {
	ConflictException,
	ForbiddenException,
	NotFoundException,
	UnprocessableEntityException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UsersService } from "../users.service";

vi.mock("@/config/env", () => ({
	env: {
		SUPABASE_URL: "https://test.supabase.co",
		SUPABASE_SERVICE_ROLE_KEY: "test-key",
	},
}));

const mockPrisma = {
	user: {
		findUnique: vi.fn(),
		findMany: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		count: vi.fn(),
	},
};

const mockSupabaseAdmin = {
	auth: {
		admin: {
			createUser: vi.fn(),
			updateUserById: vi.fn(),
		},
	},
};

const mockSupabase = { admin: mockSupabaseAdmin };

const ownerUser = { sub: "owner-id", role: "OWNER" as const };
const cashierUser = { sub: "cashier-id", role: "CASHIER" as const };

describe("UsersService", () => {
	let service: UsersService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new UsersService(mockPrisma as never, mockSupabase as never);
	});

	describe("create()", () => {
		it("crea usuario en Supabase Auth y luego el perfil en DB", async () => {
			mockPrisma.user.findUnique.mockResolvedValue(null);
			mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
				data: { user: { id: "supabase-uuid" } },
				error: null,
			});
			mockPrisma.user.create.mockResolvedValue({ id: "supabase-uuid", name: "Empleado Test" });

			await service.create({
				name: "Empleado Test",
				username: "empleado01",
				password: "plain123",
				role: "CASHIER",
			});

			expect(mockSupabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith(
				expect.objectContaining({
					email: "empleado01@smartbite.local",
					password: "plain123",
					email_confirm: true,
					app_metadata: { role: "CASHIER" },
				}),
			);
			expect(mockPrisma.user.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ id: "supabase-uuid", username: "empleado01" }),
				}),
			);
		});

		it("username ya existe → 409 antes de llamar a Supabase", async () => {
			mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });

			await expect(
				service.create({ name: "Test", username: "yaexiste", password: "pass123", role: "WAITER" }),
			).rejects.toThrow(ConflictException);

			expect(mockSupabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
		});
	});

	describe("findOne()", () => {
		it("OWNER puede ver cualquier usuario", async () => {
			mockPrisma.user.findUnique.mockResolvedValue({ id: "other-id", name: "Alguien" });

			const result = await service.findOne("other-id", ownerUser);

			expect(result).toHaveProperty("id", "other-id");
		});

		it("no-OWNER puede ver su propio perfil", async () => {
			mockPrisma.user.findUnique.mockResolvedValue({ id: "cashier-id", name: "Cajero" });

			const result = await service.findOne("cashier-id", cashierUser);

			expect(result).toHaveProperty("id", "cashier-id");
		});

		it("no-OWNER intenta ver perfil ajeno → 403", async () => {
			await expect(service.findOne("otro-id", cashierUser)).rejects.toThrow(ForbiddenException);
		});

		it("usuario no existe → 404", async () => {
			mockPrisma.user.findUnique.mockResolvedValue(null);

			await expect(service.findOne("no-existe", ownerUser)).rejects.toThrow(NotFoundException);
		});
	});

	describe("update()", () => {
		it("no-OWNER puede cambiar su propia contraseña via Supabase Admin", async () => {
			mockPrisma.user.findUnique.mockResolvedValue({ id: "cashier-id", role: "CASHIER" });
			mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({ error: null });
			mockPrisma.user.findUnique.mockResolvedValue({ id: "cashier-id" });

			await service.update("cashier-id", { password: "nueva123" }, cashierUser);

			expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith("cashier-id", {
				password: "nueva123",
			});
		});

		it("no-OWNER intenta cambiar perfil ajeno → 403", async () => {
			mockPrisma.user.findUnique.mockResolvedValue({ id: "otro-id" });

			await expect(
				service.update("otro-id", { password: "nueva123" }, cashierUser),
			).rejects.toThrow(ForbiddenException);
		});

		it("no-OWNER intenta cambiar campos restringidos → 403", async () => {
			mockPrisma.user.findUnique.mockResolvedValue({ id: "cashier-id" });

			await expect(
				service.update("cashier-id", { name: "Nuevo Nombre" }, cashierUser),
			).rejects.toThrow(ForbiddenException);
		});

		it("OWNER puede cambiar nombre y username via Prisma", async () => {
			mockPrisma.user.findUnique.mockResolvedValueOnce({ id: "cashier-id" });
			mockPrisma.user.findUnique.mockResolvedValueOnce(null); // username disponible
			mockPrisma.user.update.mockResolvedValue({ id: "cashier-id", name: "Nuevo" });

			await service.update("cashier-id", { name: "Nuevo", username: "nuevo01" }, ownerUser);

			expect(mockPrisma.user.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ name: "Nuevo", username: "nuevo01" }),
				}),
			);
		});

		it("OWNER cambia el rol → actualiza Prisma y Supabase app_metadata", async () => {
			mockPrisma.user.findUnique.mockResolvedValue({ id: "cashier-id" });
			mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({ error: null });
			mockPrisma.user.update.mockResolvedValue({ id: "cashier-id" });

			await service.update("cashier-id", { role: "WAITER" }, ownerUser);

			expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith("cashier-id", {
				app_metadata: { role: "WAITER" },
			});
		});
	});

	describe("remove()", () => {
		it("desactiva al usuario en Prisma y lo banea en Supabase", async () => {
			mockPrisma.user.findUnique.mockResolvedValue({
				id: "cashier-id",
				role: "CASHIER",
				isActive: true,
			});
			mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({ error: null });
			mockPrisma.user.update.mockResolvedValue({ id: "cashier-id", isActive: false });

			await service.remove("cashier-id");

			expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith("cashier-id", {
				ban_duration: "876000h",
			});
			expect(mockPrisma.user.update).toHaveBeenCalledWith({
				where: { id: "cashier-id" },
				data: { isActive: false },
			});
		});

		it("único OWNER activo → 422", async () => {
			mockPrisma.user.findUnique.mockResolvedValue({
				id: "owner-id",
				role: "OWNER",
				isActive: true,
			});
			mockPrisma.user.count.mockResolvedValue(1);

			await expect(service.remove("owner-id")).rejects.toThrow(UnprocessableEntityException);
		});

		it("usuario no existe → 404", async () => {
			mockPrisma.user.findUnique.mockResolvedValue(null);

			await expect(service.remove("no-existe")).rejects.toThrow(NotFoundException);
		});
	});
});
