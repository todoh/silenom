// =========================================================================
// INICIO: FUNCIONES PARA CODIFICAR/DECODIFICAR (CON ANCHO DINÁMICO)
// =========================================================================

/**
 * SOLUCIÓN FINAL v8: Crea una imagen de ancho dinámico (múltiples tarjetas)
 * para guardar cualquier cantidad de datos.
 * @param {object} jsonData El objeto JSON a codificar.
 * @param {Array} dataListForText Un array de los objetos de datos para generar la lista de texto.
 * @returns {Promise<string>} Una promesa que se resuelve con la URL de datos de la imagen PNG.
 */
function jsonToPng(jsonData, dataListForText) {
    return new Promise((resolve, reject) => {
        try {
            // --- INICIO: LÓGICA DE CÁLCULO DE ANCHO DINÁMICO ---
            const SEGMENT_WIDTH = 1280;
            const IMG_HEIGHT = 2920;
            const DATA_AREA_HEIGHT = 1280;

            const jsonString = JSON.stringify(jsonData);
            const compressedBytes = pako.deflate(jsonString);

            const dataLength = compressedBytes.length;
            const lengthBytes = new Uint8Array(4);
            lengthBytes[0] = (dataLength >> 24) & 0xFF;
            lengthBytes[1] = (dataLength >> 16) & 0xFF;
            lengthBytes[2] = (dataLength >> 8) & 0xFF;
            lengthBytes[3] = dataLength & 0xFF;
            
            const bytesToWrite = new Uint8Array(4 + dataLength);
            bytesToWrite.set(lengthBytes, 0);
            bytesToWrite.set(compressedBytes, 4);

            // Calcular cuántos segmentos de 1280px de ancho se necesitan.
            const bytesPerDataSegment = SEGMENT_WIDTH * DATA_AREA_HEIGHT * 3;
            const numSegments = Math.ceil(bytesToWrite.length / bytesPerDataSegment);
            
            const finalWidth = SEGMENT_WIDTH * numSegments;
            // --- FIN: LÓGICA DE CÁLCULO DE ANCHO DINÁMICO ---

            const canvas = document.createElement('canvas');
            canvas.width = finalWidth;
            canvas.height = IMG_HEIGHT;
            const ctx = canvas.getContext('2d');
            
            // 1. DIBUJAR LA PARTE SUPERIOR (DATOS CODIFICADOS)
            const dataImageData = ctx.createImageData(finalWidth, DATA_AREA_HEIGHT);
            const dataPixelData = dataImageData.data;
            let byteIndex = 0;
            for (let i = 0; i < dataPixelData.length && byteIndex < bytesToWrite.length; i += 4) {
                if (byteIndex < bytesToWrite.length) dataPixelData[i] = bytesToWrite[byteIndex++];
                if (byteIndex < bytesToWrite.length) dataPixelData[i + 1] = bytesToWrite[byteIndex++];
                if (byteIndex < bytesToWrite.length) dataPixelData[i + 2] = bytesToWrite[byteIndex++];
                dataPixelData[i + 3] = 255; 
            }
            for (let i = (Math.ceil(bytesToWrite.length / 3) * 4); i < dataPixelData.length; i += 4) {
                dataPixelData[i] = 26; dataPixelData[i + 1] = 26; dataPixelData[i + 2] = 26; dataPixelData[i + 3] = 255;
            }
            ctx.putImageData(dataImageData, 0, 0);


            // 2. DIBUJAR LA PARTE INFERIOR (PIE DE PÁGINA VISUAL)
            const footerY = DATA_AREA_HEIGHT;
            const footerHeight = IMG_HEIGHT - footerY;
            const padding = 40;

            ctx.fillStyle = '#ECEFF1';
            ctx.fillRect(0, footerY, finalWidth, footerHeight);
            
            const imagePromises = dataListForText.map(item => {
                return new Promise(res => {
                    if (!item.imagen || item.imagen.startsWith('https://placehold.co')) {
                        res({ success: false, item: item });
                        return;
                    }
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.onload = () => res({ success: true, img: img, item: item });
                    img.onerror = () => res({ success: false, item: item });
                    img.src = item.imagen;
                });
            });

            Promise.all(imagePromises).then(results => {
                ctx.fillStyle = '#263238';
                ctx.font = '18px Arial';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';

                let currentX = padding;
                let currentY = footerY + padding;
                const itemHeight = 60;
                const rowHeight = itemHeight + 30;
                const itemSpacing = 15;
                const textImageSpacing = 10;

                for (const result of results) {
                    const itemName = (result.item.nombre || 'Sin Nombre');
                    const textMetrics = ctx.measureText(itemName + ", ");
                    let itemWidth = textMetrics.width + itemSpacing;
                    let tagWidth = textMetrics.width;

                    if (result.success) {
                        itemWidth += itemHeight + textImageSpacing;
                        tagWidth += itemHeight + textImageSpacing;
                    }

                    if (currentX + itemWidth > finalWidth - padding) {
                        currentX = padding;
                        currentY += rowHeight;
                    }
                    
                    if (currentY + itemHeight > IMG_HEIGHT - padding) {
                        break;
                    }
                    
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.fillRect(currentX, currentY, tagWidth + itemSpacing, itemHeight);

                    ctx.fillStyle = '#263238';

                    if (result.success) {
                        ctx.drawImage(result.img, currentX, currentY, itemHeight, itemHeight);
                        currentX += itemHeight + textImageSpacing;
                    }

                    ctx.fillText(itemName + ", ", currentX, currentY + itemHeight / 2);
                    currentX += textMetrics.width + itemSpacing;
                }
                resolve(canvas.toDataURL('image/png'));
            });
        } catch (error) {
            console.error("Error al codificar JSON a PNG:", error);
            reject("No se pudo generar la imagen de datos.");
        }
    });
}


