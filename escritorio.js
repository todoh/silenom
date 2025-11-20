// Array para almacenar las posiciones de los elementos en el escritorio.
let posicionesElementosEscritorio = [];

const LIENZO_ANCHO = 8000;
const LIENZO_ALTO = 8000;

/**
 * Función principal para inicializar o recargar el escritorio.
 */
function inicializarEscritorio() {
    const escritorio = document.getElementById('escritorio');
    const listaOriginal = document.getElementById('listapersonajes');

    if (!escritorio || !listaOriginal) {
        console.error("Error: No se encontraron los elementos #escritorio o #listapersonajes.");
        return;
    }

    escritorio.innerHTML = ''; 

    const lienzo = document.createElement('div');
    lienzo.id = 'escritorio-lienzo';
    escritorio.appendChild(lienzo);

    const datosOriginales = listaOriginal.querySelectorAll('.personaje');

    const MARGEN = 50;
    const ANCHO_ELEMENTO = 150; // Ajustado al CSS
    const ALTO_ELEMENTO = 150; // Ajustado al CSS
    const numItems = datosOriginales.length;
    const itemsPorFila = Math.ceil(Math.sqrt(numItems));
    const anchoGrid = itemsPorFila * (ANCHO_ELEMENTO + MARGEN) - MARGEN;
    const numFilas = Math.ceil(numItems / itemsPorFila);
    const altoGrid = numFilas * (ALTO_ELEMENTO + MARGEN) - MARGEN;

    const centroLienzoX = LIENZO_ANCHO / 2;
    const centroLienzoY = LIENZO_ALTO / 2;

    let startX = centroLienzoX - anchoGrid / 2;
    let startY = centroLienzoY - altoGrid / 2;
    let currentX = startX;
    let currentY = startY;
    let itemsEnFila = 0;

    datosOriginales.forEach(datoOriginal => {
        const nombreInput = datoOriginal.querySelector('.nombreh');
        if (!nombreInput || !nombreInput.value) return;

        const idElemento = nombreInput.value.trim();
        const elementoClonado = datoOriginal.cloneNode(true);
        elementoClonado.classList.add('elemento-escritorio');
        elementoClonado.dataset.id = idElemento;
        elementoClonado.classList.remove('personaje');

        const editButton = document.createElement('button');
        editButton.textContent = 'EDITAR';
        editButton.className = 'edit-btn-escritorio';
        editButton.onclick = (e) => {
            e.stopPropagation(); 
            abrirEditorParaElemento(idElemento);
        };
        // Insertamos el botón de editar dentro del clon visual para que se superponga
        const visualClone = elementoClonado.querySelector('.personaje-visual');
        if (visualClone) {
            visualClone.appendChild(editButton);
        } else {
             elementoClonado.appendChild(editButton);
        }


        const posGuardada = posicionesElementosEscritorio.find(p => p.id === idElemento);

        if (posGuardada) {
            elementoClonado.style.left = `${posGuardada.x}px`;
            elementoClonado.style.top = `${posGuardada.y}px`;
        } else {
            elementoClonado.style.left = `${currentX}px`;
            elementoClonado.style.top = `${currentY}px`;
            guardarPosicionElemento(idElemento, currentX, currentY);

            currentX += ANCHO_ELEMENTO + MARGEN;
            itemsEnFila++;
            if (itemsEnFila >= itemsPorFila) {
                currentX = startX;
                currentY += ALTO_ELEMENTO + MARGEN;
                itemsEnFila = 0;
            }
        }

        lienzo.appendChild(elementoClonado);
        hacerElementoArrastrable(elementoClonado);
    });

    escritorio.scrollLeft = centroLienzoX - escritorio.clientWidth / 2;
    escritorio.scrollTop = centroLienzoY - escritorio.clientHeight / 2;
}

/**
 * --- VERSIÓN CORREGIDA Y FINAL ---
 * Abre un modal con un CLON del panel de edición y reconecta toda su funcionalidad.
 * @param {string} idElemento - El ID (nombre) del elemento a editar.
 */
