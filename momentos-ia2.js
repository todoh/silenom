// =================================================================
// MOMENTOS-IA2.JS - Generador de Ramas Narrativas con Contexto Sintetizado
// =================================================================

/**
 * Abre y prepara el modal para la generación de ramas narrativas.
 */
function abrirModalRamaIA() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-momentos-rama-ia');
    if (!overlay || !modal) {
        console.error("No se encontraron los elementos del modal de generación de ramas IA.");
        return;
    }

    // Poblar dinámicamente el modal
    // ELIMINADO: poblarSelectorDeArcosParaModal();
    poblarSelectoresDeMomentos();
    poblarSelectorDeArcoSalida();

    // Mostrar modal
    overlay.style.display = 'block';
    modal.style.display = 'flex';
    overlay.onclick = cerrarModalRamaIA;

    // Asignar el evento al botón de generar
    const generarBtn = document.getElementById('generar-rama-ia-btn-modal');
    generarBtn.onclick = iniciarGeneracionDeRama;
}

/**
 * Cierra el modal de generación de ramas con IA.
 */
function cerrarModalRamaIA() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-momentos-rama-ia');
    if (overlay && modal) {
        overlay.style.display = 'none';
        modal.style.display = 'none';
        overlay.onclick = null;
    }
}

// ELIMINADO: La función poblarSelectorDeArcosParaModal() ya no es necesaria.

/**
 * Llena los menús desplegables para seleccionar los momentos de inicio y fin.
 */
function poblarSelectoresDeMomentos() {
    // ... (El contenido de esta función no cambia)
    const selectA = document.getElementById('ia-rama-momento-a');
    const selectB = document.getElementById('ia-rama-momento-b');
    if (!selectA || !selectB) return;

    selectA.innerHTML = '<option value="">-- Momento Inicial --</option>';
    selectB.innerHTML = '<option value="">-- Momento Final --</option>';

    const todosLosMomentos = document.querySelectorAll('#momentos-lienzo .momento-nodo');
    if (todosLosMomentos.length < 1) {
        const option = new Option("No hay momentos en el lienzo", "");
        option.disabled = true;
        selectA.add(option.cloneNode(true));
        selectB.add(option);
        return;
    }

    todosLosMomentos.forEach(nodo => {
        const titulo = nodo.querySelector('.momento-titulo').textContent;
        const id = nodo.id;
        selectA.add(new Option(titulo, id));
        selectB.add(new Option(titulo, id));
    });
}

/**
 * Llena el selector para el arco de salida del dato resumen y maneja la lógica del campo personalizado.
 */
function poblarSelectorDeArcoSalida() {
    // ... (El contenido de esta función no cambia)
    const select = document.getElementById('ia-rama-arco-salida');
    const customInput = document.getElementById('ia-rama-arco-salida-custom');
    if (!select || !customInput) return;

    select.innerHTML = '';

    opcionesArco.forEach(opcion => {
        const optionEl = document.createElement('option');
        optionEl.value = opcion.valor;
        optionEl.textContent = `${opcion.emoji} ${opcion.titulo}`;
        select.appendChild(optionEl);
    });

    select.value = 'sin_arco';
    customInput.style.display = 'none';
    customInput.value = '';

    select.onchange = () => {
        customInput.style.display = select.value === 'personalizar' ? 'block' : 'none';
        if (select.value === 'personalizar') customInput.focus();
    };
}

/**
 * Orquestador principal: recoge datos, llama a la IA para generar una red de momentos,
 * los crea, los conecta y finalmente actualiza la síntesis temporal.
 */
