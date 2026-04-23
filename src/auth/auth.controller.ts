import { Body, Controller, HttpCode, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { JwtGuard } from "@/common/guards/jwt.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { AuthService } from "./auth.service";
// biome-ignore lint/style/useImportType: required for nestjs-zod ZodValidationPipe runtime metatype
import { ForgotPasswordDtoClass } from "./dto/forgot-password.dto";
// biome-ignore lint/style/useImportType: required for nestjs-zod ZodValidationPipe runtime metatype
import { LoginDtoClass } from "./dto/login.dto";
// biome-ignore lint/style/useImportType: required for nestjs-zod ZodValidationPipe runtime metatype
import { RefreshDtoClass } from "./dto/refresh.dto";
// biome-ignore lint/style/useImportType: required for nestjs-zod ZodValidationPipe runtime metatype
import { ResetPasswordDtoClass } from "./dto/reset-password.dto";
// biome-ignore lint/style/useImportType: required for nestjs-zod ZodValidationPipe runtime metatype
import { UpdateOwnerEmailDtoClass } from "./dto/update-owner-email.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post("login")
	@HttpCode(200)
	@ApiOperation({
		summary: "Login con usuario y contraseña",
		description:
			"Autentica al usuario y retorna access_token + refresh_token emitidos por Supabase Auth. " +
			"El JWT es válido para todas las rutas protegidas con JwtGuard.",
	})
	@ApiResponse({ status: 200, description: "Login exitoso. Retorna tokens y perfil del usuario." })
	@ApiResponse({ status: 401, description: "Credenciales inválidas o cuenta desactivada." })
	login(@Body() dto: LoginDtoClass) {
		return this.authService.login(dto);
	}

	@Post("logout")
	@HttpCode(204)
	@UseGuards(JwtGuard)
	@ApiBearerAuth("access-token")
	@ApiOperation({
		summary: "Cerrar sesión",
		description: "Invalida todas las sesiones activas del usuario en Supabase Auth.",
	})
	@ApiResponse({ status: 204, description: "Sesión cerrada correctamente." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	async logout(@CurrentUser() user: { sub: string }) {
		await this.authService.logout(user.sub);
	}

	@Post("refresh")
	@HttpCode(200)
	@ApiOperation({
		summary: "Renovar access token",
		description:
			"Renueva el access_token usando el refresh_token. " +
			"Supabase rota el refresh_token en cada uso (refresh token rotation habilitado por defecto).",
	})
	@ApiResponse({ status: 200, description: "Tokens renovados correctamente." })
	@ApiResponse({ status: 401, description: "Refresh token inválido o expirado." })
	refresh(@Body() dto: RefreshDtoClass) {
		return this.authService.refresh(dto);
	}

	@Post("forgot-password")
	@HttpCode(200)
	@ApiOperation({
		summary: "Solicitar recuperación de contraseña",
		description:
			"Supabase envía un email con el link de recuperación. " +
			"Siempre retorna éxito para evitar email enumeration.",
	})
	@ApiResponse({ status: 200, description: "Instrucciones enviadas (si el email existe)." })
	forgotPassword(@Body() dto: ForgotPasswordDtoClass) {
		return this.authService.forgotPassword(dto);
	}

	@Post("reset-password")
	@HttpCode(200)
	@UseGuards(JwtGuard)
	@ApiBearerAuth("access-token")
	@ApiOperation({
		summary: "Cambiar contraseña con token de recuperación",
		description:
			"El usuario llega acá con el JWT de recovery que Supabase envió por email. " +
			"Enviar ese token en el header Authorization: Bearer <recovery_token>.",
	})
	@ApiResponse({ status: 200, description: "Contraseña actualizada correctamente." })
	@ApiResponse({ status: 401, description: "Token de recuperación inválido o expirado." })
	@ApiResponse({ status: 500, description: "Error interno al actualizar la contraseña." })
	resetPassword(@CurrentUser() user: { sub: string }, @Body() dto: ResetPasswordDtoClass) {
		return this.authService.resetPassword(user.sub, dto);
	}

	@Patch("owner-email")
	@HttpCode(200)
	@UseGuards(JwtGuard, RolesGuard)
	@Roles("OWNER")
	@ApiBearerAuth("access-token")
	@ApiOperation({
		summary: "Actualizar email del dueño",
		description:
			"Actualiza el email del dueño en Supabase Auth. " +
			"Solo funciona mientras el dueño tiene una sesión activa. " +
			"Si perdió acceso al email anterior, debe hacerlo desde el dashboard de Supabase.",
	})
	@ApiResponse({ status: 200, description: "Email actualizado correctamente." })
	@ApiResponse({ status: 401, description: "Token ausente o inválido." })
	@ApiResponse({ status: 403, description: "Rol sin permiso (requiere OWNER)." })
	@ApiResponse({ status: 500, description: "Error al actualizar en Supabase." })
	updateOwnerEmail(@CurrentUser() user: { sub: string }, @Body() dto: UpdateOwnerEmailDtoClass) {
		return this.authService.updateOwnerEmail(user.sub, dto);
	}
}
