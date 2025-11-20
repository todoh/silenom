

 /**
 * Recopila todas las URLs de imágenes únicas de la galería de datos existentes.
 * @returns {string[]} Un array de URLs de imágenes únicas.
 */
 
function recopilarImagenesDeGaleria() {
    const urls = new Set();
    // Buscamos el contenedor principal de cada dato
    const datos = document.querySelectorAll('#listapersonajes .personaje');
    
    datos.forEach(dato => {
        // Obtenemos la imagen original guardada en el dataset
        const fullImageSrc = dato.dataset.fullImageSrc;
        
        if (fullImageSrc && !fullImageSrc.endsWith('/') && !fullImageSrc.startsWith('data:image/gif;base64')) {
            urls.add(fullImageSrc); // <-- ¡Correcto! Usamos la imagen original.
        }
    });
    
    return Array.from(urls);
}

/**
 * Abre un modal que muestra todas las imágenes disponibles para seleccionar y actualizar un dato.
 * @param {HTMLElement} personajeContenedor - El elemento .personaje cuyo visual se actualizará.
 */
function abrirModalGaleria(personajeContenedor) {
    // Evita abrir múltiples modales
    if (document.getElementById('gallery-select-modal-overlay')) return;

    // Crear el fondo oscuro (overlay)
    const overlay = document.createElement('div');
    overlay.id = 'gallery-select-modal-overlay';
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: '20000', backdropFilter: 'blur(5px)'
    });

    // Crear el contenedor principal del modal
    const modalContent = document.createElement('div');
    Object.assign(modalContent.style, {
        backgroundColor: '#fff', padding: '20px', borderRadius: '12px',
        width: '90%', maxWidth: '800px', height: '80%',
        display: 'flex', flexDirection: 'column', position: 'relative',
        boxShadow: '0 5px 20px rgba(0, 0, 0, 0.2)'
    });
    // Evitar que un clic dentro del modal lo cierre
    modalContent.addEventListener('click', e => e.stopPropagation());

    // Título y botón de cierre
    const modalTitle = document.createElement('h2');
    modalTitle.textContent = 'Selecciona una Imagen';
    Object.assign(modalTitle.style, { marginTop: '0', color: '#333', textAlign: 'center' });

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    Object.assign(closeButton.style, {
        position: 'absolute', top: '10px', right: '15px', fontSize: '24px',
        background: 'none', border: 'none', cursor: 'pointer', color: '#333'
    });

    // Contenedor de la cuadrícula de imágenes
    const imageGrid = document.createElement('div');
    Object.assign(imageGrid.style, {
        flexGrow: '1', overflowY: 'auto', display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '15px', padding: '15px', borderTop: '1px solid #eee', marginTop: '10px'
    });

    // Poblar la galería con las imágenes recopiladas
    const imagenes = recopilarImagenesDeGaleria();
    if (imagenes.length === 0) {
        imageGrid.innerHTML = '<p style="color: #666; grid-column: 1 / -1; text-align: center;">No hay imágenes en la galería para seleccionar.</p>';
    } else {
        imagenes.forEach(src => {
            const imgWrapper = document.createElement('div');
            Object.assign(imgWrapper.style, {
                cursor: 'pointer', borderRadius: '8px', overflow: 'hidden',
                border: '2px solid transparent', transition: 'border-color 0.2s',
                aspectRatio: '1 / 1'
            });
            const img = document.createElement('img');
            img.src = src;
            Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover', display: 'block' });

            imgWrapper.appendChild(img);
            imgWrapper.onmouseover = () => { imgWrapper.style.borderColor = '#007bff'; };
            imgWrapper.onmouseout = () => { imgWrapper.style.borderColor = 'transparent'; };

            // Acción al hacer clic en una imagen de la galería
          // CÓDIGO CORREGIDO
// Hacemos la función 'async' para poder usar 'await'
imgWrapper.onclick = async () => {
    const descripcionActual = personajeContenedor.querySelector('textarea.descripcionh').value;

    // Obtenemos la función 'actualizarVisual' asociada a ESE dato específico.
    // Esto es un poco complejo, así que vamos a simplificarlo llamando a una
    // función global si fuera necesario, o simplemente actualizando los datos.
    // La forma más limpia es replicar la lógica clave aquí.

    // Llamamos a la función centralizada para asegurar que todo se actualice correctamente.
    // 'src' ahora contiene la URL de la imagen en alta resolución.
    
    // Necesitamos encontrar la función 'actualizarVisual' del dato específico.
    // Dado que está encapsulada, la forma más sencilla es llamar a agregarPersonajeDesdeDatos
    // y reemplazar el elemento. O, más fácil, invocar la lógica directamente.
    
    const imgPrincipal = personajeContenedor.querySelector('.personaje-visual img');
    const imgEditor = personajeContenedor.querySelector('.edit-preview-image');
    const descPreview = personajeContenedor.querySelector('.personaje-descripcion-preview');

    // Guardamos la imagen original seleccionada
    personajeContenedor.dataset.fullImageSrc = src;

    // Generamos y aplicamos la miniatura
    try {
        const thumbnail = await crearThumbnail(src);
        if(imgPrincipal) imgPrincipal.src = thumbnail;
    } catch(e) {
        if(imgPrincipal) imgPrincipal.src = src; // Fallback
    }

    // Aplicamos la imagen original al editor
    if(imgEditor) imgEditor.src = src;

    // Actualizamos la descripción
    if(descPreview) descPreview.textContent = descripcionActual;

    // Importante: si se cambia la imagen, ya no se considera un SVG editable
    delete personajeContenedor.dataset.svgContent;
    
    // Cerrar el modal
    document.body.removeChild(overlay);
};
            imageGrid.appendChild(imgWrapper);
        });
    }
    
    // Función para cerrar el modal
    const closeModal = () => {
        if (overlay.parentNode) document.body.removeChild(overlay);
    };
    closeButton.onclick = closeModal;
    overlay.onclick = closeModal;

    // Ensamblar y mostrar el modal
    modalContent.appendChild(closeButton);
    modalContent.appendChild(modalTitle);
    modalContent.appendChild(imageGrid);
    overlay.appendChild(modalContent);
    document.body.appendChild(overlay);
}