async function iniciarGeneracionDeRama() {
    // 1. Recoger datos del modal
    // ELIMINADO: const arcosSeleccionados = Array.from(document.querySelectorAll('#ia-rama-arcos-filter-container input:checked')).map(cb => cb.value);
    const idMomentoA = document.getElementById('ia-rama-momento-a').value;
    const idMomentoB = document.getElementById('ia-rama-momento-b').value;
    const numMomentosIntermedios = parseInt(document.getElementById('ia-rama-cantidad-input').value) || 3;
    const promptUsuario = document.getElementById('ia-rama-prompt-input').value;
    const arcoSalidaSelect = document.getElementById('ia-rama-arco-salida');
    const arcoSalidaCustomInput = document.getElementById('ia-rama-arco-salida-custom');
    let arcoDeSalida = arcoSalidaSelect.value === 'personalizar'
        ? arcoSalidaCustomInput.value.trim() || 'sin_arco'
        : arcoSalidaSelect.value;
    
    // ... (Las validaciones no cambian)
    if (!idMomentoA || !idMomentoB) {
        alert("Por favor, selecciona un momento inicial y uno final.");
        return;
    }
     if (idMomentoA === idMomentoB) {
        alert("El momento inicial y final no pueden ser el mismo.");
        return;
    }
    if (!promptUsuario.trim()) {
        alert("Por favor, describe qué debe ocurrir en la nueva rama narrativa.");
        return;
    }

    cerrarModalRamaIA();
    
    try {
        // AÑADIDO: Llamada al sistema de síntesis antes de hacer nada más.
        await gestionarSintesisDeDatos();
        progressBarManager.start('Generando rama narrativa...'); // Se reinicia el progressbar

        // 2. Preparar contexto para la IA usando la nueva función
        progressBarManager.set(5, 'Compilando contexto sintetizado...');
        // MODIFICADO: Obtenemos el contexto de la nueva función en lugar de iterar
        const contextoDatos = obtenerContextoSintetizado();
        
        const sintesisTemporalDato = buscarDatoPorNombre("Sintesis temporal de Momentos");
        const sintesisTemporal = sintesisTemporalDato ? sintesisTemporalDato.querySelector('.descripcionh').value : 'No disponible.';
        
        const momentoA_El = document.getElementById(idMomentoA);
        const momentoB_El = document.getElementById(idMomentoB);
        const descMomentoA = momentoA_El.dataset.descripcion;
        const descMomentoB = momentoB_El.dataset.descripcion;

        // 3. Construir el nuevo prompt para la IA
        progressBarManager.set(10, 'Diseñando estructura de la rama...');
        const promptMomentos = `
            Eres un guionista experto. Tu tarea es diseñar una red de ${numMomentosIntermedios} momentos interconectados entre un Momento Inicial (A) y un Momento Final (B).

            **Línea Temporal Actual (Valores numéricos indican el orden):**
            ---
            ${sintesisTemporal}
            ---
            **Contexto del Universo (SÍNTESIS COMPLETA):**
            ---
            ${contextoDatos}
            ---
            **Momento Inicial (A):** "${descMomentoA}"
            **Momento Final (B):** "${descMomentoB}"
            **Instrucción del usuario para esta rama:** "${promptUsuario}"

            **REGLAS (OBLIGATORIAS):**
            1.  **Convergencia Final:** Todas las rutas deben conducir finalmente al Momento B.
            2.  **Bifurcaciones:** La estructura debe tener bifurcaciones (nodos con 2 o más opciones).
            3.  **Coherencia:** La red debe ser lógica y coherente.

            **FORMATO DE RESPUESTA OBLIGATORIO (JSON):**
            {
              "momentos": [
                { "id": "temp_1", "titulo": "...", "descripcion": "...", "conexiones": ["temp_2"] }
              ],
              "nodos_iniciales": ["temp_1"],
              "nodos_finales": ["temp_4"]
            }
        `;

        // ... El resto de la función (pasos 4 en adelante) permanece igual
        const respuestaMomentos = await llamarIAConFeedback(promptMomentos, "Generando estructura de la rama...", 'gemini-2.5-flash-lite', true, 3);
        if (!respuestaMomentos || !Array.isArray(respuestaMomentos.momentos) || !Array.isArray(respuestaMomentos.nodos_iniciales) || !Array.isArray(respuestaMomentos.nodos_finales)) {
            throw new Error("La IA no generó una estructura de rama válida.");
        }

        progressBarManager.set(40, 'Construyendo nuevos momentos...');
        const idMap = new Map();
        const momentosGenerados = respuestaMomentos.momentos;
        const nuevosMomentosParaSintesis = [];
        const posA = { x: parseFloat(momentoA_El.style.left), y: parseFloat(momentoA_El.style.top) };
        const posB = { x: parseFloat(momentoB_El.style.left), y: parseFloat(momentoB_El.style.top) };

        for (const [index, datos] of momentosGenerados.entries()) {
            const factor = (index + 1) / (momentosGenerados.length + 1);
            let posX = posA.x + (posB.x - posA.x) * factor + (Math.random() - 0.5) * 150;
            let posY = posA.y + (posB.y - posA.y) * factor + (Math.random() - 0.5) * 400;

            // AÑADIDO: Generar número aleatorio y crear título único
            const sufijoAleatorio = Math.floor(100 + Math.random() * 900);
            const tituloUnico = `${datos.titulo} ${sufijoAleatorio}`;

            const nuevoNodo = crearNodoEnLienzo({
                id: `momento_rama_${Date.now()}_${index}`,
                titulo: tituloUnico, // MODIFICADO: Usar el título único
                descripcion: datos.descripcion,
                x: posX, y: posY,
                acciones: []
            });
            idMap.set(datos.id, nuevoNodo.id);
            // MODIFICADO: Guardar el título único para la síntesis temporal
            nuevosMomentosParaSintesis.push({ titulo: tituloUnico, id: nuevoNodo.id });
        }
        
        progressBarManager.set(60, 'Conectando la nueva rama...');
        for (const tempId of respuestaMomentos.nodos_iniciales) await conectarMomentos(idMomentoA, idMap.get(tempId));
        for (const datos of momentosGenerados) for (const tempIdDestino of datos.conexiones) await conectarMomentos(idMap.get(datos.id), idMap.get(tempIdDestino));
        for (const tempId of respuestaMomentos.nodos_finales) await conectarMomentos(idMap.get(tempId), idMomentoB);

        if (previsualizacionActiva) dibujarConexiones();
        if(typeof reajustarTamanioLienzo === 'function') reajustarTamanioLienzo();

        progressBarManager.set(80, 'Generando resumen de la rama...');
        const descripcionesNuevas = momentosGenerados.map(n => `- ${n.titulo}: ${n.descripcion}`).join("\n");
        const promptResumen = `Basado en los siguientes eventos, crea un resumen narrativo y un nombre evocador para esta rama de la historia.\nEventos:\n${descripcionesNuevas}\nResponde ÚNICAMENTE con un JSON: {"nombre_rama": "...", "resumen": "..."}.`;
        const respuestaResumen = await llamarIAConFeedback(promptResumen, "Creando dato de resumen...", 'gemini-2.5-flash-lite', true, 1);

        if (respuestaResumen && respuestaResumen.nombre_rama && respuestaResumen.resumen) {
            agregarPersonajeDesdeDatos({
                nombre: `Rama - ${respuestaResumen.nombre_rama}`,
                descripcion: respuestaResumen.resumen,
                etiqueta: 'nota',
                arco: arcoDeSalida
            });
        }
        
        progressBarManager.set(90, 'Actualizando línea temporal...');
        await actualizarSintesisTemporal(nuevosMomentosParaSintesis, idMomentoA, idMomentoB);
        reinicializarFiltrosYActualizarVista();

        progressBarManager.finish('¡Nueva rama narrativa creada con éxito!');

    } catch (error) {
        console.error("Error en la generación de la rama:", error);
        progressBarManager.error(`Error: ${error.message}`);
    }
}


