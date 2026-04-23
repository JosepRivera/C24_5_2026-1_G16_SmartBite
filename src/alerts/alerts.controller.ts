import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "@/common/decorators/roles.decorator";
import { JwtGuard } from "@/common/guards/jwt.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Role } from "@/prisma/prisma.service";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { AlertsService } from "./alerts.service";

@ApiTags("alerts")
@ApiBearerAuth("access-token")
@UseGuards(JwtGuard, RolesGuard)
@Roles(Role.OWNER, Role.CASHIER, Role.WAITER, Role.COOK)
@Controller("alerts")
export class AlertsController {
	constructor(private readonly alertsService: AlertsService) {}

	@Get("stock")
	@ApiOperation({
		summary: "Alertas de stock bajo",
		description:
			"Insumos cuyo stock actual es igual o menor al umbral mínimo. Incluye el déficit (shortage).",
	})
	@ApiResponse({ status: 200, description: "Lista de alertas de stock bajo." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	getLowStock() {
		return this.alertsService.getLowStock();
	}
}
