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
		email: "alejandro.ramos@smartbite.local",
		username: "alejandro.r",
		name: "Alejandro Ramos",
		password: "owner1234",
		role: "OWNER",
	},
	{
		email: "maria.garcia@smartbite.local",
		username: "maria.g",
		name: "María Elena García",
		password: "cashier1234",
		role: "CASHIER",
	},
	{
		email: "rosa.mendoza@smartbite.local",
		username: "rosa.m",
		name: "Rosa Mendoza",
		password: "cashier1234",
		role: "CASHIER",
	},
	{
		email: "carlos.quispe@smartbite.local",
		username: "carlos.q",
		name: "Carlos Quispe Mamani",
		password: "cook1234",
		role: "COOK",
	},
	{
		email: "juan.perez@smartbite.local",
		username: "juan.p",
		name: "Juan Pérez Castillo",
		password: "waiter1234",
		role: "WAITER",
	},
] as const;

const PRODUCTS_CATALOG = [
	{ name: "Hamburguesa Clásica", price: 12.0, category: "Hamburguesas", description: "La clásica con carne 100% res" },
	{ name: "Hamburguesa Especial", price: 15.0, category: "Hamburguesas", description: "Con queso cheddar y verduras frescas" },
	{ name: "Hamburguesa Doble", price: 18.0, category: "Hamburguesas", description: "Doble carne, doble queso, doble sabor" },
	{ name: "Salchipapa Simple", price: 8.0, category: "Salchipapas", description: "Papas fritas con salchicha y salsas" },
	{ name: "Salchipapa Especial", price: 10.0, category: "Salchipapas", description: "Con queso, huevo y salsas de la casa" },
	{ name: "Papas Fritas", price: 6.0, category: "Acompañamientos", description: "Crujientes papas fritas" },
	{ name: "Gaseosa 500ml", price: 3.5, category: "Bebidas", description: "Gaseosa personal 500ml" },
	{ name: "Jugo Natural", price: 5.0, category: "Bebidas", description: "Jugo de naranja recién exprimido" },
	{ name: "Agua Mineral", price: 2.5, category: "Bebidas", description: "Agua mineral sin gas" },
	// Shawarma
	{ name: "Shawarma Mixto", price: 18.0, category: "Shawarma", description: "Carne y pollo con verduras frescas" },
	{ name: "Shawarma Pollo", price: 16.0, category: "Shawarma", description: "Pollo marinado con salsa tahini" },
	{ name: "Shawarma Carne", price: 17.0, category: "Shawarma", description: "Carne de res con especias" },
	// Pizza
	{ name: "Pizza Personal", price: 14.0, category: "Pizza", description: "Queso mozzarella y salsa de tomate" },
	{ name: "Pizza Familiar", price: 28.0, category: "Pizza", description: "Doble queso y pepperoni para compartir" },
	// Pollo
	{ name: "Pollo Broaster", price: 15.0, category: "Pollo", description: "Crujiente por fuera, jugoso por dentro" },
	{ name: "Nuggets de Pollo", price: 12.0, category: "Pollo", description: "8 piezas con salsa BBQ" },
	// Bebidas adicionales
	{ name: "Inca Kola 500ml", price: 4.0, category: "Bebidas", description: "Bebida nacional del Perú" },
	{ name: "Chicha Morada", price: 5.0, category: "Bebidas", description: "Bebida tradicional peruana" },
	{ name: "Limonada", price: 5.0, category: "Bebidas", description: "Limón fresco con hierbabuena" },
	// Combos
	{ name: "Combo Clásico", price: 20.0, category: "Combos", description: "Hamburguesa + papas + gaseosa" },
	{ name: "Combo Familiar", price: 45.0, category: "Combos", description: "2 hamburguesas + 2 salchipapas + 2 bebidas" },
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
	// Nuevos ingredientes — Shawarma
	{ name: "Pan pita", unit: "unidad", stock: 40, minStock: 10, costPerUnit: 1.2 },
	{ name: "Pollo deshuesado", unit: "kg", stock: 5, minStock: 2, costPerUnit: 18.0 },
	{ name: "Carne de res (shawarma)", unit: "kg", stock: 4, minStock: 1, costPerUnit: 28.0 },
	{ name: "Salsa tahini", unit: "litro", stock: 2, minStock: 0.5, costPerUnit: 22.0 },
	// Nuevos ingredientes — Pizza
	{ name: "Masa para pizza", unit: "unidad", stock: 15, minStock: 5, costPerUnit: 3.5 },
	{ name: "Queso mozzarella", unit: "kg", stock: 2, minStock: 0.5, costPerUnit: 32.0 },
	{ name: "Pepperoni", unit: "kg", stock: 1, minStock: 0.3, costPerUnit: 35.0 },
	// Nuevos ingredientes — Pollo
	{ name: "Pollo broaster (entero, cortado)", unit: "kg", stock: 6, minStock: 2, costPerUnit: 16.0 },
	{ name: "Nuggets congelados", unit: "kg", stock: 3, minStock: 1, costPerUnit: 20.0 },
	// Nuevos ingredientes — Bebidas
	{ name: "Inca Kola 500ml", unit: "unidad", stock: 36, minStock: 8, costPerUnit: 2.5 },
	{ name: "Chicha morada concentrada", unit: "litro", stock: 4, minStock: 1, costPerUnit: 8.0 },
	{ name: "Limón", unit: "kg", stock: 2, minStock: 0.5, costPerUnit: 5.0 },
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
	// Shawarma
	{
		product: "Shawarma Mixto",
		items: [
			["Pan pita", 1],
			["Pollo deshuesado", 0.12],
			["Carne de res (shawarma)", 0.08],
			["Lechuga", 0.03],
			["Tomate", 0.04],
			["Salsa tahini", 0.03],
		],
	},
	{
		product: "Shawarma Pollo",
		items: [
			["Pan pita", 1],
			["Pollo deshuesado", 0.15],
			["Lechuga", 0.03],
			["Tomate", 0.04],
			["Salsa tahini", 0.04],
		],
	},
	{
		product: "Shawarma Carne",
		items: [
			["Pan pita", 1],
			["Carne de res (shawarma)", 0.15],
			["Lechuga", 0.03],
			["Tomate", 0.04],
			["Salsa tahini", 0.03],
		],
	},
	// Pizza
	{
		product: "Pizza Personal",
		items: [
			["Masa para pizza", 1],
			["Queso mozzarella", 0.12],
			["Tomate", 0.06],
		],
	},
	{
		product: "Pizza Familiar",
		items: [
			["Masa para pizza", 1],
			["Queso mozzarella", 0.25],
			["Pepperoni", 0.08],
			["Tomate", 0.1],
		],
	},
	// Pollo
	{
		product: "Pollo Broaster",
		items: [
			["Pollo broaster (entero, cortado)", 0.3],
			["Aceite", 0.05],
		],
	},
	{
		product: "Nuggets de Pollo",
		items: [
			["Nuggets congelados", 0.2],
			["Aceite", 0.04],
		],
	},
	// Bebidas adicionales
	{ product: "Inca Kola 500ml", items: [["Inca Kola 500ml", 1]] },
	{
		product: "Chicha Morada",
		items: [["Chicha morada concentrada", 0.15]],
	},
	{
		product: "Limonada",
		items: [
			["Limón", 0.12],
			["Agua 500ml", 1],
		],
	},
	// Combos — virtual recipe using component products' ingredients
	{
		product: "Combo Clásico",
		items: [
			["Pan de hamburguesa", 1],
			["Carne molida", 0.15],
			["Lechuga", 0.03],
			["Tomate", 0.05],
			["Papa", 0.2],
			["Aceite", 0.04],
			["Gaseosa 500ml", 1],
		],
	},
	{
		product: "Combo Familiar",
		items: [
			["Pan de hamburguesa", 2],
			["Carne molida", 0.3],
			["Lechuga", 0.06],
			["Tomate", 0.1],
			["Papa", 0.5],
			["Salchicha", 0.2],
			["Aceite", 0.1],
			["Gaseosa 500ml", 2],
		],
	},
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
	// Shawarma
	"Shawarma Mixto": [10, 6, 7, 7, 8, 14, 17],
	"Shawarma Pollo": [8, 5, 5, 5, 6, 10, 13],
	"Shawarma Carne": [7, 4, 5, 5, 6, 10, 12],
	// Pizza
	"Pizza Personal": [8, 5, 6, 6, 7, 12, 15],
	"Pizza Familiar": [5, 3, 3, 3, 4, 7, 9],
	// Pollo
	"Pollo Broaster": [9, 6, 7, 7, 8, 13, 16],
	"Nuggets de Pollo": [6, 4, 4, 4, 5, 9, 11],
	// Bebidas adicionales
	"Inca Kola 500ml": [18, 12, 13, 13, 15, 24, 30],
	"Chicha Morada": [5, 3, 3, 3, 4, 7, 9],
	"Limonada": [4, 3, 3, 3, 3, 5, 7],
	// Combos
	"Combo Clásico": [8, 5, 6, 6, 7, 12, 15],
	"Combo Familiar": [4, 2, 3, 3, 3, 6, 8],
};

