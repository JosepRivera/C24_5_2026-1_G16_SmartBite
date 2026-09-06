// Mide el tamaño real (en tokens) del catálogo de insumos dentro del prompt
// que Kilo le manda a Claude Haiku para extraer campos del dictado por voz.
//
// Usa el endpoint gratuito messages.count_tokens de Anthropic: no genera
// texto, no cuesta nada, solo cuenta. Reemplaza la aproximación por
// caracteres que hay en las docs (docs/src/content/docs/producto/costos.mdx)
// por el número exacto del tokenizador real de Claude.
//
// Uso:
//   ANTHROPIC_API_KEY=sk-ant-... bun run scripts/count-catalog-tokens.ts catalogo.txt
//
// catalogo.txt: un insumo por línea, en el formato compacto decidido
// ("Nombre (alias) - unidad - categoría"). Corre esto sobre 2-3 catálogos
// reales de restaurantes (no el de ejemplo de las docs) antes de fijar precio.

const API_URL = "https://api.anthropic.com/v1/messages/count_tokens";
const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-haiku-4-5-20251001";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
	console.error("Falta ANTHROPIC_API_KEY. Ejemplo: ANTHROPIC_API_KEY=sk-ant-... bun run scripts/count-catalog-tokens.ts catalogo.txt");
	process.exit(1);
}

const catalogPath = process.argv[2];
if (!catalogPath) {
	console.error("Falta la ruta al catálogo. Ejemplo: bun run scripts/count-catalog-tokens.ts catalogo.txt");
	process.exit(1);
}

const catalogo = await Bun.file(catalogPath).text();

// Mismo system prompt real que usaría la extracción de Fase 2 (ajustar si
// el prompt real de producción es distinto a este esqueleto).
const systemPrompt = `Eres el sistema de extracción de Kilo. Dado el dictado por voz de un dueño de restaurante sobre el stock restante de insumos, extrae la lista de insumo + cantidad, usando exclusivamente los nombres canónicos del catálogo. Si una frase no calza con ningún alias, márcalo para confirmación en vez de inventar un insumo.

Catálogo de insumos del restaurante (nombre canónico (alias) - unidad - categoría):
${catalogo}`;

const body = {
	model: MODEL,
	system: systemPrompt,
	messages: [
		{
			role: "user",
			content: "Quedó medio kilo de pollo, dos limones y un balde de tomate.",
		},
	],
};

const res = await fetch(API_URL, {
	method: "POST",
	headers: {
		"content-type": "application/json",
		"anthropic-version": ANTHROPIC_VERSION,
		"x-api-key": apiKey,
	},
	body: JSON.stringify(body),
});

if (!res.ok) {
	console.error(`Error ${res.status}: ${await res.text()}`);
	process.exit(1);
}

const { input_tokens } = (await res.json()) as { input_tokens: number };
const insumos = catalogo.split("\n").filter((l) => l.trim()).length;

console.log(`Insumos en el catálogo: ${insumos}`);
console.log(`Tokens de entrada reales (system + catálogo + mensaje de ejemplo): ${input_tokens}`);
console.log(`Promedio por insumo: ${(input_tokens / insumos).toFixed(1)} tokens`);
