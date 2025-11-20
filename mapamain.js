 

const editMapBtn = document.getElementById('edit-map-btn');
const createMapBtn = document.getElementById('create-map-btn');

// Renombramos la referencia anterior para más claridad
const geminiPromptInput = document.getElementById('gemini-prompt');
// const generatePoisBtn = document.getElementById('generate-pois-btn'); // Ya no existe


// --- Obtención de los Canvas ---
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');
const drawCanvas = document.getElementById('draw-canvas');
const drawCtx = drawCanvas.getContext('2d');
const poiCanvas = document.getElementById('poi-canvas');
const poiCtx = poiCanvas.getContext('2d');

const canvasWrapper = document.getElementById('canvas-wrapper3');
const canvasContainer = document.getElementById('canvas-container3');

// --- Controles UI ---
const bgUpload = document.getElementById('bg-upload');
const resetBgBtn = document.getElementById('reset-bg');
const saveJsonBtn = document.getElementById('save-json');
const loadJsonInput = document.getElementById('load-json');
const exportImageBtn = document.getElementById('export-image');
const exportBtn = document.getElementById('export-html');
const exportPoisJsonBtn = document.getElementById('export-pois-json');
const copyPoisJsonBtn = document.getElementById('copy-pois-json');


// --- Controles de Herramientas ---
// --- Controles de Herramientas ---
const toolButtons = {
    poi: document.getElementById('tool-select-poi'),
    continent: document.getElementById('tool-draw-continent'),
    river: document.getElementById('tool-draw-river'),
    forest: document.getElementById('tool-draw-forest'),
    // --- AÑADIR ESTAS LÍNEAS ---
    mountain: document.getElementById('tool-draw-mountain'),
    lake: document.getElementById('tool-draw-lake'),
    peak: document.getElementById('tool-draw-peak'), // Asumimos que los picos se dibujan igual que las montañas
    crop: document.getElementById('tool-draw-crop'),
    plateau: document.getElementById('tool-draw-plateau'),
    plain: document.getElementById('tool-draw-plain'),
    swamp: document.getElementById('tool-draw-swamp'),
      desert: document.getElementById('tool-draw-desert'),
      
    editGeo: document.getElementById('tool-edit-geo')
};
const drawingControls = document.getElementById('drawing-controls');
const finishDrawBtn = document.getElementById('finish-draw-btn');
const cancelDrawBtn = document.getElementById('cancel-draw-btn');
const drawingStatus = document.getElementById('drawing-status');

// --- Controles de POI ---
const poiControls = document.getElementById('poi-controls');
const addPoiBtn = document.getElementById('add-poi');
const emojiInput = document.getElementById('emoji-input');
const textInput = document.getElementById('text-input');
const emojiPicker = document.getElementById('emoji-picker');

// --- Controles de Tamaño ---
const canvasWidthInput = document.getElementById('canvas-width');
const canvasHeightInput = document.getElementById('canvas-height');
const applySizeBtn = document.getElementById('apply-size');
const presetSquareBtn = document.getElementById('preset-square');
const presetHorizontalBtn = document.getElementById('preset-horizontal');
const presetVerticalBtn = document.getElementById('preset-vertical');


// --- Modal & IA ---
const editModal = document.getElementById('edit-modal');
const modalTextInput = document.getElementById('modal-text-input');
const modalSaveBtn = document.getElementById('modal-save');
const modalCancelBtn = document.getElementById('modal-cancel');
const geminiApiKeyInput = document.getElementById('gemini-api-key');
 

// --- Estado Central de la Aplicación ---
let mapData = {};

// --- Estado de la Interfaz y Dibujo ---
let currentTool = 'poi'; // Herramienta activa por defecto
let isDrawingShape = false;
let currentDrawingPoints = [];
let mousePos = { x: 0, y: 0 };

let backgroundImage = null;
let backgroundImageDataUrl = null;
let selectedPoi = null;
let dragging = false;
let dragOffsetX = 0, dragOffsetY = 0;
let editingPoiIndex = -1;
let isPanning = false;
let panStartX = 0, panStartY = 0;
let scrollLeftStart = 0, scrollTopStart = 0;
let selectedGeo = null; // Para guardar la forma geográfica seleccionada (río, bosque, etc.)
let selectedVertexIndex = -1; // Para guardar el índice del vértice que estamos arrastrando
let draggingVertex = false; // Booleano para saber si estamos arrastrando un vértice
// --- Funciones de Compresión (sin cambios) ---
async function compressImageIntelligently(file) {
    const TARGET_SIZE_BYTES = 3 * 1024 * 1024;
    if (file.size <= TARGET_SIZE_BYTES) { return new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); }); }
    const image = new Image(); const imageUrl = URL.createObjectURL(file); await new Promise(resolve => { image.onload = resolve; image.src = imageUrl; }); URL.revokeObjectURL(imageUrl);
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height; const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    let minQuality = 0, maxQuality = 1, bestDataUrl = '';
    for (let i = 0; i < 8; i++) { const quality = (minQuality + maxQuality) / 2; const dataUrl = canvas.toDataURL('image/jpeg', quality); const blob = await fetch(dataUrl).then(res => res.blob()); if (blob.size > TARGET_SIZE_BYTES) { maxQuality = quality; } else { minQuality = quality; bestDataUrl = dataUrl; } }
    return bestDataUrl || canvas.toDataURL('image/jpeg', minQuality);
}
async function compressCanvasIntelligently(canvas, targetSizeBytes) {
    const initialBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 1.0)); if (initialBlob.size <= targetSizeBytes) { return canvas.toDataURL('image/jpeg', 1.0); }
    let minQuality = 0, maxQuality = 1, bestDataUrl = '';
    for (let i = 0; i < 8; i++) { const quality = (minQuality + maxQuality) / 2; const dataUrl = canvas.toDataURL('image/jpeg', quality); const blob = await fetch(dataUrl).then(res => res.blob()); if (blob.size > targetSizeBytes) { maxQuality = quality; } else { minQuality = quality; bestDataUrl = dataUrl; } }
    return bestDataUrl || canvas.toDataURL('image/jpeg', minQuality);
}

