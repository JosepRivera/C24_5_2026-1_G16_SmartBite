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
	Query,
	UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "@/common/decorators/roles.decorator";
import { JwtGuard } from "@/common/guards/jwt.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Role } from "@/prisma/prisma.service";
// biome-ignore lint/style/useImportType: required for nestjs-zod ZodValidationPipe runtime metatype
import { CreateProductDto } from "./dto/create-product.dto";
// biome-ignore lint/style/useImportType: required for nestjs-zod ZodValidationPipe runtime metatype
import { UpdateProductDto } from "./dto/update-product.dto";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { ProductsService } from "./products.service";

@ApiTags("products")
@ApiBearerAuth("access-token")
@UseGuards(JwtGuard)
@Controller("products")
export class ProductsController {
	constructor(private readonly productsService: ProductsService) {}

	@Get()
	@ApiOperation({
		summary: "Listar productos",
		description: "Lista todos los productos de la carta. Por defecto solo devuelve los activos.",
	})
	@ApiQuery({
		name: "includeInactive",
		required: false,
		type: Boolean,
		description: "Si es true incluye los desactivados",
	})
	@ApiQuery({
		name: "category",
		required: false,
		type: String,
		description: "Filtra por categoría",
	})
	@ApiResponse({ status: 200, description: "Lista de productos." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	findAll(
		@Query("includeInactive") includeInactive?: string,
		@Query("category") category?: string,
	) {
		return this.productsService.findAll(includeInactive === "true", category);
	}

	@Post()
	@UseGuards(RolesGuard)
	@Roles(Role.OWNER)
	@ApiOperation({
		summary: "Crear producto",
		description: "Crea un nuevo producto en la carta.",
	})
	@ApiResponse({ status: 201, description: "Producto creado." })
	@ApiResponse({ status: 400, description: "Validación fallida." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	@ApiResponse({ status: 409, description: "Nombre ya existe." })
	create(@Body() dto: CreateProductDto) {
		return this.productsService.create(dto);
	}

	@Get(":id")
	@ApiOperation({
		summary: "Obtener producto por ID",
		description: "Devuelve un producto por su ID incluyendo si está inactivo.",
	})
	@ApiResponse({ status: 200, description: "Producto encontrado." })
	@ApiResponse({ status: 400, description: "UUID mal formado." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 404, description: "Producto no encontrado." })
	findOne(@Param("id", ParseUUIDPipe) id: string) {
		return this.productsService.findOne(id);
	}

	@Patch(":id")
	@UseGuards(RolesGuard)
	@Roles(Role.OWNER)
	@ApiOperation({
		summary: "Editar producto",
		description: "Edita los datos de un producto. Todos los campos son opcionales.",
	})
	@ApiResponse({ status: 200, description: "Producto actualizado." })
	@ApiResponse({ status: 400, description: "UUID mal formado o validación fallida." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	@ApiResponse({ status: 404, description: "Producto no encontrado." })
	@ApiResponse({ status: 409, description: "Nombre ya existe." })
	update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
		return this.productsService.update(id, dto);
	}

	@Delete(":id")
	@HttpCode(200)
	@UseGuards(RolesGuard)
	@Roles(Role.OWNER)
	@ApiOperation({
		summary: "Desactivar producto",
		description:
			"Desactiva un producto (soft delete). Deja de aparecer en la carta pero su historial de ventas se conserva.",
	})
	@ApiResponse({ status: 200, description: "Producto desactivado." })
	@ApiResponse({ status: 400, description: "UUID mal formado." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	@ApiResponse({ status: 404, description: "Producto no encontrado." })
	@ApiResponse({ status: 422, description: "El producto tiene órdenes abiertas activas." })
	deactivate(@Param("id", ParseUUIDPipe) id: string) {
		return this.productsService.deactivate(id);
	}
}
