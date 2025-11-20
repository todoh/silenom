 // =================================================================
// GENERACION_ANTIGUA.JS - Orquestador Clásico de Generación de Librojuegos
// v2.1 - Con Supervisión Iterativa y Progreso Racionalizado
// =================================================================

// --- CONFIGURACIÓN DE MODELOS ---
const MODELO_GENERACION_PRIMARIA = 'gemini-2.5-flash'; // Para tareas creativas complejas (espinas, finales)
const MODELO_GENERACION_SECUNDARIA = 'gemini-2.0-flash-lite'; // Para tareas rápidas (relleno, botones)
const MODELO_SUPERVISOR = 'gemini-2.5-flash-lite'; // Modelo potente para análisis y corrección de la historia completa.

// =================================================================
// GESTIÓN DEL MODAL ANTIGUO
// =================================================================

/**
 * Abre y prepara el modal para la generación de librojuegos clásica.
 */
function abrirModalMomentosIA() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-momentos-ia');
    if (!overlay || !modal) {
        console.error("No se encontraron los elementos del modal de generación de Librojuego IA.");
        return;
    }

    poblarSelectorDeArcoSalidaParaLibrojuego();
    
    // Asignar evento al botón de añadir punto clave
    const agregarBtn = document.getElementById('agregar-punto-clave-btn');
    if (agregarBtn) {
        const nuevoAgregarBtn = agregarBtn.cloneNode(true);
        agregarBtn.parentNode.replaceChild(nuevoAgregarBtn, agregarBtn);
        nuevoAgregarBtn.addEventListener('click', agregarNuevoPuntoClave);
    }
    
    overlay.style.display = 'block';
    modal.style.display = 'flex';
    overlay.onclick = cerrarModalMomentosIA;

    const generarBtn = document.getElementById('generar-aventura-ia-btn-modal');
    const nuevoGenerarBtn = generarBtn.cloneNode(true);
    generarBtn.parentNode.replaceChild(nuevoGenerarBtn, generarBtn);
    nuevoGenerarBtn.addEventListener('click', iniciarGeneracionLibrojuego);
}

/**
 * Añade un nuevo campo de input para un punto clave en el modal.
 */
function agregarNuevoPuntoClave() {
    const container = document.getElementById('puntos-clave-container');
    if (container) {
        const nuevoInput = document.createElement('input');
        nuevoInput.type = 'text';
        nuevoInput.className = 'clave punto-clave-input';
        nuevoInput.placeholder = 'Escribe otro punto clave...';
        container.appendChild(nuevoInput);
        nuevoInput.focus();
    }
}

/**
 * Llena el selector para el arco de salida específico de este modal.
 */
function poblarSelectorDeArcoSalidaParaLibrojuego() {
    const select = document.getElementById('ia-libro-arco-salida');
    const customInput = document.getElementById('ia-libro-arco-salida-custom');
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
 * Cierra el modal de generación.
 */
function cerrarModalMomentosIA() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-momentos-ia');
    if (overlay && modal) {
        overlay.style.display = 'none';
        modal.style.display = 'none';
        overlay.onclick = null;
    }
}

// =================================================================
// ORQUESTADOR DE GENERACIÓN POR FASES CON SUPERVISIÓN
// =================================================================

