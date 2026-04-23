import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "@/config/env";

const JWKS = createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

@Injectable()
export class JwtGuard implements CanActivate {
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();
		const authHeader = request.headers.authorization;

		if (!authHeader?.startsWith("Bearer ")) {
			throw new UnauthorizedException("Token ausente");
		}

		const token = authHeader.slice(7);

		try {
			const { payload } = await jwtVerify(token, JWKS);

			// Supabase pone nuestro rol custom en app_metadata.role
			// El payload.role de Supabase siempre es "authenticated" — no confundir
			const role = (payload.app_metadata as Record<string, string> | undefined)?.role;

			request.user = { sub: payload.sub, role };
			return true;
		} catch {
			throw new UnauthorizedException("Token inválido o expirado");
		}
	}
}
