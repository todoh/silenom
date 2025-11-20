 
// Almacena las posiciones de los datos en el lienzo.
let posicionesDatos = [];
const ANCHO_ELEMENTO = 150;
const ALTO_ELEMENTO = 180;
const LIENZO_ANCHO = 16000;
const LIENZO_ALTO = 16000;
 
let escalaLienzo = 1;
let panX = 0;
let panY = 0;
const ESCALA_MIN = 0.1;
const ESCALA_MAX = 3.0;
const FACTOR_ZOOM = 1.1;
/**
 * Añade la lógica de arrastrar y soltar a un elemento de dato.
 * @param {HTMLElement} elemento - El elemento .personaje al que se le añadirá la funcionalidad.
 */
 

/**
 * Guarda o actualiza la posición de un elemento en el array de posiciones.
 * @param {string} id - El nombre/ID del dato.
 * @param {number} x - Coordenada X.
 * @param {number} y - Coordenada Y.
 */
function guardarPosicionDato(id, x, y) {
    if (!id) return; // Salvaguarda para evitar IDs nulos
    const indiceExistente = posicionesDatos.findIndex(p => p.id === id);
    if (indiceExistente > -1) {
        posicionesDatos[indiceExistente].x = x;
        posicionesDatos[indiceExistente].y = y;
    } else {
        posicionesDatos.push({ id, x, y });
    }
}


 

/**
 * Calcula y aplica el desplazamiento (pan) necesario para centrar la vista
 * en el medio del lienzo principal.
 */
function centrarVistaEnLienzo() {
    const viewport = document.getElementById('personajes');
    if (!viewport) return;

    // Reseteamos la escala a 1 para un centrado predecible
    escalaLienzo = 1;

    // Calculamos el panX: la mitad del ancho de la pantalla menos la mitad del ancho del lienzo.
    // Esto asegura que el punto central del lienzo se alinee con el punto central de la pantalla.
    panX = (viewport.clientWidth / 2) - (LIENZO_ANCHO / 2);
    panY = (viewport.clientHeight / 2) - (LIENZO_ALTO / 2);

    // Aplicamos la transformación al lienzo para que el cambio sea visible.
    aplicarTransformacionLienzo();
    console.log("La vista ha sido centrada en el lienzo.");
}
 
 
/**
 * -- VERSIÓN 3 (CORREGIDA) CON GRID DINÁMICO --
 * Ordena y posiciona carpetas y stickers sueltos, respetando el tamaño
 * real de cada elemento para evitar solapamientos.
 */