// --- Lógica de Renderizado de Capas ---

// --- ¡NUEVO! Función dedicada para dibujar el fondo ---
function drawBg() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    if (backgroundImage) {
        bgCtx.drawImage(backgroundImage, 0, 0, bgCanvas.width, bgCanvas.height);
    } else {
        bgCtx.fillStyle = '#4a5568';
        bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    }
}

function drawShape(ctx, points, color, isPath = false) {
    if (!points || points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) { ctx.lineTo(points[i].x, points[i].y); }
    if (isPath) { ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke(); }
    else { ctx.closePath(); ctx.fillStyle = color; ctx.fill(); }
}

function drawMapFeatures() {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    if (!mapData.mapa) return;
    // --- CAMBIO AQUÍ ---
    const { agua, continentes, islas, elementos } = mapData.mapa; 
    if (agua && agua.color) { drawCtx.fillStyle = agua.color; drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height); }
    
    // --- CAMBIO AQUÍ (ahora recorre el array) ---
    if (continentes && Array.isArray(continentes)) {
        continentes.forEach(cont => drawShape(drawCtx, cont.contorno, "#d2b48c9d"));
    }
    
    if (islas && Array.isArray(islas)) { islas.forEach(isla => drawShape(drawCtx, isla.contorno, "#d2b48c02")); }
    if (elementos) {
        if (elementos.bosques) elementos.bosques.forEach(b => drawShape(drawCtx, b.área, "rgba(0, 100, 0, 0.5)"));
        if (elementos.montañas) elementos.montañas.forEach(m => drawShape(drawCtx, m.coordenadas, "#a0512d7a"));
        if (elementos.lagos) elementos.lagos.forEach(l => drawShape(drawCtx, l.contorno, "blue"));
        if (elementos.desiertos) elementos.desiertos.forEach(d => drawShape(drawCtx, d.área, "#ff995173"));
        if (elementos.ríos) elementos.ríos.forEach(r => drawShape(drawCtx, r.trayectoria, "blue", true));
       if (elementos.cultivos) elementos.cultivos.forEach(c => drawShape(drawCtx, c.área, "rgba(218, 165, 32, 0.5)")); // Dorado
        if (elementos.mesetas) elementos.mesetas.forEach(m => drawShape(drawCtx, m.área, "rgba(188, 143, 143, 0.6)")); // Marrón rosado
        if (elementos.llanuras) elementos.llanuras.forEach(l => drawShape(drawCtx, l.área, "rgba(152, 251, 152, 0.5)")); // Verde pálido
        if (elementos.pantanos) elementos.pantanos.forEach(p => drawShape(drawCtx, p.área, "rgba(85, 107, 47, 0.7)")); // Verde oliva
    
    }
}

function drawPois() {
    const pois = (mapData.mapa?.elementos?.pois) || [];
    pois.forEach((poi) => {
        poiCtx.textAlign = 'center';
        poiCtx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        poiCtx.shadowBlur = 10;
        poiCtx.font = '48px sans-serif';
        poiCtx.fillText(poi.emoji, poi.x, poi.y);
        poiCtx.font = 'bold 14px Inter';
        const textMetrics = poiCtx.measureText(poi.text);
        poiCtx.shadowBlur = 0;
        poiCtx.globalAlpha = 0.7;
        poiCtx.fillStyle = 'black';
        poiCtx.fillRect(poi.x - textMetrics.width / 2 - 5, poi.y + 14, textMetrics.width + 10, 18);
        poiCtx.globalAlpha = 1.0;
        poiCtx.fillStyle = 'white';
        poiCtx.fillText(poi.text, poi.x, poi.y + 28);
        if (selectedPoi === poi) {
            poiCtx.strokeStyle = '#f59e0b';
            poiCtx.lineWidth = 2;
            poiCtx.strokeRect(poi.x - 30, poi.y - 45, 60, 85);
        }
    });
}
 
