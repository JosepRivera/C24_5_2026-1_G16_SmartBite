import { Injectable, OnModuleInit } from "@nestjs/common";
import Groq from "groq-sdk";
import { env } from "@/config/env";

@Injectable()
export class GroqService implements OnModuleInit {
	private groq: Groq | null = null;

	onModuleInit() {
		if (env.GROQ_API_KEY) {
			this.groq = new Groq({
				apiKey: env.GROQ_API_KEY,
				timeout: env.GROQ_TIMEOUT,
			});
		}
	}

	isAvailable(): boolean {
		return this.groq !== null;
	}

	getClient(): Groq | null {
		return this.groq;
	}
}