async function iniciarGeneracionLibrojuego() {
    // 1. Recoger datos del modal
    const sinopsis = document.getElementById('ia-libro-prompt-input').value;
    const puntosClaveInputs = document.querySelectorAll('#puntos-clave-container .punto-clave-input');
    const puntosClave = Array.from(puntosClaveInputs)
                             .map(input => input.value.trim())
                             .filter(Boolean)
                             .join('\n- ');
    
    const numFinales = parseInt(document.getElementById('ia-libro-finales-input').value) || 3;
    const numMomentosTotales = parseInt(document.getElementById('ia-libro-momentos-input').value) || 25;
    const arquetipoAventura = document.querySelector('input[name="ia-libro-arquetipo"]:checked')?.value || 'exploracion';
    
    if (!sinopsis.trim()) {
        alert("Por favor, describe la sinopsis de tu librojuego.");
        return;
    }

    cerrarModalMomentosIA();
    progressBarManager.start('Iniciando la creación del librojuego...');

    try {
        // ... (resto de la función iniciarGeneracionLibrojuego sin cambios)
        
        // --- PREPARACIÓN: SINCRONIZAR Y COMPILAR CONTEXTO DE PERSISTENCIA ---
        progressBarManager.set(5, 'Sincronizando base de datos de conocimiento...');
        await gestionarSintesisDeDatos();
        const contextoGlobal = obtenerContextoSintetizado();
        
        // --- FASE A: CREAR LA ESPINA DORSAL NARRATIVA ---
        progressBarManager.set(10, 'Fase A: Creando la espina dorsal de la trama...');
        const momentoInicial = crearNodoEnLienzo({
            id: `momento_inicial_${Date.now()}`,
            titulo: "El Comienzo",
            descripcion: sinopsis.substring(0, 150) + "...",
            x: 200, y: 400,
            acciones: []
        });
        marcarComoInicio(momentoInicial.id);
        
        const promptEspinaDorsal = `
            Basado en la sinopsis, puntos clave y contexto, genera la trama principal en 4 momentos hito.
            **Sinopsis:** ${sinopsis}
            **Puntos Clave:**\n- ${puntosClave || "Ninguno."}
            **Contexto del Universo:**\n${contextoGlobal}
            **Instrucciones:**
            - Crea 4 momentos que formen una secuencia lógica. El último debe ser la conclusión principal.
            - Responde ÚNICAMENTE con un array JSON de 4 objetos: [{"titulo": "...", "descripcion": "..."}, ...]`;
        const momentosEspinaDorsal = await llamarIAConFeedback(promptEspinaDorsal, "Generando hitos de la trama...", MODELO_GENERACION_PRIMARIA, true, 3);
        
        let nodosEspinaDorsal = [momentoInicial.id];
        let ultimoNodoId = momentoInicial.id;
        for (const [index, momentoData] of momentosEspinaDorsal.entries()) {
            const nuevoNodo = crearNodoEnLienzo({
                id: `momento_espina_${index}_${Date.now()}`,
                titulo: momentoData.titulo,
                descripcion: momentoData.descripcion,
                x: 200 + (index + 1) * 250, y: 400,
                acciones: []
            });
            await conectarMomentos(ultimoNodoId, nuevoNodo.id, contextoGlobal);
            nodosEspinaDorsal.push(nuevoNodo.id);
            ultimoNodoId = nuevoNodo.id;
        }

        // --- FASE B: RAMIFICAR HACIA FINALES SECUNDARIOS ---
        progressBarManager.set(30, 'Fase B: Creando finales alternativos...');
        const puntosDeRamificacion = nodosEspinaDorsal.slice(1, -1);
        let momentosClaveParaRelleno = [...nodosEspinaDorsal];

        for (let i = 0; i < numFinales - 1; i++) {
            const puntoOrigenId = puntosDeRamificacion[i % puntosDeRamificacion.length];
            const nodoOrigenEl = document.getElementById(puntoOrigenId);
            const contextoLocal = `El jugador ha llegado a este punto: "${nodoOrigenEl.dataset.descripcion}".`;
            
            progressBarManager.set(30 + (i / (numFinales - 1)) * 20, `Generando trama para el final alternativo ${i+1}...`);
            const nuevosNodosIds = await generarNubeConectada(puntoOrigenId, 3, `A partir de aquí, crea una ruta alternativa que lleve a un final diferente.`, contextoGlobal, contextoLocal);
            momentosClaveParaRelleno.push(...nuevosNodosIds);
        }

        // --- FASE C: RELLENO CON CONTENIDO SECUNDARIO ---
        progressBarManager.set(50, 'Fase C: Tejiendo tramas secundarias...');
        const momentosActuales = () => Array.from(document.querySelectorAll('.momento-nodo')).map(n => n.id);
        let momentosARellenar = numMomentosTotales - momentosActuales().length;
        if (arquetipoAventura === 'lineal') momentosARellenar *= 0.5;
        if (arquetipoAventura === 'compleja') momentosARellenar *= 1.2;

        if (momentosARellenar > 0) {
            const numRamasSecundarias = Math.max(1, Math.ceil(momentosARellenar / 3));
            for (let i = 0; i < numRamasSecundarias; i++) {
                 if (momentosActuales().length >= numMomentosTotales) break;
                progressBarManager.set(50 + (i / numRamasSecundarias) * 25, `Añadiendo desvío narrativo ${i+1}...`);
                if (momentosClaveParaRelleno.length < 2) break;

                let idOrigen = momentosClaveParaRelleno[Math.floor(Math.random() * momentosClaveParaRelleno.length)];
                let idDestino = momentosClaveParaRelleno[Math.floor(Math.random() * momentosClaveParaRelleno.length)];
                if (idOrigen !== idDestino) {
                     await generarRamaConectada(idOrigen, idDestino, 2, "Crea una subtrama interesante que conecte estos dos puntos.", contextoGlobal);
                }
            }
        }
        
        // --- FASE D: SUPERVISIÓN Y AUTO-ARREGLO (Iterativo) ---
        const MAX_PASADAS_SUPERVISION = 2;
        for (let i = 0; i < MAX_PASADAS_SUPERVISION; i++) {
            progressBarManager.set(80 + (i * 7), `Fase D: Pasada de supervisión ${i + 1}/${MAX_PASADAS_SUPERVISION}...`);
            const seHicieronCorrecciones = await supervisarYCorregirHistoria(contextoGlobal, sinopsis);
            if (!seHicieronCorrecciones) {
                console.log(`Supervisor: No se necesitaron más correcciones en la pasada ${i + 1}.`);
                break; 
            }
        }

        // --- FASE FINAL: ORGANIZACIÓN Y LIMPIEZA ---
        progressBarManager.set(95, 'Organizando el librojuego final...');
        if(typeof aplicarAutoLayout === 'function') {
            aplicarAutoLayout();
        }
        
        progressBarManager.set(98, 'Dibujando conexiones finales...');
        if (previsualizacionActiva) {
            dibujarConexiones();
        }

        progressBarManager.finish('¡Librojuego generado con éxito!');

    } catch (error) {
        console.error("Error durante la generación del librojuego:", error);
        progressBarManager.error(`Error: ${error.message}`);
    }
}

