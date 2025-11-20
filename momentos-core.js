// ===================================
// NÚCLEO - GESTIÓN DE MOMENTOS
// ===================================

// --- Constantes y Estado Global ---
const NODE_SIZE = 150;
const NODE_GAP = 60;
const EXPANSION_MARGIN = 300;
const EXPANSION_AMOUNT = 1000;
let previsualizacionActiva = false;

const canvasState = {
    scale: 1,
    panning: false,
    lastX: 0,
    lastY: 0,
};
const ZOOM_LEVELS = [0.25, 0.5, 1.0, 1.5];
let currentZoomIndex = 2;


/**
 * Inicializa los listeners y componentes de la sección Momentos.
 * Llama a funciones que ahora pueden estar en otros archivos.
 */
function initMomentos() {
    // Listeners en botones principales
    document.getElementById('agregar-momento-btn')?.addEventListener('click', agregarMomento);
    document.getElementById('generar-aventura-ia-btn')?.addEventListener('click', abrirModalMomentosIA); // Modificado para abrir el modal
    document.getElementById('preview-connections-btn')?.addEventListener('click', alternarPrevisualizacionConexiones);
    document.getElementById('auto-layout-btn')?.addEventListener('click', aplicarAutoLayout);

    // Listeners para Zoom (gestionados en momentos-vista.js)
    document.getElementById('zoom-in-btn')?.addEventListener('click', () => zoom(1));
    document.getElementById('zoom-out-btn')?.addEventListener('click', () => zoom(-1));

    // Listeners para Pan (gestionados en momentos-vista.js)
    const wrapper = document.getElementById('momentos-lienzo-wrapper');
    wrapper?.addEventListener('mousedown', startPan);
    wrapper?.addEventListener('mousemove', pan);
    wrapper?.addEventListener('mouseup', endPan);
    wrapper?.addEventListener('mouseleave', endPan);
  const desarrollarBtn = document.getElementById('panel-boton-desarrollar-momento');
    if (desarrollarBtn) {
        // Asegúrate de que la función manejarDesarrolloMomento está disponible globalmente
        if (typeof manejarDesarrolloMomento === 'function') {
            desarrollarBtn.addEventListener('click', manejarDesarrolloMomento);
        } else {
            console.error("La función 'manejarDesarrolloMomento' no fue encontrada.");
        }
    }
    const completarBtn = document.getElementById('panel-boton-completar-momento');
    if (completarBtn) {
        // Asegúrate de que la nueva función manejarCompletarMomento está disponible globalmente
        if (typeof manejarCompletarMomento === 'function') {
            completarBtn.addEventListener('click', manejarCompletarMomento);
        } else {
            console.error("La función 'manejarCompletarMomento' no fue encontrada. Asegúrate de añadirla en momentos-ia4.js");
        }
    } 
    
    // --- INICIO: Zoom con rueda del ratón ---
    wrapper?.addEventListener('wheel', (e) => {
        e.preventDefault();

        const oldScale = canvasState.scale;
        const factor = 1.1;
        
        // Determina la dirección del zoom
        const delta = e.deltaY < 0 ? factor : 1 / factor;
        let newScale = oldScale * delta;

        // Limita el zoom al rango de 10% a 200%
        newScale = Math.max(0.1, Math.min(2.0, newScale));

        if (newScale.toFixed(4) === oldScale.toFixed(4)) return;

        const rect = wrapper.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        wrapper.scrollLeft = (wrapper.scrollLeft + mouseX) * (newScale / oldScale) - mouseX;
        wrapper.scrollTop = (wrapper.scrollTop + mouseY) * (newScale / oldScale) - mouseY;

        canvasState.scale = newScale;
        applyTransform();
        document.getElementById('zoom-level-indicator').textContent = `${Math.round(canvasState.scale * 100)}%`;
    }, { passive: false });
    // --- FIN: Zoom con rueda del ratón ---

}

/**
 * Agrega un nuevo nodo (momento) al lienzo, centrado en la vista actual.
 */
