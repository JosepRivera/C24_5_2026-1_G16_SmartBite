import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "@/common/decorators/roles.decorator";
import { JwtGuard } from "@/common/guards/jwt.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Role } from "@/prisma/prisma.service";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { DashboardService } from "./dashboard.service";

@ApiTags("dashboard")
@ApiBearerAuth("access-token")
@UseGuards(JwtGuard, RolesGuard)
@Controller("dashboard")
export class DashboardController {
	constructor(private readonly dashboardService: DashboardService) {}

	@Get()
	@Roles(Role.OWNER)
	@ApiOperation({ summary: "Resumen del día en tiempo real" })
	@ApiQuery({ name: "date", required: false, description: "Fecha YYYY-MM-DD (dev only — default: hoy)" })
	@ApiResponse({ status: 200, description: "Resumen del día." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	getDailySummary(@Query("date") date?: string) {
		return this.dashboardService.getDailySummary(date);
	}
}
