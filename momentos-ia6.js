// =================================================================
// MOMENTOS-IA6.JS - Sistema de Fabricación de Aventura Progresiva
// Modelo: Expansión controlada con fases de ramificación, confluencia y supervisión.
// =================================================================

const MODELO_PROGRESIVO = 'gemini-2.5-flash-lite';
const MODELO_SUPERVISOR_PROGRESIVO = 'gemini-2.5-flash-lite'; // Modelo más potente para supervisión
const CICLOS_TOTALES = 12;
const CICLOS_EXPANSION_PURA = 8;
/**
 * [NUEVA FUNCIÓN HELPER]
 * Reconstruye la ruta narrativa desde el nodo inicial hasta un nodo específico.
 * @param {string} idNodoFinal - El ID del nodo hasta el cual trazar la ruta.
 * @param {Map<string, string>} parentMap - Un mapa que asocia cada hijo con su padre.
 * @param {Map<string, object>} todosLosNodos - El mapa con los datos de todos los nodos.
 * @returns {string} Un resumen formateado de la ruta narrativa.
 */
function obtenerRutaNarrativa(idNodoFinal, parentMap, todosLosNodos) {
    const ruta = [];
    let idActual = idNodoFinal;
    
    // Viajamos hacia atrás usando el mapa de padres, hasta un máximo de 10 pasos para seguridad.
    for (let i = 0; i < 10 && idActual; i++) {
        const nodoData = todosLosNodos.get(idActual);
        if (nodoData) {
            ruta.unshift(`- ${nodoData.titulo}`); // Añadimos al principio para mantener el orden cronológico
        }
        idActual = parentMap.get(idActual);
    }
    
    if (ruta.length > 0) {
        return `A continuación se muestra la secuencia de eventos que han llevado a este punto:\n${ruta.join('\n')}`;
    }
    
    return "Este es el comienzo de la historia.";
}
/**
 * Abre el modal para el Fabricador de Aventuras Progresivo.
 */
function abrirModalFabricadorProgresivo() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-fabricador-progresivo');
    if (!overlay || !modal) {
        console.error("No se encontraron los elementos del modal del Fabricador Progresivo.");
        return;
    }

    overlay.style.display = 'block';
    modal.style.display = 'flex';
    overlay.onclick = cerrarModalFabricadorProgresivo;

    const generarBtn = document.getElementById('generar-fabricador-btn-modal-progresivo');
    // Re-clonamos el botón para limpiar listeners antiguos y evitar ejecuciones múltiples
    const nuevoGenerarBtn = generarBtn.cloneNode(true);
    generarBtn.parentNode.replaceChild(nuevoGenerarBtn, generarBtn);

    nuevoGenerarBtn.addEventListener('click', iniciarFabricacionProgresiva);
}

/**
 * Cierra el modal del Fabricador Progresivo.
 */
function cerrarModalFabricadorProgresivo() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-fabricador-progresivo');
    if (overlay && modal) {
        overlay.style.display = 'none';
        modal.style.display = 'none';
        overlay.onclick = null;
    }
}

 

/**
 * [NUEVA FUNCIÓN] Analiza la red en busca de bucles y propone correcciones.
 * @param {Map<string, object>} todosLosNodos - El mapa de todos los nodos creados.
 * @returns {Promise<{seHicieronCorrecciones: boolean, nuevosNodosHoja: string[]}>}
 */
