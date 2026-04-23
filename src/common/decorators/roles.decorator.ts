import { SetMetadata } from "@nestjs/common";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { Role } from "@/prisma/prisma.service";

export const ROLES_KEY = "roles";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
