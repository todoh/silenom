// =================================================================
// MOMENTOS-IA3.JS - Generador de Redes de Nodos con Contexto Sintetizado
// =================================================================

/**
 * Abre y prepara el modal para la generación de redes de nodos.
 */
function abrirModalNubeIA() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-momentos-nube-ia'); 
    if (!overlay || !modal) {
        console.error("No se encontraron los elementos del modal de generación de Nodos IA.");
        return;
    }
    // ELIMINADO: poblarSelectorDeArcosParaNube();
    poblarSelectorDeMomentoInicialParaNube();
    poblarSelectorDeArcoSalidaParaNube();
    
    overlay.style.display = 'block';
    modal.style.display = 'flex';
    overlay.onclick = cerrarModalNubeIA;

    const generarBtn = document.getElementById('generar-nube-ia-btn-modal');
    generarBtn.onclick = iniciarGeneracionDeNube;
}

// ELIMINADO: La función poblarSelectorDeArcosParaNube() ya no es necesaria.

/**
 * Llena el selector de momento inicial específico de este modal.
 */
function poblarSelectorDeMomentoInicialParaNube() {
    // ... (El contenido de esta función no cambia)
    const selectA = document.getElementById('ia-nube-momento-a');
    if (!selectA) return;

    selectA.innerHTML = '<option value="">-- Momento Inicial --</option>';

    const todosLosMomentos = document.querySelectorAll('#momentos-lienzo .momento-nodo');
    if (todosLosMomentos.length < 1) {
        const option = new Option("No hay momentos", "");
        option.disabled = true;
        selectA.add(option);
        return;
    }

    todosLosMomentos.forEach(nodo => {
        selectA.add(new Option(nodo.querySelector('.momento-titulo').textContent, nodo.id));
    });
}


/**
 * Llena el selector para el arco de salida específico de este modal.
 */
function poblarSelectorDeArcoSalidaParaNube() {
    // ... (El contenido de esta función no cambia)
    const select = document.getElementById('ia-nube-arco-salida');
    const customInput = document.getElementById('ia-nube-arco-salida-custom');
    if (!select || !customInput) return;

    select.innerHTML = '';

    if (typeof opcionesArco === 'undefined') return;

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
 * Cierra el modal de generación de redes de nodos.
 */
function cerrarModalNubeIA() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-momentos-nube-ia');
    if (overlay && modal) {
        overlay.style.display = 'none';
        modal.style.display = 'none';
        overlay.onclick = null;
    }
}


/**
 * Orquestador principal para la creación de la red de nodos.
 */
