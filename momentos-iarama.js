// =================================================================
// MOMENTOS-IARAMA.JS - Sistema de Generación de Ramas Narrativas (V3.1)
// Modelo: Trifásico (Planificar, Bocetar, Detallar)
// REGLA AÑADIDA: Bifurcación inicial de 2+ caminos garantizada.
// =================================================================

// Usamos los alias definidos en momentos-ia4.js para consistencia
const MODELO_PLANIFICACION_V3 = 'gemini-2.5-pro'; // Para planificar y bocetar
const MODELO_DETALLADO_V3 = 'gemini-2.5-flash-lite'; // Para desarrollar cada nodo individual

/**
 * Punto de entrada para la generación de la estructura narrativa.
 */
async function generarRamasDesdePanel() {
    // --- 1. OBTENER ESTADO Y ENTRADAS DEL USUARIO ---
    if (!panelState.nodoActual) {
        alert("No hay ningún momento seleccionado para generar la estructura.");
        return;
    }

    const nodoOrigen = panelState.nodoActual;
    const tramaInicial = document.getElementById('panel-editor-descripcion').value;
    const numMomentos = parseInt(document.getElementById('panel-input-num-parrafos').value, 10);
    const numFinales = parseInt(document.getElementById('panel-input-num-salidas').value, 10);

    // ... (el resto de las validaciones no cambia) ...
    if (!tramaInicial.trim()) {
        alert("La descripción del momento actual está vacía. Escribe la trama inicial.");
        return;
    }
    if (isNaN(numMomentos) || isNaN(numFinales) || numMomentos < 2 || numFinales < 1) {
        alert("Asegúrate de que 'Momentos/Párrafos' sea al menos 2 y 'Nº de Ramas/Salidas' sea al menos 1.");
        return;
    }
    if (numFinales > numMomentos) {
        alert("El número de finales no puede ser mayor que el número total de momentos.");
        return;
    }
    
    // ▼▼▼ BLOQUE AÑADIDO ▼▼▼
    // Aseguramos que el contexto esté actualizado y lo recopilamos si el checkbox está activo
    await gestionarSintesisDeDatos(); 
    let contextoDatos = "";
    const usarContextoCheckbox = document.getElementById('panel-checkbox-usar-contexto');
    if (usarContextoCheckbox && usarContextoCheckbox.checked) {
        contextoDatos = obtenerContextoSintetizado();
        console.log("Usando contexto de datos para RAMIFICAR.");
    }
    // ▲▲▲ FIN DEL BLOQUE ▲▲▲

    // --- 2. INICIAR PROCESO ---
    nodoOrigen.classList.add('desarrollando');
    progressBarManager.start(`Iniciando generación V3 de ${numMomentos} momentos con ${numFinales} finales...`);

    try {
        const maxIntentos = 3;
        for (let intento = 1; intento <= maxIntentos; intento++) {
            try {
                if (intento > 1) {
                    progressBarManager.set(5, `Reintentando Fase 1 (Intento ${intento}/${maxIntentos})...`);
                }

                progressBarManager.set(10, `Fase 1/3: Planificando la estructura narrativa...`);
                // ▼▼▼ LÍNEA MODIFICADA ▼▼▼
                const planEstructural = await fasePlanificarEstructura(tramaInicial, numMomentos, numFinales, contextoDatos);
                // ▲▲▲ FIN DE LA MODIFICACIÓN ▲▲▲

                progressBarManager.set(30, "Fase 2/3: Creando los bocetos de la trama...");
                const planConBocetos = await faseBocetarDescripciones(planEstructural);

                const planDetallado = await faseDetallarNodos(planConBocetos, tramaInicial);

                progressBarManager.set(95, "Fase Final: Dibujando la estructura en el lienzo...");
                await renderizarEstructuraCompleta(nodoOrigen, planDetallado);

                progressBarManager.finish(`¡Estructura V3 generada con éxito!`);
                return;

            } catch (error) {
                // ... (el resto de la función no cambia)
                console.error(`Error en el intento ${intento}:`, error);
                const esErrorDeBifurcacion = error.message.includes("La IA no creó la bifurcación inicial requerida");
                if (esErrorDeBifurcacion && intento < maxIntentos) {
                    continue;
                } else {
                    throw error;
                }
            }
        }
    } catch (error) {
        console.error("Error catastrófico durante la generación de la estructura V3:", error);
        progressBarManager.error(`Error: ${error.message}`);
    } finally {
        nodoOrigen.classList.remove('desarrollando');
        if (typeof aplicarAutoLayout === 'function') aplicarAutoLayout();
    }
}

