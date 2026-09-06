// Widget "Preguntar a la IA": manda solo el contenido de ESTA página
// más la pregunta a /api/ask (Groq, gpt-oss-20b). Sin dependencias.
(function () {
	const CHAT_ICON =
		'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2A10 10 0 0 0 2 12a9.9 9.9 0 0 0 2.3 6.3l-2 2a1 1 0 0 0-.3 1.1 1 1 0 0 0 1 .6h9a10 10 0 0 0 0-20m0 18H5.4l1-1a1 1 0 0 0 0-1.3A8 8 0 1 1 12 20"/></svg>';

	function init() {
		if (document.getElementById('kilo-ask-button')) return; // evita duplicados en navegación SPA

		const button = document.createElement('button');
		button.id = 'kilo-ask-button';
		button.type = 'button';
		button.setAttribute('aria-label', 'Preguntar a la IA sobre esta página');
		button.innerHTML = CHAT_ICON;

		const overlay = document.createElement('div');
		overlay.id = 'kilo-ask-overlay';
		overlay.hidden = true;
		overlay.innerHTML = `
			<div id="kilo-ask-modal" role="dialog" aria-modal="true" aria-label="Preguntar a la IA sobre esta página">
				<div id="kilo-ask-header">
					<span>${CHAT_ICON} Preguntar sobre esta página</span>
					<button id="kilo-ask-close" type="button" aria-label="Cerrar">&times;</button>
				</div>
				<div id="kilo-ask-answer">Preguntá algo sobre el contenido de esta página. Solo responde con lo que está escrito acá.</div>
				<form id="kilo-ask-form">
					<input id="kilo-ask-input" type="text" placeholder="Escribe tu pregunta..." autocomplete="off" />
					<button id="kilo-ask-submit" type="submit">Preguntar</button>
				</form>
			</div>
		`;

		document.body.append(button, overlay);

		const modal = overlay.querySelector('#kilo-ask-modal');
		const answerEl = overlay.querySelector('#kilo-ask-answer');
		const form = overlay.querySelector('#kilo-ask-form');
		const input = overlay.querySelector('#kilo-ask-input');
		const submitBtn = overlay.querySelector('#kilo-ask-submit');

		function openModal() {
			overlay.hidden = false;
			input.focus();
		}
		function closeModal() {
			overlay.hidden = true;
		}

		button.addEventListener('click', openModal);
		overlay.querySelector('#kilo-ask-close').addEventListener('click', closeModal);
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) closeModal(); // clic afuera del modal cierra
		});
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && !overlay.hidden) closeModal();
		});

		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			const question = input.value.trim();
			if (!question) return;

			const pageContent = document.querySelector('.sl-markdown-content')?.innerText ?? '';
			const pageTitle = document.title;

			submitBtn.disabled = true;
			answerEl.textContent = 'Pensando...';

			try {
				const res = await fetch('/api/ask', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ question, pageContent, pageTitle }),
				});
				const data = await res.json();
				answerEl.textContent = res.ok ? data.answer : `Error: ${data.error ?? res.status}`;
			} catch (err) {
				answerEl.textContent = 'Error de red al preguntar.';
			} finally {
				submitBtn.disabled = false;
			}
		});
	}

	document.addEventListener('DOMContentLoaded', init);
	document.addEventListener('astro:page-load', init); // navegación con View Transitions de Astro
})();
