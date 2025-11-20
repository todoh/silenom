
// Función de ayuda para convertir un archivo a formato Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}



// EN: datos.js (AÑADIR ESTA NUEVA FUNCIÓN AL FINAL)

/**
 * Actualiza únicamente la imagen y el svgContent de un personaje existente.
 * @param {string} personajeId - El ID del personaje a actualizar.
 * @param {string} pngUrl - La nueva URL de la imagen PNG.
 * @param {string} svgCode - El nuevo código del SVG.
 */
function actualizarDatosDeImagen(personajeId, pngUrl, svgCode) {
    const index = personajes.findIndex(p => p.id === personajeId);

    if (index !== -1) {
        // Actualiza SOLO los campos de la imagen, no toca nada más.
        personajes[index].imagen = pngUrl;
        personajes[index].svgContent = svgCode;

        // Guarda los cambios en la base de datos.
        guardarDatos();
        console.log(`[DATOS] Imagen y SVG actualizados para el personaje ID: ${personajeId}`);
    } else {
        console.error(`[DATOS] No se encontró el personaje con ID "${personajeId}" para actualizar su imagen.`);
    }
}


// AÑADIR ESTA FUNCIÓN AL FINAL DEL ARCHIVO datos.js

/**
 * Crea un nuevo "Dato" en la sección de Datos para archivar una imagen generada.
 * El dato se asigna automáticamente al arco "Visuales".
 * @param {string} imageUrl - La URL de la imagen (en formato base64 o de otro tipo) a guardar.
 */
function archivarImagenComoDato(imageUrl) {
    if (!imageUrl) return;

    // Prepara la estructura de datos para el nuevo elemento.
    const nuevoDato = {
        // Se le da un nombre único basado en la fecha para poder identificarlo.
        nombre: `Visual - ${new Date().toLocaleString()}`,
        descripcion: ' ',
        promptVisual: '',
        imagen: imageUrl,
        etiqueta: 'indeterminado', // Se le asigna la etiqueta 'visual' por defecto.
        arco: 'visuales',  // Se asigna al arco 'visuales' como se solicitó.
        svgContent: '',
        embedding: []
    };

    // Llama a la función existente para crear el elemento en el DOM.
    agregarPersonajeDesdeDatos(nuevoDato);
    
    // Opcional: Actualiza la vista de filtros para que el nuevo dato aparezca inmediatamente.
    if (typeof reinicializarFiltrosYActualizarVista === 'function') {
        reinicializarFiltrosYActualizarVista();
    }
    
    console.log(`Imagen archivada con éxito en el arco "Visuales".`);
}

// ===================================
// INICIO: Funcionalidad para cargar composición en el editor
// ===================================
// ===================================
// INICIO: Funcionalidad para cargar composición en el editor
// ===================================

/**
 * Procesa la entrada del usuario, dando prioridad al texto pegado en el textarea.
 * Si el textarea está vacío, intenta leer el archivo seleccionado.
 * Luego, renderiza la composición.
 */
function cargarYRenderizarComposicion() {
    const pasteArea = document.getElementById('editor2-json-paste-area');
    const jsonInput = document.getElementById('editor2-json-input');
    const pastedText = pasteArea.value.trim();

    // Prioridad 1: Procesar el texto pegado
    if (pastedText) {
        try {
            const nombres = JSON.parse(pastedText);
            if (!Array.isArray(nombres)) {
                alert("Error: El texto JSON pegado debe ser un array de strings (nombres).");
                return;
            }
            renderizarContenidoEnCarta(nombres);
            pasteArea.value = ''; // Limpiar el área de texto tras el éxito
        } catch (error) {
            console.error("Error al procesar el JSON pegado:", error);
            alert("El texto JSON pegado no es válido o no tiene el formato esperado.");
        }
    } 
    // Prioridad 2: Procesar el archivo cargado
    else if (jsonInput && jsonInput.files && jsonInput.files.length > 0) {
        const file = jsonInput.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const nombres = JSON.parse(e.target.result);
                if (!Array.isArray(nombres)) {
                    alert("Error: El archivo JSON debe contener un array de strings (nombres).");
                    return;
                }
                renderizarContenidoEnCarta(nombres);
                // Resetear el input de archivo para poder cargar el mismo archivo de nuevo
                jsonInput.value = ''; 
            } catch (error) {
                console.error("Error al procesar el archivo JSON:", error);
                alert("El archivo JSON no es válido o no tiene el formato esperado.");
            }
        };
        
        reader.onerror = function() {
            alert("Ocurrió un error al leer el archivo.");
        };
        
        reader.readAsText(file);
    } 
    // Si no hay ninguna entrada
    else {
        alert("Por favor, pega el texto JSON o selecciona un archivo para cargar.");
    }
}
 
 
/**
 * -- VERSIÓN 5 (CORREGIDA) --
 * Renderiza contenido editable con una barra de herramientas completa, usando las variables correctas.
 * @param {string[]} nombres - Un array de nombres para renderizar.
 */