function agregarMomento() {
    const wrapper = document.getElementById('momentos-lienzo-wrapper');
    if (!wrapper) return;

    const lienzo = document.getElementById('momentos-lienzo');
    const nodoId = `momento_${Date.now()}`;

    const centerX = (wrapper.scrollLeft + wrapper.clientWidth / 2) / canvasState.scale;
    const centerY = (wrapper.scrollTop + wrapper.clientHeight / 2) / canvasState.scale;

    const nuevoNodo = crearNodoEnLienzo({
        id: nodoId,
        titulo: `Momento ${lienzo.querySelectorAll('.momento-nodo').length + 1}`,
        descripcion: "",
        x: Math.round(centerX - NODE_SIZE / 2),
        y: Math.round(centerY - NODE_SIZE / 2),
        imagen: "",
        acciones: []
    });

    if (nuevoNodo) {
        seleccionarMomentoParaEdicion(nuevoNodo);
    }
}

 
/**
 * [MODIFICADA] Crea el nodo visual en el lienzo, incluyendo el botón de eliminar imagen.
 * @param {object} datos - Los datos del momento.
 * @returns {HTMLElement} El elemento del nodo creado.
 */
function crearNodoEnLienzo(datos) {
    const lienzo = document.getElementById('momentos-lienzo');
    if (!lienzo) return null;

    const nuevoNodo = document.createElement('div');
    nuevoNodo.className = 'momento-nodo';
    nuevoNodo.id = datos.id;
    
    nuevoNodo.innerHTML = `
        <span class="marcador-inicio" title="Marcar como inicio de la historia">🚩</span>
        <p contenteditable="false" class="momento-titulo">${datos.titulo || 'Sin Título'}</p>
        
        <div class="momento-contenido">
            <img src="" alt="Fondo del momento" class="momento-imagen" />
            <label for="upload-${datos.id}" class="btn-cargar-imagen">
                <i class="fas fa-camera"></i> Cargar Imagen
            </label>
            <input type="file" id="upload-${datos.id}" class="input-imagen-oculto" accept="image/png, image/jpeg, image/gif, image/webp">
            <button class="btn-eliminar-imagen" title="Eliminar Imagen">&times;</button>
        </div>

        <div class="momento-botones">
            <button class="momento-btn btn-editar">Editar</button>
            <button class="momento-btn btn-eliminar">Eliminar</button>
        </div>
    `;

    nuevoNodo.style.left = `${datos.x || 0}px`;
    nuevoNodo.style.top = `${datos.y || 0}px`;
    nuevoNodo.dataset.x = datos.x || 0;
    nuevoNodo.dataset.y = datos.y || 0;
    
    nuevoNodo.dataset.descripcion = datos.descripcion || "";
    nuevoNodo.dataset.acciones = JSON.stringify(datos.acciones || []);
    nuevoNodo.dataset.entorno = datos.entorno ? JSON.stringify(datos.entorno) : '{}';
    nuevoNodo.dataset.entidades = datos.entidades ? JSON.stringify(datos.entidades) : '[]';

    lienzo.appendChild(nuevoNodo);

    const inputImagen = nuevoNodo.querySelector(`#upload-${datos.id}`);
    const imgElement = nuevoNodo.querySelector('.momento-imagen');

    inputImagen.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imgElement.src = event.target.result;
                nuevoNodo.classList.add('con-imagen'); // Añade la clase cuando hay imagen
            };
            reader.readAsDataURL(file);
        }
    });

    // --- LÓGICA NUEVA PARA ELIMINAR LA IMAGEN ---
    const btnEliminarImagen = nuevoNodo.querySelector('.btn-eliminar-imagen');
    btnEliminarImagen.addEventListener('click', (e) => {
        e.stopPropagation(); // Evita que se active el arrastre del nodo
        if (imgElement) {
            imgElement.src = ''; // Limpia la imagen
        }
        nuevoNodo.classList.remove('con-imagen'); // Quita la clase para ocultar la imagen y el botón
        delete nuevoNodo.dataset.svgIlustracion; // Elimina el SVG guardado si lo hubiera
    });

    // --- Listeners existentes ---
    nuevoNodo.querySelector('.marcador-inicio').onclick = (e) => { e.stopPropagation(); marcarComoInicio(nuevoNodo.id); };
    nuevoNodo.querySelector('.btn-editar').onclick = (e) => { e.stopPropagation(); seleccionarMomentoParaEdicion(nuevoNodo); };
    nuevoNodo.querySelector('.btn-eliminar').onclick = (e) => {
        e.stopPropagation();
        if (confirm('¿Eliminar este momento?')) {
            if (nuevoNodo.classList.contains('momento-seleccionado')) {
                if (typeof ocultarPanelEdicion === 'function') ocultarPanelEdicion();
            }
            nuevoNodo.remove();
            if (previsualizacionActiva && typeof dibujarConexiones === 'function') dibujarConexiones();
        }
    };
    
    makeDraggable(nuevoNodo);
    return nuevoNodo;
}