async function iniciarGeneracionDeNube() {
    // 1. Recoger datos del modal
    // ELIMINADO: const arcosSeleccionados = Array.from(document.querySelectorAll('#ia-nube-arcos-filter-container input:checked')).map(cb => cb.value);
    const idMomentoA = document.getElementById('ia-nube-momento-a').value;
    const numMomentosIntermedios = parseInt(document.getElementById('ia-nube-intermedios-input').value) || 5;
    const numMomentosUltimos = parseInt(document.getElementById('ia-nube-ultimos-input').value) || 3;
    const promptUsuario = document.getElementById('ia-nube-prompt-input').value;
    const arcoSalidaSelect = document.getElementById('ia-nube-arco-salida');
    const arcoSalidaCustomInput = document.getElementById('ia-nube-arco-salida-custom');
    let arcoDeSalida = arcoSalidaSelect.value === 'personalizar'
        ? arcoSalidaCustomInput.value.trim() || 'sin_arco'
        : arcoSalidaSelect.value;
    
    // ... (Las validaciones no cambian)
    if (!idMomentoA || !promptUsuario.trim()) {
        alert("Por favor, selecciona un momento inicial y describe la trama.");
        return;
    }

    cerrarModalNubeIA();
    
    try {
        // AÑADIDO: Llamada al sistema de síntesis.
        await gestionarSintesisDeDatos();
        progressBarManager.start('Iniciando generación de red de nodos...');

        // 2. Preparar contexto para la IA con el nuevo sistema
        progressBarManager.set(5, 'Compilando contexto sintetizado...');
        // MODIFICADO:
        const contextoDatos = obtenerContextoSintetizado();
        const sintesisTemporalDato = buscarDatoPorNombre("Sintesis temporal de Momentos");
        const sintesisTemporal = sintesisTemporalDato ? sintesisTemporalDato.querySelector('.descripcionh').value : 'No disponible.';

        const momentoA_El = document.getElementById(idMomentoA);
        const descMomentoA = momentoA_El.dataset.descripcion;

        // 3. Construir el prompt principal
        progressBarManager.set(10, 'Diseñando la estructura de la red...');
        const promptNodos = `
            Eres un arquitecto narrativo. Tu tarea es diseñar una red de momentos clave a partir de un punto de partida.

            **Línea Temporal Actual (Valores numéricos indican el orden):**
            ---
            ${sintesisTemporal}
            ---
            **Contexto del Universo (SÍNTESIS COMPLETA):**
            ---
            ${contextoDatos}
            ---
            **Punto de Partida (Momento A):** "${descMomentoA}"
            **Trama para la Red:** "${promptUsuario}"

            **Requisitos de la Red:**
            1. Genera ${numMomentosIntermedios} momentos intermedios y ${numMomentosUltimos} momentos "últimos".
            2. Los momentos intermedios conectan el Momento A con los momentos últimos.
            3. Cada momento puede tener un MÁXIMO de 3 opciones de salida.
            4. Los momentos "últimos" no tienen conexiones de salida a otros nodos NUEVOS.

            **Formato de Respuesta Obligatorio (JSON):**
            {
              "momentos": [
                { "id": "temp_1", "titulo": "...", "descripcion": "...", "tipo": "intermedio", "conexiones": ["temp_2"] }
              ],
              "conexiones_iniciales": ["temp_1", "temp_4"]
            }
        `;

        // ... El resto de la función (pasos 4 en adelante) permanece igual
        const respuestaNodos = await llamarIAConFeedback(promptNodos, "Generando estructura de nodos...", 'gemini-2.5-flash-lite', true, 3);
        if (!respuestaNodos || !Array.isArray(respuestaNodos.momentos) || !Array.isArray(respuestaNodos.conexiones_iniciales)) {
            throw new Error("La IA no generó una estructura de red válida.");
        }

        progressBarManager.set(50, 'Construyendo momentos en el lienzo...');
        const nodosCreados = new Map();
        const elementosNuevos = [];
        const nuevosMomentosParaSintesis = [];

        for (const datos of respuestaNodos.momentos) {
            // AÑADIDO: Generar número aleatorio y crear título único
            const sufijoAleatorio = Math.floor(100 + Math.random() * 900);
            const tituloUnico = `${datos.titulo} ${sufijoAleatorio}`;

            const nuevoNodo = crearNodoEnLienzo({
                id: `momento_nube_${Date.now()}_${datos.id}`,
                titulo: tituloUnico, // MODIFICADO: Usar el título único
                descripcion: datos.descripcion,
                x: 0, y: 0,
                acciones: []
            });
            nodosCreados.set(datos.id, nuevoNodo.id);
            elementosNuevos.push(document.getElementById(nuevoNodo.id));
            // MODIFICADO: Guardar el título único para la síntesis temporal
            nuevosMomentosParaSintesis.push({ titulo: tituloUnico, id: nuevoNodo.id });
        }
        
        const accionesMomentoA = JSON.parse(momentoA_El.dataset.acciones || '[]');
        for (const tempId of respuestaNodos.conexiones_iniciales) {
            const idDestinoReal = nodosCreados.get(tempId);
            if (idDestinoReal) {
                await conectarMomentos(idMomentoA, idDestinoReal); // Reutilizamos conectarMomentos para generar texto IA
            }
        }
       
        for (const datos of respuestaNodos.momentos) {
             if (datos.conexiones) {
                for (const tempIdDestino of datos.conexiones) {
                    const idOrigenReal = nodosCreados.get(datos.id);
                    const idDestinoReal = nodosCreados.get(tempIdDestino);
                     if (idOrigenReal && idDestinoReal) {
                         await conectarMomentos(idOrigenReal, idDestinoReal);
                    }
                }
            }
        }
        
        progressBarManager.set(75, 'Organizando la red de nodos...');
        aplicarLayoutDeNube(momentoA_El, elementosNuevos);

        progressBarManager.set(85, 'Generando resumen de la red...');
        const descripcionesNuevas = respuestaNodos.momentos.map(n => `- ${n.titulo}: ${n.descripcion}`).join("\n");
        const promptResumen = `Basado en la siguiente red de momentos, crea un resumen conciso y un nombre evocador.\nMomentos:\n${descripcionesNuevas}\nResponde ÚNICAMENTE con JSON: {"nombre_red": "...", "resumen": "..."}.`;
        const respuestaResumen = await llamarIAConFeedback(promptResumen, "Creando dato de resumen...", 'gemini-2.5-flash-lite', true, 1);

        if (respuestaResumen && respuestaResumen.nombre_red && respuestaResumen.resumen) {
            agregarPersonajeDesdeDatos({
                nombre: `Nodos - ${respuestaResumen.nombre_red}`,
                descripcion: respuestaResumen.resumen,
                etiqueta: 'nota',
                arco: arcoDeSalida
            });
        }
        
        progressBarManager.set(90, 'Actualizando línea temporal...');
        if(typeof actualizarSintesisTemporal === 'function') {
           await actualizarSintesisTemporal(nuevosMomentosParaSintesis, idMomentoA, null);
        }
        reinicializarFiltrosYActualizarVista();


        if (previsualizacionActiva) dibujarConexiones();
        progressBarManager.finish('¡Red de nodos creada con éxito!');

    } catch (error) {
        console.error("Error en la generación de la red de nodos:", error);
        progressBarManager.error(`Error: ${error.message}`);
    }
}


