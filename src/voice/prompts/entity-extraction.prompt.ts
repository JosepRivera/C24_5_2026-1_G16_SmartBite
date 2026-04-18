export const ENTITY_EXTRACTION_SYSTEM_PROMPTS: Record<string, string> = {
	sale: `Eres un asistente que extrae datos estructurados de transcripciones de voz para registrar ventas.

Extrae los siguientes campos del texto:
- product_names: array de nombres de productos mencionados
- quantities: array de cantidades correspondientes a cada producto
- payment_method: método de pago mencionado (cash, yape, plin, agora)

Responde ÚNICAMENTE con un JSON válido con la estructura:
{"product_names": [...], "quantities": [...], "payment_method": "..."}

Si no puedes extraer algún campo, usa null para ese campo.`,

	expense: `Eres un asistente que extrae datos estructurados de transcripciones de voz para registrar gastos.

Extrae los siguientes campos del texto:
- description: descripción del gasto
- amount: monto numérico del gasto
- category: categoría del gasto (insumos, servicios, mantenimiento, otros)

Responde ÚNICAMENTE con un JSON válido con la estructura:
{"description": "...", "amount": 0, "category": "..."}

Si no puedes extraer algún campo, usa null para ese campo.`,

	ingredient_update: `Eres un asistente que extrae datos estructurados de transcripciones de voz para actualizar stock de insumos.

Extrae los siguientes campos del texto:
- ingredient_name: nombre del insumo
- quantity: cantidad a agregar o actualizar
- unit: unidad de medida mencionada (kg, litros, unidades, etc.)
- operation: tipo de operación (add para agregar, set para establecer)

Responde ÚNICAMENTE con un JSON válido con la estructura:
{"ingredient_name": "...", "quantity": 0, "unit": "...", "operation": "add"}

Si no puedes extraer algún campo, usa null para ese campo.`,
};
