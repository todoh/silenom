/**
 * =================================================================
 * ARCHIVO: exportarjuego.js
 * VERSIÓN: Actualizada con control de calidad de imagen.
 * =================================================================
 */

 
/**
 * [VERSIÓN CORREGIDA] Convierte una URL de imagen a Base64 Data URI con calidad ajustable.
 * Esta versión es más robusta: ignora URLs inválidas (como la URL base de la página)
 * y resuelve a `null` en caso de error de carga para no detener la exportación.
 * @param {string} url - La URL de la imagen a convertir.
 * @param {number} quality - La calidad de la imagen, un número entre 0.0 y 1.0.
 * @returns {Promise<string|null>} Una promesa que se resuelve con la cadena Base64 o null.
 */
function convertirImagenABase64(url, quality = 0.92) {
    // --- CHEQUEO MEJORADO ---
    // 1. Si la URL es nula, vacía o un placeholder, resuelve a null.
    if (!url || url.endsWith('vacio.png')) {
        return Promise.resolve(null);
    }
    // 2. Si la URL es la misma que la página actual (un error común con src=""), resuelve a null.
    if (url === window.location.href || url === window.location.origin + '/') {
        return Promise.resolve(null);
    }
    // 3. Si ya es un Data URI, devuélvelo directamente.
    if (url.startsWith('data:image')) {
        return Promise.resolve(url);
    }

    return new Promise((resolve) => { // No usamos 'reject' para no detener el proceso
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/jpeg', quality);
            resolve(dataURL);
        };
        
        // --- CAMBIO CLAVE ---
        // En caso de error, simplemente muestra una advertencia en consola y resuelve a `null`.
        // Esto evita que la exportación entera se cancele.
        img.onerror = () => {
            console.warn("No se pudo cargar una imagen para la conversión (probablemente no hay imagen asignada). Se omitirá:", url);
            resolve(null); 
        };

        img.src = url;
    });
}


/**
 * [ESTRATEGIA AVANZADA Y ESCALABLE] - Genera el juego dividiéndolo en partes (chunks) que se cargan bajo demanda.
 * @param {string} nombreMomentoInicial - El NOMBRE del primer momento que se mostrará.
 */
