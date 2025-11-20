/**
 * ================================================================
 * GESTOR DEL PANEL DE EDICIÓN FLOTANTE (VERSIÓN 3D / ENTIDADES 2D)
 * Permite definir el entorno y las entidades (sprites) de cada momento.
 * ================================================================
 */

let panelState = {
    nodoActual: null,
    panelElement: null,
    tituloInput: null,
    descripcionInput: null,
    // Contenedores para la UI
    entornoContainer: null,
    entidadesContainer: null,
    accionesContainer: null,
    agregarAccionBtn: null,
    // [NUEVO] Referencias para llaves
    llavesActivarInput: null,
    llavesDesactivarInput: null,
};


 
 
function inicializarPanelEdicion() {
    console.log('[EditorMomento] Inicializando...');

    const s = panelState;
    s.panelElement = document.getElementById('panel-edicion-momento');
    if (!s.panelElement) {
        console.error('[EditorMomento] ERROR CRÍTICO: #panel-edicion-momento no se encontró.');
        return;
    }

    s.panelElement.innerHTML = `
        <div class="panel-header">
            <button id="panel-edicion-cerrar-btn" class="panel-cerrar-btn">×</button>
        </div>
        <div class="panel-contenido">
            <input type="text" id="panel-editor-titulo" placeholder="Título del momento...">
            <textarea id="panel-editor-descripcion" style="min-height: 250px;" rows="4" placeholder="Describe lo que sucede en este momento..."></textarea>
              <div class="panel-seccion-desarrollo">
                
                <div class="desarrollo-controles">

                   
                    <div class="panel-checkbox-control">
                        <input type="checkbox" id="panel-checkbox-usar-contexto" checked title="Incluir la información de todos tus 'Datos' como contexto para la IA.">
                        <label for="panel-checkbox-usar-contexto">Datos</label>
                    </div>
                    
                    <div class="parrafos-control">
                        <input type="number" id="panel-input-num-parrafos" min="1" max="16" value="3" title="Número de párrafos a generar.">
                        <label for="panel-input-num-parrafos">☰</label>
                    </div>

                    <div class="parrafos-control">
                        <input type="number" id="panel-input-num-salidas" min="0" max="6" value="2" title="Número de nuevas ramas a crear desde este momento.">
                        <label for="panel-input-num-salidas">➡️</label>
                    </div>

                    <button id="panel-boton-desarrollar-momento" class="modal-button principal-action" title="Usa la IA para expandir la descripción y generar nuevas ramas narrativas.">
                        ✨ Desarrolla
                    </button>
                    <button id="panel-boton-completar-momento" class="modal-button" title="Usa la IA para reescribir la descripción y los textos de los botones basándose en los nodos ya conectados.">
                        ✍️ Completa
                    </button>
                    <button id="panel-boton-generar-rama" class="modal-button" title="Usa la IA para crear una estructura de N momentos con M finales a partir de la descripción actual.">
                        🌱 Ramifica
                    </button>
                </div>
            </div>
            <div id="panel-entorno-container" class="nom" ></div>
         
             <div id="panel-acciones-container"></div>
            <button id="panel-boton-agregar-accion" class="btn-accion-agregar"><i class="fas fa-plus"></i> Añadir Acción</button>
        </div>
            <div id="panel-entidades-container"></div>
            <button id="panel-boton-agregar-entidad" class="btn-accion-agregar"><i class="fas fa-plus"></i> Añadir Entidad</button>
           
            
            <div id="panel-inventario-container" class="panel-campo-doble">
                <div class="panel-campo">
                    <label>Añadir al inventario</label>
                    <input type="text" id="panel-objetos-ganar" placeholder="ej: Espada Maestra, Poción Roja">
                </div>
                <div class="panel-campo">
                    <label>Quitar del inventario</label>
                    <input type="text" id="panel-objetos-perder" placeholder="ej: Llave Oxidada, Nota Arrugada">
                </div>
            </div>
           
            
            <div id="panel-llaves-container" class="panel-campo-doble">
                <div class="panel-campo">
                    <label>Activar Llaves</label>
                    <input type="text" id="panel-llaves-activar" placeholder="ej: llave_roja, tiene_espada">
                </div>
                <div class="panel-campo">
                    <label>Desactivar Llaves</label>
                    <input type="text" id="panel-llaves-desactivar" placeholder="ej: puerta_abierta, personaje_huyo">
                </div>
            </div>
           
    `;

    // --- Referencias ---
    s.tituloInput = document.getElementById('panel-editor-titulo');
    s.descripcionInput = document.getElementById('panel-editor-descripcion');
    s.entornoContainer = document.getElementById('panel-entorno-container');
    s.entidadesContainer = document.getElementById('panel-entidades-container');
    s.accionesContainer = document.getElementById('panel-acciones-container');
    s.agregarAccionBtn = document.getElementById('panel-boton-agregar-accion');
    s.llavesActivarInput = document.getElementById('panel-llaves-activar');
    s.llavesDesactivarInput = document.getElementById('panel-llaves-desactivar');
    s.objetosGanarInput = document.getElementById('panel-objetos-ganar');
    s.objetosPerderInput = document.getElementById('panel-objetos-perder');
    
    // --- [NUEVO] Referencia para el input de salidas ---
    s.numSalidasInput = document.getElementById('panel-input-num-salidas');

    const agregarEntidadBtn = document.getElementById('panel-boton-agregar-entidad');
    const cerrarBtn = document.getElementById('panel-edicion-cerrar-btn');
    const botonDesarrollar = document.getElementById('panel-boton-desarrollar-momento'); // [NUEVO]
    const botonRamificar = document.getElementById('panel-boton-generar-rama');
    const botonCompletar = document.getElementById('panel-boton-completar-momento');

    // --- Listeners ---
    cerrarBtn?.addEventListener('click', ocultarPanelEdicion);
    s.tituloInput?.addEventListener('input', actualizarDatosNodo);
    s.descripcionInput?.addEventListener('input', actualizarDatosNodo);
    s.agregarAccionBtn.addEventListener('click', () => agregarNuevaAccionAPanel());
    agregarEntidadBtn.addEventListener('click', abrirModalSeleccionEntidad);
    s.llavesActivarInput?.addEventListener('input', actualizarDatosNodo);
    s.llavesDesactivarInput?.addEventListener('input', actualizarDatosNodo);
    s.objetosGanarInput?.addEventListener('input', actualizarDatosNodo);
    s.objetosPerderInput?.addEventListener('input', actualizarDatosNodo);

    // --- [NUEVO] Conectar el botón de desarrollo a su nueva lógica ---
    botonDesarrollar?.addEventListener('click', manejarDesarrolloMomento);
    botonRamificar?.addEventListener('click', generarRamasDesdePanel);

if (botonCompletar) {
        if (typeof manejarCompletarMomento === 'function') {
            botonCompletar.addEventListener('click', manejarCompletarMomento);
        } else {
            console.error("La función 'manejarCompletarMomento' no se encontró. Asegúrate de que esté en momentos-ia4.js");
        }
    }
    
    console.log('[EditorMomento] Inicialización V3 completada (con desarrollo, completar y ramificar).');
}