async function supervisarYCorregirRed(todosLosNodos) {
    const nodosParaIA = Array.from(todosLosNodos.keys()).map(id => {
        const nodoEl = document.getElementById(id);
        if (!nodoEl) return null;
        return {
            id: id,
            titulo: nodoEl.querySelector('.momento-titulo').textContent,
            conexiones: JSON.parse(nodoEl.dataset.acciones || '[]').map(a => a.idDestino)
        };
    }).filter(Boolean); // Filtra cualquier nodo nulo que no se encontrara

    const prompt = `
Eres un Supervisor de Coherencia Narrativa. Tu tarea es analizar la estructura de una aventura y detectar bucles lógicos que impidan el progreso.
Un bucle ocurre si un nodo puede, a través de una o más conexiones, llevar de vuelta a sí mismo.

**Estructura de la Aventura:**
---
${JSON.stringify(nodosParaIA, null, 2)}
---

**TAREA:**
1.  **Analiza la estructura:** Busca cualquier ruta que permita a un jugador volver a un nodo ya visitado en la misma rama (un bucle).
2.  **Propón correcciones:** Si encuentras un bucle, sugiere una corrección. La mejor corrección es **reconectar** la acción que causa el bucle hacia un nodo "hoja" (un nodo sin salidas) que sea lógicamente apropiado.
3.  **Formato de Salida:** Responde con un array JSON de correcciones. Si no hay errores, devuelve un array vacío \`[]\`.

**Formato de Respuesta Obligatorio (JSON):**
[
  {
    "tipo": "RECONECTAR_NODO",
    "justificacion": "El nodo 'La Emboscada' tiene una opción para 'Huir', que lleva de vuelta a 'El Bosque', creando un bucle infinito. Lo reconectaré a un nuevo final.",
    "id_nodo_origen": "id_del_nodo_con_la_accion_incorrecta",
    "id_conexion_a_cambiar": "id_del_nodo_al_que_apunta_incorrectamente",
    "id_nuevo_destino_sugerido": "id_de_un_nodo_hoja_existente_y_adecuado"
  }
]`;

    const correcciones = await llamarIAConFeedback(prompt, "Supervisor analizando...", MODELO_SUPERVISOR_PROGRESIVO, true, 2);

    if (!correcciones || !Array.isArray(correcciones) || correcciones.length === 0) {
        return { seHicieronCorrecciones: false, nuevosNodosHoja: [] };
    }

    let seHicieronCorrecciones = false;
    for (const correccion of correcciones) {
        if (correccion.tipo === 'RECONECTAR_NODO') {
            const { id_nodo_origen, id_conexion_a_cambiar, id_nuevo_destino_sugerido } = correccion;
            const nodoOrigenEl = document.getElementById(id_nodo_origen);
            if (nodoOrigenEl && document.getElementById(id_nuevo_destino_sugerido)) {
                let acciones = JSON.parse(nodoOrigenEl.dataset.acciones || '[]');
                const indiceAccion = acciones.findIndex(a => a.idDestino === id_conexion_a_cambiar);
                if (indiceAccion !== -1) {
                    console.warn(`SUPERVISOR: ${correccion.justificacion}`);
                    acciones[indiceAccion].idDestino = id_nuevo_destino_sugerido;
                    nodoOrigenEl.dataset.acciones = JSON.stringify(acciones);
                    seHicieronCorrecciones = true;
                }
            }
        }
    }

    // Recalcular los nodos hoja después de las correcciones
    const nodosConSalida = new Set();
    document.querySelectorAll('.momento-nodo').forEach(nodoEl => {
        const acciones = JSON.parse(nodoEl.dataset.acciones || '[]');
        if (acciones.length > 0) {
            nodosConSalida.add(nodoEl.id);
        }
    });
    const nuevosNodosHoja = Array.from(document.querySelectorAll('.momento-nodo'))
        .map(n => n.id)
        .filter(id => !nodosConSalida.has(id));

    return { seHicieronCorrecciones, nuevosNodosHoja };
}


 /**
 * Función principal que orquesta la creación de la aventura en 10 ciclos con supervisión.
 * --- VERSIÓN MODIFICADA CON CONTEXTO COMPLETO ---
 */
