/**
 * Mueve un elemento de dato (.personaje) entre el área de trabajo y la biblioteca.
 * VERSIÓN DEFINITIVA Y ROBUSTA: Crea una vista temporal para la biblioteca sin alterar la original.
 * @param {string} datoId - El data-id del dato que se va a mover.
 */
function moverDatoEntreVistas(datoId) {
    const listaActiva = document.getElementById('listapersonajes');
    const listaBiblioteca = document.getElementById('bibliotecadatos-lista');
    const datoElement = document.querySelector(`.personaje[data-id="${datoId}"]`);
    const stickerElement = document.querySelector(`.personaje-sticker[data-id="${datoId}"]`);

    if (!datoElement || !listaActiva || !listaBiblioteca) {
        console.error("Error: No se pudo encontrar el dato o los contenedores.");
        return;
    }

    if (listaActiva.contains(datoElement)) {
        // --- Mover A LA BIBLIOTECA (NUEVA LÓGICA) ---
        listaBiblioteca.appendChild(datoElement);
        datoElement.classList.add('archivado');

        if (stickerElement) stickerElement.style.display = 'none';

        // 1. Ocultar la parte visual original para no interferir.
        const originalVisual = datoElement.querySelector('.personaje-visual');
        if (originalVisual) originalVisual.style.display = 'none';

        // 2. Crear y añadir una PREVISUALIZACIÓN DE IMAGEN nueva y limpia.
        const imgSrc = datoElement.dataset.fullImageSrc || '';
        const imgContainer = document.createElement('div');
        imgContainer.className = 'archivado-img-preview'; // Usaremos esta clase en el CSS.
        if (imgSrc) {
            const imgEl = document.createElement('img');
            imgEl.src = imgSrc;
            imgContainer.appendChild(imgEl);
        }
        datoElement.prepend(imgContainer); // La ponemos al principio.

        // 3. Crear el contenedor de información.
        const infoContainer = document.createElement('div');
        infoContainer.className = 'archivado-info';

        // 4. Mover los elementos de texto DENTRO del nuevo contenedor de info.
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'archivado-tags';

        const nombreEl = datoElement.querySelector('.nombreh');
        const tagEl = datoElement.querySelector('.change-tag-btn');
        const arcEl = datoElement.querySelector('.change-arc-btn');
        const descripcionText = datoElement.dataset.descripcion || ''; // Leemos la descripción del dataset
        const promptVisualText = datoElement.querySelector('.prompt-visualh')?.value || '';

        if (nombreEl) infoContainer.appendChild(nombreEl);
        if (tagEl) tagsContainer.appendChild(tagEl);
        if (arcEl) tagsContainer.appendChild(arcEl);
        infoContainer.appendChild(tagsContainer);
        
        // Creamos un nuevo elemento para la descripción
        const descPreviewEl = document.createElement('p');
        descPreviewEl.className = 'archivado-descripcion-preview';
        descPreviewEl.textContent = descripcionText;
        infoContainer.appendChild(descPreviewEl);

        if (promptVisualText) {
            const promptPreviewEl = document.createElement('p');
            promptPreviewEl.className = 'archivado-prompt-preview';
            promptPreviewEl.innerHTML = `<strong></strong> ${promptVisualText}`;
            infoContainer.appendChild(promptPreviewEl);
        }
        
        datoElement.appendChild(infoContainer);

        // 5. Añadir el botón de restaurar
        const botonRestaurar = document.createElement('button');
        botonRestaurar.className = 'boton-restaurar';
        botonRestaurar.textContent = 'Restaurar';
        botonRestaurar.title = 'Mover de vuelta al área de trabajo';
        botonRestaurar.onclick = (e) => {
            e.stopPropagation();
            moverDatoEntreVistas(datoId);
        };
        datoElement.appendChild(botonRestaurar);

    } else {
        // --- Mover DE VUELTA AL ÁREA DE TRABAJO (NUEVA LÓGICA) ---
        listaActiva.appendChild(datoElement);
        datoElement.classList.remove('archivado');

        if (stickerElement) stickerElement.style.display = '';

        // 1. Restaurar la visibilidad de la parte visual original.
        const originalVisual = datoElement.querySelector('.personaje-visual');
        if (originalVisual) originalVisual.style.display = '';

        // 2. Devolver los elementos de texto a su sitio original (hijos directos del dato).
        const infoContainer = datoElement.querySelector('.archivado-info');
        if (infoContainer) {
            const nombreEl = infoContainer.querySelector('.nombreh');
            const tagEl = infoContainer.querySelector('.change-tag-btn');
            const arcEl = infoContainer.querySelector('.change-arc-btn');

            if (nombreEl) datoElement.appendChild(nombreEl);
            if (tagEl) datoElement.appendChild(tagEl);
            if (arcEl) datoElement.appendChild(arcEl);
        }

        // 3. Eliminar todos los elementos temporales que creamos.
        datoElement.querySelector('.archivado-img-preview')?.remove();
        datoElement.querySelector('.archivado-info')?.remove();
        datoElement.querySelector('.boton-restaurar')?.remove();
    }
}