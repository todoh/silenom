 

// --- VARIABLES GLOBALES ---
let isSelecting = false;
let selectionBox = null;
const selectedStickers = new Set();
let selectionStartPos = { x: 0, y: 0 };
let contextualModal = null;

// --- INICIALIZACIÓN ---

document.addEventListener('DOMContentLoaded', inicializarFuncionalidadSeleccion);

function inicializarFuncionalidadSeleccion() {
    console.log("Iniciando funcionalidad de selección...");
    const viewport = document.getElementById('personajes');
    contextualModal = document.getElementById('selection-modal');
    
    if (!viewport) {
        console.error("Error Crítico: El viewport '#personajes' no fue encontrado. La funcionalidad de selección no se puede iniciar.");
        return;
    }
     if (!contextualModal) {
        console.error("Error Crítico: El modal de selección '#selection-modal' no fue encontrado.");
        return;
    }

    console.log("Viewport encontrado. Añadiendo listeners de ratón...");
    viewport.addEventListener('mousedown', iniciarSeleccion);
    viewport.addEventListener('contextmenu', e => e.preventDefault());
    viewport.addEventListener('click', (e) => {
        if (e.target === viewport || e.target.id === 'lienzo-visual') {
            limpiarSeleccion();
        }
    });
    console.log("Listeners de ratón añadidos.");

    const connectButton = (id, handler) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', handler);
            console.log(`Botón '#${id}' conectado.`);
        } else {
            console.warn(`Advertencia: No se encontró el botón '#${id}'.`);
        }
    };

    connectButton('delete-selected-btn', eliminarStickersSeleccionados);
    connectButton('archive-selected-btn', archivarStickersSeleccionados);
    connectButton('synthesize-selected-btn', sintetizarYArchivar);
    connectButton('compress-selected-btn', comprimirYArchivar);
    connectButton('develop-selected-btn', desarrollarDesdeSeleccion);
  const changeTagBtn = document.getElementById('change-tag-selected-btn');
    if (changeTagBtn) {
        const handler = () => cambiarPropiedadEnGrupo('etiqueta');
        changeTagBtn.onclick = handler; // Se activa con un clic
        changeTagBtn.onmouseover = handler; // Y también al pasar el ratón por encima
    }

    const changeArcBtn = document.getElementById('change-arc-selected-btn');
    if (changeArcBtn) {
        const handler = () => cambiarPropiedadEnGrupo('arco');
        changeArcBtn.onclick = handler; // Se activa con un clic
        changeArcBtn.onmouseover = handler; // Y también al pasar el ratón por encima
    }
    connectButton('ia-develop-cancel-btn', () => {
        const modal = document.getElementById('ia-develop-modal');
        if (modal) modal.style.display = 'none';
    });
    connectButton('ia-develop-confirm-btn', ejecutarDesarrolloIA);
    
    console.log("Funcionalidad de selección inicializada completamente.");
}


// --- LÓGICA DE SELECCIÓN VISUAL (LASSO) ---

function iniciarSeleccion(e) {
    if (e.button !== 2 || (e.target.id !== 'lienzo-visual' && e.target.id !== 'personajes')) return;
    
    e.preventDefault();
    e.stopPropagation();

    isSelecting = true;
    const rect = e.currentTarget.getBoundingClientRect();
    selectionStartPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (!selectionBox) {
        selectionBox = document.createElement('div');
        selectionBox.id = 'selection-box';
        document.body.appendChild(selectionBox);
    }
    
    Object.assign(selectionBox.style, {
        left: `${e.clientX}px`, top: `${e.clientY}px`,
        width: '0px', height: '0px', display: 'block'
    });

    if (!e.shiftKey) limpiarSeleccion();
    
    document.addEventListener('mousemove', duranteSeleccion);
    document.addEventListener('mouseup', finalizarSeleccion);
}

function duranteSeleccion(e) {
    if (!isSelecting) return;
    e.preventDefault();

    const viewportRect = document.getElementById('personajes').getBoundingClientRect();
    const startX = selectionStartPos.x + viewportRect.left;
    const startY = selectionStartPos.y + viewportRect.top;

    Object.assign(selectionBox.style, {
        left: `${Math.min(startX, e.clientX)}px`,
        top: `${Math.min(startY, e.clientY)}px`,
        width: `${Math.abs(startX - e.clientX)}px`,
        height: `${Math.abs(startY - e.clientY)}px`
    });
}

