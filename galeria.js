// ===================================
// LÓGICA PARA LA GALERÍA DINÁMICA
// Adaptada para id="biblioteca"
// ===================================

/**
 * Mapeo de los tipos de datos internos a nombres amigables para las pestañas.
 */
const NOMBRES_CATEGORIAS = {
    capitulos: 'Capítulos',
    escenas: 'Escenas',
    personajes: 'Personajes',
    momentos: 'Momentos',
    compositor: 'Compositor'
};

// --- INICIO DE LA MODIFICACIÓN ---

/**
 * (Copiada de io.js y MODIFICADA)
 * Convierte una URL de imagen (blob:, http:, etc.) a un data URL en Base64.
 * Si la URL ya es un data URL, la devuelve directamente.
 * * MODIFICACIÓN: Se usa XMLHttpRequest (XHR) para las 'blob:' URLs porque 'fetch'
 * estaba siendo bloqueado por la política de seguridad del navegador,
 * causando el error "Not allowed to load local resource".
 * * @param {string} url La URL de la imagen a convertir.
 * @returns {Promise<string>} Una promesa que se resuelve con el data URL.
 */
async function urlToDataURL(url) {
    // Si la URL está vacía, no es un string o ya es un data URL, no hacer nada.
    if (!url || typeof url !== 'string' || url.startsWith('data:')) {
        return url;
    }

    // --- INICIO DE LA MODIFICACIÓN INTERNA ---
    // El error "Not allowed to load local resource" indica que fetch()
    // está siendo bloqueado para las URLs 'blob:'.
    // Usaremos XMLHttpRequest (XHR) específicamente para las 'blob:',
    // ya que a menudo evade este tipo de restricción de seguridad.
    if (url.startsWith('blob:')) {
        // console.log(`Intentando convertir URL blob via XHR: ${url}`);
        return new Promise((resolve, reject) => {
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.responseType = 'blob'; // Pedir la respuesta como un Blob
                
                xhr.onload = function() {
                    // status 0 puede ser normal para peticiones de blob locales
                    if (this.status === 200 || this.status === 0) {
                        const blob = this.response;
                        // Ahora que tenemos el blob, lo convertimos a data URL
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = (err) => {
                            console.error('Error de FileReader', err);
                            reject(err);
                        };
                        reader.readAsDataURL(blob);
                    } else {
                        // Si hay un error de XHR, rechazar
                        reject(new Error(`XHR falló con estado ${this.status}`));
                    }
                };
                
                xhr.onerror = (err) => {
                    // Error de red
                    console.error('Error de XHR al cargar el blob', err);
                    reject(new Error('Error de XHR al cargar el blob'));
                };
                
                xhr.send();
            } catch (error) {
                console.error(`Error de XHR iniciando la petición para: ${url}`, error);
                reject(error);
            }
        }).catch(error => {
            console.error(`No se pudo convertir la URL (blob:) a Base64 con XHR: ${url}`, error);
            return url; // Devolver la original en caso de error
        });
    }
    // --- FIN DE LA MODIFICACIÓN INTERNA ---

    // Mantener la lógica original de 'fetch' para URLs http/https
    try {
        // console.log(`Intentando convertir URL http/https via fetch: ${url}`);
        // Usa fetch para obtener la imagen, funciona para http:
        const response = await fetch(url);
        const blob = await response.blob();

        // Usa FileReader para convertir el Blob a Base64
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error(`No se pudo convertir la URL (http/https) a Base64 con fetch: ${url}`, error);
        return url; // En caso de error, devolver la URL original.
    }
}


/**
 * Función principal para construir y mostrar la galería dinámica.
 * Esta función debe ser llamada por el botón del menú principal.
 */
