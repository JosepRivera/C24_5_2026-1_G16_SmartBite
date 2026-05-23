import {
	Body,
	Controller,
	ForbiddenException,
	Get,
	HttpCode,
	Param,
	ParseUUIDPipe,
	Patch,
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
import { DateParamPipe } from "@/common/pipes/date-param.pipe";
import { Role } from "@/prisma/prisma.service";
// biome-ignore lint/style/useImportType: required for nestjs-zod ZodValidationPipe runtime metatype
import { CorrectSaleDto } from "./dto/correct-sale.dto";
// biome-ignore lint/style/useImportType: required for nestjs-zod ZodValidationPipe runtime metatype
import { CreateSaleDto } from "./dto/create-sale.dto";
// biome-ignore lint/style/useImportType: required for nestjs-zod ZodValidationPipe runtime metatype
import { PaySaleDto } from "./dto/pay-sale.dto";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { SalesService } from "./sales.service";

@SkipThrottle()
@ApiTags("sales")
@ApiBearerAuth("access-token")
@UseGuards(JwtGuard, RolesGuard)
@Controller("sales")
export class SalesController {
	constructor(private readonly salesService: SalesService) {}

	@Post()
	@Roles(Role.OWNER, Role.CASHIER, Role.WAITER)
	@ApiOperation({
		summary: "Crear venta",
		description: "Registra una nueva venta con sus ítems. Queda en estado OPEN hasta ser cobrada.",
	})
	@ApiResponse({ status: 201, description: "Venta creada." })
	@ApiResponse({ status: 400, description: "Validación fallida." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	@ApiResponse({ status: 404, description: "Producto no encontrado o inactivo." })
	create(@CurrentUser() user: { sub: string }, @Body() dto: CreateSaleDto) {
		return this.salesService.create(user.sub, dto);
	}

	@Get()
	@Roles(Role.OWNER, Role.CASHIER, Role.WAITER, Role.COOK)
	@ApiOperation({
		summary: "Listar ventas",
		description:
			"Lista ventas. OWNER: filtros completos (status, date, user_id). Otros roles: solo órdenes OPEN del día.",
	})
	@ApiQuery({
		name: "status",
		required: false,
		enum: ["OPEN", "PAID_CASH", "PAID_YAPE", "PAID_PLIN", "PAID_AGORA", "CANCELLED"],
		description: "Solo aplica para OWNER",
	})
	@ApiQuery({ name: "date", required: false, description: "YYYY-MM-DD. Solo aplica para OWNER." })
	@ApiQuery({
		name: "user_id",
		required: false,
		description: "UUID del empleado. Solo aplica para OWNER.",
	})
	@ApiResponse({ status: 200, description: "Lista de ventas." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	findAll(
		@CurrentUser() user: { sub: string; role: string },
		@Query("status") status?: string,
		@Query("date", new DateParamPipe()) date?: Date,
		@Query("user_id") userId?: string,
	) {
		return this.salesService.findAll(user.role, status, date, userId);
	}

	@Get(":id")
	@Roles(Role.OWNER, Role.CASHIER, Role.WAITER, Role.COOK)
	@ApiOperation({ summary: "Obtener venta por ID" })
	@ApiResponse({ status: 200, description: "Venta encontrada." })
	@ApiResponse({ status: 400, description: "UUID mal formado." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 404, description: "Venta no encontrada." })
	findOne(@Param("id", ParseUUIDPipe) id: string) {
		return this.salesService.findOne(id);
	}

	@Post(":id/payments")
	@HttpCode(201)
	@Roles(Role.OWNER, Role.CASHIER)
	@ApiOperation({
		summary: "Registrar pago de venta",
		description:
			"Crea el pago de la venta y descuenta el stock de insumos según las recetas. Operación atómica.",
	})
	@ApiResponse({ status: 201, description: "Pago registrado." })
	@ApiResponse({ status: 400, description: "UUID mal formado o validación fallida." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	@ApiResponse({ status: 404, description: "Venta no encontrada." })
	@ApiResponse({ status: 422, description: "La venta no está en estado OPEN." })
	pay(
		@Param("id", ParseUUIDPipe) id: string,
		@CurrentUser() user: { sub: string },
		@Body() dto: PaySaleDto,
	) {
		return this.salesService.pay(id, user.sub, dto);
	}

	@Patch(":id")
	@Roles(Role.OWNER, Role.CASHIER)
	@ApiOperation({
		summary: "Corregir o cancelar venta",
		description:
			"Con { status: 'CANCELLED' }: cancela la venta (OWNER y CASHIER). Sin status: corrige ítems o método de pago (solo OWNER). No revierte stock.",
	})
	@ApiResponse({ status: 200, description: "Venta actualizada." })
	@ApiResponse({ status: 400, description: "UUID mal formado o validación fallida." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	@ApiResponse({ status: 404, description: "Venta no encontrada." })
	@ApiResponse({ status: 422, description: "La venta no está en estado OPEN o está cancelada." })
	correct(
		@Param("id", ParseUUIDPipe) id: string,
		@CurrentUser() user: { sub: string; role: string },
		@Body() dto: CorrectSaleDto,
	) {
		if (dto.status === "CANCELLED") {
			return this.salesService.cancel(id, user.sub);
		}
		// Correction (items/payment_method update) is OWNER-only
		if (user.role !== Role.OWNER) {
			throw new ForbiddenException("Solo el OWNER puede corregir ventas");
		}
		return this.salesService.correct(id, user.sub, dto);
	}
}