// Ventas por día de semana (0=Dom … 6=Sáb) — base para historial
const SALES_PER_DOW = [28, 18, 20, 20, 22, 38, 45];

// Pesos de selección de producto (mismo orden que PRODUCTS_CATALOG)
const PRODUCT_WEIGHTS = [20, 15, 10, 12, 8, 8, 25, 6, 10, 15, 12, 10, 8, 5, 5, 4, 3, 3, 2, 2, 2];

const STATUSES = ["PAID_CASH", "PAID_YAPE", "PAID_PLIN", "PAID_AGORA", "CANCELLED"] as const;
const STATUS_W = [40, 35, 15, 7, 3];
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
			const syntheticEmail = `${u.username}@smartbite.local`;
			const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
				email: syntheticEmail,
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

		const syntheticEmail = `${u.username}@smartbite.local`;
		
		// Check if user already exists in Supabase Auth (e.g. after DB reset)
		const { data: listData } = await supabase.auth.admin.listUsers();
		const existingAuthUser = listData?.users.find((user) => user.email === syntheticEmail);
		
		if (existingAuthUser) {
			// Link existing Supabase Auth user to Prisma
			await prisma.user.upsert({
				where: { id: existingAuthUser.id },
				create: { id: existingAuthUser.id, name: u.name, username: u.username, role: u.role },
				update: { name: u.name, username: u.username, role: u.role },
			});
			ids[u.username] = existingAuthUser.id;
			console.log(`[seed] user linked: ${u.username}`);
			continue;
		}
		
		const { data, error } = await supabase.auth.admin.createUser({
			email: syntheticEmail,
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
		owner: ids["alejandro.r"],
		cashiers: [ids["alejandro.r"], ids["maria.g"], ids["rosa.m"]],
	};
}