function formatarPuntos(puntos) {
    if (!puntos || puntos.length === 0) return "ninguno";
    // Mapea cada punto al formato (x, y) y los une con una coma
    return puntos.map(p => `(${Math.round(p.x)}, ${Math.round(p.y)})`).join(', ');
}
function drawPreview() {
    poiCtx.clearRect(0, 0, poiCanvas.width, poiCanvas.height);
    drawPois(); 

    // Dibujar el preview del trazado nuevo (sin cambios)
    if (isDrawingShape && currentDrawingPoints.length > 0) {
        poiCtx.beginPath();
        poiCtx.moveTo(currentDrawingPoints[0].x, currentDrawingPoints[0].y);
        for (let i = 1; i < currentDrawingPoints.length; i++) {
            poiCtx.lineTo(currentDrawingPoints[i].x, currentDrawingPoints[i].y);
        }
        poiCtx.strokeStyle = "rgba(255, 0, 0, 0.8)";
        poiCtx.lineWidth = 2;
        poiCtx.stroke();
        poiCtx.beginPath();
        poiCtx.moveTo(currentDrawingPoints[currentDrawingPoints.length - 1].x, currentDrawingPoints[currentDrawingPoints.length - 1].y);
        poiCtx.lineTo(mousePos.x, mousePos.y);
        poiCtx.setLineDash([5, 5]);
        poiCtx.stroke();
        poiCtx.setLineDash([]);
        poiCtx.fillStyle = "red";
        currentDrawingPoints.forEach(p => {
            poiCtx.beginPath();
            poiCtx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            poiCtx.fill();
        });
    }

    // --- LÓGICA PARA MOSTRAR LA SELECCIÓN DE GEOGRAFÍA AÑADIDA ---
    if (currentTool === 'editGeo' && selectedGeo) {
        const points = selectedGeo.points;
        if (!points) return;
        
        // Dibuja los vértices como círculos
        points.forEach((p, index) => {
            poiCtx.beginPath();
            poiCtx.arc(p.x, p.y, 6, 0, Math.PI * 2);
            // Resalta el vértice que está siendo arrastrado o seleccionado
            poiCtx.fillStyle = (index === selectedVertexIndex) ? '#f59e0b' : 'rgba(255, 0, 0, 0.7)';
            poiCtx.fill();
        });

        // Dibuja las líneas que unen los vértices para mayor claridad
        poiCtx.beginPath();
        poiCtx.moveTo(points[0].x, points[0].y);
        for(let i = 1; i < points.length; i++) {
            poiCtx.lineTo(points[i].x, points[i].y);
        }
        poiCtx.strokeStyle = "rgba(255, 0, 0, 0.5)";
        poiCtx.lineWidth = 2;
        poiCtx.setLineDash([3, 3]);
        poiCtx.stroke();
        poiCtx.setLineDash([]);
    }
}
// --- MODIFICADO: Función principal de dibujado ahora usa la función de fondo ---
function drawAllLayers() {
    drawBg(); // Dibuja el fondo primero
    drawMapFeatures();
    poiCtx.clearRect(0, 0, poiCanvas.width, poiCanvas.height);
    drawPois();
}

// --- Lógica de Interacción y Dibujo ---

function getMousePos(e) {
    const rect = poiCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
}

function getPoiAtPos(x, y) {
    const pois = (mapData.mapa?.elementos?.pois) || [];
    for (let i = pois.length - 1; i >= 0; i--) {
        const poi = pois[i];
        if (x >= poi.x - 30 && x <= poi.x + 30 && y >= poi.y - 45 && y <= poi.y + 40) return poi;
    }
    return null;
}

function handleStart(e) {
    if (e.button === 2) { // Pan
        isPanning = true;
        panStartX = e.clientX; panStartY = e.clientY;
        scrollLeftStart = canvasContainer.scrollLeft; scrollTopStart = canvasContainer.scrollTop;
        poiCanvas.classList.add('panning');
        e.preventDefault();
        return;
    }

    if (e.button !== 0) return;
    e.preventDefault();
    const pos = getMousePos(e);

    // --- LÓGICA DE EDICIÓN AÑADIDA ---
    if (currentTool === 'editGeo') {
        const closest = findClosestGeo(pos);
        if (closest) {
            selectedGeo = closest; // Guardamos el objeto entero { feature, points, type, ... }
            selectedVertexIndex = closest.vertexIndex;
            draggingVertex = true;
            poiCanvas.classList.add('grabbing');
        } else {
            selectedGeo = null; // Si no se hace clic en nada, se deselecciona
        }
    } else if (isDrawingShape) {
        currentDrawingPoints.push(pos);
    } else if (currentTool === 'poi') {
        const poi = getPoiAtPos(pos.x, pos.y);
        if (poi) {
            selectedPoi = poi;
            dragging = true;
            dragOffsetX = pos.x - poi.x;
            dragOffsetY = pos.y - poi.y;
            poiCanvas.classList.add('grabbing');
        } else {
            selectedPoi = null;
        }
    }
    
    drawPreview(); // Llamamos a drawPreview para mostrar la selección
}

function handleMove(e) {
    e.preventDefault();
    mousePos = getMousePos(e);

    if (isPanning) {
        const dx = e.clientX - panStartX;
        const dy = e.clientY - panStartY;
        canvasContainer.scrollLeft = scrollLeftStart - dx;
        canvasContainer.scrollTop = scrollTopStart - dy;
        return;
    }
    
    // --- LÓGICA DE ARRASTRE DE VÉRTICE AÑADIDA ---
    if (draggingVertex && selectedGeo) {
        // Actualizamos la posición del vértice que estamos arrastrando
        selectedGeo.points[selectedVertexIndex].x = mousePos.x;
        selectedGeo.points[selectedVertexIndex].y = mousePos.y;
        // Forzamos un redibujado completo de la capa de geografía
        drawMapFeatures();
    } else if (isDrawingShape) {
        // Preview de dibujo (sin cambios)
    } else if (dragging && selectedPoi) {
        selectedPoi.x = mousePos.x - dragOffsetX;
        selectedPoi.y = mousePos.y - dragOffsetY;
    }
    
    drawPreview(); // Actualizamos la vista previa en cada movimiento
}

function handleEnd(e) {
    e.preventDefault();
    if (isPanning) { isPanning = false; poiCanvas.classList.remove('panning'); }
    if (dragging) { dragging = false; poiCanvas.classList.remove('grabbing'); }
    
    // --- LÓGICA PARA DEJAR DE ARRASTRAR AÑADIDA ---
    if (draggingVertex) {
        draggingVertex = false;
        poiCanvas.classList.remove('grabbing');
    }
}

// --- Gestión de Herramientas y Modos de Dibujo ---

