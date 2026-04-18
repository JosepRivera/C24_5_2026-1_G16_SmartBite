import { Module } from "@nestjs/common";
import { DemandModule } from "@/demand/demand.module";
import { PrismaModule } from "@/prisma/prisma.module";
import { ProductionPlansController } from "./production-plans.controller";
import { ProductionPlansService } from "./production-plans.service";

@Module({
	imports: [PrismaModule, DemandModule],
	controllers: [ProductionPlansController],
	providers: [ProductionPlansService],
})
export class ProductionPlansModule {}
