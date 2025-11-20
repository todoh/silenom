// ========================================================================
// === datos-cartas.js - VERSIÓN FINAL CON GUARDADO DE POSICIÓN ROBUSTO ===
// ========================================================================

function aplicarTransformacionLienzo() {
    const lienzo = document.getElementById('lienzo-visual');
    if (lienzo) {
        lienzo.style.transformOrigin = '0 0';
        lienzo.style.transform = `translate(${panX}px, ${panY}px) scale(${escalaLienzo})`;
    }
}

function inicializarZoomConRueda() {
    const contenedor = document.getElementById('personajes');
    if (!contenedor) return;
    contenedor.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = contenedor.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const puntoCanvasX = (mouseX - panX) / escalaLienzo;
        const puntoCanvasY = (mouseY - panY) / escalaLienzo;
        const delta = e.deltaY > 0 ? 1 / FACTOR_ZOOM : FACTOR_ZOOM;
        const nuevaEscala = Math.max(ESCALA_MIN, Math.min(ESCALA_MAX, escalaLienzo * delta));
        panX = mouseX - puntoCanvasX * nuevaEscala;
        panY = mouseY - puntoCanvasY * nuevaEscala;
        escalaLienzo = nuevaEscala;
        aplicarTransformacionLienzo();
    }, { passive: false });
}

// EN: datos-cartas.js
// REEMPLAZA por completo la función 'hacerStickerArrastrable' existente con esta nueva versión.

// EN: datos-cartas.js
// REEMPLAZA la función 'hacerStickerArrastrable' existente por esta:

function hacerStickerArrastrable(sticker) {
    let dragOffsets = new Map();
    let currentOverFolder = null; // Para saber sobre qué carpeta estamos

    sticker.addEventListener('mousedown', (e) => {
        if (e.target.closest('button, input, .sticker-nombre-edit')) return;
        if (e.shiftKey) {
            e.stopPropagation();
            toggleSeleccionSticker(sticker);
            return; 
        }

        if (!selectedStickers.has(sticker.dataset.id)) {
            limpiarSeleccion();
            toggleSeleccionSticker(sticker, true);
        }
        if (selectedStickers.size === 0) return;

        e.stopPropagation();
        
        const lienzoRect = document.getElementById('lienzo-visual').getBoundingClientRect();
        const startX = (e.clientX - lienzoRect.left) / escalaLienzo;
        const startY = (e.clientY - lienzoRect.top) / escalaLienzo;

        dragOffsets.clear();
        selectedStickers.forEach(id => {
            const el = document.querySelector(`.personaje-sticker[data-id="${id}"]`);
            if (el) {
                el.classList.add('dragging');
                el.style.cursor = 'grabbing';
                const stickerOffsetX = startX - el.offsetLeft;
                const stickerOffsetY = startY - el.offsetTop;
                dragOffsets.set(id, { x: stickerOffsetX, y: stickerOffsetY });
            }
        });
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        if (dragOffsets.size === 0) return;

        const lienzoRect = document.getElementById('lienzo-visual').getBoundingClientRect();
        const mouseXInterno = (e.clientX - lienzoRect.left) / escalaLienzo;
        const mouseYInterno = (e.clientY - lienzoRect.top) / escalaLienzo;

        dragOffsets.forEach((offset, id) => {
            const el = document.querySelector(`.personaje-sticker[data-id="${id}"]`);
            if (el) {
                el.style.left = `${mouseXInterno - offset.x}px`;
                el.style.top = `${mouseYInterno - offset.y}px`;
            }
        });
        
        actualizarModalContextual();

        // --- LÓGICA DE CARPETAS AÑADIDA ---
        const stickerRect = sticker.getBoundingClientRect(); // Rect del sticker que se mueve
        let folderFound = null;
        
        document.querySelectorAll('.dato-carpeta').forEach(folder => {
            const folderRect = folder.getBoundingClientRect();
            // Comprueba si el centro del sticker está sobre la carpeta
            const stickerCenterX = stickerRect.left + stickerRect.width / 2;
            const stickerCenterY = stickerRect.top + stickerRect.height / 2;

            if (stickerCenterX > folderRect.left && stickerCenterX < folderRect.right &&
                stickerCenterY > folderRect.top && stickerCenterY < folderRect.bottom) {
                folderFound = folder;
            }
        });

        if (currentOverFolder !== folderFound) {
            currentOverFolder?.classList.remove('drag-over');
            folderFound?.classList.add('drag-over');
            currentOverFolder = folderFound;
        }
        // --- FIN LÓGICA CARPETAS ---
    }

    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        // --- LÓGICA DE CARPETAS AÑADIDA ---
        const oldFolderId = sticker.dataset.carpetaId;
        let oldFolder = null;
        if (oldFolderId) {
            oldFolder = document.querySelector(`.dato-carpeta[data-id="${oldFolderId}"]`);
        }

        if (currentOverFolder) {
            // Soltado SOBRE una carpeta
            const newFolderId = currentOverFolder.dataset.id;
            currentOverFolder.classList.remove('drag-over');

            dragOffsets.forEach((offset, id) => {
                const el = document.querySelector(`.personaje-sticker[data-id="${id}"]`);
                if (el) {
                    el.dataset.carpetaId = newFolderId; // Asigna el sticker a la carpeta
                }
            });
            
            if (typeof actualizarLimitesCarpeta === 'function') {
                actualizarLimitesCarpeta(currentOverFolder);
                if (oldFolder && oldFolder !== currentOverFolder) {
                    actualizarLimitesCarpeta(oldFolder); // Actualiza también la carpeta antigua
                }
            }
        } else {
            // Soltado FUERA de cualquier carpeta
            dragOffsets.forEach((offset, id) => {
                const el = document.querySelector(`.personaje-sticker[data-id="${id}"]`);
                if (el) {
                    delete el.dataset.carpetaId; // Quita el sticker de la carpeta
                }
            });

            if (oldFolder && typeof actualizarLimitesCarpeta === 'function') {
                actualizarLimitesCarpeta(oldFolder); // Actualiza la carpeta que ha perdido el sticker
            }
        }
        currentOverFolder = null;
        // --- FIN LÓGICA CARPETAS ---

        dragOffsets.forEach((offset, id) => {
            const el = document.querySelector(`.personaje-sticker[data-id="${id}"]`);
            if (el) {
                el.classList.remove('dragging');
                el.style.cursor = 'grab';
                if (typeof guardarPosicionDato === 'function') {
                    guardarPosicionDato(el.dataset.id, el.offsetLeft, el.offsetTop);
                }
            }
        });
        dragOffsets.clear();
    }
}
// EN: datos-cartas.js

function inicializarPanningDatos() {
    const contenedor = document.getElementById('personajes');
    if (!contenedor) return;
    let isPanning = false;
    let lastX, lastY;
    contenedor.addEventListener('mousedown', (e) => {
        // --- CORRECCIÓN APLICADA AQUÍ ---
        // Ahora el paneo solo se activa con el clic izquierdo (e.button === 0)
        if ((e.target.id === 'personajes' || e.target.id === 'lienzo-visual') && e.button === 0) {
            e.preventDefault();
            isPanning = true;
            lastX = e.clientX;
            lastY = e.clientY;
            contenedor.style.cursor = 'grabbing';
            window.addEventListener('mousemove', onPanMove);
            window.addEventListener('mouseup', onPanEnd);
        }
    });

    function onPanMove(e) {
        if (!isPanning) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        panX += dx;
        panY += dy;
        aplicarTransformacionLienzo();
        lastX = e.clientX;
        lastY = e.clientY;
    }

    function onPanEnd() {
        if (!isPanning) return;
        isPanning = false;
        contenedor.style.cursor = 'default';
        window.removeEventListener('mousemove', onPanMove);
        window.removeEventListener('mouseup', onPanEnd);
    }
}