async function renderizarGaleriaDinamica() { // <-- MODIFICADO: Añadido async
    // MODIFICADO: Apunta a los IDs de la sección #biblioteca
    const listaHandle = document.getElementById('biblioteca-controles');
    const contenedorHandle = document.getElementById('biblioteca-grid');

    if (!listaHandle || !contenedorHandle) {
        console.error('Error: No se encuentran los elementos #biblioteca-controles o #biblioteca-grid en el DOM.');
        return;
    }

    // 1. Limpiar la galería anterior
    listaHandle.innerHTML = '';
    contenedorHandle.innerHTML = '';
    
    // AÑADIDO: Mostrar un estado de carga
    contenedorHandle.innerHTML = '<p class="galeria-vacia">Recopilando imágenes...</p>';

    // 2. Recopilar todas las imágenes de la aplicación
    const imagenesPorCategoria = recopilarTodasLasImagenesApp();

    let primeraCategoria = null;

    // AÑADIDO: Mostrar un estado de carga más específico
    contenedorHandle.innerHTML = '<p class="galeria-vacia">Procesando imágenes (esto puede tardar)...</p>';

    // 3. AÑADIDO: Convertir todas las URLs (especialmente blob:) a data: URLs
    //    Esto es necesario para evitar errores de Content Security Policy (CSP)
    //    con 'blob:' en entornos de servidor local.
    const promesasCategorias = Object.keys(imagenesPorCategoria).map(async (categoria) => {
        const urls = imagenesPorCategoria[categoria];
        // Filtramos URLs vacías o nulas antes de procesar
        const urlsValidas = urls.filter(Boolean);
        const urlsSanitizadas = await Promise.all(urlsValidas.map(url => urlToDataURL(url)));
        return { [categoria]: urlsSanitizadas };
    });

    const resultados = await Promise.all(promesasCategorias);
    
    // Volver a unir el objeto
    const imagenesSanitizadasPorCategoria = Object.assign({}, ...resultados);
    
    // Limpiar el contenedor de carga
    contenedorHandle.innerHTML = '';

    // 4. Crear las pestañas (botones) y las secciones
    for (const categoria in imagenesSanitizadasPorCategoria) { // <-- MODIFICADO: Usar el objeto sanitizado
        const imagenes = imagenesSanitizadasPorCategoria[categoria]; // <-- MODIFICADO
        if (imagenes.length === 0) continue; 

        if (!primeraCategoria) {
            primeraCategoria = categoria;
        }

        const nombreAmigable = NOMBRES_CATEGORIAS[categoria] || categoria;

        // Crear el botón de la pestaña
        const boton = document.createElement('button');
        // MODIFICADO: IDs únicos para evitar colisiones
        boton.id = `btn-biblioteca-${categoria}`;
        boton.innerHTML = `${nombreAmigable} <span>(${imagenes.length})</span>`;
        boton.onclick = () => mostrarSeccionGaleria(categoria);
        listaHandle.appendChild(boton);

        // Crear la sección de contenido
        const seccion = document.createElement('div');
        // MODIFICADO: IDs únicos para evitar colisiones
        seccion.id = `biblioteca-galeria-${categoria}`;
        seccion.className = 'galeria-seccion';

        // Crear el grid para las imágenes (el CSS se aplica a la clase)
        const grid = document.createElement('div');
        grid.className = 'galeria-grid';

        // Añadir cada imagen al grid
        imagenes.forEach(src => { // <-- src ahora es un data: URL seguro
            if (!src || src.startsWith('blob:')) { 
                // Doble comprobación: Si sigue siendo blob, es que la conversión falló.
                // No lo añadimos para evitar el error en consola.
                console.warn('Se omitió una imagen que no pudo ser convertida:', src);
                return;
            }
            
            const item = document.createElement('div');
            item.className = 'galeria-item';
            
            const img = document.createElement('img');
            img.src = src; // <-- ESTO AHORA ES SEGURO
            img.alt = `Imagen de ${nombreAmigable}`;
            img.loading = 'lazy'; // Carga perezosa para mejor rendimiento
            img.onclick = (e) => abrirVisorImagen(e); // Llama al visor
            
            item.appendChild(img);
            grid.appendChild(item);
        });

        seccion.appendChild(grid);
        contenedorHandle.appendChild(seccion);
    }

    // 5. Mostrar la primera pestaña por defecto
    if (primeraCategoria) {
        mostrarSeccionGaleria(primeraCategoria);
    } else {
        contenedorHandle.innerHTML = '<p class="galeria-vacia">No hay imágenes para mostrar en la galería.</p>';
    }
}

// --- FIN DE LA MODIFICACIÓN ---


/**
 * Recopila todas las imágenes de las variables globales y el DOM.
 * @returns {object} Un objeto con arrays de URLs de imágenes, clasificado por categoría.
 */