// =================================================================
// --- FASE 1: PLANIFICACIÓN ---
// =================================================================
async function fasePlanificarEstructura(tramaInicial, numMomentos, numFinales) {
 
    const seccionContexto = contextoDatos 
        ? `## CONTEXTO GENERAL DEL UNIVERSO (DATOS)\n${contextoDatos}\n` 
        : '';

    const prompt = `
# TAREA: Planificar una Red Narrativa Interactiva
**Rol:** Eres un arquitecto de narrativas interactivas. Tu tarea es diseñar la estructura (el esqueleto) de una trama que ofrezca elecciones significativas.
## REQUISITOS
1.  **Contexto Inicial:** La trama comienza después de este evento: "${tramaInicial}"
2.  **Tamaño de la Red:** Debe contener exactamente **${numMomentos}** momentos (nodos).
3.  **Puntos Ultimos:** La estructura debe conducir a exactamente **${numFinales}** nodos últimos distintos (nodos sin salidas).
4.  **Regla Crítica de Bifurcación :** Para garantizar la interactividad, los nodos **deben conectarse directamente a un mínimo de dos momentos distintos**. 
Esto es obligatorio para darle al jugador elección real en todos los nodos.
5.  **Estructura General:** Crea una estructura interesante con bifurcaciones y  confluencias. No debe haber momento con una sola salida. 
Los nodos tienen que ramificarse en minimo 2 ramas.

## FORMATO DE SALIDA OBLIGATORIO
- Tu respuesta debe ser un **único objeto JSON VÁLIDO**.
- El objeto debe tener dos claves: \`momentos\` y \`conexiones\`.
- **momentos**: Un array de ${numMomentos} objetos, cada uno con \`id\` (un string único como "A", "B1") y \`titulo\` (un título provisional para el momento).
- **conexiones**: Un array de objetos que definen los enlaces, cada uno con \`desde\` (ID origen, o "ORIGEN") y \`hasta\` (ID destino).
### EJEMPLO DE SALIDA:
{
  "momentos": [
    { "id": "A1_STEALTH", "titulo": "La Infiltración Silenciosa por los Tejados" },
    { "id": "A2_DIPLOMACY", "titulo": "El Soborno al Guardia de la Puerta" },
    { "id": "A3_FORCE", "titulo": "El Asalto Frontal y Ruidoso" },
    { "id": "B1_SIDE_TREASURE", "titulo": "(Opcional) La Habitación del Capitán con un Secreto" },
    { "id": "B2_GUARD_QUARTERS", "titulo": "Los Cuarteles de la Guardia, Desprevenidos" },
    { "id": "C1_BETRAYAL", "titulo": "La Traición del Guardia Corrupto" },
    { "id": "D_INNER_COURTYARD", "titulo": "El Patio Interior, en Plena Alerta de Combate" },
    { "E_SANCTUM_ACCESS", "titulo": "(Clave) El Acceso Secreto al Santuario Interior" },
    { "F_PRISON_CELLS", "titulo": "(Clave) Las Celdas Húmedas de la Prisión" },
    { "G1_ENDING_RESCUE", "titulo": "(Final) El Rescate del Prisionero y la Huida" },
    { "G2_ENDING_CONFRONTATION", "titulo": "(Final) La Confrontación con el Líder del Culto" },
    { "H_ENDING_FAILURE", "titulo": "(Fracaso) Atrapado en las Mazmorras para Siempre" }
  ],
  "conexiones": [
    { "desde": "ORIGEN", "hasta": "A1_STEALTH" },
    { "desde": "ORIGEN", "hasta": "A2_DIPLOMACY" },
    { "desde": "ORIGEN", "hasta": "A3_FORCE" },
    { "desde": "A1_STEALTH", "hasta": "B1_SIDE_TREASURE" },
    { "desde": "A1_STEALTH", "hasta": "B2_GUARD_QUARTERS" },
    { "desde": "B1_SIDE_TREASURE", "hasta": "B2_GUARD_QUARTERS" },
    { "desde": "A2_DIPLOMACY", "hasta": "B2_GUARD_QUARTERS" },
    { "desde": "A2_DIPLOMACY", "hasta": "C1_BETRAYAL" },
    { "desde": "A3_FORCE", "hasta": "D_INNER_COURTYARD" },
    { "desde": "C1_BETRAYAL", "hasta": "F_PRISON_CELLS" },
    { "desde": "D_INNER_COURTYARD", "hasta": "F_PRISON_CELLS" },
    { "desde": "B2_GUARD_QUARTERS", "hasta": "E_SANCTUM_ACCESS" },
    { "desde": "E_SANCTUM_ACCESS", "hasta": "G1_ENDING_RESCUE" },
    { "desde": "E_SANCTUM_ACCESS", "hasta": "G2_ENDING_CONFRONTATION" },
    { "desde": "F_PRISON_CELLS", "hasta": "G1_ENDING_RESCUE" },
    { "desde": "F_PRISON_CELLS", "hasta": "H_ENDING_FAILURE" }
  ]
}`;
    // ==================================================
    // --- FIN DE LA MODIFICACIÓN ---
    // ==================================================
    const respuestaIA = await llamarIAConFeedback(prompt, "Contactando al arquitecto narrativo...", MODELO_PLANIFICACION_V3, true);
    if (!respuestaIA || !respuestaIA.momentos || !respuestaIA.conexiones) {
        throw new Error("Fase 1 fallida: La IA no devolvió un plan estructural válido.");
    }
    // Verificación adicional para asegurar el cumplimiento de la regla
    const conexionesIniciales = respuestaIA.conexiones.filter(c => c.desde === 'ORIGEN').length;
    if (conexionesIniciales < 2) {
         throw new Error(`Fase 1 fallida: La IA no creó la bifurcación inicial requerida (creó ${conexionesIniciales} en lugar de 2+).`);
    }
    return respuestaIA;
}

