import { createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService } from "@/prisma/prisma.service";
import type { RegisterDevice } from "./dto/register-device.dto";

@Injectable()
export class DevicesService {
	constructor(private readonly prisma: PrismaService) {}

	async register(userId: string, dto: RegisterDevice) {
		const apiKey = randomBytes(32).toString("hex");
		const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");

		const device = await this.prisma.deviceToken.create({
			data: {
				name: dto.name,
				apiKeyHash,
				registeredBy: userId,
			},
		});

		return {
			id: device.id,
			name: device.name,
			api_key: apiKey,
			created_at: device.createdAt,
		};
	}

	async findAll() {
		const devices = await this.prisma.deviceToken.findMany({
			orderBy: { createdAt: "desc" },
		});
		return devices.map(formatDevice);
	}

	async revoke(id: string) {
		await this.prisma.deviceToken.update({
			where: { id },
			data: {
				isActive: false,
				revokedAt: new Date(),
			},
		});
		return { id, revoked: true };
	}
}

type Device = Awaited<ReturnType<PrismaService["deviceToken"]["findUnique"]>>;

function formatDevice(device: NonNullable<Device>) {
	return {
		id: device.id,
		name: device.name,
		is_active: device.isActive,
		registered_by: device.registeredBy,
		last_used_at: device.lastUsedAt,
		revoked_at: device.revokedAt,
		created_at: device.createdAt,
	};
}