function renderizarContenidoEnCarta(nombres) {
    const cartaDiv = document.getElementById('carta');
    const listaPersonajesDiv = document.getElementById('listapersonajes');

    if (!cartaDiv || !listaPersonajesDiv) {
        console.error("Error: No se encontraron los contenedores #carta o #listapersonajes.");
        return;
    }

    cartaDiv.innerHTML = '';

    const datosMap = new Map();
    const todosLosDatos = listaPersonajesDiv.querySelectorAll('.personaje');
    todosLosDatos.forEach(datoEl => {
        const nombreInput = datoEl.querySelector('.nombreh');
        if (nombreInput && nombreInput.value) {
            datosMap.set(nombreInput.value.trim(), datoEl);
        }
    });

    nombres.forEach(nombre => {
        const datoEl = datosMap.get(nombre);
        const itemContainer = document.createElement('div');
        itemContainer.className = 'carta-item border-b py-4 last:border-b-0';

        if (datoEl) {
            // --- INICIO: BARRA DE HERRAMIENTAS ---
            const toolbar = document.createElement('div');
            // Aquí puedes añadir la clase que quieras para la barra, ej: toolbar.className = 'mi-toolbar-css';

            // Botón para cambiar la imagen
            const cambiarImagenBtn = document.createElement('button');
            cambiarImagenBtn.textContent = '🖼️';
            cambiarImagenBtn.title = 'Cambiar o añadir imagen';
            // <-- CORRECCIÓN: Usar 'nombre' en lugar de 'nombreNuevoDato'
            cambiarImagenBtn.dataset.nombreOriginal = nombre;
            cambiarImagenBtn.onclick = (e) => cambiarImagenDesdeEditor(e.target);
            toolbar.appendChild(cambiarImagenBtn);
            
            // Botón para AÑADIR un nuevo dato debajo
            const agregarDatoBtn = document.createElement('button');
            agregarDatoBtn.textContent = '➕';
            agregarDatoBtn.title = 'Añadir nuevo dato debajo';
            agregarDatoBtn.onclick = (e) => agregarDatoDesdeEditor(e.target);
            toolbar.appendChild(agregarDatoBtn);

            // Botón para ELIMINAR este dato
            const eliminarDatoBtn = document.createElement('button');
            eliminarDatoBtn.textContent = '❌';
            eliminarDatoBtn.title = 'Eliminar este dato';
            // <-- CORRECCIÓN: Usar 'nombre' en lugar de 'nombreNuevoDato'
            eliminarDatoBtn.dataset.nombreOriginal = nombre;
            eliminarDatoBtn.onclick = (e) => eliminarDatoDesdeEditor(e.target);
            toolbar.appendChild(eliminarDatoBtn);

            itemContainer.appendChild(toolbar);
            // --- FIN: BARRA DE HERRAMIENTAS ---

            const imgSrc = datoEl.querySelector('.personaje-visual img')?.src;
            const descripcion = datoEl.querySelector('.descripcionh')?.value;
            
            if (imgSrc && !imgSrc.endsWith('/')) {
                const imgElement = document.createElement('img');
                imgElement.src = imgSrc;
                imgElement.alt = `Imagen de ${nombre}`;
                imgElement.className = "w-full object-cover rounded-lg mb-2";
                itemContainer.appendChild(imgElement);
            }

            if (descripcion !== undefined) {
                const descTextarea = document.createElement('textarea');
                descTextarea.value = descripcion;
                descTextarea.className = "text-gray-700 w-full p-2 border border-gray-300 rounded-md";
                descTextarea.rows = 5;
                descTextarea.dataset.nombreOriginal = nombre; 
                descTextarea.onblur = (e) => actualizarDatoOriginal(e.target);
                itemContainer.appendChild(descTextarea);
            }

        } else {
            const notFoundElement = document.createElement('p');
            notFoundElement.textContent = `Dato no encontrado: "${nombre}"`;
            notFoundElement.className = "text-red-500 font-semibold";
            itemContainer.appendChild(notFoundElement);
        }
        
        if (itemContainer.hasChildNodes()) {
            cartaDiv.appendChild(itemContainer);
        }
    });
}
// Event listener para inicializar la funcionalidad cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    const loadBtn = document.getElementById('editor2-load-btn');
    if (loadBtn) {
        loadBtn.addEventListener('click', cargarYRenderizarComposicion);
    }
});
/**
 * --- FUNCIÓN FALTANTE ---
 * Actualiza la descripción del dato original en la sección "Datos", asegurando
 * que el cambio se guarde en el atributo 'data-descripcion' del elemento principal.
 * @param {HTMLTextAreaElement} textareaEditado - El textarea que se acaba de modificar en el editor.
 */