async function generarGAME_avanzado(nombreMomentoInicial) {
    // --- NUEVO: LEER EL VALOR DE CALIDAD DEL SLIDER ---
    const qualityValue = document.getElementById('quality-slider')?.value || '92';
    const qualityForExport = parseInt(qualityValue, 10) / 100;
    console.log(`Iniciando exportación de Juego (Avanzado) con calidad JPEG de: ${qualityForExport}`);

    // --- CONFIGURACIÓN ---
    const MOMENTOS_POR_PARTE = 25;
    const tituloProyecto = document.getElementById("titulo-proyecto").innerText;

    function sanitizarParaId(texto) {
        if (!texto) return '';
        return texto.trim()
            .normalize("NFD").replace(/[\u00e0-\u00e5]|[\u00e7-\u00ea]|[\u00ec-\u00ef]|[\u00f2-\u00f6]|[\u00f9-\u00fc]/g, "")
            .replace(/[^a-zA-Z0-9\s-]/g, "")
            .replace(/\s+/g, '-')
            .toLowerCase();
    }

    const nodosMomento = document.querySelectorAll('#momentos-lienzo .momento-nodo');
    
    // 1. VALIDACIÓN INICIAL Y RECOPILACIÓN DE DATOS GLOBALES
    const idToSanitizedNameMap = new Map();
    const sanitizedNameToIdMap = new Map();
    const sanitizedNameCheck = new Map();
    let hasDuplicates = false;
    let duplicateErrorMsg = 'Error: No se puede exportar. Se encontraron nombres de momentos que resultan en el mismo identificador:\n';

    nodosMomento.forEach(nodo => {
        const id = nodo.id;
        const titulo = nodo.querySelector('.momento-titulo').textContent;
        const sanitizedTitulo = sanitizarParaId(titulo);
        if (sanitizedNameCheck.has(sanitizedTitulo)) {
            hasDuplicates = true;
            const originalDuplicateTitle = sanitizedNameCheck.get(sanitizedTitulo);
            if (!duplicateErrorMsg.includes(originalDuplicateTitle)) {
                 duplicateErrorMsg += `\n- "${originalDuplicateTitle}" y "${titulo}"`;
            } else {
                 duplicateErrorMsg += `, y también "${titulo}"`;
            }
        } else if (sanitizedTitulo) {
            sanitizedNameCheck.set(sanitizedTitulo, titulo);
        }
        idToSanitizedNameMap.set(id, sanitizedTitulo);
        sanitizedNameToIdMap.set(sanitizedTitulo, id);
    });

    if (hasDuplicates) {
        alert(duplicateErrorMsg);
        return;
    }

    // 2. DIVISIÓN DEL JUEGO EN PARTES (CHUNKING)
    console.log("Iniciando división del juego en partes...");
    const partes = [];
    const momentoAParteMap = new Map();
    const visitados = new Set();
    let momentosParaProcesar = [sanitizarParaId(nombreMomentoInicial)];

    while (momentosParaProcesar.length > 0) {
        const parteActual = new Set();
        const cola = [...momentosParaProcesar];
        momentosParaProcesar = [];

        while (cola.length > 0 && parteActual.size < MOMENTOS_POR_PARTE) {
            const sanitizedName = cola.shift();
            if (!sanitizedName || visitados.has(sanitizedName)) continue;
            
            visitados.add(sanitizedName);
            parteActual.add(sanitizedName);
            momentoAParteMap.set(sanitizedName, partes.length + 1);

            const nodoId = sanitizedNameToIdMap.get(sanitizedName);
            const nodo = document.getElementById(nodoId);
            if (nodo) {
                const acciones = JSON.parse(nodo.dataset.acciones || '[]');
                acciones.forEach(accion => {
                    const destinoSanitized = idToSanitizedNameMap.get(accion.idDestino);
                    if (destinoSanitized && !visitados.has(destinoSanitized)) {
                        if (parteActual.size >= MOMENTOS_POR_PARTE) {
                            if(!momentosParaProcesar.includes(destinoSanitized)) momentosParaProcesar.push(destinoSanitized);
                        } else {
                            if(!cola.includes(destinoSanitized)) cola.push(destinoSanitized);
                        }
                    }
                });
            }
        }
        momentosParaProcesar.push(...cola.filter(m => !visitados.has(m)));
        partes.push(Array.from(parteActual));
    }
    console.log(`Juego dividido en ${partes.length} partes.`);

    // 3. PROCESAR CADA PARTE PARA GENERAR SUS DATOS Y RECURSOS
    const datosPorParte = [];
    const datosVisualesGlobales = new Map();

    // MODIFICADO: Procesamiento asíncrono de personajes para conversión de imágenes
    const personajePromises = Array.from(document.querySelectorAll('#listapersonajes .personaje')).map(async (datoEl) => {
        const nombre = datoEl.querySelector('.nombreh')?.value.trim();
        const imgSrc = datoEl.querySelector('.personaje-visual img')?.src;
        const svgContent = datoEl.dataset.svgContent || '';
        if (nombre) {
            const convertedImgSrc = await convertirImagenABase64(imgSrc, qualityForExport);
            datosVisualesGlobales.set(nombre, { imgSrc: convertedImgSrc, svgContent });
        }
    });
    await Promise.all(personajePromises);

    for (const momentoNombres of partes) {
        const recursosIndex = {};
        const recursosArray = [];
        let currentIndex = 0;

        const registrarRecurso = (data) => {
            if (data === null || typeof data === 'undefined' || (typeof data === 'string' && data.trim() === '')) return null;
            const key = `r_${Math.random().toString(36).substr(2, 9)}`;
            const dataStr = String(data);
            recursosIndex[key] = [currentIndex, dataStr.length];
            recursosArray.push(dataStr);
            currentIndex += dataStr.length;
            return key;
        };

        const momentosData = {};
        const datosVisualesLocales = new Map();

        for (const sanitizedTitulo of momentoNombres) {
            const nodoId = sanitizedNameToIdMap.get(sanitizedTitulo);
            const nodo = document.getElementById(nodoId);
            if (!nodo) continue;

            const entidadesOriginales = JSON.parse(nodo.dataset.entidades || '[]');
            entidadesOriginales.forEach(ent => {
                if (ent.recurso && !datosVisualesLocales.has(ent.recurso) && datosVisualesGlobales.has(ent.recurso)) {
                    const visual = datosVisualesGlobales.get(ent.recurso);
                    datosVisualesLocales.set(ent.recurso, {
                        imagenKey: registrarRecurso(visual.imgSrc), // La imagen ya está convertida
                        svgKey: registrarRecurso(visual.svgContent)
                    });
                }
            });

            const accionesOriginales = JSON.parse(nodo.dataset.acciones || '[]');
            
            // MODIFICADO: Convertir la imagen de fallback del momento de forma asíncrona
            const imagenFallbackOriginal = nodo.querySelector('.momento-imagen').src;
            const imagenFallbackConvertida = await convertirImagenABase64(imagenFallbackOriginal, qualityForExport);
            
            momentosData[sanitizedTitulo] = {
                titulo: nodo.querySelector('.momento-titulo').textContent,
                descripcion: nodo.dataset.descripcion || '',
                svgKey: registrarRecurso(nodo.dataset.svgIlustracion),
                imagenFallbackKey: registrarRecurso(imagenFallbackConvertida), // Usar la imagen convertida
                acciones: accionesOriginales.map(a => ({...a, idDestino: idToSanitizedNameMap.get(a.idDestino)})).filter(a => a.idDestino),
                entidades: entidadesOriginales.map(e => ({...e, svgKey: registrarRecurso(e.svg), svg: undefined })),
                llavesActivar: (nodo.dataset.llavesActivar || '').split(',').map(k => k.trim()).filter(Boolean),
                llavesDesactivar: (nodo.dataset.llavesDesactivar || '').split(',').map(k => k.trim()).filter(Boolean),
                objetosGanar: (nodo.dataset.objetosGanar || '').split(',').map(o => o.trim()).filter(Boolean),
                objetosPerder: (nodo.dataset.objetosPerder || '').split(',').map(o => o.trim()).filter(Boolean)
            };
        }
        
        datosPorParte.push({
            momentos: momentosData,
            datosVisuales: Object.fromEntries(datosVisualesLocales),
            recursosIndex: recursosIndex,
            megaStringBlob: recursosArray.join('')
        });
    }

    // 4. CONSTRUIR EL SCRIPT DEL JUEGO CON LÓGICA DE CARGA DINÁMICA
    const css = `
        html, body { margin: 0; padding: 0; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background-color: #1a1a1a; color: #ffffff; overflow: hidden; }
        .game-container { position: relative; width: 100%; height: 100%; }
        .background-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: #000; }
        #game-image-bg 
        { position: absolute; bottom: 56%; left: 50%; transform: translateX(-50%) translateY(50%); 
         width: 60%; height: auto; 
         object-position: center bottom; }
        #game-entities-overlay { position: absolute; bottom: 0; left: 0; width: 100%; height: 95%; display: flex; justify-content: center; align-items: flex-end; padding-bottom: 2%; gap: 1vw; pointer-events: none; }
        .entity-sprite { object-fit: contain; -webkit-filter: drop-shadow(5px 5px 5px #222); filter: drop-shadow(5px 5px 5px #222); }
        .content-container { position: absolute; left: 50%; transform: translateX(-50%); bottom: 2%; width: 90%;  padding: 20px; border-radius: 12px; background-color: rgba(0, 0, 0, 0.7); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2); box-sizing: border-box; text-align: center; }
        #game-title { margin: 0 0 10px 0; font-size: 1.6em; display: none; }
        #game-description { margin: 0 0 15px 0; font-size: 1em; line-height: 1.5; }
        .actions-container { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
        .action-button { padding: 10px 20px; font-size: 1em; font-weight: bold; color: #ffffff; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 8px; cursor: pointer; transition: background-color 0.2s ease; }
        .action-button:hover { background-color: rgba(255, 255, 255, 0.3); }
        #inventory-ui-container { position: fixed; top: 20px; right: 20px; z-index: 100; }
        #inventory-toggle-button { width: 50px; height: 50px; border-radius: 50%; background-color: rgba(0,0,0,0.7); border: 2px solid rgba(255,255,255,0.3); color: white; font-size: 24px; cursor: pointer; display: flex; justify-content: center; align-items: center; position: relative; }
        .item-count-badge { position: absolute; bottom: -2px; right: -2px; background-color: #c0392b; color: white; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; font-weight: bold; display: flex; justify-content: center; align-items: center; border: 1px solid white; }
        #inventory-modal { display: none; position: absolute; top: 60px; right: 0; width: 300px; max-height: 70vh; background-color: rgba(0, 0, 0, 0.8); backdrop-filter: blur(5px); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; padding: 15px; box-sizing: border-box; }
        #inventory-modal.visible { display: block; }
        #inventory-grid { display: flex; flex-wrap: wrap; gap: 10px; overflow-y: auto; max-height: calc(70vh - 70px); }
        .inventory-item { position: relative; width: 60px; height: 60px; background-color: rgba(255, 255, 255, 0.1); border-radius: 6px; padding: 5px; box-sizing: border-box; display: flex; justify-content: center; align-items: center; }
        .inventory-item img, .inventory-item svg { max-width: 100%; max-height: 100%; object-fit: contain; }
        .item-quantity { position: absolute; bottom: 2px; right: 4px; background-color: rgba(0, 0, 0, 0.7); color: #fff; padding: 1px 5px; border-radius: 10px; font-size: 12px; font-weight: bold; }
        #loading-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.8); color: white; display: flex; justify-content: center; align-items: center; font-size: 2em; z-index: 9999; transition: opacity 0.3s; pointer-events: none; opacity: 0; }
    `;
    
    // (El resto del script del juego no necesita cambios, ya que maneja los recursos de forma abstracta)
    const script = `
    // --- DATOS INICIALES (PARTE 1) ---
    let momentos = ${JSON.stringify(datosPorParte[0].momentos)};
    let datosVisuales = ${JSON.stringify(datosPorParte[0].datosVisuales)};
    let recursosIndex = ${JSON.stringify(datosPorParte[0].recursosIndex)};
    const idInicio = "${sanitizarParaId(nombreMomentoInicial)}";
    const momentoAParteMap = ${JSON.stringify(Object.fromEntries(momentoAParteMap))};

    // --- LÓGICA DE CARGA DE PARTES ---
    const TOTAL_PARTES = ${partes.length};
    const partesCargadas = new Set([1]);
    let cargandoParte = false;
    const blobs = { 1: null };

    function obtenerRecursoGrafico(key, partNumber) {
        if (!key || !partNumber) return null;

        if (blobs[partNumber] === null) {
            const dataElement = document.getElementById(\`recursos-graficos-blob-\${partNumber}\`);
            if (dataElement) {
                blobs[partNumber] = dataElement.textContent;
                dataElement.remove();
            } else {
                console.error(\`No se encontró el blob de datos de recursos para la parte \${partNumber}.\`);
                blobs[partNumber] = '';
                return null;
            }
        }
        
        const index = recursosIndex[key];
        if (index) {
            const [start, length] = index;
            return blobs[partNumber].substring(start, start + length);
        }
        return null;
    }

    async function cargarParte(partNumber) {
        if (cargandoParte || partesCargadas.has(partNumber)) return;
        cargandoParte = true;
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.style.opacity = '1';

        console.log(\`Cargando Parte \${partNumber}...\`);
        
        return new Promise(resolve => {
            setTimeout(() => { // Simula una pequeña demora para que la UI de carga sea visible
                const dataElement = document.getElementById(\`game-data-part-\${partNumber}\`);
                if (!dataElement) {
                    console.error(\`No se encontraron datos para la parte \${partNumber}\`);
                    cargandoParte = false;
                    loadingOverlay.style.opacity = '0';
                    resolve();
                    return;
                }

                const nuevaParte = JSON.parse(dataElement.textContent);
                dataElement.remove();

                Object.assign(momentos, nuevaParte.momentos);
                Object.assign(datosVisuales, nuevaParte.datosVisuales);
                Object.assign(recursosIndex, nuevaParte.recursosIndex);

                partesCargadas.add(partNumber);
                cargandoParte = false;
                loadingOverlay.style.opacity = '0';
                console.log(\`Parte \${partNumber} cargada y fusionada.\`);
                resolve();
            }, 100);
        });
    }

    // --- LÓGICA PRINCIPAL DEL JUEGO (MODIFICADA PARA SER ASÍNCRONA) ---
    let estadoLlaves = {};
    const accionesUsadas = new Set();
    let inventario = new Map();
    
    function renderizarInventario() {
        const inventoryGrid = document.getElementById('inventory-grid');
        const countBadge = document.getElementById('inventory-item-count');
        inventoryGrid.innerHTML = '';
        countBadge.textContent = inventario.size;
        for (const [itemName, quantity] of inventario.entries()) {
            const visual = datosVisuales[itemName];
            if (!visual) continue;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item';
            itemDiv.title = itemName;
            const partNumber = momentoAParteMap[Object.keys(momentos).find(m => momentos[m].objetosGanar.includes(itemName))] || 1;
            const svgData = obtenerRecursoGrafico(visual.svgKey, partNumber);
            const imgData = obtenerRecursoGrafico(visual.imagenKey, partNumber);
            if (svgData) { itemDiv.innerHTML = svgData; }
            else if (imgData) { const img = document.createElement('img'); img.src = imgData; itemDiv.appendChild(img); }
            if (quantity > 1) { const qDiv = document.createElement('div'); qDiv.className = 'item-quantity'; qDiv.textContent = quantity; itemDiv.appendChild(qDiv); }
            inventoryGrid.appendChild(itemDiv);
        }
    }


    async function mostrarMomento(sanitizedName) {
        const partNumber = momentoAParteMap[sanitizedName];
        if (!partesCargadas.has(partNumber)) {
            await cargarParte(partNumber);
        }

        const momento = momentos[sanitizedName];
        if (!momento) { console.error('Error: No se encontró el momento', sanitizedName); return; }

        if (momento.llavesActivar) momento.llavesActivar.forEach(k => { estadoLlaves[k] = true; });
        if (momento.llavesDesactivar) momento.llavesDesactivar.forEach(k => { estadoLlaves[k] = false; });
        if (momento.objetosGanar) momento.objetosGanar.forEach(o => { inventario.set(o, (inventario.get(o) || 0) + 1); });
        if (momento.objetosPerder) momento.objetosPerder.forEach(o => { const c = inventario.get(o); if (c > 1) inventario.set(o, c - 1); else if (c === 1) inventario.delete(o); });
        renderizarInventario();

        const bgImageEl = document.getElementById('game-image-bg');
        const svgBg = obtenerRecursoGrafico(momento.svgKey, partNumber);
        if (svgBg) { bgImageEl.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgBg))); }
        else { bgImageEl.src = obtenerRecursoGrafico(momento.imagenFallbackKey, partNumber) || ''; }

        const entitiesContainer = document.getElementById('game-entities-overlay');
        entitiesContainer.innerHTML = '';
        if (momento.entidades) {
            momento.entidades.forEach(entidad => {
                const eCont = document.createElement('div');
                eCont.className = 'entity-sprite';
                eCont.style.height = (entidad.tamaño || 45) + 'vh';
                eCont.style.marginBottom = ((entidad.altura || 0) * 0.3) + 'vh';
                const eSvg = obtenerRecursoGrafico(entidad.svgKey, partNumber);
                const eVis = datosVisuales[entidad.recurso];
                const eImg = eVis ? obtenerRecursoGrafico(eVis.imagenKey, partNumber) : null;
                if (eSvg) { eCont.innerHTML = eSvg; }
                else if(eImg) { const fImg = document.createElement('img'); fImg.src = eImg; fImg.style.width = '100%'; fImg.style.height = '100%'; eCont.appendChild(fImg); }
                entitiesContainer.appendChild(eCont);
            });
        }
        
        document.getElementById('game-title').textContent = momento.titulo;
        document.getElementById('game-description').innerHTML = momento.descripcion.replace(/\\n/g, "<br>");
        const actionsContainer = document.getElementById('game-actions');
        actionsContainer.innerHTML = ''; 
        if (momento.acciones) {
            momento.acciones.forEach(accion => {
                let esVisible = true;
                if (accion.condicionTipo === 'una_vez') esVisible = !accionesUsadas.has(sanitizedName + '|' + accion.textoBoton);
                else if (accion.condicionTipo === 'visible_si') esVisible = !!estadoLlaves[accion.condicionLlave];
                else if (accion.condicionTipo === 'invisible_si') esVisible = !estadoLlaves[accion.condicionLlave];
                if (esVisible) {
                    const button = document.createElement('button');
                    button.className = 'action-button';
                    button.textContent = accion.textoBoton;
                    button.onclick = () => { if (accion.condicionTipo === 'una_vez') accionesUsadas.add(sanitizedName + '|' + accion.textoBoton); mostrarMomento(accion.idDestino); };
                    actionsContainer.appendChild(button);
                }
            });
        }
        
        if (momento.acciones) {
            const partesDestino = new Set(momento.acciones.map(a => momentoAParteMap[a.idDestino]).filter(p => p && !partesCargadas.has(p)));
            partesDestino.forEach(p => cargarParte(p));
        }
    }
    
    window.onload = () => {
        Object.keys(momentoAParteMap).map(k => momentoAParteMap[k]).forEach(p => blobs[p] = null);
        mostrarMomento(idInicio);
        const toggleBtn = document.getElementById('inventory-toggle-button');
        const modal = document.getElementById('inventory-modal');
        toggleBtn.addEventListener('click', e => { e.stopPropagation(); modal.classList.toggle('visible'); });
        document.addEventListener('click', e => { if (modal.classList.contains('visible') && !modal.contains(e.target) && !toggleBtn.contains(e.target)) modal.classList.remove('visible'); });
    };
    `;

    // 5. ENSAMBLAR EL HTML FINAL CON TODAS LAS PARTES EMBEBIDAS
    let partesEmbebidasHTML = '';
    for (let i = 1; i < datosPorParte.length; i++) {
        const parteData = datosPorParte[i];
        const dataPayload = {
            momentos: parteData.momentos,
            datosVisuales: parteData.datosVisuales,
            recursosIndex: parteData.recursosIndex
        };
        partesEmbebidasHTML += `<script type="text/plain" id="game-data-part-${i + 1}">${JSON.stringify(dataPayload).replace(/<\/script>/g, '<\\/script>')}<\/script>\n`;
        partesEmbebidasHTML += `<script type="text/plain" id="recursos-graficos-blob-${i + 1}">${parteData.megaStringBlob.replace(/<\/script>/g, '<\\/script>')}<\/script>\n`;
    }

    const htmlCompleto = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tituloProyecto}</title>
    <style>${css}</style>