// =================================================================
// FUNCIONES NÚCLEO DE GENERACIÓN ANTIGUAS
// =================================================================

async function generarNubeConectada(idMomentoA, numNodos, promptTrama, contextoGlobal, contextoLocal) {
    const momentoA_El = document.getElementById(idMomentoA);
    const descMomentoA = momentoA_El.dataset.descripcion;

    const promptNodos = `
        **Contexto Global:** ${contextoGlobal}
        **Contexto Local:** ${contextoLocal}
        **Punto de Partida:** "${descMomentoA}"
        **Misión:** "${promptTrama}"
        **Tarea:** Genera una red de ${numNodos} momentos.
        
        **REGLAS OBLIGATORIAS:**
        1. Cada momento DEBE tener al menos 2 opciones de salida (en su array "conexiones"), a menos que sea un nodo final de esta subtrama.
        2. NO crees nodos con una sola opción de salida.
        
        **Formato JSON Obligatorio:**
        { "momentos": [ { "id": "temp_1", "titulo": "...", "descripcion": "...", "conexiones": ["temp_2", "temp_3"] } ], "conexiones_iniciales": ["temp_1"] }`;

    const respuestaNodos = await llamarIAConFeedback(promptNodos, "Expandiendo trama...", MODELO_GENERACION_PRIMARIA, true, 2);
    if (!respuestaNodos || !Array.isArray(respuestaNodos.momentos)) return [];

    const nodosCreados = new Map();
    const idsRealesNuevos = [];
    for (const datos of respuestaNodos.momentos) {
        const nuevoNodo = crearNodoEnLienzo({ id: `momento_nube_${Date.now()}_${datos.id}`, titulo: datos.titulo, descripcion: datos.descripcion, x: 0, y: 0, acciones: [] });
        nodosCreados.set(datos.id, nuevoNodo.id);
        idsRealesNuevos.push(nuevoNodo.id);
    }

    for (const tempId of respuestaNodos.conexiones_iniciales || []) await conectarMomentos(idMomentoA, nodosCreados.get(tempId), contextoGlobal);
    for (const datos of respuestaNodos.momentos) {
        if (datos.conexiones) {
            for (const tempIdDestino of datos.conexiones) await conectarMomentos(nodosCreados.get(datos.id), nodosCreados.get(tempIdDestino), contextoGlobal);
        }
    }
    
    if (typeof aplicarLayoutDeNube === 'function') aplicarLayoutDeNube(momentoA_El, idsRealesNuevos.map(id => document.getElementById(id)));
    return idsRealesNuevos;
}