/**
 * [MODIFICADO]
 * Muestra y puebla el panel de edición, incluyendo los nuevos campos de llaves.
 * @param {HTMLElement} nodo - El elemento del nodo del momento a editar.
 */
// EN: editor-momento.js
// REEMPLAZA la función completa

function mostrarPanelEdicion(nodo) {
    if (!panelState.panelElement) return;
    panelState.nodoActual = nodo;
    const s = panelState;

    s.tituloInput.value = nodo.querySelector('.momento-titulo').textContent;
    s.descripcionInput.value = nodo.dataset.descripcion || '';

    // Poblar campos de llaves
    s.llavesActivarInput.value = nodo.dataset.llavesActivar || '';
    s.llavesDesactivarInput.value = nodo.dataset.llavesDesactivar || '';

    // [NUEVO] Poblar los campos de inventario
    s.objetosGanarInput.value = nodo.dataset.objetosGanar || '';
    s.objetosPerderInput.value = nodo.dataset.objetosPerder || '';

    // Poblar entorno, entidades y acciones
    const entornoData = JSON.parse(nodo.dataset.entorno || '{}');
    poblarEntornoPanel(entornoData); 
    
    const entidadesData = JSON.parse(nodo.dataset.entidades || '[]');
    poblarEntidadesPanel(entidadesData);

    const accionesData = JSON.parse(nodo.dataset.acciones || '[]');
    poblarAccionesPanel(accionesData);

    s.panelElement.classList.add('visible');
}