function finalizarSeleccion() {
    isSelecting = false;
    document.removeEventListener('mousemove', duranteSeleccion);
    document.removeEventListener('mouseup', finalizarSeleccion);

    if (selectionBox && selectionBox.style.display !== 'none') {
        const boxRect = selectionBox.getBoundingClientRect();
        selectionBox.style.display = 'none';

        document.querySelectorAll('#lienzo-visual .personaje-sticker').forEach(sticker => {
            const stickerRect = sticker.getBoundingClientRect();
            if (boxRect.left < stickerRect.right && boxRect.right > stickerRect.left &&
                boxRect.top < stickerRect.bottom && boxRect.bottom > stickerRect.top) {
                toggleSeleccionSticker(sticker, true);
            }
        });
        actualizarModalContextual();
    }
}


// --- GESTIÓN DE LA SELECCIÓN ---

function toggleSeleccionSticker(sticker, forzarSeleccion = false) {
    const id = sticker.dataset.id;
    if (!id) return;

    if (forzarSeleccion) {
        if (!selectedStickers.has(id)) {
            selectedStickers.add(id);
            sticker.classList.add('selected');
        }
    } else {
        if (selectedStickers.has(id)) {
            selectedStickers.delete(id);
            sticker.classList.remove('selected');
        } else {
            selectedStickers.add(id);
            sticker.classList.add('selected');
        }
    }
    actualizarModalContextual();
}

function limpiarSeleccion() {
    selectedStickers.forEach(id => {
        document.querySelector(`.personaje-sticker[data-id="${id}"]`)?.classList.remove('selected');
    });
    selectedStickers.clear();
    actualizarModalContextual();
}

function actualizarModalContextual() {
    if (selectedStickers.size > 0) {
        const lastId = Array.from(selectedStickers).pop();
        const lastSticker = document.querySelector(`.personaje-sticker[data-id="${lastId}"]`);
        
        if (lastSticker) {
            const rect = lastSticker.getBoundingClientRect();
            contextualModal.style.display = 'flex';
            contextualModal.style.left = `${rect.right + window.scrollX + 10}px`;
            contextualModal.style.top = `${rect.top + window.scrollY}px`;
        } else {
             contextualModal.style.display = 'none';
        }
    } else {
        contextualModal.style.display = 'none';
    }
}


// --- ACCIONES DEL MENÚ CONTEXTUAL ---

function archivarStickersSeleccionados() {
    if (selectedStickers.size === 0) return;
    selectedStickers.forEach(id => moverDatoEntreVistas(id));
    limpiarSeleccion();
}

function eliminarStickersSeleccionados() {
    if (selectedStickers.size === 0) return;

    if (confirm(`¿Eliminar ${selectedStickers.size} datos?`)) {
        selectedStickers.forEach(id => {
            document.querySelector(`#lienzo-visual .personaje-sticker[data-id="${id}"]`)?.remove();
            document.querySelector(`#listapersonajes .personaje[data-id="${id}"]`)?.remove();
        });
        limpiarSeleccion();
        if (typeof actualizarVistaDatos === 'function') actualizarVistaDatos();
    }
}

// --- LÓGICA DE IA MEJORADA EN 2 PASOS ---

function extraerDatosSeleccionados() {
    const datosExtraidos = [];
    selectedStickers.forEach(id => {
        const datoEl = document.querySelector(`#listapersonajes .personaje[data-id="${id}"]`);
        if (datoEl) {
            datosExtraidos.push({
                id: id,
                nombre: datoEl.querySelector('.nombreh')?.value || '',
                descripcion: datoEl.dataset.descripcion || '',
                promptVisual: datoEl.querySelector('.prompt-visualh')?.value || '',
                etiqueta: datoEl.querySelector('.change-tag-btn')?.dataset.etiqueta || 'indeterminado',
                arco: datoEl.querySelector('.change-arc-btn')?.dataset.arco || 'sin_arco'
            });
        }
    });
    return datosExtraidos;
}

 
 
