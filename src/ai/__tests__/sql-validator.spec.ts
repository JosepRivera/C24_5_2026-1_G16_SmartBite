import { describe, expect, it } from "vitest";
import {
	parseSql,
	SqlValidationError,
	validateSqlAst,
	validateStatementType,
	validateTables,
} from "../sql-validator";

describe("sql-validator", () => {
	describe("parseSql", () => {
		it("parses a valid SELECT statement", () => {
			const ast = parseSql("SELECT id, name FROM products");
			expect(ast).toBeDefined();
		});

		it("throws on invalid SQL syntax", () => {
			expect(() => parseSql("NOT VALID SQL AT ALL")).toThrow();
		});
	});

	describe("validateStatementType", () => {
		it("allows SELECT statements", () => {
			const ast = parseSql("SELECT id FROM products");
			expect(() => validateStatementType(ast)).not.toThrow();
		});

		it("rejects INSERT statements", () => {
			const ast = parseSql("INSERT INTO products (name) VALUES ('test')");
			expect(() => validateStatementType(ast)).toThrow(SqlValidationError);
		});

		it("rejects DELETE statements", () => {
			const ast = parseSql("DELETE FROM products WHERE id = '1'");
			expect(() => validateStatementType(ast)).toThrow(SqlValidationError);
		});
	});

	describe("validateTables", () => {
		it("allows whitelisted tables", () => {
			const ast = parseSql("SELECT id FROM products");
			expect(() => validateTables(ast)).not.toThrow();
		});

		it("allows all whitelisted tables", () => {
			const tables = [
				"products",
				"ingredients",
				"recipes",
				"sales",
				"sale_items",
				"expenses",
				"cash_closes",
			];
			for (const table of tables) {
				const ast = parseSql(`SELECT id FROM ${table}`);
				expect(() => validateTables(ast), `Expected ${table} to be allowed`).not.toThrow();
			}
		});

		it("allows whitelisted views", () => {
			const ast = parseSql("SELECT * FROM v_daily_summary");
			expect(() => validateTables(ast)).not.toThrow();

			const ast2 = parseSql("SELECT * FROM v_product_profitability");
			expect(() => validateTables(ast2)).not.toThrow();
		});

		it("rejects blocked table: users", () => {
			const ast = parseSql("SELECT id FROM users");
			expect(() => validateTables(ast)).toThrow(SqlValidationError);
			expect(() => validateTables(ast)).toThrow(/Acceso denegado/);
		});

		it("rejects blocked table: payment_notifications", () => {
			const ast = parseSql("SELECT id FROM payment_notifications");
			expect(() => validateTables(ast)).toThrow(/Acceso denegado/);
		});

		it("rejects blocked table: device_tokens", () => {
			const ast = parseSql("SELECT id FROM device_tokens");
			expect(() => validateTables(ast)).toThrow(/Acceso denegado/);
		});

		it("rejects blocked table: reference_baselines", () => {
			const ast = parseSql("SELECT id FROM reference_baselines");
			expect(() => validateTables(ast)).toThrow(/Acceso denegado/);
		});

		it("rejects blocked table: daily_production_plans", () => {
			const ast = parseSql("SELECT id FROM daily_production_plans");
			expect(() => validateTables(ast)).toThrow(/Acceso denegado/);
		});

		it("rejects unknown tables", () => {
			const ast = parseSql("SELECT id FROM nonexistent_table");
			expect(() => validateTables(ast)).toThrow(/no existe en el esquema/);
		});
	});

	describe("validateSqlAst (full pipeline)", () => {
		it("validates a correct query with allowed tables", () => {
			expect(validateSqlAst("SELECT name, price FROM products WHERE is_active = true")).toBe(true);
		});

		it("rejects blocked tables in JOIN", () => {
			expect(() =>
				validateSqlAst("SELECT p.name FROM products p JOIN users u ON p.id = u.id"),
			).toThrow(SqlValidationError);
		});
	});
});
