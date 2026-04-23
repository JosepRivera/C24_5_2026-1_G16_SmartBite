import {
	ConflictException,
	ForbiddenException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
	UnprocessableEntityException,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService, Role } from "@/prisma/prisma.service";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { SupabaseService } from "@/supabase/supabase.service";
import type { CreateUser } from "./dto/create-user.dto";
import type { UpdateUser } from "./dto/update-user.dto";

type RequestingUser = { sub: string; role: Role };

@Injectable()
export class UsersService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly supabase: SupabaseService,
	) {}

	async findAll() {
		return this.prisma.user.findMany();
	}

	async findOne(id: string, requestingUser: RequestingUser) {
		if (requestingUser.role !== "OWNER" && requestingUser.sub !== id) {
			throw new ForbiddenException("No tienes permiso para esta acción");
		}

		const user = await this.prisma.user.findUnique({ where: { id } });

		if (!user) throw new NotFoundException("Usuario no encontrado");

		return user;
	}

	async create(dto: CreateUser) {
		// Verificar username único antes de crear en Supabase
		const existing = await this.prisma.user.findUnique({
			where: { username: dto.username },
		});
		if (existing) throw new ConflictException("El username ya está en uso");

		// Crear en Supabase Auth — email sintético para app interna
		const email = `${dto.username}@smartbite.local`;
		const { data, error } = await this.supabase.admin.auth.admin.createUser({
			email,
			password: dto.password,
			email_confirm: true,
			app_metadata: { role: dto.role },
		});

		if (error || !data.user) {
			if (error?.message?.includes("already been registered")) {
				throw new ConflictException("El username ya está en uso");
			}
			throw new InternalServerErrorException(
				`Error creando usuario en Supabase: ${error?.message}`,
			);
		}

		// Crear perfil en nuestra BD con el mismo UUID que Supabase asignó
		return this.prisma.user.create({
			data: {
				id: data.user.id,
				name: dto.name,
				username: dto.username,
				role: dto.role,
			},
		});
	}

	async update(id: string, dto: UpdateUser, requestingUser: RequestingUser) {
		const user = await this.prisma.user.findUnique({ where: { id } });

		if (!user) throw new NotFoundException("Usuario no encontrado");

		if (requestingUser.role !== "OWNER") {
			if (requestingUser.sub !== id) {
				throw new ForbiddenException("No tienes permiso para esta acción");
			}

			const hasNonPasswordFields =
				dto.name !== undefined ||
				dto.username !== undefined ||
				dto.role !== undefined ||
				dto.is_active !== undefined;

			if (hasNonPasswordFields) {
				throw new ForbiddenException("Solo puedes cambiar tu contraseña");
			}

			if (!dto.password) {
				throw new ForbiddenException("Solo puedes cambiar tu contraseña");
			}

			// Cambio de contraseña via Supabase Admin
			const { error } = await this.supabase.admin.auth.admin.updateUserById(id, {
				password: dto.password,
			});
			if (error)
				throw new InternalServerErrorException(`Error actualizando contraseña: ${error.message}`);

			return this.prisma.user.findUnique({ where: { id } });
		}

		// OWNER: actualizar campos de perfil en Prisma
		const prismaData: {
			name?: string;
			username?: string;
			role?: Role;
			isActive?: boolean;
		} = {};

		if (dto.name !== undefined) prismaData.name = dto.name;

		if (dto.username !== undefined) {
			const taken = await this.prisma.user.findUnique({ where: { username: dto.username } });
			if (taken && taken.id !== id) throw new ConflictException("El username ya está en uso");
			prismaData.username = dto.username;
		}

		if (dto.role !== undefined) {
			prismaData.role = dto.role;
			// Sincronizar rol en Supabase app_metadata para que el JWT lo refleje
			await this.supabase.admin.auth.admin.updateUserById(id, {
				app_metadata: { role: dto.role },
			});
		}

		if (dto.is_active !== undefined) {
			prismaData.isActive = dto.is_active;
			// Sincronizar estado activo en Supabase para bloquear sesiones si se desactiva
			await this.supabase.admin.auth.admin.updateUserById(id, {
				ban_duration: dto.is_active ? "none" : "876000h",
			});
		}

		if (dto.password !== undefined) {
			const { error } = await this.supabase.admin.auth.admin.updateUserById(id, {
				password: dto.password,
			});
			if (error)
				throw new InternalServerErrorException(`Error actualizando contraseña: ${error.message}`);
		}

		return this.prisma.user.update({ where: { id }, data: prismaData });
	}

	async remove(id: string) {
		const user = await this.prisma.user.findUnique({ where: { id } });

		if (!user) throw new NotFoundException("Usuario no encontrado");

		if (user.role === "OWNER" && user.isActive) {
			const activeOwnerCount = await this.prisma.user.count({
				where: { role: "OWNER", isActive: true },
			});

			if (activeOwnerCount <= 1) {
				throw new UnprocessableEntityException("No se puede desactivar al único OWNER activo");
			}
		}

		// Bloquear en Supabase Auth e inhabilitar perfil local
		await this.supabase.admin.auth.admin.updateUserById(id, { ban_duration: "876000h" });

		return this.prisma.user.update({
			where: { id },
			data: { isActive: false },
		});
	}
}
