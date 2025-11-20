 

/**
 * [NUEVA FUNCIÓN DE RENDERIZADO]
 * Dibuja el SVG en un canvas panorámico, lo convierte a PNG y lo guarda en el nodo.
 * @param {HTMLElement} nodo - El nodo del momento que se va a actualizar.
 * @param {string} svgContent - El código SVG generado por la IA.
 */
async function guardarIlustracionEnNodo(nodo, svgContent) {
    // 1. Guardamos el SVG crudo en el dataset del nodo.
    // Esto es clave para la exportación y para futuras ediciones.
    nodo.dataset.svgIlustracion = svgContent;

    // 2. Creamos un Data URL directamente desde el string SVG para la visualización.
    // Usamos btoa para codificar en base64 y unescape/encodeURIComponent para manejar caracteres especiales.
    const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)));

    // 3. Actualizamos la imagen en el nodo del lienzo principal.
    const imgElementoEnNodo = nodo.querySelector('.momento-imagen');
    if (imgElementoEnNodo) {
        imgElementoEnNodo.src = svgDataUrl;
        nodo.classList.add('con-imagen');
    }

    // 4. Actualizamos la vista previa en el panel de edición si está abierto.
    const imgPreviewEnPanel = document.getElementById('panel-editor-imagen-preview');
    if (imgPreviewEnPanel && panelState.nodoActual === nodo) {
        imgPreviewEnPanel.src = svgDataUrl;
        imgPreviewEnPanel.style.display = 'block';
    }
    
    // La función ya no necesita ser una promesa explícita.
    return Promise.resolve();
}
 

/**
 * [NUEVA FUNCIÓN - El Constructor de Prompts]
 * Crea el prompt final para el ilustrador, combinando la acción del momento
 * con la guía de diseño detallada.
 * @param {string} descripcionMomento - La descripción original de la escena.
 * @param {object} elementosDescritos - El objeto con las descripciones visuales para la escena.
 * @returns {string} El prompt de ilustración final y detallado.
 */
function crearPromptConsistenteParaEscena(descripcionMomento, elementosDescritos) {
    let guiaVisualTexto = "Usa la siguiente guía de diseño obligatoria para los elementos:\n";
    for (const [elemento, descripcion] of Object.entries(elementosDescritos)) {
        guiaVisualTexto += `- **${elemento}:** ${descripcion}\n`;
    }

    // El prompt de ilustración original, ahora enriquecido
    return `
        Eres un ilustrador experto en crear escenas y paisajes atmosféricos en formato SVG.
        Tu tarea es convertir una descripción textual en una ilustración SVG panorámica, siguiendo una guía de diseño estricta.

        **Descripción de la Escena a Ilustrar:**
        ---
        ${descripcionMomento}
        ---

        **Guía de Diseño OBLIGATORIA:**
        ---
        ${guiaVisualTexto}
        ---

        **Instrucciones de Dibujo OBLIGATORIAS:**
        1.  **Estilo:** Utiliza un estilo de ilustración "flat design" o "vectorial limpio".
        2.  **Composición:** Crea una escena completa con fondo, plano medio y primer plano.
        3.  **Atmósfera:** Usa el color y la iluminación para transmitir la atmósfera descrita.
        4.  **Formato SVG Panorámico:** El SVG DEBE usar un viewBox="0 0 1920 1080".
        5.  **Fondo Transparente:** El fondo debe ser transparente.

        **Formato de Respuesta OBLIGATORIO:**
        Responde ÚNICAMENTE con un objeto JSON válido: { "svgContent": "<svg>...</svg>" }
    `;
}

 
/**
 * [MODIFICADA CON PASO DE COMPOSICIÓN]
 * Realiza el trabajo de generar y refinar la imagen para un único nodo.
 * Ahora incluye un "Paso 0" para decidir qué elementos de la guía usar.
 * @param {HTMLElement} nodo - El nodo del momento a procesar.
 * @param {object} guiaDeDiseno - La guía de diseño MAESTRA generada por el analizador.
 * @returns {Promise<{status: string, id: string, error?: string}>} El resultado del proceso.
 */