// ... (El resto de las funciones: actualizarSintesisTemporal y conectarMomentos no cambian)
async function actualizarSintesisTemporal(nuevosMomentos, idMomentoA, idMomentoB) {
    let sintesisDatoEl = buscarDatoPorNombre("Sintesis temporal de Momentos");
    let sintesisActual = sintesisDatoEl ? sintesisDatoEl.querySelector('.descripcionh')?.value || "" : "";
    
    const tituloMomentoA = document.getElementById(idMomentoA)?.querySelector('.momento-titulo').textContent;
    const tituloMomentoB = idMomentoB ? document.getElementById(idMomentoB)?.querySelector('.momento-titulo').textContent : null;
    const listaNuevosMomentos = nuevosMomentos.map(m => `"${m.titulo}"`).join(', ');

    const promptSintesis = `
        Eres un cronista de historias. Tu tarea es actualizar una línea temporal con nuevos momentos.

        **Línea Temporal Actual (Formato: Nombre (posición)):**
        ---
        ${sintesisActual || "No existe todavía. Debes crearla desde cero."}
        ---
        **Contexto de la Actualización:**
        Se ha añadido una nueva trama que ocurre ${tituloMomentoB ? `entre "${tituloMomentoA}" y "${tituloMomentoB}"` : `después de "${tituloMomentoA}"`}. Esta trama contiene: [${listaNuevosMomentos}].

        **Instrucciones:**
        1. Inserta TODOS los nuevos momentos en la línea temporal, asignándoles posiciones numéricas que los ubiquen correctamente.
        2. Mantén todos los momentos antiguos.
        3. El formato de cada línea debe ser: \`Nombre del Momento (posición)\`.
        4. Devuelve la LÍNEA TEMPORAL COMPLETA Y ACTUALIZADA, ordenada por posición.

        **Responde ÚNICAMENTE con el texto plano de la nueva línea temporal.**
    `;
    
    try {
        const nuevaSintesis = await llamarIAConFeedback(promptSintesis, "Actualizando la síntesis temporal...", 'gemini-2.5-flash-lite', false);
        if (nuevaSintesis && nuevaSintesis.trim()) {
            await obtenerODefinirDatoSintesis("Sintesis temporal de Momentos");
            await actualizarDescripcionDato("Sintesis temporal de Momentos", nuevaSintesis.trim());
        }
    } catch (error) {
        console.error("No se pudo actualizar la síntesis temporal:", error);
    }
}