/**
 * --- VERSIÓN MODIFICADA ---
 * Procesa y crea nuevos datos, eligiendo el método de ilustración adecuado.
 * @param {Array<object>} nuevosDatos - Un array de objetos de datos a procesar.
 * @param {string} opcionImagen - Define el tipo de imagen a generar: 'none', 'svg', 'realistic'.
 */
async function procesarYCrearNuevosDatos(nuevosDatos, opcionImagen = 'svg') {
    if (!Array.isArray(nuevosDatos) || nuevosDatos.length === 0) {
        return;
    }

    // MODIFICADO: Texto de progreso dinámico
    let textoProgreso = 'Creando';
    if (opcionImagen === 'svg') textoProgreso = 'Ilustrando (Vectorial)';
    if (opcionImagen === 'realistic') textoProgreso = 'Ilustrando (Realista)';
    
    if (typeof progressBarManager !== 'undefined' && typeof progressBarManager.update === 'function') {
        progressBarManager.update(`${textoProgreso} ${nuevosDatos.length} nuevos datos...`);
    }

    try {
        const promesasDeDatos = nuevosDatos.map(dato => {
            if (opcionImagen !== 'none' && dato && dato.nombre && dato.descripcion) {
                const promptVisual = `${dato.nombre}, ${dato.descripcion}`;
                
                // NUEVO: Selección de la función de generación
                let funcionGeneradora;
                if (opcionImagen === 'realistic') {
                    funcionGeneradora = ultrasdospasos; // Función para imágenes realistas
                } else { // 'svg' es la opción por defecto
                    funcionGeneradora = ultras2; // Función para imágenes SVG
                }

                return funcionGeneradora(promptVisual).then(resultadoImagen => {
                    if (resultadoImagen && resultadoImagen.imagen) {
                        dato.imagen = resultadoImagen.imagen;
                        // El SVG solo se guarda si viene de la función correcta
                        dato.svgContent = resultadoImagen.svgContent || null;
                    }
                    return dato;
                }).catch(error => {
                    console.error(`Falló la generación (${opcionImagen}) para "${dato.nombre}":`, error);
                    return dato; // Devuelve el dato sin imagen en caso de error
                });
            }
            
            // Si opcionImagen es 'none' o el dato no es válido, no se genera imagen
            return Promise.resolve(dato);
        });

        for (let i = 0; i < promesasDeDatos.length; i++) {
            const datoCompletado = await promesasDeDatos[i];
            
            if (typeof progressBarManager !== 'undefined' && typeof progressBarManager.update === 'function') {
                progressBarManager.update(`${textoProgreso}: ${i + 1} de ${nuevosDatos.length} completado ("${datoCompletado.nombre}")...`);
            }

            if (datoCompletado && datoCompletado.nombre) {
                agregarPersonajeDesdeDatos(datoCompletado);
                console.log(`Dato "${datoCompletado.nombre}" añadido al lienzo.`);
            }
        }
        console.log("Todos los datos han sido procesados y añadidos.");

    } catch (error) {
        // ... (Manejo de errores)
    }

    if (typeof reinicializarFiltrosYActualizarVista === 'function') {
        reinicializarFiltrosYActualizarVista();
    }
}


// ... (keep all the existing code in datos-seleccion.js after this function)

