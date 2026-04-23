import {
	Body,
	Controller,
	Get,
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
import { CreateIngredientDto } from "./dto/create-ingredient.dto";
// biome-ignore lint/style/useImportType: required for nestjs-zod ZodValidationPipe runtime metatype
import { UpdateIngredientDto } from "./dto/update-ingredient.dto";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { IngredientsService } from "./ingredients.service";

@ApiTags("ingredients")
@ApiBearerAuth("access-token")
@UseGuards(JwtGuard, RolesGuard)
@Roles(Role.OWNER)
@Controller("ingredients")
export class IngredientsController {
	constructor(private readonly ingredientsService: IngredientsService) {}

	@Get()
	@ApiOperation({
		summary: "Listar insumos",
		description: "Lista todos los insumos con su stock actual. Incluye is_low_stock calculado.",
	})
	@ApiQuery({
		name: "lowStock",
		required: false,
		type: Boolean,
		description: "Si es true devuelve solo los que están bajo el umbral mínimo",
	})
	@ApiResponse({ status: 200, description: "Lista de insumos." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	findAll(@Query("lowStock") lowStock?: string) {
		return this.ingredientsService.findAll(lowStock === "true");
	}

	@Post()
	@ApiOperation({
		summary: "Crear insumo",
		description: "Registra un nuevo insumo con su stock inicial y umbral mínimo de alerta.",
	})
	@ApiResponse({ status: 201, description: "Insumo creado." })
	@ApiResponse({ status: 400, description: "Validación fallida." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	@ApiResponse({ status: 409, description: "Nombre ya existe." })
	create(@Body() dto: CreateIngredientDto) {
		return this.ingredientsService.create(dto);
	}

	@Get(":id")
	@ApiOperation({
		summary: "Obtener insumo por ID",
		description: "Devuelve un insumo por su ID.",
	})
	@ApiResponse({ status: 200, description: "Insumo encontrado." })
	@ApiResponse({ status: 400, description: "UUID mal formado." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	@ApiResponse({ status: 404, description: "Insumo no encontrado." })
	findOne(@Param("id", ParseUUIDPipe) id: string) {
		return this.ingredientsService.findOne(id);
	}

	@Patch(":id")
	@ApiOperation({
		summary: "Editar insumo",
		description:
			"Edita los datos de un insumo. Todos los campos son opcionales. Usar para ajustar stock tras entrega de mercadería.",
	})
	@ApiResponse({ status: 200, description: "Insumo actualizado." })
	@ApiResponse({ status: 400, description: "UUID mal formado o validación fallida." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	@ApiResponse({ status: 404, description: "Insumo no encontrado." })
	@ApiResponse({ status: 409, description: "Nombre ya existe." })
	update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateIngredientDto) {
		return this.ingredientsService.update(id, dto);
	}
}