async function generarRamaConectada(idMomentoA, idMomentoB, numIntermedios, promptTrama, contextoGlobal) {
    const momentoA_El = document.getElementById(idMomentoA);
    const momentoB_El = document.getElementById(idMomentoB);
    const descMomentoA = momentoA_El.dataset.descripcion;
    const descMomentoB = momentoB_El.dataset.descripcion;

    const promptMomentos = `
        **Contexto Global:** ${contextoGlobal}
        **Momento Inicial (A):** "${descMomentoA}"
        **Momento Final (B):** "${descMomentoB}"
        **Misión:** "${promptTrama}"
        **Tarea:** Diseña ${numIntermedios} momentos intermedios para conectar A y B.
        
        **REGLAS OBLIGATORIAS:**
        1. Debe haber bifurcaciones. Cada momento intermedio DEBE tener al menos 2 opciones de salida.
        2. Todas las rutas deben poder llevar eventualmente al momento B.
        
        **Formato JSON Obligatorio:**
        { "momentos": [ { "id": "temp_1", "titulo": "...", "descripcion": "...", "conexiones": ["temp_2", "temp_3"] } ], "nodos_iniciales": ["temp_1"], "nodos_finales": ["temp_2"] }`;

    const respuestaMomentos = await llamarIAConFeedback(promptMomentos, "Creando conexión narrativa...", MODELO_GENERACION_SECUNDARIA, true, 2);
    if (!respuestaMomentos || !Array.isArray(respuestaMomentos.momentos)) return;

    const idMap = new Map();
    const posA = { x: parseFloat(momentoA_El.style.left), y: parseFloat(momentoA_El.style.top) };
    const posB = { x: parseFloat(momentoB_El.style.left), y: parseFloat(momentoB_El.style.top) };

    for (const [index, datos] of respuestaMomentos.momentos.entries()) {
        const factor = (index + 1) / (respuestaMomentos.momentos.length + 1);
        let posX = posA.x + (posB.x - posA.x) * factor + (Math.random() - 0.5) * 200;
        let posY = posA.y + (posB.y - posA.y) * factor + (Math.random() - 0.5) * 200;
        const nuevoNodo = crearNodoEnLienzo({ id: `momento_rama_${Date.now()}_${index}`, titulo: datos.titulo, descripcion: datos.descripcion, x: posX, y: posY, acciones: [] });
        idMap.set(datos.id, nuevoNodo.id);
    }
    
    for (const tempId of respuestaMomentos.nodos_iniciales || []) await conectarMomentos(idMomentoA, idMap.get(tempId), contextoGlobal);
    for (const datos of respuestaMomentos.momentos) for (const tempIdDestino of datos.conexiones || []) await conectarMomentos(idMap.get(datos.id), idMap.get(tempIdDestino), contextoGlobal);
    for (const tempId of respuestaMomentos.nodos_finales || []) await conectarMomentos(idMap.get(tempId), idMomentoB, contextoGlobal);
}

// =================================================================
// SISTEMA DE SUPERVISIÓN Y AUTO-ARREGLO
// =================================================================

/**
 * Analiza toda la historia generada y aplica correcciones.
 * @param {string} contextoGlobal - La síntesis de todos los datos de persistencia.
 * @param {string} sinopsisOriginal - La sinopsis original del usuario para referencia.
 * @returns {Promise<boolean>} Devuelve true si se realizaron correcciones, de lo contrario false.
 */
