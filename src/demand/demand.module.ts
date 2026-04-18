import { Module } from "@nestjs/common";
import { PrismaModule } from "@/prisma/prisma.module";
import { DemandScheduler } from "./demand.scheduler";
import { DemandService } from "./demand.service";

@Module({
	imports: [PrismaModule],
	providers: [DemandService, DemandScheduler],
	exports: [DemandService, DemandScheduler],
})
export class DemandModule {}