// NUEVO: Función para crear el prompt del Paso 2 (Creador)
function crearPromptPaso2(idea, contexto) {
    return `
        **Rol:** Eres un asistente de escritura y diseño de personajes/eventos.
        **Contexto General:** Considera estos datos existentes: ${JSON.stringify(contexto, null, 2)}.
        **Tarea Específica:** Toma la siguiente idea central y desarróllala en un único y detallado dato.
        **Idea Central:** "${idea}"
        **Instrucciones:**
        1.  **Nombre:** Crea un nombre evocador y conciso.
        2.  **Descripción:** Escribe una descripción rica y detallada (2-4 frases).
      3. Prompt Visual: Describe visualmente el dato para un generador de imágenes fotorrealistas, con el nivel de detalle necesario para lograr el máximo realismo y credibilidad. Representa el sujeto (personaje, objeto, etc.) incluyendo detalles sobre su entorno, la iluminación, la composición fotográfica y la atmósfera. Fomenta composiciones ricas y detalladas que cuenten una historia. (ej. válido "Retrato de un joven de 20 años de aspecto amigable, con cabello rubio ceniza desordenado y penetrantes ojos verdes. Viste una camiseta de algodón texturizado y vaqueros oscuros. Está sentado en el alféizar de una ventana en una biblioteca antigua, con estanterías de madera desenfocadas en el fondo. La escena está iluminada por una luz cálida y suave que entra por el ventanal, creando un sutil juego de sombras en su rostro. ").
        4.  **Etiqueta:** Clasifica el dato en una de estas categorías: 'personaje', 'evento', 'ubicacion', 'objeto', 'concepto'.
        5.  **Arco:** Asigna un arco narrativo coherente con el contexto. Si no está claro, usa 'sin_arco'.
        
        **Formato de Salida:** Responde ÚNICAMENTE con un objeto JSON válido con la estructura: {"nombre": "...", "descripcion": "...", "promptVisual": "...", "etiqueta": "...", "arco": "..."}.
    `;
}

// --- UBICACIÓN: Cerca del medio/final del archivo ---

// MODIFICADO: El parámetro 'generarImagen' ahora es 'opcionImagen' y es un string.
async function ejecutarAccionIA(promptBuilder, accionOrigen, isMultiStep = false, opcionImagen = 'svg') {
    const datosContexto = extraerDatosSeleccionados();
    if (datosContexto.length === 0) {
        alert("No hay datos seleccionados para procesar.");
        return;
    }
    limpiarSeleccion();

    if (typeof progressBarManager !== 'undefined' && typeof progressBarManager.start === 'function') {
        progressBarManager.start(`Ejecuting ${accionOrigen}...`);
    }

    try {
        if (isMultiStep) {
            // ... (Lógica de 2 pasos)
            const promptPaso1 = promptBuilder(datosContexto);
            const conceptos = await llamarIAConFeedback(promptPaso1, `Paso 1: Planificando nuevas ideas...`, "gemini-2.5-flash-lite");
            
            if (!Array.isArray(conceptos)) throw new Error("El paso 1 no devolvió una lista de ideas.");

            const datosFinales = [];
            let contador = 0;
            for (const concepto of conceptos) {
                contador++;
                // ... (Actualización de la barra de progreso)
                const promptPaso2 = crearPromptPaso2(concepto.idea, datosContexto);
                const datoCompleto = await llamarIAConFeedback(promptPaso2, `Generando dato ${contador}...`, "gemini-2.5-flash-lite");
                datosFinales.push(datoCompleto);
            }
            // MODIFICADO: Pasamos el parámetro 'opcionImagen' a la función de procesamiento.
            await procesarYCrearNuevosDatos(datosFinales, opcionImagen);

        } else {
            // --- LÓGICA DE 1 PASO (Comprimir) ---
            const prompt = promptBuilder(datosContexto);
            const respuestaIA = await llamarIAConFeedback(prompt, `Procesando ${datosContexto.length} datos...`, "gemini-2.5-flash-lite");
            // MODIFICADO: Pasamos el parámetro 'opcionImagen' también aquí.
            await procesarYCrearNuevosDatos(respuestaIA, opcionImagen);
        }
        
        if (accionOrigen !== 'Desarrollar') {
            datosContexto.forEach(dato => moverDatoEntreVistas(dato.id));
        }

        if (typeof progressBarManager !== 'undefined' && typeof progressBarManager.finish === 'function') {
            progressBarManager.finish("¡Acción completada!");
        }
    } catch (error) {
        // ... (Manejo de errores)
    }
}


// --- DEFINICIÓN DE PROMPTS Y ACCIONES (MODIFICADOS) ---

function sintetizarYArchivar() {
    // MODIFICADO: Prompt para el Paso 1 (Planificador)
    const promptBuilder = (datos) => `
        **Rol:** Eres un asistente de escritura creativa especializado en síntesis.
        **Tarea:** Analiza los siguientes datos JSON y genera una lista de ideas o conceptos clave para nuevos datos que fusionen o resuman los originales. No fusiones personajes importantes que deban mantener su propia identidad.
        **Datos de entrada:** ${JSON.stringify(datos, null, 2)}
        **Formato de Salida:** Responde ÚNICAMENTE con un array JSON de ideas. La estructura debe ser: [{"idea": "Descripción del primer concepto nuevo"}, {"idea": "Descripción del segundo concepto nuevo"}].
    `;
    // MODIFICADO: Se llama con isMultiStep = true
    ejecutarAccionIA(promptBuilder, 'Sintetizar', true);
}