function crearThumbnail(imagenSrc, maxWidth = 450, maxHeight = 450) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            let { width, height } = img;
            if (width > height) {
                if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
            } else {
                if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
            }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png', 1));
        };
        img.onerror = (err) => reject(err);
        img.src = imagenSrc;
    });
}

/**
 * --- FUNCIÓN CORREGIDA CON ACTUALIZACIÓN DE POSICIONES ---
 */
function crearStickerParaDato(datoPesado) {
    const idDato = datoPesado.dataset.id;
    if (!idDato) return null;

    const sticker = document.createElement('div');
    sticker.className = 'personaje-sticker';
    sticker.dataset.id = idDato;
// Asigna el ID de la carpeta si existe en el dato pesado
    const carpetaId = datoPesado.dataset.carpetaId;
    if (carpetaId) {
        sticker.dataset.carpetaId = carpetaId;
    }
    const nombre = datoPesado.querySelector('.nombreh')?.value || 'Sin Nombre';
    const imgSrc = datoPesado.dataset.fullImageSrc || datoPesado.querySelector('.personaje-visual img')?.src || '';

    const posicionGuardada = posicionesDatos.find(p => p.id === idDato);
    if (posicionGuardada) {
        sticker.style.left = `${posicionGuardada.x}px`;
        sticker.style.top = `${posicionGuardada.y}px`;
    } else {
        sticker.style.left = datoPesado.style.left || '0px';
        sticker.style.top = datoPesado.style.top || '0px';
    }

    sticker.innerHTML = `
        <img src="${imgSrc}" alt="${nombre}" class="sticker-img" onerror="this.style.display='none'">
        <div class="sticker-nombre" title="${nombre}">${nombre}</div>
        <button class="sticker-edit-btn">✏️</button> 
    `;

    const etiquetaBtn = document.createElement('button');
    etiquetaBtn.className = 'change-tag-btn';
    const etiquetaValor = datoPesado.querySelector('.change-tag-btn')?.dataset.etiqueta || 'indeterminado';
    const opEtiqueta = opcionesEtiqueta.find(op => op.valor === etiquetaValor) || opcionesEtiqueta.find(op => op.valor === 'indeterminado');
    etiquetaBtn.dataset.etiqueta = opEtiqueta.valor;
    etiquetaBtn.innerHTML = opEtiqueta.emoji;
    etiquetaBtn.title = `Etiqueta: ${opEtiqueta.titulo}`;
    etiquetaBtn.onclick = (e) => {
        e.stopPropagation();
        if (typeof mostrarMenuEtiquetas === 'function') mostrarMenuEtiquetas(etiquetaBtn);
    };
    sticker.appendChild(etiquetaBtn);

    const arcoBtn = document.createElement('button');
    arcoBtn.className = 'change-arc-btn';
    const arcoValor = datoPesado.querySelector('.change-arc-btn')?.dataset.arco || 'sin_arco';
    const opArco = opcionesArco.find(op => op.valor === arcoValor) || opcionesArco.find(op => op.valor === 'sin_arco');
    arcoBtn.dataset.arco = opArco.valor;
    arcoBtn.innerHTML = opArco.emoji;
    arcoBtn.title = `Arco: ${opArco.titulo}`;
    arcoBtn.onclick = (e) => {
        e.stopPropagation();
        if (typeof mostrarMenuArcos === 'function') mostrarMenuArcos(arcoBtn);
    };
    sticker.appendChild(arcoBtn);



    sticker.addEventListener('click', (e) => {
        if (e.target.classList.contains('sticker-nombre')) {
            const nombreDiv = e.target;
            const nombreActual = nombreDiv.textContent;
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'sticker-nombre-edit';
            input.value = nombreActual;
            
            const guardarCambio = () => {
                const nuevoNombre = input.value.trim() || 'Sin Nombre';

                // Si el nombre no ha cambiado, no hacemos nada más
                if (nuevoNombre === nombreActual) {
                    input.replaceWith(nombreDiv);
                    return;
                }
                
                // 1. Actualiza el "dato pesado" oculto
                const datoPesadoTarget = document.querySelector(`#listapersonajes .personaje[data-id="${idDato}"]`);
                if (datoPesadoTarget) {
                    datoPesadoTarget.querySelector('.nombreh').value = nuevoNombre;
                }
                
                // --- INICIO DE LA CORRECCIÓN ---
                // 2. Actualiza el nombre en el array de posiciones
                const indicePosicion = posicionesDatos.findIndex(p => p.id === nombreActual);
                if (indicePosicion > -1) {
                    posicionesDatos[indicePosicion].id = nuevoNombre;
                    console.log(`Posición del lienzo actualizada de '${nombreActual}' a '${nuevoNombre}'.`);
                }
                // --- FIN DE LA CORRECCIÓN ---

                // 3. Reemplaza el input por el nuevo div con el nombre actualizado
                const nuevoNombreDiv = document.createElement('div');
                nuevoNombreDiv.className = 'sticker-nombre';
                nuevoNombreDiv.title = nuevoNombre;
                nuevoNombreDiv.textContent = nuevoNombre;
                input.replaceWith(nuevoNombreDiv);
            };

            input.addEventListener('blur', guardarCambio);
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') { event.preventDefault(); input.blur(); } 
                else if (event.key === 'Escape') { input.value = nombreActual; input.blur(); }
            });
            
            nombreDiv.replaceWith(input);
            input.focus();
            input.select();
        }
    });


