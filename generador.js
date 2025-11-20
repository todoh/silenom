// =================================================================
// ARCHIVO PRINCIPAL: generador.js
// =================================================================
// CONTIENE:
// 1. Configuración y utilidades (Alertas, Canvas, API calls)
// 2. Manejo del DOM y Eventos de UI
// 3. Funciones de guardado y 3D
// 4. El punto de entrada (DOMContentLoaded)
// =================================================================

// -----------------------------------------------------------------
// MÓDULO 1: CONFIGURACIÓN Y UTILIDADES
// -----------------------------------------------------------------
 
const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 1024;

let lastGeneratedSceneData = null;
let fabricCanvas = null;

function showCustomAlert(message) {
    const existingAlert = document.getElementById('custom-alert-modal');
    if (existingAlert) existingAlert.remove();

    const modal = document.createElement('div');
    modal.id = 'custom-alert-modal';
    modal.style.cssText = `position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background-color: #2c3e50; color: #ecf0f1; padding: 15px 25px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); z-index: 1001; display: flex; align-items: center; gap: 15px; font-family: sans-serif;`;
    modal.innerHTML = `<p style="margin: 0;">${message}</p><button style="padding: 5px 10px; background-color: #3498db; color: #fff; border: none; border-radius: 5px; cursor: pointer;">OK</button>`;
    document.body.appendChild(modal);
    modal.querySelector('button').onclick = () => modal.remove();
    setTimeout(() => modal.remove(), 5000);
}

const delay = ms => new Promise(res => setTimeout(res, ms));

// -----------------------------------------------------------------
// MÓDULO 2: MANEJO DEL DOM Y EVENTOS
// -----------------------------------------------------------------

const DOM = {
    promptInput: document.getElementById('user-prompt-input'),
    generateButton: document.getElementById('btn-generate'),
    saveButton: document.getElementById('btn-save-generation'),
    statusMessage: document.getElementById('status-message'),
    canvas: document.getElementById('render-canvas'),
    renderContainer: document.getElementById('render-container'),
};

function inicializarEventos() {
    if (DOM.generateButton) DOM.generateButton.addEventListener('click', handleGeneration);
    if (DOM.saveButton) DOM.saveButton.addEventListener('click', handleSaveCurrentCanvas);
    if (DOM.promptInput) {
        DOM.promptInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGeneration();
            }
        });
    }

    if (DOM.canvas) {
        DOM.canvas.width = CANVAS_WIDTH;
        DOM.canvas.height = CANVAS_HEIGHT;
        fabricCanvas = new fabric.Canvas(DOM.canvas);
        fabricCanvas.setBackgroundColor('#f0f0f0', fabricCanvas.renderAll.bind(fabricCanvas));
    }
}

function actualizarUI(generando, mensaje = '') {
    if (DOM.statusMessage) DOM.statusMessage.textContent = mensaje;
    if (DOM.generateButton) DOM.generateButton.disabled = generando;
    if (DOM.saveButton) DOM.saveButton.style.display = !generando && lastGeneratedSceneData ? 'inline-block' : 'none';
    if (DOM.renderContainer) DOM.renderContainer.style.display = 'block';
    console.log(`[GENERADOR]: ${mensaje}`);
}

// -----------------------------------------------------------------
// MÓDULO 3: LÓGICA DE GENERACIÓN (Handler Principal)
// -----------------------------------------------------------------