function ordenarDatosPorCriterios() {
    const escaparate = document.getElementById('lienzo-visual');
    const contenedorVista = document.getElementById('personajes');
    if (!escaparate || !contenedorVista) {
        console.error("Error: No se encontraron los contenedores '#lienzo-visual' o '#personajes'.");
        return;
    }

    // --- 1. SELECCIÓN DE ELEMENTOS ---
    const carpetas = Array.from(escaparate.querySelectorAll('.dato-carpeta'));
    const stickersSueltos = Array.from(escaparate.querySelectorAll('.personaje-sticker:not([data-carpeta-id]):not([style*="display: none"])'));

    // --- 2. ORDENACIÓN ---
    
    // A. Ordenar carpetas por nombre
    carpetas.sort((a, b) => {
        const nombreA = a.querySelector('.carpeta-titulo')?.textContent.toLowerCase() || '';
        const nombreB = b.querySelector('.carpeta-titulo')?.textContent.toLowerCase() || '';
        return nombreA.localeCompare(nombreB);
    });

    // B. Ordenar stickers sueltos
    const ordenArcos = new Map(opcionesArco.map((op, index) => [op.valor, index]));
    const ordenEtiquetas = new Map(opcionesEtiqueta.map((op, index) => [op.valor, index]));
    
    stickersSueltos.sort((stickerA, stickerB) => {
        // ... (La lógica de ordenación interna de stickers es la misma que antes) ...
        const datoPesadoA = document.querySelector(`#listapersonajes .personaje[data-id="${stickerA.dataset.id}"]`);
        const datoPesadoB = document.querySelector(`#listapersonajes .personaje[data-id="${stickerB.dataset.id}"]`);
        if (!datoPesadoA || !datoPesadoB) return 0;
        const arcA = datoPesadoA.querySelector('.change-arc-btn')?.dataset.arco || 'sin_arco';
        const tagA = datoPesadoA.querySelector('.change-tag-btn')?.dataset.etiqueta || 'indeterminado';
        const nombreA = datoPesadoA.querySelector('.nombreh')?.value.trim().toLowerCase() || '';
        const arcB = datoPesadoB.querySelector('.change-arc-btn')?.dataset.arco || 'sin_arco';
        const tagB = datoPesadoB.querySelector('.change-tag-btn')?.dataset.etiqueta || 'indeterminado';
        const nombreB = datoPesadoB.querySelector('.nombreh')?.value.trim().toLowerCase() || '';
        const ordenArcoA = ordenArcos.has(arcA) ? ordenArcos.get(arcA) : Infinity;
        const ordenArcoB = ordenArcos.has(arcB) ? ordenArcos.get(arcB) : Infinity;
        if (ordenArcoA !== ordenArcoB) return ordenArcoA - ordenArcoB;
        const ordenEtiquetaA = ordenEtiquetas.has(tagA) ? ordenEtiquetas.get(tagA) : Infinity;
        const ordenEtiquetaB = ordenEtiquetas.has(tagB) ? ordenEtiquetas.get(tagB) : Infinity;
        if (ordenEtiquetaA !== ordenEtiquetaB) return ordenEtiquetaA - ordenEtiquetaB;
        return nombreA.localeCompare(nombreB);
    });

    // --- 3. COMBINACIÓN ---
    const itemsAPosicionar = [...carpetas, ...stickersSueltos];
    const numItems = itemsAPosicionar.length;
    if (numItems === 0) return;

    // --- 4. CÁLCULO DE GRID DINÁMICO ---
    const MARGEN_GRID_X = 60; // Espacio horizontal entre items
    const MARGEN_GRID_Y = 80; // Espacio vertical entre filas
    
    // Ancho de fila más ancho para una mejor distribución
    const itemsPorFila = Math.max(1, Math.floor(Math.sqrt(numItems * 2.0))); 
    
    // Estimamos el ancho del grid para centrar el 'startX'
    // Usamos un ancho promedio conservador de 300px por item
    const anchoGridEstimado = itemsPorFila * (300 + MARGEN_GRID_X);
    const startX = (LIENZO_ANCHO - anchoGridEstimado) / 2;
    // Empezamos en una Y fija (cerca del centro vertical del lienzo)
    const startY = (LIENZO_ALTO / 2) - 1000; 

    let currentX = startX;
    let currentY = startY;
    let itemsEnFila = 0;
    let maxRowHeight = 0; // <-- LA CLAVE: Altura máxima de la fila actual

    // --- 5. POSICIONAMIENTO ---
    itemsAPosicionar.forEach(item => {
        const idElemento = item.dataset.id;
        if (!idElemento) return;

        // Obtenemos las dimensiones REALES del elemento
        const itemWidth = item.offsetWidth;
        const itemHeight = item.offsetHeight;

        // Actualizamos la altura máxima de esta fila
        maxRowHeight = Math.max(maxRowHeight, itemHeight);

        // Calculamos el delta de movimiento
        const oldX = item.offsetLeft;
        const oldY = item.offsetTop;
        const newX = currentX;
        const newY = currentY;
        const deltaX = newX - oldX;
        const deltaY = newY - oldY;

        // Aplicar animación y nueva posición al item principal (carpeta o sticker suelto)
        item.style.transition = 'left 0.5s ease, top 0.5s ease';
        item.style.left = `${newX}px`;
        item.style.top = `${newY}px`;
        guardarPosicionDato(idElemento, newX, newY);
        setTimeout(() => item.style.transition = '', 500);

        // SI ES UNA CARPETA, mover a todos sus hijos por el mismo delta
        if (item.classList.contains('dato-carpeta')) {
            const hijos = document.querySelectorAll(`.personaje-sticker[data-carpeta-id="${idElemento}"]`);
            
            hijos.forEach(hijo => {
                const hijoOldX = hijo.offsetLeft;
                const hijoOldY = hijo.offsetTop;
                const hijoNewX = hijoOldX + deltaX;
                const hijoNewY = hijoOldY + deltaY;

                hijo.style.transition = 'left 0.5s ease, top 0.5s ease';
                hijo.style.left = `${hijoNewX}px`;
                hijo.style.top = `${hijoNewY}px`;
                guardarPosicionDato(hijo.dataset.id, hijoNewX, hijoNewY);
                setTimeout(() => hijo.style.transition = '', 500);
            });
        }

        // --- Incremento de posición del grid (DINÁMICO) ---
        
        // El siguiente 'X' se basa en el ANCHO REAL del item actual
        currentX += itemWidth + MARGEN_GRID_X; 
        itemsEnFila++;

        // Si la fila está llena
        if (itemsEnFila >= itemsPorFila) {
            currentX = startX; // Reset X
            // El siguiente 'Y' se basa en la ALTURA MÁXIMA de la fila que acabamos de terminar
            currentY += maxRowHeight + MARGEN_GRID_Y; 
            itemsEnFila = 0; // Reset contador de fila
            maxRowHeight = 0; // Reset altura máxima para la nueva fila
        }
    });
    
    // --- 6. CENTRAR VISTA ---
    // Calculamos el centro real del grid ahora que conocemos sus límites
    let minX = Infinity, maxX = -Infinity, minY = startY, maxY = currentY + maxRowHeight;
    itemsAPosicionar.forEach(item => {
        minX = Math.min(minX, item.offsetLeft);
        maxX = Math.max(maxX, item.offsetLeft + item.offsetWidth);
    });

    const centroGridX = minX + (maxX - minX) / 2;
    const centroGridY = minY + (maxY - minY) / 2;
    
    escalaLienzo = 1; // Reseteamos el zoom
    panX = (contenedorVista.clientWidth / 2) - centroGridX;
    panY = (contenedorVista.clientHeight / 2) - centroGridY;
    
    if (typeof aplicarTransformacionLienzo === 'function') {
        // Aplicamos la transformación con la transición suave que definimos en panToPosition
        const lienzo = document.getElementById('lienzo-visual');
        if (lienzo) {
            lienzo.style.transition = 'transform 0.5s ease-out';
            aplicarTransformacionLienzo();
            setTimeout(() => {
                lienzo.style.transition = '';
            }, 500);
        } else {
            aplicarTransformacionLienzo();
        }
    } else {
        escaparate.style.transform = `translate(${panX}px, ${panY}px) scale(${escalaLienzo})`;
    }

    console.log("Grid dinámico aplicado. Carpetas y stickers ordenados sin solapamiento.");
}
function inicializarInteraccionPersonajes() {
    // Listener global para CERRAR CUALQUIER editor abierto.
    document.addEventListener('click', (e) => {
        const personajeActivo = document.querySelector('.personaje.editing');
        
        // Si hay un editor activo Y el clic fue fuera de él Y no fue en un menú emergente...
        if (personajeActivo && !e.target.closest('.personaje.editing') && !e.target.closest('.menu-etiquetas')) {
            
            // ...entonces cierra el editor.
            personajeActivo.classList.remove('editing');
            
            // Lógica de limpieza para el visor 3D y SVG al cerrar
            if (personajeActivo.miniViewer) {
                personajeActivo.miniViewer.cleanup();
                personajeActivo.miniViewer = null;
            }
            const svgPreviewContainer = personajeActivo.querySelector('.edit-svg-preview');
            if (svgPreviewContainer) {
                svgPreviewContainer.innerHTML = '';
            }
        }
    }, true);
}

