import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";

config();

const supabase = createClient(
	process.env.SUPABASE_URL ?? "http://127.0.0.1:54321",
	process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
	{ auth: { persistSession: false } },
);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const prisma = new PrismaClient({ adapter });

// ─── Catalog ──────────────────────────────────────────────────────────────────

const USERS_CATALOG = [
	{
		email: "owner@smartbite.local",
		username: "owner",
		name: "Dueño SmartBite",
		password: "owner1234",
		role: "OWNER",
	},
	{
		email: "cajera01@smartbite.local",
		username: "cajera01",
		name: "María García",
		password: "cashier1234",
		role: "CASHIER",
	},
	{
		email: "cajera02@smartbite.local",
		username: "cajera02",
		name: "Rosa López",
		password: "cashier1234",
		role: "CASHIER",
	},
	{
		email: "cocinero01@smartbite.local",
		username: "cocinero01",
		name: "Carlos Quispe",
		password: "cook1234",
		role: "COOK",
	},
] as const;

const PRODUCTS_CATALOG = [
	{ name: "Hamburguesa Clásica", price: 12.0, category: "Hamburguesas" },
	{ name: "Hamburguesa Especial", price: 15.0, category: "Hamburguesas" },
	{ name: "Hamburguesa Doble", price: 18.0, category: "Hamburguesas" },
	{ name: "Salchipapa Simple", price: 8.0, category: "Salchipapas" },
	{ name: "Salchipapa Especial", price: 10.0, category: "Salchipapas" },
	{ name: "Papas Fritas", price: 6.0, category: "Acompañamientos" },
	{ name: "Gaseosa 500ml", price: 3.5, category: "Bebidas" },
	{ name: "Jugo Natural", price: 5.0, category: "Bebidas" },
	{ name: "Agua Mineral", price: 2.5, category: "Bebidas" },
] as const;

const INGREDIENTS_CATALOG = [
	{ name: "Pan de hamburguesa", unit: "unidad", stock: 80, minStock: 20, costPerUnit: 0.8 },
	{ name: "Carne molida", unit: "kg", stock: 8, minStock: 2, costPerUnit: 22.0 },
	{ name: "Queso cheddar", unit: "kg", stock: 1.5, minStock: 0.5, costPerUnit: 38.0 },
	{ name: "Lechuga", unit: "kg", stock: 1.2, minStock: 0.3, costPerUnit: 4.0 },
	{ name: "Tomate", unit: "kg", stock: 0.3, minStock: 0.5, costPerUnit: 3.5 }, // stock bajo → alerta
	{ name: "Papa", unit: "kg", stock: 15, minStock: 5, costPerUnit: 1.8 },
	{ name: "Salchicha", unit: "kg", stock: 2, minStock: 1, costPerUnit: 18.0 },
	{ name: "Aceite", unit: "litro", stock: 6, minStock: 2, costPerUnit: 8.5 },
	{ name: "Gaseosa 500ml", unit: "unidad", stock: 48, minStock: 12, costPerUnit: 2.0 },
	{ name: "Naranja", unit: "kg", stock: 1.2, minStock: 2, costPerUnit: 2.5 }, // stock bajo → alerta
	{ name: "Agua 500ml", unit: "unidad", stock: 36, minStock: 6, costPerUnit: 1.2 },
] as const;