/**
 * Decodifica y descomprime los datos de una imagen, sin importar su ancho.
 */
function pngToJson(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, img.width, img.height);
                const pixelData = imageData.data;
                let pixelChannelIndex = 0;
                const lengthBytes = new Uint8Array(4);
                let bytesRead = 0;
                while (bytesRead < 4 && pixelChannelIndex < pixelData.length) {
                    if ((pixelChannelIndex + 1) % 4 !== 0) {
                        lengthBytes[bytesRead] = pixelData[pixelChannelIndex];
                        bytesRead++;
                    }
                    pixelChannelIndex++;
                }
                const dataLength = (lengthBytes[0] << 24) | (lengthBytes[1] << 16) | (lengthBytes[2] << 8) | lengthBytes[3];
                const maxPossibleBytes = (pixelData.length / 4) * 3;
                if (dataLength <= 0 || dataLength > maxPossibleBytes) {
                    throw new Error(`Longitud de datos inválida: ${dataLength}`);
                }
                const compressedBytes = new Uint8Array(dataLength);
                bytesRead = 0;
                while (bytesRead < dataLength && pixelChannelIndex < pixelData.length) {
                     if ((pixelChannelIndex + 1) % 4 !== 0) {
                        compressedBytes[bytesRead] = pixelData[pixelChannelIndex];
                        bytesRead++;
                    }
                    pixelChannelIndex++;
                }
                if (bytesRead < dataLength) {
                    throw new Error("No se pudieron leer todos los datos de la imagen. El archivo podría estar truncado.");
                }
                const jsonString = pako.inflate(compressedBytes, { to: 'string' });
                const jsonData = JSON.parse(jsonString);
                resolve(jsonData);
            } catch (error) {
                console.error("Error detallado al decodificar la imagen:", error);
                reject("No se pudo decodificar la imagen. El archivo podría estar dañado o no es un archivo de datos válido.");
            }
        };
        img.onerror = () => reject("No se pudo cargar el archivo de imagen.");
        img.src = dataUrl;
    });
}

// =========================================================================
// El resto del archivo no necesita cambios
// =========================================================================

const botonImportarVisible = document.getElementById('importar-datos-btn');
const inputImportadorOculto = document.getElementById('importador-json-oculto');

botonImportarVisible.addEventListener('click', () => {
    inputImportadorOculto.setAttribute('accept', 'image/png');
    inputImportadorOculto.click();
});