// --- ESTE ES EL BLOQUE CORREGIDO ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializa los sistemas base
    inicializarInteraccionPersonajes();
    inicializarControlesDeFiltro();
    inicializarPrevisualizacion3DEnVivo();
    inicializarPanningDatos();
    inicializarZoomConRueda();
 
    renderizarCapaVisual();
    
     ordenarDatosPorCriterios();
        centrarVistaEnLienzo();

 });


 
/**
 * Barre el lienzo visual, lee la posición actual de CADA ELEMENTO (stickers Y carpetas)
 * y actualiza el array `posicionesDatos` para asegurar que está sincronizado.
 * Esta es una función de seguridad para llamar antes de guardar.
 */
function actualizarPosicionesDesdeLienzo() {
    console.log("[Sincronización] Actualizando el array de posiciones desde el estado visual del lienzo...");
    
    // --- ESTA ES LA LÍNEA CORREGIDA ---
    // Ahora selecciona AMBOS, stickers y carpetas.
    const elementos = document.querySelectorAll('#lienzo-visual .personaje-sticker, #lienzo-visual .dato-carpeta');
    const nuevasPosiciones = [];

    elementos.forEach(el => {
        const idDato = el.dataset.id;
        if (idDato) { // Nos aseguramos de que tiene un ID
            nuevasPosiciones.push({
                id: idDato, 
                x: el.offsetLeft,
                y: el.offsetTop
            });
        }
    });

    // Reemplazamos el array antiguo por el nuevo, fresco y actualizado
    posicionesDatos = nuevasPosiciones;
    console.log(`[Sincronización] Actualización completada. Se registraron ${posicionesDatos.length} posiciones.`);
}
/**
 * Comprueba si una posición y dimensiones de un sticker son visibles en el viewport actual.
 * @param {number} x - Coordenada X de la esquina superior izquierda del sticker.
 * @param {number} y - Coordenada Y de la esquina superior izquierda del sticker.
 * @returns {boolean} True si el sticker está (al menos parcialmente) a la vista.
 */
