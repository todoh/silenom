// =================================================================
// MOMENTOS-IASINTETIZADOR.JS - Gestor de Síntesis de Datos
// =================================================================

const NOMBRES_SINTESIS = {
    MANIFIESTO: "Datos Sintetizados",
    PERSONAJES: "Sintesis de Personajes",
    LUGARES: "Sintesis de Lugares",
    EVENTOS: "Sintesis de Eventos",
    OBJETOS: "Sintesis de Objetos y Detalles",
    LORE: "Sintesis de Lore, Ideas, Estilo",
    RAMAS: "Sintesis de Ramas y Nodos"
};

/**
 * Orquestador principal. Revisa si hay datos nuevos sin sintetizar,
 * los procesa por categorías y actualiza los datos de síntesis correspondientes.
 */
async function gestionarSintesisDeDatos() {
    progressBarManager.start('Iniciando Sincronización de Síntesis...');
    
    // 1. Obtener todos los datos actuales del DOM
    const todosLosDatos = obtenerTodosLosDatosDelDOM();
    const nombresDeTodosLosDatos = todosLosDatos.map(d => d.nombre);

    // 2. Leer el manifiesto de datos ya sintetizados
    let { datoEl: manifiestoEl, contenido: contenidoManifiesto } = await obtenerODefinirDatoSintesis(NOMBRES_SINTESIS.MANIFIESTO);
    const nombresYaSintetizados = contenidoManifiesto.split('\n').filter(Boolean);

    // 3. Identificar datos nuevos que necesitan ser sintetizados
    const nombresDeDatosDeSintesis = Object.values(NOMBRES_SINTESIS);
    const datosNuevosParaSintetizar = todosLosDatos.filter(dato => 
        !nombresYaSintetizados.includes(dato.nombre) && 
        !nombresDeDatosDeSintesis.includes(dato.nombre)
    );

    if (datosNuevosParaSintetizar.length === 0) {
        progressBarManager.finish('Síntesis de datos ya está al día.');
        return;
    }

    progressBarManager.set(10, `Se encontraron ${datosNuevosParaSintetizar.length} datos nuevos para sintetizar.`);

    // 4. Agrupar datos nuevos por categoría de síntesis
    const datosAgrupados = agruparDatosPorCategoria(datosNuevosParaSintetizar);

    // 5. Procesar cada categoría que tenga datos nuevos
    const totalCategorias = Object.keys(datosAgrupados).length;
    let i = 0;
    for (const nombreSintesis in datosAgrupados) {
        const datosDeCategoria = datosAgrupados[nombreSintesis];
        const porcentaje = 10 + (80 * (++i / totalCategorias));
        progressBarManager.set(porcentaje, `Sintetizando: ${nombreSintesis}...`);
        
        let { contenido: sintesisActual } = await obtenerODefinirDatoSintesis(nombreSintesis);
        const infoNueva = datosDeCategoria.map(d => `* ${d.nombre}: ${d.descripcion}`).join('\n');

        const promptSintesis = `
            Eres un asistente de organización de información. Tu tarea es integrar nueva información en un resumen existente de manera coherente y concisa.

            **Resumen Actual:**
            ---
            ${sintesisActual || "No hay resumen previo. Créalo desde cero."}
            ---

            **Nueva Información a Integrar:**
            ---
            ${infoNueva}
            ---

            **Instrucciones:**
            - Combina la nueva información con el resumen actual.
            - Elimina redundancias y mantén la estructura clara.
            - El resultado debe ser un único bloque de texto actualizado y completo.

            **Responde ÚNICAMENTE con el texto del nuevo resumen completo.**
        `;
        
        const nuevaSintesisCompleta = await llamarIAConFeedback(promptSintesis, `Actualizando ${nombreSintesis}...`, 'gemini-2.5-flash-lite', false);
        await actualizarDescripcionDato(nombreSintesis, nuevaSintesisCompleta);
    }
    
    // 6. Actualizar el manifiesto
    const nuevosNombresSintetizados = datosNuevosParaSintetizar.map(d => d.nombre).join('\n');
    const nuevoContenidoManifiesto = (contenidoManifiesto ? contenidoManifiesto + '\n' : '') + nuevosNombresSintetizados;
    await actualizarDescripcionDato(NOMBRES_SINTESIS.MANIFIESTO, nuevoContenidoManifiesto);

    progressBarManager.set(100, 'Síntesis de datos completada.');
}

/**
 * Obtiene el contenido de un dato de síntesis. Si no existe, lo crea.
 * @param {string} nombreDato - El nombre del dato de síntesis a buscar/crear.
 * @returns {Promise<{datoEl: HTMLElement, contenido: string}>}
 */
async function obtenerODefinirDatoSintesis(nombreDato) {
    let datoEl = buscarDatoPorNombre(nombreDato);
    if (!datoEl) {
        agregarPersonajeDesdeDatos({
            nombre: nombreDato,
            descripcion: '',
            etiqueta: 'nota',
            arco: 'base' 
        });
        await new Promise(resolve => setTimeout(resolve, 50)); // Pequeña pausa para asegurar la renderización
        datoEl = buscarDatoPorNombre(nombreDato);
    }
    const contenido = datoEl.querySelector('.descripcionh')?.value || '';
    return { datoEl, contenido };
}