function actualizarDatosNodo() {
    if (!panelState.nodoActual) return;
    const nodo = panelState.nodoActual;
    const s = panelState;

    // Actualización de título, descripción, entorno y entidades (sin cambios)
    nodo.querySelector('.momento-titulo').textContent = s.tituloInput.value;
    nodo.dataset.descripcion = s.descripcionInput.value;

    const entornoData = {
        texturaSuelo: document.getElementById('entorno-suelo-select')?.value || '',
        colorCielo: document.getElementById('entorno-cielo-input')?.value || '#87ceeb',
    };
    nodo.dataset.entorno = JSON.stringify(entornoData);

    const entidadesData = Array.from(s.entidadesContainer.querySelectorAll('.entidad-item')).map(item => ({
        recurso: item.dataset.recurso,
        svg: item.dataset.svg || '',
        altura: parseInt(item.querySelector('.entidad-altura-input').value, 10) || 0,
        tamaño: parseInt(item.querySelector('.entidad-tamaño-input').value, 10) || 45,
    })).filter(e => e.recurso);
    nodo.dataset.entidades = JSON.stringify(entidadesData);
    
    // Actualización de la gestión de llaves
    nodo.dataset.llavesActivar = s.llavesActivarInput.value.trim();
    nodo.dataset.llavesDesactivar = s.llavesDesactivarInput.value.trim();

    // [NUEVO] Actualización de la gestión de inventario
    nodo.dataset.objetosGanar = s.objetosGanarInput.value.trim();
    nodo.dataset.objetosPerder = s.objetosPerderInput.value.trim();

    // Actualización de acciones para incluir las condiciones
    const accionesData = Array.from(s.accionesContainer.querySelectorAll('.accion-item')).map(item => ({
        textoBoton: item.querySelector('.accion-texto-input').value,
        idDestino: item.querySelector('.accion-destino-select').value,
        condicionTipo: item.querySelector('.accion-condicion-tipo').value,
        condicionLlave: item.querySelector('.accion-condicion-llave').value
    })).filter(a => a.textoBoton && a.idDestino);
    nodo.dataset.acciones = JSON.stringify(accionesData);

    if (window.previsualizacionActiva && typeof dibujarConexiones === 'function') dibujarConexiones();
}

/**
 * [MODIFICADO]
 * Crea el elemento de una acción en el panel, con la nueva interfaz de condiciones.
 * @param {object} data - Los datos de la acción a crear.
 */