async function handleGeneration() {
    const userPrompt = DOM.promptInput.value.trim();
    if (!userPrompt) {
        showCustomAlert("Por favor, describe la imagen que quieres crear.");
        return;
    }

    lastGeneratedSceneData = null;
    actualizarUI(true, 'Generando concepto y SVG con la IA...');

    try {
        // Esta función (createUnifiedPrompt) debe estar definida en generadorsvg.js
        const prompt = await createUnifiedPrompt(userPrompt);
        
        // Esta función (callGenerativeApi) está definida abajo
        const generatedData = await callGenerativeApi(prompt, 'gemini-2.0-flash', true);

        const { nombre, descripcion, etiqueta, arco, svgContent } = generatedData;

        if (!svgContent) {
            throw new Error("El JSON de la IA no contenía la propiedad 'svgContent'.");
        }

        actualizarUI(true, 'Cargando SVG en el canvas...');
        await delay(100);

        fabricCanvas.clear();
        fabricCanvas.setBackgroundColor('#f0f0f0', fabricCanvas.renderAll.bind(fabricCanvas));

        fabric.loadSVGFromString(svgContent, (objects, options) => {
            if (!objects || objects.length === 0) {
                showCustomAlert("Error: El SVG generado no pudo ser interpretado o estaba vacío.");
                actualizarUI(false, 'Error al parsear SVG.');
                return;
            }

            const group = fabric.util.groupSVGElements(objects, options);
            const scaleFactor = Math.min((fabricCanvas.width * 0.9) / group.width, (fabricCanvas.height * 0.9) / group.height);
            group.scale(scaleFactor);
            group.set({ left: fabricCanvas.width / 2, top: fabricCanvas.height / 2, originX: 'center', originY: 'center' });

            fabricCanvas.add(group);
            fabricCanvas.renderAll();

            lastGeneratedSceneData = { nombre, descripcion, etiqueta, arco, svgContent };
            actualizarUI(false, '¡Imagen y metadatos generados con éxito!');
        });

    } catch (error) {
        console.error("Error en el proceso de generación:", error);
        actualizarUI(false, `Error: ${error.message}`);
        lastGeneratedSceneData = null;
    }
}

// -----------------------------------------------------------------
// MÓDULO 4: GESTIÓN DE DATOS Y GUARDADO
// -----------------------------------------------------------------

function handleSaveCurrentCanvas() {
    if (!fabricCanvas || !lastGeneratedSceneData) {
        showCustomAlert("No hay ninguna imagen generada para guardar.");
        return;
    }

    const imageDataUrl = fabricCanvas.toDataURL({
        format: 'png',
        backgroundColor: 'transparent'
    });

    try {
        if (typeof agregarPersonajeDesdeDatos === 'undefined') {
            throw new Error("La función 'agregarPersonajeDesdeDatos' no está disponible.");
        }

        agregarPersonajeDesdeDatos({
            nombre: lastGeneratedSceneData.nombre,
            descripcion: lastGeneratedSceneData.descripcion,
            imagen: imageDataUrl,
            svgContent: lastGeneratedSceneData.svgContent,
            etiqueta: lastGeneratedSceneData.etiqueta,
            arco: lastGeneratedSceneData.arco || 'sin_arco'
        });
        showCustomAlert(`Elemento guardado como "${lastGeneratedSceneData.nombre}" en Datos.`);

    } catch (error) {
        console.error("Error al guardar la generación:", error);
        showCustomAlert(`Error al guardar: ${error.message}`);
    }
}


// -----------------------------------------------------------------
// MÓDULO 5: FUNCIONES DE AYUDA Y UTILIDADES
// -----------------------------------------------------------------

