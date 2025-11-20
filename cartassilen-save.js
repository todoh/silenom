// =================================================================
// ARCHIVO: cartassilen-save.js
// Contiene funciones para exportar imágenes.
// VERSIÓN COMPATIBLE CON "CARTAS SILEN - FASE 3" Y MEJORADA
// =================================================================

/**
 * Exporta una única imagen (Data URL) como archivo PNG.
 * @param {string} imageDataUrl - La Data URL de la imagen a exportar.
 * @param {string} fileName - El nombre de archivo deseado (sin extensión).
 */
function exportarDataURLComoPNG(imageDataUrl, fileName) {
    if (!imageDataUrl || imageDataUrl.startsWith('https://placehold.co')) {
        alert("No hay una imagen válida para exportar.");
        return;
    }

    const a = document.createElement('a');
    a.href = imageDataUrl;
    a.download = `${fileName || 'carta'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * Exporta todas las imágenes de las cartas guardadas como archivos PNG comprimidos en un ZIP.
 * Esto requiere las bibliotecas JSZip y FileSaver.js.
 * @param {Array<object>} cartas - Array de objetos de carta, cada uno con una propiedad `imagenSrc`.
 * @param {string} zipFileName - El nombre del archivo ZIP.
 */
async function exportarTodasLasImagenesComoZIP(cartas, zipFileName = 'imagenes_cartas_silenos.zip') {
    if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
        alert("Para exportar como ZIP, necesitas incluir las bibliotecas JSZip y FileSaver.js en tu HTML.");
        console.error("JSZip o FileSaver.js no están cargados.");
        return;
    }
    if (!cartas || cartas.length === 0) {
        alert("No hay cartas con imágenes para exportar.");
        return;
    }

    const zip = new JSZip();
    let contador = 0;
    
    const cartasConImagenReal = cartas.filter(carta => carta.imagenSrc && !carta.imagenSrc.startsWith('https://placehold.co'));

    if (cartasConImagenReal.length === 0) {
        alert("No hay imágenes de cartas reales para exportar (solo placeholders o cartas sin imagen).");
        return;
    }

    alert(`Preparando ${cartasConImagenReal.length} imágenes para exportar... esto puede tardar.`);

    for (const carta of cartasConImagenReal) {
        if (carta.imagenSrc && carta.imagenSrc.startsWith('data:image/')) {
            try {
                const base64Data = carta.imagenSrc.split(',')[1];
                const cleanName = carta.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                // Guardamos como PNG para mantener la consistencia
                zip.file(`${cleanName}_${carta.id.substring(carta.id.length - 4)}.png`, base64Data, { base64: true });
                contador++;
            } catch (error) {
                console.warn(`No se pudo añadir la imagen de "${carta.nombre}" al ZIP:`, error);
            }
        }
    }

    if (contador === 0) {
        alert("No se encontró ninguna imagen válida para añadir al ZIP.");
        return;
    }

    try {
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, zipFileName);
        alert(`¡Se exportaron ${contador} imágenes en ${zipFileName}!`);
    } catch (error) {
        console.error("Error al generar el archivo ZIP:", error);
        alert("Error al crear el archivo ZIP. Consulta la consola para más detalles.");
    }
}