function recopilarTodasLasImagenesApp() {
    const categorias = {
        capitulos: [],
        escenas: [],
        personajes: [],
        momentos: [],
        compositor: []
    };

    try {
        // 1. Capítulos (desde window.escenas, que contiene los libros/capítulos)
        Object.values(window.escenas || {}).forEach(capitulo => {
            (capitulo.frames || []).forEach(frame => {
                if (frame.imagen) categorias.capitulos.push(frame.imagen);
            });
        });

        // 2. Escenas (Storyboard)
        (window.storyScenes || []).forEach(escena => {
            (escena.tomas || []).forEach(toma => {
                if (toma.imagen) categorias.escenas.push(toma.imagen);
            });
        });

        // 3. Personajes (Datos activos y archivados)
        document.querySelectorAll('#listapersonajes .personaje, #bibliotecadatos-lista .personaje').forEach(nodo => {
            const src = nodo.dataset.fullImageSrc || nodo.querySelector('img')?.src;
            if (src) categorias.personajes.push(src);
        });

        // 4. Momentos (Aventura Interactiva)
        document.querySelectorAll('#momentos-lienzo .momento-nodo').forEach(nodo => {
            const src = nodo.querySelector('.momento-imagen')?.src;
            if (src && !src.endsWith('placeholder.png')) { // Evitar placeholders
                categorias.momentos.push(src);
            }
        });

        // 5. Compositor (Generador de Imágenes)
        document.querySelectorAll('#generaciones-container .generacion-item').forEach(item => {
            const src = item.querySelector('img')?.src;
            if (src) categorias.compositor.push(src);
        });

    } catch (error) {
        console.error("Error al recopilar imágenes:", error);
    }

    // Filtrar duplicados y valores vacíos de cada categoría
    for (const key in categorias) {
        categorias[key] = [...new Set(categorias[key].filter(Boolean))];
    }

    return categorias;
}

/**
 * Muestra una sección de la galería (por categoría) y oculta las demás.
 * @param {string} categoria La categoría a mostrar (ej: 'personajes').
 */
function mostrarSeccionGaleria(categoria) {
    // MODIFICADO: Apunta a los selectores dentro de #biblioteca-grid
    document.querySelectorAll('#biblioteca-grid .galeria-seccion').forEach(seccion => {
        seccion.classList.remove('active');
    });

    // MODIFICADO: Apunta a los selectores dentro de #biblioteca-controles
    document.querySelectorAll('#biblioteca-controles button').forEach(boton => {
        boton.classList.remove('active');
    });

    // MODIFICADO: Busca el ID de sección único
    const seccionActiva = document.getElementById(`biblioteca-galeria-${categoria}`);
    if (seccionActiva) {
        seccionActiva.classList.add('active');
    }

    // MODIFICADO: Busca el ID de botón único
    const botonActivo = document.getElementById(`btn-biblioteca-${categoria}`);
    if (botonActivo) {
        botonActivo.classList.add('active');
    }
}

/**
 * Muestra la imagen clicada en un visor superpuesto.
 * @param {Event} event El evento de clic de la imagen.
 */
function abrirVisorImagen(event) {
    const overlay = document.getElementById('image-preview-overlay');
    const enlargedImg = document.getElementById('enlarged-img');
    const closeBtn = overlay.querySelector('.close-btn');

    if (!overlay || !enlargedImg) {
        console.warn('No se encuentra el visor de imágenes. Asegúrate de que el HTML incluye #image-preview-overlay y #enlarged-img');
        return;
    }

    enlargedImg.src = event.target.src;
    overlay.style.display = 'flex'; // Usar flex para centrar

    const cerrarVisor = () => {
        overlay.style.display = 'none';
        enlargedImg.src = '';
    };

    overlay.onclick = (e) => {
        if (e.target === overlay) { // Cerrar solo si se hace clic en el fondo
            cerrarVisor();
        }
    };
    
    if (closeBtn) {
         closeBtn.onclick = cerrarVisor;
    }
}

// Opcional: Registrar el evento de cierre del visor si no lo está ya
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('image-preview-overlay');
    if (overlay) {
        const closeBtn = overlay.querySelector('.close-btn');
        const cerrarVisor = () => {
            overlay.style.display = 'none';
        };
        
        if (closeBtn) {
            closeBtn.onclick = cerrarVisor;
        }
        
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                cerrarVisor();
            }
        };
    }
});