// Reemplaza tu función switchTool con esta
function switchTool(newTool) {
    if (isDrawingShape) cancelDrawing();
    
    // Deseleccionamos cualquier cosa que estuviera seleccionada
    selectedGeo = null;
    selectedPoi = null;
    
    currentTool = newTool;

    Object.values(toolButtons).forEach(btn => btn.classList.remove('active'));
    if (toolButtons[newTool]) toolButtons[newTool].classList.add('active');
    
    poiControls.style.display = newTool === 'poi' ? 'block' : 'none';
    
    // Asignamos el cursor adecuado
    if (newTool === 'poi') {
        poiCanvas.style.cursor = 'grab';
    } else if (newTool === 'editGeo') {
        poiCanvas.style.cursor = 'default'; // Cursor normal para seleccionar
    } else {
        poiCanvas.style.cursor = 'crosshair'; // Cursor para dibujar
    }

    if (newTool !== 'poi' && newTool !== 'editGeo') {
        isDrawingShape = true;
        drawingControls.classList.remove('hidden');
        drawingStatus.textContent = `Haciendo clic para añadir puntos para ${newTool}.`;
        drawingStatus.classList.remove('hidden');
    } else {
        // Nos aseguramos de que los controles de dibujo estén ocultos si no estamos dibujando
        drawingControls.classList.add('hidden');
        drawingStatus.classList.add('hidden');
        isDrawingShape = false;
    }
    
    drawAllLayers(); // Para limpiar cualquier selección visual anterior
}
// --- NUEVA FUNCIÓN ---
// Esta función recorre todos los elementos geográficos y encuentra el más cercano a un punto.
function findClosestGeo(pos) {
    let closest = { feature: null, points: null, type: null, featureIndex: -1, vertexIndex: -1, dist: Infinity };
    const tolerance = 15; // Píxeles de tolerancia para hacer clic

    if (!mapData.mapa) return null;

    // Un objeto que nos ayuda a iterar por todos los tipos de formas
    // Un objeto que nos ayuda a iterar por todos los tipos de formas
    const geoTypes = {
        continentes: mapData.mapa.continentes || [], // <--- CAMBIO AQUÍ
        islas: mapData.mapa.islas || [],
        montañas: mapData.mapa.elementos.montañas || [],
        ríos: mapData.mapa.elementos.ríos || [],
        lagos: mapData.mapa.elementos.lagos || [],
        bosques: mapData.mapa.elementos.bosques || [],
        desiertos: mapData.mapa.elementos.desiertos || [],
        cultivos: mapData.mapa.elementos.cultivos || [],
        mesetas: mapData.mapa.elementos.mesetas || [],
        llanuras: mapData.mapa.elementos.llanuras || [],
        pantanos: mapData.mapa.elementos.pantanos || []
    };

     
    // Mapeo de los nombres de las propiedades de puntos
    const pointProps = {
        continentes: 'contorno', islas: 'contorno', montañas: 'coordenadas', ríos: 'trayectoria', // <--- CAMBIO AQUÍ
        lagos: 'contorno', bosques: 'área', desiertos: 'área', cultivos: 'área',
        mesetas: 'área', llanuras: 'área', pantanos: 'área'
    };

    for (const type in geoTypes) {
        const features = geoTypes[type];
        const prop = pointProps[type];

        features.forEach((feature, fIndex) => {
            const points = feature[prop];
            if (!points) return;
            
            points.forEach((p, vIndex) => {
                const d = Math.sqrt((p.x - pos.x)**2 + (p.y - pos.y)**2);
                if (d < closest.dist && d < tolerance) {
                    closest = { feature, points, type, featureIndex: fIndex, vertexIndex: vIndex, dist: d };
                }
            });
        });
    }

    return closest.feature ? closest : null;
}
// Dentro de la función finishDrawing()
function finishDrawing() {
    if (currentDrawingPoints.length < (currentTool === 'river' ? 2 : 3)) {
        alert("Necesitas al menos " + (currentTool === 'river' ? 2 : 3) + " puntos para crear esta forma.");
        return;
    }
    
    // --- MODIFICAR EL SWITCH ---
    // --- MODIFICAR EL SWITCH ---
    switch (currentTool) {
        case 'continent':
            // --- CAMBIO AQUÍ ---
            // Ahora siempre añade al array de continentes
            if (!mapData.mapa.continentes) {
                mapData.mapa.continentes = [];
            }
            mapData.mapa.continentes.push({ nombre: "Continente", contorno: currentDrawingPoints });
            break;
        case 'river':
            if (!mapData.mapa.elementos.ríos) mapData.mapa.elementos.ríos = [];
            mapData.mapa.elementos.ríos.push({ nombre: "Río", trayectoria: currentDrawingPoints });
            break;
        case 'forest':
            if (!mapData.mapa.elementos.bosques) mapData.mapa.elementos.bosques = [];
            mapData.mapa.elementos.bosques.push({ nombre: "Bosque", área: currentDrawingPoints });
            break;
        // --- AÑADIR ESTOS CASOS ---
        case 'mountain':
        case 'peak': // Los picos y montañas se guardan igual
            if (!mapData.mapa.elementos.montañas) mapData.mapa.elementos.montañas = [];
            mapData.mapa.elementos.montañas.push({ nombre: "Montaña/Pico", coordenadas: currentDrawingPoints });
            break;
        case 'lake':
            if (!mapData.mapa.elementos.lagos) mapData.mapa.elementos.lagos = [];
            mapData.mapa.elementos.lagos.push({ nombre: "Lago", contorno: currentDrawingPoints });
            break;
        case 'crop':
            if (!mapData.mapa.elementos.cultivos) mapData.mapa.elementos.cultivos = [];
            mapData.mapa.elementos.cultivos.push({ nombre: "Cultivo", área: currentDrawingPoints });
            break;
        case 'plateau':
            if (!mapData.mapa.elementos.mesetas) mapData.mapa.elementos.mesetas = [];
            mapData.mapa.elementos.mesetas.push({ nombre: "Meseta", área: currentDrawingPoints });
            break;
        case 'plain':
            if (!mapData.mapa.elementos.llanuras) mapData.mapa.elementos.llanuras = [];
            mapData.mapa.elementos.llanuras.push({ nombre: "Llanura", área: currentDrawingPoints });
            break;
        case 'swamp':
            if (!mapData.mapa.elementos.pantanos) mapData.mapa.elementos.pantanos = [];
            mapData.mapa.elementos.pantanos.push({ nombre: "Pantano", área: currentDrawingPoints });
            break;
     case 'desert':
            if (!mapData.mapa.elementos.desiertos) mapData.mapa.elementos.desiertos = [];
            mapData.mapa.elementos.desiertos.push({ nombre: "Desierto", área: currentDrawingPoints });
            break;
      }
    
    resetDrawingState();
    drawAllLayers();
}