async function iniciarFabricacionProgresiva() {
    const sinopsisUsuario = document.getElementById('ia-fabricador-prompt-input-progresivo').value;
    if (!sinopsisUsuario || sinopsisUsuario.trim() === '') {
        alert("Debes proporcionar una idea inicial para la historia.");
        return;
    }
    cerrarModalFabricadorProgresivo();

    progressBarManager.start("Iniciando fabricación de aventura progresiva...");

    try {
        // --- AÑADIDO: Sincronizar y obtener el contexto global al inicio ---
        progressBarManager.set(1, "Sincronizando datos del proyecto...");
        await gestionarSintesisDeDatos();
        const contextoGlobal = obtenerContextoSintetizado();
        console.log("Contexto Global Compilado:", contextoGlobal);
        // --- FIN AÑADIDO ---

        progressBarManager.set(2, "Creando el punto de partida...");
        const promptInicial = `Eres un escritor de ficción interactiva. Basado en la siguiente idea y el contexto del universo, crea un título y una descripción para el primer momento de una aventura.
        
        **Contexto del Universo:**
        ---
        ${contextoGlobal}
        ---
        **Idea:** "${sinopsisUsuario}"
        **Formato de Salida Obligatorio (JSON):**
        { "titulo": "...", "descripcion": "..." }`;

        const respuestaInicial = await llamarIAConFeedback(promptInicial, "Generando inicio...", MODELO_PROGRESIVO, true, 4);

        const nodoInicial = crearNodoEnLienzo({
            id: `momento_prog_inicial_${Date.now()}`,
            titulo: respuestaInicial.titulo || "El Comienzo",
            descripcion: respuestaInicial.descripcion || sinopsisUsuario,
            x: 200, y: 400
        });
        marcarComoInicio(nodoInicial.id);

        let nodosHoja = [nodoInicial.id];
        const todosLosNodos = new Map();
        todosLosNodos.set(nodoInicial.id, { titulo: nodoInicial.querySelector('.momento-titulo').textContent, descripcion: nodoInicial.dataset.descripcion });
        
        // --- CICLOS 1-12: Expansión, Confluencia y Supervisión ---
        for (let ciclo = 1; ciclo <= CICLOS_TOTALES; ciclo++) {
            let progreso = 5 + ((ciclo - 1) / CICLOS_TOTALES) * 90;
            progressBarManager.set(progreso, `Ciclo ${ciclo}/${CICLOS_TOTALES}: Expandiendo ${nodosHoja.length} finales actuales...`);
            
            // --- AÑADIDO: Crear un mapa de padres para rastrear la ruta ---
            const parentMap = new Map();
            document.querySelectorAll('.momento-nodo').forEach(nodoEl => {
                try {
                    const acciones = JSON.parse(nodoEl.dataset.acciones || '[]');
                    acciones.forEach(accion => {
                        parentMap.set(accion.idDestino, nodoEl.id);
                    });
                } catch(e) {}
            });
            // --- FIN AÑADIDO ---
            
            let proximosNodosHoja = [];
            const esFaseDeConfluencia = ciclo > CICLOS_EXPANSION_PURA;

            for (const idNodoPadre of nodosHoja) {
                // --- AÑADIDO: Obtener la ruta narrativa específica para este nodo ---
                const rutaNarrativa = obtenerRutaNarrativa(idNodoPadre, parentMap, todosLosNodos);
                // --- FIN AÑADIDO ---

                // --- MODIFICADO: Pasar los contextos adicionales a la función de procesamiento ---
                const nuevasHojas = await procesarNodoHoja(idNodoPadre, esFaseDeConfluencia, todosLosNodos, contextoGlobal, rutaNarrativa);
                proximosNodosHoja.push(...nuevasHojas);
            }
            
            // ... (El bloque de supervisión no necesita cambios)
            progreso += (1 / CICLOS_TOTALES * 90) / 2;
            progressBarManager.set(progreso, `Ciclo ${ciclo}/${CICLOS_TOTALES}: Supervisando coherencia de la red...`);
            const resultadoSupervision = await supervisarYCorregirRed(todosLosNodos);
            nodosHoja = resultadoSupervision.seHicieronCorrecciones 
                ? resultadoSupervision.nuevosNodosHoja 
                : [...new Set(proximosNodosHoja)];
            
            if (nodosHoja.length === 0) {
                 console.warn(`Ciclo ${ciclo}: No se generaron o no quedaron nuevos nodos hoja. Deteniendo el proceso.`);
                 break;
            }
        }

        progressBarManager.set(98, 'Organizando la red final...');
        if (typeof aplicarAutoLayout === 'function') aplicarAutoLayout();
        
        progressBarManager.finish("¡Aventura fabricada con éxito!");

    } catch (error) {
        console.error("Error catastrófico en la fabricación progresiva:", error);
        progressBarManager.error(`Error: ${error.message}`);
    }
}


/**
 * Procesa un nodo "hoja" (sin salidas), generando sus sucesores.
 * --- VERSIÓN MODIFICADA CON CONTEXTO COMPLETO ---
 */
