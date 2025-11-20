
function agregarPersonaje() {
    agregarPersonajeDesdeDatos();
    reinicializarFiltrosYActualizarVista();
}



/**
 * Inicializa el modal de IA una sola vez, poblando el selector de arcos.
 * Es importante que la variable 'opcionesArco' esté disponible globalmente.
 */
function inicializarModalIA() {
    const select = document.getElementById('ia-arco-select');
    // Se asegura de que el selector exista y no tenga opciones para no duplicarlas.
    if (select && select.options.length === 0) {
        if (typeof opcionesArco !== 'undefined') {
            opcionesArco.forEach(opcion => {
                const optionEl = document.createElement('option');
                optionEl.value = opcion.valor;
                optionEl.textContent = `${opcion.emoji} ${opcion.titulo}`;
                select.appendChild(optionEl);
            });
        } else {
            console.error("Error: La variable 'opcionesArco' no está definida. El selector de arcos no se puede poblar.");
        }
    }
}

// Se ejecuta la inicialización cuando el contenido del DOM está completamente cargado.
document.addEventListener('DOMContentLoaded', inicializarModalIA);


/**
 * Muestra u oculta el campo de texto para el arco personalizado
 * basado en la selección del dropdown.
 * @param {HTMLSelectElement} selectElement - El elemento select que cambió.
 */
function toggleCustomArcoInput(selectElement) {
    const customInput = document.getElementById('ia-arco-custom');
    if (selectElement.value === 'personalizar') {
        customInput.style.display = 'block';
        customInput.focus();
    } else {
        customInput.style.display = 'none';
    }
}

/**
 * Abre el modal de la IA y se asegura de que el selector de arcos
 * esté reseteado a su estado por defecto.
 */
function abrirModalAIDatos() {
    // Asume que tienes un overlay con id 'modal-ia-datos-overlay' que contiene tu modal.
    const modalOverlay = document.getElementById('modal-ia-datos-overlay');
    const select = document.getElementById('ia-arco-select');
    const customInput = document.getElementById('ia-arco-custom');
    
    // Resetea los controles a su estado inicial cada vez que se abre el modal.
    if (select) select.value = 'sin_arco'; // 'sin_arco' es el valor para 'Base'
    if (customInput) {
        customInput.style.display = 'none';
        customInput.value = '';
    }

    if (modalOverlay) modalOverlay.style.display = 'flex';
}
 
/**
 * Procesa la entrada del usuario utilizando un flujo de IA de múltiples pasos,
 * asignando los datos generados al arco narrativo seleccionado en el modal.
 */