function crearElementoAccionPanel(data = { textoBoton: '', idDestino: '', condicionTipo: 'siempre_visible', condicionLlave: '' }) {
    const div = document.createElement('div');
    div.className = 'accion-item item-panel';

    // Contenedor para la primera fila (texto y destino)
    const fila1 = document.createElement('div');
    fila1.className = 'accion-fila';

    const textoInput = document.createElement('input');
    textoInput.type = 'text';
    textoInput.className = 'accion-texto-input';
    textoInput.placeholder = 'Texto del botón...';
    textoInput.value = data.textoBoton || '';

    const selectDestino = document.createElement('select');
    selectDestino.className = 'accion-destino-select';
    selectDestino.innerHTML = '<option value="">-- Seleccionar Destino --</option>';
    document.querySelectorAll('#momentos-lienzo .momento-nodo').forEach(nodo => {
        if (nodo.id !== panelState.nodoActual.id) {
            const option = document.createElement('option');
            option.value = nodo.id;
            option.textContent = nodo.querySelector('.momento-titulo').textContent.trim();
            selectDestino.appendChild(option);
        }
    });
    selectDestino.value = data.idDestino || '';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-item-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = () => {
        div.remove();
        actualizarDatosNodo();
    };

    fila1.append(textoInput, selectDestino, deleteBtn);

    // Contenedor para la segunda fila (condiciones)
    const fila2 = document.createElement('div');
    fila2.className = 'accion-fila';
    
    const selectCondicion = document.createElement('select');
    selectCondicion.className = 'accion-condicion-tipo';
    selectCondicion.innerHTML = `
        <option value="siempre_visible">Visible Siempre</option>
        <option value="una_vez">Visible Solo 1 Vez</option>
        <option value="visible_si">Visible Solo Si...</option>
        <option value="invisible_si">Invisible Solo Si...</option>
    `;
    selectCondicion.value = data.condicionTipo || 'siempre_visible';

    const llaveInput = document.createElement('input');
    llaveInput.type = 'text';
    llaveInput.className = 'accion-condicion-llave';
    llaveInput.placeholder = 'Nombre de la llave...';
    llaveInput.value = data.condicionLlave || '';
    
    // Lógica para mostrar/ocultar el input de la llave
    const toggleLlaveInput = () => {
        const tipo = selectCondicion.value;
        if (tipo === 'visible_si' || tipo === 'invisible_si') {
            llaveInput.style.display = 'block';
        } else {
            llaveInput.style.display = 'none';
        }
    };
    
    selectCondicion.addEventListener('change', toggleLlaveInput);
    
    fila2.append(selectCondicion, llaveInput);
    
    div.append(fila1, fila2);
    div.querySelectorAll('input, select').forEach(el => el.addEventListener('input', actualizarDatosNodo));
    
    // Llamada inicial para establecer la visibilidad correcta del input
    toggleLlaveInput(); 
    
    return div;
}

// =================================================================
// ===== FUNCIONES SIN CAMBIOS (COPIADAS DEL ARCHIVO ORIGINAL) =====
// =================================================================

function ocultarPanelEdicion() {
    if (panelState.panelElement) panelState.panelElement.classList.remove('visible');
    if (panelState.nodoActual) panelState.nodoActual.classList.remove('momento-seleccionado');
    panelState.nodoActual = null;
    if (window.previsualizacionActiva && typeof dibujarConexiones === 'function') dibujarConexiones();
}

