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

// Sitios permitidos a llamar este endpoint. No es a prueba de balas (alguien
// con curl puede falsificar el header Origin), pero corta en seco el abuso
// casual y el que un tercero use nuestra key desde su propio sitio.
const ALLOWED_ORIGINS = ['https://kilo-docs-mu.vercel.app', 'http://localhost:4321'];

export const POST: APIRoute = async ({ request }) => {
	const origin = request.headers.get('origin');
	if (origin && !ALLOWED_ORIGINS.includes(origin)) {
		return json({ error: 'Origen no permitido.' }, 403);
	}

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
- Excepción explícita 1 — ejemplos: si te piden un EJEMPLO de cómo funciona un mecanismo que SÍ está documentado (ej. "dame un ejemplo distinto de cómo predice el motor"), sí puedes construir un ejemplo nuevo — con un restaurante y números inventados — siempre que aplique correctamente la regla, fórmula o mecanismo real descrito en la documentación. Esto no es inventar información de Kilo, es ilustrar una regla real con datos de ejemplo, igual que ya hace la propia documentación con "El Buen Sazón" y "La Cusqueñita". Deja siempre claro que es un ejemplo hipotético, no un caso real de la plataforma.
- Excepción explícita 2 — conceptos generales: si la documentación NOMBRA un término o concepto general sin explicarlo a fondo (ej. "Holt-Winters", "suavizamiento exponencial", "IGV"), sí puedes usar tu conocimiento general para explicar ESE concepto con más profundidad — es lo mismo que ya hace la documentación al glosar términos entre paréntesis, solo que más extenso. La línea que nunca se cruza: tu conocimiento general puede explicar QUÉ ES un concepto, pero nunca puede afirmar CÓMO LO USA KILO específicamente, ni sus números, decisiones o diseño — eso sale solo de la documentación. Si la pregunta no menciona ni se relaciona con ningún concepto de la documentación (ej. temas de otro curso, cultura general), sigue aplicando la regla 1: no está definido acá.

Reglas de estilo (importan tanto como el contenido):
- Responde en español, con palabras simples y directas — evita jerga innecesaria. Si usas un término técnico (ej. "Holt-Winters", "IGV"), explícalo en una frase corta entre paréntesis, como lo hace la propia documentación.
- Ve al grano: responde la pregunta en las primeras palabras, sin rodeos ni introducciones largas.
- Usa un registro neutro: nunca "vos/tenés/podés" (voseo argentino) ni "tú" marcado en exceso — escribe como está escrita esta documentación.
- Sé tan breve como se pueda sin sacrificar que se entienda — no hay un número fijo de oraciones. Lo que hay que evitar es el relleno: no repitas la pregunta, no des una introducción antes de responder, no agregues contexto que nadie pidió.
- Puedes usar markdown simple cuando de verdad ayude a leer mejor: **negrita** para resaltar un número o término clave, tabla con "|" cuando compares varias opciones (planes, tarifas, alternativas) lado a lado, lista numerada o con guiones cuando sea genuinamente una secuencia de pasos. El sistema sí renderiza este formato.
- No abuses del formato: si la respuesta es una sola idea o una explicación corrida, escríbela en prosa normal, sin forzar una lista o tabla donde no aporta.

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
	// El campo "answer" es texto en markdown (no HTML) — el cliente lo renderiza
	// con un conversor propio chico (ver ask-widget.js), no un parser completo.
	const answer = data.choices?.[0]?.message?.content?.trim() ?? 'Sin respuesta.';

	return json({ answer });
};

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}
