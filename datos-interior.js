
/**
 * --- FUNCIÓN CORREGIDA ---
 * Muestra un modal para que el usuario introduzca un prompt personalizado
 * y mejore el SVG de un personaje. Ya no causa el error de referencia.
 * @param {HTMLElement} personajeDIV - El elemento contenedor del personaje.
 */
function mostrarModalMejora(personajeDIV) {
    const svgContent = personajeDIV.dataset.svgContent;
    const nombrePersonaje = personajeDIV.querySelector("input.nombreh")?.value || 'este personaje';

    const botonGenerarIA = personajeDIV.querySelector('.generate-ai-btn');
    const botonMejorarIA = personajeDIV.querySelector('.improve-ai-btn');
    const botonCargar = personajeDIV.querySelector('.change-image-btn');
    const botonEliminar = personajeDIV.querySelector('.delete-btn');

    if (!svgContent) {
        alert("No se encontró contenido SVG para mejorar en este dato.");
        return;
    }
    if (typeof mejorarImagenDesdeSVG !== 'function') {
        alert("Error: La función 'mejorarImagenDesdeSVG' no está disponible.");
        return;
    }

    if (document.getElementById('improve-modal-overlay')) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'improve-modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0);
        display: flex; justify-content: center; align-items: center;
        z-index: 2000; transform: translateX(10%);
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        position: relative; background-color: #fff; padding: 30px;
        border-radius: 12px; width: 90%; max-width: 500px;
        display: flex; flex-direction: column;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.17);  
    `;
    modalContent.addEventListener('click', (event) => event.stopPropagation());

    const modalTitle = document.createElement('h1');
    modalTitle.textContent = `Mejorar imagen de ${nombrePersonaje}`;
    modalTitle.style.cssText = 'margin-top: 0; margin-bottom: 20px; color: #333;';

    const closeModal = () => {
        if (modalOverlay.parentNode) {
            modalOverlay.parentNode.removeChild(modalOverlay);
        }
    };

    const closeButton = document.createElement('span');
    closeButton.textContent = '×';
    closeButton.onclick = closeModal;
    closeButton.style.cssText = `
        position: absolute; top: 10px; right: 15px; font-size: 30px;
        font-weight: bold; cursor: pointer; color: #888;`;
    
    const promptTextarea = document.createElement('textarea');
    promptTextarea.placeholder = 'Describe cómo quieres mejorar la imagen... (ej: "un estilo más realista", "colores de ciencia ficción", "que parezca un boceto a lápiz")';
    promptTextarea.style.cssText = `
        width: 100%; min-height: 100px; margin-bottom: 20px;
        padding: 10px; border: 1px solid #ccc; border-radius: 5px;
        font-size: 16px; resize: vertical; box-sizing: border-box;`;

    const improveButton = document.createElement('button');
    improveButton.textContent = 'Mejorar con IA';
    improveButton.style.cssText = `
        padding: 12px 20px; border: none; border-radius: 5px;
        background-color: #007bff; color: white; font-size: 16px;
        cursor: pointer; font-weight: bold; transition: background-color 0.2s;`;
    improveButton.onmouseover = () => improveButton.style.backgroundColor = '#0056b3';
    improveButton.onmouseout = () => improveButton.style.backgroundColor = '#007bff';

    improveButton.onclick = async () => {
        const prompt = promptTextarea.value.trim();
        if (!prompt) {
            alert("Por favor, escribe un prompt para la mejora.");
            return;
        }

        improveButton.textContent = 'Mejorando...';
        improveButton.disabled = true;
        
        if (botonMejorarIA) botonMejorarIA.innerHTML = '⚙️';
        if (botonGenerarIA) botonGenerarIA.disabled = true;
        if (botonMejorarIA) botonMejorarIA.disabled = true;
        if (botonCargar) botonCargar.disabled = true;
        if (botonEliminar) botonEliminar.disabled = true;

        try {
            const { imagen, svgContent: svgMejorado } = await mejorarImagenDesdeSVG(svgContent, prompt);
            
            // --- INICIO DE LA CORRECCIÓN ---
            // Lógica replicada de la función inaccesible 'actualizarVisual'
            const img = personajeDIV.querySelector('.personaje-visual img');
            const descripcionPreview = personajeDIV.querySelector('.personaje-descripcion-preview');
            const previewImageInOverlay = personajeDIV.querySelector('.personaje-edit-overlay .edit-preview-image');
            const nuevaDescripcion = personajeDIV.querySelector("textarea").value;

            if (img) {
                img.src = imagen || '';
                img.classList.toggle('hidden', !imagen || imagen.endsWith('/'));
            }
            if (descripcionPreview) {
                descripcionPreview.textContent = nuevaDescripcion;
            }
            if (previewImageInOverlay) {
                if (imagen && !imagen.endsWith('/')) {
                    previewImageInOverlay.src = imagen;
                    previewImageInOverlay.style.display = 'block';
                } else {
                    previewImageInOverlay.style.display = 'none';
                }
            }
            // --- FIN DE LA CORRECCIÓN ---

            personajeDIV.dataset.svgContent = svgMejorado;
            console.log("Mejora completada con éxito.");

        } catch (error) {
            console.error("Error durante la mejora con IA:", error);
            alert(`Ocurrió un error al intentar mejorar la imagen: ${error.message}`);
        } finally {
            if (botonMejorarIA) botonMejorarIA.innerHTML = '📈';
            if (botonGenerarIA) botonGenerarIA.disabled = false;
            if (botonMejorarIA) botonMejorarIA.disabled = false;
            if (botonCargar) botonCargar.disabled = false;
            if (botonEliminar) botonEliminar.disabled = false;
            closeModal();
        }
    };

    modalContent.appendChild(closeButton);
    modalContent.appendChild(modalTitle);
    modalContent.appendChild(promptTextarea);
    modalContent.appendChild(improveButton);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    promptTextarea.focus();
    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });
}