function abrirModalSeleccionEntidad() {
    if (document.getElementById('modal-seleccion-entidad')) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'modal-seleccion-entidad';
    modalOverlay.className = 'modal-overlay';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.innerHTML = `
        <div class="modal-header">
            <h2>Seleccionar Entidad</h2>
            <button class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body-grid"></div>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    const gridContainer = modalContent.querySelector('.modal-body-grid');
    const todosLosDatos = document.querySelectorAll('#listapersonajes .personaje');

    if (todosLosDatos.length === 0) {
        gridContainer.innerHTML = '<p>No se encontraron "Datos" para añadir como entidades.</p>';
    } else {
        todosLosDatos.forEach(datoEl => {
            const nombre = datoEl.querySelector('.nombreh')?.value.trim();
            const imgSrc = datoEl.querySelector('.personaje-visual img')?.src;

            if (nombre && imgSrc && imgSrc.trim() !== '' && !imgSrc.endsWith('/')) {
                const gridItem = document.createElement('div');
                gridItem.className = 'grid-item-entidad';
                gridItem.innerHTML = `<img src="${imgSrc}" alt="${nombre}" /><span>${nombre}</span>`;
                
                gridItem.onclick = () => {
                    agregarEntidadDesdeDato(nombre);
                    cerrarModalSeleccionEntidad();
                };
                gridContainer.appendChild(gridItem);
            }
        });
    }

    modalContent.querySelector('.modal-close-btn').onclick = cerrarModalSeleccionEntidad;
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) cerrarModalSeleccionEntidad();
    };
}
 
function cerrarModalSeleccionEntidad() {
    const modal = document.getElementById('modal-seleccion-entidad');
    if (modal) modal.remove();
}

function agregarEntidadDesdeDato(nombreDato) {
    if (!panelState.nodoActual) return;

    const datoOriginalEl = Array.from(document.querySelectorAll('#listapersonajes .personaje'))
                                .find(p => p.querySelector('.nombreh')?.value.trim() === nombreDato);

    if (!datoOriginalEl) {
        console.error(`No se encontró el dato original con el nombre "${nombreDato}"`);
        return;
    }

    const datosEntidad = {
        recurso: nombreDato,
        svg: datoOriginalEl.dataset.svgContent || '',
        altura: 0, 
        tamaño: 45
    };

    const nuevoElemento = crearElementoEntidadPanel(datosEntidad);
    panelState.entidadesContainer.appendChild(nuevoElemento);
    actualizarDatosNodo();
}

function poblarEntornoPanel(data = {}) {
    const container = panelState.entornoContainer;
    container.innerHTML = `
        <div class="panel-campo" display="none">
            <label>Textura Suelo:</label>
            <select id="entorno-suelo-select">
                <option value="">-- Sin Textura --</option>
            </select>
        </div>
        <div class="panel-campo" display="none" >
            <label>Color Cielo:</label>
            <input type="color" id="entorno-cielo-input" value="${data.colorCielo || '#87ceeb'}">
        </div>

        <div style="display: flex; gap: 10px; margin-top: 10px;">
            <button id="btn-ilustrar-momento-ia" class="btn-accion-agregar" style="flex: 1;">
                ✨ Ilustrar con IA
            </button>
            <button id="btn-seleccionar-fondo-dato" class="btn-accion-agregar" style="flex: 1;">
                🖼️ Seleccionar Fondo
            </button>
        </div>
    `;
    const selectSuelo = container.querySelector('#entorno-suelo-select');
    const datosContainer = document.getElementById('listapersonajes');
    if (datosContainer) {
        const datosItems = datosContainer.querySelectorAll('.personaje');
        datosItems.forEach(item => {
            const nombreEl = item.querySelector('.nombreh');
            const imgEl = item.querySelector('.personaje-visual img');
            if (nombreEl && imgEl && imgEl.src) {
                const nombre = nombreEl.value.trim();
                const option = document.createElement('option');
                option.value = nombre;
                option.textContent = nombre;
                selectSuelo.appendChild(option);
            }
        });
    }
    selectSuelo.value = data.texturaSuelo || '';

    const btnIlustrar = container.querySelector('#btn-ilustrar-momento-ia');
    const btnSeleccionarFondo = container.querySelector('#btn-seleccionar-fondo-dato');

    if (btnIlustrar) {
        btnIlustrar.addEventListener('click', () => {
            if (typeof generarYRefinarImagenParaNodo === 'function') {
                generarYRefinarImagenParaNodo();
            } else {
                alert('La función de ilustración por IA no está disponible.');
            }
        });
    }

    if (btnSeleccionarFondo) {
        btnSeleccionarFondo.addEventListener('click', abrirModalSeleccionFondo);
    } else {
        console.error("Error: No se encontró el botón 'Seleccionar Fondo'.");
    }
    
    container.querySelectorAll('input, select').forEach(input => input.addEventListener('input', actualizarDatosNodo));
}

function abrirModalSeleccionFondo() {
    const modalExistente = document.getElementById('modal-seleccion-entidad');
    if (modalExistente) {
        modalExistente.remove();
    }

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'modal-seleccion-entidad';
    modalOverlay.className = 'modal-overlay';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.innerHTML = `
        <div class="modal-header">
            <h2>Seleccionar Imagen de Fondo</h2>
            <button class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body-grid"></div>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    const gridContainer = modalContent.querySelector('.modal-body-grid');
    const todosLosDatos = document.querySelectorAll('#listapersonajes .personaje');

    if (todosLosDatos.length === 0) {
        gridContainer.innerHTML = '<p>No se encontraron "Datos" para usar como fondo.</p>';
    } else {
        todosLosDatos.forEach(datoEl => {
            const nombre = datoEl.querySelector('.nombreh')?.value.trim();
            const imgEl = datoEl.querySelector('.personaje-visual img');
            const imgSrc = imgEl ? imgEl.getAttribute('src') : null;

            if (nombre && imgSrc && imgSrc.trim() !== '' && !imgSrc.endsWith('/')) {
                const gridItem = document.createElement('div');
                gridItem.className = 'grid-item-entidad';
                gridItem.innerHTML = `<img src="${imgSrc}" alt="${nombre}" /><span>${nombre}</span>`;
                
                gridItem.onclick = () => {
                    const datoOriginalEl = Array.from(document.querySelectorAll('#listapersonajes .personaje')).find(p => p.querySelector('.nombreh')?.value.trim() === nombre);
                    let svgCode = null;
                    if (datoOriginalEl) {
                        svgCode = datoOriginalEl.dataset.svgContent || null;
                    }
                    aplicarFondoDesdeDato(imgSrc, svgCode);
                    cerrarModalSeleccionFondo();
                };
                gridContainer.appendChild(gridItem);
            }
        });
    }

    modalContent.querySelector('.modal-close-btn').onclick = cerrarModalSeleccionFondo;
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) cerrarModalSeleccionFondo();
    };
}

