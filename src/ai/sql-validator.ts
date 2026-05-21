import { Parser } from "node-sql-parser";

const ALLOWED_TABLES = new Set([
	"products",
	"ingredients",
	"recipes",
	"sales",
	"sale_items",
	"expenses",
	"cash_closes",
	"v_daily_summary",
	"v_product_profitability",
]);

const BLOCKED_TABLES = new Set([
	"users",
	"payment_notifications",
	"device_tokens",
	"reference_baselines",
	"daily_production_plans",
]);

export class SqlValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SqlValidationError";
	}
}

const parser = new Parser();

/** Parse SQL string into AST using PostgreSQL dialect. Throws on parse failure. */
export function parseSql(sql: string): unknown {
	return parser.astify(sql, { database: "PostgreSQL" });
}

/**
 * Extract all table names referenced in the AST.
 * Walks the node-sql-parser AST looking for `from` and `join` entries.
 */
function extractTableNames(ast: unknown): string[] {
	const tables: string[] = [];
	const nodes = Array.isArray(ast) ? ast : [ast];

	for (const node of nodes) {
		if (typeof node !== "object" || node === null) continue;

		const stmt = node as Record<string, unknown>;

		// Top-level FROM clause
		if (stmt.from && Array.isArray(stmt.from)) {
			for (const from of stmt.from) {
				if (from.table) tables.push(from.table);
			}
		}

		// JOIN clauses
		if (stmt.joins && Array.isArray(stmt.joins)) {
			for (const join of stmt.joins) {
				if (join.table) tables.push(join.table);
			}
		}

		// Subqueries in WHERE / IN / EXISTS
		if (stmt.where && typeof stmt.where === "object") {
			tables.push(...extractTableNames(stmt.where));
		}

		// Recursive: nested SELECT in expressions
		for (const key of Object.keys(stmt)) {
			const val = stmt[key];
			if (val && typeof val === "object" && !Array.isArray(val)) {
				if ("type" in val && "from" in val) {
					tables.push(...extractTableNames(val));
				}
			}
		}
	}

	return tables;
}

/** Validate all referenced tables are in the whitelist. */
export function validateTables(ast: unknown): void {
	const tableNames = extractTableNames(ast);

	for (const table of tableNames) {
		const lower = table.toLowerCase();

		if (BLOCKED_TABLES.has(lower)) {
			throw new SqlValidationError(
				`Acceso denegado a la tabla "${table}". No tienes permiso para consultar esta tabla.`,
			);
		}

		if (!ALLOWED_TABLES.has(lower)) {
			throw new SqlValidationError(`Tabla "${table}" no existe en el esquema permitido.`);
		}
	}
}

/** Validate the AST represents a SELECT statement only. */
export function validateStatementType(ast: unknown): void {
	const nodes = Array.isArray(ast) ? ast : [ast];

	for (const node of nodes) {
		if (typeof node !== "object" || node === null) continue;
		const stmt = node as Record<string, unknown>;
		if (stmt.type && stmt.type !== "select") {
			throw new SqlValidationError(
				`Sentencia "${stmt.type}" no permitida. Solo se permiten consultas SELECT.`,
			);
		}
	}
}

/**
 * Full AST validation pipeline: statement type → table whitelist.
 * Returns true if valid, throws SqlValidationError if not.
 */
export function validateSqlAst(sql: string): boolean {
	const ast = parseSql(sql);
	validateStatementType(ast);
	validateTables(ast);
	return true;
}
