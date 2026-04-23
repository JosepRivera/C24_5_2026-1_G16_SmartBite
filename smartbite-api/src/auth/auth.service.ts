import {
	Injectable,
	InternalServerErrorException,
	NotFoundException,
	UnauthorizedException,
} from "@nestjs/common";
import { env } from "@/config/env";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService } from "@/prisma/prisma.service";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { SupabaseService } from "@/supabase/supabase.service";
import type { ForgotPasswordDto } from "./dto/forgot-password.dto";
import type { LoginDto } from "./dto/login.dto";
import type { RefreshDto } from "./dto/refresh.dto";
import type { ResetPasswordDto } from "./dto/reset-password.dto";
import type { UpdateOwnerEmailDto } from "./dto/update-owner-email.dto";

@Injectable()
export class AuthService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly prisma: PrismaService,
	) {}

	/**
	 * Login con usuario y contraseña.
	 * El email en Supabase Auth es sintético: {username}@smartbite.local.
	 * Supabase genera y firma el JWT — nosotros NO manejamos el JWT.
	 */
	async login(dto: LoginDto) {
		const email = `${dto.username}@smartbite.local`;

		const { data, error } = await this.supabase.admin.auth.signInWithPassword({
			email,
			password: dto.password,
		});

		if (error || !data.session) {
			console.error("[auth:login] Supabase error:", error);
			throw new UnauthorizedException("Credenciales inválidas");
		}

		const user = await this.prisma.user.findUnique({
			where: { id: data.user.id },
			select: {
				id: true,
				name: true,
				username: true,
				role: true,
				isActive: true,
			},
		});

		if (!user) {
			throw new NotFoundException("Perfil de usuario no encontrado");
		}

		if (!user.isActive) {
			// Invalidar sesión recién creada — usuario desactivado
			await this.supabase.admin.auth.admin.signOut(data.user.id);
			throw new UnauthorizedException("Cuenta desactivada. Contactá al administrador.");
		}

		return {
			access_token: data.session.access_token,
			refresh_token: data.session.refresh_token,
			expires_in: data.session.expires_in,
			user,
		};
	}

	/**
	 * Cierra todas las sesiones activas del usuario.
	 * El JwtGuard ya validó el token antes de llegar acá.
	 */
	async logout(userId: string) {
		await this.supabase.admin.auth.admin.signOut(userId);
	}

	/**
	 * Renueva el access token con un refresh token válido.
	 * Supabase rota el refresh token en cada uso (refresh token rotation).
	 */
	async refresh(dto: RefreshDto) {
		// Usamos la REST API de Supabase directamente para renovar con solo el refresh_token.
		// El admin client tiene persistSession: false, así que no podemos usar refreshSession()
		// sin un access_token válido. La REST API no requiere el access_token previo.
		const response = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				apikey: env.SUPABASE_SERVICE_ROLE_KEY,
			},
			body: JSON.stringify({ refresh_token: dto.refresh_token }),
		});

		if (!response.ok) {
			throw new UnauthorizedException("Refresh token inválido o expirado");
		}

		const session = (await response.json()) as {
			access_token: string;
			refresh_token: string;
			expires_in: number;
		};

		return {
			access_token: session.access_token,
			refresh_token: session.refresh_token,
			expires_in: session.expires_in,
		};
	}

	/**
	 * Envía un email de recuperación de contraseña.
	 * Supabase gestiona el envío del email y el link de recuperación.
	 *
	 * Siempre retorna éxito para evitar email enumeration attacks.
	 */
	async forgotPassword(dto: ForgotPasswordDto) {
		// No lanzamos error si el email no existe — evita enumeration
		await this.supabase.admin.auth.resetPasswordForEmail(dto.email, {
			// El link en el email redirige acá. El cliente maneja el reset.
			redirectTo: env.CORS_ORIGIN ? `${env.CORS_ORIGIN}/reset-password` : undefined,
		});

		return {
			message: "Si el email existe, recibirás las instrucciones de recuperación.",
		};
	}

	/**
	 * Actualiza la contraseña del usuario autenticado.
	 * El usuario llega acá con el JWT de recovery que Supabase envió por email.
	 * JwtGuard valida el token y extrae el sub (userId).
	 */
	async resetPassword(userId: string, dto: ResetPasswordDto) {
		const { error } = await this.supabase.admin.auth.admin.updateUserById(userId, {
			password: dto.password,
		});

		if (error) {
			throw new InternalServerErrorException("Error actualizando la contraseña");
		}

		return { message: "Contraseña actualizada correctamente." };
	}

	/**
	 * Actualiza el email del dueño en Supabase Auth.
	 * Si perdió acceso al email anterior, debe hacerse manualmente en el dashboard de Supabase.
	 */
	async updateOwnerEmail(userId: string, dto: UpdateOwnerEmailDto) {
		const { error } = await this.supabase.admin.auth.admin.updateUserById(userId, {
			email: dto.email,
			email_confirm: true,
		});

		if (error) {
			throw new InternalServerErrorException("Error actualizando el email");
		}

		return { message: "Email actualizado correctamente." };
	}
}