function cancelDrawing() {
    resetDrawingState();
    drawPreview();
}

function resetDrawingState() {
    isDrawingShape = false;
    currentDrawingPoints = [];
    drawingControls.classList.add('hidden');
    drawingStatus.classList.add('hidden');
    
    currentTool = 'poi';
    Object.values(toolButtons).forEach(btn => btn.classList.remove('active'));
    toolButtons.poi.classList.add('active');
    poiControls.style.display = 'block';
    poiCanvas.style.cursor = 'grab';
}

// --- Listeners de Eventos ---

if (toolButtons.poi) toolButtons.poi.addEventListener('click', () => switchTool('poi'));
if (toolButtons.continent) toolButtons.continent.addEventListener('click', () => switchTool('continent'));
if (toolButtons.river) toolButtons.river.addEventListener('click', () => switchTool('river'));
if (toolButtons.forest) toolButtons.forest.addEventListener('click', () => switchTool('forest'));
if (toolButtons.mountain) toolButtons.mountain.addEventListener('click', () => switchTool('mountain'));
if (toolButtons.lake) toolButtons.lake.addEventListener('click', () => switchTool('lake'));
if (toolButtons.peak) toolButtons.peak.addEventListener('click', () => switchTool('peak'));
if (toolButtons.crop) toolButtons.crop.addEventListener('click', () => switchTool('crop'));
if (toolButtons.plateau) toolButtons.plateau.addEventListener('click', () => switchTool('plateau'));
if (toolButtons.plain) toolButtons.plain.addEventListener('click', () => switchTool('plain'));
if (toolButtons.swamp) toolButtons.swamp.addEventListener('click', () => switchTool('swamp'));
if (toolButtons.desert) toolButtons.desert.addEventListener('click', () => switchTool('desert'));
if (toolButtons.editGeo) toolButtons.editGeo.addEventListener('click', () => switchTool('editGeo'));

if (finishDrawBtn) finishDrawBtn.addEventListener('click', finishDrawing);
if (cancelDrawBtn) cancelDrawBtn.addEventListener('click', cancelDrawing);

// --- MODIFICADO: El listener de carga de imagen ahora llama solo a drawBg ---
if (bgUpload) bgUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        backgroundImageDataUrl = await compressImageIntelligently(file);
        backgroundImage = new Image();
        backgroundImage.onload = () => drawBg(); // Llama solo a la función de dibujar fondo
        backgroundImage.src = backgroundImageDataUrl;
    } catch (error) { console.error("Error procesando imagen:", error); }
});

if (resetBgBtn) resetBgBtn.addEventListener('click', () => {
    backgroundImage = null;
    backgroundImageDataUrl = null;
    drawAllLayers();
});

if (addPoiBtn) addPoiBtn.addEventListener('click', () => {
    if (!mapData.mapa?.elementos) return;
    if (!mapData.mapa.elementos.pois) mapData.mapa.elementos.pois = [];
    
    mapData.mapa.elementos.pois.push({
        emoji: emojiInput.value || '📍',
        text: textInput.value || 'Nuevo Lugar',
        x: canvasContainer.scrollLeft + canvasContainer.clientWidth / 2,
        y: canvasContainer.scrollTop + canvasContainer.clientHeight / 2
    });
    textInput.value = '';
    drawPreview();
});

poiCanvas.addEventListener('mousedown', handleStart);
poiCanvas.addEventListener('mousemove', handleMove);
poiCanvas.addEventListener('mouseup', handleEnd);
poiCanvas.addEventListener('mouseleave', handleEnd);
poiCanvas.addEventListener('contextmenu', e => e.preventDefault());

poiCanvas.addEventListener('dblclick', (e) => {
    if (currentTool !== 'poi') return;
    const { x, y } = getMousePos(e);
    const poi = getPoiAtPos(x, y);
    if (poi) {
        editingPoiIndex = mapData.mapa.elementos.pois.indexOf(poi);
        modalTextInput.value = poi.text;
        editModal.style.display = 'flex';
        modalTextInput.focus();
    }
});