const RECIPES_CATALOG = [
	{
		product: "Hamburguesa Clásica",
		items: [
			["Pan de hamburguesa", 1],
			["Carne molida", 0.15],
			["Lechuga", 0.03],
			["Tomate", 0.05],
		],
	},
	{
		product: "Hamburguesa Especial",
		items: [
			["Pan de hamburguesa", 1],
			["Carne molida", 0.18],
			["Queso cheddar", 0.06],
			["Lechuga", 0.05],
			["Tomate", 0.06],
		],
	},
	{
		product: "Hamburguesa Doble",
		items: [
			["Pan de hamburguesa", 1],
			["Carne molida", 0.3],
			["Queso cheddar", 0.08],
			["Lechuga", 0.05],
			["Tomate", 0.08],
		],
	},
	{
		product: "Salchipapa Simple",
		items: [
			["Papa", 0.25],
			["Salchicha", 0.1],
			["Aceite", 0.05],
		],
	},
	{
		product: "Salchipapa Especial",
		items: [
			["Papa", 0.3],
			["Salchicha", 0.15],
			["Aceite", 0.06],
			["Queso cheddar", 0.04],
		],
	},
	{
		product: "Papas Fritas",
		items: [
			["Papa", 0.2],
			["Aceite", 0.04],
		],
	},
	{ product: "Gaseosa 500ml", items: [["Gaseosa 500ml", 1]] },
	{ product: "Jugo Natural", items: [["Naranja", 0.3]] },
	{ product: "Agua Mineral", items: [["Agua 500ml", 1]] },
] as const;

// Cantidad típica por día de semana (0=Dom … 6=Sáb)
const BASELINES_CATALOG: Record<string, number[]> = {
	"Hamburguesa Clásica": [12, 7, 8, 8, 9, 16, 20],
	"Hamburguesa Especial": [8, 5, 6, 6, 7, 11, 14],
	"Hamburguesa Doble": [6, 4, 4, 4, 5, 8, 10],
	"Salchipapa Simple": [10, 7, 8, 8, 9, 15, 18],
	"Salchipapa Especial": [7, 4, 5, 5, 6, 10, 13],
	"Papas Fritas": [8, 5, 6, 6, 7, 11, 13],
	"Gaseosa 500ml": [20, 14, 15, 15, 17, 28, 35],
	"Jugo Natural": [4, 3, 3, 3, 3, 5, 6],
	"Agua Mineral": [6, 4, 4, 4, 5, 8, 10],
};

// Ventas por día de semana (0=Dom … 6=Sáb) — base para historial
const SALES_PER_DOW = [28, 18, 20, 20, 22, 38, 45];

// Pesos de selección de producto (mismo orden que PRODUCTS_CATALOG)
const PRODUCT_WEIGHTS = [30, 20, 15, 18, 12, 10, 35, 8, 12];

const STATUSES = ["PAID_CASH", "PAID_YAPE", "PAID_PLIN", "PAID_AGORA", "CANCELLED"] as const;
const STATUS_W = [70, 20, 5, 3, 2];
type SaleStatus = (typeof STATUSES)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rng(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[], weights: number[]): T {
	const total = weights.reduce((a, b) => a + b, 0);
	let r = Math.random() * total;
	for (let i = 0; i < items.length; i++) {
		r -= weights[i];
		if (r <= 0) return items[i];
	}
	return items[items.length - 1];
}

async function batched<T>(
	items: T[],
	size: number,
	fn: (item: T) => Promise<unknown>,
): Promise<void> {
	for (let i = 0; i < items.length; i += size) {
		await Promise.all(items.slice(i, i + size).map(fn));
	}
}

function utcDate(daysAgo: number): Date {
	const d = new Date();
	d.setUTCDate(d.getUTCDate() - daysAgo);
	d.setUTCHours(0, 0, 0, 0);
	return d;
}

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

// ─── Seed: usuarios ───────────────────────────────────────────────────────────