/**
 * Selecciona un momento para editarlo en el panel flotante.
 * @param {HTMLElement} nodo - El nodo del momento que se ha seleccionado.
 */
function seleccionarMomentoParaEdicion(nodo) {
    document.querySelector('.momento-nodo.momento-seleccionado')?.classList.remove('momento-seleccionado');
    nodo.classList.add('momento-seleccionado');

    if (typeof mostrarPanelEdicion === 'function') {
        mostrarPanelEdicion(nodo);
    } else {
        console.error("La función mostrarPanelEdicion no está definida. Asegúrate de que editor-momento.js está cargado.");
    }
}

/**
 * Hace que un elemento sea arrastrable y expande el lienzo si es necesario.
 */
function makeDraggable(element) {
    let isDragging = false;
    let initialX, initialY;
    let startLeft, startTop;
    const lienzo = document.getElementById('momentos-lienzo');
dibujarConexiones();
    const onMouseDown = (e) => {
        if (e.target.isContentEditable || e.target.closest('.btn-eliminar, .marcador-inicio, .btn-editar')) {
            if (e.target.closest('.btn-editar')) seleccionarMomentoParaEdicion(element);
            return;
        }

        seleccionarMomentoParaEdicion(element);
        
        e.preventDefault();
        isDragging = true;
        element.style.cursor = 'grabbing';
        element.style.zIndex = 1001;
        element.style.transition = 'none'; 

        startLeft = element.offsetLeft;
        startTop = element.offsetTop;
        initialX = e.pageX / canvasState.scale;
        initialY = e.pageY / canvasState.scale;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp, { once: true });
    };

    const onMouseMove = (e) => { dibujarConexiones();
        if (!isDragging) return;
        
        const currentX = e.pageX / canvasState.scale;
        const currentY = e.pageY / canvasState.scale;
        const dx = currentX - initialX;
        const dy = currentY - initialY;
        
        element.style.transform = `translate(${dx}px, ${dy}px)`;
dibujarConexiones();
        let newLeft = Math.max(0, startLeft + dx);
        let newTop = Math.max(0, startTop + dy);
        let lienzoWidth = lienzo.offsetWidth;
        let lienzoHeight = lienzo.offsetHeight;

        if (newLeft + element.offsetWidth + EXPANSION_MARGIN > lienzoWidth) {
            lienzo.style.width = `${lienzoWidth + EXPANSION_AMOUNT}px`;
        }
        if (newTop + element.offsetHeight + EXPANSION_MARGIN > lienzoHeight) {
            lienzo.style.height = `${lienzoHeight + EXPANSION_AMOUNT}px`;
        }
    };

    const onMouseUp = (e) => {dibujarConexiones();
        if (!isDragging) return;
        isDragging = false;
        element.style.cursor = 'grab';
        element.style.zIndex = 1;
        element.style.transform = '';
        element.style.transition = '';

        const finalX = e.pageX / canvasState.scale;
        const finalY = e.pageY / canvasState.scale;
        const dx = finalX - initialX;
        const dy = finalY - initialY;

        let newLeft = Math.max(0, startLeft + dx);
        let newTop = Math.max(0, startTop + dy);

        element.style.left = `${newLeft}px`;
        element.style.top = `${newTop}px`;
        element.dataset.x = newLeft;
        element.dataset.y = newTop;

        document.removeEventListener('mousemove', onMouseMove);

        if (previsualizacionActiva && typeof dibujarConexiones === 'function') {
            dibujarConexiones();
        }
    };

    element.addEventListener('mousedown', onMouseDown);
}

/**
 * Marca un nodo como el inicio de la aventura.
 * @param {string} nodoId - El ID del nodo a marcar.
 */
function marcarComoInicio(nodoId) {
    document.querySelectorAll('#momentos-lienzo .momento-nodo').forEach(n => n.classList.remove('inicio'));
    document.getElementById(nodoId)?.classList.add('inicio');
}

/**
 * Extrae el texto plano del contenido HTML de un guion.
 * @param {string} html - El contenido HTML.
 * @returns {string} El texto plano.
 */
function _extraerTextoPlanoDeGuionHTML(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
}

/**
 * [MODIFICADA] Crea un nodo desde datos guardados, incluyendo el botón de eliminar imagen.
 * @param {object} datos - Los datos del momento guardados en el JSON.
 */