async function generarYRefinarImagenParaNodo(nodo, guiaDeDiseno) {
    const tituloNodo = nodo.querySelector('.momento-titulo').textContent;
    const descripcionMomento = nodo.dataset.descripcion;

    try {
        // --- PASO 0: Composición de la Escena ---
        // Se hace una llamada a la IA para que decida qué elementos de la guía aplican a esta escena.
        const promptComposicion = `
            Eres un Director de Fotografía y Compositor de Escenas. Tu misión es interpretar la narrativa de una escena y seleccionar los elementos visuales precisos de un catálogo para construirla.

            **FILOSOFÍA DE COMPOSICIÓN:**
            - **Menos es más:** Selecciona SOLO los elementos esenciales para contar la historia de este momento. No satures la escena.
            - **Foco narrativo:** Tu selección debe guiar la mirada del espectador hacia el punto clave de la descripción.
            - **Respeto al catálogo:** No inventes elementos. Usa únicamente los que se proveen en la guía de diseño.

            **Guía de Diseño Disponible (Catálogo de Elementos):**
            ---
            ${JSON.stringify(guiaDeDiseno, null, 2)}
            ---

            **Descripción de la Escena Específica a Componer:**
            ---
            "${descripcionMomento}"
            ---

            **Tu Tarea:**
            1. Lee la "Descripción de la Escena Específica".
            2. Revisa la "Guía de Diseño Disponible" y elige SÓLO los elementos que aparecen explícita o implícitamente en la descripción.
            3. Devuelve ÚNICAMENTE un objeto JSON con una clave "elementos". El valor será un objeto que contiene solo los elementos seleccionados y sus descripciones completas de la guía.

            **Ejemplo de respuesta JSON esperada:**
            {
              "elementos": {
                "Kaelen, el Guardián del Velo": {
                  "Concepto Central": "Un antiguo guerrero cuya armadura se ha fusionado con la corteza de un árbol arcano...",
                  "F - Forma y Estructura": "Silueta imponente y ancha...",
                  "M - Material y Textura": "La armadura es de un metal similar al bronce...",
                  "C - Paleta de Color": "Tonos tierra dominantes...",
                  "L - Interacción con la Luz": "La superficie es mayormente mate...",
                  "Detalles Distintivos": "Una enredadera con pequeñas flores blancas..."
                },
                "Puente de los Susurros": "..."
              }
            }
        `;
        
        const feedbackComposicion = `Componiendo: "${tituloNodo}"`;
        const respuestaComposicion = await llamarIAConFeedback(promptComposicion, feedbackComposicion, 'gemini-2.5-flash-lite', true, 1);
        
        if (!respuestaComposicion || !respuestaComposicion.elementos) {
            throw new Error("La IA de composición no devolvió una lista de elementos válida.");
        }
        
        // Creamos el prompt de ilustración final con los elementos seleccionados para esta escena.
        const promptConsistente = crearPromptConsistenteParaEscena(descripcionMomento, respuestaComposicion.elementos);


        // --- PASO A: Generar Borrador (utiliza el prompt recién creado) ---
        const respuestaIlustracion = await llamarIAConFeedback(promptConsistente, `Ilustrando: "${tituloNodo}"`, 'gemini-2.5-flash', true, 1);
        if (!respuestaIlustracion || !respuestaIlustracion.svgContent) {
            throw new Error("La IA no devolvió un borrador de SVG.");
        }
        const svgInicial = respuestaIlustracion.svgContent;

        // --- PASO B: Primer Refinamiento (Artístico) ---
        const promptDeMejoraGenerico = `
            Eres un Artista Digital especialista en refinamiento de ilustraciones SVG. Tu tarea es tomar un borrador y elevarlo a un nivel profesional.

            **FILOSOFÍA DE REFINAMIENTO:**
            - **Mejora, no reemplaces:** Mantén la composición y los elementos centrales del borrador. Tu trabajo es embellecerlo.
            - **Coherencia Visual:** Respeta el estilo y las descripciones de la guía de diseño implícita en el SVG original.
            - **Impacto Emocional:** Usa la luz, el color y la textura para acentuar la atmósfera descrita en la escena.

            **Tu Tarea:**
            1. Analiza el SVG base.
            2. Mejora la **iluminación**: añade fuentes de luz creíbles, sombras profundas y brillos para dar volumen.
            3. Enriquece las **texturas**: simula las superficies descritas (metal, piedra, tela, piel).
            4. Refina el **trazado**: ajusta el grosor de las líneas para crear profundidad y foco.
            5. Devuelve únicamente el código SVG mejorado.
        `;
        const svgMejorado = await mejorarSVG(svgInicial, promptDeMejoraGenerico, `Refinando: "${tituloNodo}"`, 'gemini-2.0-flash');

        // --- PASO C: Refinamiento Final ---
        const svgRefinadoFinal = svgMejorado;
        
        // --- PASO D: Guardar en el nodo ---
        await guardarIlustracionEnNodo(nodo, svgRefinadoFinal);

        return { status: 'fulfilled', id: nodo.id };

    } catch (error) {
        console.error(`Error procesando el nodo ${nodo.id}:`, error);
        const imgElemento = nodo.querySelector('.momento-imagen');
        if (imgElemento) imgElemento.parentElement.innerHTML += '<p style="color:red; font-size:10px;">Error IA</p>';
        
        return { status: 'rejected', id: nodo.id, error: error.message };
    }
}

/**
 * [VERSIÓN FINAL EN PARALELO Y POR LOTES]
 * Orquesta la ilustración de todos los momentos aplicando una fase de análisis secuencial
 * seguida de una fase de generación y refinamiento en paralelo por lotes de 12.
 */
/**
 * [NUEVA FUNCIÓN AYUDANTE PARA LOTES]
 * Se encarga de procesar un único lote de imágenes en paralelo.
 * @param {Array} lote - El array de nodos con datos para procesar.
 * @param {number} numeroDeLote - El número identificador del lote (ej. 1, 2, 3...).
 * @param {number} totalLotes - El número total de lotes.
 */
async function procesarLote(lote, numeroDeLote, totalLotes) {
    console.log(`--- INICIANDO LOTE ${numeroDeLote} de ${totalLotes} ---`);
    
    // Actualizamos la barra de progreso al iniciar el lote.
    // El progreso se calcula basado en el número de lotes que han comenzado.
    const progress = 30 + ((numeroDeLote - 1) / totalLotes) * 70;
    progressBarManager.set(progress, `Procesando lote ${numeroDeLote} de ${totalLotes} (${lote.length} imágenes en paralelo)...`);

    // Creamos el array de promesas para el lote actual.
    const promesasDelLote = lote.map(({ nodo, promptConsistente }) =>
        generarYRefinarImagenParaNodo(nodo, promptConsistente)
    );

    // Ejecutamos todas las promesas del lote en paralelo y esperamos a que terminen.
    const resultados = await Promise.allSettled(promesasDelLote);
    
    console.log(`--- LOTE ${numeroDeLote} FINALIZADO. Resultados:`, resultados);
}
 
/**
 * Analiza un lote de momentos o escenas para expandir una guía de diseño visual existente.
 * Utiliza un prompt detallado para instruir a la IA a actuar como un Director de Arte,
 * asegurando coherencia y descripciones ricas y estructuradas.
 *
 * @param {Array<Object>} loteDeMomentos - El nuevo conjunto de escenas a analizar.
 * @param {Object} guiaDeDisenoExistente - El objeto JSON con la guía de diseño actual.
 * @returns {Promise<Object>} Una promesa que se resuelve con la guía de diseño actualizada.
 * @throws {Error} Si la IA no devuelve la estructura JSON esperada después de varios intentos.
 */
