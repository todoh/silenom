/**
 * Llama a una API de IA generativa para obtener nuevos elementos para el mapa (POIs, geometrías, etc.).
 * @param {string} prompt - La instrucción del usuario.
 * @param {object} elementosExistentes - El objeto 'elementos' actual del mapa.
 * @param {number} mapaAncho - El ancho del lienzo.
 * @param {number} mapaAlto - El alto del lienzo.
 * @param {string} apiKey - La clave de API del usuario para Gemini.
 * @returns {Promise<object>} Una promesa que se resuelve con un objeto que contiene los nuevos elementos.
 */
async function generarNuevosElementosConIA(prompt, elementosExistentes, mapaAncho, mapaAlto, apiKey) {
    console.log("Enviando a la IA:", { prompt, elementosExistentes });

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // --- ¡PROMPT DEL SISTEMA MEJORADO! ---
    // Ahora le pedimos un objeto más complejo que puede contener diferentes tipos de elementos.
    const systemPrompt = `Eres un asistente experto en la creación de mundos de fantasía. Tu tarea es generar NUEVOS elementos para un mapa. El mapa tiene un tamaño de ${mapaAncho}px de ancho y ${mapaAlto}px de alto.

La estructura completa del mapa es la siguiente:
{
  "mapa": {
    "elementos": {
      "montañas": [ {"nombre": "Cordillera Helada", "coordenadas": [{"x": 150, "y": 200}, {"x": 180, "y": 250}, ...]} ],
      "ríos": [ {"nombre": "Río Veloz", "trayectoria": [{"x": 300, "y": 100}, {"x": 320, "y": 150}, ...]} ],
      "lagos": [ {"nombre": "Lago Espejo", "contorno": [{"x": 400, "y": 400}, {"x": 420, "y": 450}, ...]} ],
      "bosques": [ {"nombre": "Bosque Susurrante", "área": [{"x": 500, "y": 200}, {"x": 530, "y": 240}, ...]} ],
      "pois": [ { "emoji": "🏰", "text": "Castillo del Rey", "x": 100, "y": 150 } ]
    }
  }
}

Basado en la instrucción del usuario y los elementos que ya existen, tu trabajo es añadir nuevos elementos.
Responde ÚNICAMENTE con un objeto JSON que siga esta estructura:
{
  "nuevos_elementos": {
    "pois": [ /* array de nuevos POIs si los hay */ ],
    "montañas": [ /* array de nuevas montañas si las hay */ ],
    "bosques": [ /* array de nuevos bosques si los hay */ ],
    "ríos": [ /* array de nuevos ríos si los hay */ ],
    "lagos": [ /* array de nuevos lagos si los hay */ ]
  }
}

Las claves dentro de "nuevos_elementos" son opcionales. Solo incluye las que generes. Las coordenadas 'x' e 'y' deben estar dentro de los límites del mapa. No incluyas elementos ya existentes en tu respuesta.`;

    try {
        if (!apiKey) throw new Error("La API Key de Gemini no ha sido proporcionada.");

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: systemPrompt + "\n\nInstrucción del usuario: " + prompt + "\n\nElementos existentes: " + JSON.stringify(elementosExistentes) }]
                }]
            })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Error de la API: ${errorBody.error.message}`);
        }

        const data = await response.json();
        const jsonText = data.candidates[0].content.parts[0].text;
        const cleanedJsonText = jsonText.replace(/```json\n|```/g, '').trim();
        const nuevosElementos = JSON.parse(cleanedJsonText);
        return nuevosElementos;

    } catch (error) {
        console.error("Error al llamar a la API de IA:", error);
        alert(`Error al contactar con la IA: ${error.message}`);
        return { nuevos_elementos: {} }; // Devuelve un objeto vacío en caso de error
    }
}

 
/**
 * PASO 1: La IA analiza la petición y el estado del mapa para crear un plan.
 * @param {string} prompt - La instrucción del usuario.
 * @param {object} mapaActual - El objeto del mapa.
 * @param {'crear' | 'editar'} mode - El modo de operación.
 */
async function generarPlanDeCambiosIA(prompt, mapaActual, mode = 'editar') {
    const systemPrompt = `Eres un planificador de mundos de fantasía. Analiza la petición del usuario y el estado actual del mapa. Tu única tarea es devolver un plan de acción conciso en formato JSON.

