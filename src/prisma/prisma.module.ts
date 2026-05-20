import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { ReadOnlyPrismaService } from "./read-only.service";

@Global()
@Module({
	providers: [PrismaService, ReadOnlyPrismaService],
	exports: [PrismaService, ReadOnlyPrismaService],
})
export class PrismaModule {}
