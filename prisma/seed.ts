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

const OWNER = {
	email: "owner@smartbite.local",
	username: "owner",
	name: "Dueño SmartBite",
	password: "owner1234",
};

async function main() {
	const existing = await prisma.user.findFirst({ where: { role: "OWNER" } });
	if (existing) {
		console.log("[seed] Owner ya existe — skip");
		return;
	}

	const { data, error } = await supabase.auth.admin.createUser({
		email: OWNER.email,
		password: OWNER.password,
		email_confirm: true,
		app_metadata: { role: "OWNER" },
	});

	if (error || !data.user) {
		throw new Error(`Supabase Auth error: ${error?.message}`);
	}

	await prisma.user.create({
		data: {
			id: data.user.id,
			name: OWNER.name,
			username: OWNER.username,
			role: "OWNER",
		},
	});

	console.log("[seed] Owner creado:");
	console.log(`  username: ${OWNER.username}`);
	console.log(`  password: ${OWNER.password}`);
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect());
