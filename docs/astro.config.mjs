import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeNova from 'starlight-theme-nova';
import starlightLlmsTxt from 'starlight-llms-txt';

export default defineConfig({
	site: 'https://kilo-docs-mu.vercel.app',
	integrations: [
		starlight({
			title: 'Kilo Docs',
			plugins: [starlightThemeNova(), starlightLlmsTxt()],
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