async function svgToPngDataURL(svgString) {
    return new Promise((resolve, reject) => {
        const staticCanvas = new fabric.StaticCanvas(null, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
        fabric.loadSVGFromString(svgString, (objects, options) => {
            if (!objects || objects.length === 0) {
                return reject(new Error("El SVG generado para la conversión no pudo ser interpretado o estaba vacío."));
            }
            const group = fabric.util.groupSVGElements(objects, options);
            const scaleFactor = Math.min((staticCanvas.width * 0.9) / group.width, (staticCanvas.height * 0.9) / group.height);
            group.scale(scaleFactor);
            group.set({ left: staticCanvas.width / 2, top: staticCanvas.height / 2, originX: 'center', originY: 'center' });
            staticCanvas.add(group);
            staticCanvas.renderAll();
            const dataUrl = staticCanvas.toDataURL({ format: 'png', backgroundColor: 'transparent' });
            resolve(dataUrl);
        });
    });
}

/**
 * Busca y extrae el primer bloque de código SVG de un texto.
 * @param {string} textoCompleto - La respuesta completa de la API.
 * @returns {string|null} El código SVG o null si no se encuentra.
 */
function extraerBloqueSVG(textoCompleto) {
    if (typeof textoCompleto !== 'string') return null;
    const regex = /<svg[\s\S]*?<\/svg>/;
    const match = textoCompleto.match(regex);
    return match ? match[0] : null;
}

/**
 * Detecta un fondo verde croma, lo elimina, neutraliza el "spill" de color en los bordes y recorta.
 * @param {object} imagePart El objeto de imagen original (formato Gemini).
 * @returns {Promise<object>} El objeto de imagen procesado y recortado.
 */
async function removeGreenScreen(imagePart) {
    if (!imagePart?.inlineData?.data) {
        throw new Error("El objeto imagePart para procesar no es válido.");
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);

            // --- PASO 1: Detectar el color del fondo (solo verdes croma) ---
            let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            let data = imageData.data;
            const greenColorCounts = new Map();
            const borderSize = 10;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    // Solo analizamos los píxeles de los bordes
                    if (x < borderSize || x >= canvas.width - borderSize || y < borderSize || y >= canvas.height - borderSize) {
                        const index = (y * canvas.width + x) * 4;
                        const r = data[index];
                        const g = data[index + 1];
                        const b = data[index + 2];

                        // ¡FILTRO MEJORADO! Solo contamos los píxeles que son claramente "verde croma".
                        // Esto evita que se seleccionen fondos de otros colores (blanco, azul, etc.).
                        if (g > r * 1.3 && g > b * 1.3 && g > 90) {
                            const key = `${r},${g},${b}`;
                            greenColorCounts.set(key, (greenColorCounts.get(key) || 0) + 1);
                        }
                    }
                }
            }

            let dominantColorKey = '';
            let maxCount = 0;
            // Buscamos el verde más común entre los que pasaron el filtro
            for (const [key, count] of greenColorCounts.entries()) {
                if (count > maxCount) {
                    maxCount = count;
                    dominantColorKey = key;
                }
            }
            
            if (!dominantColorKey) {
                return reject(new Error("No se pudo detectar un color verde croma dominante en los bordes."));
            }

            const [chromaR, chromaG, chromaB] = dominantColorKey.split(',').map(Number);

            // --- PASO 2: Eliminar el fondo con un borde suave (tolerancia dual) ---
            const hardTolerance = 35;
            const softTolerance = 70;

            for (let i = 0; i < data.length; i += 4) {
                const distance = Math.sqrt(
                    Math.pow(data[i] - chromaR, 2) +
                    Math.pow(data[i + 1] - chromaG, 2) +
                    Math.pow(data[i + 2] - chromaB, 2)
                );

                if (distance < hardTolerance) {
                    data[i + 3] = 0;
                } else if (distance < softTolerance) {
                    const ratio = (distance - hardTolerance) / (softTolerance - hardTolerance);
                    data[i + 3] = Math.floor(data[i + 3] * ratio);
                }
            }
            
            // --- PASO 3: Limpieza de Bordes (De-spill) ---
            // Neutraliza el "halo" verdoso que queda en los bordes.
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];

                // Si el píxel es visible y tiene un tinte verdoso...
                if (a > 0 && g > r && g > b) {
                    // Reduce la intensidad del verde, ajustándolo al promedio de rojo y azul.
                    const newGreen = (r + b) / 2;
                    data[i + 1] = newGreen;
                }
            }

            ctx.putImageData(imageData, 0, 0);

            // --- PASO 4: Recortar el espacio transparente (autocrop) ---
            let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const alpha = data[(y * canvas.width + x) * 4 + 3];
                    if (alpha > 0) {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }

            if (maxX === -1) {
                resolve({ inlineData: { mimeType: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' }});
                return;
            }

            const cropWidth = maxX - minX + 1;
            const cropHeight = maxY - minY + 1;
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = cropWidth;
            cropCanvas.height = cropHeight;
            const cropCtx = cropCanvas.getContext('2d');
            cropCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            
            const newBase64Url = cropCanvas.toDataURL('image/png');
            const newBase64Data = newBase64Url.split(',')[1];

            resolve({
                inlineData: {
                    mimeType: 'image/png',
                    data: newBase64Data
                }
            });
        };

        img.onerror = (err) => reject(new Error("Error al cargar la imagen Base64 para procesarla. Detalles: " + err.message));
        img.src = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    });
}
 
// -----------------------------------------------------------------
// MÓDULO 6: MODELOS 3D (Se quedan en el principal)
// -----------------------------------------------------------------

/**
 * IMPROVED: Genera un modelo 3D en formato JSON a partir de una descripción de usuario.
 */