inputImportadorOculto.addEventListener('change', (evento) => {
    const archivo = evento.target.files[0];
    if (!archivo) return;

    if (archivo.type !== 'image/png') {
        alert("Error: Por favor, selecciona un archivo de datos PNG válido.");
        inputImportadorOculto.value = '';
        return;
    }
    const lector = new FileReader();
    lector.onload = async (e) => {
        try {
            const datos = await pngToJson(e.target.result);
            if (!Array.isArray(datos)) {
                alert("Error: Los datos decodificados no son un array válido.");
                return;
            }
            datos.forEach(dato => agregarPersonajeDesdeDatos(dato));
            reinicializarFiltrosYActualizarVista();
            alert(`¡Éxito! Se importaron ${datos.length} datos desde la imagen.`);
        } catch (error) {
            alert(`Error: ${error}`);
            console.error("Fallo al importar desde PNG:", error);
        } finally {
            inputImportadorOculto.value = '';
        }
    };
    lector.readAsDataURL(archivo);
});


function modalExportarDatos() {
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'export-modal-overlay';

    modalOverlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 1000000;
    `;
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background-color: #fff; padding: 25px; border-radius: 10px; width: 90%; max-width: 600px; height: 80%; max-height: 700px;
        display: flex; flex-direction: column; box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    `;
    const modalTitle = document.createElement('h1');
    modalTitle.textContent = 'Exportar Datos a Imagen (PNG)';
    modalTitle.style.cssText = 'margin-top: 0; color: #333;';
    const closeButton = document.createElement('span');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
        position: absolute; top: 15px; right: 20px; font-size: 30px; font-weight: bold; cursor: pointer; color: #000000ff;
    `;
    closeButton.onclick = () => document.body.removeChild(modalOverlay);
    const listContainer = document.createElement('div');
    listContainer.style.cssText = `
        flex-grow: 1; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px; padding: 10px; margin-top: 15px;
    `;
    const listapersonajesNodes = document.getElementById("listapersonajes").children;
    const personajes = Array.from(listapersonajesNodes).map(personajeNode => {
        const nombre = personajeNode.querySelector("input.nombreh")?.value || "";
        const descripcion = personajeNode.querySelector("textarea.descripcionh")?.value || "";
        const promptVisual = personajeNode.querySelector("textarea.prompt-visualh")?.value || "";
        const imagenSrc = personajeNode.querySelector("img")?.src || "";
        const svgContent = personajeNode.dataset.svgContent || "";
        const etiqueta = personajeNode.querySelector(".change-tag-btn")?.dataset.etiqueta || 'indeterminado';
        const arco = personajeNode.querySelector(".change-arc-btn")?.dataset.arco || 'sin_arco';
        let embedding = [];
        try {
            const embeddingData = personajeNode.dataset.embedding;
            if (embeddingData) embedding = JSON.parse(embeddingData);
        } catch (e) { console.warn(`No se pudo parsear el embedding para "${nombre}".`); }
        
        let is3DModel = false;
        if (promptVisual) {
            try {
                const data = JSON.parse(promptVisual);
                if (data && typeof data === 'object' && Array.isArray(data.objects)) {
                    is3DModel = true;
                }
            } catch (error) {}
        }
        if (!nombre && !descripcion && !imagenSrc && !promptVisual) return null;
        return { nombre, descripcion, promptVisual, imagen: imagenSrc, svgContent, etiqueta, arco, embedding, is3DModel };
    }).filter(Boolean);

    if (personajes.length === 0) {
        listContainer.textContent = 'No se encontraron datos de personajes para exportar.';
    } else {
        personajes.forEach((personaje, index) => {
            const item = document.createElement('div');
            item.style.cssText = `display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #eee;`;
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'personaje-checkbox';
            checkbox.dataset.personajeIndex = index;
            checkbox.style.cssText = 'margin-right: 15px; transform: scale(1.2);';
            const img = document.createElement('img');
            img.src = personaje.imagen || 'https://placehold.co/50x50/eee/ccc?text=?';
            img.style.cssText = 'width: 50px; height: 50px; border-radius: 5px; object-fit: cover; margin-right: 15px;';
            img.onerror = () => { img.src = 'https://placehold.co/50x50/eee/ccc?text=?'; };
            const name = document.createElement('span');
            name.textContent = personaje.nombre || 'Sin nombre';
            name.style.fontWeight = 'bold';
            item.appendChild(checkbox);
            item.appendChild(img);
            item.appendChild(name);
            listContainer.appendChild(item);
        });
    }
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'margin-top: 20px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;';
    const selectionButtons = document.createElement('div');
    selectionButtons.style.cssText = 'display: flex; gap: 10px;';
    const selectAllButton = document.createElement('button');
    selectAllButton.textContent = 'Seleccionar Todo';
    selectAllButton.style.cssText = 'padding: 10px 15px; border: 1px solid #ccc; border-radius: 5px; cursor: pointer; background-color: #f0f0f0;';
    selectAllButton.onclick = () => document.querySelectorAll('.personaje-checkbox').forEach(cb => cb.checked = true);
    const deselectAllButton = document.createElement('button');
    deselectAllButton.textContent = 'Deseleccionar Todo';
    deselectAllButton.style.cssText = 'padding: 10px 15px; border: 1px solid #ccc; border-radius: 5px; cursor: pointer; background-color: #f0f0f0;';
    deselectAllButton.onclick = () => document.querySelectorAll('.personaje-checkbox').forEach(cb => cb.checked = false);
    selectionButtons.appendChild(selectAllButton);
    selectionButtons.appendChild(deselectAllButton);
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Exportar Seleccionados';
    exportButton.style.cssText = `
        padding: 12px 20px; border: none; border-radius: 5px; background-color: #28a745; color: white; font-size: 16px; cursor: pointer; font-weight: bold;
    `;
    
    exportButton.onclick = async () => {
        const seleccionados = [];
        const checkboxes = document.querySelectorAll('.personaje-checkbox:checked');
        if (checkboxes.length === 0) {
            alert('Por favor, selecciona al menos un personaje para exportar.');
            return;
        }
        checkboxes.forEach(cb => {
            const index = parseInt(cb.dataset.personajeIndex, 10);
            if (personajes[index]) {
                seleccionados.push(personajes[index]);
            }
        });
        
        const datosParaExportar = seleccionados.map(p => {
            const personajeFinal = { ...p };
            delete personajeFinal.is3DModel; 
            return personajeFinal;
        });

        try {
            const pngDataUrl = await jsonToPng(datosParaExportar, datosParaExportar);
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", pngDataUrl);
            downloadAnchorNode.setAttribute("download", "datos_exportados.png");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            document.body.removeChild(modalOverlay);
        } catch (error) {
            alert(`Error al exportar: ${error}`);
            console.error("Error al exportar a PNG:", error);
        }
    };
    buttonContainer.appendChild(selectionButtons);
    buttonContainer.appendChild(exportButton);
    modalContent.appendChild(closeButton);
    modalContent.appendChild(modalTitle);
    modalContent.appendChild(listContainer);
    modalContent.appendChild(buttonContainer);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
        }
    });
}