**Modo de operación actual: ${mode.toUpperCase()}**

- Si el modo es 'CREAR', el plan debe describir un mundo completamente nuevo ignorando el mapa actual.
- Si el modo es 'EDITAR', el plan debe proponer cambios y adiciones al mapa existente.

Ejemplo de respuesta:
{
  "plan": "1. Crear un continente con forma de media luna. 2. Añadir montañas en la costa norte. 3. Colocar una ciudad capital en el centro."
}

Responde ÚNICAMENTE con el objeto JSON.`;

    // Si el modo es 'crear', no enviamos el estado del mapa para no confundir a la IA.
    const mapaContexto = (mode === 'crear') ? '(Ignorar el mapa actual, se creará uno nuevo)' : JSON.stringify(mapaActual);

    const fullPrompt = `${systemPrompt}\n\nPetición del usuario: "${prompt}"\n\nEstado actual del mapa: ${mapaContexto}`;
    
    // Llama a la función robusta de geminialfa.js
    return await llamarIAConFeedback(fullPrompt, "Mapa - Paso 1: Plan de Cambios", 'gemini-2.5-flash-preview-09-2025', true);
}


/**
 * PASO 2: La IA ejecuta el plan, modificando y añadiendo elementos geográficos.
 * Utiliza la función centralizada llamarIAConFeedback.
 */
async function ejecutarCambiosGeograficosIA(plan, mapaActual) {
    const systemPrompt = `Eres un cartógrafo IA experto. Tu tarea es ejecutar un plan de cambios geográficos en un mapa. Puedes añadir nuevos elementos, modificar existentes o crear/reemplazar el continente principal. El mapa mide ${mapaActual.width}x${mapaActual.height}px.

Responde ÚNICAMENTE con un objeto JSON que siga esta estructura. Las claves son opcionales, solo incluye lo que el plan requiera:
{
  "cambios_geograficos": {
    "continente": { "nombre": "Nuevo Continente", "contorno": [{"x": 100, "y": 100}, ...] },
    "añadir": {
      "islas": [ {"nombre": "Isla Perdida", "contorno": [{"x": 800, "y": 600}, ...]} ],
      "montañas": [ {"nombre": "Picos Aéreos", "coordenadas": [{"x": 200, "y": 150}, ...]} ],
      "bosques": [ {"nombre": "Bosque Sombrío", "área": [{"x": 100, "y": 150}, ...]} ],
      "ríos": [ {"nombre": "Río Dorado", "trayectoria": [{"x": 300, "y": 120}, ...]} ]
    },
    "modificar": {
      "ríos": [ {"nombre": "Río Veloz", "nueva_trayectoria": [{"x": 300, "y": 120}, ...]} ]
    }
  }
}

Para 'modificar', proporciona el nombre del elemento existente y la propiedad con el prefijo 'nuevas_'. Por ejemplo, para un río con propiedad 'trayectoria', la nueva propiedad es 'nueva_trayectoria'.`;

    const fullPrompt = `${systemPrompt}\n\nPlan a ejecutar: "${plan}"\n\nMapa actual para modificar: ${JSON.stringify(mapaActual)}`;

    // Llama a la función robusta de geminialfa.js
    return await llamarIAConFeedback(fullPrompt, "Mapa - Paso 2: Cambios Geográficos", 'gemini-2.5-flash-preview-09-2025', true);
}

/**
 * PASO 3: La IA añade Puntos de Interés (POIs) basados en el plan y la nueva geografía.
 * Utiliza la función centralizada llamarIAConFeedback.
 */
async function generarPoisContextualesIA(plan, mapaModificado) {
    const systemPrompt = `Eres un explorador y localizador de puntos de interés. Basándote en un plan y en un mapa actualizado, tu tarea es añadir NUEVOS Puntos de Interés (POIs) que sean relevantes para el contexto. El mapa mide ${mapaModificado.width}x${mapaModificado.height}px.

