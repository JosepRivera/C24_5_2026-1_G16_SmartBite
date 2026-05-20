import { BadRequestException } from "@nestjs/common";

export const LIMA_TIMEZONE = "America/Lima";

/**
 * Converts a Lima-local date string (YYYY-MM-DD) into a UTC [start, end) range
 * covering that full Lima business day.
 *
 * Lima is UTC-5 (no DST), so Lima midnight = UTC 05:00.
 */
export function toLimaDayRange(dateStr?: string): { start: Date; end: Date } {
	const localDateStr =
		dateStr ??
		new Intl.DateTimeFormat("en-CA", { timeZone: LIMA_TIMEZONE }).format(new Date());

	if (!/^\d{4}-\d{2}-\d{2}$/.test(localDateStr)) {
		throw new BadRequestException("Fecha inválida. Formato esperado: YYYY-MM-DD");
	}

	// Lima midnight = UTC 05:00
	const start = new Date(`${localDateStr}T05:00:00.000Z`);
	const end = new Date(start);
	end.setUTCDate(end.getUTCDate() + 1);

	if (Number.isNaN(start.getTime())) {
		throw new BadRequestException("Fecha inválida. Formato esperado: YYYY-MM-DD");
	}

	return { start, end };
}

/**
 * Formats a Date or ISO string as a Lima-local YYYY-MM-DD date string.
 */
export function getLimaDate(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return new Intl.DateTimeFormat("en-CA", { timeZone: LIMA_TIMEZONE }).format(d);
}
