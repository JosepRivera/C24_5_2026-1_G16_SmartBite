import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	ParseUUIDPipe,
	Post,
	Query,
	UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { JwtGuard } from "@/common/guards/jwt.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Role } from "@/prisma/prisma.service";
// biome-ignore lint/style/useImportType: required for nestjs-zod ZodValidationPipe runtime metatype
import { CreateExpenseDto } from "./dto/create-expense.dto";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { ExpensesService } from "./expenses.service";

@ApiTags("expenses")
@ApiBearerAuth("access-token")
@UseGuards(JwtGuard, RolesGuard)
@Controller("expenses")
export class ExpensesController {
	constructor(private readonly expensesService: ExpensesService) {}

	@Post()
	@Roles(Role.OWNER, Role.CASHIER)
	@ApiOperation({ summary: "Registrar gasto" })
	@ApiResponse({ status: 201, description: "Gasto registrado." })
	@ApiResponse({ status: 400, description: "Validación fallida." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	create(@CurrentUser() user: { sub: string }, @Body() dto: CreateExpenseDto) {
		return this.expensesService.create(user.sub, dto);
	}

	@Get()
	@Roles(Role.OWNER, Role.CASHIER)
	@ApiOperation({ summary: "Listar gastos" })
	@ApiQuery({ name: "date", required: false, description: "Fecha YYYY-MM-DD" })
	@ApiQuery({ name: "category", required: false, description: "Filtro por categoría" })
	@ApiResponse({ status: 200, description: "Lista de gastos." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	findAll(@Query("date") date?: string, @Query("category") category?: string) {
		return this.expensesService.findAll(date, category);
	}

	@Get(":id")
	@Roles(Role.OWNER, Role.CASHIER)
	@ApiOperation({ summary: "Obtener gasto por ID" })
	@ApiResponse({ status: 200, description: "Gasto encontrado." })
	@ApiResponse({ status: 400, description: "UUID mal formado." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	@ApiResponse({ status: 404, description: "Gasto no encontrado." })
	findOne(@Param("id", ParseUUIDPipe) id: string) {
		return this.expensesService.findOne(id);
	}

	@Delete(":id")
	@HttpCode(200)
	@Roles(Role.OWNER)
	@ApiOperation({ summary: "Eliminar gasto" })
	@ApiResponse({ status: 200, description: "Gasto eliminado." })
	@ApiResponse({ status: 400, description: "UUID mal formado." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	@ApiResponse({ status: 404, description: "Gasto no encontrado." })
	remove(@Param("id", ParseUUIDPipe) id: string) {
		return this.expensesService.remove(id);
	}
}