// =================================================================
// --- FASE 2: BOCETADO ---
// =================================================================
async function faseBocetarDescripciones(planEstructural) {
    const prompt = `
# TAREA: Escribir Bocetos para una Trama Planificada
**Rol:** Eres un escritor rápido y creativo. Tu tarea es escribir un resumen de una sola frase para cada momento de una trama ya estructurada.
## ESTRUCTURA DE LA TRAMA (PLAN)
${JSON.stringify(planEstructural, null, 2)}
## INSTRUCCIONES
1.  **Revisa el Plan:** Entiende el flujo de la historia a partir de los títulos y conexiones.
2.  **Escribe un Boceto por Momento:** Para cada momento en el array \`momentos\`, añade una clave \`descripcion\` con un resumen conciso de una sola frase que describa el núcleo de ese momento.
## FORMATO DE SALIDA OBLIGATORIO
- Tu respuesta debe ser el **mismo objeto JSON que recibiste**, pero con la clave \`descripcion\` añadida a cada objeto dentro del array \`momentos\`.
### EJEMPLO DE SALIDA ESPERADA:
{
  "momentos": [
    { "id": "A", "titulo": "La Decisión en el Puente", "descripcion": "El héroe llega a un puente colgante inestable que es la única salida del cañón." },
    { "id": "B1", "titulo": "El Atajo por el Acantilado", "descripcion": "Decide arriesgarse escalando por una peligrosa cornisa para evitar el puente." }
  ],
  "conexiones": [...]
}`;
    const respuestaIA = await llamarIAConFeedback(prompt, "Escribiendo los bocetos de la historia...", MODELO_PLANIFICACION_V3, true);
    if (!respuestaIA || !respuestaIA.momentos || respuestaIA.momentos.some(m => !m.descripcion)) {
        throw new Error("Fase 2 fallida: La IA no devolvió los bocetos para todos los momentos.");
    }
    return respuestaIA;
}

