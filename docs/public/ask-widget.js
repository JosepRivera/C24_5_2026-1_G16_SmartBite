// Panel "Preguntar a la IA": responde sobre TODA la documentación de Kilo,
// nunca solo la página actual. Manda la pregunta a /api/ask (Groq, gpt-oss-20b).
// Sin dependencias.
(function () {
	const CHAT_ICON =
		'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2A10 10 0 0 0 2 12a9.9 9.9 0 0 0 2.3 6.3l-2 2a1 1 0 0 0-.3 1.1 1 1 0 0 0 1 .6h9a10 10 0 0 0 0-20m0 18H5.4l1-1a1 1 0 0 0 0-1.3A8 8 0 1 1 12 20"/></svg>';
	// Mismo ícono de flecha que ya usa el botón del hero — no uno nuevo inventado.
	const SEND_ICON =
		'<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.92 11.62a1.001 1.001 0 0 0-.21-.33l-5-5a1.003 1.003 0 1 0-1.42 1.42l3.3 3.29H7a1 1 0 0 0 0 2h7.59l-3.3 3.29a1.002 1.002 0 0 0 .325 1.639 1 1 0 0 0 1.095-.219l5-5a1 1 0 0 0 .21-.33 1 1 0 0 0 0-.76Z"/></svg>';

	const SUGGESTIONS = [
		'¿Cómo se calcula el precio mensual?',
		'¿Qué pasa si el dueño pierde el chip?',
		'¿Por qué se eligió Culqi para los cobros?',
	];

	function init() {
		if (document.getElementById('kilo-ask-button')) return; // evita duplicados en navegación SPA

		const button = document.createElement('button');
		button.id = 'kilo-ask-button';
		button.type = 'button';
		button.setAttribute('aria-label', 'Preguntar a la IA sobre la documentación');
		button.innerHTML = CHAT_ICON;

		const scrim = document.createElement('div');
		scrim.id = 'kilo-ask-scrim';
		scrim.hidden = true;

		const panel = document.createElement('aside');
		panel.id = 'kilo-ask-panel';
		panel.hidden = true;
		panel.setAttribute('role', 'dialog');
		panel.setAttribute('aria-label', 'Preguntar a la IA sobre la documentación de Kilo');
		panel.innerHTML = `
			<div id="kilo-ask-header">
				<span>${CHAT_ICON} Preguntar sobre la documentación</span>
				<button id="kilo-ask-close" type="button" aria-label="Cerrar">&times;</button>
			</div>
			<div id="kilo-ask-messages">
				<p id="kilo-ask-intro">Pregunta lo que quieras sobre Kilo. Las respuestas se basan en esta documentación.</p>
				<div id="kilo-ask-suggestions"></div>
			</div>
			<form id="kilo-ask-form">
				<input id="kilo-ask-input" type="text" placeholder="Escribe tu pregunta..." autocomplete="off" />
				<button id="kilo-ask-submit" type="submit" aria-label="Preguntar">${SEND_ICON}</button>
			</form>
		`;

		document.body.append(button, scrim, panel);

		const messagesEl = panel.querySelector('#kilo-ask-messages');
		const suggestionsEl = panel.querySelector('#kilo-ask-suggestions');
		const form = panel.querySelector('#kilo-ask-form');
		const input = panel.querySelector('#kilo-ask-input');
		const submitBtn = panel.querySelector('#kilo-ask-submit');

		for (const text of SUGGESTIONS) {
			const chip = document.createElement('button');
			chip.type = 'button';
			chip.className = 'kilo-ask-chip';
			chip.textContent = text;
			chip.addEventListener('click', () => {
				input.value = text;
				form.requestSubmit();
			});
			suggestionsEl.append(chip);
		}

		function openPanel() {
			scrim.hidden = false;
			panel.hidden = false;
			requestAnimationFrame(() => panel.classList.add('kilo-ask-panel--open'));
			input.focus();
		}
		function closePanel() {
			panel.classList.remove('kilo-ask-panel--open');
			setTimeout(() => {
				panel.hidden = true;
				scrim.hidden = true;
			}, 200);
		}

		button.addEventListener('click', openPanel);
		panel.querySelector('#kilo-ask-close').addEventListener('click', closePanel);
		scrim.addEventListener('click', closePanel);
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && !panel.hidden) closePanel();
		});

		function addBubble(role, text) {
			const bubble = document.createElement('div');
			bubble.className = `kilo-ask-bubble kilo-ask-bubble--${role}`;
			bubble.textContent = text;
			messagesEl.append(bubble);
			messagesEl.scrollTop = messagesEl.scrollHeight;
			return bubble;
		}

		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			const question = input.value.trim();
			if (!question) return;

			suggestionsEl.remove();
			addBubble('user', question);
			input.value = '';
			submitBtn.disabled = true;
			const pending = addBubble('assistant', 'Pensando...');

			try {
				const res = await fetch('/api/ask', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ question }),
				});
				const data = await res.json();
				if (res.ok) {
					pending.textContent = data.answer;
				} else {
					pending.classList.add('kilo-ask-bubble--error');
					pending.textContent = 'No se pudo responder. Intenta de nuevo en un momento.';
				}
			} catch {
				pending.classList.add('kilo-ask-bubble--error');
				pending.textContent = 'Error de red al preguntar. Revisa tu conexión.';
			} finally {
				submitBtn.disabled = false;
				input.focus();
			}
		});
	}

	document.addEventListener('DOMContentLoaded', init);
	document.addEventListener('astro:page-load', init); // navegación con View Transitions de Astro
})();