async function procesarEntradaConIA() {
    // --- OBTENER ENTRADA DEL USUARIO ---
    const arcoSelect = document.getElementById('ia-arco-select');
    const arcoCustomInput = document.getElementById('ia-arco-custom');
    let arcoSeleccionado = 'sin_arco';

    if (arcoSelect) {
        arcoSeleccionado = (arcoSelect.value === 'personalizar' && arcoCustomInput) 
            ? arcoCustomInput.value.trim() || 'sin_arco' 
            : arcoSelect.value;
    }

    const textoUsuario = document.getElementById('ia-datos-area').value.trim();
    if (!textoUsuario) {
        mostrarError("Por favor, introduce algún texto o instrucción para que la IA trabaje.");
        return;
    }

    cerrarModalAIDatos();
    // Inicia la barra de progreso
    progressBarManager.start('Procesando solicitud con IA...');

    const chatDiv = window.chatDiv || document.getElementById('chat');
    if(chatDiv){
        chatDiv.innerHTML += `<p><strong>Tú:</strong> ${textoUsuario.substring(0, 100)}...</p><p><strong>Silenos:</strong> Entendido. Iniciando análisis inteligente...</p>`;
        chatDiv.scrollTop = chatDiv.scrollHeight;
    }

    try {
        // --- PASO 1: DETERMINAR LA INTENCIÓN (Router) ---
        progressBarManager.set(10, "Interpretando tu solicitud...");
        const promptRouter = `
            Analiza la siguiente petición del usuario y clasifícala en una de estas TRES categorías:
            1. "EXTRAER": El usuario ha pegado un texto largo y quiere que extraigas información estructurada de él.
            2. "GENERAR_TEMA": El usuario quiere que generes un conjunto de datos sobre un tema, idea u obra.
            3. "GENERAR_CONCRETO": El usuario pide crear uno o más elementos muy específicos y nombrados.

            **Petición del usuario:** "${textoUsuario}"

            Responde ÚNICAMENTE con un objeto JSON con la siguiente estructura:
            { "intencion": "EXTRAER" | "GENERAR_TEMA" | "GENERAR_CONCRETO", "peticion_resumida": "Un resumen de lo que hay que hacer." }
        `;
        const { intencion, peticion_resumida } = await llamarIAConFeedback(promptRouter, null, "gemini-2.5-flash", true);
        
        if (!intencion || !peticion_resumida) {
            throw new Error("La IA no pudo entender la intención de tu petición. Intenta ser más claro.");
        }
        
        progressBarManager.set(20, `Intención detectada: ${intencion}.`);
        if(chatDiv) {
            chatDiv.innerHTML += `<p><strong>Silenos:</strong> Intención detectada: ${intencion}. Procediendo con el pipeline adecuado...</p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;
        }

        if (intencion === 'EXTRAER') {
            progressBarManager.set(30, "Iniciando pipeline de extracción...");
            const totalCreados = await pipelineExtraccionInteligente(textoUsuario, chatDiv, arcoSeleccionado, progressBarManager);
            
            if (totalCreados > 0) {
                mostrarError(`¡Proceso de extracción completado! Se crearon ${totalCreados} datos nuevos en el arco '${arcoSeleccionado}'.`);
                document.getElementById('ia-datos-area').value = '';
            } else {
                mostrarError("El proceso de extracción finalizó, pero no se pudo crear ningún dato.");
            }

        } else if (intencion === 'GENERAR_TEMA' || intencion === 'GENERAR_CONCRETO') {
            progressBarManager.set(30, "Iniciando pipeline de generación de contenido...");
            const datosTextuales = await pipelineGeneracionContenido(peticion_resumida, chatDiv, progressBarManager);

            if (!datosTextuales || datosTextuales.length === 0) {
                throw new Error("El pipeline de generación de la IA no devolvió ningún dato estructurado.");
            }

            progressBarManager.set(70, `Creando ${datosTextuales.length} perfiles en el arco '${arcoSeleccionado}'...`);
            if(chatDiv) {
                chatDiv.innerHTML += `<p><strong>Silenos:</strong> Proceso finalizado. Se han obtenido ${datosTextuales.length} perfiles. Creando embeddings...</p>`;
                chatDiv.scrollTop = chatDiv.scrollHeight;
            }

            let totalCreados = 0;
            for (const [index, dato] of datosTextuales.entries()) {
                if (!dato.nombre || !dato.descripcion) continue;

                const progress = 70 + Math.round(((index + 1) / datosTextuales.length) * 25);
                progressBarManager.set(progress, `Procesando embedding para "${dato.nombre}"...`);

                try {
                    const embeddingVector = await generarEmbedding(dato.descripcion, null);
                    const datosCompletos = { ...dato, arco: arcoSeleccionado, embedding: embeddingVector || [] };
                    agregarPersonajeDesdeDatos(datosCompletos);
                    totalCreados++;
                } catch (embeddingError) {
                    console.error(`Error al generar embedding para "${dato.nombre}":`, embeddingError);
                    if(chatDiv) chatDiv.innerHTML += `<p><strong>Aviso:</strong> No se pudo crear el embedding para "${dato.nombre}". Se creó el dato sin él.</p>`;
                    agregarPersonajeDesdeDatos({ ...dato, arco: arcoSeleccionado, embedding: [] });
                    totalCreados++;
                }
            }
            if (totalCreados > 0) {
                mostrarError(`¡Proceso de generación completado! Se crearon ${totalCreados} datos nuevos en el arco '${arcoSeleccionado}'.`);
                document.getElementById('ia-datos-area').value = '';
            } else {
                mostrarError("El proceso de generación finalizó, pero no se pudo crear ningún dato.");
            }

        } else {
            throw new Error(`Intención '${intencion}' no reconocida o sin pipeline asignado.`);
        }

        progressBarManager.set(98, "Actualizando vistas...");
        reinicializarFiltrosYActualizarVista();
        progressBarManager.finish('¡Proceso completado con éxito!');

    } catch (error) {
        mostrarError("Ocurrió un error al procesar la solicitud con la IA: " + error.message);
        console.error("Error en procesarEntradaConIA:", error);
        if(chatDiv) chatDiv.innerHTML += `<p><strong>Error:</strong> ${error.message}</p>`;
        progressBarManager.error(`Error: ${error.message}`);
    } finally {
        if (chatDiv) chatDiv.scrollTop = chatDiv.scrollHeight;
    }
}





/**
 * Pipeline de generación de contenido para crear elementos desde cero.
 * @param {string} peticionResumida - La instrucción del usuario resumida por el router.
 * @param {HTMLElement} chatDiv - El elemento del DOM para mostrar el feedback.
 * @returns {Promise<Array<Object>>} - Una promesa que resuelve a un array de objetos de datos estructurados.
 */
async function pipelineGeneracionContenido(peticionResumida, chatDiv) {
    console.log("Pipeline de generación creativa iniciado.");
    chatDiv.innerHTML += `<p><strong>Silenos:</strong> Accediendo al pipeline de generación creativa...</p>`;
    chatDiv.scrollTop = chatDiv.scrollHeight;

    const etiquetasValidas = opcionesEtiqueta
        .map(o => o.valor)
        .filter(v => v !== 'indeterminado' && v !== 'personalizar')
        .join(', ');

    const promptGeneracion = `
        **Tarea Principal:** Basado en la siguiente solicitud, genera una lista de uno o más datos estructurados de forma creativa.
        **Solicitud del Usuario:** "${peticionResumida}"

        **Instrucciones:**
        - Produce contenido original y detallado que se ajuste a la petición.
        - Para CADA dato generado, proporciona: "nombre", "descripcion" (detallada, para el embedding), "promptVisual" (una descripción para generar una imagen detallada y repetible del dato; si es una persona, detalla con exactitud su morfología, TODOS los rasgos de su cara y su vestimenta y no incluyas nada de su alrededor o decorado, el personaje descrito sin alrededor), y la "etiqueta" MÁS APROPIADA de la lista [${etiquetasValidas}].

        **Formato de Salida Obligatorio:** Responde ÚNICAMENTE con un objeto JSON válido que sea un array de datos. Cada objeto en el array debe tener la estructura completa:
        { "nombre": "...", "descripcion": "...", "promptVisual": "...", "etiqueta": "..." }
    `;
    
    const datosGenerados = await llamarIAConFeedback(promptGeneracion, "Generando contenido creativo...", "gemini-2.5-flash-lite");

    // Aseguramos que la salida sea siempre un array
    if (!Array.isArray(datosGenerados)) {
        if (typeof datosGenerados === 'object' && datosGenerados !== null) {
            return [datosGenerados]; // Si devuelve un solo objeto, lo metemos en un array
        }
        throw new Error("La IA de generación no devolvió un formato de array de objetos válido.");
    }
    
    return datosGenerados;
}

  

/**
 * Pipeline de extracción lineal, diseñado para procesar una llamada a la vez
 * para evitar la saturación de la API. Ideal para APIs con límites de peticiones por minuto.
 * @param {string} textoUsuario - El texto completo proporcionado por el usuario.
 * @param {HTMLElement} chatDiv - El elemento del DOM para mostrar el feedback.
 * @returns {Promise<Array<Object>>} - Una promesa que resuelve a un array de objetos de datos estructurados.
 */
 
 
 
/**
 * --- VERSIÓN MEJORADA CON RENDERIZADO PROGRESIVO ---
 * Este pipeline extrae y RENDERIZA los datos progresivamente para una experiencia de usuario más fluida.
 * NOTA: La firma de la función ha cambiado. Ahora requiere 'arcoSeleccionado' y ya no devuelve un array de datos.
 * La función que llama a este pipeline (`procesarEntradaConIA`) debe ser adaptada para pasarle el arco
 * y ya no procesar el array que esta función devolvía antes.
 *
 * @param {string} textoUsuario - El texto completo proporcionado por el usuario.
 * @param {HTMLElement} chatDiv - El elemento del DOM para mostrar el feedback.
 * @param {string} arcoSeleccionado - El arco narrativo al que se asignarán los nuevos datos.
 * @returns {Promise<number>} - Una promesa que resuelve al número total de datos creados.
 */
async function pipelineExtraccionInteligente(textoUsuario, chatDiv, arcoSeleccionado) {
    let totalCreados = 0;
    
    // Definimos las categorías a procesar. Cada una será una pasada de 2 llamadas.
    const categorias = [
        {
            nombre: "Personajes y Entidades",
            descripcion: "Personajes con nombre, criaturas, animales o seres vivos relevantes en la trama.",
            etiquetaAsociada: "personaje",
            etiquetasSugeridas: "personaje, animal, ser_vivo, mitologia"
        },
        {
            nombre: "Lugares y Ubicaciones",
            descripcion: "Ciudades, edificios, regiones, planetas o cualquier ubicación geográfica o estructural mencionada.",
            etiquetaAsociada: "ubicacion",
            etiquetasSugeridas: "ubicacion, edificio, elemento_geografico"
        },
        {
            nombre: "Objetos y Artefactos",
            descripcion: "Ítems, herramientas, armas, atuendos, comida o cualquier objeto tangible importante.",
            etiquetaAsociada: "objeto",
            etiquetasSugeridas: "objeto, atuendo, comida, transporte, muebles, arte"
        },
        {
            nombre: "Sucesos y Eventos",
            descripcion: "Acontecimientos clave, batallas, ceremonias, momentos históricos o puntos de inflexión en la narrativa.",
            etiquetaAsociada: "evento",
            etiquetasSugeridas: "evento"
        },
        {
            nombre: "Conceptos y Lore",
            descripcion: "Ideas abstractas, reglas del mundo, lore, terminología específica, notas culturales o conceptos visuales importantes.",
            etiquetaAsociada: "concepto",
            etiquetasSugeridas: "concepto, nota, visual"
        }
    ];

    chatDiv.innerHTML += `<p><strong>Silenos:</strong> Iniciando pipeline de extracción por categorías...</p>`;
    chatDiv.scrollTop = chatDiv.scrollHeight;

    // --- BUCLE PRINCIPAL ---
    for (const [index, categoria] of categorias.entries()) {
        try {
            console.log(`Inicio de fase ${index + 1} de ${categorias.length}`);
            // --- FASE 1: IDENTIFICACIÓN ---
            const pasoActual = index * 2 + 1;
            const totalPasos = categorias.length * 2;
            chatDiv.innerHTML += `<p><strong>Silenos:</strong> [Paso ${pasoActual}/${totalPasos}] Identificando: <strong>${categoria.nombre}</strong>...</p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;

            const promptIdentificacion = `
                **Tarea:** Lee el siguiente texto y extrae una lista exhaustiva de todos los "${categoria.descripcion}".
                **Texto:** """${textoUsuario}"""
                **Instrucciones:**
                - Enfócate únicamente en la categoría: ${categoria.nombre}.
                - Devuelve solo los nombres propios o términos específicos.
                - Evita duplicados.
                **Formato de Salida Obligatorio:** Responde ÚNICAMENTE con un array de strings en formato JSON.
                **Ejemplo:** ["Nombre 1", "Nombre 2", "Término 3"]
            `;
            
            const listaNombres = await llamarIAConFeedback(promptIdentificacion, `Identificando ${categoria.nombre}...`, "gemini-2.5-flash");

            if (!Array.isArray(listaNombres) || listaNombres.length === 0) {
                chatDiv.innerHTML += `<p><strong>Silenos:</strong> No se encontraron elementos para "${categoria.nombre}". Saltando al siguiente.</p>`;
                chatDiv.scrollTop = chatDiv.scrollHeight;
                continue; // Si no hay nada, pasamos a la siguiente categoría
            }
            
            chatDiv.innerHTML += `<p><strong>Silenos:</strong> Se encontraron ${listaNombres.length} elemento(s) de tipo "${categoria.nombre}".</p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;

            // --- FASE 2: ELABORACIÓN Y RENDERIZADO POR LOTES ---
            const pasoElaboracion = index * 2 + 2;
            chatDiv.innerHTML += `<p><strong>Silenos:</strong> [Paso ${pasoElaboracion}/${totalPasos}] Elaborando detalles para: <strong>${categoria.nombre}</strong>...</p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;

            const CHUNK_SIZE = 8; // Procesamos en lotes para evitar errores de 'fetch' por tamaño de request
            
            for (let i = 0; i < listaNombres.length; i += CHUNK_SIZE) {
                console.log(`Procesando lote ${i / CHUNK_SIZE + 1} de ${Math.ceil(listaNombres.length / CHUNK_SIZE)} para "${categoria.nombre}"`);
                const chunk = listaNombres.slice(i, i + CHUNK_SIZE);
                const numLote = (i / CHUNK_SIZE) + 1;
                const totalLotes = Math.ceil(listaNombres.length / CHUNK_SIZE);

                chatDiv.innerHTML += `<p><strong>Silenos:</strong> ...procesando lote ${numLote} de ${totalLotes} para "${categoria.nombre}".</p>`;
                chatDiv.scrollTop = chatDiv.scrollHeight;

                const promptElaboracion = `
                    **Tarea:** Basado en el texto completo, genera los datos detallados para el siguiente LOTE de entidades de la categoría "${categoria.nombre}".
                    **Texto de Referencia Completo:** """${textoUsuario}"""
                    **Lote de Nombres a Detallar:** ${JSON.stringify(chunk)}

                    **Instrucciones Detalladas:**
                    1.  Para CADA nombre en la lista del lote, crea un objeto JSON con la siguiente estructura:
                        - "nombre": El nombre exacto de la lista.
                        - "descripcion": Un resumen detallado y completo, sintetizando toda la información disponible en el texto sobre ese elemento.
                        - "promptVisual": Una descripción visual muy detallada para una IA generadora de imágenes. Describe con precisión la apariencia, colores, atmósfera, etc.
                        - "etiqueta": Asigna la etiqueta MÁS APROPIADA de la lista [${categoria.etiquetasSugeridas}]. Si dudas, usa "${categoria.etiquetaAsociada}".
                    
                    **Formato de Salida Obligatorio:** Responde ÚNICAMENTE con un array de objetos JSON válido. No incluyas texto explicativo.
                `;

                const datosElaboradosChunk = await llamarIAConFeedback(promptElaboracion, `Elaborando ${chunk.length} elemento(s) del lote ${numLote}/${totalLotes}...`, "gemini-2.5-flash-lite");

                if (Array.isArray(datosElaboradosChunk) && datosElaboradosChunk.length > 0) {
                    // --- INICIO DE LA MODIFICACIÓN CLAVE ---
                    // Procesar y renderizar cada dato del lote inmediatamente.
                    for (const dato of datosElaboradosChunk) {
                        if (!dato.nombre || !dato.descripcion) continue;

                        try {
                            // Se asume que generarEmbedding() y agregarPersonajeDesdeDatos() están disponibles en el scope.
                            const embeddingVector = await generarEmbedding(dato.descripcion);
                            const datosCompletos = {
                                ...dato,
                                arco: arcoSeleccionado,
                                embedding: embeddingVector || []
                            };
                            agregarPersonajeDesdeDatos(datosCompletos);
                            totalCreados++;
                        } catch (embeddingError) {
                            console.error(`Error al generar embedding para "${dato.nombre}":`, embeddingError);
                            chatDiv.innerHTML += `<p><strong>Aviso:</strong> No se pudo crear el embedding para "${dato.nombre}". Se creó el dato sin él.</p>`;
                            agregarPersonajeDesdeDatos({ ...dato, arco: arcoSeleccionado, embedding: [] });
                            totalCreados++;
                        }
                    }
                    // Actualizar la vista de filtros después de añadir un lote de datos.
                    if (typeof reinicializarFiltrosYActualizarVista === 'function') {
                        reinicializarFiltrosYActualizarVista();
                    }
                    // --- FIN DE LA MODIFICACIÓN CLAVE ---
                }
            }
            chatDiv.innerHTML += `<p><strong>Silenos:</strong> Se procesaron y mostraron perfiles para "${categoria.nombre}".</p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;

        } catch (error) {
            console.error(`Error procesando la categoría "${categoria.nombre}":`, error);
            chatDiv.innerHTML += `<p><strong>Error:</strong> Falló el procesamiento para la categoría "${categoria.nombre}". Continuando con la siguiente.</p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;
        }
    }

    if (totalCreados === 0) {
        throw new Error("El pipeline finalizó, pero no se pudo extraer ningún dato estructurado. Revisa el texto de entrada.");
    }
    
    chatDiv.innerHTML += `<p><strong>Silenos:</strong> ¡Proceso completado! Se han extraído un total de ${totalCreados} perfiles de datos.</p>`;
    chatDiv.scrollTop = chatDiv.scrollHeight;

    return totalCreados;
}