function actualizarDatoOriginal(textareaEditado) {
    const nombreOriginal = textareaEditado.dataset.nombreOriginal;
    const nuevaDescripcion = textareaEditado.value;

    // Buscar el elemento .personaje original en la sección de Datos
    let datoOriginalEncontrado = null;
    const todosLosDatos = document.querySelectorAll('#listapersonajes .personaje');
    
    for (const datoEl of todosLosDatos) {
        if (datoEl.querySelector('.nombreh')?.value.trim() === nombreOriginal) {
            datoOriginalEncontrado = datoEl;
            break; // Detener la búsqueda al encontrarlo
        }
    }

    if (datoOriginalEncontrado) {
        // 1. Actualizar el textarea de la capa de edición interna
        const descripcionTextareaInterna = datoOriginalEncontrado.querySelector('textarea.descripcionh');
        if (descripcionTextareaInterna) {
            descripcionTextareaInterna.value = nuevaDescripcion;
        }

        // 2. ¡CORRECCIÓN CLAVE! Actualizar el atributo de datos principal.
        // Esta es la "fuente de la verdad" para la aplicación.
        datoOriginalEncontrado.dataset.descripcion = nuevaDescripcion;

        // 3. Actualizar la previsualización de la descripción (visible cuando no se edita)
        const descripcionPreview = datoOriginalEncontrado.querySelector('.personaje-descripcion-preview');
        if (descripcionPreview) {
            descripcionPreview.textContent = nuevaDescripcion;
        }

        // Confirmación visual para el usuario de que se guardó
        textareaEditado.style.transition = 'border-color 0.3s ease-in-out';
        textareaEditado.style.borderColor = '#10B981'; // Verde
        console.log(`Dato '${nombreOriginal}' actualizado con éxito.`);
        setTimeout(() => {
            textareaEditado.style.borderColor = '#D1D5DB'; // Color gris por defecto
        }, 2000);

    } else {
        // Aviso visual en caso de error
        textareaEditado.style.borderColor = '#EF4444'; // Rojo
        console.error(`No se pudo encontrar el dato original "${nombreOriginal}" para actualizar.`);
    }
}

 
/**
 * --- VERSIÓN CORREGIDA Y MEJORADA ---
 * Cambia la imagen de un dato, creando el elemento <img> si no existe.
 * Actualiza la imagen en todas las vistas (Editor, Datos-preview, Datos-edición)
 * y se asegura de que todas sean visibles.
 * @param {HTMLButtonElement} boton - El botón "Cambiar Imagen" que fue presionado.
 */
