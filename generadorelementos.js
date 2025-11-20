// =================================================================
// ARCHIVO: generadorelementos.js
// =================================================================
// CONTIENE:
// 1. Funciones para generar elementos aislados (personajes, objetos)
//    con fondo chroma para su posterior procesamiento.
// 2. Depende de 'removeGreenScreen' y 'callImageApiWithRotation'
//    (definidas en generador.js) y variables globales de API keys.
// =================================================================


async function ultras(userPrompt) { // Renombrada para coincidir con el código que la llama
    if (!userPrompt || userPrompt.trim() === '') {
        const errorMsg = "The user prompt cannot be empty.";
        console.error(errorMsg);
        return { imagen: null, svgContent: null, error: errorMsg };
    }

    console.log(`[Generador con Guardado] Iniciando para: "${userPrompt}"`);

    if (typeof apiKey === 'undefined') {
        const errorMsg = "The global 'apiKey' variable is not defined.";
        console.error(errorMsg);
        return { imagen: null, svgContent: null, error: errorMsg };
    }

    const MODEL_NAME = modelografico;
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

    const payload = {
      "contents": [{
        "parts": [
            // Parte 1: Tu instrucción en texto. Es opcional pero muy recomendable.
            {
                "text": "Genera una nueva imagen BASANDOTE EN el promt: " + userPrompt + ". Si vas a crear personajes antropomorficos usa la imagen de referencia solo para las proporciones realistas adaptandolo al genero y edad del personaje, ajusta la pose para ilustrar la esencia del personaje. Si no es un ser antropomorfico, no tengas en cuenta la imagen de referencia para NADA. Los personajes antropomorficos; HAZLO DE CUERPO ENTERO (desde el calzado o los pies hasta la cabeza) CON EL FONDO COLOR CHROMA VERDE Lime / #00ff00 / #0f0 código de color hex PURO. Si es un objeto, artefacto, animal, planta, vehiculo, ropa, comida, personaje, cualquier cosa que sea un elemento aislado, CREALO sobre FONDO COLOR VERDE Lime / #00ff00 / #0f0 código de color hex PURO "
            },
            
            // Parte 2: La imagen. Aquí es donde pegas tu cadena Base64.
            {
                "inlineData": {
                    "mimeType": "image/png", // ¡Importante! Cambia esto a "image/jpeg" o el formato correcto de tu imagen.
                    "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" // <-- CORRECCIÓN: Esta es la cadena Base64 de un píxel transparente.
                }
            }
        ]
    }],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"]
        },
        "safetySettings": [
            { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
        ]
    };

    // --- MEJORA: Lógica de Reintentos ---
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[Generador con Guardado] Enviando petición (Intento ${attempt}/${maxRetries})...`);
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const responseData = await response.json();

            if (!response.ok) {
                const errorMessage = responseData.error?.message || "Unknown API error.";
                console.error(`API Error Response (Intento ${attempt}):`, response.status, responseData);
                throw new Error(`API Error: ${errorMessage}`);
            }

            console.log(`[Generador con Guardado] Respuesta de API recibida (Intento ${attempt}).`);

            const imagePart = responseData.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

            if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
                let imageToUse = imagePart;

                try {
                    console.log("🖼️ Procesando imagen para quitar fondo verde...");
                    imageToUse = await removeGreenScreen(imagePart);
                    console.log("✅ ¡Imagen procesada con transparencia!");
                } catch (error) {
                    console.error("Fallo el procesamiento de la imagen, se usará la original:", error);
                }

                const base64ImageData = imageToUse.inlineData.data;
                const mimeType = imageToUse.inlineData.mimeType;
                const pngDataUrl = `data:${mimeType};base64,${base64ImageData}`;

                console.log("[Generador] Imagen extraída con éxito. Devolviendo resultado.");

                // Si tenemos éxito, devolvemos el resultado y salimos de la función.
                return { imagen: pngDataUrl, svgContent: null, error: null };

            } else {
                const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "No se encontró contenido de imagen en la respuesta.";
                throw new Error(`La API no devolvió una imagen. Respuesta de texto: ${textResponse}`);
            }

        } catch (error) {
            lastError = error;
            console.error(`[Generador con Guardado] El intento ${attempt} ha fallado:`, error);
            
            // Si no es el último intento, esperamos antes de reintentar.
            if (attempt < maxRetries) {
                console.log("Esperando 2 segundos antes de reintentar...");
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    // Si el bucle termina, significa que todos los intentos fallaron.
    console.error("[Generador con Guardado] Todos los intentos de generación han fallado.");
    return { imagen: null, svgContent: null, error: lastError ? lastError.message : "Error desconocido tras múltiples intentos." };
}
async function ultrascorregir(userPrompt) { // Nombre corregido a 'ultras' para coincidir con el código que la llama
    if (!userPrompt || userPrompt.trim() === '') {
        const errorMsg = "The user prompt cannot be empty.";
        console.error(errorMsg);
        return { imagen: null, svgContent: null, error: errorMsg };
    }

    console.log(`[Generador con Guardado] Iniciando para: "${userPrompt}"`);

    if (typeof apiKey === 'undefined') {
        const errorMsg = "The global 'apiKey' variable is not defined.";
        console.error(errorMsg);
        return { imagen: null, svgContent: null, error: errorMsg };
    }

    const MODEL_NAME = modelografico; // Modelo actualizado a uno más reciente y versátil
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

    // --- CAMBIO 1: Payload simplificado ---
    // El prompt es ahora una descripción directa, y se ha eliminado la parte 'inlineData' vacía.
    const payload = {
        "contents": [{
        "parts": [
            // Parte 1: Tu instrucción en texto. Es opcional pero muy recomendable.
            {
                "text": "Genera una nueva imagen BASANDOTE EN el promt: " + userPrompt 
                + ". Si vas a crear personajes antropomorficos usa la imagen de referencia unicamente como referencia de proporciones realistas y para la pose del personaje. Si no es un ser antropomorfico, no tengas en cuenta la imagen de referencia para NADA. Estilo fotorrealista. Los personajes antropomorficos; HAZLO DE CUERPO ENTERO (desde el calzado o los pies hasta la cabeza) CON EL FONDO COLOR CHROMA VERDE Lime / #00ff00 / #0f0 código de color hex PURO. Si es un objeto, artefacto, animal, planta, vehiculo, ropa, comida, personaje, cualquier cosa que sea un elemento aislado, CREALO sobre FONDO COLOR VERDE Lime / #00ff00 / #0f0 código de color hex PURO"
            },
            
            // Parte 2: La imagen. Aquí es donde pegas tu cadena Base64.
            {
                "inlineData": {
                    "mimeType": "image/png", // ¡Importante! Cambia esto a "image/jpeg" o el formato correcto de tu imagen.
                    "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" // <-- CORRECCIÓN: Reemplazado también en ultrascorregir.
                }
            }
        ]
    }],
        "generationConfig": {
            "responseMimeType": "application/json", // Pedimos JSON para que la respuesta sea estructurada
        },
        "safetySettings": [
            { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
        ]
    };

    try {
        console.log("[Generador con Guardado] Enviando petición a la API de Gemini...");
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json();

        if (!response.ok) {
            const errorMessage = responseData.error?.message || "Unknown API error.";
          //  console.error("API Error Response:", response.status, responseData);
           // throw new Error(`API Error: ${errorMessage}`);
        }

        console.log("[Generador con Guardado] Respuesta de API recibida.");

        // Se busca la parte de la respuesta que contiene la imagen
        const imagePart = responseData.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

        if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
            let imageToUse = imagePart;

            try {
                console.log("🖼️ Procesando imagen para quitar fondo verde...");
                imageToUse = await removeGreenScreen(imagePart);
                console.log("✅ ¡Imagen procesada con transparencia!");
            } catch (error) {
                console.error("Fallo el procesamiento de la imagen, se usará la original:", error);
            }

            const base64ImageData = imageToUse.inlineData.data;
            const mimeType = imageToUse.inlineData.mimeType;
            const pngDataUrl = `data:${mimeType};base64,${base64ImageData}`;

            console.log("[Generador] Imagen extraída. Devolviendo resultado.");

            // --- CAMBIO 2: La función ahora solo devuelve el resultado ---
            // Se ha eliminado la llamada directa a 'actualizarVisual'.
            return { imagen: pngDataUrl, svgContent: null, error: null };

        } else {
            // Si la API no devuelve imagen, se captura la respuesta de texto para depuración.
            const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "No se encontró contenido de imagen en la respuesta.";
            throw new Error(`La API no devolvió una imagen. Respuesta de texto: ${textResponse}`);
        }

    } catch (error) {
        console.error(`[Generador con Guardado] El proceso ha fallado:`, error);
        return { imagen: null, svgContent: null, error: error.message };
    }
}