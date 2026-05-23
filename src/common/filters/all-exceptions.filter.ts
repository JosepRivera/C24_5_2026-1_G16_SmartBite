import {
	type ArgumentsHost,
	Catch,
	type ExceptionFilter,
	HttpException,
	Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client";

interface ErrorBody {
	error: {
		statusCode: number;
		code: string;
		message: string;
		timestamp: string;
		path: string;
	};
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	private readonly logger = new Logger(AllExceptionsFilter.name);

	catch(exception: unknown, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		const { statusCode, code, message } = this.resolveError(exception);

		const body: ErrorBody = {
			error: {
				statusCode,
				code,
				message,
				timestamp: new Date().toISOString(),
				path: request.url,
			},
		};

		if (statusCode >= 500) {
			this.logger.error(
				`[${request.method}] ${request.url} → ${statusCode} ${code}`,
				exception instanceof Error ? exception.stack : String(exception),
			);
		} else {
			this.logger.warn(`[${request.method}] ${request.url} → ${statusCode} ${code}`);
		}

		response.status(statusCode).json(body);
	}

	private resolveError(exception: unknown): { statusCode: number; code: string; message: string } {
		if (exception instanceof HttpException) {
			const status = exception.getStatus();
			const exceptionResponse = exception.getResponse();
			const message =
				typeof exceptionResponse === "string"
					? exceptionResponse
					: ((exceptionResponse as { message?: string }).message ?? exception.message);
			return {
				statusCode: status,
				code: exception.constructor.name.replace("Exception", "").toUpperCase(),
				message,
			};
		}

		if (exception instanceof Prisma.PrismaClientKnownRequestError) {
			return this.mapPrismaKnownError(exception);
		}

		if (exception instanceof Prisma.PrismaClientValidationError) {
			return { statusCode: 400, code: "BAD_REQUEST", message: "Invalid query parameters" };
		}

		return { statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "Internal server error" };
	}

	private mapPrismaKnownError(exception: Prisma.PrismaClientKnownRequestError): {
		statusCode: number;
		code: string;
		message: string;
	} {
		switch (exception.code) {
			case "P2002":
				return {
					statusCode: 409,
					code: "CONFLICT",
					message: "A record with these values already exists",
				};
			case "P2025":
				return {
					statusCode: 404,
					code: "NOT_FOUND",
					message: "The requested record was not found",
				};
			case "P2003":
				return {
					statusCode: 409,
					code: "CONFLICT",
					message: "Operation references a record that does not exist",
				};
			case "P2000":
				return { statusCode: 400, code: "BAD_REQUEST", message: "Input value is too long" };
			case "P2011":
				return { statusCode: 400, code: "BAD_REQUEST", message: "A required field is missing" };
			case "P2014":
				return {
					statusCode: 400,
					code: "BAD_REQUEST",
					message: "Operation violates a required relation",
				};
			default:
				return { statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "Internal server error" };
		}
	}
}