async function generarModelo3DDesdePrompt(userPrompt) {
    if (!userPrompt) {
        throw new Error("El prompt para generar el modelo 3D no puede estar vacío.");
    }

    console.log(`[Generador 3D] Iniciando para: "${userPrompt}"`);

    const prompt3D = `
        **Rol:** Eres un experto modelador 3D que trabaja con un sistema basado en JSON.
        **Tarea:** Genera un modelo 3D detallado de "${userPrompt}" usando primitivas geométricas y asignando colores.

        **Formato de Salida Obligatorio:**
        Debes responder ÚNICAMENTE con un objeto JSON válido. El objeto debe tener una clave "objects" que contenga un array de objetos.

        **Estructura de cada objeto en el array:**
        - "name": Un nombre descriptivo y único para la pieza (ej: "torso", "rueda_delantera").
        - "geometry": Un objeto que define la forma.
          - "type": El tipo de primitiva. Elige entre: "box", "sphere", "cylinder", "cone", "torus".
          - Parámetros según el tipo:
            - "box": "width", "height", "depth".
            - "sphere": "radius".
            - "cylinder": "radiusTop", "radiusBottom", "height".
            - "cone": "radius", "height".
            - "torus": "radius", "tube".
        - "material": Un objeto con una clave "color".
          - "color": Un NÚMERO ENTERO que representa un color hexadecimal. NO USES COMILLAS.
            - Ejemplos: Rojo (0xff0000) es 16711680. Verde (0x00ff00) es 65280. Blanco (0xffffff) es 16777215.
        - "position": Un objeto con coordenadas "x", "y", "z" para la posición. El suelo está en y=0.
        - "rotation": (Opcional) Un objeto con rotaciones en grados "x", "y", "z".
        - "scale": (Opcional) Un objeto con factores de escala "x", "y", "z". Úsalo para estirar o aplastar las formas. Por defecto es { "x": 1, "y": 1, "z": 1 }.

        **Instrucciones de Modelado CLAVE:**
        1.  **Descomposición:** Descompón "${userPrompt}" en sus partes geométricas más simples. Usa múltiples primitivas para añadir detalle.
        2.  **Construcción Lógica:** Construye el modelo desde la base hacia arriba (el suelo está en Y=0). Evita que los objetos se solapen de forma extraña, a menos que sea intencionado (ej. un brazo dentro de un torso).
        3.  **Color y Coherencia:** Asigna un color lógico a cada parte. Asegúrate de que las piezas estén posicionadas, rotadas y escaladas correctamente para formar un todo coherente.
        4.  **Complejidad:** No te limites a una sola primitiva si el objeto es complejo. Un coche no es solo una caja; tiene ruedas, ventanas, luces, etc.

        **Ejemplo para "un martillo de juez":**
        {
          "objects": [
            { "name": "Cabeza_Martillo", "geometry": { "type": "cylinder", "radiusTop": 1, "radiusBottom": 1, "height": 3 }, "material": { "color": 6177573 }, "position": { "x": 0, "y": 10, "z": 0 }, "rotation": { "x": 0, "y": 0, "z": 90 } },
            { "name": "Mango_Martillo", "geometry": { "type": "cylinder", "radiusTop": 0.4, "radiusBottom": 0.5, "height": 10 }, "material": { "color": 6177573 }, "position": { "x": 0, "y": 5, "z": 0 } }
          ]
        }
    `;

    const modeloJson = await callGenerativeApi(prompt3D, 'gemini-2.5-flash', true);

    if (!modeloJson || !Array.isArray(modeloJson.objects)) {
        throw new Error("La IA no devolvió un formato de modelo 3D JSON válido.");
    }

    return JSON.stringify(modeloJson, null, 2);
}

/**
 * IMPROVED: Edita un modelo 3D JSON existente basándose en una instrucción de usuario.
 */