if(modalSaveBtn) modalSaveBtn.addEventListener('click', () => {
    if (editingPoiIndex > -1) {
        mapData.mapa.elementos.pois[editingPoiIndex].text = modalTextInput.value;
        editModal.style.display = 'none';
        editingPoiIndex = -1;
        drawPreview();
    }
});
if(modalCancelBtn) modalCancelBtn.addEventListener('click', () => {
    editModal.style.display = 'none';
    editingPoiIndex = -1;
});
window.addEventListener('keydown', (e) => {
    // Eliminar POI (sin cambios)
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPoi) {
        const pois = mapData.mapa.elementos.pois;
        pois.splice(pois.indexOf(selectedPoi), 1);
        selectedPoi = null;
        drawPreview();
    }
    
    // --- LÓGICA PARA ELIMINAR GEOGRAFÍA AÑADIDA ---
if ((e.key === 'Delete' || e.key === 'Backspace') && selectedGeo) {
        const { type, feature } = selectedGeo;
        
        // Buscamos el array correcto donde está el objeto y lo eliminamos
        if (type === 'continentes') { // <--- CAMBIO AQUÍ
            mapData.mapa.continentes.splice(mapData.mapa.continentes.indexOf(feature), 1); // <--- CAMBIO AQUÍ
        } else if (type === 'islas') {
            mapData.mapa.islas.splice(mapData.mapa.islas.indexOf(feature), 1);
        } else if (mapData.mapa.elementos[type]) { // Para ríos, montañas, etc.
             mapData.mapa.elementos[type].splice(mapData.mapa.elementos[type].indexOf(feature), 1);
        }

        selectedGeo = null; // Deseleccionamos
        drawAllLayers(); // Redibujamos todo para que desaparezca
    }
});
// Añade este listener para que el botón de copiar funcione
if (copyPoisJsonBtn) {
    copyPoisJsonBtn.addEventListener('click', () => {
        // Llama a la función que genera el resumen detallado
        const resumenTexto = generarResumenParaIA();
        
        // Usa la API del navegador para copiar el texto al portapapeles
        navigator.clipboard.writeText(resumenTexto).then(() => {
            alert('¡Resumen del mapa copiado al portapapeles!');
            console.log("Copiado al portapapeles:\n", resumenTexto);
        }).catch(err => {
            console.error('Error al copiar al portapapeles: ', err);
            alert('No se pudo copiar el resumen. Revisa la consola para más detalles.');
        });
    });
}
// --- Guardado, Carga y Exportación ---
if(saveJsonBtn) saveJsonBtn.addEventListener('click', () => {
    mapData.width = drawCanvas.width;
    mapData.height = drawCanvas.height;
    mapData.background = backgroundImageDataUrl;
    const blob = new Blob([JSON.stringify(mapData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mi_mapa_geografico.json';
    a.click();
    URL.revokeObjectURL(a.href);
});

if(loadJsonInput) loadJsonInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            mapData = data;
            const mapWidth = mapData.width || 1200;
            const mapHeight = mapData.height || 800;
            
            if(canvasWidthInput) canvasWidthInput.value = mapWidth;
            if(canvasHeightInput) canvasHeightInput.value = mapHeight;
            applyCanvasSize(mapWidth, mapHeight);

            backgroundImageDataUrl = mapData.background || null;
            if (backgroundImageDataUrl) {
                backgroundImage = new Image();
                // Al cargar JSON, sí necesitamos redibujar todo (mapa, pois, etc.)
                backgroundImage.onload = () => drawAllLayers();
                backgroundImage.src = backgroundImageDataUrl;
            } else {
                backgroundImage = null;
                drawAllLayers();
            }
        } catch (err) { alert("El archivo JSON no es válido."); }
    };
    reader.readAsText(file);
});

if(exportImageBtn) exportImageBtn.addEventListener('click', async () => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = bgCanvas.width;
    exportCanvas.height = bgCanvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    exportCtx.drawImage(bgCanvas, 0, 0);
    exportCtx.drawImage(drawCanvas, 0, 0);
    exportCtx.drawImage(poiCanvas, 0, 0);
    const compressedUrl = await compressCanvasIntelligently(exportCanvas, 5 * 1024 * 1024);
    const a = document.createElement('a');
    a.href = compressedUrl;
    a.download = 'mi_mapa_completo.jpg';
    a.click();
});

 if (editMapBtn) {
    editMapBtn.addEventListener('click', () => {
        const prompt = geminiPromptInput.value;
        if (!prompt) {
            alert("Por favor, introduce una instrucción para editar el mapa.");
            return;
        }
        ejecutarCadenaDeIA(prompt, 'editar'); // Llama en modo 'editar'
    });
}

if (createMapBtn) {
    createMapBtn.addEventListener('click', () => {
        const prompt = geminiPromptInput.value;
        if (!prompt) {
            alert("Por favor, introduce una descripción para el nuevo mapa.");
            return;
        }
        ejecutarCadenaDeIA(prompt, 'crear'); // Llama en modo 'crear'
    });
}


// --- Inicialización ---
function applyCanvasSize(width, height) {
    if(canvasWrapper) {
        canvasWrapper.style.width = `${width}px`;
        canvasWrapper.style.height = `${height}px`;
    }

    bgCanvas.width = drawCanvas.width = poiCanvas.width = width;
    bgCanvas.height = drawCanvas.height = poiCanvas.height = height;

    drawAllLayers();
}


/**
 * Genera un resumen de texto legible CON COORDENADAS
 * de todos los elementos geográficos y POIs del mapa.
 */
