import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "@/common/decorators/roles.decorator";
import { JwtGuard } from "@/common/guards/jwt.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Role } from "@/prisma/prisma.service";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { MrpService } from "./mrp.service";

@ApiTags("mrp")
@ApiBearerAuth("access-token")
@UseGuards(JwtGuard, RolesGuard)
@Controller("mrp")
export class MrpController {
	constructor(private readonly mrpService: MrpService) {}

	@Get()
	@Roles(Role.OWNER)
	@ApiOperation({ summary: "Calcular necesidades de insumos (MRP) para los próximos N días" })
	@ApiQuery({ name: "days", required: false, description: "Días a proyectar (default: 7)" })
	@ApiResponse({ status: 200, description: "Lista de insumos a pedir." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	computeMrp(@Query("days", new DefaultValuePipe(7), ParseIntPipe) days: number) {
		return this.mrpService.computeMrp(days);
	}
}