function cambiarImagenDesdeEditor(boton) {
    const nombreOriginal = boton.dataset.nombreOriginal;

    const inputFile = document.createElement('input');
    inputFile.type = 'file';
    inputFile.accept = 'image/*';
    
    inputFile.onchange = async (evento) => {
        if (!evento.target.files || evento.target.files.length === 0) return;

        const archivo = evento.target.files[0];
        const nuevaImagenSrc = await fileToBase64(archivo);

        let datoOriginalEncontrado = null;
        const todosLosDatos = document.querySelectorAll('#listapersonajes .personaje');
        for (const datoEl of todosLosDatos) {
            if (datoEl.querySelector('.nombreh')?.value.trim() === nombreOriginal) {
                datoOriginalEncontrado = datoEl;
                break;
            }
        }
        
        if (datoOriginalEncontrado) {
            // --- INICIO DE LA CORRECCIÓN ---

            // 1. Actualizar la imagen en la vista del Editor (`#carta`)
            const itemContainer = boton.parentElement;
            let imgEnEditor = itemContainer.querySelector('img');

            // Si no había imagen en el editor, la creamos ahora
            if (!imgEnEditor) {
                imgEnEditor = document.createElement('img');
                imgEnEditor.alt = `Imagen de ${nombreOriginal}`;
                imgEnEditor.className = "w-full object-cover rounded-lg mb-2";
                // Insertamos la nueva imagen justo después del botón
                boton.after(imgEnEditor);
            }
            imgEnEditor.src = nuevaImagenSrc;

            // 2. Actualizar la imagen en la vista principal de Datos (`.personaje-visual`)
            const imgEnDatosPreview = datoOriginalEncontrado.querySelector('.personaje-visual img');
            if (imgEnDatosPreview) {
                imgEnDatosPreview.src = nuevaImagenSrc;
                imgEnDatosPreview.classList.remove('hidden'); // <-- Hacemos que sea visible
            }

            // 3. Actualizar la imagen en la capa de edición de Datos (`.edit-preview-image`)
            const imgEnDatosEdit = datoOriginalEncontrado.querySelector('.edit-preview-image');
            if (imgEnDatosEdit) {
                imgEnDatosEdit.src = nuevaImagenSrc;
                imgEnDatosEdit.style.display = 'block'; // <-- Hacemos que sea visible
            }
            
            // --- FIN DE LA CORRECCIÓN ---
            
            delete datoOriginalEncontrado.dataset.svgContent;
            console.log(`Imagen del dato '${nombreOriginal}' actualizada correctamente en todas las vistas.`);
        }
    };
    
    inputFile.click();
}
/**
 * Crea un nuevo dato en la sección 'Datos' y lo inserta en la vista
 * del 'Editor' justo debajo del elemento desde donde se llamó.
 * @param {HTMLButtonElement} boton - El botón 'Añadir' que fue presionado.
 */