function abrirEditorParaElemento(idElemento) {
    let datoOriginalEncontrado = null;
    document.querySelectorAll('#listapersonajes .personaje').forEach(dato => {
        if (dato.querySelector('.nombreh')?.value.trim() === idElemento) {
            datoOriginalEncontrado = dato;
        }
    });

    if (!datoOriginalEncontrado) {
        console.error(`No se encontró el dato original con id: ${idElemento}`);
        return;
    }

    // --- CORRECCIÓN CLAVE 1: Clonamos el panel de edición en lugar de moverlo ---
    const editorPanelOriginal = datoOriginalEncontrado.querySelector('.personaje-edit-overlay');
    if (!editorPanelOriginal) return;
    const editorPanelClonado = editorPanelOriginal.cloneNode(true); 

    const overlay = document.createElement('div');
    overlay.id = 'escritorio-modal-overlay';
    const modalContent = document.createElement('div');
    modalContent.id = 'escritorio-modal-content';
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.className = 'escritorio-modal-close';
    
    modalContent.appendChild(closeButton);
    modalContent.appendChild(editorPanelClonado); // Usamos el clon
    overlay.appendChild(modalContent);
    document.body.appendChild(overlay);
    
    // La lógica de previsualización se aplica al clon sin problema
    const previewImg = editorPanelClonado.querySelector('.edit-preview-image');
    const svgPreviewContainer = editorPanelClonado.querySelector('.edit-svg-preview');
    const canvas3D = editorPanelClonado.querySelector('.edit-3d-canvas');
    const promptVisualText = datoOriginalEncontrado.querySelector('.prompt-visualh')?.value || '';
    const svgCode = datoOriginalEncontrado.dataset.svgContent;
    
    let modelData = null;
    try { 
        const parsed = JSON.parse(promptVisualText);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.objects)) {
            modelData = parsed;
        }
    } catch (err) { /* No es un JSON 3D válido */ }

    if(previewImg) previewImg.style.display = 'none';
    if(svgPreviewContainer) svgPreviewContainer.style.display = 'none';
    if(canvas3D) canvas3D.style.display = 'none';

    if (modelData && canvas3D && typeof Mini3DViewer !== 'undefined') {
        canvas3D.style.display = 'block';
        requestAnimationFrame(() => new Mini3DViewer(canvas3D, modelData));
    } else if (svgCode && svgPreviewContainer) {
        svgPreviewContainer.innerHTML = svgCode;
        svgPreviewContainer.style.display = 'block';
    } else if (previewImg) {
        const visualImgSrc = datoOriginalEncontrado.querySelector('.personaje-visual img')?.src;
        if (visualImgSrc && !visualImgSrc.endsWith('/')) {
            previewImg.src = visualImgSrc;
            previewImg.style.display = 'block';
        }
    }

    // --- CORRECCIÓN CLAVE 2: RECONEXIÓN DE FUNCIONALIDAD (Aplicada al clon) ---

    // 1. Conectar Textareas para que actualicen el original en tiempo real
    const descripcionTextarea = editorPanelClonado.querySelector('.descripcionh');
    const promptTextarea = editorPanelClonado.querySelector('.prompt-visualh');
    
    if(descripcionTextarea) {
        descripcionTextarea.addEventListener('input', () => {
            datoOriginalEncontrado.querySelector('.descripcionh').value = descripcionTextarea.value;
            // Actualizar también la preview de la tarjeta original
            const descPreview = datoOriginalEncontrado.querySelector('.personaje-descripcion-preview');
            if(descPreview) descPreview.textContent = descripcionTextarea.value;
        });
    }

    if(promptTextarea) {
        promptTextarea.addEventListener('input', () => {
            const originalPromptTextarea = datoOriginalEncontrado.querySelector('.prompt-visualh');
            originalPromptTextarea.value = promptTextarea.value;
            // Disparamos el evento en el original para que se active la preview 3D en vivo si aplica
            originalPromptTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }
    
    // 2. Reconectar los botones a sus funciones originales de `datos.js`
    const botonCargar = editorPanelClonado.querySelector('.change-image-btn');
    if (botonCargar && typeof fileToBase64 === 'function') {
        botonCargar.onclick = () => {
             const inputFile = document.createElement('input');
             inputFile.type = 'file';
             inputFile.accept = 'image/*';
             inputFile.onchange = async (event) => {
                 if (event.target.files && event.target.files[0]) {
                     const nuevaImagen = await fileToBase64(event.target.files[0]);
                     actualizarVisualDato(datoOriginalEncontrado, nuevaImagen);
                     // Actualizamos también la preview del modal
                     if(previewImg) {
                         previewImg.src = nuevaImagen;
                         previewImg.style.display = 'block';
                         if(svgPreviewContainer) svgPreviewContainer.style.display = 'none';
                         if(canvas3D) canvas3D.style.display = 'none';
                     }
                 }
             };
             inputFile.click();
        };
    }

    const botonGaleria = editorPanelClonado.querySelector('.select-gallery-btn');
    if (botonGaleria && typeof abrirModalGaleria === 'function') {
        // La función original espera el contenedor del dato
        botonGaleria.onclick = () => abrirModalGaleria(datoOriginalEncontrado);
    }

    const botonEliminar = editorPanelClonado.querySelector('.delete-btn');
    if(botonEliminar) {
        botonEliminar.onclick = () => {
            if (confirm('¿Estás seguro de que quieres eliminar este dato?')) {
                datoOriginalEncontrado.remove();
                closeModal(true); // Cierra y evita la actualización del clon que ya no existe
            }
        };
    }
    
    // Botón de acciones IA (el más complejo)
    const botonAcciones = editorPanelClonado.querySelector('.edit-btn.✨'); // O una clase más específica si la tienes
    if (botonAcciones) {
        // En lugar de replicar la lógica, simplemente llamamos a la función original del botón original.
        const botonAccionesOriginal = datoOriginalEncontrado.querySelector('.personaje-edit-overlay .edit-btn.✨');
        if (botonAccionesOriginal && typeof botonAccionesOriginal.onclick === 'function') {
           // Truco: Le asignamos la función `onclick` del botón original al botón clonado.
           // Para que funcione correctamente, el contexto (`this`) debe ser el botón clonado.
            botonAcciones.onclick = botonAccionesOriginal.onclick.bind(botonAcciones);
        }
    }
    
    // --- FIN RECONEXIÓN ---

    const closeModal = (eliminado = false) => {
        document.body.removeChild(overlay);
        
        // Solo actualizamos el clon si el dato original no fue eliminado
        if (!eliminado) {
            actualizarClonEscritorio(idElemento, datoOriginalEncontrado);
        } else {
            inicializarEscritorio(); // Si se eliminó, recargamos todo el escritorio para reflejar el cambio
        }
    };

    closeButton.onclick = () => closeModal();
    overlay.onclick = (e) => {
        if (e.target === overlay) closeModal();
    };
}


/**
 * Función auxiliar para actualizar la imagen de un dato original en todas sus vistas.
 * @param {HTMLElement} datoEl - El elemento .personaje original.
 * @param {string} nuevaImagenSrc - La nueva URL de la imagen (base64).
 */
function actualizarVisualDato(datoEl, nuevaImagenSrc) {
    if (!datoEl || !nuevaImagenSrc) return;
    
    const imgPrincipal = datoEl.querySelector('.personaje-visual img');
    const imgEditor = datoEl.querySelector('.personaje-edit-overlay .edit-preview-image');
    
    if (imgPrincipal) {
        imgPrincipal.src = nuevaImagenSrc;
        imgPrincipal.classList.remove('hidden');
    }
    if (imgEditor) {
        imgEditor.src = nuevaImagenSrc;
        imgEditor.style.display = 'block';
    }
    delete datoEl.dataset.svgContent; // Una imagen cargada anula el SVG
}


/**
 * Sincroniza los datos visuales del clon en el escritorio con el dato original después de editar.
 */
function actualizarClonEscritorio(idOriginal, datoOriginal) {
    const lienzo = document.getElementById('escritorio-lienzo');
    if (!lienzo || !datoOriginal) return;
    
    const clonEnEscritorio = lienzo.querySelector(`.elemento-escritorio[data-id="${idOriginal}"]`);

    if (clonEnEscritorio) {
        const nuevoNombre = datoOriginal.querySelector('.nombreh').value;
        const nuevaImagenSrc = datoOriginal.querySelector('.personaje-visual img').src;

        const nombreClon = clonEnEscritorio.querySelector('.nombreh');
        if (nombreClon) nombreClon.value = nuevoNombre;

        const imagenClon = clonEnEscritorio.querySelector('.personaje-visual img');
        if (imagenClon) {
            imagenClon.src = nuevaImagenSrc;
            imagenClon.classList.toggle('hidden', !nuevaImagenSrc || nuevaImagenSrc.endsWith('/'));
        }

        // Si el nombre cambió, actualizamos el ID del clon y en el array de posiciones
        if (idOriginal !== nuevoNombre) {
            clonEnEscritorio.dataset.id = nuevoNombre;
            const pos = posicionesElementosEscritorio.find(p => p.id === idOriginal);
            if (pos) pos.id = nuevoNombre;
        }
    }
}


/**
 * Añade la lógica de arrastrar y soltar a un elemento del escritorio.
 */
function hacerElementoArrastrable(elemento) {
    let offsetX, offsetY;

    elemento.addEventListener('mousedown', (e) => {
        // Ignorar clics en el botón de editar
        if (e.target.classList.contains('edit-btn-escritorio')) return;
        e.stopPropagation();
        
        elemento.classList.add('dragging');
        const rect = elemento.getBoundingClientRect();
        const escritorioRect = elemento.closest('#escritorio').getBoundingClientRect();
        
        // Calculamos el offset relativo al viewport
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        const escritorio = document.getElementById('escritorio');
        // Las nuevas coordenadas se calculan relativas al lienzo, sumando el scroll del contenedor
        let newX = e.clientX - offsetX - escritorio.getBoundingClientRect().left + escritorio.scrollLeft;
        let newY = e.clientY - offsetY - escritorio.getBoundingClientRect().top + escritorio.scrollTop;
        
        elemento.style.left = `${newX}px`;
        elemento.style.top = `${newY}px`;
    }

    function onMouseUp() {
        elemento.classList.remove('dragging');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        const idElemento = elemento.dataset.id;
        const finalX = elemento.offsetLeft;
        const finalY = elemento.offsetTop;
        guardarPosicionElemento(idElemento, finalX, finalY);
    }
}

/**
 * Guarda o actualiza la posición de un elemento en el array.
 */
function guardarPosicionElemento(id, x, y) {
    const indiceExistente = posicionesElementosEscritorio.findIndex(p => p.id === id);
    if (indiceExistente > -1) {
        posicionesElementosEscritorio[indiceExistente].x = x;
        posicionesElementosEscritorio[indiceExistente].y = y;
    } else {
        posicionesElementosEscritorio.push({ id, x, y });
    }
}


/**
 * Inicializa la capacidad de moverse por el escritorio arrastrando el fondo.
 */
function inicializarPanningEscritorio() {
    const escritorio = document.getElementById('escritorio');
    if (!escritorio) return;

    let isPanning = false;
    let lastX, lastY;

    escritorio.addEventListener('mousedown', (e) => {
        if (e.target.id === 'escritorio' || e.target.id === 'escritorio-lienzo') {
            e.preventDefault();
            isPanning = true;
            lastX = e.clientX;
            lastY = e.clientY;
            escritorio.classList.add('grabbing');
            
            window.addEventListener('mousemove', onPanMove);
            window.addEventListener('mouseup', onPanEnd);
        }
    });

    function onPanMove(e) {
        if (!isPanning) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;

        escritorio.scrollLeft -= dx;
        escritorio.scrollTop -= dy;

        lastX = e.clientX;
        lastY = e.clientY;
    }

    function onPanEnd() {
        isPanning = false;
        escritorio.classList.remove('grabbing');
        
        window.removeEventListener('mousemove', onPanMove);
        window.removeEventListener('mouseup', onPanEnd);
    }
}

document.addEventListener('DOMContentLoaded', inicializarPanningEscritorio);