function agregarBotonEliminarAPersonajes() {
    const personajes = document.querySelectorAll('.personaje');
    personajes.forEach(personajeDiv => {
        if (personajeDiv.querySelector('.eliminar-personaje-btn')) return;
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '';
        deleteButton.className = 'eliminar-personaje-btn pro';
        deleteButton.onclick = function(event) {
            event.stopPropagation();
            if (confirm('¿Estás seguro de que quieres eliminar este dato?')) {
                personajeDiv.remove();
            }
        };
        personajeDiv.appendChild(deleteButton);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const selectorBtn = document.getElementById('selector-guion-btn-local');
    const popup = document.getElementById('lista-guiones-popup-local');
    if (selectorBtn && popup) {
        function popularListaGuiones() {
            popup.innerHTML = '';
            // guionLiterarioData is not defined here, assuming it's global from another file
            if (typeof guionLiterarioData !== 'undefined') {
                guionLiterarioData.forEach((capitulo, index) => {
                    const item = document.createElement('button');
                    item.className = 'guion-popup-item-local';
                    item.textContent = capitulo.titulo;
                    item.onclick = () => {
                        mostrarCapituloSeleccionado(index);
                        popup.style.display = 'none';
                    };
                    popup.appendChild(item);
                });
            }
        }
        selectorBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const isVisible = popup.style.display === 'block';
            if (!isVisible) {
                popularListaGuiones();
                popup.style.display = 'block';
            } else {
                popup.style.display = 'none';
            }
        });
        document.addEventListener('click', () => {
            if (popup.style.display === 'block') {
                popup.style.display = 'none';
            }
        });
        popup.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    }
});



let debounceTimer;

/**
 * Función principal que se activa al editar un 'Prompt Visual'.
 * Detecta si el texto es un JSON 3D válido y, de ser así, genera y aplica una previsualización.
 * @param {Event} event - El evento 'input' del textarea.
 */