async function conectarMomentos(idOrigen, idDestino) {
 
    const nodoOrigen = document.getElementById(idOrigen);
    const nodoDestino = document.getElementById(idDestino);
    if (!nodoOrigen || !nodoDestino || !idDestino) return;

    const acciones = JSON.parse(nodoOrigen.dataset.acciones || '[]');
    if (acciones.some(a => a.idDestino === idDestino)) return;

    const tituloDestino = nodoDestino.querySelector('.momento-titulo').textContent;
    let textoDelBoton = `Continuar: ${tituloDestino.substring(0, 15)}...`;

    try {
        const descOrigen = nodoOrigen.dataset.descripcion || "Punto A";
        const descDestino = nodoDestino.dataset.descripcion || "Punto B";
        const promptBoton = `Escena actual: "${descOrigen}". Escena siguiente: "${descDestino}". Crea un texto corto (máx 15 palabras) para el botón de acción que conecta ambas. Responde solo con el texto.`;
        const respuestaIA = await llamarIAConFeedback(promptBoton, `Generando texto para botón...`, 'gemini-2.5-flash-lite', false);
        if (respuestaIA && respuestaIA.trim() !== '') {
            textoDelBoton = respuestaIA.trim().replace(/^"|"$/g, '');
        }
    } catch (error) {
        console.error("Error al generar texto de botón, usando fallback:", error);
    }

    acciones.push({ textoBoton: textoDelBoton, idDestino: idDestino });
    nodoOrigen.dataset.acciones = JSON.stringify(acciones);
}