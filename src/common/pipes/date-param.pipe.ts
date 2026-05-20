import { Injectable, type PipeTransform } from "@nestjs/common";
import { toLimaDayRange } from "@/common/utils/timezone";

/**
 * Validates a date query param (YYYY-MM-DD) and returns the UTC start
 * of that Lima-local day. Works with optional params (returns today if undefined).
 */
@Injectable()
export class DateParamPipe implements PipeTransform<string | undefined, Date> {
	transform(value: string | undefined): Date {
		const { start } = toLimaDayRange(value);
		return start;
	}
}
