import {
	type CallHandler,
	type ExecutionContext,
	Injectable,
	Logger,
	type NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	private readonly logger = new Logger("HTTP");

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest();
		const { method, url } = request;
		const start = Date.now();

		return next.handle().pipe(
			tap({
				next: () => {
					const response = context.switchToHttp().getResponse();
					const duration = Date.now() - start;
					this.logger.log(`${method} ${url} ${response.statusCode} ${duration}ms`);
				},
				error: (error) => {
					const duration = Date.now() - start;
					const statusCode = error?.getStatus?.() ?? 500;
					this.logger.warn(`${method} ${url} ${statusCode} ${duration}ms`);
				},
			}),
		);
	}
}
