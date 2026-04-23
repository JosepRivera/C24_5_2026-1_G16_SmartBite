import {
	type CanActivate,
	type ExecutionContext,
	ForbiddenException,
	Injectable,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { Reflector } from "@nestjs/core";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { Role } from "@/prisma/prisma.service";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(private reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (!requiredRoles) return true;

		const { user } = context.switchToHttp().getRequest();

		if (!requiredRoles.includes(user.role)) {
			throw new ForbiddenException("No tienes permiso para esta acción");
		}

		return true;
	}
}
