import {
	Controller,
	Get,
	HttpCode,
	Param,
	ParseIntPipe,
	ParseUUIDPipe,
	Post,
	Query,
	UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { JwtGuard } from "@/common/guards/jwt.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Role } from "@/prisma/prisma.service";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { CashClosesService } from "./cash-closes.service";

@SkipThrottle()
@ApiTags("cash-closes")
@ApiBearerAuth("access-token")
@UseGuards(JwtGuard, RolesGuard)
@Roles(Role.OWNER)
@Controller("cash-closes")
export class CashClosesController {
	constructor(private readonly cashClosesService: CashClosesService) {}

	@Post()
	@HttpCode(201)
	@ApiOperation({ summary: "Generar cierre de caja del día" })
	@ApiResponse({ status: 201, description: "Cierre generado." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	@ApiResponse({ status: 409, description: "Ya existe un cierre para hoy." })
	create(@CurrentUser() user: { sub: string }) {
		return this.cashClosesService.create(user.sub);
	}

	@Get()
	@ApiOperation({ summary: "Listar cierres de caja" })
	@ApiQuery({ name: "from", required: false, description: "Fecha inicio YYYY-MM-DD" })
	@ApiQuery({ name: "to", required: false, description: "Fecha fin YYYY-MM-DD" })
	@ApiQuery({ name: "page", required: false, description: "Página (default: 1)" })
	@ApiQuery({ name: "limit", required: false, description: "Registros por página (default: 20)" })
	@ApiResponse({ status: 200, description: "Lista de cierres." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	findAll(
		@Query("from") from?: string,
		@Query("to") to?: string,
		@Query("page", new ParseIntPipe({ optional: true })) page?: number,
		@Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
	) {
		return this.cashClosesService.findAll(from, to, page, limit);
	}

	@Get(":id")
	@ApiOperation({ summary: "Obtener cierre por ID" })
	@ApiResponse({ status: 200, description: "Cierre encontrado." })
	@ApiResponse({ status: 400, description: "UUID mal formado." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	@ApiResponse({ status: 404, description: "Cierre no encontrado." })
	findOne(@Param("id", ParseUUIDPipe) id: string) {
		return this.cashClosesService.findOne(id);
	}
}
