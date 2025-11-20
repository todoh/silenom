// =================================================================
// ARCHIVO: generadorrealismo.js
// =================================================================
// CONTIENE:
// 1. Funciones de alto nivel para generar imágenes realistas
//    (Superrealista, Portadas, Frames de escenas).
// 2. Depende de funciones en generador.js (API calls, utils)
//    y generadorsvg.js (prompts), y variables globales.
// =================================================================


async function generarImagenSuperrealistaDesdePrompt(userPrompt, modelConfig = {}) {
    if (!userPrompt) {
        throw new Error("El prompt de usuario no puede estar vacío.");
    }
    console.log(`[Generador Superrealista] Iniciando para: "${userPrompt}"`);

    const defaultModels = {
        // Usamos un modelo rápido para el primer SVG base
        step1: 'gemini-2.5-flash',
        // Usamos un modelo más potente para el refinamiento
        step2: 'gemini-2.5-flash',
        // Y un modelo rápido para el toque final
        step3: 'gemini-2.5-flash'
    };
    const models = { ...defaultModels, ...modelConfig };

    // --- PASO 1: Crear el prompt detallado para la generación inicial ---
    console.log(`[Paso 1/4] Creando prompt de generación inicial...`);
    const initialGenerationPrompt = await createUnifiedPrompt(userPrompt);

    // --- PASO 2: Generar el primer SVG (estructural) a partir del prompt ---
    console.log(`[Paso 2/4] Creando SVG estructural con ${models.step1}...`);
    // Se espera un JSON, así que el último argumento es true
    const initialData = await callGenerativeApi(initialGenerationPrompt, models.step1, true);
    if (!initialData || !initialData.svgContent) {
        throw new Error("La IA no devolvió 'svgContent' en la generación inicial.");
    }
    const structuralSvg = initialData.svgContent;
    // Añadimos un log para depurar y ver qué se generó
    console.log("[Paso 2/4] SVG Estructural generado.");

    // --- PASO 3: Crear el prompt para el refinamiento superrealista ---
    console.log(`[Paso 3/4] Refinando a SVG superrealista con ${models.step2}...`);
    // Ahora sí pasamos el SVG real (structuralSvg) a la función que crea el prompt de mejora.
    // Usamos el prompt 'detalle' original como guía de mejora.
    const superRealisticPrompt = createSuperRealisticPrompt(structuralSvg, 
        `Toma este SVG estructural y transfórmalo en una imagen superrealista. Mejora las texturas, la iluminación, y los detalles anatómicos/estructurales basándote en esta descripción: '${userPrompt}'. Asegúrate de que todas las partes estén perfectamente conectadas y las proporciones sean creíbles.`
    );
    const finalSvg = await callGenerativeApi(superRealisticPrompt, models.step2, false);

    if (!finalSvg || !finalSvg.trim().startsWith('<svg')) {
         console.error("Contenido recibido en el paso final que no es un SVG:", finalSvg);
        throw new Error("La IA no devolvió un SVG válido en el paso de refinamiento final.");
    }
    console.log("[Paso 3/4] SVG Superrealista generado.");

    // --- PASO 4: Convertir el SVG final a PNG ---
    console.log("[Paso 4/4] Convirtiendo a PNG...");
    const pngDataUrl = await svgToPngDataURL(finalSvg);

    console.log("[Generador Superrealista] Proceso completado.");
    return { imagen: pngDataUrl, svgContent: finalSvg };
}


/**
 * Orquesta la generación de una portada usando IA para un libro específico.
 * Ahora crea un modal para recopilar detalles y los usa para generar la portada.
 * @param {object} libro - El objeto libro al que se le asignará la portada.
 */