</head>
<body>
    <div class="game-container">
        <div id="inventory-ui-container">
            <button id="inventory-toggle-button" title="Abrir Inventario">I<span id="inventory-item-count" class="item-count-badge">0</span></button>
            <div id="inventory-modal"><h2 style="text-align:center;margin-top:0;margin-bottom:15px;color:#fff;border-bottom:1px solid rgba(255,255,255,0.2);padding-bottom:10px;">Inventario</h2><div id="inventory-grid"></div></div>
        </div>
        <div id="loading-overlay">Cargando...</div>
        <div class="background-container"><img id="game-image-bg" src="" alt="Fondo de la escena"></div>
        <div id="game-entities-overlay"></div>
        <div class="content-container">
            <h1 id="game-title"></h1><p id="game-description"></p><div class="actions-container" id="game-actions"></div>
        </div>
    </div>
    <script type="text/plain" id="recursos-graficos-blob-1">${datosPorParte[0].megaStringBlob.replace(/<\/script>/g, '<\\/script>')}</script>
    ${partesEmbebidasHTML}
    <script>${script.replace(/<\/script>/g, '<\\/script>')}</script>
</body>
</html>`;

    const blob = new Blob([htmlCompleto], { type: 'text/html' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${tituloProyecto.replace(/\s+/g, '_')}_Juego_Avanzado.html`;
    a.click();
    console.log("Exportación de Videojuego (Avanzado) completada.");
}


