/**
 * --- VERSIÓN CORREGIDA ---
 * Crea y añade un nuevo elemento de "Dato" al DOM, incluyendo todos los controles,
 * la funcionalidad completa de los botones y el guardado del embedding.
 * @param {object} personajeData - El objeto con los datos del personaje/dato.
 * @returns {HTMLElement|null} El elemento del DOM creado o null si falla.
 */
function agregarPersonajeDesdeDatos(personajeData = {}) {
    // --- Desestructuración de datos de entrada ---
    const {
        id: idPersistenteExistente = null,
        nombre = '',
        descripcion = '',
        promptVisual = '',
        imagen = '',
        etiqueta: etiquetaValor = 'indeterminado',
        arco: arcoValor = 'sin_arco',
        svgContent = '',
        embedding = [],
        
        carpetaId = null
    } = personajeData;

    // --- LÍNEA FALTANTE AÑADIDA ---
    // Si viene un ID del archivo guardado, lo usamos. Si no (es un dato nuevo), creamos uno.
    const idPersistente = idPersistenteExistente || `dato-id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const lista = document.getElementById('listapersonajes');
    if (!lista) {
        console.error("Error crítico: No se encontró '#listapersonajes'.");
        return null;
    }

    // --- 1. Creación del Contenedor Principal ('dato pesado') ---
    const contenedor = document.createElement('div');
    contenedor.className = 'personaje';
    // --- AHORA ESTA LÍNEA FUNCIONARÁ CORRECTAMENTE ---
    contenedor.dataset.id = idPersistente; 

    contenedor.dataset.embedding = JSON.stringify(embedding);
    contenedor.dataset.descripcion = descripcion;
    if (svgContent) {
        contenedor.dataset.svgContent = svgContent;
    }
    if (imagen) {
        contenedor.dataset.fullImageSrc = imagen;
    }
    if (carpetaId) { // <-- LÍNEA AÑADIDA
        contenedor.dataset.carpetaId = carpetaId; // <-- LÍNEA AÑADIDA
    }
    // ... el resto de la función permanece exactamente igual ...
    // (No es necesario pegar todo el código restante ya que no cambia,
    // solo asegúrate de que la línea que añadimos esté en su sitio).

    // --- 2. Creación de la parte VISIBLE (cuando no se edita) ---
    const visual = document.createElement('div');
    visual.className = 'personaje-visual';
    const img = document.createElement('img');
    const descripcionPreview = document.createElement('div');
    descripcionPreview.className = 'personaje-descripcion-preview';
    descripcionPreview.textContent = descripcion;
    visual.appendChild(img);
    visual.appendChild(descripcionPreview);

    // --- 3. Creación del PANEL DE EDICIÓN (el que estaba fallando) ---
    const overlay = document.createElement('div');
    overlay.className = 'personaje-edit-overlay';

    const editControls = document.createElement('div');
    editControls.className = 'edit-controls';

    const previewContainer = document.createElement('div');
    previewContainer.className = 'edit-preview-container';
    const previewImage = document.createElement('img');
    previewImage.className = 'edit-preview-image';
    const svgPreviewContainer = document.createElement('div');
    svgPreviewContainer.className = 'edit-svg-preview';
    svgPreviewContainer.style.display = 'none';
    const editorCanvas3D = document.createElement('canvas');
    editorCanvas3D.className = 'edit-3d-canvas';
    editorCanvas3D.style.display = 'none';
    const editorCanvasEl = document.createElement('canvas');
    editorCanvasEl.className = 'edit-svg-canvas';
    editorCanvasEl.style.display = 'none';
    previewContainer.appendChild(previewImage);
    previewContainer.appendChild(svgPreviewContainer);
    previewContainer.appendChild(editorCanvas3D);
    previewContainer.appendChild(editorCanvasEl);

    const textControlsContainer = document.createElement('div');
    textControlsContainer.className = 'edit-text-controls';
    const cajaTexto = document.createElement('textarea');
    cajaTexto.className = 'descripcionh';
    cajaTexto.value = descripcion;
    cajaTexto.placeholder = 'Descripción...';

    const cajaPromptVisual = document.createElement('textarea');
    cajaPromptVisual.className = 'prompt-visualh';
    cajaPromptVisual.value = promptVisual;
    cajaPromptVisual.placeholder = 'Prompt Visual...';
    if (typeof debouncedInputHandler === 'function') {
        cajaPromptVisual.addEventListener('input', debouncedInputHandler);
    }

    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.className = 'edit-buttons-wrapper';

    // --- 4. Funciones internas y botones del editor ---

    let fabricEditorCanvas = null;

    const actualizarVisual = async (nuevaImagenSrc, nuevaDescripcion) => {
        contenedor.dataset.fullImageSrc = nuevaImagenSrc || '';
        descripcionPreview.textContent = nuevaDescripcion;
        img.classList.toggle('hidden', !nuevaImagenSrc || nuevaImagenSrc.endsWith('/'));

        if (nuevaImagenSrc && nuevaImagenSrc.startsWith('data:image')) {
            try {
                // Asegurarse de que la función crearThumbnail existe
                if (typeof crearThumbnail === 'function') {
                    const thumbnailSrc = await crearThumbnail(nuevaImagenSrc, 450, 450);
                    img.src = thumbnailSrc;
                } else {
                    img.src = nuevaImagenSrc;
                }
            } catch (error) {
                console.error("Error al crear la miniatura", error);
                img.src = nuevaImagenSrc;
            }
        } else {
            img.src = nuevaImagenSrc || '';
        }

        if (previewImage) {
            const imagenCompletaSrc = contenedor.dataset.fullImageSrc;
            if (imagenCompletaSrc && !imagenCompletaSrc.endsWith('/')) {
                previewImage.src = imagenCompletaSrc;
                previewImage.style.display = 'block';
            } else {
                previewImage.style.display = 'none';
            }
        }
         const idDato = contenedor.dataset.id;
    if (idDato) {
        const stickerCorrespondiente = document.querySelector(`#lienzo-visual .personaje-sticker[data-id="${idDato}"]`);
        if (stickerCorrespondiente) {
            const imgDelSticker = stickerCorrespondiente.querySelector('.sticker-img');
            if (imgDelSticker) {
                // Leemos la URL directamente de la miniatura que acabamos de actualizar.
                const fuenteImagenActualizada = img.src; 
                
                imgDelSticker.src = fuenteImagenActualizada;
                imgDelSticker.style.display = (fuenteImagenActualizada && !fuenteImagenActualizada.endsWith('/')) ? 'block' : 'none';
            }
        }
    }
    };
      
    const generarVectorialNormal = async () => {
        const descripcionPrompt = cajaPromptVisual.value.trim();
        if (!descripcionPrompt) {
            alert("Por favor, escribe una descripción en el 'Prompt Visual' para que la IA pueda generar una imagen.");
            return;
        }
        if (typeof generarImagenDesdePrompt !== 'function') {
            alert("Error: La función de generación de imágenes no está disponible.");
            return;
        }
        botonAccionesImagen.innerHTML = '⚙️';
        botonAccionesImagen.disabled = true;
        try {
            const { imagen, svgContent: nuevoSvg } = await generarImagenDesdePrompt(descripcionPrompt);
            await actualizarVisual(imagen, cajaTexto.value);
            contenedor.dataset.svgContent = nuevoSvg;
        } catch (error) {
            alert(`Ocurrió un error al generar la imagen: ${error.message}`);
        } finally {
            botonAccionesImagen.innerHTML = '✨';
            botonAccionesImagen.disabled = false;
        }
    };

    const generarVectorialPro = async () => {
        const userPrompt = cajaPromptVisual.value.trim();
        if (!userPrompt) {
            alert("Por favor, escribe una descripción detallada en el 'Prompt Visual' para generar la imagen superrealista.");
            return;
        }
        if (typeof generarModelo3DDesdePrompt !== 'function') {
            alert("Error: La función 'generarModelo3DDesdePrompt' no está disponible.");
            return;
        }
        botonAccionesImagen.innerHTML = '⚙️';
        botonAccionesImagen.disabled = true;

        try {
            const modeloJsonString = await generarModelo3DDesdePrompt(userPrompt);
            cajaPromptVisual.value = modeloJsonString;
            const inputEvent = new Event('input', { bubbles: true });
            cajaPromptVisual.dispatchEvent(inputEvent);
            delete contenedor.dataset.svgContent;
        } catch (error) {
            console.error("Error al generar el modelo 3D:", error);
            alert(`Ocurrió un error al generar el modelo 3D: ${error.message}`);
        } finally {
            botonAccionesImagen.innerHTML = '✨';
            botonAccionesImagen.disabled = false;
            if(typeof renderizarPreviewsInicialesDeDatos === 'function') renderizarPreviewsInicialesDeDatos();
        }
    };

    const editarModelo3D = async () => {
        const promptVisualText = cajaPromptVisual.value.trim();
        let modeloActualJson;

        try {
            modeloActualJson = JSON.parse(promptVisualText);
            if (!modeloActualJson || !Array.isArray(modeloActualJson.objects)) {
                alert("El 'Prompt Visual' no contiene un modelo 3D válido para editar.");
                return;
            }
        } catch (e) {
            alert("El 'Prompt Visual' no contiene un modelo 3D válido para editar.");
            return;
        }

        const instruccionEdicion = prompt("¿Cómo quieres modificar el modelo 3D?\n(Ej: 'cambia el color del cuerpo a azul', 'añade un sombrero negro', 'haz la nariz más grande')");

        if (!instruccionEdicion || instruccionEdicion.trim() === '') {
            return;
        }

        if (typeof editarModelo3DDesdePrompt !== 'function') {
            alert("Error: La función 'editarModelo3DDesdePrompt' no está disponible.");
            return;
        }

        botonAccionesImagen.innerHTML = '⚙️';
        botonAccionesImagen.disabled = true;

        try {
            const modeloEditadoJsonString = await editarModelo3DDesdePrompt(promptVisualText, instruccionEdicion);
            cajaPromptVisual.value = modeloEditadoJsonString;
            const inputEvent = new Event('input', { bubbles: true });
            cajaPromptVisual.dispatchEvent(inputEvent);
        } catch (error) {
            console.error("Error al editar el modelo 3D:", error);
            alert(`Ocurrió un error al editar el modelo 3D: ${error.message}`);
        } finally {
            botonAccionesImagen.innerHTML = '✨';
            botonAccionesImagen.disabled = false;
            if(typeof renderizarPreviewsInicialesDeDatos === 'function') renderizarPreviewsInicialesDeDatos();
        }
    };

    const generarVectorialRapida = async () => {
        const userPrompt = cajaPromptVisual.value.trim();
        if (!userPrompt) {
            alert("Por favor, escribe una descripción detallada en el 'Prompt Visual' para generar la imagen.");
            return;
        }
        if (typeof ultras2 !== 'function') {
            alert("Error: La función 'ultras2' no está disponible.");
            return;
        }
        botonAccionesImagen.innerHTML = '⚙️';
        botonAccionesImagen.disabled = true;
        try {
            const resultado = await ultras2(userPrompt);
            actualizarVisual(resultado.imagen, userPrompt);
            contenedor.dataset.svgContent = resultado.svgContent;
        } catch (error) {
            console.error("Error al generar la imagen rapido:", error);
            alert(`Ocurrió un error: ${error.message}`);
        } finally {
            botonAccionesImagen.innerHTML = '✨';
            botonAccionesImagen.disabled = false;
        }
    };

    const generarRealista = async () => {
        const userPrompt = cajaPromptVisual.value.trim();
        if (!userPrompt) {
            alert("Por favor, escribe una descripción detallada en el 'Prompt Visual' para la generación HIPER-ULTRA.");
            return;
        }
        if (typeof ultras !== 'function') {
            alert("Error: La función 'ultras' no está disponible.");
            return;
        }
        botonAccionesImagen.innerHTML = '⚙️';
        botonAccionesImagen.disabled = true;
        try {
            const resultado = await ultras(userPrompt);
            if (resultado && resultado.imagen) {
                actualizarVisual(resultado.imagen, cajaTexto.value);
                delete contenedor.dataset.svgContent;
            } else if (resultado && resultado.error) {
                throw new Error(resultado.error);
            }
        } catch (error) {
            console.error("Error en la generación HIPER-ULTRA:", error);
            alert(`Ocurrió un error en la generación HIPER-ULTRA: ${error.message}`);
        } finally {
            botonAccionesImagen.innerHTML = '✨';
            botonAccionesImagen.disabled = false;
        }
    };

    const mejorarSVG = () => {
        if(typeof mostrarModalMejora === 'function') mostrarModalMejora(contenedor);
    };

    const editarSVG = () => {
        const svgActual = contenedor.dataset.svgContent;
        if (!svgActual) {
            alert("No hay un SVG para editar. Genera una imagen primero.");
            return;
        }
        if (typeof fabric === 'undefined') {
            alert("La biblioteca de edición (Fabric.js) no está disponible.");
            return;
        }
        previewImage.style.display = 'none';
        editorCanvasEl.style.display = 'block';
        botonAccionesImagen.style.display = 'none';
        botonGuardarSVG.style.display = 'inline-block';

        const canvasWidth = previewContainer.clientWidth;
        const canvasHeight = previewContainer.clientHeight;

        fabricEditorCanvas = new fabric.Canvas(editorCanvasEl, {
            width: canvasWidth,
            height: canvasHeight,
        });

        fabric.loadSVGFromString(svgActual, (objects, options) => {
            const group = fabric.util.groupSVGElements(objects, options);
            group.scaleToWidth(canvasWidth * 0.95);
            group.set({
                left: canvasWidth / 2,
                top: canvasHeight - group.getScaledHeight() - 5
            });
            group.setCoords();
            fabricEditorCanvas.add(group);
            fabricEditorCanvas.renderAll();
        });
    };

    const botonCargar = document.createElement('button');
    botonCargar.className = 'edit-btn change-image-btn';
    botonCargar.innerHTML = '📷';
    botonCargar.title = 'Cambiar Imagen';

    const botonGaleria = document.createElement('button');
    botonGaleria.className = 'edit-btn select-gallery-btn';
    botonGaleria.innerHTML = '🖼️';
    botonGaleria.title = 'Seleccionar de la Galería';
    botonGaleria.onclick = () => {
        if(typeof abrirModalGaleria === 'function') abrirModalGaleria(contenedor);
    };

    const botonAccionesImagen = document.createElement('button');
    botonAccionesImagen.className = 'edit-btn';
    botonAccionesImagen.innerHTML = '✨';
    botonAccionesImagen.title = 'Generar o Editar Imagen';

    botonAccionesImagen.onclick = () => {
        const menuExistente = document.querySelector('.menu-acciones-imagen');
        if (menuExistente) menuExistente.remove();

        const menu = document.createElement('div');
        menu.className = 'menu-etiquetas';

        const opcionesMenu = [
            { texto: 'Vectorial Rápida', emoji: '⚡', action: generarVectorialRapida },
            { texto: 'Vectorial Normal', emoji: '✨', action: generarVectorialNormal },
            { texto: 'Modelo 3D', emoji: '💎', action: generarVectorialPro },
            { texto: 'Editar Modelo 3D', emoji: '🔧', action: editarModelo3D },
            { texto: 'Realista', emoji: '😍', action: generarRealista },
            { texto: 'Mejorar SVG', emoji: '📈', action: mejorarSVG },
            { texto: 'Editar SVG', emoji: '✏️', action: editarSVG }
        ];

        opcionesMenu.forEach(op => {
            const item = document.createElement('div');
            item.className = 'item-menu-etiqueta';
            item.innerHTML = `${op.emoji} ${op.texto}`;
            item.onclick = (e) => {
                e.stopPropagation();
                op.action();
                menu.remove();
            };
            menu.appendChild(item);
        });

        document.body.appendChild(menu);
        const rect = botonAccionesImagen.getBoundingClientRect();
        menu.style.bottom = '50%';
        menu.style.transform = 'translateY(50%)';
        menu.style.left = `${rect.left + window.scrollX}px`;

        const cerrarMenuHandler = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', cerrarMenuHandler, true);
            }
        };
        setTimeout(() => document.addEventListener('click', cerrarMenuHandler, true), 100);
    };







    const botonGuardarSVG = document.createElement('button');
    botonGuardarSVG.className = 'edit-btn save-svg-btn';
    botonGuardarSVG.innerHTML = '💾';
    botonGuardarSVG.title = 'Guardar Cambios del SVG';
    botonGuardarSVG.style.display = 'none';

    const botonEliminar = document.createElement('button');
    botonEliminar.className = 'edit-btn delete-btn';
    botonEliminar.innerHTML = '❌';
    botonEliminar.title = 'Eliminar Dato';

    botonGuardarSVG.onclick = async () => {
        if (!fabricEditorCanvas) return;
        const options = {
            suppressPreamble: true,
            viewBox: {
                x: 0,
                y: 0,
                width: fabricEditorCanvas.width,
                height: fabricEditorCanvas.height
            }
        };
        const nuevoSvgContent = fabricEditorCanvas.toSVG(options);
        contenedor.dataset.svgContent = nuevoSvgContent;
        await actualizarVisual(fabricEditorCanvas.toDataURL({ format: 'png' }), cajaTexto.value);
        fabricEditorCanvas.dispose();
        fabricEditorCanvas = null;
        editorCanvasEl.style.display = 'none';
        previewImage.style.display = 'block';
        botonGuardarSVG.style.display = 'none';
        botonAccionesImagen.style.display = 'inline-block';
    };

    botonEliminar.onclick = () => {
        if (confirm('¿Estás seguro de que quieres eliminar este dato?')) {
            const stickerAEliminar = document.querySelector(`#lienzo-visual .personaje-sticker[data-id="${idPersistente}"]`);
            if(stickerAEliminar) stickerAEliminar.remove();
            contenedor.remove();
            if(typeof actualizarVistaDatos === 'function') actualizarVistaDatos();
        }
    };

    cajaTexto.addEventListener('input', () => {
        descripcionPreview.textContent = cajaTexto.value;
        contenedor.dataset.descripcion = cajaTexto.value;
    });

    botonCargar.onclick = () => {
        const inputFile = document.createElement('input');
        inputFile.type = 'file';
        inputFile.accept = 'image/*, video/mp4, video/webm, image/gif';
        inputFile.onchange = async (event) => {
            if (event.target.files && event.target.files[0]) {
                const nuevaImagen = await fileToBase64(event.target.files[0]);
                await actualizarVisual(nuevaImagen, cajaTexto.value);
                delete contenedor.dataset.svgContent;
            }
        };
        inputFile.click();
    };

    // --- 5. Ensamblaje Final de la Estructura ---
    buttonsWrapper.appendChild(botonCargar);
    buttonsWrapper.appendChild(botonGaleria);
    buttonsWrapper.appendChild(botonAccionesImagen);
    buttonsWrapper.appendChild(botonGuardarSVG);
    buttonsWrapper.appendChild(botonEliminar);

    textControlsContainer.appendChild(cajaTexto);
    textControlsContainer.appendChild(cajaPromptVisual);
    textControlsContainer.appendChild(buttonsWrapper);

    editControls.appendChild(previewContainer);
    editControls.appendChild(textControlsContainer);
    overlay.appendChild(editControls);

    contenedor.appendChild(visual);
    // ¡ESTA ES LA LÍNEA MÁS IMPORTANTE!
    // Aquí nos aseguramos de que el panel de edición se añade al contenedor principal.
    contenedor.appendChild(overlay); 

    const cajaNombre = document.createElement('input');
    cajaNombre.type = 'text';
    cajaNombre.className = 'nombreh';
    cajaNombre.value = nombre;
    contenedor.appendChild(cajaNombre);
    
    // Configuración de los botones de etiqueta y arco
    const etiquetaBtn = document.createElement('button');
    etiquetaBtn.className = 'change-tag-btn';
    const opEtiqueta = (window.opcionesEtiqueta || []).find(op => op.valor === etiquetaValor) || {emoji: '?', titulo: 'Desconocido'};
    etiquetaBtn.innerHTML = opEtiqueta.emoji;
    etiquetaBtn.title = `Etiqueta: ${opEtiqueta.titulo}`;
    etiquetaBtn.dataset.etiqueta = etiquetaValor;
    etiquetaBtn.onclick = () => {
        if(typeof mostrarMenuEtiquetas === 'function') mostrarMenuEtiquetas(etiquetaBtn);
    };
    contenedor.appendChild(etiquetaBtn);

    const arcoBtn = document.createElement('button');
    arcoBtn.className = 'change-arc-btn';
    arcoBtn.dataset.arco = arcoValor;
    const opArco = (window.opcionesArco || []).find(op => op.valor === arcoValor);
    if (opArco) {
        arcoBtn.innerHTML = opArco.emoji;
        arcoBtn.title = `Arco: ${opArco.titulo}`;
    } else {
        arcoBtn.innerHTML = arcoValor;
        arcoBtn.title = `Arco: ${arcoValor}`;
    }
    arcoBtn.onclick = () => {
        if(typeof mostrarMenuArcos === 'function') mostrarMenuArcos(arcoBtn);
    };
    contenedor.appendChild(arcoBtn);



 




    // --- 6. Añadir al DOM y Crear Sticker ---
    lista.appendChild(contenedor);

    if (svgContent && !imagen) {
        if (typeof fabric !== 'undefined') {
            const tempCanvasEl = document.createElement('canvas');
            const tempCanvasWidth = 750;
            const tempCanvasHeight = 750;
            const tempFabricCanvas = new fabric.Canvas(tempCanvasEl, { width: tempCanvasWidth, height: tempCanvasHeight });

            fabric.loadSVGFromString(svgContent, (objects, options) => {
                if (!objects || objects.length === 0) {
                    tempFabricCanvas.dispose();
                    return;
                }
                const group = fabric.util.groupSVGElements(objects, options);
                group.scaleToWidth(tempCanvasWidth * 0.9);
                group.scaleToHeight(tempCanvasHeight * 0.9);
                group.center();
                tempFabricCanvas.add(group).renderAll();
                actualizarVisual(tempFabricCanvas.toDataURL({ format: 'png' }), descripcion);
                tempFabricCanvas.dispose();
            });
        } else {
            actualizarVisual('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgContent), descripcion);
        }
    } else {
        actualizarVisual(imagen, descripcion);
    }
    
  const escaparate = document.getElementById('lienzo-visual');
    if (escaparate && typeof crearStickerParaDato === 'function') {
        const nuevoSticker = crearStickerParaDato(contenedor);
        if (nuevoSticker) {
            escaparate.appendChild(nuevoSticker);
            
            // La lógica de posicionamiento ya está en crearStickerParaDato, que ahora funcionará
            // porque el ID persistente permitirá encontrar la posición guardada.
            
            // Si es un dato totalmente nuevo (sin posición guardada), lo centramos.
             const posicionExistente = posicionesDatos.find(p => p.id === idPersistente);
          if (!posicionExistente) {
                const viewport = document.getElementById('personajes');
                if (viewport) {
                    const UMBRAL_MOVIMIENTO_CAMARA = 0.20; // 20% de margen desde el borde. ¡Puedes ajustar este valor!

                    // 1. Calcular la posición central ideal en el lienzo
                    const currentPanX = panX || 0;
                    const currentPanY = panY || 0;
                    const currentEscala = escalaLienzo || 1;
                    const centroLienzoX = (viewport.clientWidth / 2 - currentPanX) / currentEscala;
                    const centroLienzoY = (viewport.clientHeight / 2 - currentPanY) / currentEscala;
                    const initialX = centroLienzoX - (ANCHO_ELEMENTO / 2);
                    const initialY = centroLienzoY - (ALTO_ELEMENTO / 2);

                    // 2. Encontrar la posición libre más cercana
                    const finalPosition = findNearestFreePosition(initialX, initialY);
                    
                    // 3. Aplicar la posición final encontrada
                    nuevoSticker.style.left = `${finalPosition.x}px`;
                    nuevoSticker.style.top = `${finalPosition.y}px`;
                    
                    // 4. Guardar la posición
                    if(typeof guardarPosicionDato === 'function') {
                        guardarPosicionDato(idPersistente, finalPosition.x, finalPosition.y);
                    }

                    // 5. Mover la cámara SOLO SI el nuevo dato cae fuera de la "zona de confort"
                    if(typeof isPositionComfortablyInView === 'function' && !isPositionComfortablyInView(finalPosition.x, finalPosition.y, UMBRAL_MOVIMIENTO_CAMARA)) {
                        if(typeof panToPosition === 'function') {
                            panToPosition(finalPosition.x, finalPosition.y);
                        }
                    }
                }
            }
        }
    }
    
    return contenedor;
}