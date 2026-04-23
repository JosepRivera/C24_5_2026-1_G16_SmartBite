import {
	Body,
	Controller,
	Get,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CurrentDevice } from "@/common/decorators/current-device.decorator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { ApiKeyGuard } from "@/common/guards/api-key.guard";
import { JwtGuard } from "@/common/guards/jwt.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Role } from "@/prisma/prisma.service";
// biome-ignore lint/style/useImportType: required for nestjs-zod ZodValidationPipe runtime metatype
import { CreatePaymentNotificationDto } from "./dto/create-payment-notification.dto";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PaymentsService } from "./payments.service";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
	constructor(private readonly paymentsService: PaymentsService) {}

	@Post("notifications")
	@UseGuards(ApiKeyGuard)
	@ApiHeader({ name: "X-API-Key", required: true, description: "API key del dispositivo" })
	@ApiOperation({ summary: "Registrar notificación de pago (desde dispositivo)" })
	@ApiResponse({ status: 201, description: "Notificación registrada." })
	@ApiResponse({ status: 401, description: "API key inválida." })
	@ApiResponse({ status: 429, description: "Rate limit excedido." })
	createNotification(
		@CurrentDevice() device: { id: string },
		@Body() dto: CreatePaymentNotificationDto,
	) {
		return this.paymentsService.createNotification(device.id, dto);
	}

	@Get("notifications")
	@ApiBearerAuth("access-token")
	@UseGuards(JwtGuard, RolesGuard)
	@Roles(Role.OWNER)
	@ApiOperation({ summary: "Listar notificaciones de pago" })
	@ApiResponse({ status: 200, description: "Lista de notificaciones." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	findAll() {
		return this.paymentsService.findAll();
	}

	@Patch("notifications/:id/review")
	@ApiBearerAuth("access-token")
	@UseGuards(JwtGuard, RolesGuard)
	@Roles(Role.OWNER)
	@ApiOperation({ summary: "Marcar notificación como revisada" })
	@ApiResponse({ status: 200, description: "Notificación revisada." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	@ApiResponse({ status: 404, description: "Notificación no encontrada." })
	review(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: { sub: string }) {
		return this.paymentsService.review(id, user.sub);
	}
}