async function editarModelo3DDesdePrompt(modeloJsonString, userPrompt) {
    if (!userPrompt) {
        throw new Error("El prompt para editar el modelo 3D no puede estar vacío.");
    }
    if (!modeloJsonString) {
        throw new Error("No se ha proporcionado un modelo 3D existente para editar.");
    }

    console.log(`[Editor 3D] Iniciando edición para: "${userPrompt}"`);

    const prompt3DEdit = `
        **Rol:** Eres un preciso asistente de edición de modelos 3D que trabaja con un sistema basado en JSON.
        **Tarea:** Modifica el siguiente modelo 3D JSON basándote ESTRICTAMENTE en la instrucción del usuario.

        **Modelo 3D Actual:**
        \`\`\`json
        ${modeloJsonString}
        \`\`\`

        **Instrucción de Edición del Usuario:** "${userPrompt}"

        **Instrucciones de Edición CLAVE:**
        1.  **Analiza:** Lee la instrucción y encuentra el/los objeto(s) exacto(s) a modificar por su "name".
        2.  **Modifica Mínimamente:** Realiza SÓLO los cambios solicitados. No alteres otras propiedades, no reordenes los objetos ni añadas/elimines objetos a menos que se pida explícitamente.
        3.  **Conserva la Estructura:** Mantén el formato JSON exacto para cada objeto. El formato de color es un NÚMERO ENTERO.
        4.  **Respuesta:** Devuelve el objeto JSON COMPLETO con las modificaciones aplicadas. No incluyas explicaciones.

        **Ejemplo de Modificación:**
        - Si la instrucción es "haz la Cabeza_Martillo más grande", podrías cambiar su "geometry" (ej. aumentar el "radius") o añadir un "scale".
        - Si la instrucción es "pinta el mango de rojo", cambiarías el "color" del objeto "Mango_Martillo" a 16711680.

        **Formato de Salida Obligatorio:**
        Responde ÚNICAMENTE con el objeto JSON válido y completo.
    `;

    const modeloJsonEditado = await callGenerativeApi(prompt3DEdit, 'gemini-2.5-flash', true);

    if (!modeloJsonEditado || !Array.isArray(modeloJsonEditado.objects)) {
        throw new Error("La IA no devolvió un formato de modelo 3D JSON válido tras la edición.");
    }

    return JSON.stringify(modeloJsonEditado, null, 2);
}

// -----------------------------------------------------------------
// MÓDULO 7: LLAMADAS A API (Se quedan en el principal)
// -----------------------------------------------------------------

/**
 * FUNCIÓN DE API GENERAL (TEXTO/JSON)
 * AHORA REQUIERE que le pases la clave a usar.
 */
async function callGenerativeApi(prompt, apiKey, model = 'gemini-2.5-flash', expectJson = true) {
    if (!apiKey) {
        throw new Error("Error de configuración: Se requiere una API Key para esta función.");
    }
    
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };

    if (expectJson) {
        payload.generationConfig = { responseMimeType: "application/json" };
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Error en la API (${response.status}): ${errorBody.error.message}`);
        }

        const data = await response.json();
        const fullRawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!fullRawText) throw new Error("La IA no devolvió contenido.");

        return expectJson ? JSON.parse(fullRawText) : fullRawText.replace(/```svg\n?/, '').replace(/```$/, '');
    } catch (error) {
        console.error("Error en callGenerativeApi:", error);
        throw error;
    }
}

 
/**
 * VERSIÓN FINAL CON CICLOS DE REINTENTOS PARA IMÁGENES
 */
async function callImageApiWithRotation(prompt, model = 'gemini-2.0-flash-preview-image-generation') {
    if (!imageApiKeys || imageApiKeys.length === 0) {
        throw new Error("No hay API keys configuradas para la generación de imágenes. Ve a Configuración ⚙️.");
    }

    const RETRY_CYCLES = 3;
    const maxAttempts = imageApiKeys.length * RETRY_CYCLES;
    
    let lastError = null;
    let currentKeyIndex = 0; 

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const apiKey = imageApiKeys[currentKeyIndex];
        const logPrefix = `[Image API][Intento ${attempt + 1}/${maxAttempts}][Clave #${currentKeyIndex + 1}]`;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
            safetySettings: [
                { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
            ]
        };

        try {
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.status === 429) {
                console.warn(`${logPrefix} La clave ha excedido la cuota. Intentando con la siguiente.`);
                lastError = new Error("Cuota excedida.");
                currentKeyIndex = (currentKeyIndex + 1) % imageApiKeys.length;
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
            
            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(`Error no relacionado con cuota (${response.status}): ${errorBody.error.message}`);
            }

            console.log(`${logPrefix} ✅ Petición de imagen exitosa.`);
            return await response.json();

        } catch (error) {
            lastError = error;
            console.error(`${logPrefix} El intento falló:`, error);
            
            if (!error.message.includes("Cuota excedida")) {
                throw lastError;
            }
            
            currentKeyIndex = (currentKeyIndex + 1) % imageApiKeys.length;
        }
    }

    throw new Error(`Todos los intentos de generación de imagen fallaron. Último error: ${lastError.message}`);
}

// -----------------------------------------------------------------
// --- INICIALIZACIÓN ---
// -----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', inicializarEventos);