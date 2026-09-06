// Endpoint del widget "Preguntar a la IA" embebido en cada página.
// Corre como función serverless de Vercel (ver `adapter` en astro.config.mjs);
// el resto del sitio sigue siendo estático.
export const prerender = false;

import type { APIRoute } from 'astro';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-20b';

// Límites de tamaño para no mandar contenido descontrolado ni gastar de más.
const MAX_PAGE_CHARS = 12000;
const MAX_QUESTION_CHARS = 500;

export const POST: APIRoute = async ({ request }) => {
	const apiKey = import.meta.env.GROQ_API_KEY ?? process.env.GROQ_API_KEY;
	if (!apiKey) {
		return json({ error: 'Falta GROQ_API_KEY en el servidor.' }, 500);
	}

	let body: { pageContent?: string; pageTitle?: string; question?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Body inválido.' }, 400);
	}

	const question = (body.question ?? '').trim().slice(0, MAX_QUESTION_CHARS);
	const pageContent = (body.pageContent ?? '').trim().slice(0, MAX_PAGE_CHARS);
	const pageTitle = (body.pageTitle ?? '').trim().slice(0, 200);

	if (!question || !pageContent) {
		return json({ error: 'Falta la pregunta o el contenido de la página.' }, 400);
	}

	const systemPrompt = `Eres un asistente que responde preguntas sobre UNA sola página de la documentación de Kilo, titulada "${pageTitle}".

Reglas estrictas:
- Responde ÚNICAMENTE con información que aparece textualmente en el contenido de la página de abajo.
- No agregues supuestos, prácticas genéricas de la industria, ni información de otras fuentes.
- Si la pregunta no se puede responder con el contenido de esta página, dilo explícitamente ("Eso no está definido en esta página") en vez de inventar o completar con conocimiento externo.
- Responde en español, de forma breve y directa.

Contenido de la página:
"""
${pageContent}
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
			max_tokens: 500,
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
