// =================================================================
// SILENOS - escena-ai.js MODIFICADO (con Estilo Visual)
// =================================================================

/**
 * Abre un modal mejorado para generar un storyboard.
 * 1. El usuario selecciona un libro y define un estilo visual opcional.
 * 2. Se carga una lista de los capítulos de ese libro con checkboxes.
 * 3. El usuario selecciona los capítulos deseados.
 * 4. Al confirmar, se genera una escena de storyboard POR CADA capítulo seleccionado,
 * aplicando el estilo visual a cada toma.
 */
function abrirModalGenerarStoryboardDesdeLibro() {
    // Comprobar si hay libros disponibles
    if (!libros || libros.length === 0) {
        alert("No hay libros en la biblioteca. Por favor, crea un libro primero.");
        return;
    }

    // Eliminar modales anteriores para evitar duplicados
    const existingOverlay = document.getElementById('storyboard-gen-modal-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // === INICIO DE CAMBIOS: HTML del modal actualizado ===
    // Añadimos un textarea para el estilo visual.
    const modalHTML = `
        <div id="storyboard-gen-modal-overlay" class="modal-overlay" style="display: block;">
            <div id="storyboard-gen-modal" class="modal-content" style="display: flex; flex-direction: column;">
                <button class="modal-close-btn" onclick="cerrarModalGenerarStoryboard()">&times;</button>
                <h2 style="font-size: 1.5em; font-weight: bold; margin-bottom: 1rem;">Generar Storyboard desde Libro</h2>
                <p style="margin-bottom: 1.5rem;">Selecciona un libro, define un estilo visual y elige los capítulos que quieres convertir en escenas.</p>
                
                <div style="margin-bottom: 1rem;">
                    <label for="libro-select-storyboard" style="display: block; margin-bottom: 0.5rem;">1. Libro:</label>
                    <select id="libro-select-storyboard" class="modal-select">
                        <option value="">Selecciona un libro...</option>
                        ${libros.map(libro => `<option value="${libro.id}">${libro.titulo}</option>`).join('')}
                    </select>
                </div>

                <div style="margin-bottom: 1rem;">
                    <label for="estilo-visual-input" style="display: block; margin-bottom: 0.5rem;">2. Estilo Visual (Opcional):</label>
                    <textarea id="estilo-visual-input" class="modal-textarea" placeholder="Ej: estilo ghibli, colores pastel, cinemático, arte conceptual de ciencia ficción, acuarela..." style="width: 100%; min-height: 60px;"></textarea>
                </div>

                <div id="capitulos-container" style="margin-top: 1rem; display: none;">
                    <label style="display: block; margin-bottom: 0.5rem;">3. Capítulos a incluir:</label>
                    <div id="capitulos-checkbox-container" style="max-height: 150px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; border-radius: 5px; background-color: #f9f9f9;">
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem;">
                    <button onclick="cerrarModalGenerarStoryboard()" class="btn btn-secondary">Cancelar</button>
                    <button id="confirm-storyboard-gen" class="btn btn-primary">Generar Escenas</button>
                </div>
            </div>
        </div>
    `;
    // === FIN DE CAMBIOS: HTML del modal actualizado ===

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Lógica para poblar capítulos dinámicamente (sin cambios)
    const libroSelect = document.getElementById('libro-select-storyboard');
    const capitulosContainer = document.getElementById('capitulos-container');
    const checkboxesDiv = document.getElementById('capitulos-checkbox-container');

    libroSelect.onchange = () => {
        const selectedLibroId = libroSelect.value;
        checkboxesDiv.innerHTML = ''; // Limpiar lista anterior

        if (!selectedLibroId) {
            capitulosContainer.style.display = 'none';
            return;
        }
        
        const capitulosDelLibro = Object.keys(escenas)
            .filter(id => escenas[id].libroId === selectedLibroId)
            .map(id => ({ id, ...escenas[id] }));

        if (capitulosDelLibro.length > 0) {
            capitulosDelLibro.forEach(capitulo => {
                const checkboxHTML = `
                    <div style="margin-bottom: 5px;">
                        <input type="checkbox" id="cap-${capitulo.id}" value="${capitulo.id}" checked>
                        <label for="cap-${capitulo.id}" style="cursor: pointer;">${capitulo.texto || 'Capítulo sin título'}</label>
                    </div>
                `;
                checkboxesDiv.insertAdjacentHTML('beforeend', checkboxHTML);
            });
            capitulosContainer.style.display = 'block';
        } else {
            checkboxesDiv.innerHTML = '<p style="margin: 0;">Este libro no tiene capítulos.</p>';
            capitulosContainer.style.display = 'block';
        }
    };

    // === INICIO DE CAMBIOS: Lógica del botón de confirmación actualizada ===
    document.getElementById('confirm-storyboard-gen').onclick = () => {
        const selectedLibroId = document.getElementById('libro-select-storyboard').value;
        if (!selectedLibroId) {
            alert("Por favor, selecciona un libro.");
            return;
        }
        
        // Obtenemos el texto del nuevo campo de estilo visual
        const estiloVisual = document.getElementById('estilo-visual-input').value.trim();

        const selectedCapitulosIds = Array.from(checkboxesDiv.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value);

        if (selectedCapitulosIds.length === 0) {
            alert("Por favor, selecciona al menos un capítulo para generar.");
            return;
        }
        
        // Pasamos el estilo visual a la función principal
        crearYMostrarEscenasParaLibro(selectedLibroId, selectedCapitulosIds, estiloVisual);
        
        cerrarModalGenerarStoryboard();
        abrir('escenah');
    };
    // === FIN DE CAMBIOS: Lógica del botón de confirmación ===

    document.getElementById('storyboard-gen-modal-overlay').onclick = function(e) {
        if (e.target.id === 'storyboard-gen-modal-overlay') {
            cerrarModalGenerarStoryboard();
        }
    };
}

function cerrarModalGenerarStoryboard() {
    const overlay = document.getElementById('storyboard-gen-modal-overlay');
    if (overlay) {
        overlay.remove();
    }
}

/**
 * === FUNCIÓN REFACTORIZADA ===
 * Genera una escena de storyboard por cada capítulo, aplicando un estilo visual global.
 *
 * @param {string} libroId - El ID del libro padre.
 * @param {string[]} capitulosSeleccionadosIds - Un array con los IDs de los capítulos a procesar.
 * @param {string} estiloVisual - El prompt de estilo artístico a añadir a cada toma.
 */
async function crearYMostrarEscenasParaLibro(libroId, capitulosSeleccionadosIds, estiloVisual) {
    const libro = libros.find(l => l.id === libroId);
    if (!libro) {
        alert("El libro seleccionado no se encontró.");
        return;
    }

    mostrarIndicadorCarga(true, `Iniciando generación para ${capitulosSeleccionadosIds.length} capítulo(s)...`);

    try {
        for (const [index, capituloId] of capitulosSeleccionadosIds.entries()) {
            const capitulo = escenas[capituloId];
            if (!capitulo) {
                console.warn(`Capítulo con ID ${capituloId} no encontrado. Saltando...`);
                continue;
            }

            mostrarIndicadorCarga(true, `Procesando capítulo ${index + 1}/${capitulosSeleccionadosIds.length}: "${capitulo.texto}"`);

            let contenidoCapitulo = "";
            if (capitulo.frames && Array.isArray(capitulo.frames)) {
                contenidoCapitulo = capitulo.frames.map(frame => frame.texto.trim()).filter(Boolean).join("\n\n");
            }

            if (!contenidoCapitulo.trim()) {
                console.warn(`El capítulo "${capitulo.texto}" está vacío. Saltando...`);
                continue;
            }

            const parrafos = contenidoCapitulo.split('\n\n').filter(p => p.trim() !== '');
            if (parrafos.length === 0) {
                 console.warn(`No se encontraron párrafos en el capítulo "${capitulo.texto}". Saltando...`);
                continue;
            }
            
            const nuevaEscena = {
                id: `scene_${Date.now()}_${index}`,
                nombre: `Storyboard de ${capitulo.texto}`,
                tomas: []
            };
            
            for (let i = 0; i < parrafos.length; i++) {
                const parrafo = parrafos[i];
                mostrarIndicadorCarga(true, `Capítulo ${index + 1}: Generando tomas para párrafo ${i + 1}/${parrafos.length}...`);

                const prompt = `Basado en el siguiente párrafo de una historia, divídelo en las tomas cinematográficas necesarias. Para CADA TOMA, genera un "guion_conceptual" y un "narracion".

Instrucciones:
1.  **guion_conceptual**: Describe la esencia visual de la toma: emoción, propósito, atmósfera, personajes y acciones clave. Esto será la base para un prompt de generación de imagen.
2.  **narracion**: Escribe la parte del texto original que corresponde a esta toma específica, en formato narrativo. Este será el texto que se leerá.

Párrafo: "${parrafo}"

Formato de respuesta (JSON estricto con un array de tomas):
{
  "tomas_generadas": [
    {
      "guion_conceptual": "Descripción conceptual de la primera toma.",
      "narracion": "La narración correspondiente a esta primera toma."
    }
  ]
}`;
                
                if (typeof llamarIAConFeedback !== 'function') {
                    throw new Error("La función `llamarIAConFeedback` no está definida.");
                }
                
                const modelToUse = 'gemini-2.5-flash';
                const respuestaAPI = await llamarIAConFeedback(prompt, `Párrafo ${i+1}`, modelToUse, true);

                if (respuestaAPI && Array.isArray(respuestaAPI.tomas_generadas)) {
                    for (const tomaData of respuestaAPI.tomas_generadas) {
                        if (tomaData.guion_conceptual && tomaData.narracion) {
                            
                            // === INICIO DE CAMBIOS: Aplicar el estilo visual ===
                            // Si el usuario proporcionó un estilo, lo añadimos al final del guion conceptual.
                            const guionConceptualFinal = estiloVisual
                                ? `${tomaData.guion_conceptual}. Estilo visual: ${estiloVisual}`
                                : tomaData.guion_conceptual;
                            // === FIN DE CAMBIOS ===

                            const nuevaToma = {
                                id: `toma_${nuevaEscena.id}_${nuevaEscena.tomas.length}`,
                                duracion: 8,
                                imagen: '',
                                guionConceptual: guionConceptualFinal, // Usamos el guion con el estilo añadido
                                guionTecnico: tomaData.narracion,
                                guionArtistico: ""
                            };
                            nuevaEscena.tomas.push(nuevaToma);
                        }
                    }
                } else {
                    console.warn(`No se pudo generar ninguna toma para el párrafo ${i+1}:`, parrafo);
                }
            }
            storyScenes.push(nuevaEscena);
        }

        console.log(`Generación de storyboard completada.`);
        if (typeof renderEscenasUI === 'function') {
            renderEscenasUI();
        }

    } catch (error) {
        console.error("Error durante la generación del storyboard:", error);
        alert("Ocurrió un error al generar las escenas. Revisa la consola para más detalles.");
    } finally {
        mostrarIndicadorCarga(false);
    }
}