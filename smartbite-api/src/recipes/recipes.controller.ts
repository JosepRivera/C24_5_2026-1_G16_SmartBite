import { Body, Controller, Get, Param, ParseUUIDPipe, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "@/common/decorators/roles.decorator";
import { JwtGuard } from "@/common/guards/jwt.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Role } from "@/prisma/prisma.service";
// biome-ignore lint/style/useImportType: required for nestjs-zod ZodValidationPipe runtime metatype
import { UpsertRecipeDto } from "./dto/upsert-recipe.dto";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { RecipesService } from "./recipes.service";

@ApiTags("recipes")
@ApiBearerAuth("access-token")
@UseGuards(JwtGuard, RolesGuard)
@Controller("recipes")
export class RecipesController {
	constructor(private readonly recipesService: RecipesService) {}

	@Get(":productId")
	@Roles(Role.OWNER)
	@ApiOperation({
		summary: "Obtener receta",
		description: "Devuelve la receta completa de un producto con sus insumos y cantidades.",
	})
	@ApiResponse({ status: 200, description: "Receta encontrada." })
	@ApiResponse({ status: 400, description: "UUID mal formado." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 404, description: "Producto sin receta registrada." })
	findByProduct(@Param("productId", ParseUUIDPipe) productId: string) {
		return this.recipesService.findByProduct(productId);
	}

	@Put(":productId")
	@Roles(Role.OWNER)
	@ApiOperation({
		summary: "Crear o reemplazar receta",
		description:
			"Crea o reemplaza por completo la receta de un producto. La operación es atómica: elimina la receta anterior y crea la nueva en una sola transacción.",
	})
	@ApiResponse({ status: 200, description: "Receta actualizada." })
	@ApiResponse({ status: 400, description: "UUID mal formado o validación fallida." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	@ApiResponse({ status: 404, description: "Producto o insumo no encontrado." })
	upsert(@Param("productId", ParseUUIDPipe) productId: string, @Body() dto: UpsertRecipeDto) {
		return this.recipesService.upsert(productId, dto);
	}
}