/**
 * [ESTRATEGIA HÍBRIDA - PRECARGA INTELIGENTE DE RECURSOS]
 * Carga una vista estática de la primera escena y precarga los recursos de las siguientes en segundo plano.
 * @param {string} nombreMomentoInicial - El NOMBRE del primer momento que se mostrará.
 */
async function generarGAME_hibrido(nombreMomentoInicial) {
    // --- NUEVO: LEER EL VALOR DE CALIDAD DEL SLIDER ---
    const qualityValue = document.getElementById('quality-slider')?.value || '92';
    const qualityForExport = parseInt(qualityValue, 10) / 100;
    console.log(`Iniciando exportación de Juego (Híbrido) con calidad JPEG de: ${qualityForExport}`);

    const MOMENTOS_POR_PARTE = 1;
    const tituloProyecto = document.getElementById("titulo-proyecto").innerText;

    function sanitizarParaId(texto) {
        if (!texto) return '';
        return texto.trim()
            .normalize("NFD").replace(/[\u00e0-\u00e5]|[\u00e7-\u00ea]|[\u00ec-\u00ef]|[\u00f2-\u00f6]|[\u00f9-\u00fc]/g, "")
            .replace(/[^a-zA-Z0-9\s-]/g, "")
            .replace(/\s+/g, '-')
            .toLowerCase();
    }

    const nodosMomento = document.querySelectorAll('#momentos-lienzo .momento-nodo');
    
    // 1. VALIDACIÓN Y RECOPILACIÓN DE DATOS GLOBALES
    const idToSanitizedNameMap = new Map();
    const sanitizedNameToIdMap = new Map();
    const sanitizedNameCheck = new Map();
    let hasDuplicates = false;
    let duplicateErrorMsg = 'Error: No se puede exportar. Se encontraron nombres de momentos que resultan en el mismo identificador:\n';

    nodosMomento.forEach(nodo => {
        const id = nodo.id;
        const titulo = nodo.querySelector('.momento-titulo').textContent;
        const sanitizedTitulo = sanitizarParaId(titulo);
        if (sanitizedNameCheck.has(sanitizedTitulo)) {
            hasDuplicates = true;
            const originalDuplicateTitle = sanitizedNameCheck.get(sanitizedTitulo);
            if (!duplicateErrorMsg.includes(originalDuplicateTitle)) {
                 duplicateErrorMsg += `\n- "${originalDuplicateTitle}" y "${titulo}"`;
            } else {
                 duplicateErrorMsg += `, y también "${titulo}"`;
            }
        } else if (sanitizedTitulo) {
            sanitizedNameCheck.set(sanitizedTitulo, titulo);
        }
        idToSanitizedNameMap.set(id, sanitizedTitulo);
        sanitizedNameToIdMap.set(sanitizedTitulo, id);
    });

    if (hasDuplicates) {
        alert(duplicateErrorMsg);
        return;
    }

    // 2. DIVISIÓN DEL JUEGO EN PARTES (un nodo por parte)
    console.log("Iniciando división del juego: 1 nodo por parte.");
    const partes = [];
    const momentoAParteMap = new Map();
    const visitados = new Set();
    let momentosParaProcesar = [sanitizarParaId(nombreMomentoInicial)];

    while (momentosParaProcesar.length > 0) {
        const parteActual = new Set();
        const cola = [...new Set(momentosParaProcesar)];
        momentosParaProcesar = [];

        while (cola.length > 0 && parteActual.size < MOMENTOS_POR_PARTE) {
            const sanitizedName = cola.shift();
            if (!sanitizedName || visitados.has(sanitizedName)) continue;
            
            visitados.add(sanitizedName);
            parteActual.add(sanitizedName);
            momentoAParteMap.set(sanitizedName, partes.length + 1);

            const nodoId = sanitizedNameToIdMap.get(sanitizedName);
            const nodo = document.getElementById(nodoId);
            if (nodo) {
                const acciones = JSON.parse(nodo.dataset.acciones || '[]');
                acciones.forEach(accion => {
                    const destinoSanitized = idToSanitizedNameMap.get(accion.idDestino);
                    if (destinoSanitized && !visitados.has(destinoSanitized)) {
                       momentosParaProcesar.push(destinoSanitized);
                    }
                });
            }
        }
        momentosParaProcesar.push(...cola.filter(m => !visitados.has(m)));
        if (parteActual.size > 0) {
            partes.push(Array.from(parteActual));
        }
    }
    console.log(`Juego dividido en ${partes.length} partes.`);

    // 3. PROCESAR CADA PARTE PARA GENERAR SUS DATOS
    const datosPorParte = [];
    const datosVisualesGlobales = new Map();

    // MODIFICADO: Procesamiento asíncrono de personajes
    const personajePromises = Array.from(document.querySelectorAll('#listapersonajes .personaje')).map(async (datoEl) => {
        const nombre = datoEl.querySelector('.nombreh')?.value.trim();
        const imgSrc = datoEl.querySelector('.personaje-visual img')?.src;
        const svgContent = datoEl.dataset.svgContent || '';
        if (nombre) {
            const convertedImgSrc = await convertirImagenABase64(imgSrc, qualityForExport);
            datosVisualesGlobales.set(nombre, { imgSrc: convertedImgSrc, svgContent });
        }
    });
    await Promise.all(personajePromises);

    for (const momentoNombres of partes) {
        const recursosIndex = {};
        const recursosArray = [];
        let currentIndex = 0;

        const registrarRecurso = (data) => {
            if (data === null || typeof data === 'undefined' || (typeof data === 'string' && data.trim() === '')) return null;
            const key = `r_${Math.random().toString(36).substr(2, 9)}`;
            const dataStr = String(data);
            recursosIndex[key] = [currentIndex, dataStr.length];
            recursosArray.push(dataStr);
            currentIndex += dataStr.length;
            return key;
        };

        const momentosData = {};
        const datosVisualesLocales = new Map();

        for (const sanitizedTitulo of momentoNombres) {
            const nodoId = sanitizedNameToIdMap.get(sanitizedTitulo);
            const nodo = document.getElementById(nodoId);
            if (!nodo) continue;

            const entidadesOriginales = JSON.parse(nodo.dataset.entidades || '[]');
            entidadesOriginales.forEach(ent => {
                if (ent.recurso && !datosVisualesLocales.has(ent.recurso) && datosVisualesGlobales.has(ent.recurso)) {
                    const visual = datosVisualesGlobales.get(ent.recurso);
                    datosVisualesLocales.set(ent.recurso, {
                        imagenKey: registrarRecurso(visual.imgSrc),
                        svgKey: registrarRecurso(visual.svgContent)
                    });
                }
            });
            
            const accionesOriginales = JSON.parse(nodo.dataset.acciones || '[]');
            
            // MODIFICADO: Convertir imagen de fallback
            const imagenFallbackOriginal = nodo.querySelector('.momento-imagen').src;
            const imagenFallbackConvertida = await convertirImagenABase64(imagenFallbackOriginal, qualityForExport);

            momentosData[sanitizedTitulo] = {
                titulo: nodo.querySelector('.momento-titulo').textContent,
                descripcion: nodo.dataset.descripcion || '',
                svgKey: registrarRecurso(nodo.dataset.svgIlustracion),
                imagenFallbackKey: registrarRecurso(imagenFallbackConvertida),
                acciones: accionesOriginales.map(a => ({...a, idDestino: idToSanitizedNameMap.get(a.idDestino)})).filter(a => a.idDestino),
                entidades: entidadesOriginales.map(e => ({...e, svgKey: registrarRecurso(e.svg), svg: undefined })),
                llavesActivar: (nodo.dataset.llavesActivar || '').split(',').map(k => k.trim()).filter(Boolean),
                llavesDesactivar: (nodo.dataset.llavesDesactivar || '').split(',').map(k => k.trim()).filter(Boolean),
                objetosGanar: (nodo.dataset.objetosGanar || '').split(',').map(o => o.trim()).filter(Boolean),
                objetosPerder: (nodo.dataset.objetosPerder || '').split(',').map(o => o.trim()).filter(Boolean)
            };
        }
        
        datosPorParte.push({
            momentos: momentosData,
            datosVisuales: Object.fromEntries(datosVisualesLocales),
            recursosIndex: recursosIndex,
            megaStringBlob: recursosArray.join('')
        });
    }

    // 4. GENERAR EL HTML ESTÁTICO PARA LA PRIMERA ESCENA
    let htmlEstaticoInicial = '';
    const sanitizedMomentoInicial = sanitizarParaId(nombreMomentoInicial);
    const nodoInicial = Array.from(nodosMomento).find(n => idToSanitizedNameMap.get(n.id) === sanitizedMomentoInicial);
    if (nodoInicial) {
        const descripcion = (nodoInicial.dataset.descripcion || '').replace(/\\n/g, "<br>");
        const acciones = JSON.parse(nodoInicial.dataset.acciones || '[]');
        const svgIlustracion = nodoInicial.dataset.svgIlustracion;
        const imagenFallback = nodoInicial.querySelector('.momento-imagen').src;
        let bgSrc = '';

        if (svgIlustracion) {
            bgSrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgIlustracion)));
        } else {
            // MODIFICADO: Convertir la imagen estática inicial
            bgSrc = await convertirImagenABase64(imagenFallback, qualityForExport) || '';
        }

        const botonesEstaticos = acciones.map(accion => {
            const destino = idToSanitizedNameMap.get(accion.idDestino);
            return `<button class="action-button" data-destino="${destino}" disabled>${accion.textoBoton}</button>`;
        }).join('');

        htmlEstaticoInicial = `
            <div class="background-container"><img id="game-image-bg" src="${bgSrc}" alt="Fondo de la escena"></div>
            <div id="game-entities-overlay"></div>
            <div class="content-container">
                <h1 id="game-title"> </h1><p id="game-description">${descripcion}</p>
                <div class="actions-container" id="game-actions">${botonesEstaticos}</div>
            </div>`;
    }

    // 5. CONSTRUIR EL SCRIPT DEL JUEGO
    const css = `
        html, body { margin: 0; padding: 0; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background-color: #1a1a1a; color: #ffffff; overflow: hidden; }
        .game-container { position: relative; width: 100%; height: 100%; }
        .background-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: #000; }
        #game-image-bg { position: absolute; bottom: 65%; left: 50%; transform: translateX(-50%) translateY(50%); width: 65%; height: auto; object-position: center bottom; }
        #game-entities-overlay { position: absolute; bottom: 0; left: 0; width: 100%; height: 95%; display: flex; justify-content: center; align-items: flex-end; padding-bottom: 2%; gap: 1vw; pointer-events: none; }
        .entity-sprite { object-fit: contain; -webkit-filter: drop-shadow(5px 5px 5px #222); filter: drop-shadow(5px 5px 5px #222); }
        .content-container { position: absolute; left: 50%; transform: translateX(-50%); bottom: 2%; width: 90%;  padding: 20px; border-radius: 12px; background-color: rgba(0, 0, 0, 0.7); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2); box-sizing: border-box; text-align: center; }
        #game-title { margin: 0 0 10px 0; font-size: 1.6em; display: none; }
        #game-description { margin: 0 0 15px 0; font-size: 1em; line-height: 1.5; }
        .actions-container { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
        .action-button { padding: 10px 20px; font-size: 1em; font-weight: bold; color: #ffffff; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 8px; cursor: pointer; transition: background-color 0.2s ease; }
        .action-button:hover:not(:disabled) { background-color: rgba(255, 255, 255, 0.3); }
        .action-button:disabled { cursor: default; background-color: rgba(50, 50, 50, 0.2); color: #aaa; }
        #inventory-ui-container { position: fixed; top: 20px; right: 20px; z-index: 100; }
        #inventory-toggle-button { width: 50px; height: 50px; border-radius: 50%; background-color: rgba(0,0,0,0.7); border: 2px solid rgba(255,255,255,0.3); color: white; font-size: 24px; cursor: pointer; display: flex; justify-content: center; align-items: center; position: relative; }
        .item-count-badge { position: absolute; bottom: -2px; right: -2px; background-color: #c0392b; color: white; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; font-weight: bold; display: flex; justify-content: center; align-items: center; border: 1px solid white; }
        #inventory-modal { display: none; position: absolute; top: 60px; right: 0; width: 300px; max-height: 70vh; background-color: rgba(0, 0, 0, 0.8); backdrop-filter: blur(5px); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; padding: 15px; box-sizing: border-box; }
        #inventory-modal.visible { display: block; }
        #inventory-grid { display: flex; flex-wrap: wrap; gap: 10px; overflow-y: auto; max-height: calc(70vh - 70px); }
        .inventory-item { position: relative; width: 60px; height: 60px; background-color: rgba(255, 255, 255, 0.1); border-radius: 6px; padding: 5px; box-sizing: border-box; display: flex; justify-content: center; align-items: center; }
        .inventory-item img, .inventory-item svg { max-width: 100%; max-height: 100%; object-fit: contain; }
        .item-quantity { position: absolute; bottom: 2px; right: 4px; background-color: rgba(0, 0, 0, 0.7); color: #fff; padding: 1px 5px; border-radius: 10px; font-size: 12px; font-weight: bold; }
        #loading-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.8); color: white; display: flex; justify-content: center; align-items: center; font-size: 2em; z-index: 9999; transition: opacity 0.3s; pointer-events: none; opacity: 0; }
    `;
    
    // (El resto del script del juego no necesita cambios)
    const script = `
    let momentos = {};
    let datosVisuales = {};
    let recursosIndex = {};
    const momentoAParteMap = ${JSON.stringify(Object.fromEntries(momentoAParteMap))};
    const idInicio = "${sanitizedMomentoInicial}";

    const partesCargadas = new Set();
    const blobs = {};

    async function cargarDatosParte(partNumber) {
        if (partesCargadas.has(partNumber)) return;
        
        const dataElement = document.getElementById(\`game-data-part-\${partNumber}\`);
        if (!dataElement) return;

        const nuevaParte = JSON.parse(dataElement.textContent);
        dataElement.remove();

        Object.assign(momentos, nuevaParte.momentos);
        Object.assign(datosVisuales, nuevaParte.datosVisuales);
        Object.assign(recursosIndex, nuevaParte.recursosIndex);
        
        partesCargadas.add(partNumber);
    }

    function cargarBlobRecursos(partNumber) {
        if (!partNumber || blobs[partNumber]) return;
        
        console.log(\`Cargando blob de recursos para la Parte \${partNumber}...\`);
        const blobElement = document.getElementById(\`recursos-graficos-blob-\${partNumber}\`);
        if (blobElement) {
            blobs[partNumber] = blobElement.textContent;
            blobElement.remove();
        } else {
            blobs[partNumber] = '';
        }
    }

    function obtenerRecursoDeParte(key, partNumber) {
        if (!key || !partNumber) return null;
        if (!blobs[partNumber]) {
            cargarBlobRecursos(partNumber);
        }
        
        const index = recursosIndex[key];
        if (!index) return null;
        
        const [start, length] = index;
        return blobs[partNumber].substring(start, start + length);
    }

    let estadoLlaves = {};
    const accionesUsadas = new Set();
    let inventario = new Map();

    function renderizarInventario() { /* ... (Sin cambios) ... */ }

    async function mostrarMomento(sanitizedName) {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.style.opacity = '1';

        const partNumber = momentoAParteMap[sanitizedName];
        if (!partesCargadas.has(partNumber)) {
            await cargarDatosParte(partNumber);
        }

        const momento = momentos[sanitizedName];
        if (!momento) {
            console.error('Error: Momento no encontrado tras la carga', sanitizedName);
            loadingOverlay.style.opacity = '0';
            return;
        }

        if (momento.llavesActivar) momento.llavesActivar.forEach(k => { estadoLlaves[k] = true; });
        if (momento.llavesDesactivar) momento.llavesDesactivar.forEach(k => { estadoLlaves[k] = false; });
        if (momento.objetosGanar) momento.objetosGanar.forEach(o => { inventario.set(o, (inventario.get(o) || 0) + 1); });
        if (momento.objetosPerder) momento.objetosPerder.forEach(o => { const c = inventario.get(o); if (c > 1) inventario.set(o, c - 1); else if (c === 1) inventario.delete(o); });
        renderizarInventario();

        const bgImageEl = document.getElementById('game-image-bg');
        const svgBg = obtenerRecursoDeParte(momento.svgKey, partNumber);
        if (svgBg) { bgImageEl.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgBg))); }
        else { bgImageEl.src = obtenerRecursoDeParte(momento.imagenFallbackKey, partNumber) || ''; }

        const entitiesContainer = document.getElementById('game-entities-overlay');
        entitiesContainer.innerHTML = '';
        if (momento.entidades) {
            momento.entidades.forEach(entidad => {
                const eCont = document.createElement('div');
                eCont.className = 'entity-sprite';
                eCont.style.height = (entidad.tamaño || 45) + 'vh';
                eCont.style.marginBottom = ((entidad.altura || 0) * 0.3) + 'vh';
                const eSvg = obtenerRecursoDeParte(entidad.svgKey, partNumber);
                const eVis = datosVisuales[entidad.recurso];
                const eImg = eVis ? obtenerRecursoDeParte(eVis.imagenKey, partNumber) : null;
                if (eSvg) { eCont.innerHTML = eSvg; }
                else if(eImg) { const fImg = document.createElement('img'); fImg.src = eImg; fImg.style.width = '100%'; fImg.style.height = '100%'; eCont.appendChild(fImg); }
                entitiesContainer.appendChild(eCont);
            });
        }
        
        document.getElementById('game-title').textContent = momento.titulo;
        document.getElementById('game-description').innerHTML = momento.descripcion.replace(/\\n/g, "<br>");
        const actionsContainer = document.getElementById('game-actions');
        actionsContainer.innerHTML = ''; 
        if (momento.acciones) {
            momento.acciones.forEach(accion => {
                let esVisible = true;
                if (accion.condicionTipo === 'una_vez') esVisible = !accionesUsadas.has(sanitizedName + '|' + accion.textoBoton);
                else if (accion.condicionTipo === 'visible_si') esVisible = !!estadoLlaves[accion.condicionLlave];
                else if (accion.condicionTipo === 'invisible_si') esVisible = !estadoLlaves[accion.condicionLlave];
                if (esVisible) {
                    const button = document.createElement('button');
                    button.className = 'action-button';
                    button.textContent = accion.textoBoton;
                    button.onclick = () => { if (accion.condicionTipo === 'una_vez') accionesUsadas.add(sanitizedName + '|' + accion.textoBoton); mostrarMomento(accion.idDestino); };
                    actionsContainer.appendChild(button);
                }
            });
        }
        
        loadingOverlay.style.opacity = '0';

        if (momento.acciones) {
            const partesDestino = new Set(momento.acciones.map(a => momentoAParteMap[a.idDestino]).filter(Boolean));
            for(const partNum of partesDestino) {
                if (!partesCargadas.has(partNum)) {
                    await cargarDatosParte(partNum);
                }
                if (!blobs[partNum]) {
                    cargarBlobRecursos(partNum);
                }
            }
        }
    }
    
    async function hidratarJuego() {
        console.log("Activando UI y preparando precarga...");
        
        document.querySelectorAll('#game-actions .action-button').forEach(button => {
            const destino = button.dataset.destino;
            if(destino) {
                button.disabled = false;
                button.onclick = () => mostrarMomento(destino);
            }
        });

        const toggleBtn = document.getElementById('inventory-toggle-button');
        const modal = document.getElementById('inventory-modal');
        toggleBtn.addEventListener('click', e => { e.stopPropagation(); modal.classList.toggle('visible'); });
        document.addEventListener('click', e => { if (modal.classList.contains('visible') && !modal.contains(e.target) && !toggleBtn.contains(e.target)) modal.classList.remove('visible'); });

        const parteInicialNum = momentoAParteMap[idInicio];
        await cargarDatosParte(parteInicialNum);

        const momentoInicial = momentos[idInicio];
        if (momentoInicial) {
            if (momentoInicial.llavesActivar) momentoInicial.llavesActivar.forEach(k => { estadoLlaves[k] = true; });
            if (momentoInicial.objetosGanar) momentoInicial.objetosGanar.forEach(o => { inventario.set(o, (inventario.get(o) || 0) + 1); });
            renderizarInventario();
            
            setTimeout(() => {
                console.log("Iniciando precarga de recursos en segundo plano...");
                if (momentoInicial.acciones) {
                    const partesDestino = new Set(momentoInicial.acciones.map(a => momentoAParteMap[a.idDestino]).filter(Boolean));
                    partesDestino.forEach(p => {
                        cargarDatosParte(p).then(() => {
                            cargarBlobRecursos(p);
                        });
                    });
                }
            }, 100);
        }
        console.log("Juego listo e interactivo.");
    }
    
    document.addEventListener('DOMContentLoaded', hidratarJuego);
`;

    // 6. ENSAMBLAR EL HTML FINAL
    let partesEmbebidasHTML = '';
    for (let i = 0; i < datosPorParte.length; i++) {
        const parteData = datosPorParte[i];
        const dataPayload = {
            momentos: parteData.momentos,
            datosVisuales: parteData.datosVisuales,
            recursosIndex: parteData.recursosIndex
        };
        partesEmbebidasHTML += `<script type="text/plain" id="game-data-part-${i + 1}">${JSON.stringify(dataPayload).replace(/<\/script>/g, '<\\/script>')}</script>\n`;
        partesEmbebidasHTML += `<script type="text/plain" id="recursos-graficos-blob-${i + 1}">${parteData.megaStringBlob.replace(/<\/script>/g, '<\\/script>')}</script>\n`;
    }

    const htmlCompleto = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tituloProyecto}</title>
    <style>${css}</style>
