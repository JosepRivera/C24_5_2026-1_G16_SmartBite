import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

// PrismaModule y SupabaseModule son @Global() — no hace falta importarlos acá.
@Module({
	controllers: [AuthController],
	providers: [AuthService],
})
export class AuthModule {}