// =================================================================
// --- FASE 3: DETALLADO ---
// =================================================================
async function faseDetallarNodos(planConBocetos, tramaInicial) {
    let planDetallado = JSON.parse(JSON.stringify(planConBocetos)); // Copia profunda
    const momentosPorId = new Map(planDetallado.momentos.map(m => [m.id, m]));
    const conexionesPorId = new Map(planDetallado.momentos.map(m => [m.id, []]));
    planDetallado.conexiones.forEach(c => {
        if(conexionesPorId.has(c.desde)) {
            conexionesPorId.get(c.desde).push(c.hasta);
        }
    });

    const niveles = calcularNiveles(planDetallado.momentos, planDetallado.conexiones);
    
    let nodosProcesados = 0;
    const totalNodos = planDetallado.momentos.length;

    for (const nivel of niveles.niveles) {
        const promesasNivel = nivel.map(async (nodoId) => {
            const momentoActual = momentosPorId.get(nodoId);
            const predecesores = planDetallado.conexiones.filter(c => c.hasta === nodoId);
            
            let contextoPrevio = "";
            if (predecesores.length === 0 || predecesores.some(p => p.desde === "ORIGEN")) {
                contextoPrevio = `**El Momento Anterior fue:**\n> ${tramaInicial}`;
            } else {
                const descripcionesPrevias = predecesores.map(p => {
                    const nodoPadre = momentosPorId.get(p.desde);
                    return `**Desde "${nodoPadre.titulo}":**\n> ${nodoPadre.descripcion}`;
                }).join('\n\n');
                contextoPrevio = `**Los Momentos Anteriores fueron:**\n${descripcionesPrevias}`;
            }

            const hijosIds = conexionesPorId.get(nodoId) || [];
            const infoHijos = hijosIds.map(hijoId => momentosPorId.get(hijoId));

            const prompt = crearPromptParaDetallar(contextoPrevio, momentoActual, infoHijos);
            const respuestaIA = await llamarIAConFeedback(
                prompt,
                `Detallando "${momentoActual.titulo}"...`,
                MODELO_DETALLADO_V3, true, 3
            );

            if (respuestaIA && respuestaIA.descripcionDetallada) {
                momentoActual.descripcion = respuestaIA.descripcionDetallada;
                if (respuestaIA.acciones) {
                    respuestaIA.acciones.forEach(accion => {
                        const conexionAActualizar = planDetallado.conexiones.find(c => c.desde === nodoId && c.hasta === accion.idDestino);
                        if (conexionAActualizar) {
                            conexionAActualizar.textoBoton = accion.textoBoton;
                        }
                    });
                }
            }
            nodosProcesados++;
            progressBarManager.set(50 + (nodosProcesados / totalNodos) * 45, `Fase 3/3: Detallando ${nodosProcesados}/${totalNodos}: "${momentoActual.titulo}"`);
        });
        await Promise.all(promesasNivel); // Procesar cada nivel en paralelo
    }
    return planDetallado;
}

function crearPromptParaDetallar(contextoPrevio, momentoActual, infoHijos) {
    const esFinal = infoHijos.length === 0;
    let instruccionesAcciones = `
2.  **Genera Acciones:** Basado en tu texto, crea un array de JSON llamado \`acciones\`. Cada objeto debe tener:
    * \`idDestino\`: El ID del momento al que lleva la acción (ej: "${infoHijos[0]?.id || ''}").
    * \`textoBoton\`: El texto que aparecerá en el botón de elección del jugador.`;

    if (esFinal) {
        instruccionesAcciones = "2.  **Es un Final:** Como este es un nodo final, devuelve un array \`acciones\` vacío.";
    }

    return `
# TAREA: Desarrollar una Escena y sus Salidas
**Rol:** Eres un escritor de ficción interactiva. Tu tarea es expandir un boceto en una escena completa y definir las elecciones del jugador.
## CONTEXTO NARRATIVO
${contextoPrevio}
## ESCENA A DESARROLLAR
**Título:** "${momentoActual.titulo}"
**Boceto:** "${momentoActual.descripcion}"
${!esFinal ? `**Posibles Destinos:**\n${infoHijos.map(h => `- Hacia "${h.titulo}" (ID: ${h.id})`).join('\n')}` : ''}
## INSTRUCCIONES
1.  **Expande el Boceto:** Convierte el "Boceto" en una escena narrativa detallada de 2-3 párrafos. Debe ser una continuación lógica del contexto.
${instruccionesAcciones}
## FORMATO DE SALIDA OBLIGATORIO
- Tu respuesta debe ser un **único objeto JSON VÁLIDO** con las claves \`descripcionDetallada\` y \`acciones\`.
### EJEMPLO DE SALIDA:
{
  "descripcionDetallada": "El puente se balancea precariamente con cada ráfaga de viento, sus tablones podridos gimiendo bajo el peso del héroe. Al otro lado, puede ver la entrada de la cueva, pero el abismo que se abre debajo es una caída mortal.",
  "acciones": [
    { "idDestino": "B1", "textoBoton": "Cruzar el puente con cuidado" },
    { "idDestino": "B2", "textoBoton": "Buscar otro camino por la cornisa" }
  ]
}`;
}