function cerrarModalSeleccionFondo() {
    const modal = document.getElementById('modal-seleccion-entidad');
    if (modal) modal.remove();
}

function aplicarFondoDesdeDato(imgSrc, svgCode = null) {
    if (!panelState.nodoActual) return;
    const nodo = panelState.nodoActual;
    
    const imgElement = nodo.querySelector('.momento-imagen');
    if (imgElement) {
        imgElement.src = imgSrc;
        nodo.classList.add('con-imagen');
        
        if (svgCode) {
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgCode, "image/svg+xml");
            const svgElement = svgDoc.documentElement;

            svgElement.setAttribute('width', '100%');
            svgElement.setAttribute('height', '100%');
            svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            svgElement.removeAttribute('x');
            svgElement.removeAttribute('y');

            const serializer = new XMLSerializer();
            const svgCorregido = serializer.serializeToString(svgElement);

            nodo.dataset.svgIlustracion = svgCorregido;
            const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgCorregido)));
            imgElement.src = svgDataUrl;

        } else {
            delete nodo.dataset.svgIlustracion;
        }
    }
}

function poblarEntidadesPanel(entidades = []) {
    const container = panelState.entidadesContainer;
    container.innerHTML = '';
    if (entidades.length > 0) {
        entidades.forEach(entidad => {
            container.appendChild(crearElementoEntidadPanel(entidad));
        });
    }
}

function crearElementoEntidadPanel(data = { recurso: '', altura: 0, svg: '', tamaño: 45 }) {
    const div = document.createElement('div');
    div.className = 'entidad-item item-panel';
    div.dataset.recurso = data.recurso;
    div.dataset.svg = data.svg || '';

    div.innerHTML = `
        <span class="entidad-nombre">${data.recurso}</span>
        <div class="entidad-controles">
            <label>Altura:</label>
            <input type="number" class="entidad-altura-input" value="${data.altura || 0}" min="0" max="150" step="1">
            <span>%</span>

            <label style="margin-left: 10px;">Tamaño:</label>
            <input type="number" class="entidad-tamaño-input" value="${data.tamaño || 45}" min="5" max="100" step="1">
            <span>%</span>

            <button class="delete-item-btn">&times;</button>
        </div>
    `;

    div.querySelector('.delete-item-btn').onclick = () => {
        div.remove();
        actualizarDatosNodo();
    };
    
    div.querySelector('.entidad-altura-input').addEventListener('input', actualizarDatosNodo);
    div.querySelector('.entidad-tamaño-input').addEventListener('input', actualizarDatosNodo);

    return div;
}

function poblarAccionesPanel(acciones = []) {
    const container = panelState.accionesContainer;
    container.innerHTML = '';
    if (acciones.length > 0) {
        acciones.forEach(accion => {
            container.appendChild(crearElementoAccionPanel(accion));
        });
    }
}

function agregarNuevaAccionAPanel() {
    if (!panelState.nodoActual) return;
    const nuevoElemento = crearElementoAccionPanel();
    panelState.accionesContainer.appendChild(nuevoElemento);
}

// Inicializar el módulo cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarPanelEdicion);