</head>
<body>
    <div class="game-container">
        <div id="inventory-ui-container">
            <button id="inventory-toggle-button" title="Abrir Inventario">I<span id="inventory-item-count" class="item-count-badge">0</span></button>
            <div id="inventory-modal"><h2 style="text-align:center;margin-top:0;margin-bottom:15px;color:#fff;border-bottom:1px solid rgba(255,255,255,0.2);padding-bottom:10px;">Inventario</h2><div id="inventory-grid"></div></div>
        </div>
        <div id="loading-overlay">Cargando...</div>
        ${htmlEstaticoInicial}
    </div>
    ${partesEmbebidasHTML}
    <script>${script.replace(/<\/script>/g, '<\\/script>')}</script>
</body>
</html>`;

    const blob = new Blob([htmlCompleto], { type: 'text/html' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${tituloProyecto.replace(/\s+/g, '_')}_Juego_Hibrido.html`;
    a.click();
    console.log("Exportación de Videojuego (Híbrido) completada.");
}


/**
 * [NUEVO] - Genera un archivo HTML de un libro-juego imprimible y sin interacciones.
 * @param {string} nombreMomentoInicial - El NOMBRE del primer momento que se mostrará.
 */
async function generarBookgame(nombreMomentoInicial) {
    // --- NUEVO: LEER EL VALOR DE CALIDAD DEL SLIDER ---
    const qualityValue = document.getElementById('quality-slider')?.value || '92';
    const qualityForExport = parseInt(qualityValue, 10) / 100;
    console.log(`Iniciando exportación de Libro-Juego con calidad JPEG de: ${qualityForExport}`);

    const tituloProyecto = document.getElementById("titulo-proyecto").innerText;

    function sanitizarParaId(texto) {
        if (!texto) return '';
        return texto.trim()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9\s-]/g, "")
            .replace(/\s+/g, '-')
            .toLowerCase();
    }

    const nodosMomento = document.querySelectorAll('#momentos-lienzo .momento-nodo');

    const idToSanitizedNameMap = new Map();
    const sanitizedNameCheck = new Map();
    let hasDuplicates = false;
    let duplicateErrorMsg = 'Error: No se puede exportar. Se encontraron nombres de momentos que resultan en el mismo identificador. Por favor, renómbralos para que sean únicos:\n';

    for (const nodo of nodosMomento) {
        const id = nodo.id;
        const titulo = nodo.querySelector('.momento-titulo').textContent;
        const sanitizedTitulo = sanitizarParaId(titulo);
        if (sanitizedNameCheck.has(sanitizedTitulo)) {
            hasDuplicates = true;
            const originalDuplicateTitle = sanitizedNameCheck.get(sanitizedTitulo);
            if (!duplicateErrorMsg.includes(originalDuplicateTitle)) {
                 duplicateErrorMsg += `\n- "${originalDuplicateTitle}" y "${titulo}" (ambos generan "${sanitizedTitulo}")`;
            } else {
                 duplicateErrorMsg += `, y también "${titulo}"`;
            }
        } else if (sanitizedTitulo) {
            sanitizedNameCheck.set(sanitizedTitulo, titulo);
        }
        idToSanitizedNameMap.set(id, sanitizedTitulo);
    }
    if (hasDuplicates) {
        alert(duplicateErrorMsg);
        return;
    }

    // MODIFICADO: Recopilación de datos de momentos de forma asíncrona
    const momentosData = {};
    const sanitizedNameList = [];
    
    const momentoPromises = Array.from(nodosMomento).map(async (nodo) => {
        const titulo = nodo.querySelector('.momento-titulo').textContent;
        const sanitizedTitulo = idToSanitizedNameMap.get(nodo.id);
        const accionesOriginales = JSON.parse(nodo.dataset.acciones || '[]');
        const accionesMapeadas = accionesOriginales.map(accion => ({ ...accion, idDestino: idToSanitizedNameMap.get(accion.idDestino) || '' })).filter(accion => accion.idDestino);
        
        // Convertir la imagen de fallback con la calidad especificada
        const imagenFallbackOriginal = nodo.querySelector('.momento-imagen').src;
        const imagenFallbackConvertida = await convertirImagenABase64(imagenFallbackOriginal, qualityForExport);

        momentosData[sanitizedTitulo] = {
            titulo: titulo,
            descripcion: nodo.dataset.descripcion || '',
            acciones: accionesMapeadas,
            svg: nodo.dataset.svgIlustracion || '',
            imagenFallback: imagenFallbackConvertida || '', // Usar la imagen convertida
        };
        sanitizedNameList.push(sanitizedTitulo);
    });
    await Promise.all(momentoPromises); // Esperar a que todas las imágenes se procesen

    // 1. REASIGNAR ID's NUMÉRICOS A LOS PASAJES DE FORMA ALEATORIA
    const nombreInicialSanitizado = sanitizarParaId(nombreMomentoInicial);
    const pasajesMap = new Map();
    const shuffledNames = sanitizedNameList.filter(name => name !== nombreInicialSanitizado);
    
    for (let i = shuffledNames.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledNames[i], shuffledNames[j]] = [shuffledNames[j], shuffledNames[i]];
    }

    pasajesMap.set(nombreInicialSanitizado, 1);
    let pasajeNum = 2;
    for (const name of shuffledNames) {
        pasajesMap.set(name, pasajeNum++);
    }

    // 2. CREAR EL HTML PARA EL LIBRO-JUEGO
    const pasajesHTML = sanitizedNameList.sort((a,b) => pasajesMap.get(a) - pasajesMap.get(b)).map(sanitizedName => {
        const data = momentosData[sanitizedName];
        const numPasaje = pasajesMap.get(sanitizedName);
        
        // La comprobación ahora es más simple porque la conversión ya está hecha.
        const esImagenFallbackValida = data.imagenFallback && data.imagenFallback.startsWith('data:image');

        const imagenContent = data.svg 
            ? `<div class="pasaje-imagen-container">${data.svg}</div>` 
            : esImagenFallbackValida 
                ? `<img src="${data.imagenFallback}" class="pasaje-imagen" alt="Ilustración del pasaje ${numPasaje}">` 
                : '';
        
        const accionesHTML = data.acciones.map(accion => {
            const numDestino = pasajesMap.get(accion.idDestino);
            if (!numDestino) return '';
            return `<li>${accion.textoBoton}: Ve al pasaje ${numDestino}.</li>`;
        }).join('');

        return `
            <div class="pasaje" id="pasaje-${numPasaje}">
                <div class="pasaje-header">
                   <h8 class="pasaje-numero">${numPasaje}</h8>
                </div>
                <div class="pasaje-content">
                    <p class="pasaje-descripcion">${data.descripcion.replace(/\\n/g, "<br>")}</p>
                    ${imagenContent}
                    <ul class="pasaje-opciones">${accionesHTML}</ul>
                </div>
            </div>
        `;
    }).join('');

    const css = `
        body { font-family: 'Georgia', serif; line-height: 1.6; margin: 0; padding: 2em; background-color: #f4f4f4; color: #333; }
        .libro-container { max-width: 800px; margin: 0 auto; background: #fff; padding: 2em; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .pasaje { border-bottom: 1px solid #ddd; padding-bottom: 2em; margin-bottom: 2em; page-break-inside: avoid; }
        .pasaje-header { display: flex; align-items: baseline; gap: 1em; margin-bottom: 1em; }
        .pasaje-numero { font-size: 2em; color: #888; margin: 0; }
        .pasaje-descripcion { white-space: pre-wrap; margin-bottom: 1.5em; }
        .pasaje-imagen, .pasaje-imagen-container { max-width: auto; height: 300px;  margin-top: 1.5em; margin-bottom: 1.5em; position: relative; left: 50%; transform: translateX(-50%); margin: 1%; display: flex;}
        .pasaje-imagen-container { text-align: center; }
        .pasaje-imagen-container svg { max-width: 100%; height: auto; }
        .pasaje-opciones { list-style: none; padding-left: 0; margin: 0; }
        .pasaje-opciones li { font-style: italic; margin-bottom: 0.5em; }
        h8 {position: relative; left: 50%; transform: translateX(-50%); margin: 1%; display: flex; }
        @media print { body { background: #fff; } .libro-container { box-shadow: none; } }
    `;

    const htmlCompleto = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tituloProyecto} - Libro Juego</title>
    <style>${css}</style>