// =================================================================
// --- FASE 4: RENDERIZADO ---
// =================================================================
async function renderizarEstructuraCompleta(nodoOrigen, planFinal) {
    const mapaIds = new Map();
    const posOrigen = { x: parseFloat(nodoOrigen.style.left), y: parseFloat(nodoOrigen.style.top) };
    const niveles = calcularNiveles(planFinal.momentos, planFinal.conexiones);

    // 1. Crear todos los nodos en el lienzo
    for (const momentoData of planFinal.momentos) {
        const nivelInfo = niveles.info[momentoData.id];
        const x = posOrigen.x + (nivelInfo.posX - (nivelInfo.totalEnNivel - 1) / 2) * 280;
        const y = posOrigen.y + nivelInfo.nivel * 220;

        const nuevoNodo = crearNodoEnLienzo({
            id: `momento_v3_${Date.now()}_${momentoData.id}`,
            titulo: momentoData.titulo,
            descripcion: momentoData.descripcion,
            x: x + (Math.random() * 80 - 40),
            y: y + (Math.random() * 50 - 25),
            acciones: []
        });
        mapaIds.set(momentoData.id, nuevoNodo.id);
    }

    // 2. Crear todas las conexiones
    for (const conexion of planFinal.conexiones) {
        const idDesde = (conexion.desde === "ORIGEN") ? nodoOrigen.id : mapaIds.get(conexion.desde);
        const idHasta = mapaIds.get(conexion.hasta);
        if (idDesde && idHasta) {
            await conectarMomentos(idDesde, idHasta, conexion.textoBoton || "Seguir");
        }
    }
}


/**
 * (Sin cambios desde V2)
 * Calcula la profundidad (nivel) y posición de cada nodo para un layout simple.
 */
/**
 * (CORREGIDO)
 * Calcula la profundidad (nivel) y posición de cada nodo para un layout simple.
 * Añadida una salvaguarda para nodos no procesados (ej. en ciclos) para evitar errores.
 */
function calcularNiveles(momentos, conexiones) {
    let adj = new Map();
    let inDegree = new Map();
    momentos.forEach(m => {
        adj.set(m.id, []);
        inDegree.set(m.id, 0);
    });
    conexiones.forEach(c => {
        if (c.desde !== "ORIGEN" && adj.has(c.desde) && adj.has(c.hasta)) { // Verificación extra
            adj.get(c.desde).push(c.hasta);
            if (inDegree.has(c.hasta)) {
                inDegree.set(c.hasta, inDegree.get(c.hasta) + 1);
            }
        }
    });
    let queue = [];
    momentos.forEach(m => {
        // Un nodo inicial es aquel al que no llega ninguna conexión DE OTRO NODO.
        const esConectadoDesdeOrigen = conexiones.some(c => c.desde === "ORIGEN" && c.hasta === m.id);
        if (inDegree.get(m.id) === 0 && esConectadoDesdeOrigen) {
            queue.push(m.id);
        }
    });
    
    // Si la cola está vacía, puede que la IA no haya conectado nada a ORIGEN.
    // Forzamos el inicio con todos los nodos de in-degree 0.
    if (queue.length === 0) {
         momentos.forEach(m => {
            if (inDegree.get(m.id) === 0) {
                queue.push(m.id);
            }
        });
    }

    let niveles = { info: {}, niveles: [] };
    let nivelActual = 1;
    while (queue.length > 0) {
        let levelSize = queue.length;
        niveles.niveles[nivelActual - 1] = [];
        for (let i = 0; i < levelSize; i++) {
            let u = queue.shift();
            niveles.info[u] = { nivel: nivelActual, posX: i, totalEnNivel: levelSize };
            niveles.niveles[nivelActual - 1].push(u);
            if (adj.has(u)) {
                adj.get(u).forEach(v => {
                    inDegree.set(v, inDegree.get(v) - 1);
                    if (inDegree.get(v) === 0) {
                        queue.push(v);
                    }
                });
            }
        }
        nivelActual++;
    }

    // --- INICIO DE LA CORRECCIÓN ---
    // Después del bucle, comprobamos si algún nodo se quedó sin procesar (típico en ciclos).
    // Si es así, le asignamos una posición de emergencia para que el programa no falle.
    momentos.forEach(m => {
        if (!niveles.info.hasOwnProperty(m.id)) {
            console.warn(`El nodo ${m.id} ("${m.titulo}") no fue procesado por el layout (posible ciclo). Asignando posición de emergencia.`);
            niveles.info[m.id] = { nivel: nivelActual, posX: 0, totalEnNivel: 1 };
        }
    });
    // --- FIN DE LA CORRECCIÓN ---

    return niveles;
}