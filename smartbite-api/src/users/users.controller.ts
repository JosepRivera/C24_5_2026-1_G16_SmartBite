import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { JwtGuard } from "@/common/guards/jwt.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { Role } from "@/prisma/prisma.service";
// biome-ignore lint/style/useImportType: required for nestjs-zod ZodValidationPipe runtime metatype
import { CreateUserDto } from "./dto/create-user.dto";
// biome-ignore lint/style/useImportType: required for nestjs-zod ZodValidationPipe runtime metatype
import { UpdateUserDto } from "./dto/update-user.dto";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { UsersService } from "./users.service";

@ApiTags("users")
@Controller("users")
@UseGuards(JwtGuard, RolesGuard)
@ApiBearerAuth("access-token")
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get()
	@Roles("OWNER")
	@ApiOperation({
		summary: "Listar empleados",
		description: "Devuelve todos los usuarios del sistema incluyendo desactivados. Solo OWNER.",
	})
	@ApiResponse({ status: 200, description: "Lista de usuarios devuelta correctamente." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso (requiere OWNER)." })
	findAll() {
		return this.usersService.findAll();
	}

	@Post()
	@Roles("OWNER")
	@ApiOperation({
		summary: "Crear empleado",
		description: "Crea una cuenta de empleado. No existe registro público. Solo OWNER.",
	})
	@ApiResponse({ status: 201, description: "Empleado creado correctamente." })
	@ApiResponse({ status: 400, description: "Validación fallida." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso (requiere OWNER)." })
	@ApiResponse({ status: 409, description: "El username ya está en uso." })
	create(@Body() dto: CreateUserDto) {
		return this.usersService.create(dto);
	}

	@Get(":id")
	@ApiOperation({
		summary: "Obtener empleado por ID",
		description: "OWNER puede ver cualquier perfil. Otros roles solo pueden ver el suyo propio.",
	})
	@ApiParam({ name: "id", description: "UUID del usuario", format: "uuid" })
	@ApiResponse({ status: 200, description: "Usuario encontrado." })
	@ApiResponse({ status: 400, description: "UUID mal formado." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Acceso a perfil ajeno." })
	@ApiResponse({ status: 404, description: "Usuario no encontrado." })
	findOne(
		@Param("id", ParseUUIDPipe) id: string,
		@CurrentUser() user: { sub: string; role: Role },
	) {
		return this.usersService.findOne(id, user);
	}

	@Patch(":id")
	@HttpCode(200)
	@ApiOperation({
		summary: "Editar empleado",
		description:
			"OWNER puede editar todos los campos. Otros roles solo pueden cambiar su propia contraseña.",
	})
	@ApiParam({ name: "id", description: "UUID del usuario", format: "uuid" })
	@ApiResponse({ status: 200, description: "Usuario actualizado correctamente." })
	@ApiResponse({ status: 400, description: "UUID mal formado o validación fallida." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Sin permiso o intento de editar campos restringidos." })
	@ApiResponse({ status: 404, description: "Usuario no encontrado." })
	@ApiResponse({ status: 409, description: "El username ya está en uso." })
	update(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() dto: UpdateUserDto,
		@CurrentUser() user: { sub: string; role: Role },
	) {
		return this.usersService.update(id, dto, user);
	}

	@Delete(":id")
	@Roles("OWNER")
	@ApiOperation({
		summary: "Desactivar empleado",
		description: "Soft delete: marca isActive = false. El historial se conserva. Solo OWNER.",
	})
	@ApiParam({ name: "id", description: "UUID del usuario", format: "uuid" })
	@ApiResponse({ status: 200, description: "Empleado desactivado correctamente." })
	@ApiResponse({ status: 400, description: "UUID mal formado." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso (requiere OWNER)." })
	@ApiResponse({ status: 404, description: "Usuario no encontrado." })
	@ApiResponse({ status: 422, description: "No se puede desactivar al único OWNER activo." })
	remove(@Param("id", ParseUUIDPipe) id: string) {
		return this.usersService.remove(id);
	}
}
