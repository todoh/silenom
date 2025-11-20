// =================================================================
// MOMENTOS-IA5.JS - Sistema de Fabricación de Librojuego Completo
// Modelo: Generación Monolítica de 31 Nodos con Estructura de Árbol Binario
// =================================================================

const MODELO_LIBROJUEGO_5 = 'gemini-2.5-pro'; // Modelo rápido es ideal para tareas muy estructuradas.

/**
 * Abre el modal DEDICADO para el Fabricador de Librojuegos V5.
 */
function abrirModalFabricadorLibrojuego5() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-fabricador-librojuego-v5');
    if (!overlay || !modal) {
        console.error("No se encontraron los elementos del modal del Fabricador V5.");
        return;
    }

    overlay.style.display = 'block';
    modal.style.display = 'flex';
    overlay.onclick = cerrarModalFabricadorLibrojuego5;

    const generarBtn = document.getElementById('generar-fabricador-btn-modal-v5');
    const nuevoGenerarBtn = generarBtn.cloneNode(true);
    generarBtn.parentNode.replaceChild(nuevoGenerarBtn, generarBtn);
    
    nuevoGenerarBtn.addEventListener('click', iniciarFabricacionLibrojuego5);
}

/**
 * Cierra el modal DEDICADO del Fabricador V5.
 */
function cerrarModalFabricadorLibrojuego5() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-fabricador-librojuego-v5');
    if (overlay && modal) {
        overlay.style.display = 'none';
        modal.style.display = 'none';
        overlay.onclick = null;
    }
}

/**
 * Función de conexión específica para V5 que NO hace llamadas a la IA.
 */
function conectarMomentosV5(idOrigen, idDestino, textoAccion) {
    const nodoOrigen = document.getElementById(idOrigen);
    if (!nodoOrigen || !idDestino) {
        console.warn(`No se pudo conectar: origen ${idOrigen} o destino ${idDestino} no encontrado.`);
        return;
    }

    const acciones = JSON.parse(nodoOrigen.dataset.acciones || '[]');
    if (acciones.some(a => a.idDestino === idDestino)) {
        return;
    }
    acciones.push({ textoBoton: textoAccion, idDestino: idDestino });
    nodoOrigen.dataset.acciones = JSON.stringify(acciones);
}


/**
 * Función principal que orquesta la creación del librojuego de 31 nodos.
 */
async function iniciarFabricacionLibrojuego5() {
    const sinopsisUsuario = document.getElementById('ia-fabricador-prompt-input-v5').value;
    if (!sinopsisUsuario || sinopsisUsuario.trim() === '') {
        alert("Debes proporcionar una idea para la historia.");
        return;
    }
    cerrarModalFabricadorLibrojuego5();

    try {
        progressBarManager.start("Fabricando árbol binario grande... La IA está ramificando tu aventura.");

        // MODIFICADO: Llamamos a la nueva función de prompt para 31 nodos.
        const prompt = generarPromptLibrojuego31Nodos(sinopsisUsuario);
        
        const respuestaIA = await llamarIAConFeedback(prompt, "Generando estructura de árbol 1-2-4-8-16...", MODELO_LIBROJUEGO_5, true, 4);

        // MODIFICADO: La validación ahora espera 31 nodos.
        if (!respuestaIA || !respuestaIA.nodos || !respuestaIA.conexiones || respuestaIA.nodos.length !== 31) {
            throw new Error(`La IA no devolvió la estructura esperada de 31 nodos. Nodos recibidos: ${respuestaIA?.nodos?.length || 0}.`);
        }

        progressBarManager.set(40, "Estructura recibida. Creando momentos en el lienzo...");

        const { nodos, conexiones } = respuestaIA;
        const idMap = new Map();

        for (const [index, nodoData] of nodos.entries()) {
            const esElPrimero = index === 0;
            const nuevoNodo = crearNodoEnLienzo({
                id: `momento_fabrica5_${Date.now()}_${index}`,
                titulo: nodoData.titulo,
                descripcion: nodoData.descripcion,
                x: 200 + (index % 8) * 350, // Ajustamos el posicionamiento inicial para más nodos
                y: 200 + Math.floor(index / 8) * 250,
                acciones: []
            });

            idMap.set(nodoData.id, nuevoNodo.id);

            if (esElPrimero) {
                marcarComoInicio(nuevoNodo.id);
            }
            if (nodoData.es_final) {
                nuevoNodo.classList.add('final');
            }
        }

        progressBarManager.set(75, "Nodos creados. Tejiendo las conexiones narrativas...");

        for (const conexionData of conexiones) {
            const idOrigenReal = idMap.get(conexionData.origen);
            const idDestinoReal = idMap.get(conexionData.destino);
            const textoAccion = conexionData.accion;

            if (idOrigenReal && idDestinoReal) {
                conectarMomentosV5(idOrigenReal, idDestinoReal, textoAccion);
            } else {
                console.warn(`Conexión omitida por ID no encontrado: ${conexionData.origen} -> ${conexionData.destino}`);
            }
        }
        
        progressBarManager.set(95, 'Organizando la red final...');
        if (typeof aplicarAutoLayout === 'function') aplicarAutoLayout();

        progressBarManager.finish("¡Tu librojuego de 31 nodos ha sido fabricado con éxito!");

    } catch (error) {
        console.error("Error catastrófico en el Fabricador de Librojuegos (V5):", error);
        progressBarManager.error(`Error: ${error.message}`);
    }
}