function cerrarModalExportar() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-exportar');
    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
    if (overlay) {
        overlay.onclick = null;
    }
}
 
async function generarHTML() {
    console.log("Iniciando generación de HTML para Guion...");
    const tituloProyecto = document.getElementById("titulo-proyecto").innerText;
    let bodyContent = `<h1>${tituloProyecto}</h1>`;
    const capitulosOrdenados = Object.keys(escenas).sort();
    for (const id of capitulosOrdenados) {
        const capitulo = escenas[id];
        bodyContent += `<h2>${capitulo.texto || id}</h2>`;
        if (capitulo.frames && capitulo.frames.length > 0) {
            for (const frame of capitulo.frames) {
                bodyContent += '<div class="frame-export">';
                if (frame.imagen) {
                    try {
                        const imagenComprimida = await _compressImageForSave(frame.imagen);
                        if (imagenComprimida) {
                           bodyContent += `<img src="${imagenComprimida}" alt="Imagen del frame">`;
                        }
                    } catch (error) {
                        console.error("Error al procesar imagen para exportar:", error);
                    }
                }
                if (frame.texto) {
                    bodyContent += `<p>${frame.texto.replace(/\n/g, "<br>")}</p>`;
                }
                bodyContent += '</div>';
            }
        }
    }
    const htmlCompleto = `
        <!DOCTYPE html> <html lang="es"> <head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale-1.0"> <title>${tituloProyecto}</title> <style>
                body { font-family: montserrat; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; color: #333; }
                .container { max-width: 800px; margin: auto; background: white; padding: 20px 40px; border-radius: 8px; box-shadow: 0 0 15px rgba(0,0,0,0.1); }
                h1, h2 { color: #333; } h1 { text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; }
                h2 { border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 40px; }
                .frame-export { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background: #fafafa; }
                img { max-width: 100%; height: auto; border-radius: 4px; margin-bottom: 10px; display: block; }
                p { margin-top: 0; } </style> </head> <body> <div class="container"> ${bodyContent} </div> </body> </html>
    `;
    const blob = new Blob([htmlCompleto], { type: 'text/html' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${tituloProyecto.replace(/\s+/g, '_')}_Guion.html`;
    a.click();
    console.log("Exportación de Guion a HTML completada.");
    cerrarModalExportar();
}

// =========================================================================
// INICIO: Funcionalidad para importar datos desde URL de Imagen (Versión Final)
// =========================================================================

/**
 * ABRE el modal para importar desde URL. Es llamada por el botón "ID".
 */


/**
 * Procesa una URL que apunta a un archivo Data-PNG.
 * Descarga, decodifica y crea los datos correspondientes.
 */
async function importarDatosDesdeUrl(url, statusEl, callbackCerrarModal) {
    try {
        statusEl.textContent = '📥 Obteniendo archivo de datos...';
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error de red: ${response.statusText}`);
        }
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/png')) {
            throw new Error('El archivo en la URL no es una imagen PNG.');
        }
        
        const blob = await response.blob();
        const base64Image = await fileToBase64(blob);

        statusEl.textContent = '🔑 Decodificando carta de datos...';
        const datosDecodificados = await pngToJson(base64Image);

        if (!Array.isArray(datosDecodificados)) {
            throw new Error("Los datos decodificados no tienen el formato correcto.");
        }

        statusEl.textContent = `✅ Creando ${datosDecodificados.length} dato(s)...`;
        datosDecodificados.forEach(dato => agregarPersonajeDesdeDatos(dato));
        reinicializarFiltrosYActualizarVista();

        setTimeout(() => {
            alert(`¡Éxito! Se importaron ${datosDecodificados.length} datos desde la URL.`);
            if (callbackCerrarModal) callbackCerrarModal();
        }, 500);

    } catch (error) {
        console.error('Error en importación de Data-PNG desde URL:', error);
        const mensajeError = error.message.includes("decodificar") 
            ? "No se detectó una carta de datos válida en la imagen." 
            : error.message;
            
        statusEl.textContent = `Error: ${mensajeError}`;
        alert(`Error: ${mensajeError}`);
    }
}