async function seedUsers(): Promise<{ owner: string; cashiers: string[] }> {
	const ids: Record<string, string> = {};

	for (const u of USERS_CATALOG) {
		const existing = await prisma.user.findFirst({ where: { username: u.username } });
		if (existing) {
			// Repair: sync the email in Supabase Auth to match the {username}@smartbite.local convention.
			// Needed when the seed was previously run with mismatched emails.
			const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
				email: u.email,
				email_confirm: true,
				password: u.password,
			});
			if (updateError) {
				console.warn(`[seed] Warning syncing auth for ${u.username}: ${updateError.message}`);
			} else {
				console.log(`[seed] user ${u.username} — auth synced`);
			}
			ids[u.username] = existing.id;
			continue;
		}

		const { data, error } = await supabase.auth.admin.createUser({
			email: u.email,
			password: u.password,
			email_confirm: true,
			app_metadata: { role: u.role },
		});

		if (error ?? !data.user) throw new Error(`Auth error (${u.username}): ${error?.message}`);

		await prisma.user.create({
			data: { id: data.user.id, name: u.name, username: u.username, role: u.role },
		});

		console.log(`[seed] user creado: ${u.username}`);
		ids[u.username] = data.user.id;
	}

	return {
		owner: ids["owner"],
		cashiers: [ids["owner"], ids["cajera01"], ids["cajera02"]],
	};
}

// ─── Seed: ingredientes ───────────────────────────────────────────────────────

async function seedIngredients(): Promise<Map<string, string>> {
	const map = new Map<string, string>();

	for (const ing of INGREDIENTS_CATALOG) {
		let rec = await prisma.ingredient.findFirst({ where: { name: ing.name } });
		if (!rec) {
			rec = await prisma.ingredient.create({
				data: {
					name: ing.name,
					unit: ing.unit,
					stock: ing.stock,
					minStock: ing.minStock,
					costPerUnit: ing.costPerUnit,
				},
			});
			console.log(`[seed] ingrediente: ${ing.name}`);
		}
		map.set(ing.name, rec.id);
	}

	return map;
}

// ─── Seed: productos ──────────────────────────────────────────────────────────

async function seedProducts(): Promise<Map<string, { id: string; price: number }>> {
	const map = new Map<string, { id: string; price: number }>();

	for (const p of PRODUCTS_CATALOG) {
		let rec = await prisma.product.findFirst({ where: { name: p.name } });
		if (!rec) {
			rec = await prisma.product.create({
				data: { name: p.name, price: p.price, category: p.category },
			});
			console.log(`[seed] producto: ${p.name}`);
		}
		map.set(p.name, { id: rec.id, price: Number(rec.price) });
	}

	return map;
}

// ─── Seed: recetas ────────────────────────────────────────────────────────────

async function seedRecipes(
	products: Map<string, { id: string; price: number }>,
	ingredients: Map<string, string>,
): Promise<void> {
	for (const r of RECIPES_CATALOG) {
		const product = products.get(r.product);
		if (!product) continue;

		for (const [ingName, qty] of r.items) {
			const ingredientId = ingredients.get(ingName as string);
			if (!ingredientId) continue;

			await prisma.recipe.upsert({
				where: { productId_ingredientId: { productId: product.id, ingredientId } },
				create: { productId: product.id, ingredientId, quantity: qty as number },
				update: { quantity: qty as number },
			});
		}
	}
	console.log("[seed] recetas listas");
}

// ─── Seed: baselines ─────────────────────────────────────────────────────────

async function seedBaselines(products: Map<string, { id: string; price: number }>): Promise<void> {
	for (const [name, qtys] of Object.entries(BASELINES_CATALOG)) {
		const product = products.get(name);
		if (!product) continue;

		for (let dow = 0; dow < 7; dow++) {
			await prisma.referenceBaseline.upsert({
				where: { productId_dayOfWeek: { productId: product.id, dayOfWeek: dow } },
				create: { productId: product.id, dayOfWeek: dow, quantity: qtys[dow] },
				update: { quantity: qtys[dow] },
			});
		}
	}
	console.log("[seed] baselines listas");
}

// ─── Seed: historial de ventas (56 días) ─────────────────────────────────────

type DailyTotals = { cash: number; digital: number; expenses: number };

type SaleData = {
	daysAgo: number;
	dateKey: string;
	userId: string;
	status: SaleStatus;
	items: { productId: string; quantity: number; unitPrice: number }[];
	total: number;
};