// No olvides la función auxiliar si no la tienes ya definida en el mismo ámbito
function dividirTextoEnUnidades(texto, unidadPrincipal) {
    const regex = new RegExp(`(?=${unidadPrincipal}\\s+\\d+)`, 'gi');
    const fragmentos = texto.split(regex).filter(f => f.trim() !== '');
    return fragmentos.length <= 1 ? [texto] : fragmentos;
}

// Función de utilidad para mostrar errores (reemplaza a 'alert')
function mostrarError(mensaje) {
    // Implementa aquí tu lógica para mostrar un modal o un toast no bloqueante
  console.log('mensaje'); // Muestra el mensaje en la consola
    alert(mensaje); // Mantengo alert como fallback por si no tienes un modal
}




/**
 * Inicializa el modal de IA una sola vez, poblando el selector de arcos.
 * Es importante que la variable 'opcionesArco' esté disponible globalmente.
 */
function inicializarModalIA() {
    const select = document.getElementById('ia-arco-select');
    // Se asegura de que el selector exista y no tenga opciones para no duplicarlas.
    if (select && select.options.length === 0) {
        if (typeof opcionesArco !== 'undefined') {
            opcionesArco.forEach(opcion => {
                const optionEl = document.createElement('option');
                optionEl.value = opcion.valor;
                optionEl.textContent = `${opcion.emoji} ${opcion.titulo}`;
                select.appendChild(optionEl);
            });
        } else {
            console.error("Error: La variable 'opcionesArco' no está definida. El selector de arcos no se puede poblar.");
        }
    }
}

// Se ejecuta la inicialización cuando el contenido del DOM está completamente cargado.
document.addEventListener('DOMContentLoaded', inicializarModalIA);


/**
 * Muestra u oculta el campo de texto para el arco personalizado
 * basado en la selección del dropdown.
 * @param {HTMLSelectElement} selectElement - El elemento select que cambió.
 */
function toggleCustomArcoInput(selectElement) {
    const customInput = document.getElementById('ia-arco-custom');
    if (selectElement.value === 'personalizar') {
        customInput.style.display = 'block';
        customInput.focus();
    } else {
        customInput.style.display = 'none';
    }
}