/**
 * MODIFICADO: Genera el prompt para que la IA cree una estructura de ÁRBOL BINARIO de 31 nodos.
 * @param {string} sinopsis - La idea principal del usuario.
 * @returns {string} El prompt completo para la IA.
 */
function generarPromptLibrojuego31Nodos(sinopsis) {
    return `
# TAREA: Crear una Aventura Interactiva con Estructura de Árbol Binario Grande

**Rol:** Eres un experto diseñador de narrativas interactivas. Tu tarea es diseñar una aventura que se ramifica como un **árbol binario perfecto de 5 niveles**, resultando en 16 finales posibles.

## CONTEXTO NARRATIVO
**Sinopsis de la Historia:**
> ${sinopsis}

## INSTRUCCIONES Y REGLAS CRUCIALES
1.  **Estructura Exacta:** Debes generar una estructura que contenga **EXACTAMENTE 31 nodos**.
2.  **Nodo Inicial:** El nodo con \`id: "nodo_1"\` es siempre la raíz del árbol.
3.  **Estructura de Árbol Binario Perfecto:** La red DEBE seguir una estructura de árbol binario estricto de 5 niveles (1-2-4-8-16). Cada nodo no final 'n' se conecta a los nodos '2n' y '2n+1'.
    * El nodo 1 se conecta a los nodos 2 y 3.
    * El nodo 2 se conecta a los nodos 4 y 5.
    * ...y así sucesivamente hasta el nodo 15, que se conecta a los nodos 30 y 31.
4.  **Nodos Finales:** Los nodos del **16 al 31** son las "hojas" del árbol y **TODOS DEBEN ser nodos finales** (\`es_final: true\`). Los nodos del 1 al 15 NO son finales (\`es_final: false\`).
5.  **Calidad Narrativa:** Cada elección debe tener sentido y ser diferente de su par. La historia debe progresar de forma coherente a través de los niveles.
6.  **Formato de Salida Obligatorio:** Tu respuesta debe ser un **ÚNICO objeto JSON VÁLIDO**, sin texto, explicaciones ni markdown.

## FORMATO DE SALIDA (EJEMPLO ESTRUCTURAL)
Sigue este formato y estructura de conexiones al pie de la letra para los 31 nodos.

## FORMATO DE SALIDA (EJEMPLO COMPLETO Y DETALLADO)
Sigue este formato y estructura de conexiones al pie de la letra para los 31 nodos. El siguiente ejemplo es una guía del tono y detalle esperado.

\`\`\`json
{
  "nodos": [
    {
      "id": "nodo_1",
      "titulo": "El Silencio Esmeralda",
      "descripcion": "El pitido de emergencia es lo único que rompe el denso silencio de la jungla alienígena. Tu nave, la 'Odyssey', es un amasijo de hierros humeantes. Estás solo. A tu izquierda, los restos de la cabina ofrecen una remota posibilidad de reparar la baliza de socorro. A tu derecha, una extraña estructura de piedra negra, cubierta de enredaderas bioluminiscentes, se alza entre los árboles. Parece una ruina antigua.",
      "es_final": false
    },
    {
      "id": "nodo_2",
      "titulo": "Entre Restos y Chispas",
      "descripcion": "Te abres paso entre los restos retorcidos de la 'Odyssey'. Los sistemas de emergencia parpadean erráticamente. El panel de comunicaciones está destrozado, pero la fuente de alimentación principal parece estar intacta, aunque inestable. Necesitarás redirigir la energía con cuidado. ¿Priorizas la baliza de largo alcance o los sistemas de soporte vital de la nave?",
      "es_final": false
    },
    {
      "id": "nodo_3",
      "titulo": "El Umbral Susurrante",
      "descripcion": "Te acercas a la imponente ruina alienígena. La piedra es fría y suave al tacto, sin juntas visibles. Un arco monolítico forma una entrada oscura que parece absorber la luz. De su interior emana un suave zumbido melódico, casi un susurro. La entrada principal es obvia, pero quizás haya una forma menos directa de entrar.",
      "es_final": false
    },
    { "id": "nodo_4", "titulo": "La Esperanza de una Señal", "descripcion": "Te concentras en la baliza. Tras una hora de trabajo tenso, consigues desviar un hilo de energía al transmisor. Se enciende con un zumbido. Ahora debes elegir qué tipo de señal enviar.", "es_final": false },
    { "id": "nodo_5", "titulo": "Sobrecarga Inminente", "descripcion": "Decides ir a por todas con la fuente de alimentación. Al intentar puentear el núcleo, una sobrecarga masiva recorre los sistemas. Las luces parpadean violentamente. Tienes segundos para decidir.", "es_final": false },
    { "id": "nodo_6", "titulo": "El Ojo del Guardián", "descripcion": "Al cruzar el arco principal de la ruina, el zumbido se intensifica. Llegas a una cámara circular donde una esfera de luz flotante gira lentamente. Parece observarte. ¿Te acercas a ella o buscas una cobertura?", "es_final": false },
    { "id": "nodo_7", "titulo": "Pasajes Olvidados", "descripcion": "Encuentras una grieta en la base de la ruina, oculta tras una cascada de musgo brillante. Te deslizas por un túnel estrecho que desciende en espiral hacia las profundidades del complejo. El aire es antiguo y pesado.", "es_final": false },
    { "id": "nodo_15", "titulo": "El Corazón del Laberinto", "descripcion": "Finalmente, llegas al centro de la estructura. Ante ti hay dos pedestales idénticos. Sobre uno flota un cristal que pulsa con energía vital. Sobre el otro, un cubo que emite un aura de puro conocimiento. Solo puedes coger uno antes de que el lugar se selle para siempre.", "es_final": false },
    { "id": "nodo_16", "titulo": "Final: Rescate Lento", "descripcion": "Tu señal de socorro universal es débil pero constante. Pasan semanas, que se sienten como meses, sobreviviendo a duras penas. Finalmente, un carguero recoge tu señal y te rescata. Vuelves a casa, pero las noches en la jungla te han cambiado para siempre.", "es_final": true },
    { "id": "nodo_31", "titulo": "Final: El Nuevo Dios", "descripcion": "Al tocar el cubo del conocimiento, tu mente se expande hasta abarcar galaxias. Ya no eres humano. Te has convertido en el guardián de la ruina, una conciencia inmortal que vigilará este planeta por toda la eternidad, habiendo olvidado por completo tu vida anterior.", "es_final": true }
  ],
  "conexiones": [
    { "origen": "nodo_1", "destino": "nodo_2", "accion": "Intentar reparar la baliza de la nave." },
    { "origen": "nodo_1", "destino": "nodo_3", "accion": "Explorar la misteriosa ruina alienígena." },
    { "origen": "nodo_2", "destino": "nodo_4", "accion": "Priorizar la baliza de largo alcance." },
    { "origen": "nodo_2", "destino": "nodo_5", "accion": "Asegurar primero el soporte vital." },
    { "origen": "nodo_3", "destino": "nodo_6", "accion": "Entrar por el arco principal." },
    { "origen": "nodo_3", "destino": "nodo_7", "accion": "Buscar una entrada lateral oculta." },
    { "origen": "nodo_4", "destino": "nodo_8", "accion": "Enviar una señal de socorro universal." },
    { "origen": "nodo_4", "destino": "nodo_9", "accion": "Enviar una señal codificada solo para la Flota." },
    { "origen": "nodo_5", "destino": "nodo_10", "accion": "Intentar contener la sobrecarga." },
    { "origen": "nodo_5", "destino": "nodo_11", "accion": "Liberar la energía hacia el exterior." },
    { "origen": "nodo_6", "destino": "nodo_12", "accion": "Acercarse pacíficamente a la esfera de luz." },
    { "origen": "nodo_6", "destino": "nodo_13", "accion": "Esconderse y observar su comportamiento." },
    { "origen": "nodo_7", "destino": "nodo_14", "accion": "Seguir el túnel principal hacia abajo." },
    { "origen": "nodo_7", "destino": "nodo_15", "accion": "Explorar una pequeña bifurcación ascendente." },
    { "origen": "nodo_15", "destino": "nodo_30", "accion": "Coger el cristal de energía vital." },
    { "origen": "nodo_15", "destino": "nodo_31", "accion": "Coger el cubo del conocimiento." }
  ]
}
\`\`\`
`;
}