async function seedSalesHistory(
	products: Map<string, { id: string; price: number }>,
	cashierIds: string[],
): Promise<Map<string, DailyTotals>> {
	const dailyTotals = new Map<string, DailyTotals>();
	const existing = await prisma.sale.count();

	if (existing > 10) {
		console.log(`[seed] ventas ya existen (${existing}) — skip`);
		return dailyTotals;
	}

	const productList = PRODUCTS_CATALOG.map((p) => products.get(p.name)!);
	const salesData: SaleData[] = [];

	// Generate all sale data synchronously
	for (let daysAgo = 56; daysAgo >= 1; daysAgo--) {
		const d = utcDate(daysAgo);
		const dow = d.getUTCDay();
		const dateKey = d.toISOString().slice(0, 10);
		const count = rng(Math.floor(SALES_PER_DOW[dow] * 0.85), Math.ceil(SALES_PER_DOW[dow] * 1.15));

		for (let s = 0; s < count; s++) {
			const status = pick(STATUSES, STATUS_W);
			const userId = cashierIds[rng(0, cashierIds.length - 1)];
			const itemCount = pick([1, 2, 3] as const, [30, 50, 20]);

			const itemMap = new Map<string, { productId: string; quantity: number; unitPrice: number }>();
			for (let i = 0; i < itemCount; i++) {
				const product = pick(productList, PRODUCT_WEIGHTS);
				if (!product) continue;
				const entry = itemMap.get(product.id);
				if (entry) {
					entry.quantity++;
				} else {
					itemMap.set(product.id, { productId: product.id, quantity: 1, unitPrice: product.price });
				}
			}

			const items = Array.from(itemMap.values());
			const total = round2(items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0));
			salesData.push({ daysAgo, dateKey, userId, status, items, total });
		}
	}

	// Pre-compute daily totals (synchronous, no race conditions)
	for (const sale of salesData) {
		if (!dailyTotals.has(sale.dateKey)) {
			dailyTotals.set(sale.dateKey, { cash: 0, digital: 0, expenses: 0 });
		}
		const dt = dailyTotals.get(sale.dateKey)!;
		if (sale.status === "PAID_CASH") {
			dt.cash = round2(dt.cash + sale.total);
		} else if (
			sale.status === "PAID_YAPE" ||
			sale.status === "PAID_PLIN" ||
			sale.status === "PAID_AGORA"
		) {
			dt.digital = round2(dt.digital + sale.total);
		}
	}

	console.log(`[seed] creando ${salesData.length} ventas históricas...`);

	await batched(salesData, 20, async (sale) => {
		const ts = utcDate(sale.daysAgo);
		ts.setUTCHours(rng(11, 21), rng(0, 59), 0, 0);

		await prisma.sale.create({
			data: {
				status: sale.status,
				total: sale.total,
				userId: sale.userId,
				tableNumber: Math.random() < 0.6 ? `T0${rng(1, 8)}` : undefined,
				createdAt: ts,
				items: { create: sale.items },
			},
		});
	});

	console.log(`[seed] ${salesData.length} ventas creadas`);
	return dailyTotals;
}

// ─── Seed: gastos ─────────────────────────────────────────────────────────────

