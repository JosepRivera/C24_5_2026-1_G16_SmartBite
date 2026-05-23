import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	ParseUUIDPipe,
	Post,
	UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { JwtGuard } from "@/common/guards/jwt.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Role } from "@/prisma/prisma.service";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { DevicesService } from "./devices.service";
// biome-ignore lint/style/useImportType: required for nestjs-zod ZodValidationPipe runtime metatype
import { RegisterDeviceDto } from "./dto/register-device.dto";

@SkipThrottle()
@ApiTags("devices")
@ApiBearerAuth("access-token")
@UseGuards(JwtGuard, RolesGuard)
@Controller("devices")
export class DevicesController {
	constructor(private readonly devicesService: DevicesService) {}

	@Post()
	@Roles(Role.OWNER)
	@ApiOperation({ summary: "Registrar dispositivo y obtener API key" })
	@ApiResponse({
		status: 201,
		description: "Dispositivo registrado. API key retornada en texto plano.",
	})
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	register(@CurrentUser() user: { sub: string }, @Body() dto: RegisterDeviceDto) {
		return this.devicesService.register(user.sub, dto);
	}

	@Get()
	@Roles(Role.OWNER)
	@ApiOperation({ summary: "Listar dispositivos registrados" })
	@ApiResponse({ status: 200, description: "Lista de dispositivos." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	findAll() {
		return this.devicesService.findAll();
	}

	@Delete(":id")
	@HttpCode(200)
	@Roles(Role.OWNER)
	@ApiOperation({ summary: "Revocar dispositivo" })
	@ApiResponse({ status: 200, description: "Dispositivo revocado." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso." })
	revoke(@Param("id", ParseUUIDPipe) id: string) {
		return this.devicesService.revoke(id);
	}
}
