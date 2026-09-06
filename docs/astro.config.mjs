import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeNova from 'starlight-theme-nova';
import starlightLlmsTxt from 'starlight-llms-txt';
import starlightPageContextAction from 'starlight-page-context-action';
import vercel from '@astrojs/vercel';

export default defineConfig({
	site: 'https://kilo-docs-mu.vercel.app',
	// El sitio se sigue generando estático (cada página HTML se prerenderiza).
	// Solo /api/ask.ts pide `prerender = false` para correr como función serverless.
	adapter: vercel(),
	integrations: [
		starlight({
			title: 'Kilo Docs',
			head: [
				{ tag: 'link', attrs: { rel: 'stylesheet', href: '/ask-widget.css' } },
				{ tag: 'script', attrs: { src: '/ask-widget.js', defer: true } },
			],
			plugins: [
				starlightThemeNova(),
				starlightLlmsTxt(),
				starlightPageContextAction({
					prompt:
						'Lee {url} completo. Responde mis preguntas usando exclusivamente lo que está escrito en esa página — no agregues supuestos, prácticas genéricas de la industria, ni información que no esté ahí. Si algo no está definido en la página, dime explícitamente que no está definido, en vez de inventarlo o completarlo con conocimiento externo. Quiero hacerte preguntas sobre esto.',
				}),
			],
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/JosepRivera/kilo-server' }],
			sidebar: [
				{
					label: 'Producto',
					items: [
						{ label: 'Visión general', slug: 'producto/vision-general' },
						{ label: 'Modelo de negocio', slug: 'producto/modelo-de-negocio' },
						{ label: 'Flujo operativo', items: [{ autogenerate: { directory: 'producto/flujo' } }] },
						{ label: 'Multi-sucursal', slug: 'producto/multi-sucursal' },
						{ label: 'Pagos y pricing', slug: 'producto/pagos-y-pricing' },
						{ label: 'Costos y economía', slug: 'producto/costos' },
						{ label: 'Notificaciones y autenticación', slug: 'producto/notificaciones-y-autenticacion' },
						{ label: 'Preguntas frecuentes', slug: 'producto/preguntas-frecuentes' },
						{ label: 'Decisiones descartadas', slug: 'producto/descartado' },
					],
				},
			],
		}),
	],
});
