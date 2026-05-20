import {
	BadRequestException,
	Controller,
	Post,
	Query,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
	ApiBearerAuth,
	ApiBody,
	ApiConsumes,
	ApiOperation,
	ApiQuery,
	ApiResponse,
	ApiTags,
} from "@nestjs/swagger";
import { Roles } from "@/common/decorators/roles.decorator";
import { JwtGuard } from "@/common/guards/jwt.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Role } from "@/prisma/prisma.service";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { VoiceService } from "./voice.service";

@ApiTags("voice")
@ApiBearerAuth("access-token")
@UseGuards(JwtGuard, RolesGuard)
@Controller("voice")
export class VoiceController {
	constructor(private readonly voiceService: VoiceService) {}

	@Post("transcribe")
	@Roles(Role.OWNER, Role.CASHIER, Role.WAITER, Role.COOK)
	@UseInterceptors(FileInterceptor("audio"))
	@ApiConsumes("multipart/form-data")
	@ApiBody({
		schema: {
			type: "object",
			properties: {
				audio: { type: "string", format: "binary" },
			},
		},
	})
	@ApiQuery({
		name: "form_type",
		required: false,
		enum: ["sale", "expense", "ingredient_update"],
		description: "Tipo de formulario para extracción de campos",
	})
	@ApiOperation({ summary: "Transcribir audio y extraer campos de formulario" })
	@ApiResponse({ status: 200, description: "Transcripción y campos extraídos." })
	@ApiResponse({ status: 400, description: "Audio inválido o no enviado." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 503, description: "Servicio de transcripción no disponible." })
	transcribe(
		@UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined,
		@Query("form_type") formType?: "sale" | "expense" | "ingredient_update",
	) {
		if (!file) {
			throw new BadRequestException("Se requiere un archivo de audio");
		}

		const validType: "sale" | "expense" | "ingredient_update" =
			formType !== undefined &&
			(formType as string) in { sale: 1, expense: 1, ingredient_update: 1 }
				? formType
				: "sale";

		return this.voiceService.transcribeAndExtract(file.buffer, file.mimetype, validType);
	}
}
