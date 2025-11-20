// =================================================================
// ARCHIVO: cartassilen-ia.js
// Contiene toda la lógica para la generación de cartas mediante IA.
// VERSIÓN COMPATIBLE CON "CARTAS SILEN - FASE 3" Y MEJORADA.
// =================================================================

/**
 * Abre el modal para la generación de cartas con IA.
 * Recopila la entrada del usuario y lanza el proceso de generación completo.
 * @param {Function} onComplete - Callback que se ejecuta cuando la generación es exitosa. Recibe (cartaCompleta).
 * @param {Function} onError - Callback que se ejecuta si la generación falla. Recibe (error).
 * @param {Function} onStatusUpdate - Callback para notificar el inicio de una tarea. Recibe (cambio).
 */
function iniciarFlujoDeGeneracionCompleta(onComplete, onError, onStatusUpdate) {
    const modal = document.getElementById('modal-ia-carta');
    const btnCerrar = document.getElementById('modal-ia-carta-cerrar');
    const btnGenerar = document.getElementById('ia-carta-btn-generar');
    const statusDiv = document.getElementById('ia-carta-status');

    // Elementos del formulario del modal
    const inputTipo = document.getElementById('ia-carta-tipo');
    const inputDescripcion = document.getElementById('ia-carta-descripcion');
    const inputEstiloVisual = document.getElementById('ia-carta-estilo-visual');
    const inputUsarContexto = document.getElementById('ia-carta-usar-contexto');

    // --- [NUEVA MODIFICACIÓN] ---
    // Forzar los tipos de carta correctos en el desplegable de la IA.
    inputTipo.innerHTML = `
        <option value="ACCION">ACCION</option>
        <option value="ESTADO">ESTADO</option>
    `;
    // --- FIN DE LA MODIFICACIÓN ---

    const mostrarModal = (mostrar) => {
        modal.style.display = mostrar ? 'flex' : 'none';
        
        if (mostrar) {
            btnGenerar.disabled = false;
            statusDiv.style.display = 'none';
            statusDiv.textContent = '';
        }
    };

    const manejarGeneracion = async () => {
        const tipo = inputTipo.value;
        const descripcion = inputDescripcion.value.trim();
        const estiloVisual = inputEstiloVisual.value.trim();
        const usarContexto = inputUsarContexto.checked;
        let contextoDatos = "";

        if (!descripcion) {
            alert("Por favor, describe la carta que quieres crear.");
            return;
        }
        
        btnGenerar.disabled = true;
        statusDiv.style.display = 'block';
        statusDiv.textContent = "Iniciando generación...";

        if (typeof onStatusUpdate === 'function') {
            onStatusUpdate(1);
        }
        
        mostrarModal(false); 

        (async () => {
            try {
                if (usarContexto) {
                    if (typeof obtenerContextoSintetizado === 'function') {
                        contextoDatos = obtenerContextoSintetizado();
                    } else {
                        console.warn("La función 'obtenerContextoSintetizado' no está disponible. Generando sin contexto.");
                    }
                }

                const datosCarta = await generarAtributosCartaConIA(tipo, descripcion, contextoDatos);
                
                const resultadoImagen = await generarIlustracionCartaConIA(
                    datosCarta.nombre,
                    datosCarta.tipo,
                    datosCarta.texto,
                    estiloVisual
                );

                const cartaCompleta = { ...datosCarta, imagenSrc: resultadoImagen.imagen };

                if (typeof onComplete === 'function') {
                    onComplete(cartaCompleta);
                }

            } catch (error) {
                if (typeof onError === 'function') {
                    onError(error);
                } else {
                    console.error("Error en el flujo de generación completa:", error);
                    alert(`Ocurrió un error: ${error.message}`);
                }
            }
        })();
    };

    btnGenerar.onclick = manejarGeneracion;
    btnCerrar.onclick = () => mostrarModal(false);
    modal.onclick = (e) => {
        if (e.target === modal) mostrarModal(false);
    };

    mostrarModal(true);
}

/**
 * Llama a la IA para generar solo la ilustración para una carta existente en el editor.
 * @param {string} nombre - Nombre de la carta actual.
 * @param {string} tipo - Tipo de la carta actual.
 * @param {string} texto - Texto de la carta actual.
 * @returns {Promise<string|null>} La URL de la imagen generada o null si se cancela.
 */
async function iniciarGeneracionDeImagenSolo(nombre, tipo, texto) {
    const estiloVisual = prompt("Describe el estilo visual de la ilustración:", "ilustración de fantasía detallada");
    
    if (estiloVisual === null) {
        return null;
    }

    try {
        const resultadoImagen = await generarIlustracionCartaConIA(nombre, tipo, texto, estiloVisual);
        return resultadoImagen.imagen;
    } catch (error) {
        throw error;
    }
}