// ─── Seed: ingredientes ───────────────────────────────────────────────────────

async function seedIngredients(): Promise<Map<string, string>> {
	const map = new Map<string, string>();

	for (const ing of INGREDIENTS_CATALOG) {
		const existing = await prisma.ingredient.findFirst({ where: { name: ing.name } });
		let id: string;
		if (existing) {
			await prisma.ingredient.update({
				where: { id: existing.id },
				data: { unit: ing.unit, minStock: ing.minStock, costPerUnit: ing.costPerUnit },
			});
			id = existing.id;
		} else {
			const created = await prisma.ingredient.create({
				data: {
					name: ing.name,
					unit: ing.unit,
					stock: ing.stock,
					minStock: ing.minStock,
					costPerUnit: ing.costPerUnit,
				},
			});
			id = created.id;
			console.log(`[seed] ingrediente nuevo: ${ing.name}`);
		}
		map.set(ing.name, id);
	}
	console.log(`[seed] ${INGREDIENTS_CATALOG.length} ingredientes listos`);

	return map;
}

// ─── Seed: productos ──────────────────────────────────────────────────────────

async function seedProducts(): Promise<Map<string, { id: string; price: number }>> {
	const map = new Map<string, { id: string; price: number }>();

	for (const p of PRODUCTS_CATALOG) {
		const existing = await prisma.product.findFirst({ where: { name: p.name } });
		let id: string;
		if (existing) {
			await prisma.product.update({
				where: { id: existing.id },
				data: { price: p.price, category: p.category, description: p.description, isActive: true },
			});
			id = existing.id;
		} else {
			const created = await prisma.product.create({
				data: { name: p.name, price: p.price, category: p.category, description: p.description },
			});
			id = created.id;
			console.log(`[seed] producto nuevo: ${p.name}`);
		}
		map.set(p.name, { id, price: p.price });
	}
	console.log(`[seed] ${PRODUCTS_CATALOG.length} productos listos`);

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

	// Generate all sale data synchronously (daysAgo=0 = today for dashboard KPIs)
	for (let daysAgo = 56; daysAgo >= 0; daysAgo--) {
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

	// Today's expenses (daysAgo=0) — prevents 100% margin on dashboard
	const todayDate = utcDate(0);
	const todayKey = todayDate.toISOString().slice(0, 10);
	const todayDt = dailyTotals.get(todayKey) ?? { cash: 0, digital: 0, expenses: 0 };

	// Always add ingredient purchase for today
	const ingredientAmount = rng(150, 350);
	const ingredientTs = new Date(todayDate);
	ingredientTs.setUTCHours(rng(8, 10), rng(0, 59), 0, 0);
	rows.push({
		description: "Compra de ingredientes",
		category: "Ingredientes",
		amount: ingredientAmount,
		userId: ownerId,
		createdAt: ingredientTs,
	});
	todayDt.expenses = round2(todayDt.expenses + ingredientAmount);

	// Random misc expense for today (~60% chance)
	if (Math.random() < 0.6) {
		const miscTemplate = templates[rng(3, 5)];
		const miscAmount = rng(miscTemplate.min, miscTemplate.max);
		const miscTs = new Date(todayDate);
		miscTs.setUTCHours(rng(8, 10), rng(0, 59), 0, 0);
		rows.push({
			description: miscTemplate.description,
			category: miscTemplate.category,
			amount: miscAmount,
			userId: ownerId,
			createdAt: miscTs,
		});
		todayDt.expenses = round2(todayDt.expenses + miscAmount);
	}

	dailyTotals.set(todayKey, todayDt);

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

// ─── Seed: plan de producción diario ─────────────────────────────────────────

async function seedDailyProductionPlan(
	products: Map<string, { id: string; price: number }>,
): Promise<void> {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);
	const dow = today.getDay();

	// Check if plan for today already exists
	const existing = await prisma.dailyProductionPlan.count({
		where: { date: { gte: today, lt: tomorrow } },
	});
	if (existing > 0) {
		console.log("[seed] plan de producción de hoy ya existe — skip");
		return;
	}

	const rows: { date: Date; productId: string; quantity: number; predictionSource: string }[] = [];

	for (const [name, qtys] of Object.entries(BASELINES_CATALOG)) {
		const product = products.get(name);
		if (!product) continue;

		rows.push({
			date: today,
			productId: product.id,
			quantity: qtys[dow],
			predictionSource: "baseline",
		});
	}

	await prisma.dailyProductionPlan.createMany({ data: rows });
	console.log(`[seed] plan de producción para hoy: ${rows.length} productos`);
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
	await seedDailyProductionPlan(productMap);

	console.log("\n[seed] ✅ Completado");
	console.log(`  Usuarios    : ${USERS_CATALOG.length} (owner, 2 cashiers, 1 cook, 1 waiter)`);
	console.log(`  Productos   : ${PRODUCTS_CATALOG.length}`);
	console.log(`  Ingredientes: ${INGREDIENTS_CATALOG.length}`);
	console.log(`  Historial   : 56 días → Holt-Winters listo`);
	console.log("\n  Credenciales de prueba:");
	for (const u of USERS_CATALOG) {
		console.log(`    ${u.username.padEnd(12)} ${u.email.padEnd(28)} ${u.password}`);
	}
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect());