function abrirModalURL() {
    const modal = document.getElementById('modal-importar-url');
    if (modal) {
        // Resetea el contenido antes de mostrarlo
        document.getElementById('modal-url-input').value = '';
        document.getElementById('modal-url-status').textContent = 'Esperando URL...';
        
        modal.style.display = 'flex';
        document.getElementById('modal-url-input').focus();
    }
}

/**
 * CIERRA el modal. Es llamada por el botón de cierre (X).
 */
function cerrarModalURL() {
    const modal = document.getElementById('modal-importar-url');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Función que se ejecuta una vez para que el campo de texto
 * reaccione cuando se pega una URL.
 */
/**
 * Inicializa la escucha de eventos en el modal para IMPORTAR DATOS-PNG.
 */
// REEMPLAZA ESTA FUNCIÓN EN exportar.js

function inicializarEscuchaModalURL() {
    const input = document.getElementById('modal-url-input');
    const importBtn = document.getElementById('importar-desde-url-btn'); // Obtenemos el nuevo botón

    if (input && importBtn && !input.dataset.listenerAgregado) {
        
        // Función central para no repetir código
        const lanzarImportacion = async () => {
            const url = input.value;
            const statusEl = document.getElementById('modal-url-status');
            if (url) {
                // Llamamos a la función que ya tienes y que funciona bien
                await importarDatosDesdeUrl(url, statusEl, cerrarModalURL);
            }
        };

        // 1. Escuchar el clic en el botón
        importBtn.addEventListener('click', lanzarImportacion);

        // 2. Escuchar la tecla "Enter"
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Evita que se envíe un formulario
                lanzarImportacion();
            }
        });

        // 3. Escuchar el evento de pegar (mantenemos la conveniencia)
        input.addEventListener('paste', () => {
            setTimeout(lanzarImportacion, 100); // Pequeña espera para que se pegue el valor
        });

        input.dataset.listenerAgregado = 'true';
    }
}

