 
// ===================================
// MENÚS DE SELECCIÓN DE ETIQUETAS Y ARCOS
// ===================================
window.opcionesEtiqueta = [
    { emoji: '⦾', valor: 'indeterminado', titulo: 'Indeterminado' },
    { emoji: '🧍', valor: 'personaje', titulo: 'Personaje' },
    { emoji: '🗺️', valor: 'ubicacion', titulo: 'Ubicación' },
    { emoji: '🗓️', valor: 'evento', titulo: 'Evento' },
    { emoji: '🛠️', valor: 'objeto', titulo: 'Objeto' },
    { emoji: '👕', valor: 'atuendo', titulo: 'Atuendo' },
    { emoji: '🏡', valor: 'edificio', titulo: 'Edificio' },
    { emoji: '🍱', valor: 'comida', titulo: 'Comida' },
    { emoji: '🚗', valor: 'transporte', titulo: 'Transporte' },
    { emoji: '🐾', valor: 'animal', titulo: 'Animal' },
    { emoji: '🌱', valor: 'planta', titulo: 'Planta' },
    { emoji: '🎭', valor: 'arte', titulo: 'Arte' },
    { emoji: '🛋️', valor: 'muebles', titulo: 'Muebles' },
    { emoji: '🦠', valor: 'ser_vivo', titulo: 'Ser Vivo' },
    { emoji: '🏞️', valor: 'elemento_geográfico', titulo: 'Elemento Geográfico' },
    { emoji: '💭', valor: 'concepto', titulo: 'Concepto' },
    { emoji: '📝', valor: 'nota', titulo: 'Nota' },
    { emoji: '🙏', valor: 'mitologia', titulo: 'Mitologia' },
    { emoji: '👁️‍🗨️', valor: 'visual', titulo: 'Visual' },
    { emoji: '✒️', valor: 'personalizar', titulo: 'Personalizar' }
];

window.opcionesArco = [
    { emoji: '⚪', valor: 'sin_arco', titulo: 'Base' },
    { emoji: 'Ⅰ', valor: '1º', titulo: 'Primero' },
    { emoji: 'ⅠⅠ', valor: '2º', titulo: 'Segundo' },
    { emoji: 'ⅠⅠⅠ', valor: '3º', titulo: 'Tercero' },
    { emoji: '🎮', valor: 'videojuego', titulo: 'Videojuego' },
    { emoji: '🎬', valor: 'planteamiento', titulo: 'Planteamiento' },
    { emoji: '👁️', valor: 'visuales', titulo: 'Visuales' },
    { emoji: '📚', valor: 'libro', titulo: 'Libro' },
    { emoji: '📝', valor: 'guion', titulo: 'Guion' },
    { emoji: '✒️', valor: 'personalizar', titulo: 'Personalizar' }
];



/**
 * Muestra un menú emergente para seleccionar una etiqueta, con opción para personalizar.
 * @param {HTMLElement} botonEtiqueta - El botón que activó el menú.
 */
function mostrarMenuEtiquetas(botonEtiqueta) {
    const menuExistente = document.querySelector('.menu-etiquetas');
    if (menuExistente) menuExistente.remove();

    const menu = document.createElement('div');
    menu.className = 'menu-etiquetas';
    const elementoDato = botonEtiqueta.closest('.personaje');

    opcionesEtiqueta.forEach(opcion => {
        const itemMenu = document.createElement('div');
        itemMenu.className = 'item-menu-etiqueta';
        itemMenu.textContent = `${opcion.emoji} ${opcion.titulo}`;
        
        itemMenu.onclick = (e) => {
            e.stopPropagation();
            if (opcion.valor === 'personalizar') {
                menu.remove();
                crearInputParaEtiqueta(botonEtiqueta);
            } else {
                botonEtiqueta.innerHTML = opcion.emoji;
                botonEtiqueta.title = `Etiqueta: ${opcion.titulo}`;
                botonEtiqueta.dataset.etiqueta = opcion.valor;
                etiquetasFiltroActivas.add(opcion.valor);
                menu.remove();
                actualizarVistaDatos();
                if (elementoDato) {
                    elementoDato.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        };
        menu.appendChild(itemMenu);
    });

    document.body.appendChild(menu);
    const rect = botonEtiqueta.getBoundingClientRect();

// --- CAMBIO CLAVE: Posicionar el menú arriba del botón ---
      menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
    menu.style.left = `${rect.left + window.scrollX}px`;
    
    const cerrarMenuHandler = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', cerrarMenuHandler, true);
        }
    };
    setTimeout(() => document.addEventListener('click', cerrarMenuHandler, true), 100);
}