async function supervisarYCorregirHistoria(contextoGlobal, sinopsisOriginal) {
    // 1. Recopilar todos los datos de la historia del lienzo
    const todosLosNodos = Array.from(document.querySelectorAll('.momento-nodo')).map(nodoEl => {
        return {
            id: nodoEl.id,
            titulo: nodoEl.querySelector('.momento-titulo').textContent,
            descripcion: nodoEl.dataset.descripcion,
            acciones: JSON.parse(nodoEl.dataset.acciones || '[]'),
            es_final: JSON.parse(nodoEl.dataset.acciones || '[]').length === 0
        };
    });

    if (todosLosNodos.length === 0) {
        console.log("Supervisor: No hay nodos que revisar.");
        return false;
    }

    // 2. Construir el prompt para el Agente Supervisor
    const promptSupervisor = `
        Eres un Supervisor de Coherencia Narrativa. Tu tarea es analizar la siguiente estructura de librojuego,
        identificar problemas y proponer soluciones concretas en formato JSON.

        **Sinopsis Original de la Historia:**
        ---
        ${sinopsisOriginal}
        ---
        **Contexto y Datos del Universo (Fuente de Verdad):**
        ---
        ${contextoGlobal}
        ---
        **Estructura Completa del Librojuego (Nodos y Conexiones):**
        ---
        ${JSON.stringify(todosLosNodos, null, 2)}
        ---

        **REGLAS DE SUPERVISIÓN (OBLIGATORIAS):**
        1.  **INCOHERENCIAS:** Busca contradicciones lógicas. ¿Un personaje muerto reaparece? ¿Un objeto clave se obtiene dos veces? ¿La trama se desvía absurdamente de la sinopsis o el contexto?
        2.  **NODOS DE OPCIÓN ÚNICA:** Identifica CUALQUIER nodo que NO sea un final (es_final: false) pero que solo tenga 1 acción (len(acciones) == 1). Esto es un error de diseño. Los nodos deben tener 0 (final) o 2+ opciones.
        3.  **BUCLES SIN SALIDA O CALLEJONES SIN SALIDA:** ¿Hay ramas que no llevan a ninguna parte o que crean bucles infinitos sin progreso?

        **TAREA:**
        Basado en tu análisis, genera un plan de corrección. Si no encuentras errores, devuelve un array vacío.

        **FORMATO DE RESPUESTA OBLIGATORIO (JSON de un array de acciones):**
        [
            {
                "tipo": "MODIFICAR_NODO",
                "id_nodo": "id_del_nodo_a_cambiar",
                "justificacion": "Breve explicación del porqué.",
                "nuevos_datos": { "descripcion": "Nuevo texto corregido..." }
            },
            {
                "tipo": "AÑADIR_OPCION",
                "id_nodo": "id_del_nodo_con_opcion_unica",
                "justificacion": "Este nodo necesita una segunda opción para dar elección al jugador.",
                "nueva_opcion": { "titulo_nuevo_nodo": "Un camino inesperado", "descripcion_nuevo_nodo": "Descripción de lo que pasa en este nuevo camino..." }
            }
        ]
    `;

    // 3. Llamar a la IA Supervisora
    const respuestaSupervisor = await llamarIAConFeedback(promptSupervisor, "Supervisor analizando...", MODELO_SUPERVISOR, true, 1);

    if (!respuestaSupervisor || !Array.isArray(respuestaSupervisor) || respuestaSupervisor.length === 0) {
        console.log("Supervisor: No se encontraron problemas de coherencia. ¡Todo en orden!");
        return false;
    }
    
    // 4. Aplicar las correcciones dinámicamente
    for (const correccion of respuestaSupervisor) {
        const nodoEl = document.getElementById(correccion.id_nodo);
        if (!nodoEl) continue;

        console.warn(`Supervisor aplicando corrección: ${correccion.justificacion}`);

        switch (correccion.tipo) {
            case 'MODIFICAR_NODO':
                if (correccion.nuevos_datos.descripcion) {
                    nodoEl.dataset.descripcion = correccion.nuevos_datos.descripcion;
                    const descTextarea = nodoEl.querySelector('.momento-descripcion');
                    if(descTextarea) descTextarea.value = correccion.nuevos_datos.descripcion;
                }
                break;

            case 'AÑADIR_OPCION':
                const nuevaOpcion = correccion.nueva_opcion;
                const posNodoOrigen = { x: parseFloat(nodoEl.style.left), y: parseFloat(nodoEl.style.top) };
                
                const nuevoNodo = crearNodoEnLienzo({
                    id: `momento_fix_${Date.now()}`,
                    titulo: nuevaOpcion.titulo_nuevo_nodo,
                    descripcion: nuevaOpcion.descripcion_nuevo_nodo,
                    x: posNodoOrigen.x + (Math.random() - 0.5) * 400,
                    y: posNodoOrigen.y + 250 + (Math.random() * 100),
                    acciones: [] 
                });
                
                await conectarMomentos(correccion.id_nodo, nuevoNodo.id, contextoGlobal);
                break;
        }
    }
    await new Promise(resolve => setTimeout(resolve, 500)); 
    return true; // Se realizaron correcciones
}


 