function isPositionInView(x, y) {
    const viewport = document.getElementById('personajes');
    if (!viewport) return false;

    // Calcula los límites de la vista actual en coordenadas del lienzo
    const viewLeft = -panX / escalaLienzo;
    const viewTop = -panY / escalaLienzo;
    const viewRight = (-panX + viewport.clientWidth) / escalaLienzo;
    const viewBottom = (-panY + viewport.clientHeight) / escalaLienzo;

    // Calcula los límites del sticker
    const stickerRight = x + ANCHO_ELEMENTO;
    const stickerBottom = y + ALTO_ELEMENTO;

    // Comprueba si hay solapamiento entre la vista y el sticker
    const overlapsX = (x < viewRight && stickerRight > viewLeft);
    const overlapsY = (y < viewBottom && stickerBottom > viewTop);

    return overlapsX && overlapsY;
}


// --- REEMPLAZA LA FUNCIÓN findNearestFreePosition EXISTENTE POR ESTA ---

/**
 * VERSIÓN ACTUALIZADA
 * Busca la posición libre más cercana a un punto de inicio usando un patrón de espiral
 * que se mueve en el sentido: Izquierda -> Arriba -> Derecha -> Abajo.
 * @param {number} startX - La coordenada X inicial.
 * @param {number} startY - La coordenada Y inicial.
 * @returns {{x: number, y: number}} La primera posición libre encontrada.
 */