async function analizarLoteDeMomentos(loteDeMomentos, guiaDeDisenoExistente) {
    // --- El Prompt Mejorado ---
    // Este prompt es mucho más detallado para guiar a la IA hacia un resultado de alta calidad.
    // Define una "persona", una filosofía de diseño y un formato de salida muy específico.
    const promptAnalisisPorLote = `
        Eres un prestigioso Director de Arte y Diseñador de Producción con una visión excepcional para la coherencia visual y la narrativa a través de la imagen. Tu especialidad es crear mundos cohesivos y memorables. Tu tarea es expandir una guía de diseño existente analizando un nuevo lote de momentos o escenas de una historia.

        **FILOSOFÍA DE DISEÑO:**
        - **Coherencia ante todo:** Cada nuevo elemento debe sentirse parte del mismo universo que los elementos existentes.
        - **La forma sigue a la función:** El diseño de un elemento (personaje, objeto, lugar) debe reflejar su propósito, historia y personalidad.
        - **Especificidad sobre generalidad:** Evita descripciones vagas. En lugar de "una espada", describe "una hoja de acero damasquino, con una guarda de bronce en forma de alas de halcón y una empuñadura de cuero gastado".

        **Guía de Diseño Existente (Base para tu trabajo):**
        ---
        ${JSON.stringify(guiaDeDisenoExistente, null, 2)}
        ---

        **Nuevo Lote de Momentos a Integrar:**
        ---
        ${JSON.stringify(loteDeMomentos, null, 2)}
        ---

        **INSTRUCCIONES DETALLADAS:**

        1.  **Analiza Holísticamente:** Lee y comprende todas las escenas del nuevo lote para captar el contexto y las interacciones entre los elementos.
        2.  **Identifica Entidades Clave:** Extrae los sustantivos principales que requieren diseño visual (personajes, criaturas, objetos importantes, localizaciones, vehículos, etc.).
        3.  **Verifica y Reutiliza:** Antes de crear algo nuevo, comprueba rigurosamente si la entidad ya existe en la "Guía de Diseño Existente". Si es así, **DEBES** reutilizar su descripción para mantener la consistencia. No la modifiques.
        4.  **Diseña Nuevas Entidades:** Si una entidad es nueva, crea una descripción visual rica y estructurada. Utiliza el siguiente formato como guía para tus descripciones:
            * **Concepto Central:** Una o dos frases que capturen la esencia del elemento.
            * **F - Forma y Estructura:** Describe su silueta, geometría, proporciones y construcción. ¿Es angular, orgánico, simétrico, caótico?
            * **M - Material y Textura:** ¿De qué está hecho? Describe los materiales (madera, piedra, metal, tela) y sus texturas (rugoso, liso, pulido, oxidado, gastado).
            * **C - Paleta de Color:** Define los colores dominantes, secundarios y de acento. Menciona la saturación y el brillo (p. ej., "ocres desaturados, con toques de carmesí y azul cobalto").
            * **L - Interacción con la Luz:** ¿Cómo refleja, absorbe o emite luz? ¿Es mate, brillante, translúcido, bioluminiscente?
            * **Detalles Distintivos:** Menciona cualquier característica única, como cicatrices, grabados, patrones recurrentes, o símbolos importantes.

        5.  **Genera el JSON Final:** Tu única salida debe ser un objeto JSON que contenga una única clave: \`guiaActualizada\`. El valor de esta clave será la guía de diseño completa, fusionando la guía existente con las nuevas descripciones que has creado. No añadas comentarios, explicaciones ni ningún otro texto fuera del objeto JSON.

        **Ejemplo Detallado de Respuesta JSON Esperada:**
        {
          "guiaActualizada": {
            "Kaelen, el Guardián del Velo": {
              "Concepto Central": "Un antiguo guerrero cuya armadura se ha fusionado con la corteza de un árbol arcano. Irradia una calma estoica y una fuerza latente.",
              "F - Forma y Estructura": "Silueta imponente y ancha. Formas angulares y masivas en la armadura de placas...",
              "M - Material y Textura": "La armadura es de un metal similar al bronce, pero con una pátina verde musgo...",
              "C - Paleta de Color": "Tonos tierra dominantes: marrones profundos, ocres, verdes musgo desaturados...",
              "L - Interacción con la Luz": "La superficie es mayormente mate, absorbiendo la luz...",
              "Detalles Distintivos": "Una enredadera con pequeñas flores blancas crece desde su guantelete derecho..."
            },
            "El Orbe del Silencio": {
              "Concepto Central": "Un artefacto esférico que absorbe todo sonido a su alrededor...",
              "F - Forma y Estructura": "Una esfera perfecta de aproximadamente 30 cm de diámetro...",
              "M - Material y Textura": "Parece obsidiana pulida, pero no refleja la luz...",
              "C - Paleta de Color": "Negro absoluto, un vacío de color...",
              "L - Interacción con la Luz": "Totalmente mate. No produce reflejos...",
              "Detalles Distintivos": "Cuando alguien intenta hablar cerca, finísimas y casi invisibles grietas de luz violeta recorren su superficie..."
            }
          }
        }
    `;

    // --- Lógica de Ejecución y Reintentos ---
    const MAX_INTENTOS = 3;
    const RETRY_DELAY_MS = 2500; // Tiempo de espera entre reintentos

    for (let i = 1; i <= MAX_INTENTOS; i++) {
        try {
            const feedback = `Analizando guía de diseño (${loteDeMomentos.length} escenas, Intento ${i}/${MAX_INTENTOS})...`;
            
            // Asumimos que esta función existe y maneja la llamada a la API de la IA.
            // El 'true' fuerza la respuesta en formato JSON.
            const respuestaIA = await llamarIAConFeedback(promptAnalisisPorLote, feedback, 'gemini-2.5-flash', true, 1);

            // Validación robusta: nos aseguramos de que la respuesta sea un objeto
            // y que contenga la clave `guiaActualizada`, que también debe ser un objeto.
            if (respuestaIA && typeof respuestaIA === 'object' && respuestaIA.guiaActualizada && typeof respuestaIA.guiaActualizada === 'object') {
                console.log(`✅ Análisis de guía de diseño exitoso en el intento ${i}.`);
                return respuestaIA.guiaActualizada; // ¡Éxito! Devolvemos solo el objeto de la guía.
            }
            
            // Si la estructura no es la correcta, lo registramos para depuración.
            console.warn(`Intento ${i}/${MAX_INTENTOS} no devolvió la estructura JSON esperada. Respuesta recibida:`, JSON.stringify(respuestaIA, null, 2));

        } catch (error) {
            // Capturamos errores de red o de la API.
            console.error(`Intento ${i}/${MAX_INTENTOS} falló con un error de API:`, error.message);
        }

        // Esperamos antes del siguiente reintento, solo si no es el último intento.
        if (i < MAX_INTENTOS) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }
    
    // Si todos los intentos fallan, lanzamos un error claro.
    throw new Error("La IA de análisis de guía no devolvió una respuesta válida después de varios intentos.");
}

 
/**
 * [MODIFICADO] Orquesta la ilustración siguiendo el nuevo pipeline de 2 fases:
 * 1. Análisis por lotes para crear una guía de diseño maestra.
 * 2. Ilustración por lotes, donde cada nodo compone su propia escena.
 */