/**
 * Muestra un menú emergente para seleccionar un Arco Narrativo.
 * @param {HTMLElement} botonArco - El botón que activó el menú.
 */
function mostrarMenuArcos(botonArco) {
    const menuExistente = document.querySelector('.menu-etiquetas');
    if (menuExistente) menuExistente.remove();

    const menu = document.createElement('div');
    menu.className = 'menu-etiquetas';
    const elementoDato = botonArco.closest('.personaje'); // <-- MEJORA: Obtener el elemento padre
    
    opcionesArco.forEach(opcion => {
        const itemMenu = document.createElement('div');
        itemMenu.className = 'item-menu-etiqueta';
        itemMenu.textContent = `${opcion.emoji} ${opcion.titulo}`;
        
        itemMenu.onclick = (e) => {
            e.stopPropagation();
            if (opcion.valor === 'personalizar') {
                menu.remove();
                crearInputParaArco(botonArco); 
            } else {
                botonArco.innerHTML = opcion.emoji;
                botonArco.title = `Arco: ${opcion.titulo}`;
                botonArco.dataset.arco = opcion.valor;
                arcosFiltroActivos.add(opcion.valor); // <-- MEJORA: Añadir a filtros activos
                menu.remove();
                actualizarVistaDatos();
                if (elementoDato) { // <-- MEJORA: Hacer scroll al elemento
                    elementoDato.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        };
        menu.appendChild(itemMenu);
    });

    document.body.appendChild(menu);
    const rect = botonArco.getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
    menu.style.left = `${rect.left + window.scrollX}px`;

    const cerrarMenuHandler = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', cerrarMenuHandler, true);
        }
    };
    setTimeout(() => document.addEventListener('click', cerrarMenuHandler, true), 100);
}


/**
 * Crea un campo de texto para que el usuario escriba una etiqueta personalizada.
 * @param {HTMLElement} botonEtiqueta - El botón de etiqueta que se actualizará.
 */
function crearInputParaEtiqueta(botonEtiqueta) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Nombre de etiqueta...';
    input.className = 'input-etiqueta-personalizada';
    const elementoDato = botonEtiqueta.closest('.personaje');

    document.body.appendChild(input);
    const rect = botonEtiqueta.getBoundingClientRect();
    input.style.position = 'absolute';
    input.style.top = `${rect.top + window.scrollY}px`;
    input.style.left = `${rect.left + window.scrollX}px`;
    input.style.width = `${rect.width + 40}px`;
    input.style.zIndex = '10001';
    input.focus();

    const guardarEtiqueta = () => {
        const nuevoValor = input.value.trim();
        if (nuevoValor) {
            botonEtiqueta.innerHTML = nuevoValor;
            botonEtiqueta.title = `Etiqueta: ${nuevoValor}`;
            botonEtiqueta.dataset.etiqueta = nuevoValor;
            etiquetasFiltroActivas.add(nuevoValor);
        }
        if (input.parentNode === document.body) {
            document.body.removeChild(input);
        }
        actualizarVistaDatos();
        if (elementoDato) {
            elementoDato.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };
    
    input.addEventListener('blur', guardarEtiqueta);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            guardarEtiqueta();
        }
    });
}

/**
 * Crea un campo de texto para que el usuario escriba un Arco personalizado.
 * @param {HTMLElement} botonArco - El botón de arco que se actualizará.
 */
