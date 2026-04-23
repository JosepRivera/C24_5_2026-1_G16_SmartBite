import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { Roles } from "@/common/decorators/roles.decorator";
import { JwtGuard } from "@/common/guards/jwt.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Role } from "@/prisma/prisma.service";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { AiService } from "./ai.service";

class AiQueryDto extends createZodDto(z.object({ question: z.string().min(1) })) {}

@ApiTags("ai")
@ApiBearerAuth("access-token")
@UseGuards(JwtGuard, RolesGuard)
@Controller("ai")
export class AiController {
	constructor(private readonly aiService: AiService) {}

	@Post("query")
	@Roles(Role.OWNER)
	@ApiOperation({ summary: "Consultar la base de datos en lenguaje natural" })
	@ApiResponse({ status: 200, description: "Resultado de la consulta." })
	@ApiResponse({ status: 400, description: "Consulta no permitida o inválida." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	@ApiResponse({ status: 503, description: "Servicio de IA no disponible." })
	query(@Body() dto: AiQueryDto) {
		return this.aiService.query(dto.question);
	}
}