function findNearestFreePosition(startX, startY) {
    const MIN_DISTANCE = 200;
    const STEP_SIZE = MIN_DISTANCE;
    const MAX_SEARCH_RADIUS = 20;

    const isOccupied = (x, y) => {
        return posicionesDatos.some(p => {
            const dx = p.x - x;
            const dy = p.y - y;
            return Math.sqrt(dx * dx + dy * dy) < MIN_DISTANCE;
        });
    };

    if (!isOccupied(startX, startY)) {
        return { x: startX, y: startY };
    }

    let x = startX;
    let y = startY;
    // AJUSTE: Cambiamos el orden de la dirección para que coincida con lo solicitado
    let direction = 0; // 0: Izquierda, 1: Arriba, 2: Derecha, 3: Abajo
    let stepsInDirection = 1;
    let stepCount = 0;
    let turnCount = 0;

    for (let i = 0; i < MAX_SEARCH_RADIUS * MAX_SEARCH_RADIUS; i++) {
        // Mover a la siguiente posición en la espiral
        switch (direction) {
            case 0: x -= STEP_SIZE; break; // Izquierda
            case 1: y -= STEP_SIZE; break; // Arriba (en coordenadas de pantalla, Y disminuye)
            case 2: x += STEP_SIZE; break; // Derecha
            case 3: y += STEP_SIZE; break; // Abajo
        }
        stepCount++;

        if (!isOccupied(x, y)) {
            return { x, y };
        }

        if (stepCount === stepsInDirection) {
            stepCount = 0;
            direction = (direction + 1) % 4;
            turnCount++;
            if (turnCount === 2) {
                turnCount = 0;
                stepsInDirection++;
            }
        }
    }

    return { x: startX, y: startY };
}


/**
 * Desplaza suavemente la vista del lienzo para centrarse en una posición específica.
 * @param {number} targetX - La coordenada X del centro del sticker a enfocar.
 * @param {number} targetY - La coordenada Y del centro del sticker a enfocar.
 */
function panToPosition(targetX, targetY) {
    const lienzo = document.getElementById('lienzo-visual');
    const viewport = document.getElementById('personajes');
    if (!lienzo || !viewport) return;

    const anchoSticker = 150;
    const altoSticker = 150;
    
    // Calculamos el centro del sticker
    const stickerCenterX = targetX + anchoSticker / 2;
    const stickerCenterY = targetY + altoSticker / 2;

    // Calculamos el nuevo 'pan' necesario para que el centro del sticker
    // coincida con el centro del viewport.
    panX = (viewport.clientWidth / 2) - (stickerCenterX * escalaLienzo);
    panY = (viewport.clientHeight / 2) - (stickerCenterY * escalaLienzo);

    // Aplicamos una transición suave, la movemos y luego quitamos la transición.
    lienzo.style.transition = 'transform 0.5s ease-out';
    aplicarTransformacionLienzo();

    setTimeout(() => {
        lienzo.style.transition = '';
    }, 500);
}


/**
 * Comprueba si el centro de un sticker está dentro de una "zona de confort" en la pantalla,
 * definida por un porcentaje de margen desde los bordes.
 * @param {number} x - Coordenada X de la esquina superior izquierda del sticker.
 * @param {number} y - Coordenada Y de la esquina superior izquierda del sticker.
 * @param {number} marginPercentage - El porcentaje de margen (ej. 0.15 para 15%).
 * @returns {boolean} True si el sticker está cómodamente a la vista.
 */
function isPositionComfortablyInView(x, y, marginPercentage) {
    const viewport = document.getElementById('personajes');
    if (!viewport) return false;

    // 1. Calcular el centro del sticker en coordenadas del lienzo.
    const stickerCenterX = x + (ANCHO_ELEMENTO / 2);
    const stickerCenterY = y + (ALTO_ELEMENTO / 2);

    // 2. Convertir el centro del sticker a coordenadas de la PANTALLA (o viewport).
    const stickerViewX = (stickerCenterX * escalaLienzo) + panX;
    const stickerViewY = (stickerCenterY * escalaLienzo) + panY;

    // 3. Definir la "zona de confort" dentro del viewport.
    const marginX = viewport.clientWidth * marginPercentage;
    const marginY = viewport.clientHeight * marginPercentage;

    const comfortLeft = marginX;
    const comfortRight = viewport.clientWidth - marginX;
    const comfortTop = marginY;
    const comfortBottom = viewport.clientHeight - marginY;

    // 4. Comprobar si el centro del sticker está dentro de esta zona.
    const isInComfortZone = (
        stickerViewX > comfortLeft &&
        stickerViewX < comfortRight &&
        stickerViewY > comfortTop &&
        stickerViewY < comfortBottom
    );

    return isInComfortZone;
}
// EN: datos-lienzo.js
// --- AÑADIR TODAS ESTAS NUEVAS FUNCIONES AL FINAL DEL ARCHIVO ---

