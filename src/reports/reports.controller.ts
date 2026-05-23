import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { Roles } from "@/common/decorators/roles.decorator";
import { JwtGuard } from "@/common/guards/jwt.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { DateParamPipe } from "@/common/pipes/date-param.pipe";
import { Role } from "@/prisma/prisma.service";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { ReportsService } from "./reports.service";

@SkipThrottle()
@ApiTags("reports")
@ApiBearerAuth("access-token")
@UseGuards(JwtGuard, RolesGuard)
@Roles(Role.OWNER)
@Controller("reports")
export class ReportsController {
	constructor(private readonly reportsService: ReportsService) {}

	@Get("periods")
	@ApiOperation({ summary: "Ventas agrupadas por período" })
	@ApiQuery({ name: "from", required: true, description: "Fecha inicio YYYY-MM-DD" })
	@ApiQuery({ name: "to", required: true, description: "Fecha fin YYYY-MM-DD" })
	@ApiQuery({ name: "groupBy", required: false, enum: ["day", "week", "month"] })
	@ApiQuery({ name: "user_id", required: false, description: "Filtrar por empleado (UUID)" })
	@ApiResponse({ status: 200, description: "Reporte por período." })
	@ApiResponse({ status: 400, description: "Fechas inválidas o faltantes." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	getByPeriod(
		@Query("from", new DateParamPipe()) from: Date,
		@Query("to", new DateParamPipe()) to: Date,
		@Query("groupBy") groupBy?: "day" | "week" | "month",
		@Query("user_id") userId?: string,
	) {
		return this.reportsService.getByPeriod(from, to, groupBy, userId);
	}

	@Get("profitability")
	@ApiOperation({ summary: "Rentabilidad por producto" })
	@ApiResponse({ status: 200, description: "Rentabilidad ordenada de mayor a menor margen." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	getProfitability() {
		return this.reportsService.getProfitability();
	}
}
