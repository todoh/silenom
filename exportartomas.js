// =================================================================
// ARCHIVO: exportartomas.js (Versión actualizada con ajuste de calidad)
// =================================================================

/**
 * RELLENA EL CONTENEDOR DE CHECKBOXES EN EL MODAL DE EXPORTACIÓN.
 */
function poblarSelectorDeTomas() {
    const container = document.getElementById('tomas-checkbox-container');
    if (!container) {
        console.error("Error: No se encuentra el <div> con id 'tomas-checkbox-container' en tu HTML.");
        return;
    }
    container.innerHTML = '';
    if (typeof storyScenes === 'undefined' || !Array.isArray(storyScenes) || storyScenes.length === 0) {
        container.innerHTML = '<p>No hay escenas de storyboard para exportar</p>';
        return;
    }
    storyScenes.forEach(escena => {
        const itemDiv = document.createElement('div');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `escena-export-${escena.id}`;
        checkbox.value = escena.id;
        checkbox.checked = true;
        const label = document.createElement('label');
        label.htmlFor = `escena-export-${escena.id}`;
        label.textContent = escena.nombre || 'Escena sin título';
        itemDiv.appendChild(checkbox);
        itemDiv.appendChild(label);
        container.appendChild(itemDiv);
    });
}

/**
 * Función auxiliar para los botones "Seleccionar Todo" y "Deseleccionar Todo".
 * @param {boolean} seleccionar - true para seleccionar todo, false para deseleccionar.
 */
function seleccionarTodasLasTomas(seleccionar) {
    const checkboxes = document.querySelectorAll('#tomas-checkbox-container input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = seleccionar);
}


/**
 * --- FUNCIÓN MODIFICADA ---
 * Convierte una URL de imagen a Base64 Data URI con calidad ajustable.
 * @param {string} url - La URL de la imagen a convertir.
 * @param {number} quality - La calidad de la imagen, un número entre 0.0 y 1.0.
 * @returns {Promise<string>} Una promesa que se resuelve con la cadena Base64 Data URI.
 */
function convertirImagenABase642(url, quality = 0.92) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // --- MODIFICACIÓN CLAVE ---
            // Se convierte a 'image/jpeg' para poder aplicar el ajuste de calidad.
            // El formato PNG no permite este ajuste.
            const dataURL = canvas.toDataURL('image/jpeg', quality);
            resolve(dataURL);
        };
        img.onerror = (error) => {
            console.error("Error al cargar la imagen para la conversión a Base64:", url, error);
            reject(error);
        };
        img.src = url;
    });
}


/**
 * --- FUNCIÓN MODIFICADA ---
 * GENERA EL ARCHIVO HTML DEL STORYBOARD, ahora sensible al ajuste de calidad.
 */
async function generarHTMLTomas() {
    const tituloProyecto = document.getElementById("titulo-proyecto").innerText;

    // --- MODIFICACIÓN 1: LEER EL VALOR DE CALIDAD DEL SLIDER ---
    const qualityValue = document.getElementById('quality-slider').value;
    const qualityForExport = parseInt(qualityValue, 10) / 100; // Convertir 92 a 0.92
    
    console.log(`Iniciando exportación con calidad JPEG de: ${qualityForExport}`);

    const checkboxes = document.querySelectorAll('#tomas-checkbox-container input[type="checkbox"]:checked');
    const selectedSceneIds = Array.from(checkboxes).map(cb => cb.value);

    if (selectedSceneIds.length === 0) {
        alert("Por favor, selecciona al menos una escena para exportar.");
        return;
    }

    if (typeof storyScenes === 'undefined' || !Array.isArray(storyScenes)) {
        alert("Error: No se ha podido encontrar la lista de escenas (storyScenes no está definida).");
        return;
    }

    const escenasAExportar = storyScenes.filter(s => selectedSceneIds.includes(s.id));

    if (escenasAExportar.length === 0) {
        alert("No se encontraron las escenas de storyboard seleccionadas.");
        return;
    }
    
    if(typeof mostrarIndicadorCarga === 'function') {
        mostrarIndicadorCarga(true, "Convirtiendo imágenes para exportación...");
    }

    let bodyContent = `<h1>Storyboard: ${tituloProyecto}</h1>`;
    for (const escena of escenasAExportar) {
        bodyContent += `<h2 class="scene-title">${escena.nombre || 'Escena Sin Título'}</h2>`;
        if (escena.tomas && escena.tomas.length > 0) {
            for (const toma of escena.tomas) {
                bodyContent += '<div class="toma-container">';

                if (toma.imagen) {
                    try {
                        // --- MODIFICACIÓN APLICADA ---
                        // Forzamos la conversión para TODAS las imágenes,
                        // sin importar si son URL o ya son Data URIs.
                        const imagenSrc = await convertirImagenABase64(toma.imagen, qualityForExport);
                        bodyContent += `<img src="${imagenSrc}" alt="Imagen de la toma">`;

                    } catch (error) {
                        console.error("Fallo al procesar imagen para la toma. Se usará placeholder.", error);
                        bodyContent += '<div class="no-image-placeholder">Error al cargar imagen</div>';
                    }
                } else {
                    bodyContent += '<div class="no-image-placeholder">Sin Imagen</div>';
                }

                if (toma.guionTecnico) {
                    bodyContent += `<p>${toma.guionTecnico.replace(/\n/g, "<br>")}</p>`;
                }
                bodyContent += '</div>';
            }
        } else {
            bodyContent += '<p><em>Esta escena no contiene tomas.</em></p>';
        }
    }

    const htmlCompleto = `
        <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Storyboard: ${tituloProyecto}</title>
        <style>
            body { font-family: sans-serif; line-height: 1.6; margin: 20px; } .container { max-width: 800px; margin: auto; }
            h1 { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 15px; } .scene-title { margin-top: 40px; }
            .toma-container { margin: 30px 0; page-break-inside: avoid; } .toma-container img { max-width: 100%; border-radius: 4px; margin-bottom: 10px; }
            .no-image-placeholder { width: 100%; height: 250px; background-color: #f1f3f5; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #6c757d; margin-bottom: 15px; }
            .toma-container p { white-space: pre-wrap; margin: 0; }
        </style></head><body><div class="container">${bodyContent}</div></body></html>`;

    if(typeof mostrarIndicadorCarga === 'function') {
        mostrarIndicadorCarga(false);
    }
    
    const blob = new Blob([htmlCompleto], { type: 'text/html' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Storyboard_${tituloProyecto.replace(/\s+/g, '_')}.html`;
    a.click();
    
    if(typeof cerrarModalExportar === 'function') {
        cerrarModalExportar();
    }
}