function comprimirYArchivar() {
    // SIN CAMBIOS: Esta función sigue usando la lógica de 1 paso.
    const promptBuilder = (datos) => `
        Eres un organizador de información. Agrupa los siguientes datos JSON en nuevos contenedores lógicos sin alterar el texto original. Por ejemplo, agrupa eventos de la misma trama o personajes de una misma familia. La descripción del nuevo dato debe ser una concatenación coherente de las descripciones originales.
        No agrupes personajes clave que necesiten su independencia.
        Datos de entrada: ${JSON.stringify(datos, null, 2)}
        Responde ÚNICAMENTE con un array JSON de los nuevos datos contenedores, con la estructura: {"nombre": "...", "descripcion": "...", "promptVisual": "...", "etiqueta": "...", "arco": "..."}.
    `;
    // MODIFICADO: Se llama con isMultiStep = false (o se omite, ya que es el valor por defecto)
    ejecutarAccionIA(promptBuilder, 'Comprimir', false);
}

function desarrollarDesdeSeleccion() {
    if (selectedStickers.size === 0) {
        alert("Primero selecciona al menos un dato para usar como contexto.");
        return;
    }
    const modal = document.getElementById('ia-develop-modal');
    modal.style.display = 'flex';
    document.getElementById('ia-develop-prompt').focus();
}

 
function ejecutarDesarrolloIA() {
    const userPrompt = document.getElementById('ia-develop-prompt').value;
    
    // MODIFICADO: Leemos el valor del radio button seleccionado
    const opcionImagen = document.querySelector('input[name="image-generation-option"]:checked').value;

    if (!userPrompt.trim()) {
        alert("Por favor, escribe un prompt.");
        return;
    }
    document.getElementById('ia-develop-modal').style.display = 'none';
    document.getElementById('ia-develop-prompt').value = '';

    const promptBuilder = (datos) => `
        **Rol:** Eres un guionista experto.
        **Tarea:** Basado en el contexto proporcionado y la petición del usuario, genera una lista de ideas para los nuevos datos que deben crearse.
        **Contexto:** ${JSON.stringify(datos, null, 2)}
        **Petición del usuario:** "${userPrompt}"
        **Formato de Salida:** Responde ÚNICAMENTE con un array JSON de ideas. La estructura debe ser: [{"idea": "Concepto para el primer dato a crear"}, {"idea": "Concepto para el segundo dato a crear"}].
    `;
    
    // MODIFICADO: Pasamos el nuevo parámetro 'opcionImagen' a la función principal.
    ejecutarAccionIA(promptBuilder, 'Desarrollar', true, opcionImagen);
}


 
/**
 * --- VERSIÓN CORREGIDA ---
 * Inicia el proceso para cambiar una propiedad (etiqueta o arco) para todos los stickers seleccionados.
 * Muestra un menú de opciones y maneja la opción de personalización.
 * @param {string} propiedad - La propiedad a cambiar ('etiqueta' o 'arco').
 */