async function ilustrarTodoEnParaleloPorLotes() {
    // ... (código inicial de confirmación y filtrado de nodos sin cambios) ...
    const nodosTotales = document.querySelectorAll('#momentos-lienzo .momento-nodo');
    const BATCH_SIZE = 9;
    const DELAY_ENTRE_LOTES = 55000;

    if (!confirm(`Esto iniciará un proceso de ilustración en modo PIPELINE.
- El análisis y la ilustración se harán por lotes de ${BATCH_SIZE}.
- La ilustración de un lote comenzará tan pronto como su análisis termine, de forma escalonada.
¿Deseas continuar?`)) {
        return;
    }

    const nodosAIlustrar = Array.from(nodosTotales).filter(nodo => {
        const descripcion = nodo.dataset.descripcion || '';
        const tieneImagen = nodo.querySelector('.momento-imagen')?.src.includes('data:image');
        return descripcion.trim().length >= 10 && !tieneImagen;
    });

    if (nodosAIlustrar.length === 0) {
        alert("No se encontraron momentos que necesiten ilustración.");
        return;
    }
    
    progressBarManager.start('Iniciando proceso de ilustración en pipeline...');

    try {
        let guiaDeDisenoMaestra = {};
        const promesasDeTodosLosLotes = [];

        const lotesDeNodos = [];
        for (let i = 0; i < nodosAIlustrar.length; i += BATCH_SIZE) {
            lotesDeNodos.push(nodosAIlustrar.slice(i, i + BATCH_SIZE));
        }

        for (let i = 0; i < lotesDeNodos.length; i++) {
            const loteActualNodos = lotesDeNodos[i];
            const numeroDeLote = i + 1;

            // --- PASO 1: ANALIZAR EL LOTE ACTUAL (para obtener la guía de diseño) ---
            const progress = 5 + (i / lotesDeNodos.length) * 45;
            progressBarManager.set(progress, `Analizando guía de diseño del lote ${numeroDeLote} de ${lotesDeNodos.length}...`);

            const momentosParaAnalizar = loteActualNodos.map((nodo, index) => ({
                idTemporal: `temp_${index}`,
                descripcion: nodo.dataset.descripcion
            }));
            
            // [MODIFICADO] Ahora solo esperamos la guía de diseño.
            guiaDeDisenoMaestra = await analizarLoteDeMomentos(momentosParaAnalizar, guiaDeDisenoMaestra);

            // [MODIFICADO] Preparamos los datos para la fase de ilustración.
            // Simplemente pasamos cada nodo junto con la guía maestra completa.
            const nodosParaIlustrarEsteLote = loteActualNodos.map(nodo => ({
                nodo,
                guiaDeDiseno: guiaDeDisenoMaestra
            }));

            // --- PASO 2: PROGRAMAR LA ILUSTRACIÓN DEL LOTE ACTUAL ---
            const delayDeInicio = i * DELAY_ENTRE_LOTES;
            console.log(`Análisis del Lote ${numeroDeLote} completado. Programando su ilustración para que inicie en ${delayDeInicio / 1000}s.`);
            
            // [MODIFICADO] Modificamos la función 'procesarLote' para que acepte el nuevo formato de datos.
            // (La adaptación de procesarLote es implícita y se muestra a continuación)

            const promesaDelLote = new Promise(resolve => {
                setTimeout(async () => {
                    await procesarLote(nodosParaIlustrarEsteLote, numeroDeLote, lotesDeNodos.length);
                    resolve();
                }, delayDeInicio);
            });

            promesasDeTodosLosLotes.push(promesaDelLote);
        }

        await Promise.all(promesasDeTodosLosLotes);
        progressBarManager.finish('¡Proceso de ilustración en pipeline finalizado!');

    } catch (error) {
        console.error("Error crítico en el proceso de ilustración en pipeline:", error);
        progressBarManager.error("Proceso cancelado por un error crítico");
        alert(`Ocurrió un error general durante la ilustración: ${error.message}`);
    }
}


// Es necesario un pequeño ajuste en `procesarLote` para que pase los argumentos correctos.
async function procesarLote(lote, numeroDeLote, totalLotes) {
    console.log(`--- INICIANDO LOTE ${numeroDeLote} de ${totalLotes} ---`);
    
    const progress = 30 + ((numeroDeLote - 1) / totalLotes) * 70;
    progressBarManager.set(progress, `Procesando lote ${numeroDeLote} de ${totalLotes} (${lote.length} imágenes)...`);

    // [MODIFICADO] El mapeo ahora extrae 'nodo' y 'guiaDeDiseno' para pasarlos a la función de ilustración.
    const promesasDelLote = lote.map(({ nodo, guiaDeDiseno }) =>
        generarYRefinarImagenParaNodo(nodo, guiaDeDiseno)
    );

    const resultados = await Promise.allSettled(promesasDelLote);
    console.log(`--- LOTE ${numeroDeLote} FINALIZADO. Resultados:`, resultados);
}
 