const botonMover = document.createElement('button');
    botonMover.className = 'move-btn'; // Le damos una clase simple para el CSS
    botonMover.innerHTML = '⇄';
    botonMover.title = 'Mover a Biblioteca / Área de Trabajo';

    botonMover.onclick = (e) => {
        // Detenemos la propagación para que al hacer clic no se active el arrastre del sticker
        e.stopPropagation(); 
        
        // Usamos la variable 'idDato' que ya está definida en esta función
        moverDatoEntreVistas(idDato); 
    };

    // Añadimos el botón al sticker
    sticker.appendChild(botonMover);





    sticker.querySelector('.sticker-edit-btn').onclick = (e) => {
        e.stopPropagation();
        abrirModoEdicion(idDato);
    };

    hacerStickerArrastrable(sticker);
    return sticker;
}


function renderizarCapaVisual() {
    const almacen = document.getElementById('listapersonajes');
    const escaparate = document.getElementById('lienzo-visual');
    if (!almacen || !escaparate) return;
    escaparate.innerHTML = '';
    const datosPesados = almacen.querySelectorAll('.personaje');
    datosPesados.forEach(datoPesado => {
        const sticker = crearStickerParaDato(datoPesado);
        if (sticker) escaparate.appendChild(sticker);
    });
}


/**
 * --- FUNCIÓN CORREGIDA ---
 * Cierra el modo de edición y actualiza las posiciones si el nombre cambió.
 */
function cerrarModoEdicion() {
    const backgroundOverlay = document.querySelector('.modal-background-overlay');
    if (backgroundOverlay) {
        backgroundOverlay.remove();
    }

    const datoEnEdicion = document.querySelector('.personaje.editing-in-modal');
    if (datoEnEdicion) {
        const idDato = datoEnEdicion.dataset.id;
        const editorUI = datoEnEdicion.querySelector('.personaje-edit-overlay');
        
        // --- INICIO DE LA CORRECCIÓN ---
        const nombreAntiguo = datoEnEdicion._nombreOriginalParaEdicion;
        const nombreNuevo = datoEnEdicion.querySelector('.nombreh').value;

        if (nombreAntiguo && nombreNuevo && nombreAntiguo !== nombreNuevo) {
            const indicePosicion = posicionesDatos.findIndex(p => p.id === nombreAntiguo);
            if (indicePosicion > -1) {
                posicionesDatos[indicePosicion].id = nombreNuevo;
                console.log(`Posición del lienzo actualizada (desde modal) de '${nombreAntiguo}' a '${nombreNuevo}'.`);
            }
        }
        delete datoEnEdicion._nombreOriginalParaEdicion; // Limpia la propiedad temporal
        // --- FIN DE LA CORRECCIÓN ---

        guardarCambiosDesdeModal(idDato, editorUI);
        
        datoEnEdicion.classList.remove('editing-in-modal');
        
        if (datoEnEdicion._originalLocation) {
            const loc = datoEnEdicion._originalLocation;
            loc.parent.insertBefore(datoEnEdicion, loc.nextSibling);
            delete datoEnEdicion._originalLocation;
        }
    }
}

