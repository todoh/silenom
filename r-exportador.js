async function exportStandaloneHTML() {
    try {
        const worldNameRaw = document.getElementById('r-load-world-select')?.value || 'Mi-Mundo';
        const worldName = worldNameRaw.replace(WORLD_DATA_NAME_PREFIX, '').replace(/\s+/g, '-');
        const fileName = `${worldName}.html`;

        alert(`Iniciando exportación de "${fileName}".`);

        // Obtenemos el contenido de los scripts necesarios
        let rPreview3dJsContent = await fetch(document.querySelector('script[src*="r-preview-3d.js"]').src).then(res => res.text());
        // Eliminamos las llamadas al modal que no existen en el exportado
        rPreview3dJsContent = rPreview3dJsContent
            .replace("document.getElementById('r-preview-modal').style.display = 'flex';", "")
            .replace("document.getElementById('r-preview-modal').style.display = 'none';", "");

        const rFuncionesJsContent = await fetch(document.querySelector('script[src*="r-funciones.js"]').src).then(res => res.text());

        // Preparamos los datos del mundo para la exportación
        const toolsForExport = {
            textures: tools.textures,
            entities: {},
            customEntities: {}
        };
        const worldDataJson = JSON.stringify(worldData, null, 2);
        const toolsJson = JSON.stringify(toolsForExport, null, 2);

        // Capturamos la textura del canvas del editor como una imagen Data URL
        const editorTextureCanvas = editor3DState.textureCanvas;
        if (!editorTextureCanvas) {
            throw new Error("Error crítico: No se pudo encontrar el canvas de la textura del editor para exportar.");
        }
        const textureDataUrl = editorTextureCanvas.toDataURL('image/png');

        // Construimos el archivo HTML final
        const htmlTemplate = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Visor de Mundo: ${worldName}</title>
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }
        #r-game-container { width: 100%; height: 100%; }
        .info-box { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.5); color: white; padding: 10px; border-radius: 5px; font-family: sans-serif; }
    </style>
</head>
<body>
    <div id="r-game-container"></div>
    <div class="info-box">Mundo: ${worldName}</div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js"><\/script>

    <script id="exported-data">
        const GRID_WIDTH = ${GRID_WIDTH};
        const GRID_HEIGHT = ${GRID_HEIGHT};
        const SUBGRID_SIZE = 10;
        let worldData = ${worldDataJson};
        let tools = ${toolsJson};
        
        // La textura viaja como un string de datos.
        const exportedTextureDataUrl = '${textureDataUrl}';

        // Mockup de funciones que no se necesitan en el exportado pero son referenciadas
        function createModelFromJSON(jsonData) { return new THREE.Group(); }
    <\/script>

    <script id="r-funciones-script">${rFuncionesJsContent}<\/script>
    <script id="r-preview-3d-script">${rPreview3dJsContent}<\/script>

    <!-- ================================================================== -->
    <!-- === SCRIPT LANZADOR CORREGIDO ==================================== -->
    <!-- ================================================================== -->
    <script id="launcher">
        window.addEventListener('load', () => {
            console.log("Iniciando vista previa del mundo exportado...");
            if (typeof inicializarLibreriaMateriales === 'function') {
                inicializarLibreriaMateriales();
            }

            // 1. Inicia el visor 3D INMEDIATAMENTE pero sin textura pre-cargada (pasando null).
            // Esto crea la esfera, las luces y, lo más importante, el canvas interno del visor (previewState.textureCanvas).
            startPreview(worldData, null);

            // 2. Ahora que el visor está listo, cargamos la imagen de la textura.
            const textureImage = new Image();
            textureImage.onload = function() {
                console.log("Textura decodificada. Aplicando al visor 3D existente...");

                // 3. Obtenemos acceso directo al canvas y al contexto del propio visor 3D.
                if (!previewState || !previewState.textureCanvas) {
                    console.error("Error crítico: El canvas del visor 3D no se ha inicializado.");
                    return;
                }
                const previewCanvas = previewState.textureCanvas;
                const previewCtx = previewCanvas.getContext('2d');

                // 4. Dibujamos la imagen cargada DIRECTAMENTE sobre el canvas del visor.
                previewCtx.drawImage(this, 0, 0, previewCanvas.width, previewCanvas.height);
                
                // 5. ¡CRUCIAL! Avisamos a Three.js que la textura ha cambiado y debe actualizarse en la GPU.
                if (previewState.dynamicTexture) {
                    previewState.dynamicTexture.needsUpdate = true;
                }
            };
            textureImage.onerror = function() {
                console.error("Fallo al cargar la textura del mundo.");
            };
            
            // 6. Asignamos la Data URL a la imagen para que comience la carga.
            textureImage.src = exportedTextureDataUrl;
        });
    <\/script>
</body>
</html>`;

        // Descargamos el archivo
        const blob = new Blob([htmlTemplate], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        alert(`¡"${fileName}" exportado con éxito!`);

    } catch (error) {
        console.error("Error durante la exportación:", error);
        alert("Ocurrió un error al intentar exportar. Revisa la consola.");
    }
}