function cambiarPropiedadEnGrupo(propiedad) {
    const menuExistente = document.querySelector('.menu-etiquetas');
    if (menuExistente) menuExistente.remove();

    if (selectedStickers.size === 0) return;

    const opciones = (propiedad === 'etiqueta') ? window.opcionesEtiqueta : window.opcionesArco;
    const botonReferencia = document.getElementById((propiedad === 'etiqueta') ? 'change-tag-selected-btn' : 'change-arc-selected-btn');

    if (!opciones || !botonReferencia) {
        console.error(`No se pudieron encontrar las opciones o el botón de referencia para '${propiedad}'`);
        return;
    }

    const menu = document.createElement('div');
    menu.className = 'menu-etiquetas';

    opciones.forEach(opcion => {
        const item = document.createElement('div');
        item.className = 'item-menu-etiqueta';
        item.innerHTML = `${opcion.emoji} ${opcion.titulo}`;
        
        // --- INICIO DE LA CORRECCIÓN ---
        item.onclick = (e) => {
            e.stopPropagation();
            menu.remove(); // Cerramos el menú inmediatamente

            if (opcion.valor === 'personalizar') {
                // Si es 'personalizar', pedimos el nuevo nombre al usuario
                const promptTitle = `Introduce el nuevo nombre para ${propiedad === 'etiqueta' ? 'la etiqueta' : 'el arco'}:`;
                const nuevoValor = prompt(promptTitle);

                if (nuevoValor && nuevoValor.trim()) {
                    const valorLimpio = nuevoValor.trim();
                    // Creamos un objeto de opción "al vuelo" con los datos personalizados
                    const opcionPersonalizada = {
                        valor: valorLimpio,
                        // Usamos la primera letra como emoji improvisado
                        emoji: valorLimpio.charAt(0).toUpperCase(), 
                        titulo: valorLimpio
                    };
                    // Ejecutamos el cambio con la nueva opción
                    ejecutarCambioEnGrupo(propiedad, opcionPersonalizada);
                    limpiarSeleccion();
                }
            } else {
                // Si es una opción normal, procedemos como antes
                ejecutarCambioEnGrupo(propiedad, opcion);
                limpiarSeleccion();
            }
        };
        // --- FIN DE LA CORRECCIÓN ---

        menu.appendChild(item);
    });

    document.body.appendChild(menu);
    const rect = botonReferencia.getBoundingClientRect();
    
    menu.style.left = `${rect.right + window.scrollX + 5}px`;
    menu.style.top = `${rect.top + window.scrollY}px`;
    menu.style.display = 'block';

    const cerrarMenuHandler = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', cerrarMenuHandler, true);
        }
    };
    setTimeout(() => document.addEventListener('click', cerrarMenuHandler, true), 100);
}

/**
 * Itera sobre todos los IDs de los stickers seleccionados y actualiza la propiedad
 * especificada (etiqueta o arco) tanto en el "dato pesado" de la lista como en el "sticker" del lienzo.
 * @param {string} propiedad - La propiedad a cambiar ('etiqueta' o 'arco').
 * @param {object} opcionSeleccionada - El objeto de opción que contiene {valor, emoji, titulo}.
 */
function ejecutarCambioEnGrupo(propiedad, opcionSeleccionada) {
    const selectorBtnClase = (propiedad === 'etiqueta') ? '.change-tag-btn' : '.change-arc-btn';
    const datasetProp = propiedad; // La propiedad del dataset a modificar (dataset.etiqueta o dataset.arco)

    selectedStickers.forEach(id => {
        // 1. Actualizar el "dato pesado" (#listapersonajes .personaje)
        const datoPesado = document.querySelector(`#listapersonajes .personaje[data-id="${id}"]`);
        if (datoPesado) {
            const botonEnDato = datoPesado.querySelector(selectorBtnClase);
            if (botonEnDato) {
                botonEnDato.dataset[datasetProp] = opcionSeleccionada.valor;
                botonEnDato.innerHTML = opcionSeleccionada.emoji;
                botonEnDato.title = `${propiedad.charAt(0).toUpperCase() + propiedad.slice(1)}: ${opcionSeleccionada.titulo}`;
            }
        }

        // 2. Actualizar el "sticker visual" (#lienzo-visual .personaje-sticker)
        const sticker = document.querySelector(`#lienzo-visual .personaje-sticker[data-id="${id}"]`);
        if (sticker) {
            const botonEnSticker = sticker.querySelector(selectorBtnClase);
            if (botonEnSticker) {
                botonEnSticker.dataset[datasetProp] = opcionSeleccionada.valor;
                botonEnSticker.innerHTML = opcionSeleccionada.emoji;
                botonEnSticker.title = `${propiedad.charAt(0).toUpperCase() + propiedad.slice(1)}: ${opcionSeleccionada.titulo}`;
            }
        }
    });

    console.log(`✅ ${selectedStickers.size} datos actualizados a ${propiedad}: ${opcionSeleccionada.valor}`);
}