async function handleVisualPromptInput(event) {
    const textarea = event.target;
    const texto = textarea.value.trim();
    const personajeDIV = textarea.closest('.personaje');
    if (!personajeDIV) return;

    // --- INICIO DE LA MODIFICACIÓN ---
    // 1. CONDICIÓN DE SEGURIDAD:
    // Si el texto NO empieza con la estructura de tu modelo 3D,
    // la función se detiene INMEDIATAMENTE. No hace nada.
    if (!texto.startsWith('{ "objects": [ {')) {
        return; // No borra nada, no renderiza nada.
    }
    // --- FIN DE LA MODIFICACIÓN ---

    let modelData = null;
    try {
        // 2. Ahora que sabemos que el formato es el correcto, intentamos interpretarlo.
        const parsed = JSON.parse(texto);
        if (parsed && typeof parsed === 'object' && (Array.isArray(parsed.objects) || (parsed.model && Array.isArray(parsed.model.objects)))) {
            modelData = parsed.model || parsed;
        } else {
            return; // El formato empezó bien pero la estructura es inválida, no hacemos nada.
        }
    } catch (e) {
        // El JSON empezó bien pero está malformado. Tampoco hacemos nada.
        return;
    }

    // 3. Si todo es correcto, generamos la previsualización 3D.
    if (modelData) {
        try {
            if (typeof generate3DPreview !== 'function') return;
            const previewDataUrl = await generate3DPreview(modelData);

            const imgPreview = personajeDIV.querySelector('.personaje-visual img');
            if (imgPreview) {
                imgPreview.src = previewDataUrl;
                imgPreview.classList.remove('hidden');
            }

            const imgEditor = personajeDIV.querySelector('.edit-preview-image');
            if (imgEditor) {
                imgEditor.src = previewDataUrl;
                imgEditor.style.display = 'block';
            }
            personajeDIV.dataset.svgContent = texto;
        } catch (error) {
            console.error("Error al generar la previsualización 3D en tiempo real:", error);
        }
    }
}

// =========================================================================
// INICIO: Previsualización 3D en Tiempo Real desde Prompt Visual
// =========================================================================

/**
 * Inicializa los listeners en TODOS los textareas de 'Prompt Visual' existentes.
 * Utiliza un 'debounce' para no sobrecargar el navegador con renders mientras se escribe.
 */
function inicializarPrevisualizacion3DEnVivo() {
    const todosLosPrompts = document.querySelectorAll('.prompt-visualh');
    todosLosPrompts.forEach(textarea => {
        // Elimina listeners antiguos para evitar duplicados si se llama varias veces
        textarea.removeEventListener('input', debouncedInputHandler); 
        
        // Añade el nuevo listener con debounce
        textarea.addEventListener('input', debouncedInputHandler);
    });
    console.log(`Inicializados ${todosLosPrompts.length} listeners para previsualización 3D en vivo.`);
}

/**
 * Manejador de evento con 'debounce' para evitar ejecuciones excesivas.
 * @param {Event} event 
 */
function debouncedInputHandler(event) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        // Primero, la lógica existente que genera la imagen estática
        handleVisualPromptInput(event);
        
        // Ahora, la nueva lógica para actualizar el visor interactivo si está activo
        const textarea = event.target;
        const personajeDIV = textarea.closest('.personaje');

        if (personajeDIV && personajeDIV.classList.contains('editing') && personajeDIV.miniViewer) {
            try {
                const newModelData = JSON.parse(textarea.value.trim());
                 if (newModelData && typeof newModelData === 'object' && (Array.isArray(newModelData.objects))) {
                    personajeDIV.miniViewer.updateModel(newModelData);
                 }
            } catch (e) {
                // El JSON no es válido mientras se escribe, no hacemos nada.
            }
        }
    }, 750); 
}