async function procesarNodoHoja(idNodoPadre, esConfluencia, todosLosNodos, contextoGlobal, rutaNarrativa) { // <-- MODIFICADO
    const nodoPadreEl = document.getElementById(idNodoPadre);
    const contextoLocal = {
        titulo: nodoPadreEl.querySelector('.momento-titulo').textContent,
        descripcion: nodoPadreEl.dataset.descripcion
    };

    // --- MODIFICADO: Pasar los nuevos contextos a la función que construye el prompt ---
    const prompt = construirPromptParaCiclo(contextoLocal, esConfluencia, todosLosNodos, idNodoPadre, contextoGlobal, rutaNarrativa);
    const respuestaIA = await llamarIAConFeedback(prompt, `Expandiendo: "${contextoLocal.titulo}"`, MODELO_PROGRESIVO, true, 2);

    if (!respuestaIA || !Array.isArray(respuestaIA.opciones) || respuestaIA.opciones.length === 0) {
        console.warn(`La IA no devolvió opciones para el nodo ${idNodoPadre}.`);
        return [];
    }
    
    // ... (El resto de la función para crear nodos no cambia)
    const nuevosNodosHoja = [];
    for (const opcion of respuestaIA.opciones) {
        if (opcion.tipo === 'nuevo' && opcion.nuevo_nodo) {
            const posPadre = { x: parseFloat(nodoPadreEl.style.left), y: parseFloat(nodoPadreEl.style.top) };
            const nuevoNodo = crearNodoEnLienzo({
                id: `momento_prog_hijo_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                titulo: opcion.nuevo_nodo.titulo,
                descripcion: opcion.nuevo_nodo.descripcion,
                x: posPadre.x + (Math.random() * 400 - 200),
                y: posPadre.y + 250
            });
            const idDestino = nuevoNodo.id;
            todosLosNodos.set(idDestino, { titulo: opcion.nuevo_nodo.titulo, descripcion: opcion.nuevo_nodo.descripcion });
            nuevosNodosHoja.push(idDestino);
            await conectarMomentos(idNodoPadre, idDestino, opcion.texto_accion);

        } else if (opcion.tipo === 'existente' && todosLosNodos.has(opcion.id_destino)) {
            const idDestino = opcion.id_destino;
            await conectarMomentos(idNodoPadre, idDestino, opcion.texto_accion);

        } else {
            console.warn(`Opción inválida o con ID inexistente recibida de la IA para el nodo ${idNodoPadre}. Omitiendo.`, opcion);
            continue; 
        }
    }
    return nuevosNodosHoja;
}

/**
 * Construye el prompt adecuado para la IA según la fase del ciclo.
 * --- VERSIÓN MODIFICADA CON CONTEXTO COMPLETO ---
 */
function construirPromptParaCiclo(contextoLocal, esConfluencia, todosLosNodos, idNodoPadre, contextoGlobal, rutaNarrativa) { // <-- MODIFICADO
    let seccionConfluencia = '';
    // ... (La lógica para definir seccionConfluencia y formatoSalida no cambia)
    let formatoSalida = `
# FORMATO DE SALIDA OBLIGATORIO (JSON)
{
  "opciones": [
    {
      "tipo": "nuevo",
      "texto_accion": "Texto para el primer botón de elección...",
      "nuevo_nodo": { "titulo": "Título del primer nuevo momento", "descripcion": "Descripción del primer nuevo momento..." }
    },
    {
      "tipo": "nuevo",
      "texto_accion": "Texto para el segundo botón de elección...",
      "nuevo_nodo": { "titulo": "Título del segundo nuevo momento", "descripcion": "Descripción del segundo nuevo momento..." }
    }
  ]
}`;

    if (esConfluencia) {
        const nodosCandidatos = Array.from(todosLosNodos.entries())
            .filter(([id, _]) => id !== idNodoPadre)
            .map(([id, data]) => `- ID: "${id}", Título: "${data.titulo}"`)
            .join('\n');

        seccionConfluencia = `
# FASE DE CONFLUENCIA
3.  **Conecta si es Lógico**: Para cada opción, si tiene sentido narrativo que lleve a un momento ya existente, establece el \`tipo\` como "existente" y proporciona su \`id_destino\`.
4.  **Crea si es Necesario**: Si una opción lleva a una situación completamente nueva, usa el \`tipo\` "nuevo".
5.  **Nodos Existentes Disponibles**:
    ${nodosCandidatos}`;

        formatoSalida = `
# FORMATO DE SALIDA OBLIGATORIO (JSON)
{
  "opciones": [
    {
      "tipo": "nuevo",
      "texto_accion": "Investigar el extraño ruido en la cueva.",
      "nuevo_nodo": { "titulo": "La Cueva Resonante", "descripcion": "Dentro de la cueva, las paredes vibran con una energía extraña..." }
    },
    {
      "tipo": "existente",
      "texto_accion": "Regresar al campamento para advertir a los demás.",
      "id_destino": "momento_prog_inicial_1634567890"
    }
  ]
}`;
    }

    // --- MODIFICADO: El prompt ahora incluye los nuevos contextos ---
    return `Eres un maestro de juego experto en crear aventuras no lineales.
# TAREA
Analiza el contexto completo y genera **dos opciones distintas y coherentes** para el jugador.

# CONTEXTO GLOBAL DEL UNIVERSO
---
${contextoGlobal || "No hay datos globales definidos."}
---

# RUTA NARRATIVA HASTA ESTE PUNTO
---
${rutaNarrativa}
---

# MOMENTO ACTUAL
**Estás en:** "${contextoLocal.titulo}"
**Descripción:** "${contextoLocal.descripcion}"

# REGLAS
1.  **COHERENCIA MÁXIMA:** Las opciones que generes deben ser una continuación lógica de la RUTA NARRATIVA y respetar el CONTEXTO GLOBAL.
2.  Genera exactamente **dos** opciones de continuación.
3.  Las opciones deben ser diferentes entre sí y ofrecer caminos interesantes.
${seccionConfluencia}

${formatoSalida}
`;
}

/**
 * Construye el prompt adecuado para la IA según la fase del ciclo.
 * (Esta función no necesita cambios)
 */
function construirPromptParaCiclo(contexto, esConfluencia, todosLosNodos, idNodoPadre) {
    let seccionConfluencia = '';
    let formatoSalida = `
# FORMATO DE SALIDA OBLIGATORIO (JSON)
{
  "opciones": [
    {
      "tipo": "nuevo",
      "texto_accion": "Texto para el primer botón de elección...",
      "nuevo_nodo": { "titulo": "Título del primer nuevo momento", "descripcion": "Descripción del primer nuevo momento..." }
    },
    {
      "tipo": "nuevo",
      "texto_accion": "Texto para el segundo botón de elección...",
      "nuevo_nodo": { "titulo": "Título del segundo nuevo momento", "descripcion": "Descripción del segundo nuevo momento..." }
    }
  ]
}`;

    if (esConfluencia) {
        const nodosCandidatos = Array.from(todosLosNodos.entries())
            .filter(([id, _]) => id !== idNodoPadre) // Excluir el nodo actual
            .map(([id, data]) => `- ID: "${id}", Título: "${data.titulo}"`)
            .join('\n');

        seccionConfluencia = `
# FASE DE CONFLUENCIA
3.  **Conecta si es Lógico**: Para cada opción, si tiene sentido narrativo que lleve a un momento ya existente, establece el \`tipo\` como "existente" y proporciona su \`id_destino\`.
4.  **Crea si es Necesario**: Si una opción lleva a una situación completamente nueva, usa el \`tipo\` "nuevo".
5.  **Nodos Existentes Disponibles**:
    ${nodosCandidatos}`;

        formatoSalida = `
# FORMATO DE SALIDA OBLIGATORIO (JSON)
{
  "opciones": [
    {
      "tipo": "nuevo",
      "texto_accion": "Investigar el extraño ruido en la cueva.",
      "nuevo_nodo": { "titulo": "La Cueva Resonante", "descripcion": "Dentro de la cueva, las paredes vibran con una energía extraña..." }
    },
    {
      "tipo": "existente",
      "texto_accion": "Regresar al campamento para advertir a los demás.",
      "id_destino": "momento_prog_inicial_1634567890"
    }
  ]
}`;
    }

    return `Eres un maestro de juego experto en crear aventuras no lineales.
# TAREA
Analiza el momento actual de la historia y genera **dos opciones distintas** y coherentes para el jugador.

# CONTEXTO
**Estás en el momento:** "${contexto.titulo}"
**Descripción:** "${contexto.descripcion}"

# REGLAS
1.  Genera exactamente **dos** opciones de continuación.
2.  Las opciones deben ser diferentes entre sí y ofrecer caminos interesantes.
${seccionConfluencia}

${formatoSalida}
`;
}