/**
 * Esta es la función "motor" que hace todo el trabajo pesado.
 * Orquesta el proceso completo: fetch, análisis con IA de visión, 
 * estructuración con IA de texto y creación del dato final.
 * @param {string} url - La URL de la imagen a procesar.
 * @param {HTMLElement} statusEl - El elemento del DOM para mostrar el estado.
 * @param {Function} callbackCerrarModal - La función para cerrar el modal al finalizar.
 */
async function procesarUrlYCrearDato(url, statusEl, callbackCerrarModal) {
    try {
        // PASO 1: Obtener la imagen y convertirla a Base64
        statusEl.textContent = '📥 Obteniendo imagen...';
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error de red: ${response.statusText}`);

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            throw new Error('La URL no apunta a una imagen válida.');
        }
        
        const blob = await response.blob();
        const base64Image = await fileToBase64(blob); // Usamos la función que ya tienes

        // PASO 2: "Leer" la imagen y obtener una descripción con la IA de Visión
        statusEl.textContent = '👁️ Analizando la imagen con IA...';
        if (typeof llamarIAVision !== 'function') {
            throw new Error("La función `llamarIAVision` no está disponible. Revisa `geminivisual.js`.");
        }
        
        const promptVision = "Describe esta imagen con gran detalle. Enfócate en el sujeto principal, su apariencia, ropa, expresión y el entorno que lo rodea. Sé lo más descriptivo posible.";
        const descripcionDesdeImagen = await llamarIAVision(promptVision, base64Image);

        if (!descripcionDesdeImagen) throw new Error("La IA de visión no pudo generar una descripción.");

        // PASO 3: Convertir la descripción en datos estructurados (JSON) con la IA de Texto
        statusEl.textContent = '✍️ Estructurando información...';
        const etiquetasValidas = opcionesEtiqueta.map(o => o.valor).filter(v => v !== 'indeterminado' && v !== 'personalizar').join(', ');
        const promptTexto = `Basado en la siguiente descripción detallada de una imagen, crea un único objeto JSON con los datos del elemento principal.\n\n**Descripción de la Imagen:** "${descripcionDesdeImagen}"\n\n**Instrucciones:**\n1. Crea un "nombre" corto y representativo.\n2. Usa la descripción completa para el campo "descripcion".\n3. Crea un "promptVisual" detallado para que otra IA pueda recrear la imagen.\n4. Asigna la "etiqueta" MÁS APROPIADA de la lista [${etiquetasValidas}].\n\n**Formato de Salida Obligatorio:** Responde ÚNICAMENTE con el objeto JSON.`;
        
        const datosEstructurados = await llamarIAConFeedback(promptTexto, "Estructurando...", "gemini-2.5-flash");

        // PASO 4: Crear el nuevo "Dato" en la interfaz
        statusEl.textContent = '✅ ¡Creando dato!';
        const datosFinales = { 
            ...datosEstructurados, 
            imagen: base64Image, 
            arco: 'visuales', // Lo asignamos por defecto al arco "Visuales"
            embedding: [] 
        };
        
        agregarPersonajeDesdeDatos(datosFinales);
        reinicializarFiltrosYActualizarVista();

        // PASO 5: Finalizar y notificar
        setTimeout(() => {
            alert(`¡Dato "${datosFinales.nombre}" creado con éxito desde la URL!`);
            callbackCerrarModal();
        }, 500);

    } catch (error) {
        console.error('Error en el proceso de importación desde URL:', error);
        statusEl.textContent = `Error: ${error.message}`;
        alert(`Error: ${error.message}`);
    }
}

// Llama a la función de inicialización cuando el DOM esté listo para que el 'pegar' funcione.
document.addEventListener('DOMContentLoaded', inicializarEscuchaModalURL);