/**
 * [MODIFICADA] Toma un SVG existente y lo refina usando un modelo de IA específico.
 * @param {string} svgExistente - El código SVG del "borrador" a mejorar.
 * @param {string} promptMejora - La instrucción para la IA sobre cómo refinar el SVG.
 * @param {string} feedback - El mensaje a mostrar en la barra de progreso.
 
 * @returns {Promise<string>} El código del SVG mejorado.
 */
async function mejorarSVG(svgExistente, promptMejora, feedback, modelo = ' ') { // <-- Parámetro de modelo añadido
    // Creamos el prompt de mejora.
    const promptFinalMejora = `
        Eres un ilustrador experto en refinar arte vectorial. Tu tarea es mejorar un SVG existente basándote en una instrucción.
        SVG ACTUAL:
        \`\`\`xml
        ${svgExistente}
        \`\`\`
        INSTRUCCIÓN DE MEJORA: "${promptMejora}"
        TAREAS OBLIGATORIAS:
        1. Analiza el SVG y la instrucción.
        2. Refina el dibujo: añade más detalles, mejora los colores, aplica degradados sutiles y mejora las sombras y luces para dar más volumen y realismo.
        3. Mantén la coherencia estructural. Todas las partes deben seguir conectadas de forma lógica.
        4. Responde ÚNICAMENTE con el código del NUEVO SVG mejorado. No incluyas explicaciones ni comentarios.
    `;

    // Llamamos a la IA con el modelo especificado
    const respuestaMejora = await llamarIAConFeedback(promptFinalMejora, feedback, modelo, false);

    if (typeof extraerBloqueSVG !== 'function') {
        console.error("La función 'extraerBloqueSVG' no está disponible globalmente.");
        return respuestaMejora.match(/<svg[\s\S]*?<\/svg>/)?.[0] || respuestaMejora;
    }

    const svgMejorado = extraerBloqueSVG(respuestaMejora);
    if (!svgMejorado) {
        console.warn("La mejora no devolvió un SVG válido, se usará el SVG anterior.");
        return svgExistente;
    }

    return svgMejorado;
}


// =================================================================
// INICIO: LÓGICA ACTUALIZADA PARA ILUSTRACIÓN REALISTA CON PALETA DE ESTILO INTEGRADA
// =================================================================

// Variables para gestionar el estado de la generación por lotes
let ultimoIndiceIlustradoRealismo = 0;
let realismoEnProgreso = false;
let descripcionDatoEstilo = ''; // Guardará la descripción del dato seleccionado

/**
 * Abre el modal unificado de configuración de estilo.
 */
function ilustrarTodoRealismo() {
    if (realismoEnProgreso) {
        alert("Ya hay un proceso de ilustración realista en ejecución.");
        return;
    }
    abrirModalEstiloRealismo();
}

/**
 * Abre y prepara el modal para que el usuario defina el estilo artístico.
 */
function abrirModalEstiloRealismo() {
    const modal = document.getElementById('modal-estilo-realismo');
    const overlay = document.getElementById('modal-overlay');
    if (!modal || !overlay) return;

    // Resetear estado
    document.getElementById('ia-estilo-prompt').value = '';
    document.getElementById('dato-seleccionado-nombre').textContent = 'Ninguno seleccionado';
    descripcionDatoEstilo = '';

    // Mostrar modal y poblar la paleta de datos interna
    overlay.style.display = 'block';
    modal.style.display = 'flex';
    poblarPaletaDatosEnModal();
    
    overlay.onclick = cerrarModalEstiloRealismo;
    document.getElementById('iniciar-ilustracion-realismo-btn').onclick = iniciarProcesoDeLoteRealista;
}

/**
 * Cierra el modal de estilo.
 */
function cerrarModalEstiloRealismo() {
    const modal = document.getElementById('modal-estilo-realismo');
    const overlay = document.getElementById('modal-overlay');
    if (modal) modal.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
}

/**
 * Puebla la paleta dentro del modal con los "Datos" que pertenecen al arco "visuales".
 */
/**
 * [CORREGIDA] Puebla la paleta dentro del modal con los "Datos" que pertenecen al arco "visuales".
 */
function poblarPaletaDatosEnModal() {
    const grid = document.getElementById('grid-seleccion-datos-interno');
    if (!grid) return;

    grid.innerHTML = '';
    const todosLosDatos = document.querySelectorAll('#listapersonajes .personaje');
    let datosVisualesEncontrados = 0;

    todosLosDatos.forEach(datoEl => {
        // ==================== INICIO DE LA CORRECCIÓN ====================
        // El código buscaba en 'datoEl.dataset.arco', pero el atributo está en el botón interno.
        const arcoBtn = datoEl.querySelector('.change-arc-btn');
        if (arcoBtn && arcoBtn.dataset.arco === 'visuales') {
        // ===================== FIN DE LA CORRECCIÓN ======================
            datosVisualesEncontrados++;
            const nombre = datoEl.querySelector('.nombreh')?.value.trim();
            const descripcion = datoEl.querySelector('.descripcionh')?.value.trim();
            const imgSrc = datoEl.querySelector('.personaje-visual img')?.src;

            const card = document.createElement('div');
            card.className = 'galeria-item';
            card.onclick = (event) => seleccionarDatoParaEstilo(nombre, descripcion, event.currentTarget);

            if (imgSrc && !imgSrc.endsWith('/')) {
                card.innerHTML = `<img src="${imgSrc}" alt="${nombre}"><div class="galeria-titulo">${nombre}</div>`;
            } else {
                card.innerHTML = `<div class="galeria-placeholder"></div><div class="galeria-titulo">${nombre}</div>`;
            }
            grid.appendChild(card);
        }
    });

    if (datosVisualesEncontrados === 0) {
        grid.innerHTML = '<p style="font-size: 0.9em; color: #888; text-align: center;">No se encontraron datos en el arco "Visuales".</p>';
    }
}