</head>
<body>
    <div class="libro-container">
        <h1>${tituloProyecto}</h1>
        <p><i> </i></p>
        ${pasajesHTML}
    </div>
</body>
</html>`;

    // 3. EXPORTAR EL ARCHIVO
    const blob = new Blob([htmlCompleto], { type: 'text/html' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${tituloProyecto.replace(/\s+/g, '_')}_LibroJuego.html`;
    a.click();
    console.log("Exportación de Libro-Juego completada.");
}


// --- FUNCIONES AUXILIARES DE LA INTERFAZ ---

function poblarSelectorMomentoInicial() {
    const selectMomentoInicial = document.getElementById('momento-inicial-id');
    if (!selectMomentoInicial) return;
    const nodosMomento = document.querySelectorAll('#momentos-lienzo .momento-nodo');
    const valorSeleccionadoPreviamente = selectMomentoInicial.value;
    selectMomentoInicial.innerHTML = '';
    if (nodosMomento.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No hay momentos creados";
        option.disabled = true;
        selectMomentoInicial.appendChild(option);
        return;
    }
    const placeholder = document.createElement('option');
    placeholder.value = "";
    placeholder.textContent = "Selecciona un momento inicial...";
    selectMomentoInicial.appendChild(placeholder);
    nodosMomento.forEach(nodo => {
        const option = document.createElement('option');
        const titulo = nodo.querySelector('.momento-titulo').textContent.trim();
        option.value = titulo; 
        option.textContent = titulo;
        selectMomentoInicial.appendChild(option);
    });
    selectMomentoInicial.value = valorSeleccionadoPreviamente;
}

// NOTA: Debes decidir qué versión del juego exportar.
// Aquí se llama a la versión híbrida por defecto.
function iniciarExportacionJuego() {
    const momentoInicialSelect = document.getElementById('momento-inicial-id');
    const nombreMomentoInicial = momentoInicialSelect.value;
    if (!nombreMomentoInicial) {
        alert("Por favor, selecciona un momento inicial para comenzar el juego.");
        return;
    }
    // Llama a la versión que prefieras, por ejemplo, la híbrida:
    generarGAME_hibrido(nombreMomentoInicial); 
}

function iniciarExportacionLibroJuego() {
    const momentoInicialSelect = document.getElementById('momento-inicial-id');
    const nombreMomentoInicial = momentoInicialSelect.value;
    if (!nombreMomentoInicial) {
        alert("Por favor, selecciona un momento inicial para comenzar el libro-juego.");
        return;
    }
    generarBookgame(nombreMomentoInicial);
}