function crearInputParaArco(botonArco) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Nombre del arco...';
    input.className = 'input-etiqueta-personalizada';
    const elementoDato = botonArco.closest('.personaje'); // <-- MEJORA: Obtener el elemento padre

    document.body.appendChild(input);
    const rect = botonArco.getBoundingClientRect();
    input.style.position = 'absolute';
    input.style.top = `${rect.top + window.scrollY}px`;
    input.style.left = `${rect.left + window.scrollX}px`;
    input.style.width = `${rect.width + 40}px`;
    input.style.zIndex = '10001';
    input.focus();

    const guardarArco = () => {
        const nuevoValor = input.value.trim();
        if (nuevoValor) {
            botonArco.innerHTML = nuevoValor;
            botonArco.title = `Arco: ${nuevoValor}`;
            botonArco.dataset.arco = nuevoValor;
            arcosFiltroActivos.add(nuevoValor); // <-- MEJORA: Añadir a filtros activos
        }
        if (input.parentNode === document.body) {
            document.body.removeChild(input);
        }
        actualizarVistaDatos();
        if (elementoDato) { // <-- MEJORA: Hacer scroll al elemento
            elementoDato.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };
    
    input.addEventListener('blur', guardarArco);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            guardarArco();
        }
    });
}

// ===================================
// ORDENACIÓN Y FILTRADO DE DATOS
// ===================================

let etiquetasFiltroActivas = new Set();
let arcosFiltroActivos = new Set();

/**
 * Recoge todas las etiquetas únicas de los datos actualmente en el DOM.
 * @returns {string[]} Un array de strings de etiquetas únicas.
 */
function obtenerEtiquetasUnicas() {
    const etiquetas = new Set();
    document.querySelectorAll('#listapersonajes .personaje').forEach(personaje => {
        const etiqueta = personaje.querySelector('.change-tag-btn')?.dataset.etiqueta;
        if (etiqueta) {
            etiquetas.add(etiqueta);
        }
    });
    return Array.from(etiquetas).sort((a, b) => a.localeCompare(b));
}

/**
 * Ordena y filtra los datos en el DOM según los filtros activos y el orden de etiquetas.
 */