/**
 * Se ejecuta al hacer clic en un dato en la paleta. Guarda la info y actualiza la UI.
 * @param {string} nombre - El nombre del dato seleccionado.
 * @param {string} descripcion - La descripción del dato seleccionado.
 * @param {HTMLElement} elementoClicado - El elemento card que fue clicado.
 */
function seleccionarDatoParaEstilo(nombre, descripcion, elementoClicado) {
    // Quitar la selección de cualquier otro elemento
    const grid = document.getElementById('grid-seleccion-datos-interno');
    grid.querySelectorAll('.galeria-item.seleccionado').forEach(el => el.classList.remove('seleccionado'));

    // Añadir selección al elemento actual
    elementoClicado.classList.add('seleccionado');
    
    document.getElementById('dato-seleccionado-nombre').textContent = nombre;
    descripcionDatoEstilo = descripcion;
}

/**
 * Inicia el proceso en lote después de que el usuario confirma en el modal de estilo.
 * (Esta función no necesita cambios lógicos, solo se adapta al nuevo flujo).
 */
async function iniciarProcesoDeLoteRealista() {
    cerrarModalEstiloRealismo();

    const estiloPrompt = document.getElementById('ia-estilo-prompt').value.trim();
    const guiaDeEstilo = `${estiloPrompt}\n\n${descripcionDatoEstilo}`.trim();

    if (!guiaDeEstilo) {
        if (!confirm("No has definido un estilo. Las imágenes se generarán con el estilo por defecto de la IA. ¿Deseas continuar?")) {
            return;
        }
    }

    // El resto de esta función (el bucle de lotes) permanece igual que en la versión anterior.
    realismoEnProgreso = true;
    const nodosAIlustrar = Array.from(document.querySelectorAll('#momentos-lienzo .momento-nodo')).filter(nodo => {
        const descripcion = nodo.dataset.descripcion || '';
        const tieneImagen = nodo.querySelector('.momento-imagen')?.src.includes('data:image');
        return descripcion.trim().length >= 10 && !tieneImagen;
    });

    if (ultimoIndiceIlustradoRealismo >= nodosAIlustrar.length) {
        alert("¡Felicidades! Todos los momentos ya han sido ilustrados.");
        ultimoIndiceIlustradoRealismo = 0;
        realismoEnProgreso = false;
        return;
    }
    
    const BATCH_SIZE = 9;
    const loteActual = nodosAIlustrar.slice(ultimoIndiceIlustradoRealismo, ultimoIndiceIlustradoRealismo + BATCH_SIZE);

    if (loteActual.length === 0) {
        alert("No se encontraron más momentos que necesiten ilustración.");
        realismoEnProgreso = false;
        ultimoIndiceIlustradoRealismo = 0;
        return;
    }

    progressBarManager.start(`Ilustrando lote de ${loteActual.length} momentos...`);

    try {
        const promesasDelLote = loteActual.map((nodo, index) => {
            const progress = ((index + 1) / loteActual.length) * 100;
            progressBarManager.set(progress, `Ilustrando: "${nodo.querySelector('.momento-titulo').textContent}"`);
            return generarImagenRealistaParaMomento(nodo, guiaDeEstilo);
        });

        await Promise.allSettled(promesasDelLote);
        
        ultimoIndiceIlustradoRealismo += loteActual.length;
        const nodosRestantes = nodosAIlustrar.length - ultimoIndiceIlustradoRealismo;
        progressBarManager.finish(`Lote de ${loteActual.length} momentos completado.`);

        if (nodosRestantes > 0) {
            if (confirm(`Se han ilustrado ${loteActual.length} momentos. Quedan ${nodosRestantes}.\n¿Deseas continuar con el siguiente lote?`)) {
                realismoEnProgreso = false;
                iniciarProcesoDeLoteRealista();
            } else {
                alert(`Proceso pausado. Define un nuevo estilo o pulsa 🖼️ para continuar desde donde lo dejaste.`);
                realismoEnProgreso = false;
            }
        } else {
            alert("¡Proceso de ilustración completado!");
            ultimoIndiceIlustradoRealismo = 0;
            realismoEnProgreso = false;
        }
    } catch (error) {
        console.error("Error crítico durante la ilustración realista:", error);
        progressBarManager.error("Error en la generación.");
        realismoEnProgreso = false;
    }
}

/**
 * VERSIÓN MEJORADA: Genera una única imagen "realista" para un nodo de momento.
 * Utiliza la función `callImageApiWithRotation` para manejar automáticamente los límites
 * de cuota (error 429) rotando entre las API keys disponibles.
 * @param {HTMLElement} nodo - El elemento DOM del momento a ilustrar.
 * @param {string} [guiaDeEstilo] - El prompt de estilo artístico opcional.
 */