const CARPETA_PADDING = 30;
const CARPETA_TITLE_HEIGHT = 20;

/**
 * Crea un nuevo elemento de carpeta y lo añade al lienzo.
 */
function crearNuevaCarpeta() {
    const lienzo = document.getElementById('lienzo-visual');
    const viewport = document.getElementById('personajes');
    if (!lienzo || !viewport) return;

    const carpetaEl = document.createElement('div');
    const id = `carpeta-id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    carpetaEl.className = 'dato-carpeta';
    carpetaEl.dataset.id = id;

    const tituloEl = document.createElement('div');
    tituloEl.className = 'carpeta-titulo';
    tituloEl.textContent = 'Nueva Carpeta';
    tituloEl.title = 'Haz doble clic para renombrar';
    carpetaEl.appendChild(tituloEl);

    // --- Lógica para renombrar ---
    tituloEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const nombreActual = tituloEl.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'carpeta-titulo-edit';
        input.value = nombreActual;
        
        tituloEl.replaceWith(input);
        input.focus();
        input.select();

        const guardarNombre = () => {
            const nuevoNombre = input.value.trim() || 'Carpeta sin nombre';
            tituloEl.textContent = nuevoNombre;
            input.replaceWith(tituloEl);
            // Aquí deberías guardar el nombre en tu array de carpetas para persistencia
        };
        input.addEventListener('blur', guardarNombre);
        input.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') input.blur();
            if (ev.key === 'Escape') {
                input.value = nombreActual;
                input.blur();
            }
        });
    });
_crearBotonEliminarCarpeta(carpetaEl); // Añadimos el botón de eliminar
    // --- Posicionarla en el centro de la vista actual ---
    const centroVistaX = (viewport.clientWidth / 2 - panX) / escalaLienzo;
    const centroVistaY = (viewport.clientHeight / 2 - panY) / escalaLienzo;
    
    // Usamos la función de encontrar posición libre
    const pos = findNearestFreePosition(centroVistaX - 110, centroVistaY - 90);
    carpetaEl.style.left = `${pos.x}px`;
    carpetaEl.style.top = `${pos.y}px`;

    lienzo.appendChild(carpetaEl);
    hacerCarpetaArrastrable(carpetaEl);
    guardarPosicionDato(id, pos.x, pos.y);
}

/**
 * Aplica la lógica de arrastre a una carpeta.
 * Arrastrar la carpeta mueve la carpeta Y TODOS los stickers asociados a ella.
 * @param {HTMLElement} carpetaEl - El elemento .dato-carpeta
 */
function hacerCarpetaArrastrable(carpetaEl) {
    const handle = carpetaEl.querySelector('.carpeta-titulo');
    let dragOffsets = new Map(); // Almacenará los offsets de la carpeta Y sus hijos
    let lastX, lastY;

    handle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();

        const carpetaId = carpetaEl.dataset.id;
        carpetaEl.classList.add('dragging');
        
        lastX = e.clientX;
        lastY = e.clientY;

        dragOffsets.clear();
        
        // 1. Guardar offset de la propia carpeta
        dragOffsets.set(carpetaId, { 
            el: carpetaEl, 
            x: carpetaEl.offsetLeft, 
            y: carpetaEl.offsetTop 
        });

        // 2. Guardar offset de TODOS los stickers hijos
        const hijos = document.querySelectorAll(`.personaje-sticker[data-carpeta-id="${carpetaId}"]`);
        hijos.forEach(hijo => {
            dragOffsets.set(hijo.dataset.id, {
                el: hijo,
                x: hijo.offsetLeft,
                y: hijo.offsetTop
            });
        });

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        const dx = (e.clientX - lastX) / escalaLienzo;
        const dy = (e.clientY - lastY) / escalaLienzo;

        // Mover todos los elementos (carpeta e hijos) según el delta
        dragOffsets.forEach(item => {
            item.el.style.left = `${item.x + dx}px`;
            item.el.style.top = `${item.y + dy}px`;
        });
    }

    function onMouseUp(e) {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        
        carpetaEl.classList.remove('dragging');

        const dx = (e.clientX - lastX) / escalaLienzo;
        const dy = (e.clientY - lastY) / escalaLienzo;

        // Guardar la posición final de todos los elementos
        dragOffsets.forEach((item, id) => {
            const finalX = item.x + dx;
            const finalY = item.y + dy;
            guardarPosicionDato(id, finalX, finalY); // Usamos la función de guardado existente
        });
        
        dragOffsets.clear();
    }
}

/**
 * Recalcula y ajusta el tamaño y posición de una carpeta
 * para que contenga a todos sus stickers hijos.
 * @param {HTMLElement} carpetaEl - El elemento .dato-carpeta
 */
function actualizarLimitesCarpeta(carpetaEl) {
    if (!carpetaEl) return;

    const carpetaId = carpetaEl.dataset.id;
    const hijos = document.querySelectorAll(`.personaje-sticker[data-carpeta-id="${carpetaId}"]`);

    if (hijos.length === 0) {
        // Si no tiene hijos, vuelve a su tamaño mínimo
        carpetaEl.style.width = '';
        carpetaEl.style.height = '';
        return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    hijos.forEach(hijo => {
        minX = Math.min(minX, hijo.offsetLeft);
        minY = Math.min(minY, hijo.offsetTop);
        maxX = Math.max(maxX, hijo.offsetLeft + hijo.offsetWidth);
        maxY = Math.max(maxY, hijo.offsetTop + hijo.offsetHeight);
    });

    // Calculamos las nuevas dimensiones y posición de la carpeta
    const newLeft = minX - CARPETA_PADDING;
    const newTop = minY - CARPETA_PADDING - CARPETA_TITLE_HEIGHT;
    const newWidth = (maxX - minX) + (2 * CARPETA_PADDING);
    const newHeight = (maxY - minY) + (2 * CARPETA_PADDING) + CARPETA_TITLE_HEIGHT;

    // Aplicamos con una transición suave
    carpetaEl.style.transition = 'left 0.3s, top 0.3s, width 0.3s, height 0.3s';
    
    carpetaEl.style.left = `${newLeft}px`;
    carpetaEl.style.top = `${newTop}px`;
    carpetaEl.style.width = `${newWidth}px`;
    carpetaEl.style.height = `${newHeight}px`;

    // Guardamos la nueva posición de la carpeta
    guardarPosicionDato(carpetaId, newLeft, newTop);

    setTimeout(() => {
        carpetaEl.style.transition = '';
    }, 300);
}

/**
 * Función para renderizar las carpetas al cargar un proyecto.
 * DEBE SER LLAMADA DESPUÉS de que 'posicionesDatos' esté poblado.
 * @param {Array<object>} carpetasData - Array de {id, nombre}
 */
function renderizarCarpetasDesdeDatos(carpetasData = []) {
    const lienzo = document.getElementById('lienzo-visual');
    if (!lienzo) return;

    carpetasData.forEach(data => {
        const pos = posicionesDatos.find(p => p.id === data.id);
        if (!pos) {
            console.warn(`No se encontró posición para la carpeta con id ${data.id}`);
            return;
        }

        const carpetaEl = document.createElement('div');
        carpetaEl.className = 'dato-carpeta';
        carpetaEl.dataset.id = data.id;
        carpetaEl.style.left = `${pos.x}px`;
        carpetaEl.style.top = `${pos.y}px`;

        const tituloEl = document.createElement('div');
        tituloEl.className = 'carpeta-titulo';
        tituloEl.textContent = data.nombre || 'Carpeta';
        tituloEl.title = 'Haz doble clic para renombrar';
        carpetaEl.appendChild(tituloEl);

        // Añadir lógica de renombrar (duplicada de crearNuevaCarpeta)
        tituloEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            const nombreActual = tituloEl.textContent;
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'carpeta-titulo-edit';
            input.value = nombreActual;
            
            tituloEl.replaceWith(input);
            input.focus();
            input.select();

            const guardarNombre = () => {
                const nuevoNombre = input.value.trim() || 'Carpeta sin nombre';
                tituloEl.textContent = nuevoNombre;
                input.replaceWith(tituloEl);
            };
            input.addEventListener('blur', guardarNombre);
            input.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') input.blur();
                if (ev.key === 'Escape') {
                    input.value = nombreActual;
                    input.blur();
                }
            });
        });
        _crearBotonEliminarCarpeta(carpetaEl); // Añadimos el botón de eliminar
        lienzo.appendChild(carpetaEl);
        hacerCarpetaArrastrable(carpetaEl);
    });
}
// EN: datos-lienzo.js
// --- AÑADIR ESTAS DOS FUNCIONES NUEVAS AL FINAL ---

/**
 * Crea y añade el botón de eliminar a un elemento de carpeta.
 * @param {HTMLElement} carpetaEl - El elemento .dato-carpeta
 */
function _crearBotonEliminarCarpeta(carpetaEl) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'carpeta-delete-btn';
    deleteBtn.innerHTML = '&times;'; // Una 'X' elegante
    deleteBtn.title = 'Eliminar Carpeta';

    deleteBtn.onclick = (e) => {
        e.stopPropagation(); // Evita que se active el arrastre de la carpeta
        eliminarCarpeta(carpetaEl);
    };
    
    carpetaEl.appendChild(deleteBtn);
}

/**
 * Lógica para eliminar una carpeta.
 * Los stickers que contenía quedan "huérfanos" en el lienzo.
 * @param {HTMLElement} carpetaEl - El elemento .dato-carpeta a eliminar
 */
function eliminarCarpeta(carpetaEl) {
    const nombre = carpetaEl.querySelector('.carpeta-titulo')?.textContent || 'esta carpeta';
    if (!confirm(`¿Estás seguro de que quieres eliminar "${nombre}"?\n\nLos datos que contiene NO se borrarán, quedarán en el lienzo.`)) {
        return;
    }

    const carpetaId = carpetaEl.dataset.id;
    if (!carpetaId) return;

    // 1. Encontrar todos los stickers hijos y "liberarlos"
    const hijos = document.querySelectorAll(`.personaje-sticker[data-carpeta-id="${carpetaId}"]`);
    hijos.forEach(hijo => {
        delete hijo.dataset.carpetaId;
        // Opcional: ¿actualizar el dato pesado también? Por ahora no es crítico.
    });

    // 2. Eliminar la carpeta del DOM
    carpetaEl.remove();

    // 3. Eliminar la carpeta del array de posiciones
    posicionesDatos = posicionesDatos.filter(p => p.id !== carpetaId);
    console.log(`Carpeta ${carpetaId} eliminada.`);
}

/**
 * Aplica un array de posiciones a los elementos correspondientes en el lienzo.
 * @param {Array<object>} posiciones - Un array de {id, x, y}.
 */
function aplicarPosicionesAlLienzo(posiciones) {
    if (!Array.isArray(posiciones)) return;
    const lienzo = document.getElementById('lienzo-visual');
    if (!lienzo) return;

    posiciones.forEach(pos => {
        // Selecciona cualquier elemento (sticker o carpeta) con ese ID
        const el = lienzo.querySelector(`[data-id="${pos.id}"]`);
        if (el) {
            el.style.left = `${pos.x}px`;
            el.style.top = `${pos.y}px`;
        }
    });
}