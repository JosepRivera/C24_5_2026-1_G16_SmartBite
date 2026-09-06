// Endpoint del panel "Preguntar a la IA" embebido en el sitio.
// Corre como función serverless de Vercel (ver `adapter` en astro.config.mjs);
// el resto del sitio sigue siendo estático.
export const prerender = false;

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// El de 20B daba respuestas vacías con más frecuencia de la aceptable en
// preguntas que combinan varias reglas a la vez (agrupar en mensajes, tablas,
// excepciones). El de 120B cuesta el doble ($0.15/$0.60 vs $0.075/$0.30 por
// millón de tokens), pero eso sigue siendo centavos al mes — vale la pena
// pagarlo por la confiabilidad.
const MODEL = 'openai/gpt-oss-120b';

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
- Cuidado con una confusión común: si la pregunta usa frases como "más allá del documento", "aparte de lo que dice", "fuera de la documentación" pero el TEMA de la pregunta sí aparece en la documentación (ej. "Holt-Winters", "IGV"), esas frases no significan que debas rechazar — significan que te están pidiendo la excepción 2 (explicar el concepto general). Rechaza solo cuando el tema en sí no tiene relación con nada de la documentación.
- Excepción explícita 1 — ejemplos: si te piden un EJEMPLO de cómo funciona un mecanismo que SÍ está documentado (ej. "dame un ejemplo distinto de cómo predice el motor"), sí puedes construir un ejemplo nuevo — con un restaurante y números inventados — siempre que aplique correctamente la regla, fórmula o mecanismo real descrito en la documentación. Esto no es inventar información de Kilo, es ilustrar una regla real con datos de ejemplo, igual que ya hace la propia documentación con "El Buen Sazón" y "La Cusqueñita". Deja siempre claro que es un ejemplo hipotético, no un caso real de la plataforma.
- Excepción explícita 2 — conceptos generales: si la documentación NOMBRA un término o concepto general sin explicarlo a fondo (ej. "Holt-Winters", "suavizamiento exponencial", "IGV"), sí puedes usar tu conocimiento general para explicar ESE concepto con más profundidad — es lo mismo que ya hace la documentación al glosar términos entre paréntesis, solo que más extenso. La línea que nunca se cruza: tu conocimiento general puede explicar QUÉ ES un concepto, pero nunca puede afirmar CÓMO LO USA KILO específicamente, ni sus números, decisiones o diseño — eso sale solo de la documentación. Si la pregunta no menciona ni se relaciona con ningún concepto de la documentación (ej. temas de otro curso, cultura general), sigue aplicando la regla 1: no está definido acá.

Reglas de estilo (importan tanto como el contenido):
- Responde en español, con palabras simples y directas — evita jerga innecesaria. Si usas un término técnico (ej. "Holt-Winters", "IGV"), explícalo en una frase corta entre paréntesis, como lo hace la propia documentación.
- Ve al grano: responde la pregunta en las primeras palabras, sin rodeos ni introducciones largas.
- Usa un registro neutro: nunca "vos/tenés/podés" (voseo argentino) ni "tú" marcado en exceso — escribe como está escrita esta documentación.
- Sé tan breve como se pueda sin sacrificar que se entienda — no hay un número fijo de oraciones. Lo que hay que evitar es el relleno: no repitas la pregunta, no des una introducción antes de responder, no agregues contexto que nadie pidió.
- Puedes usar markdown simple cuando de verdad ayude a leer mejor: **negrita** para resaltar un número o término clave, tabla con "|" cuando compares varias opciones (planes, tarifas, alternativas) lado a lado, lista numerada o con guiones cuando sea genuinamente una secuencia de pasos. El sistema sí renderiza este formato.
- No abuses del formato: si la respuesta es una sola idea o una explicación corrida, escríbela en prosa normal, sin forzar una lista o tabla donde no aporta.
- Esto se muestra como una serie de mensajes de chat, como WhatsApp. Si tu respuesta tiene más de una idea separada, parte cada idea en su propio mensaje escribiendo una línea que diga exactamente "---MSG---" entre una idea y la siguiente. Regla estricta: nunca pongas "---MSG---" en medio de algo que pertenece junto — una frase que presenta una fórmula o tabla siempre va en el MISMO mensaje que la fórmula o tabla que presenta, nunca separada de ella. Si toda tu respuesta es una sola idea, no uses "---MSG---" en absoluto — mándala como un solo mensaje.

Documentación completa de Kilo:
"""
${corpus}
"""`;

	async function callGroq(): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
		const res = await fetch(GROQ_URL, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: MODEL,
				temperature: 0.2,
				max_tokens: 1000,
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: question },
				],
			}),
		});
		if (!res.ok) {
			const errText = await res.text();
			return { ok: false, error: `Groq respondió ${res.status}: ${errText.slice(0, 300)}` };
		}
		const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
		return { ok: true, text: data.choices?.[0]?.message?.content?.trim() ?? 'Sin respuesta.' };
	}

	// Un modelo chico ocasionalmente corta la respuesta en algo casi vacío
	// (variación normal de muestreo, no un error de la API). El mensaje de
	// rechazo real mide ~40 caracteres, así que una respuesta más corta que
	// eso probablemente sea degenerada, no una respuesta corta legítima.
	// Hasta 3 intentos en total antes de rendirse.
	const MAX_ATTEMPTS = 3;
	let result = await callGroq();
	for (let attempt = 1; attempt < MAX_ATTEMPTS && result.ok && result.text.length < 25; attempt++) {
		result = await callGroq();
	}

	if (!result.ok) {
		return json({ error: result.error }, 502);
	}

	// El campo "answer" es texto en markdown (no HTML) — el cliente lo renderiza
	// con un conversor propio chico (ver ask-widget.js), no un parser completo.
	let answer = result.text;
	if (answer.includes('no está definido en la documentación')) {
		answer += '\n\nSi crees que sí debería estar, prueba reformular la pregunta enfocándola directamente en el tema — frases como "fuera de la documentación" o "más allá del documento" a veces confunden al asistente.';
	}

	return json({ answer });
};

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}