async function generarImagenRealistaParaMomento(nodo, guiaDeEstilo = '') {
    const userPrompt = nodo.dataset.descripcion?.trim();
    if (!userPrompt) {
        console.warn(`Saltando nodo ${nodo.id} por falta de descripción.`);
        return;
    }

    const imagenArea = nodo.querySelector('.momento-contenido');
    if (imagenArea) imagenArea.classList.add('toma-procesando-individual');

    try {
        // --- PASO 1: Construcción del Prompt (SIN CAMBIOS) ---
        // Toda esta lógica para crear un prompt detallado se mantiene igual.
        let promptFinal = `Crea una ilustración cinematográfica SIN TEXTO para la siguiente escena: "${userPrompt}". El aspecto debe ser de 16:9, panorámico horizontal y de alta calidad. EVITA USAR EL TEXTO DE LA ESCENA EN LA IMAGEN. EL TEXTO ESTA PROHIBIDO`;
        if (guiaDeEstilo) {
            promptFinal += `\n\n**Guía de Estilo Artístico Obligatoria:** ${guiaDeEstilo}`;
        }

        const datosIndexados = [];
        document.querySelectorAll('#listapersonajes .personaje').forEach(p => {
            const nombre = p.querySelector('.nombreh')?.value.trim();
            const promptVisual = p.querySelector('.prompt-visualh')?.value.trim();
            if (nombre && promptVisual) {
                datosIndexados.push({ nombre, promptVisual });
            }
        });

        if (datosIndexados.length > 0) {
            const promptAnalisis = `
                **Tarea:** Lee el siguiente texto y devuelve un array JSON con los NOMBRES EXACTOS de los personajes de la lista que aparecen.
                **Lista de Personajes:** ${datosIndexados.map(p => `"${p.nombre}"`).join(', ')}
                **Texto de la escena:** "${userPrompt}"
                **Respuesta:** ["nombre1", "nombre2", ...]`;
            
            // La llamada de análisis sigue usando la función genérica con la clave principal.
            const respuestaAnalisis = await llamarIAConFeedback(promptAnalisis, "Identificando personajes...", 'gemini-2.5-flash', true);
            
            if (respuestaAnalisis && Array.isArray(respuestaAnalisis)) {
                const promptsVisuales = respuestaAnalisis
                    .map(nombre => datosIndexados.find(p => p.nombre === nombre)?.promptVisual)
                    .filter(Boolean).join('. ');
                if (promptsVisuales) {
                    promptFinal += `\n\n**Instrucciones visuales de personajes (muy importante):** ${promptsVisuales}`;
                }
            }
        }

        // ▼▼▼ INICIO DE LA MODIFICACIÓN ▼▼▼
        
        // --- PASO 2: Llamada a la API con Rotación de Claves ---
        // Se reemplaza todo el bloque 'fetch' manual por una única llamada a nuestra función robusta.
        // La variable 'modelografico' se asume que es global y contiene el modelo de imagen a usar.
        console.log(`[Momento IA] Enviando prompt a la función de rotación de claves...`);
        const responseData = await callImageApiWithRotation(promptFinal, modelografico);

        // ▲▲▲ FIN DE LA MODIFICACIÓN ▲▲▲


        // --- PASO 3: Procesamiento de la Respuesta (SIN CAMBIOS) ---
        const imagePart = responseData.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imagePart?.inlineData?.data) {
            const pngDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
            const imgElement = nodo.querySelector('.momento-imagen');
            if (imgElement) {
                imgElement.src = pngDataUrl;
                nodo.classList.add('con-imagen');
            }
        } else {
            const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "No se encontró contenido de imagen.";
            throw new Error(`La API no devolvió una imagen. Respuesta: ${textResponse}`);
        }

    } catch (error) {
        console.error(`Error al generar imagen para el nodo ${nodo.id}:`, error);
        const pError = document.createElement('p');
        pError.style.color = 'red';
        pError.style.fontSize = '10px';
        pError.textContent = 'Error IA';
        if (imagenArea) imagenArea.appendChild(pError);
    } finally {
        if (imagenArea) imagenArea.classList.remove('toma-procesando-individual');
    }
}
// =================================================================
// FIN: LÓGICA ACTUALIZADA
// =================================================================


/**
 * Ilustra un lote de hasta 9 momentos en paralelo sin un análisis previo.
 * Cada ilustración sigue un pipeline de 3 pasos:
 * 1. Planificación (gemini-2.5-flash-lite): Crea un plan de dibujo detallado.
 * 2. Dibujo (gemini-2.5-flash): Genera el borrador del SVG basándose en el plan.
 * 3. Refinamiento (gemini-2.5-flash-lite): Mejora los detalles del SVG generado.
 */
async function momentolotessvg() {
    const BATCH_SIZE = 9;

    // 1. Recopilar y filtrar los nodos que necesitan ilustración.
    const nodosAIlustrar = Array.from(document.querySelectorAll('#momentos-lienzo .momento-nodo'))
        .filter(nodo => {
            const descripcion = nodo.dataset.descripcion || '';
            const tieneImagen = nodo.querySelector('.momento-imagen')?.src.includes('data:image');
            // Solo procesa nodos con descripción suficiente y sin imagen previa.
            return descripcion.trim().length >= 10 && !tieneImagen;
        });

    if (nodosAIlustrar.length === 0) {
        alert("¡Excelente! No hay nuevos momentos que necesiten una ilustración SVG.");
        return;
    }

    // 2. Seleccionar el próximo lote de hasta 9 momentos.
    const loteActual = nodosAIlustrar.slice(0, BATCH_SIZE);

    if (!confirm(`Se ilustrarán ${loteActual.length} momentos en paralelo.\nEste proceso utilizará la IA para generar las imágenes. ¿Deseas continuar?`)) {
        return;
    }

    progressBarManager.start(`Iniciando lote de ${loteActual.length} ilustraciones SVG...`);

    try {
        // 3. Crear una promesa para cada nodo en el lote. Cada promesa ejecutará el pipeline de 3 pasos.
        const promesasDelLote = loteActual.map(nodo => ilustrarMomentoIndividual(nodo));

        // 4. Ejecutar todas las promesas en paralelo y esperar a que terminen.
        const resultados = await Promise.allSettled(promesasDelLote);

        // 5. Informar al usuario sobre el resultado del proceso.
        const exitosos = resultados.filter(r => r.status === 'fulfilled').length;
        const fallidos = resultados.filter(r => r.status === 'rejected').length;
        
        progressBarManager.finish(`¡Lote completado! ${exitosos} ilustraciones creadas, ${fallidos} fallaron.`);
        
        if (fallidos > 0) {
            console.error("Algunas ilustraciones fallaron. Revisa la consola para más detalles.", resultados);
            alert(`Proceso finalizado con ${fallidos} errores. Revisa la consola para ver los detalles.`);
        }

    } catch (error) {
        console.error("Error crítico durante la ilustración del lote SVG:", error);
        progressBarManager.error("El proceso del lote fue cancelado por un error.");
        alert(`Ocurrió un error general que detuvo el proceso: ${error.message}`);
    }
}

/**
 * Función auxiliar que procesa un único momento a través del pipeline de 3 pasos.
 * @param {HTMLElement} nodo - El nodo del momento a ilustrar.
 * @returns {Promise<object>} Una promesa que se resuelve con el estado de la operación.
 */