function crearMomentoEnLienzoDesdeDatos(datos) {
    const lienzo = document.getElementById('momentos-lienzo');
    if (!lienzo) return null;

    const nuevoNodo = document.createElement('div');
    nuevoNodo.className = 'momento-nodo';
    nuevoNodo.id = datos.id;
    
    nuevoNodo.innerHTML = `
        <span class="marcador-inicio" title="Marcar como inicio de la historia">🚩</span>
        <p contenteditable="false" class="momento-titulo">${datos.titulo || 'Sin Título'}</p>
        <div class="momento-contenido">
            <img src="" alt="Fondo del momento" class="momento-imagen" />
            <label for="upload-${datos.id}" class="btn-cargar-imagen">
                <i class="fas fa-camera"></i> Cargar Imagen
            </label>
            <input type="file" id="upload-${datos.id}" class="input-imagen-oculto" accept="image/png, image/jpeg, image/gif, image/webp">
            <button class="btn-eliminar-imagen" title="Eliminar Imagen">&times;</button>
        </div>
        <div class="momento-botones">
            <button class="momento-btn btn-editar">Editar</button>
            <button class="momento-btn btn-eliminar">Eliminar</button>
        </div>
    `;

    // --- Se aplican los datos guardados ---
    nuevoNodo.style.left = `${datos.x || 0}px`;
    nuevoNodo.style.top = `${datos.y || 0}px`;
    nuevoNodo.dataset.x = datos.x || 0;
    nuevoNodo.dataset.y = datos.y || 0;
    nuevoNodo.dataset.descripcion = datos.descripcion || "";
    nuevoNodo.dataset.acciones = JSON.stringify(datos.acciones || []);
    nuevoNodo.dataset.entidades = datos.entidades ? JSON.stringify(datos.entidades) : '[]';
    nuevoNodo.dataset.llavesActivar = datos.llavesActivar || '';
    nuevoNodo.dataset.llavesDesactivar = datos.llavesDesactivar || '';
    nuevoNodo.dataset.objetosGanar = datos.objetosGanar || '';
    nuevoNodo.dataset.objetosPerder = datos.objetosPerder || '';

    const imgElement = nuevoNodo.querySelector('.momento-imagen');
    if (datos.svgIlustracion && datos.svgIlustracion.trim() !== '') {
        nuevoNodo.dataset.svgIlustracion = datos.svgIlustracion;
        const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(datos.svgIlustracion)));
        imgElement.src = svgDataUrl;
        nuevoNodo.classList.add('con-imagen');
    } else if (datos.imagen) {
        imgElement.src = datos.imagen;
        nuevoNodo.classList.add('con-imagen');
    }

    lienzo.appendChild(nuevoNodo);

    // --- Se vuelven a conectar todos los eventos ---
    const inputImagen = nuevoNodo.querySelector(`#upload-${datos.id}`);
    inputImagen.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imgElement.src = event.target.result;
                nuevoNodo.classList.add('con-imagen');
                delete nuevoNodo.dataset.svgIlustracion;
            };
            reader.readAsDataURL(file);
        }
    });

    // --- LÓGICA NUEVA PARA ELIMINAR LA IMAGEN ---
    const btnEliminarImagen = nuevoNodo.querySelector('.btn-eliminar-imagen');
    btnEliminarImagen.addEventListener('click', (e) => {
        e.stopPropagation();
        if (imgElement) {
            imgElement.src = '';
        }
        nuevoNodo.classList.remove('con-imagen');
        delete nuevoNodo.dataset.svgIlustracion;
    });

    nuevoNodo.querySelector('.marcador-inicio').onclick = (e) => { e.stopPropagation(); marcarComoInicio(nuevoNodo.id); };
    nuevoNodo.querySelector('.btn-editar').onclick = (e) => { e.stopPropagation(); seleccionarMomentoParaEdicion(nuevoNodo); };
    nuevoNodo.querySelector('.btn-eliminar').onclick = (e) => {
        e.stopPropagation();
        if (confirm('¿Eliminar este momento?')) {
            if (nuevoNodo.classList.contains('momento-seleccionado')) {
                if (typeof ocultarPanelEdicion === 'function') ocultarPanelEdicion();
            }
            nuevoNodo.remove();
            if (previsualizacionActiva && typeof dibujarConexiones === 'function') dibujarConexiones();
        }
    };
    
    makeDraggable(nuevoNodo);
    return nuevoNodo;
}