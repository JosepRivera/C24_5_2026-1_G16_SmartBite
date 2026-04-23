import { createHash } from "node:crypto";
import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService } from "@/prisma/prisma.service";

@Injectable()
export class ApiKeyGuard implements CanActivate {
	constructor(private readonly prisma: PrismaService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();
		const apiKey = request.headers["x-api-key"] as string | undefined;

		if (!apiKey) {
			throw new UnauthorizedException("X-API-Key requerida");
		}

		const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");

		const device = await this.prisma.deviceToken.findUnique({ where: { apiKeyHash } });

		if (!device?.isActive || device.revokedAt !== null) {
			throw new UnauthorizedException("API key inválida o revocada");
		}

		request.device = device;

		this.prisma.deviceToken
			.update({ where: { id: device.id }, data: { lastUsedAt: new Date() } })
			.catch(() => {});

		return true;
	}
}