/**
 * Llama a la IA para generar los atributos (nombre, coste, poder, texto) de una carta.
 * @param {string} tipo - El tipo de carta (ACCION, ESTADO).
 * @param {string} descripcion - La descripción proporcionada por el usuario.
 * @param {string} [contextoDatos=""] - El contexto opcional de los "Datos" del proyecto.
 * @returns {Promise<object>} Un objeto con los datos generados para la carta.
 */
async function generarAtributosCartaConIA(tipo, descripcion, contextoDatos = "") {
    if (typeof llamarIAConFeedback === 'undefined') {
        throw new Error("La función 'llamarIAConFeedback' de geminialfa.js no está disponible.");
    }

    const reglasDelJuego = `
# REGLAS DEL JUEGO "CARTAS SILEN"
- Objetivo: Alcanzar 13 Puntos de Juego (PJ).
- Recurso: Unidades (⚡).
- Tipos de Carta: ACCION (efecto de un solo uso) y ESTADO (permanece en juego).
- Habilidades (formato OBLIGATORIO \`NOMBRE Nivel(Coste)\` o \`NOMBRE(Coste)\`):
  - \`ATACAR Nivel(Coste)\`: Gana Nivel en PJ si no es defendido. El Poder de la carta se usa en combate.
  - \`DEFENDER(Coste)\`: Bloquea un ataque. Se resuelve por Poder.
  - \`GANAR(Coste)\`: Gana una cantidad de PJ igual al Poder de la carta.
  - \`ACUMULAR(Coste)\`: Gana una cantidad de Unidades (⚡) igual al Poder de la carta.
- Los costes (entre paréntesis) se pagan en Unidades (⚡).
- El 'coste' de la carta es para jugarla de la mano.
`;
    
    const seccionContexto = contextoDatos 
        ? `## CONTEXTO DEL UNIVERSO (DATOS)\n---\n${contextoDatos}\n---\n\n` 
        : '';

    const prompt = `${seccionContexto}# TAREA: Generar atributos para una carta del juego "CARTAS SILEN"\n\n${reglasDelJuego}\n# INSTRUCCIÓN:\nBasado en la descripción: "${descripcion}", y de tipo "${tipo}", genera los atributos para una carta.\n\n# REQUISITOS:\n1. La carta DEBE ser coherente con las REGLAS DEL JUEGO.\n2. Los valores de 'coste' y 'poder' deben ser bajos y equilibrados (generalmente entre 0 y 5).\n3. El campo 'texto' DEBE usar el formato de habilidad obligatorio.\n\nResponde SÓLO con un objeto JSON válido con las claves "nombre", "coste", "poder", y "texto".\n\nEjemplo de respuesta para una carta de tipo ESTADO:\n{"nombre": "Guerrero Veloz", "coste": 2, "poder": 2, "texto": "ATACAR 2(1). DEFENDER(0)."}`;

    console.log("[IA-Carta] Solicitando atributos con reglas...");
    const datosIA = await llamarIAConFeedback(prompt, "Generando Atributos de Carta", 'gemini-2.5-flash', true);

    if (datosIA && datosIA.nombre && typeof datosIA.coste === 'number' && typeof datosIA.poder === 'number' && datosIA.texto) {
        console.log("[IA-Carta] Atributos recibidos:", datosIA);
        return { tipo, ...datosIA };
    } else {
        console.error("Respuesta inesperada de la IA para atributos:", datosIA);
        throw new Error("La IA no devolvió los atributos en el formato JSON esperado (nombre, coste, poder, texto).");
    }
}


/**
 * Llama a la IA para generar la ilustración de una carta.
 * @param {string} nombreCarta - El nombre de la carta.
 * @param {string} tipoCarta - El tipo de la carta.
 * @param {string} textoCarta - La descripción/habilidades de la carta.
 * @param {string} estiloVisual - La descripción del estilo visual.
 * @returns {Promise<object>} El resultado de la generación de imagen.
 */
async function generarIlustracionCartaConIA(nombreCarta, tipoCarta, textoCarta, estiloVisual) {
    if (typeof ultrasdospasos === 'undefined') {
        throw new Error("La función 'ultrasdospasos' de generador.js, necesaria para el análisis de personajes, no está disponible.");
    }

    console.log(`[IA-Carta] Solicitando ilustración para "${nombreCarta}" con estilo "${estiloVisual || 'por defecto'}"...`);

    let promptBase = `Ilustración para una carta coleccionable`;
    if (nombreCarta) promptBase += ` llamada "${nombreCarta}"`;
    if (tipoCarta) promptBase += `, de tipo ${tipoCarta}`;
    if (textoCarta) promptBase += `. Descripción/Habilidades: ${textoCarta}`;
    promptBase += `.`;

    const estiloFinal = estiloVisual || 'ilustración de fantasía detallada para carta coleccionable';
    
    const resultado = await ultrasdospasos(promptBase, estiloFinal);

    if (resultado && resultado.imagen) {
        console.log("[IA-Carta] Ilustración generada con éxito.");
        return resultado;
    } else {
        throw new Error(resultado?.error || "La IA no devolvió una ilustración válida.");
    }
}