// ... (El resto de las funciones: aplicarLayoutDeNube y reajustarTamanioLienzo no cambian)
function aplicarLayoutDeNube(nodoOrigenEl, nodosNuevos) {
    if (!nodoOrigenEl || nodosNuevos.length === 0) return;

    const posOrigen = { x: parseFloat(nodoOrigenEl.style.left), y: parseFloat(nodoOrigenEl.style.top) };
    const numNodos = nodosNuevos.length;
    const radioInicial = 350;
    const radioIncremento = 150;
    let nodosPorCapa = Math.ceil(numNodos / 2); 

    for (let i = 0; i < numNodos; i++) {
        const nodo = nodosNuevos[i];
        const capa = Math.floor(i / nodosPorCapa);
        const indiceEnCapa = i % nodosPorCapa;
        const radio = radioInicial + (capa * radioIncremento);
        const angulo = (indiceEnCapa / (capa === 0 ? nodosPorCapa : numNodos - nodosPorCapa)) * 2 * Math.PI;
        nodo.style.left = `${posOrigen.x + radio * Math.cos(angulo)}px`;
        nodo.style.top = `${posOrigen.y + radio * Math.sin(angulo)}px`;
    }
    
    reajustarTamanioLienzo(); 
}

function reajustarTamanioLienzo() {
    const lienzo = document.getElementById('momentos-lienzo');
    if (!lienzo) return;
    const EXPANSION_MARGIN = 300;
    let maxX = 0, maxY = 0, minX = Infinity, minY = Infinity;
    
    lienzo.querySelectorAll('.momento-nodo').forEach(nodo => {
        const x = parseFloat(nodo.style.left);
        const y = parseFloat(nodo.style.top);
        if (x + nodo.offsetWidth > maxX) maxX = x + nodo.offsetWidth;
        if (y + nodo.offsetHeight > maxY) maxY = y + nodo.offsetHeight;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
    });

    if (minX < 50 || minY < 50) {
        const shiftX = minX < 50 ? 50 - minX : 0;
        const shiftY = minY < 50 ? 50 - minY : 0;
        lienzo.querySelectorAll('.momento-nodo').forEach(nodo => {
            nodo.style.left = `${parseFloat(nodo.style.left) + shiftX}px`;
            nodo.style.top = `${parseFloat(nodo.style.top) + shiftY}px`;
        });
        maxX += shiftX;
        maxY += shiftY;
    }

    const nuevoAncho = Math.max(lienzo.offsetWidth, maxX + EXPANSION_MARGIN);
    const nuevoAlto = Math.max(lienzo.offsetHeight, maxY + EXPANSION_MARGIN);
    lienzo.style.width = `${nuevoAncho}px`;
    lienzo.style.height = `${nuevoAlto}px`;
}