function agregarDatoDesdeEditor(boton) {
    // 1. Crear el nuevo dato en la sección "Datos"
    const datosNuevoPersonaje = {
        nombre: `Nuevo Dato - ${Date.now()}`,
        descripcion: '',
        etiqueta: 'indeterminado',
        arco: 'libro'
    };
    // Reutilizamos la función que ya sabe cómo crear un dato en el DOM
    const nuevoDatoElemento = agregarPersonajeDesdeDatos(datosNuevoPersonaje);
    
    if (!nuevoDatoElemento) {
        alert("Hubo un error al crear el nuevo dato.");
        return;
    }

    // 2. Crear la vista para este nuevo dato en el "Editor"
    const nombreNuevoDato = datosNuevoPersonaje.nombre;
    const itemContainerActual = boton.closest('.carta-item');
    const nuevoItemContainer = document.createElement('div');
    nuevoItemContainer.className = 'carta-item border-b py-4 last:border-b-0';

    // (Recreamos la lógica de renderizado para este nuevo elemento)
    const toolbar = document.createElement('div');
    
    const cambiarImagenBtn = document.createElement('button');
    cambiarImagenBtn.textContent = '🖼️';
    cambiarImagenBtn.title = 'Cambiar o añadir imagen';
    cambiarImagenBtn.dataset.nombreOriginal = nombreNuevoDato;
    cambiarImagenBtn.onclick = (e) => cambiarImagenDesdeEditor(e.target);
    toolbar.appendChild(cambiarImagenBtn);

    const agregarDatoBtn = document.createElement('button');
    agregarDatoBtn.textContent = '➕';
    agregarDatoBtn.title = 'Añadir nuevo dato debajo';
    agregarDatoBtn.onclick = (e) => agregarDatoDesdeEditor(e.target);
    toolbar.appendChild(agregarDatoBtn);

    const eliminarDatoBtn = document.createElement('button');
    eliminarDatoBtn.textContent = '❌';
    eliminarDatoBtn.title = 'Eliminar este dato';
    eliminarDatoBtn.dataset.nombreOriginal = nombreNuevoDato;
    eliminarDatoBtn.onclick = (e) => eliminarDatoDesdeEditor(e.target);
    toolbar.appendChild(eliminarDatoBtn);
    
    const descTextarea = document.createElement('textarea');
    descTextarea.className = "text-gray-700 w-full p-2 border border-gray-300 rounded-md";
    descTextarea.rows = 5;
    descTextarea.dataset.nombreOriginal = nombreNuevoDato; 
    descTextarea.onblur = (e) => actualizarDatoOriginal(e.target);

    nuevoItemContainer.appendChild(toolbar);
    nuevoItemContainer.appendChild(descTextarea);
    
    // 3. Insertar el nuevo elemento en la posición correcta
    itemContainerActual.after(nuevoItemContainer);
    
    console.log(`Nuevo dato "${nombreNuevoDato}" creado y añadido al editor.`);
}


/**
 * Elimina un dato tanto de la sección 'Datos' como de la vista del 'Editor'.
 * Pide confirmación antes de proceder.
 * @param {HTMLButtonElement} boton - El botón 'Eliminar' que fue presionado.
 */
function eliminarDatoDesdeEditor(boton) {
    if (!confirm('¿Estás seguro de que quieres eliminar este dato permanentemente? Esta acción no se puede deshacer.')) {
        return;
    }

    const nombreOriginal = boton.dataset.nombreOriginal;
    const itemContainerEditor = boton.closest('.carta-item');

    // 1. Eliminar de la vista del Editor
    if (itemContainerEditor) {
        itemContainerEditor.remove();
    }

    // 2. Eliminar de la sección de Datos
    let datoOriginalEncontrado = null;
    const todosLosDatos = document.querySelectorAll('#listapersonajes .personaje');
    for (const datoEl of todosLosDatos) {
        if (datoEl.querySelector('.nombreh')?.value.trim() === nombreOriginal) {
            datoOriginalEncontrado = datoEl;
            break;
        }
    }

    if (datoOriginalEncontrado) {
        datoOriginalEncontrado.remove();
        console.log(`Dato "${nombreOriginal}" eliminado con éxito.`);
    } else {
        console.warn(`No se encontró el dato original "${nombreOriginal}" para eliminarlo de la sección de Datos.`);
    }
}
// ===================================
// FIN: Funcionalidad para cargar composición en el editor
// ===================================


// EN: datos.js -> Reemplaza la función existente por esta

/**
 * Crea un nuevo "Dato" para una receta y lo añade a la lista #listapersonajes.
 * No guarda en memoria persistente, solo crea el elemento en la interfaz.
 * @param {string} nombre - El nombre completo de la receta (ej. "Receta - Mi Composición").
 * @param {string} jsonComposicion - El string JSON que representa la composición.
 */
// EN: datos.js -> MODIFICA esta función