function actualizarVistaDatos() {
    const lista = document.getElementById('listapersonajes');
    if (!lista) return;

    const elementos = Array.from(lista.children);

    // 1. ORDENACIÓN (POR ARCO, LUEGO ETIQUETA, LUEGO NOMBRE)
    const ordenArcos = new Map(opcionesArco.map((op, index) => [op.valor, index]));
    const ordenEtiquetas = new Map(opcionesEtiqueta.map((op, index) => [op.valor, index]));
    
    elementos.sort((a, b) => {
        const arcA = a.querySelector('.change-arc-btn')?.dataset.arco || 'sin_arco';
        const tagA = a.querySelector('.change-tag-btn')?.dataset.etiqueta || 'indeterminado';
        const nombreA = a.querySelector('.nombreh')?.value.trim().toLowerCase() || '';

        const arcB = b.querySelector('.change-arc-btn')?.dataset.arco || 'sin_arco';
        const tagB = b.querySelector('.change-tag-btn')?.dataset.etiqueta || 'indeterminado';
        const nombreB = b.querySelector('.nombreh')?.value.trim().toLowerCase() || '';

        const ordenArcoA = ordenArcos.has(arcA) ? ordenArcos.get(arcA) : Infinity;
        const ordenArcoB = ordenArcos.has(arcB) ? ordenArcos.get(arcB) : Infinity;

        if (ordenArcoA !== ordenArcoB) {
            return ordenArcoA - ordenArcoB;
        }

        const ordenEtiquetaA = ordenEtiquetas.has(tagA) ? ordenEtiquetas.get(tagA) : Infinity;
        const ordenEtiquetaB = ordenEtiquetas.has(tagB) ? ordenEtiquetas.get(tagB) : Infinity;

        if (ordenEtiquetaA !== ordenEtiquetaB) {
            return ordenEtiquetaA - ordenEtiquetaB;
        }
        
        return nombreA.localeCompare(nombreB);
    });

    // 2. RE-INSERCIÓN ORDENADA EN EL DOM
    elementos.forEach(el => lista.appendChild(el));

    // 3. FILTRADO COMBINADO (mostrar u ocultar)
    elementos.forEach(el => {
        const etiquetaEl = el.querySelector('.change-tag-btn')?.dataset.etiqueta;
        const arcoEl = el.querySelector('.change-arc-btn')?.dataset.arco;

        const etiquetaVisible = etiquetasFiltroActivas.has(etiquetaEl);
        const arcoVisible = arcosFiltroActivos.has(arcoEl);

        if (etiquetaVisible && arcoVisible) {
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    });
}


/**
 * Rellena y muestra el popup de filtros.
 */
function actualizarPopupFiltros() {
    const popup = document.getElementById('filtro-datos-popup');
    if (!popup) return;

    popup.innerHTML = ''; 

    // --- SECCIÓN DE ARCOS ---
    const arcosContainer = document.createElement('div');
    arcosContainer.className = 'filtro-seccion';
    arcosContainer.innerHTML = '<h3 class="filtro-titulo">Arcos</h3>';
    
    const arcosDisponibles = obtenerArcosUnicos();

    const allArcosContainer = document.createElement('div');
    allArcosContainer.className = 'filtro-item-control';
    const allArcosLabel = document.createElement('label');
    const allArcosCheckbox = document.createElement('input');
    allArcosCheckbox.type = 'checkbox';
    allArcosCheckbox.checked = arcosDisponibles.every(arco => arcosFiltroActivos.has(arco)) && arcosDisponibles.length > 0;
    allArcosLabel.appendChild(allArcosCheckbox);
    allArcosLabel.append(' (Marcar todos)');
    allArcosCheckbox.onchange = () => {
        if (allArcosCheckbox.checked) {
            arcosDisponibles.forEach(arco => arcosFiltroActivos.add(arco));
        } else {
            arcosFiltroActivos.clear();
        }
        actualizarPopupFiltros(); 
        actualizarVistaDatos();
    };
    allArcosContainer.appendChild(allArcosLabel);
    arcosContainer.appendChild(allArcosContainer);

    arcosDisponibles.forEach(arco => {
        const itemContainer = document.createElement('div');
        itemContainer.className = 'filtro-item';
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = arco;
        checkbox.checked = arcosFiltroActivos.has(arco);
        
        checkbox.onchange = () => {
            if (checkbox.checked) {
                arcosFiltroActivos.add(arco);
            } else {
                arcosFiltroActivos.delete(arco);
            }
            actualizarPopupFiltros(); 
            actualizarVistaDatos();
        };

        label.appendChild(checkbox);
        const opcion = opcionesArco.find(op => op.valor === arco);
        const displayName = opcion ? `${opcion.emoji} ${opcion.titulo}` : arco;
        label.append(` ${displayName}`);
        itemContainer.appendChild(label);
        arcosContainer.appendChild(itemContainer);
    });
    popup.appendChild(arcosContainer);


    // --- SECCIÓN DE ETIQUETAS ---
    const etiquetasContainer = document.createElement('div');
    etiquetasContainer.className = 'filtro-seccion';
    etiquetasContainer.innerHTML = '<h3 class="filtro-titulo">Etiquetas</h3>';

    const etiquetasDisponibles = obtenerEtiquetasUnicas();

    const allEtiquetasContainer = document.createElement('div');
    allEtiquetasContainer.className = 'filtro-item-control';
    const allEtiquetasLabel = document.createElement('label');
    const allEtiquetasCheckbox = document.createElement('input');
    allEtiquetasCheckbox.type = 'checkbox';
    allEtiquetasCheckbox.checked = etiquetasDisponibles.every(tag => etiquetasFiltroActivas.has(tag)) && etiquetasDisponibles.length > 0;
    allEtiquetasLabel.appendChild(allEtiquetasCheckbox);
    allEtiquetasLabel.append(' (Marcar todos)');
    allEtiquetasCheckbox.onchange = () => {
        if (allEtiquetasCheckbox.checked) {
            etiquetasDisponibles.forEach(tag => etiquetasFiltroActivas.add(tag));
        } else {
            etiquetasFiltroActivas.clear();
        }
        actualizarPopupFiltros(); 
        actualizarVistaDatos();
    };
    allEtiquetasContainer.appendChild(allEtiquetasLabel);
    etiquetasContainer.appendChild(allEtiquetasContainer);

    etiquetasDisponibles.forEach(tag => {
        const itemContainer = document.createElement('div');
        itemContainer.className = 'filtro-item';
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = tag;
        checkbox.checked = etiquetasFiltroActivas.has(tag);
        
        checkbox.onchange = () => {
            if (checkbox.checked) {
                etiquetasFiltroActivas.add(tag);
            } else {
                etiquetasFiltroActivos.delete(tag);
            }
            actualizarPopupFiltros(); 
            actualizarVistaDatos();
        };

        label.appendChild(checkbox);
        const opcion = opcionesEtiqueta.find(op => op.valor === tag);
        const displayName = opcion ? `${opcion.emoji} ${opcion.titulo}` : tag;
        label.append(` ${displayName}`);
        itemContainer.appendChild(label);
        etiquetasContainer.appendChild(itemContainer);
    });
    popup.appendChild(etiquetasContainer);

    popup.style.display = 'block';
}

/**
 * Crea el botón de filtro y el popup, e inyecta los estilos necesarios.
 */
function inicializarControlesDeFiltro() {
    const botonesSuperiores = document.getElementById('datos-botones-superiores');
    if (!botonesSuperiores || document.getElementById('filtro-datos-btn')) return;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
        #filtro-datos-popup { 
         }
        .filtro-item label, .filtro-item-control label { display: flex; align-items: center; color: black; padding: 0px; cursor: pointer; border-radius: 3px; font-size: 14px; }
        .filtro-item label:hover { background-color: #444; color: white;}
        .filtro-item input, .filtro-item-control input { margin-right: 10px; }
        .filtro-item-control { border-bottom: 1px solid #555; margin-bottom: 5px; padding-bottom: 5px; }
    `;
    document.head.appendChild(styleSheet);
    
    const filtroBtn = document.createElement('button');
    filtroBtn.id = 'filtro-datos-btn';
    filtroBtn.className = 'filtros'; 
    filtroBtn.textContent = '☰';
    botonesSuperiores.appendChild(filtroBtn);

    const popup = document.createElement('div');
    popup.id = 'filtro-datos-popup';
    popup.className = 'lista-guiones-popup-local';
    botonesSuperiores.parentNode.insertBefore(popup, botonesSuperiores.nextSibling);

    filtroBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = popup.style.display === 'block';
        if (isVisible) {
            popup.style.display = 'none';
        } else {
            actualizarPopupFiltros();
            const rect = filtroBtn.getBoundingClientRect();
         
           
        }
    });

    document.addEventListener('click', (e) => {
        if (!popup.contains(e.target) && e.target !== filtroBtn) {
            popup.style.display = 'none';
        }
    });
    
    reinicializarFiltrosYActualizarVista();
}

/**
 * Reinicia los filtros para incluir todas las etiquetas disponibles y actualiza la vista.
 */
function reinicializarFiltrosYActualizarVista() {
    etiquetasFiltroActivas.clear();
    const todasLasEtiquetas = obtenerEtiquetasUnicas();
    todasLasEtiquetas.forEach(tag => etiquetasFiltroActivas.add(tag));
    
    arcosFiltroActivos.clear();
    const todosLosArcos = obtenerArcosUnicos();
    todosLosArcos.forEach(arco => arcosFiltroActivos.add(arco));

    actualizarVistaDatos();
}

function obtenerArcosUnicos() {
    const arcos = new Set();
    document.querySelectorAll('#listapersonajes .personaje').forEach(personaje => {
        const arco = personaje.querySelector('.change-arc-btn')?.dataset.arco;
        if (arco) arcos.add(arco);
    });
    return Array.from(arcos).sort((a, b) => a.localeCompare(b));
}
 
 