/**
 * --- FUNCIÓN CORREGIDA ---
 * Abre el modo de edición y guarda el nombre original del dato.
 */
function abrirModoEdicion(idDato) {
    if (document.querySelector('.editing-in-modal')) return;

    const datoPesado = document.querySelector(`#listapersonajes .personaje[data-id="${idDato}"]`);
    if (!datoPesado) {
        console.error(`¡FALLO! No se encontró .personaje con data-id="${idDato}".`);
        return;
    }

    // --- INICIO DE LA CORRECCIÓN ---
    // Guardamos el nombre actual ANTES de abrir el editor para poder compararlo al cerrar.
    datoPesado._nombreOriginalParaEdicion = datoPesado.querySelector('.nombreh').value;
    // --- FIN DE LA CORRECCIÓN ---
 const imagenDeEdicion = datoPesado.querySelector('.edit-preview-image');
    const fuenteOriginal = datoPesado.dataset.fullImageSrc;
    
    if (imagenDeEdicion && fuenteOriginal) {
        // Al reasignar el 'src', obligamos al navegador a re-renderizar la imagen.
        imagenDeEdicion.src = fuenteOriginal;
        imagenDeEdicion.style.display = 'block';
    }
    datoPesado._originalLocation = {
        parent: datoPesado.parentNode,
        nextSibling: datoPesado.nextSibling
    };

    const backgroundOverlay = document.createElement('div');
    backgroundOverlay.className = 'modal-background-overlay';
    document.body.appendChild(backgroundOverlay);
    backgroundOverlay.onclick = cerrarModoEdicion;

    document.body.appendChild(datoPesado);
    datoPesado.classList.add('editing-in-modal');
}


function guardarCambiosDesdeModal(idDato, editorUI) {
    const datoPesadoOriginal = document.querySelector(`.personaje[data-id="${idDato}"]`);
    const sticker = document.querySelector(`#lienzo-visual .personaje-sticker[data-id="${idDato}"]`);

    if (!datoPesadoOriginal || !sticker || !editorUI) {
        return;
    }

    const nuevoNombre = datoPesadoOriginal.querySelector('.nombreh').value;
    const stickerNombre = sticker.querySelector('.sticker-nombre');
    stickerNombre.textContent = nuevoNombre;
    stickerNombre.title = nuevoNombre;

    const nuevaImgSrc = editorUI.querySelector('.edit-preview-image').src;
    const stickerImg = sticker.querySelector('.sticker-img');
    stickerImg.src = nuevaImgSrc;
    stickerImg.style.display = (nuevaImgSrc && !nuevaImgSrc.endsWith('/')) ? 'block' : 'none';

    const visualImg = datoPesadoOriginal.querySelector('.personaje-visual img');
    if(visualImg) {
        visualImg.src = nuevaImgSrc;
        visualImg.classList.toggle('hidden', !nuevaImgSrc || !nuevaImgSrc.endsWith('/'));
    }
    
    const descPreview = datoPesadoOriginal.querySelector('.personaje-descripcion-preview');
    const descTextarea = editorUI.querySelector('.descripcionh');
    if(descPreview && descTextarea) {
        descPreview.textContent = descTextarea.value;
    }
}