async function ilustrarMomentoIndividual(nodo) {
    const titulo = nodo.querySelector('.momento-titulo').textContent;
    const descripcion = nodo.dataset.descripcion;

    try {
        // --- PASO 1: PLANIFICACIÓN (Modelo: gemini-2.5-flash-lite) ---
        // La IA actúa como director de arte, creando un plan estructurado para el ilustrador.
        const promptPlanificacion = `
            Eres un Director de Arte y Compositor de Escenas. Tu misión es interpretar una descripción narrativa y crear un plan de dibujo claro y estructurado para un ilustrador.

            **Descripción de la Escena:**
            ---
            ${descripcion}
            ---

            **Tu Tarea:**
            Analiza la descripción y genera un plan detallado. No dibujes nada.
            Devuelve ÚNICAMENTE un objeto JSON con la siguiente estructura:
            {
              "composicion": "Describe la disposición general de la escena (ej. 'Primer plano de un personaje mirando un castillo a lo lejos, con un bosque en el plano medio').",
              "elementos": {
                "Elemento 1": "Descripción visual detallada del primer elemento clave.",
                "Elemento 2": "Descripción visual detallada del segundo elemento clave."
              },
              "atmosfera": "Describe el ambiente y la emoción (ej. 'Misteriosa y sombría, con niebla baja').",
              "paletaColores": "Sugiere una paleta de colores que encaje con la atmósfera (ej. 'Tonos fríos, azules profundos, grises y un toque de rojo para el contraste')."
            }
        `;
        const planDeDibujo = await llamarIAConFeedback(promptPlanificacion, `Planificando: "${titulo}"`, 'gemini-2.5-flash', true);
        if (!planDeDibujo || !planDeDibujo.composicion || !planDeDibujo.elementos) {
            throw new Error("La IA de planificación no devolvió un plan válido.");
        }

        // --- PASO 2: DIBUJO (Modelo: gemini-2.5-flash) ---
        // La IA actúa como ilustrador, siguiendo el plan para crear el SVG.
        const promptDibujo = `
            Eres un ilustrador experto en crear escenas en formato SVG con estilo "flat design".
            Tu tarea es convertir una descripción y un plan de dibujo en una ilustración SVG panorámica.

            **Descripción General de la Escena:**
            ---
            ${descripcion}
            ---

            **Plan de Dibujo OBLIGATORIO (Guía de Dirección de Arte):**
            ---
            ${JSON.stringify(planDeDibujo, null, 2)}
            ---

            **Instrucciones de Dibujo OBLIGATORIAS:**
            1.  **Estilo:** "Flat design" o "vectorial limpio".
            2.  **Sigue el Plan:** La composición, los elementos y la atmósfera del plan son obligatorios.
            3.  **Formato SVG:** El SVG DEBE usar un viewBox="0 0 1920 1080".
            4.  **Fondo:** El fondo debe ser transparente.

            **Formato de Respuesta OBLIGATORIO:**
            Responde ÚNICAMENTE con un objeto JSON válido: { "svgContent": "<svg>...</svg>" }
        `;
        const respuestaDibujo = await llamarIAConFeedback(promptDibujo, `Dibujando: "${titulo}"`, 'gemini-2.5-pro', true);
        if (!respuestaDibujo || !respuestaDibujo.svgContent) {
            throw new Error("La IA de dibujo no devolvió un SVG válido.");
        }
        const svgBorrador = respuestaDibujo.svgContent;

        // --- PASO 3: REFINAMIENTO (Modelo: gemini-2.5-flash-lite) ---
        // La IA actúa como un artista de post-producción, mejorando el SVG existente.
        const promptRefinamiento = `
            Eres un Artista Digital especialista en refinamiento de ilustraciones SVG. Tu tarea es tomar un borrador y elevarlo a un nivel profesional añadiendo detalles sutiles.

            **Filosofía de Refinamiento:**
            - **Mejora, no reemplaces:** Mantén la composición y los elementos. Tu trabajo es embellecerlos.
            - **Impacto Emocional:** Usa la luz y el color para acentuar la atmósfera.

            **SVG Base a Mejorar:**
            \`\`\`xml
            ${svgBorrador}
            \`\`\`

            **Tu Tarea:**
            1.  Analiza el SVG base.
            2.  Mejora la **iluminación**: añade degradados sutiles, fuentes de luz creíbles y sombras suaves para dar volumen.
            3.  Enriquece los **detalles**: añade pequeños detalles o texturas simples que no sobrecarguen el estilo "flat design".
            4.  Ajusta la **paleta de color** si es necesario para que sea más armónica.
            
            **Formato de Respuesta OBLIGATORIO:**
            Devuelve ÚNICAMENTE el código del NUEVO SVG mejorado. No incluyas explicaciones, comentarios ni la palabra "xml".
        `;
        const svgRefinadoTexto = await llamarIAConFeedback(promptRefinamiento, `Refinando: "${titulo}"`, 'gemini-2.5-flash-lite', false);
        
        // Extraemos el bloque SVG por si la IA añade texto adicional.
        const svgFinal = extraerBloqueSVG(svgRefinadoTexto) || svgBorrador;

        // --- Guardado Final ---
        await guardarIlustracionEnNodo(nodo, svgFinal);

        return { status: 'fulfilled', id: nodo.id };

    } catch (error) {
        console.error(`Error procesando el nodo ${nodo.id} (${titulo}):`, error);
        const imgElemento = nodo.querySelector('.momento-imagen');
        if (imgElemento) {
            // Añade un pequeño mensaje de error visible en el nodo.
            const errorMsg = document.createElement('p');
            errorMsg.style.cssText = 'color:red; font-size:10px; position:absolute; bottom:5px; left:5px;';
            errorMsg.textContent = 'Error IA';
            imgElemento.parentElement.style.position = 'relative';
            imgElemento.parentElement.appendChild(errorMsg);
        }
        // Rechaza la promesa para que `Promise.allSettled` lo capture como 'rejected'.
        return Promise.reject({ status: 'rejected', id: nodo.id, error: error.message });
    }
}