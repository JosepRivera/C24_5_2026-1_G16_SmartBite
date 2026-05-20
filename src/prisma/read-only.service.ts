import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env";
import { PrismaClient } from "../generated/prisma/client";

/**
 * Read-only Prisma client for AI queries.
 * Uses DATABASE_URL_READONLY if available, otherwise falls back to DATABASE_URL.
 * AI query validation (SELECT-only, no DML) provides the primary safety layer;
 * this service provides defense-in-depth by using a read-only DB connection.
 */
@Injectable()
export class ReadOnlyPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
	constructor() {
		const connectionString = env.DATABASE_URL_READONLY ?? env.DATABASE_URL;
		const adapter = new PrismaPg({ connectionString });
		super({ adapter });
	}

	async onModuleInit() {
		await this.$connect();
	}

	async onModuleDestroy() {
		await this.$disconnect();
	}
}