function generarResumenParaIA() {
    if (!mapData.mapa) return "No hay datos en el mapa para resumir.";

    const resumen = [];
    resumen.push("Resumen de los elementos y áreas del mapa para análisis de IA:");
    resumen.push("==========================================================");

    const { continentes, islas, elementos } = mapData.mapa; // <--- CAMBIO AQUÍ
    
    // Mapeo para saber qué propiedad contiene los puntos de cada tipo de elemento
    const pointProps = {
        continentes: 'contorno', islas: 'contorno', montañas: 'coordenadas', ríos: 'trayectoria', // <--- CAMBIO AQUÍ
        lagos: 'contorno', bosques: 'área', desiertos: 'área', cultivos: 'área',
        mesetas: 'área', llanuras: 'área', pantanos: 'área'
    };

    // 1. Resumen Geográfico General con coordenadas
 // 1. Resumen Geográfico General con coordenadas
    // --- CAMBIO AQUÍ (ahora recorre el array) ---
    if (continentes && continentes.length > 0) {
        resumen.push("\n--- Continentes ---");
        continentes.forEach(cont => {
            resumen.push(`- "${cont.nombre || 'Continente sin nombre'}" definido por los puntos: ${formatarPuntos(cont.contorno)}`);
        });
    }
    if (islas && islas.length > 0) {
        resumen.push("\n--- Islas ---");
        islas.forEach(isla => {
            resumen.push(`- "${isla.nombre || 'Isla sin nombre'}" definida por los puntos: ${formatarPuntos(isla.contorno)}`);
        });
    }

    // 2. Resumen de Elementos Geográficos Específicos con coordenadas
    if (elementos) {
        const tiposDeElementos = {
            montañas: "Montañas", ríos: "Ríos", lagos: "Lagos", bosques: "Bosques",
            desiertos: "Desiertos", cultivos: "Cultivos", mesetas: "Mesetas",
            llanuras: "Llanuras", pantanos: "Pantanos"
        };

        let hayGeografia = false;
        for (const tipo in tiposDeElementos) {
            if (elementos[tipo] && elementos[tipo].length > 0) {
                if (!hayGeografia) {
                    resumen.push("\n--- Geografía Detallada ---");
                    hayGeografia = true;
                }
                elementos[tipo].forEach(elem => {
                    const propDePuntos = pointProps[tipo]; // Obtiene 'área', 'trayectoria', etc.
                    const puntos = elem[propDePuntos];
                    resumen.push(`- ${tiposDeElementos[tipo].slice(0, -1)}: "${elem.nombre || 'Sin nombre'}" definido por los puntos: ${formatarPuntos(puntos)}`);
                });
            }
        }

        // 3. Resumen de Puntos de Interés (POIs) - Esto se queda igual
        if (elementos.pois && elementos.pois.length > 0) {
            resumen.push("\n--- Puntos de Interés (POIs) ---");
            elementos.pois.forEach(poi => {
                resumen.push(`- Lugar: "${poi.text}" (${poi.emoji}) en la posición (x: ${Math.round(poi.x)}, y: ${Math.round(poi.y)})`);
            });
        }
    }

    if (resumen.length <= 2) {
        return "El mapa está vacío. Añade elementos para generar un resumen.";
    }

    return resumen.join('\n');
}



function init() {
    mapData = {
        "mapa": {
            "agua": { "tipo": "oceano", "color": "#1e8fff3d" },
            "continentes": [], "islas": [], // <--- CAMBIO AQUÍ
            "elementos": { "pois": [] }
        }
    };
    
    if (typeof fantasyEmojis !== 'undefined' && emojiPicker) {
        fantasyEmojis.forEach(emoji => {
            const btn = document.createElement('button');
            btn.textContent = emoji;
            btn.type = 'button';
            if(emojiInput) btn.onclick = () => { emojiInput.value = emoji; };
            emojiPicker.appendChild(btn);
        });
    }
    
    const initialWidth = canvasWidthInput ? parseInt(canvasWidthInput.value) : 1200;
    const initialHeight = canvasHeightInput ? parseInt(canvasHeightInput.value) : 800;
    applyCanvasSize(initialWidth, initialHeight);

    switchTool('poi');
}

if(applySizeBtn) {
    applySizeBtn.addEventListener('click', () => {
         if(canvasWidthInput && canvasHeightInput) {
            applyCanvasSize(parseInt(canvasWidthInput.value), parseInt(canvasHeightInput.value))
         }
    });
}
if(presetSquareBtn) presetSquareBtn.addEventListener('click', () => { if(canvasWidthInput) canvasWidthInput.value = 1000; if(canvasHeightInput) canvasHeightInput.value = 1000; applyCanvasSize(1000, 1000); });
if(presetHorizontalBtn) presetHorizontalBtn.addEventListener('click', () => { if(canvasWidthInput) canvasWidthInput.value = 1200; if(canvasHeightInput) canvasHeightInput.value = 800; applyCanvasSize(1200, 800); });
if(presetVerticalBtn) presetVerticalBtn.addEventListener('click', () => { if(canvasWidthInput) canvasWidthInput.value = 800; if(canvasHeightInput) canvasHeightInput.value = 1200; applyCanvasSize(800, 1200); });

 
function procesarCambiosGeograficos(cambios) {
    if (!cambios) return;

    // --- NUEVO: Manejo específico del continente ---
    if (cambios.continente && cambios.continente.contorno) {
        console.log("Aplicando cambio de continente.");
        mapData.mapa.continente = cambios.continente;
    }

    const pointProps = {
        montañas: 'coordenadas', ríos: 'trayectoria', lagos: 'contorno', bosques: 'área',
        desiertos: 'área', cultivos: 'área', mesetas: 'área', llanuras: 'área', pantanos: 'área',
        islas: 'contorno' // Añadido para que también pueda crear islas
    };

    // 1. Procesar elementos a AÑADIR (sin cambios aquí)
    if (cambios.añadir) {
        for (const tipo in cambios.añadir) {
            if (!mapData.mapa.elementos[tipo] && tipo !== 'islas') { // Las islas no van en 'elementos'
                mapData.mapa.elementos[tipo] = [];
            }
            
            if (tipo === 'islas') {
                if (!mapData.mapa.islas) mapData.mapa.islas = [];
                mapData.mapa.islas.push(...cambios.añadir[tipo]);
            } else {
                 mapData.mapa.elementos[tipo].push(...cambios.añadir[tipo]);
            }
        }
    }

    // 2. Procesar elementos a MODIFICAR
    if (cambios.modificar) {
        for (const tipo in cambios.modificar) {
            cambios.modificar[tipo].forEach(modificacion => {
                const elementosArray = (tipo === 'islas') ? mapData.mapa.islas : mapData.mapa.elementos[tipo];
                if (!elementosArray) return;

                const elementoExistente = elementosArray.find(e => e.nombre === modificacion.nombre);
                
                if (elementoExistente) {
                    const prop = pointProps[tipo];
                    const nuevaProp = `nuevas_${prop}`; // ej: "nuevas_coordenadas"
                    if (modificacion[nuevaProp]) {
                        elementoExistente[prop] = modificacion[nuevaProp];
                    }
                }
            });
        }
    }
}
 // PEGA ESTA FUNCIÓN COMPLETA EN TU ARCHIVO mapamain.js

