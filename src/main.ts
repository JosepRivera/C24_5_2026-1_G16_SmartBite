import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { cleanupOpenApiDoc, ZodValidationPipe } from "nestjs-zod";
import { env } from "@/config/env";
import { AppModule } from "./app.module";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.setGlobalPrefix("api/v1");

	app.use(helmet());

	app.enableCors({
		origin: env.CORS_ORIGIN ?? true,
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
	});

	app.useGlobalPipes(new ZodValidationPipe());

	app.useGlobalInterceptors(new TransformInterceptor());

	const config = new DocumentBuilder()
		.setTitle("SmartBite API")
		.setDescription("Backend del sistema de gestión inteligente para restaurantes")
		.setVersion("1.0")
		.addServer(`http://localhost:${env.PORT}`, "Development")
		.addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" }, "access-token")
		.addApiKey({ type: "apiKey", in: "header", name: "X-API-Key" }, "api-key")
		.build();

	const document = SwaggerModule.createDocument(app, config);

	SwaggerModule.setup("api/docs", app, cleanupOpenApiDoc(document));

	await app.listen(env.PORT);

	console.log(`Server running on http://localhost:${env.PORT}`);
	console.log(`Swagger docs at http://localhost:${env.PORT}/api/docs`);
}

bootstrap();