async function generarPortadaConIA(libro) {
    // --- 1. CREACIÓN Y GESTIÓN DEL MODAL ---
    // Usamos una promesa para esperar la entrada del usuario desde el modal.
    const obtenerDatosDelModal = new Promise((resolve, reject) => {
         

        const overlay = document.createElement('div');
        overlay.className = 'ia-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'ia-modal-content';
        modal.innerHTML = `
            <h3>Generar Portada con IA</h3>
            <p>Describe los elementos para crear la portada de "${libro.titulo}".</p>
            <form id="ia-portada-form">
                <label for="ia-titulo">Título del Libro:</label>
                <input type="text" id="ia-titulo" value="${libro.titulo}" required>

                <label for="ia-prompt-visual">Descripción Visual (Prompt):</label>
                <textarea id="ia-prompt-visual" rows="4" placeholder="Ej: Un astronauta solitario mirando una nebulosa de colores..." required></textarea>

                <label for="ia-autores">Autor(es):</label>
                <input type="text" id="ia-autores" placeholder="Ej: C.S. Lewis">

                <label for="ia-editorial">Editorial:</label>
                <input type="text" id="ia-editorial" placeholder="Ej: Planeta">

                <div class="ia-modal-buttons">
                    <button type="button" class="btn-cancelar">Cancelar</button>
                    <button type="submit" class="btn-generar">Generar</button>
                </div>
            </form>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const form = modal.querySelector('#ia-portada-form');
        const btnCancel = modal.querySelector('.btn-cancelar');

        const closeModal = () => document.body.removeChild(overlay);

        form.onsubmit = (e) => {
            e.preventDefault();
            const datos = {
                titulo: form.querySelector('#ia-titulo').value,
                promptVisual: form.querySelector('#ia-prompt-visual').value,
                autores: form.querySelector('#ia-autores').value,
                editorial: form.querySelector('#ia-editorial').value,
            };
            closeModal();
            resolve(datos);
        };

        btnCancel.onclick = () => {
            closeModal();
            reject(new Error("Generación cancelada por el usuario."));
        };
        overlay.onclick = (e) => {
             if (e.target === overlay) {
                closeModal();
                reject(new Error("Generación cancelada por el usuario."));
             }
        };
    });

    let datosPortada;
    try {
        // Espera a que el usuario llene y envíe el formulario del modal.
        datosPortada = await obtenerDatosDelModal;
    } catch (error) {
        console.log(error.message);
        return; // Termina la función si el usuario cancela.
    }
    
    // --- 2. LLAMADA A LA API CON LOS DATOS DEL MODAL ---
    
    alert("Generando portada con IA... Esto puede tardar un momento. Por favor, espera.");

    if (typeof apiKey === 'undefined' || !apiKey) {
        alert("Error de configuración: La 'apiKey' global no está definida.");
        return;
    }

    const MODEL_NAME = modelografico;
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

    // ==================== INICIO DE LA CORRECCIÓN ====================
    // Nuevo prompt de texto que utiliza los datos del modal.
    const promptFinal = `Crea una portada de libro artística y profesional.
    - Título del libro (debe ser visible): "${datosPortada.titulo}"
    - Descripción visual de la portada: "${datosPortada.promptVisual}"
    - Nombre del autor (si se proporciona, debe ser visible): "${datosPortada.autores}"
    - Editorial (si se proporciona, inclúyelo discretamente): "${datosPortada.editorial}"
    El diseño debe ser coherente, de alta calidad y adecuado para una portada de libro. 
    En formato vertical panoramico 9/16. 
    El título y el autor y la editorial deben estar bien integrados en la composición. 
    No incluyas el texto del promptVisual en la portada usalo solo para inspirarte y guiarte. `;

    const payload = {
        "contents": [{
            "parts": [
                { "text": promptFinal },
                { "inlineData": { "mimeType": "image/png", "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" } }
            ]
        }],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"]
        },
        // ===================== FIN DE LA CORRECCIÓN ======================
        "safetySettings": [
            { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
        ]
    };

    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Enviando petición para portada (Intento ${attempt}/${maxRetries})...`);
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const responseData = await response.json();

            if (!response.ok) {
         //       throw new Error(responseData.error?.message || "Error desconocido de la API.");
            }

            const imagePart = responseData.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

            if (imagePart?.inlineData?.data) {
                let imageToUse = imagePart;
                try {
                    if (typeof removeGreenScreen === 'function') {
                        imageToUse = await removeGreenScreen(imagePart);
                    }
                } catch (error) {
                    console.error("Falló el procesamiento de la imagen, se usará la original:", error);
                }

                const pngDataUrl = `data:${imageToUse.inlineData.mimeType};base64,${imageToUse.inlineData.data}`;
                libro.portadaUrl = pngDataUrl;
                renderizarVisorDeLibros();
                console.log(`Portada generada y asignada al libro "${libro.titulo}".`);
                return;

            } else {
                const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "No se encontró contenido de imagen.";
          //      throw new Error(`La API no devolvió una imagen. Respuesta: ${textResponse}`);
            }

        } catch (error) {
            lastError = error;
            console.error(`Intento ${attempt} fallido:`, error);
            if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    alert(`No se pudo generar la portada. Error: ${lastError?.message || "Error desconocido."}`);
}

/**
 * Creates a modal for the user to enter an artistic style.
 * Returns a promise that resolves with the style text or is rejected if canceled.
 * @returns {Promise<string>} A promise containing the style entered by the user.
 */
function obtenerEstiloDelModal() {
    return new Promise((resolve, reject) => {
        // Injects modal styles if they don't exist
        if (!document.getElementById('ia-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'ia-modal-styles';
            style.textContent = `
                .ia-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 10000; }
                .ia-modal-content { background: #333; color: #fff; padding: 25px; border-radius: 10px; width: 90%; max-width: 500px; box-shadow: 0 5px 20px rgba(0,0,0,0.5); font-family: sans-serif; }
                .ia-modal-content h3 { margin-top: 0; }
                .ia-modal-content textarea { width: 100%; background: #444; color: #fff; border: 1px solid #555; border-radius: 5px; padding: 10px; resize: vertical; margin-bottom: 15px; }
                .ia-modal-buttons { display: flex; justify-content: flex-end; gap: 10px; }
                .ia-modal-buttons button { padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer; }
                .ia-modal-buttons .btn-cancelar { background-color: #555; color: #fff; }
                .ia-modal-buttons .btn-generar { background-color: #0d6efd; color: #fff; }
            `;
            document.head.appendChild(style);
        }

        const existingModal = document.querySelector('.ia-modal-overlay');
        if (existingModal) {
            existingModal.remove();
        }

        const overlay = document.createElement('div');
        overlay.className = 'ia-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'ia-modal-content';
        modal.innerHTML = `
            <h3>Definir Estilo Artístico</h3>
            <p>Escribe el estilo que deseas aplicar a la imagen generada.</p>
            <form id="ia-estilo-form">
                <textarea id="ia-estilo-input" rows="4" placeholder="Ej: Acuarela vibrante, fotorrealista, arte conceptual de ciencia ficción, estilo Ghibli..."></textarea>
                <div class="ia-modal-buttons">
                    <button type="button" class="btn-cancelar">Cancelar</button>
                    <button type="submit" class="btn-generar">Generar</button>
                </div>
            </form>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const form = modal.querySelector('#ia-estilo-form');
        const input = modal.querySelector('#ia-estilo-input');
        const btnCancel = modal.querySelector('.btn-cancelar');
        
        input.focus();

        const closeModal = () => document.body.removeChild(overlay);

        form.onsubmit = (e) => {
            e.preventDefault();
            const estilo = input.value.trim();
            closeModal();
            resolve(estilo);
        };

        btnCancel.onclick = () => {
            closeModal();
            reject(new Error("Generación cancelada por el usuario."));
        };

        overlay.onclick = (e) => {
             if (e.target === overlay) {
                closeModal();
                reject(new Error("Generación cancelada por el usuario."));
             }
        };
    });
}

/**
 * EDITED: Generates an image for a specific frame.
 * If it does not receive a style, it displays a modal for the user to enter it.
 * It then uses the contextual flow of 'ultrasdospasos' for generation.
 * @param {string} escenaId - The ID of the scene.
 * @param {number} frameIndex - The index of the frame.
 * @param {string|null} [estiloOpcional=null] - A predefined style to avoid displaying the modal (used in batches).
 */
async function generarImagenParaFrameConIA(escenaId, frameIndex, estiloOpcional = null) {
    const frame = escenas[escenaId]?.frames?.[frameIndex];

    if (!frame || !frame.texto.trim()) {
        alert("Por favor, escribe un texto en el frame antes de generar una imagen.");
        return;
    }

    const capituloDiv = document.querySelector(`.escena[data-id="${escenaId}"]`);
    const frameDiv = capituloDiv ? capituloDiv.querySelectorAll('.frameh')[frameIndex] : null;

    try {
        let estiloParaGenerar = estiloOpcional;

        // If a style was not passed (individual call), we show the modal to get it
        if (estiloParaGenerar === null) {
            try {
                estiloParaGenerar = await obtenerEstiloDelModal();
            } catch (error) {
                console.log(error.message); // The user canceled the modal
                return; // End the function
            }
        }

        if (frameDiv) {
            frameDiv.classList.add('generando-imagen');
        }

        const userPrompt = frame.texto.trim();
        
        // --- MODIFICATION ---
        // The artistic style is now integrated into the main prompt as part of the description.
        let promptFinal = `Crea una ilustración cinematográfica SIN TEXTO para la siguiente escena: "${userPrompt}${estiloParaGenerar ? `, con un estilo de ${estiloParaGenerar}` : ''}." El aspecto debe ser de 16:9, panorámico horizontal y de alta calidad. EVITA USAR EL TEXTO DE LA ESCENA EN LA IMAGEN.`;

        // PHASE 1: CHARACTER ANALYSIS
        const datosIndexados = [];
        document.querySelectorAll('#listapersonajes .personaje').forEach(p => {
            const nombre = p.querySelector('.nombreh')?.value.trim();
            const descripcion = p.querySelector('.descripcionh')?.value.trim();
            const promptVisual = p.querySelector('.prompt-visualh')?.value.trim();
            if (nombre) {
                datosIndexados.push({ nombre, descripcion, promptVisual });
            }
        });

        if (datosIndexados.length > 0) {
            const contextoPersonajes = datosIndexados.map(p => `- ${p.nombre}: ${p.descripcion}`).join('\n');
            const promptAnalisis = `
                **Contexto:** Tienes una lista de personajes y sus descripciones:
                ${contextoPersonajes}
                **Tarea:** Lee el siguiente texto de una escena y devuelve ÚNICAMENTE un objeto JSON con una clave "personajes_en_escena" que contenga un array con los NOMBRES EXACTOS de los personajes de la lista que aparecen en el texto. Si no aparece ninguno, devuelve un array vacío.
                **Texto de la escena:** "${userPrompt}"
            `;
            if (typeof llamarIAConFeedback === 'function') {
                const respuestaAnalisis = await llamarIAConFeedback(promptAnalisis, "Identificando personajes en toma...", 'gemini-2.5-flash', true);
                if (respuestaAnalisis && Array.isArray(respuestaAnalisis.personajes_en_escena)) {
                    const nombresPersonajes = respuestaAnalisis.personajes_en_escena;
                    const promptsVisuales = nombresPersonajes
                        .map(nombre => datosIndexados.find(p => p.nombre === nombre)?.promptVisual)
                        .filter(Boolean)
                        .join('. ');
                    if (promptsVisuales) {
                        promptFinal += `\n\n**Instrucciones visuales de personajes (muy importante):** ${promptsVisuales}`;
                    }
                }
            }
        }

        // PHASE 2: IMAGE GENERATION
        if (typeof apiKey === 'undefined' || !apiKey) {
            throw new Error("Error de configuración: La 'apiKey' global no está definida.");
        }
        
        const MODEL_NAME = modelografico;
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
        const payload = {
            "contents": [{
                "parts": [
                    { "text": promptFinal },
                    { "inlineData": { "mimeType": "image/png", "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" } }
                ]
            }],
            "generationConfig": { "responseModalities": ["TEXT", "IMAGE"] },
            "safetySettings": [
                { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
            ]
        };

        const maxRetries = 3;
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Enviando petición para imagen de frame (Intento ${attempt}/${maxRetries})...`);
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const responseData = await response.json();

                if (!response.ok) {
                    throw new Error(responseData.error?.message || "Error desconocido de la API.");
                }

                const imagePart = responseData.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

                if (imagePart?.inlineData?.data) {
                    const pngDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                    frame.imagen = pngDataUrl;
                    guardarCambios();
                    actualizarLista();
                    console.log(`Imagen generada y asignada al frame ${frameIndex}.`);
                    return; // Success, exit the function
                } else {
                    const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "No se encontró contenido de imagen.";
                    throw new Error(`La API no devolvió una imagen. Respuesta: ${textResponse}`);
                }
            } catch (error) {
                lastError = error;
                console.error(`Intento ${attempt} fallido:`, error);
                if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        throw lastError || new Error("Error desconocido tras múltiples intentos.");

    } catch (error) {
        alert(`No se pudo generar la imagen para el frame. Error: ${error.message}`);
        console.error("Error en generarImagenParaFrameConIA:", error);
    } finally {
        if (frameDiv) {
            frameDiv.classList.remove('generando-imagen');
        }
    }
}


/**
 * EDITED: Generates batch images. Displays a single modal at the beginning
 * to define the style that will be used for all images in the batch.
 * @param {string} capituloId - The chapter ID.
 * @param {number} startIndex - The starting frame index.
 */
async function generarMultiplesImagenesParaFrameConIA(capituloId, startIndex) {
    const capitulo = escenas[capituloId];
    if (!capitulo) {
        alert("Error: No se encontró el capítulo activo.");
        return;
    }

    const BATCH_SIZE = 9;
    const framesParaProcesar = capitulo.frames.slice(startIndex, startIndex + BATCH_SIZE);

    if (framesParaProcesar.length === 0) {
        alert("No hay frames suficientes para iniciar la generación en lote desde este punto.");
        return;
    }

    if (!confirm(`¿Confirmas la generación de ${framesParaProcesar.length} imágenes con IA (el frame actual y los ${framesParaProcesar.length - 1} siguientes)?`)) {
        return;
    }

    let estiloDelLote;
    try {
        // We show the modal ONCE at the beginning to define the batch style
        estiloDelLote = await obtenerEstiloDelModal();
    } catch (error) {
        console.log(error.message); // The user canceled the operation in the modal
        return;
    }
    
    // It is assumed that 'mostrarIndicadorCarga' is defined globally in main.js
    if (typeof mostrarIndicadorCarga !== 'function') {
        console.error("La función global 'mostrarIndicadorCarga' no está disponible.");
        alert("Error crítico: La función del indicador de carga no está disponible.");
        return;
    }

    mostrarIndicadorCarga(true, `Iniciando lote de ${framesParaProcesar.length} imágenes...`);

    try {
        for (let i = 0; i < framesParaProcesar.length; i++) {
            const frame = framesParaProcesar[i];
            const frameIndexActual = startIndex + i;
            
            mostrarIndicadorCarga(true, `Generando imagen ${i + 1} de ${framesParaProcesar.length}...`);

            // Skip if the frame already has an image or has no text
            if (frame.imagen || !frame.texto.trim()) {
                console.log(`Saltando el frame en el índice ${frameIndexActual} porque ya tiene imagen o le falta texto.`);
                continue;
            }

            // The 'generarImagenParaFrameConIA' function handles the individual generation logic,
            // including visual feedback in the frame itself.
            await generarImagenParaFrameConIA(capituloId, frameIndexActual, estiloDelLote);
            
            // Pause to avoid possible API rate limits and to provide visual feedback
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        alert(`Generación en lote de ${framesParaProcesar.length} imágenes ha finalizado.`);

    } catch (error) {
        console.error("Ocurrió un error durante la generación en lote de frames:", error);
        alert("Ocurrió un error durante la generación en lote. Consulta la consola para más detalles.");
    } finally {
        mostrarIndicadorCarga(false);
    }
}


/**
 * EDITED: Generates a contextual image from a text, accepting an optional style parameter.
 * @param {string} userPrompt - The text for which the image will be generated.
 * @param {string} [estilo=''] - The optional artistic style to apply.
 * @returns {Promise<{imagen: string, svgContent: null, error: string|null}>}
 */
async function ultrasdospasos(userPrompt, estilo = '') {
    if (!userPrompt || !userPrompt.trim()) {
        const errorMsg = "El prompt no puede estar vacío.";
        console.error(errorMsg);
        return { imagen: null, svgContent: null, error: errorMsg };
    }

    if (typeof apiKey === 'undefined' || !apiKey) {
        const errorMsg = "Error de configuración: La 'apiKey' global no está definida.";
        console.error(errorMsg);
        return { imagen: null, svgContent: null, error: errorMsg };
    }

    let promptFinal = `Crea una ilustración SIN TEXTO para la siguiente escena: "${userPrompt}". El aspecto debe ser de 16/9 en formato panorámico horizontal y de alta calidad. EVITA USAR EL TEXTO DE LA ESCENA EN LA IMAGEN.`;

    // LÓGICA MODIFICADA: Añade el estilo pasado como parámetro.
    if (estilo) {
        promptFinal += ` El estilo artístico debe ser: ${estilo}`;
    } else if (typeof estiloArtistico !== 'undefined' && estiloArtistico) {
        // Mantiene la compatibilidad con la variable global si no se pasa un estilo nuevo
        promptFinal += ` El estilo artístico debe ser: ${estiloArtistico}`;
    }

    try {
        // ... (El resto de la función, incluyendo FASE 1 y FASE 2, permanece igual)
        const datosIndexados = [];
        document.querySelectorAll('#listapersonajes .personaje').forEach(p => {
            const nombre = p.querySelector('.nombreh')?.value.trim();
            const descripcion = p.querySelector('.descripcionh')?.value.trim();
            const promptVisual = p.querySelector('.prompt-visualh')?.value.trim();
            if (nombre) {
                datosIndexados.push({ nombre, descripcion, promptVisual });
            }
        });

        if (datosIndexados.length > 0) {
            const contextoPersonajes = datosIndexados.map(p => `- ${p.nombre}: ${p.descripcion}`).join('\n');
            const promptAnalisis = `
                **Contexto:** Tienes una lista de personajes y sus descripciones:\n${contextoPersonajes}
                **Tarea:** Lee el siguiente texto y devuelve un objeto JSON con la clave "personajes_en_escena" que contenga un array con los NOMBRES EXACTOS de los personajes que aparecen. Si no hay ninguno, devuelve un array vacío.
                **Texto de la escena:** "${userPrompt}"`;

            const respuestaAnalisis = await llamarIAConFeedback(promptAnalisis, "Identificando personajes...", 'gemini-2.0-flash', true);
            
            if (respuestaAnalisis?.personajes_en_escena) {
                const promptsVisuales = respuestaAnalisis.personajes_en_escena
                    .map(nombre => datosIndexados.find(p => p.nombre === nombre)?.promptVisual)
                    .filter(Boolean)
                    .join('. ');

                if (promptsVisuales) {
                    promptFinal += `\n\n**Considera estas descripciones visuales para los personajes:** ${promptsVisuales}`;
                    console.log("Prompt enriquecido:", promptFinal);
                }
            }
        }

        const MODEL_NAME = modelografico;
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
     const payload = {
            "contents": [{
                "parts": [
                    // Deja únicamente el objeto que contiene el texto
                    { "text": promptFinal }
                ]
            }],
            "generationConfig": { "responseModalities": ["TEXT", "IMAGE"] },
            "safetySettings": [ /* ... */ ]
        };
        const maxRetries = 3;
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
           try {
    // ... (FASE 1 - Análisis) ...
    // ¡CAMBIO IMPORTANTE! Esta llamada ahora usa la nueva función especializada.
    const responseData = await callImageApiWithRotation(promptFinal, MODEL_NAME);

    // Ya no necesitas el fetch manual aquí, la función lo hace todo.

    const imagePart = responseData.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

    if (imagePart?.inlineData?.data) {
        const pngDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        return { imagen: pngDataUrl, svgContent: null, error: null };
    } else {
         const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "No se encontró contenido.";
         throw new Error(`La API no devolvió una imagen. Respuesta: ${textResponse}`);
    }

} catch (error) {
    console.error(`No se pudo generar la imagen para el prompt "${userPrompt}":`, error);
    return { imagen: null, svgContent: null, error: error.message };
}
        }
        throw lastError || new Error("Error desconocido tras múltiples intentos.");
    } catch (error) {
        console.error(`No se pudo generar la imagen para el prompt "${userPrompt}":`, error);
        return { imagen: null, svgContent: null, error: error.message };
    }
}