async function ejecutarCadenaDeIA(prompt, mode = 'editar') {
    const activeBtn = (mode === 'crear') ? createMapBtn : editMapBtn;
    const inactiveBtn = (mode === 'crear') ? editMapBtn : createMapBtn;
    
    activeBtn.textContent = 'Paso 1/4: Planificando...';
    activeBtn.disabled = true;
    inactiveBtn.disabled = true;

    if (typeof imageApiKeys === 'undefined' || imageApiKeys.length === 0 || !imageApiKeys[0]) {
        alert("Error: No se ha configurado ninguna API Key en la sección de Ajustes.");
        editMapBtn.textContent = 'Editar Mapa con IA';
        createMapBtn.textContent = 'Crear Mapa desde Cero';
        editMapBtn.disabled = false;
        createMapBtn.disabled = false;
        return;
    }

   try {
        if (mode === 'crear') {
            if (confirm("¿Estás seguro de que quieres borrar el mapa actual y generar uno nuevo?")) {
                mapData.mapa.continentes = []; // <--- CAMBIO AQUÍ
                mapData.mapa.islas = [];
                mapData.mapa.elementos = { pois: [] };
                drawAllLayers();
            } else {
                throw new Error("Creación cancelada por el usuario.");
            }
        }

        const planResult = await generarPlanDeCambiosIA(prompt, mapData, mode);
        const plan = planResult.plan;
        if (!plan) throw new Error("La IA no pudo generar un plan de acción.");
        console.log(`Plan de la IA (${mode}):`, plan);

        // --- PASO 1: Generar la masa continental ---
        activeBtn.textContent = 'Paso 2/4: Creando continentes...';
        const tierraResult = await generarMasaContinentalIA(plan, mapData);
        if (tierraResult.masas_de_tierra) {
            // --- CAMBIO AQUÍ ---
            // La IA genera un solo continente, lo ponemos en el array
            if (tierraResult.masas_de_tierra.continente) {
                mapData.mapa.continentes = [ tierraResult.masas_de_tierra.continente ];
            }
            if (tierraResult.masas_de_tierra.islas) {
                mapData.mapa.islas = tierraResult.masas_de_tierra.islas;
            }
        }
        drawAllLayers();
        console.log("Masa continental aplicada:", tierraResult.masas_de_tierra);

        // --- PASO 2: Generar los biomas sobre la tierra ---
        activeBtn.textContent = 'Paso 3/4: Dibujando biomas...';
        const biomasResult = await generarBiomasIA(plan, mapData);
        if (biomasResult.nuevos_biomas) {
            for (const tipo in biomasResult.nuevos_biomas) {
                if (!mapData.mapa.elementos[tipo]) {
                    mapData.mapa.elementos[tipo] = [];
                }
                mapData.mapa.elementos[tipo].push(...biomasResult.nuevos_biomas[tipo]);
            }
        }
        drawAllLayers();
        console.log("Biomas aplicados:", biomasResult.nuevos_biomas);

        // --- PASO 3: Generar los POIs en el mapa completo ---
        activeBtn.textContent = 'Paso 4/4: Colocando lugares...';
        const poiResult = await generarPoisContextualesIA(plan, mapData);
        if (poiResult.nuevos_pois && poiResult.nuevos_pois.length > 0) {
            if (!mapData.mapa.elementos.pois) mapData.mapa.elementos.pois = [];
            mapData.mapa.elementos.pois.push(...poiResult.nuevos_pois);
        }
        console.log("Nuevos POIs añadidos:", poiResult.nuevos_pois);
        
    } catch (error) {
        console.error(`Error durante la cadena de IA (${mode}):`, error);
        if (error.message !== "Creación cancelada por el usuario.") {
           alert(`Se produjo un error en la generación: ${error.message}`);
        }
    } finally {
        editMapBtn.textContent = 'Editar Mapa con IA';
        createMapBtn.textContent = 'Crear Mapa desde Cero';
        editMapBtn.disabled = false;
        createMapBtn.disabled = false;
        drawAllLayers();
    }
}
 
document.addEventListener('DOMContentLoaded', init);

