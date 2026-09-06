// Endpoint del panel "Preguntar a la IA" embebido en el sitio.
// Corre como función serverless de Vercel (ver `adapter` en astro.config.mjs);
// el resto del sitio sigue siendo estático.
export const prerender = false;

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-20b';

const MAX_QUESTION_CHARS = 500;
// gpt-oss-20b tiene 131k tokens de contexto; toda la doc de Kilo son
// ~28,000 tokens (~110,000 caracteres). Dejamos margen amplio.
const MAX_CORPUS_CHARS = 150000;

let cachedCorpus: string | null = null;

async function buildCorpus(): Promise<string> {
	if (cachedCorpus) return cachedCorpus;
	const entries = await getCollection('docs');
	const parts = entries.map((entry) => `# ${entry.data.title}\n\n${entry.body ?? ''}`);
	cachedCorpus = parts.join('\n\n---\n\n').slice(0, MAX_CORPUS_CHARS);
	return cachedCorpus;
}

export const POST: APIRoute = async ({ request }) => {
	const apiKey = import.meta.env.GROQ_API_KEY ?? process.env.GROQ_API_KEY;
	if (!apiKey) {
		return json({ error: 'Falta GROQ_API_KEY en el servidor.' }, 500);
	}

	let body: { question?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Body inválido.' }, 400);
	}

	const question = (body.question ?? '').trim().slice(0, MAX_QUESTION_CHARS);
	if (!question) {
		return json({ error: 'Falta la pregunta.' }, 400);
	}

	const corpus = await buildCorpus();

	const systemPrompt = `Eres el asistente de la documentación de Kilo (predicción de demanda y recomendación de compras para restaurantes pequeños en Lima).

Reglas de contenido:
- Responde ÚNICAMENTE con información que aparece textualmente en la documentación de abajo. No agregues supuestos, prácticas genéricas de la industria, ni información de otras fuentes.
- Si la pregunta no se puede responder con esta documentación, dilo explícitamente ("Eso no está definido en la documentación") en vez de inventar o completar con conocimiento externo.

Reglas de estilo (importan tanto como el contenido):
- Responde en español, con palabras simples y directas — evita jerga innecesaria. Si usas un término técnico (ej. "Holt-Winters", "IGV"), explícalo en una frase corta entre paréntesis, como lo hace la propia documentación.
- Ve al grano: responde la pregunta en las primeras palabras, sin rodeos ni introducciones largas.
- Usa un registro neutro: nunca "vos/tenés/podés" (voseo argentino) ni "tú" marcado en exceso — escribe como está escrita esta documentación.
- Respuestas breves (unas pocas oraciones), salvo que la pregunta pida explícitamente más detalle.

Documentación completa de Kilo:
"""
${corpus}
"""`;

	const groqRes = await fetch(GROQ_URL, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model: MODEL,
			temperature: 0.2,
			max_tokens: 600,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: question },
			],
		}),
	});

	if (!groqRes.ok) {
		const errText = await groqRes.text();
		return json({ error: `Groq respondió ${groqRes.status}: ${errText.slice(0, 300)}` }, 502);
	}

	const data = (await groqRes.json()) as {
		choices?: { message?: { content?: string } }[];
	};
	const answer = data.choices?.[0]?.message?.content?.trim() ?? 'Sin respuesta.';

	return json({ answer });
};

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}
