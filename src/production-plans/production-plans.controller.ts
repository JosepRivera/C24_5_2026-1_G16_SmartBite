import { Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "@/common/decorators/roles.decorator";
import { JwtGuard } from "@/common/guards/jwt.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Role } from "@/prisma/prisma.service";
import { SkipThrottle } from "@nestjs/throttler";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { ProductionPlansService } from "./production-plans.service";

@SkipThrottle()
@ApiTags("production-plans")
@ApiBearerAuth("access-token")
@UseGuards(JwtGuard, RolesGuard)
@Controller("production-plans")
export class ProductionPlansController {
	constructor(private readonly productionPlansService: ProductionPlansService) {}

	@Get("today")
	@Roles(Role.OWNER)
	@ApiOperation({ summary: "Obtener plan de producción del día" })
	@ApiResponse({ status: 200, description: "Plan de producción." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	@ApiResponse({ status: 404, description: "No hay plan para hoy." })
	getToday() {
		return this.productionPlansService.getToday();
	}

	@Post("regenerate")
	@HttpCode(200)
	@Roles(Role.OWNER)
	@ApiOperation({ summary: "Regenerar plan de producción manualmente" })
	@ApiResponse({ status: 200, description: "Plan regenerado." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	regenerate() {
		return this.productionPlansService.regenerate();
	}
}