function archivarReceta(nombre, jsonComposicion) {
    const nuevoDato = {
        nombre: nombre,
        descripcion: 'Esta es una composición guardada.',
        promptVisual: jsonComposicion,
        imagen: '',
        etiqueta: 'nota',
        arco: 'sin_arco',
        svgContent: '',
        embedding: []
    };

    if (typeof agregarPersonajeDesdeDatos === 'function') {
        agregarPersonajeDesdeDatos(nuevoDato);
    } else {
        return;
    }

    if (typeof reinicializarFiltrosYActualizarVista === 'function') {
        reinicializarFiltrosYActualizarVista();
    }
    
    // --- IMPORTANTE ---
    // Asegúrate de que aquí NO haya una llamada a 'actualizarListaRecetas()'.
    // La hemos eliminado para que no se actualice automáticamente.

    alert(`Composición "${nombre}" creada.`);
}


// EN: datos.js -> REEMPLAZA esta función

/**
 * --- VERSIÓN CORREGIDA Y ROBUSTA ---
 * Obtiene la lista de nombres de todas las recetas guardadas, buscando SIEMPRE
 * en los elementos del DOM, que es la fuente de verdad de lo que se muestra.
 * @returns {string[]} Un array con los nombres de las recetas encontradas.
 */
function obtenerNombresRecetas() {
    const nombres = [];
    const todosLosDatos = document.querySelectorAll('#listapersonajes .personaje'); // Busca todos los datos en la lista

    todosLosDatos.forEach(datoEl => {
        const nombreInput = datoEl.querySelector('.nombreh');
        // Si el dato tiene un nombre y empieza con "Receta - ", lo añadimos
        if (nombreInput && nombreInput.value.startsWith('Receta - ')) {
            nombres.push(nombreInput.value);
        }
    });
    
    console.log(`Búsqueda de recetas finalizada. Encontradas: ${nombres.length}`);
    return nombres;
}

/**
 * Obtiene el JSON de la composición de una receta por su nombre.
 * @param {string} nombreReceta - El nombre de la receta a buscar.
 * @returns {string|null} El JSON de la composición o null si no se encuentra.
 */
function obtenerRecetaPorNombre(nombreReceta) {
    const todosLosDatos = document.querySelectorAll('#listapersonajes .personaje');

    for (const datoEl of todosLosDatos) {
        const nombreInput = datoEl.querySelector('.nombreh');
        if (nombreInput && nombreInput.value === nombreReceta) {
            const promptVisualArea = datoEl.querySelector('.prompt-visualh');
            if (promptVisualArea) {
                return promptVisualArea.value;
            }
        }
    }
    return null;
}
/**
 * Agrega un nuevo dato (como una receta) a la lista y lo guarda en la memoria.
 * A diferencia de agregarDato(), esta función recibe un objeto de dato ya construido.
 * @param {object} nuevoDato - El objeto de dato a agregar (debe tener nombre, tipo, etc.).
 */
function agregarNuevoDato(nuevoDato) {
    if (!nuevoDato || typeof nuevoDato !== 'object' || !nuevoDato.nombre) {
        console.error("Error: Se intentó agregar un dato inválido.", nuevoDato);
        return;
    }

    // 1. Asegura que el nuevo dato tenga un ID único.
    if (!nuevoDato.id) {
        nuevoDato.id = 'dato_' + Date.now();
    }

    // 2. Crea el elemento HTML para el nuevo dato usando la función que ya tienes.
    const elemento = crearElementoDato(nuevoDato);
    const lista = document.getElementById('listapersonajes');
    
    if (lista) {
        // 3. Añade el nuevo elemento al principio de la lista en la interfaz.
        lista.prepend(elemento); 
        inicializarEventListenersDato(elemento); // Asegura que los botones del nuevo elemento funcionen.
    } else {
        console.error("Error: No se encontró el contenedor '#listapersonajes' en el DOM.");
        return; // Detiene la ejecución si no se puede mostrar el dato.
    }
    
    // 4. Llama a la función existente para guardar el estado actualizado en localStorage.
    guardarDatos();
    console.log(`Dato '${nuevoDato.nombre}' agregado y guardado correctamente.`);
}

