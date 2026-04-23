import { Injectable } from "@nestjs/common";
// biome-ignore lint/style/useImportType: required for NestJS DI
import { PrismaService } from "@/prisma/prisma.service";

const SEASON_LENGTH = 7;
const ALPHA = 0.3;
const BETA = 0.1;
const GAMMA = 0.3;
const MIN_HISTORY_DAYS = 14;

export interface DemandPrediction {
	productId: string;
	date: Date;
	quantity: number;
}

@Injectable()
export class DemandService {
	constructor(private readonly prisma: PrismaService) {}

	async predictNextDays(days: number): Promise<DemandPrediction[]> {
		const products = await this.prisma.product.findMany({
			where: { isActive: true },
			select: { id: true },
		});

		const results: DemandPrediction[] = [];

		for (const product of products) {
			const predictions = await this.predictForProduct(product.id, days);
			results.push(...predictions);
		}

		return results;
	}

	async predictForProduct(productId: string, days: number): Promise<DemandPrediction[]> {
		const history = await this.getHistory(productId);

		let series: number[];

		const nonZeroDays = history.filter((v) => v > 0).length;
		if (nonZeroDays < MIN_HISTORY_DAYS) {
			series = await this.buildSeriesFromBaselines(productId, history);
		} else {
			series = history;
		}

		const forecasts = this.holtwinters(series, days);

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		return forecasts.map((quantity, i) => {
			const date = new Date(today);
			date.setDate(date.getDate() + i);
			return { productId, date, quantity: Math.max(0, Math.round(quantity)) };
		});
	}

	private async getHistory(productId: string): Promise<number[]> {
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - 56);

		const sales = await this.prisma.saleItem.findMany({
			where: {
				productId,
				sale: {
					createdAt: { gte: cutoff },
					status: { not: "CANCELLED" },
				},
			},
			select: { quantity: true, sale: { select: { createdAt: true } } },
		});

		const byDay = new Map<string, number>();

		for (const item of sales) {
			const day = item.sale.createdAt.toISOString().slice(0, 10);
			byDay.set(day, (byDay.get(day) ?? 0) + Number(item.quantity));
		}

		const result: number[] = [];
		for (let i = 55; i >= 0; i--) {
			const d = new Date();
			d.setDate(d.getDate() - i);
			const key = d.toISOString().slice(0, 10);
			result.push(byDay.get(key) ?? 0);
		}

		return result;
	}

	private async buildSeriesFromBaselines(
		productId: string,
		partialHistory: number[],
	): Promise<number[]> {
		const baselines = await this.prisma.referenceBaseline.findMany({
			where: { productId },
			orderBy: { dayOfWeek: "asc" },
		});

		if (baselines.length === 0) {
			return Array(SEASON_LENGTH * 4).fill(1);
		}

		const baselineMap = new Map<number, number>();
		for (const b of baselines) {
			baselineMap.set(b.dayOfWeek, Number(b.quantity));
		}

		const series: number[] = [];
		const startDayOfWeek = (new Date().getDay() - partialHistory.length + 1 + 700) % 7;

		for (let i = 0; i < SEASON_LENGTH * 4; i++) {
			const dayOfWeek = (startDayOfWeek + i) % 7;
			series.push(baselineMap.get(dayOfWeek) ?? 1);
		}

		for (let i = 0; i < partialHistory.length && i < series.length; i++) {
			if (partialHistory[i] > 0) {
				series[series.length - partialHistory.length + i] = partialHistory[i];
			}
		}

		return series;
	}

	private holtwinters(series: number[], horizon: number): number[] {
		if (series.length < SEASON_LENGTH * 2) {
			const avg = series.reduce((a, b) => a + b, 0) / series.length || 1;
			return Array(horizon).fill(avg);
		}

		let level = series.slice(0, SEASON_LENGTH).reduce((a, b) => a + b, 0) / SEASON_LENGTH;
		let trend = 0;

		const seasonal: number[] = [];
		const firstAvg = level || 1;
		for (let i = 0; i < SEASON_LENGTH; i++) {
			seasonal.push((series[i] || 1) / firstAvg);
		}

		for (let t = SEASON_LENGTH; t < series.length; t++) {
			const y = series[t] || 0;
			const s = seasonal[t % SEASON_LENGTH] || 1;
			const prevLevel = level;

			level = ALPHA * (y / s) + (1 - ALPHA) * (prevLevel + trend);
			trend = BETA * (level - prevLevel) + (1 - BETA) * trend;
			seasonal[t % SEASON_LENGTH] = GAMMA * (y / level) + (1 - GAMMA) * s;
		}

		const forecasts: number[] = [];
		for (let h = 1; h <= horizon; h++) {
			const s = seasonal[(series.length + h - 1) % SEASON_LENGTH] ?? 1;
			forecasts.push((level + h * trend) * s);
		}

		return forecasts;
	}
}