Responde ÚNICAMENTE con un objeto JSON que siga esta estructura:
{
  "nuevos_pois": [
    { "emoji": "🛖", "text": "Cabaña de la Bruja", "x": 120, "y": 180 }
  ]
}

Si el plan no requiere POIs nuevos, devuelve un array vacío.`;

    const fullPrompt = `${systemPrompt}\n\nPlan a seguir: "${plan}"\n\nMapa actualizado con nueva geografía: ${JSON.stringify(mapaModificado)}`;
    
    // Llama a la función robusta de geminialfa.js
    return await llamarIAConFeedback(fullPrompt, "Mapa - Paso 3: Generar POIs", 'gemini-2.5-flash-preview-09-2025', true);
}

async function generarMasaContinentalIA(plan, mapaActual) {
    const systemPrompt = `Eres un geólogo planetario y cartógrafo. Tu única tarea es diseñar la forma de las masas de tierra basándote en un plan. El mapa mide ${mapaActual.width}x${mapaActual.height}px. No añadas ríos, montañas ni bosques todavía. Solo la silueta de la tierra.

Responde ÚNICAMENTE con un objeto JSON que siga esta estructura:
{
  "masas_de_tierra": {
    "continente": { "nombre": "Continente Principal", "contorno": [{"x": 100, "y": 100}, ...] },
    "islas": [
      { "nombre": "Isla Norte", "contorno": [{"x": 200, "y": 50}, ...]}
    ]
  }
}
Las claves 'continente' e 'islas' son opcionales. Inclúyelas según lo requiera el plan.`;

    const fullPrompt = `${systemPrompt}\n\nPlan a ejecutar: "${plan}"\n\nMapa actual (ignora la geografía existente si el plan pide una nueva): ${JSON.stringify(mapaActual)}`;

    return await llamarIAConFeedback(fullPrompt, "Mapa - Paso 1: Masa Continental", 'gemini-2.5-flash-preview-09-2025', true);
}

// AÑADIR ESTA FUNCIÓN EN mapagemini.js

/**
 * PASO 2: La IA añade los grandes biomas y rasgos geográficos sobre la tierra existente.
 */
async function generarBiomasIA(plan, mapaConTierra) {
    const systemPrompt = `Eres un ecólogo y cartógrafo experto. Sobre la masa de tierra ya definida en el mapa, tu tarea es añadir los principales rasgos geográficos y biomas como montañas, bosques, ríos, lagos y desiertos. Asegúrate de que su ubicación sea lógica (ej: los ríos nacen en las montañas). El mapa mide ${mapaConTierra.width}x${mapaConTierra.height}px.

Responde ÚNICAMENTE con un objeto JSON con los NUEVOS elementos a añadir:
{
  "nuevos_biomas": {
    "montañas": [ {"nombre": "Picos Volcánicos", "coordenadas": [{"x": 200, "y": 150}, ...]} ],
    "bosques": [ {"nombre": "Selva Densa", "área": [{"x": 100, "y": 150}, ...]} ],
    "ríos": [ {"nombre": "Río de Lava", "trayectoria": [{"x": 210, "y": 160}, ...]} ],
    "lagos": [],
    "desiertos": []
  }
}
Solo incluye los tipos de elementos que el plan requiera.`;

    const fullPrompt = `${systemPrompt}\n\nPlan a ejecutar: "${plan}"\n\nMapa actual con la forma de la tierra ya creada: ${JSON.stringify(mapaConTierra)}`;

    return await llamarIAConFeedback(fullPrompt, "Mapa - Paso 2: Biomas", 'gemini-2.5-flash-preview-09-2025', true);
}

 