async function seedExpenses(ownerId: string, dailyTotals: Map<string, DailyTotals>): Promise<void> {
	const existing = await prisma.expense.count();
	if (existing > 5) {
		console.log("[seed] gastos ya existen — skip");
		return;
	}

	const templates = [
		{ description: "Compra de ingredientes", category: "Ingredientes", min: 150, max: 350 },
		{ description: "Pago de luz", category: "Servicios", min: 80, max: 120 },
		{ description: "Gas", category: "Servicios", min: 40, max: 60 },
		{ description: "Limpieza", category: "Limpieza", min: 25, max: 45 },
		{ description: "Bolsas y empaques", category: "Insumos", min: 20, max: 40 },
		{ description: "Mantenimiento equipo", category: "Mantenimiento", min: 50, max: 100 },
	];

	const rows: {
		description: string;
		amount: number;
		category: string;
		userId: string;
		createdAt: Date;
	}[] = [];

	for (let daysAgo = 56; daysAgo >= 1; daysAgo--) {
		const d = utcDate(daysAgo);
		const dow = d.getUTCDay();
		const dateKey = d.toISOString().slice(0, 10);
		const dt = dailyTotals.get(dateKey) ?? { cash: 0, digital: 0, expenses: 0 };

		const addExpense = (tpl: (typeof templates)[number]) => {
			const amount = rng(tpl.min, tpl.max);
			const ts = new Date(d);
			ts.setUTCHours(rng(8, 10), rng(0, 59), 0, 0);
			rows.push({
				description: tpl.description,
				category: tpl.category,
				amount,
				userId: ownerId,
				createdAt: ts,
			});
			dt.expenses = round2(dt.expenses + amount);
			dailyTotals.set(dateKey, dt);
		};

		// Ingredientes: lunes y viernes
		if (dow === 1 || dow === 5) addExpense(templates[0]);

		// Servicios: ~cada 30 días
		if (daysAgo % 30 < 2) addExpense(templates[rng(1, 2)]);

		// Misc: ~30% de los días
		if (Math.random() < 0.3) addExpense(templates[rng(3, 5)]);
	}

	await prisma.expense.createMany({ data: rows });
	console.log(`[seed] ${rows.length} gastos creados`);
}

// ─── Seed: cierres de caja ───────────────────────────────────────────────────

async function seedCashCloses(
	ownerId: string,
	dailyTotals: Map<string, DailyTotals>,
): Promise<void> {
	// Fetch existing dates to skip them (partial unique index on date WHERE parent_close_id IS NULL)
	const existingDates = new Set(
		(
			await prisma.cashClose.findMany({ where: { parentCloseId: null }, select: { date: true } })
		).map((r) => r.date.toISOString().slice(0, 10)),
	);

	const rows = [];

	for (let daysAgo = 56; daysAgo >= 1; daysAgo--) {
		const d = utcDate(daysAgo);
		const dateKey = d.toISOString().slice(0, 10);

		if (existingDates.has(dateKey)) continue;

		const dt = dailyTotals.get(dateKey) ?? { cash: 0, digital: 0, expenses: 0 };

		const cashIncome = round2(dt.cash);
		const digitalIncome = round2(dt.digital);
		const totalIncome = round2(cashIncome + digitalIncome);
		const totalExpenses = round2(dt.expenses);
		const netProfit = round2(totalIncome - totalExpenses);

		rows.push({
			date: d,
			cashIncome,
			digitalIncome,
			totalIncome,
			totalExpenses,
			netProfit,
			closedBy: ownerId,
		});
	}

	if (rows.length === 0) {
		console.log("[seed] cierres ya existen — skip");
		return;
	}

	await prisma.cashClose.createMany({ data: rows });
	console.log(`[seed] ${rows.length} cierres de caja creados`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
	console.log("[seed] SmartBite — seeder completo iniciado\n");

	const { owner, cashiers } = await seedUsers();
	const ingredientMap = await seedIngredients();
	const productMap = await seedProducts();

	await seedRecipes(productMap, ingredientMap);
	await seedBaselines(productMap);

	const dailyTotals = await seedSalesHistory(productMap, cashiers);
	await seedExpenses(owner, dailyTotals);
	await seedCashCloses(owner, dailyTotals);

	console.log("\n[seed] ✅ Completado");
	console.log(`  Usuarios    : ${USERS_CATALOG.length} (owner, 2 cashiers, 1 cook)`);
	console.log(`  Productos   : ${PRODUCTS_CATALOG.length}`);
	console.log(`  Ingredientes: ${INGREDIENTS_CATALOG.length} (2 con stock bajo → alertas)`);
	console.log(`  Historial   : 56 días → Holt-Winters listo`);
	console.log("\n  Credenciales de prueba:");
	for (const u of USERS_CATALOG) {
		console.log(`    ${u.username.padEnd(12)} ${u.email.padEnd(28)} ${u.password}`);
	}
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect());
