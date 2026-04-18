import { Module } from "@nestjs/common";
import { DemandModule } from "@/demand/demand.module";
import { PrismaModule } from "@/prisma/prisma.module";
import { MrpController } from "./mrp.controller";
import { MrpService } from "./mrp.service";

@Module({
	imports: [PrismaModule, DemandModule],
	controllers: [MrpController],
	providers: [MrpService],
})
export class MrpModule {}