/**
 * Agrupa una lista de datos en las 6 categorías de síntesis.
 * @param {Array<Object>} datos - Array de objetos de datos.
 * @returns {Object} - Un objeto donde las claves son los nombres de síntesis y los valores son arrays de datos.
 */
function agruparDatosPorCategoria(datos) {
    const agrupados = {};
    datos.forEach(dato => {
        let categoria;
        if (dato.nombre.startsWith('Rama -') || dato.nombre.startsWith('Nodos -')) {
            categoria = NOMBRES_SINTESIS.RAMAS;
        } else {
            switch (dato.etiqueta) {
                case 'personaje':
                case 'animal':
                case 'ser_vivo':
                case 'mitologia':
                    categoria = NOMBRES_SINTESIS.PERSONAJES;
                    break;
                case 'ubicacion':
                case 'edificio':
                case 'elemento_geografico':
                    categoria = NOMBRES_SINTESIS.LUGARES;
                    break;
                case 'evento':
                    categoria = NOMBRES_SINTESIS.EVENTOS;
                    break;
                case 'objeto':
                case 'atuendo':
                case 'comida':
                case 'transporte':
                case 'muebles':
                case 'arte':
                    categoria = NOMBRES_SINTESIS.OBJETOS;
                    break;
                default:
                    categoria = NOMBRES_SINTESIS.LORE;
                    break;
            }
        }
        if (!agrupados[categoria]) agrupados[categoria] = [];
        agrupados[categoria].push(dato);
    });
    return agrupados;
}


 
/**
 * [FUNCIÓN MEJORADA v2]
 * Recopila y formatea el contenido de todos los datos de síntesis para usarlo como contexto.
 * AHORA TAMBIÉN INCLUYE EL CONTENIDO CRUDO DEL DATO "Mapa" SI EXISTE.
 * @returns {string} - El contexto completo y formateado para la IA.
 */
function obtenerContextoSintetizado() {
    let contextoCompleto = "A continuación se presenta una síntesis del universo narrativo actual, dividida por categorías:\n\n";
    
    // Bucle original para obtener los datos de síntesis
    for (const key in NOMBRES_SINTESIS) {
        const nombreDato = NOMBRES_SINTESIS[key];
        if (nombreDato === NOMBRES_SINTESIS.MANIFIESTO) continue;
        
        const datoEl = buscarDatoPorNombre(nombreDato);
        const contenido = datoEl ? datoEl.querySelector('.descripcionh')?.value : 'No disponible.';
        const tituloSeccion = nombreDato.replace('Sintesis de ', '').toUpperCase();
        
        contextoCompleto += `--- SÍNTESIS DE ${tituloSeccion} ---\n`;
        contextoCompleto += `${contenido}\n\n`;
    }

    // --- INICIO: Lógica para Añadir el Contexto del Mapa (Versión Directa) ---
    const mapaDato = buscarDatoPorNombre("Mapa");
    if (mapaDato) {
        const mapaDescripcion = mapaDato.querySelector('.descripcionh')?.value;
        // Se comprueba que la descripción no esté vacía
        if (mapaDescripcion && mapaDescripcion.trim() !== '') {
            let mapaContexto = "--- MAPA DEL MUNDO (JSON) ---\n";
            // Se añade el contenido de la descripción directamente, sin procesar
            mapaContexto += mapaDescripcion;
            
            contextoCompleto += mapaContexto + "\n\n";
            console.log("Contexto JSON crudo del 'Mapa' añadido a la IA.");
        }
    }
    // --- FIN: Lógica para Añadir el Contexto del Mapa ---

    return contextoCompleto;
}


// --- FUNCIONES AUXILIARES DE MANIPULACIÓN DEL DOM ---

/**
 * Escanea el DOM y devuelve un array con la información de todos los datos.
 * @returns {Array<{nombre: string, descripcion: string, etiqueta: string}>}
 */
function obtenerTodosLosDatosDelDOM() {
    const datos = [];
    document.querySelectorAll('#listapersonajes .personaje').forEach(el => {
        datos.push({
            nombre: el.querySelector('.nombreh')?.value || '',
            descripcion: el.querySelector('.descripcionh')?.value || '',
            etiqueta: el.querySelector('.change-tag-btn')?.dataset.etiqueta || 'indeterminado'
        });
    });
    return datos;
}

/**
 * Busca un elemento de dato en el DOM por su nombre exacto.
 * @param {string} nombre - El nombre del dato a buscar.
 * @returns {HTMLElement|null}
 */
function buscarDatoPorNombre(nombre) {
    const todosLosDatos = document.querySelectorAll('#listapersonajes .personaje');
    for (const datoEl of todosLosDatos) {
        if (datoEl.querySelector('.nombreh')?.value === nombre) {
            return datoEl;
        }
    }
    return null;
}

/**
 * Actualiza la descripción de un dato específico en el DOM.
 * @param {string} nombre - El nombre del dato a actualizar.
 * @param {string} nuevaDescripcion - El nuevo contenido para la descripción.
 */
async function actualizarDescripcionDato(nombre, nuevaDescripcion) {
    const datoEl = buscarDatoPorNombre(nombre);
    if (datoEl) {
        const textarea = datoEl.querySelector('.descripcionh');
        if (textarea) {
            textarea.value = nuevaDescripcion;
        }
    }
}