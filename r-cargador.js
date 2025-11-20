let previewRenderer = null; 

 async function generate3DPreview(modelJson, size = 450) {
    // 1. Verificación de dependencias (sin cambios)
    if (typeof THREE === 'undefined' || typeof createModelFromJSON === 'undefined') {
        console.error("Error Crítico: generate3DPreview no puede funcionar sin THREE.js y la función global createModelFromJSON.");
        return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="40">⚠️</text></svg>';
    }

    // ---- INICIO DE LA CORRECCIÓN ----
    // 2. Creación o reutilización del renderizador
    if (!previewRenderer) {
        try {
            console.log("Creando renderizador de previsualización por primera vez...");
            previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
            previewRenderer.setSize(size, size);
            previewRenderer.setPixelRatio(window.devicePixelRatio);
        } catch (e) {
            console.error("No se pudo inicializar el renderizador de WebGL:", e);
            previewRenderer = null; // Asegurarse de que no se intente usar si falló
            return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="40">❌</text></svg>';
        }
    }
    // ---- FIN DE LA CORRECCIÓN ----

    // 3. La escena, cámara e iluminación se siguen creando nuevas para cada previsualización
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(1.5, 2, 1);
    scene.add(dirLight);

    let model;
    let dataUrl = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="40">❓</text></svg>';

    try {
        model = createModelFromJSON(modelJson);
        if (!model) throw new Error("createModelFromJSON devolvió un modelo nulo.");
        scene.add(model);

        const box = new THREE.Box3().setFromObject(model);
        const modelSize = box.getSize(new THREE.Vector3());
        const modelCenter = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(modelSize.x, modelSize.y, modelSize.z);

        if (maxDim > 0 && isFinite(maxDim)) {
            const fov = camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            cameraZ *= 1.8;
            camera.position.set(modelCenter.x, modelCenter.y, modelCenter.z + cameraZ);
            camera.lookAt(modelCenter);
        } else {
             camera.position.set(0, 0, 5);
        }

        // Se usa el renderizador compartido
        previewRenderer.render(scene, camera);
        dataUrl = previewRenderer.domElement.toDataURL('image/png');

    } catch (error) {
        console.error("¡ERROR FATAL DURANTE LA GENERACIÓN DE PREVISUALIZACIÓN!", error);
        console.error("JSON que causó el error:", JSON.stringify(modelJson, null, 2));
    } finally {
        // Limpieza de memoria: ¡YA NO SE DESTRUYE EL RENDERIZADOR!
        if (model) {
            model.traverse(object => {
                if (object.isMesh) {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                         if (Array.isArray(object.material)) {
                            object.material.forEach(material => material.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                }
            });
        }
    }

    return dataUrl;
}

// EN: r-cargador.js

function saveWorldToCharacter() {
    const name = prompt("Introduce un nombre para este mundo:", "Mundo de Aventura");
    if (!name || name.trim() === "") {
        alert("Guardado cancelado: el nombre no puede estar vacío.");
        return;
    }

    const finalName = `${WORLD_DATA_NAME_PREFIX}${name.trim()}`;

    // --- [INICIO DE LA MODIFICACIÓN CLAVE] ---
    // 1. Capturamos el lienzo de la textura como una imagen en formato base64.
    const textureDataUrl = editor3DState.textureCanvas.toDataURL('image/png');
    // --- [FIN DE LA MODIFICACIÓN CLAVE] ---

    const dataToSave = {
        metadata: worldData.metadata,
        chunks: {}
    };

    for (const chunkId in worldData.chunks) {
        const chunk = worldData.chunks[chunkId];
        dataToSave.chunks[chunkId] = [
            chunk.groundTextureKey,
            chunk.objects
        ];
    }

    const worldJson = JSON.stringify(dataToSave, null, 2);
    let existingDatoElement = null;
    const allCharacters = document.querySelectorAll('#listapersonajes .personaje');
    for (const charElement of allCharacters) {
        const nameInput = charElement.querySelector('.nombreh');
        if (nameInput && nameInput.value === finalName) {
            existingDatoElement = charElement;
            break;
        }
    }

    if (existingDatoElement) {
        if (confirm(`Ya existe un mundo llamado "${name.trim()}". ¿Quieres sobrescribirlo?`)) {
            const promptVisualTextarea = existingDatoElement.querySelector('.prompt-visualh');
            if (promptVisualTextarea) {
                promptVisualTextarea.value = worldJson;
                
                // --- [MODIFICACIÓN] También actualizamos la imagen al sobrescribir ---
                const imgElement = existingDatoElement.querySelector('.personaje-visual img');
                if (imgElement) {
                    imgElement.src = textureDataUrl;
                    imgElement.classList.remove('hidden');
                }
                alert(`¡Mundo "${name.trim()}" sobrescrito correctamente!`);
            } else {
                alert("Error: No se pudo encontrar el campo de datos del mundo existente para sobrescribir.");
            }
        } else {
            alert("Guardado cancelado.");
            return;
        }
    } else {
        if (typeof agregarPersonajeDesdeDatos !== 'function') {
            alert("Error: La función para crear datos ('agregarPersonajeDesdeDatos') no está disponible.");
            return;
        }
        const nuevoDatoMundo = {
            nombre: finalName,
            descripcion: 'Dato de Mundo 3D. Contiene la estructura completa de un mundo para el renderizador.',
            promptVisual: worldJson,
            etiqueta: 'ubicacion',
            arco: 'sin_arco',
            // --- [MODIFICACIÓN] Asignamos la imagen capturada al nuevo dato ---
            imagen: textureDataUrl, 
            svgContent: '',
            embedding: []
        };
        agregarPersonajeDesdeDatos(nuevoDatoMundo);
        alert(`¡Mundo "${name.trim()}" guardado como un dato completo!`);
    }

    if (typeof reinicializarFiltrosYActualizarVista === 'function') {
        reinicializarFiltrosYActualizarVista();
    }
    populateWorldList();
}


function populateWorldList() {
    const select = document.getElementById('r-load-world-select');
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">Cargar Mundo...</option>';
    const allCharacters = document.querySelectorAll('#listapersonajes .personaje');
    allCharacters.forEach(charElement => {
        const nameInput = charElement.querySelector('.nombreh');
        if (nameInput && nameInput.value.startsWith(WORLD_DATA_NAME_PREFIX)) {
            const worldName = nameInput.value;
            const option = document.createElement('option');
            option.value = worldName;
            option.textContent = worldName.substring(WORLD_DATA_NAME_PREFIX.length);
            select.appendChild(option);
        }
    });
    select.value = currentValue;
}
async function populatePalettes() {
    editorDOM.texturePalette.innerHTML = '';
    editorDOM.entityPalette.innerHTML = '';
 const avatarBtn = document.createElement('button');
    avatarBtn.className = 'palette-item';
    avatarBtn.innerHTML = `<div class="palette-item-preview palette-item-preview-emoji">👤</div><span>AVATAR</span>`;
    avatarBtn.onclick = openAvatarSelectionModal;
    editorDOM.entityPalette.appendChild(avatarBtn);
    
     
    const textureGrid = document.createElement('div');
    textureGrid.className = 'palette-container';
    editorDOM.texturePalette.appendChild(textureGrid);

    const entityGrid = document.createElement('div');
    entityGrid.className = 'palette-container';
    editorDOM.entityPalette.appendChild(entityGrid);

    // Dibuja la herramienta de borrar
    const eraserTool = tools.entities.eraser;
    if (eraserTool) {
        const btn = document.createElement('button');
        btn.className = 'palette-item';
        btn.dataset.category = 'entity';
        btn.dataset.id = 'eraser';
        btn.innerHTML = `<div class="palette-item-preview palette-item-preview-emoji">${eraserTool.icon}</div><span>${eraserTool.name}</span>`;
        btn.onclick = () => selectTool('entity', 'eraser');
        entityGrid.appendChild(btn);
    }

    // --- MODIFICADO ---
    // Dibuja las texturas de terreno generando una preview procedural
    for (const id in tools.textures) {
        const tool = tools.textures[id];
        const btn = document.createElement('button');
        btn.className = 'palette-item';
        btn.dataset.category = 'texture';
        btn.dataset.id = id;

        // Generamos un canvas pequeño con la textura procedural
        const material = createMaterial(tool.material); // Usamos la función central
        let previewHTML = '<div class="palette-item-preview"><div class="color-swatch" style="background-color:#FF00FF;"></div></div>'; // Preview de error
        
        if (material.map && material.map.image instanceof HTMLCanvasElement) {
            const textureCanvas = material.map.image;
            previewHTML = `<div class="palette-item-preview"><img src="${textureCanvas.toDataURL()}" alt="${tool.name}" style="width:100%; height:100%; object-fit: cover;"></div>`;
        } else if (material.color) {
             previewHTML = `<div class="palette-item-preview"><div class="color-swatch" style="background-color:${material.color.getStyle()};"></div></div>`;
        }

        btn.innerHTML = `${previewHTML}<span>${tool.name}</span>`;
        btn.onclick = () => selectTool('texture', id);
        textureGrid.appendChild(btn);
    }


    // --- LÓGICA CORREGIDA ---
    // 1. Carga PRIMERO todas las entidades predefinidas de r-data.js
    for (const id in tools.entities) {
        if (id === 'eraser') continue;

        const tool = tools.entities[id];
        const btn = document.createElement('button');
        btn.className = 'palette-item';
        btn.dataset.category = 'entity';
        btn.dataset.id = id;

        let previewHTML = '';
        if (tool.model) {
            // Genera la preview 3D para los modelos predefinidos
            try {
                const previewSrc = await generate3DPreview(tool.model);
                previewHTML = `<div class="palette-item-preview"><img src="${previewSrc}" alt="${tool.name}"></div>`;
            } catch (e) {
                console.error(`Falló la previsualización para el modelo predefinido '${id}':`, e);
                previewHTML = `<div class="palette-item-preview palette-item-preview-emoji">⚠️</div>`;
            }
        } else {
            previewHTML = `<div class="palette-item-preview palette-item-preview-emoji">${tool.icon || '❓'}</div>`;
        }
        
        btn.innerHTML = `${previewHTML}<span>${tool.name}</span>`;
        btn.onclick = () => selectTool('entity', id);
        entityGrid.appendChild(btn);
    }

    // 2. DESPUÉS, llama a la función para cargar los assets personalizados del arco "Videojuego".
    // Esto asegura que no haya conflictos y que el flujo de carga sea correcto.
    await autoLoadGameAssets();
}




async function importCharacterAsTool(event) {
    const item = event.currentTarget;
    const name = item.dataset.name;
    const type = item.dataset.type;
    const toolId = `custom_${name.replace(/\s+/g, '_')}`;

    if (tools.customEntities[toolId]) {
        alert(`El dato "${name}" ya ha sido importado.`);
        return;
    }

    const newTool = {
        name: name,
        type: 'custom',
        modelType: type,
        dataRef: name,
        isSolid: true,
        radius: 1.2
    };

    let previewHTML = '';
    if (type === 'sprite') {
        const imgSrc = item.dataset.imgSrc;
        newTool.icon = imgSrc;
        previewHTML = `<div class="palette-item-preview"><img src="${imgSrc}" alt="${name}"></div>`;
    } else if (type === 'json3d') {
        const modelData = JSON.parse(item.dataset.modelData);
        newTool.icon = modelData;
        const previewSrc = await generate3DPreview(modelData);
        previewHTML = `<div class="palette-item-preview"><img src="${previewSrc}" alt="${name}"></div>`;
    }

    tools.customEntities[toolId] = newTool;

    const entityGrid = editorDOM.entityPalette.querySelector('.palette-container');
    if (entityGrid) {
        const btn = document.createElement('button');
        btn.className = 'palette-item';
        btn.dataset.category = 'customEntity';
        btn.dataset.id = toolId;
        btn.innerHTML = `${previewHTML}<span>${name}</span>`;
        btn.onclick = () => selectTool('customEntity', toolId);
        entityGrid.appendChild(btn);
    }

    closeCharacterModal();
    alert(`¡"${name}" añadido a la paleta de entidades!`);
}





async function loadWorldData(worldName) {
    if (!worldName) return;
    
    let worldJson = null;
    let textureImageUrl = null; // <-- Variable para guardar la URL de la imagen

    const allCharacters = document.querySelectorAll('#listapersonajes .personaje');
    for (const charElement of allCharacters) {
        const nameInput = charElement.querySelector('.nombreh');
        if (nameInput && nameInput.value === worldName) {
            const promptVisual = charElement.querySelector('.prompt-visualh');
            if (promptVisual) {
                worldJson = promptVisual.value;
            }
            // --- [INICIO DE LA MODIFICACIÓN CLAVE] ---
            // Buscamos la imagen asociada a este dato.
            const imgElement = charElement.querySelector('.personaje-visual img');
            if (imgElement && imgElement.src && !imgElement.src.endsWith('/')) {
                textureImageUrl = imgElement.src;
            }
            // --- [FIN DE LA MODIFICACIÓN CLAVE] ---
            break;
        }
    }

    if (worldJson) {
        try {
            // --- [MODIFICACIÓN] Carga de la textura ---
            if (textureImageUrl) {
                const image = new Image();
                image.onload = () => {
                    const ctx = editor3DState.textureContext;
                    const canvas = editor3DState.textureCanvas;
                    // Dibujamos la imagen cargada sobre todo el lienzo de la textura
                    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                    // Avisamos a Three.js que la textura ha cambiado
                    editor3DState.dynamicTexture.needsUpdate = true;
                    console.log("Textura del mundo cargada desde la imagen del dato.");

                    // Una vez cargada la textura, procesamos los objetos
                    cargarDatosDeChunks(worldJson);
                };
                image.onerror = () => {
                    console.error("Error al cargar la imagen de la textura. Se procederá sin ella.");
                    cargarDatosDeChunks(worldJson); // Si falla, carga los objetos igualmente
                };
                image.src = textureImageUrl;
            } else {
                // Si no hay imagen, procedemos como antes (aunque el render ya no reconstruirá el suelo)
                console.warn("No se encontró imagen para la textura del mundo. Se cargarán solo los objetos.");
                cargarDatosDeChunks(worldJson);
            }

        } catch (e) {
            alert(`Error al procesar los datos del mundo "${worldName}".`);
            console.error("Error al parsear o cargar los datos del mundo:", e);
        }
    } else {
        alert(`No se encontró un dato de mundo con el nombre "${worldName}".`);
    }
}

/**
 * Función auxiliar para procesar y renderizar los chunks y objetos del mundo.
 * @param {string} worldJson - El string JSON con los datos del mundo.
 */
function cargarDatosDeChunks(worldJson) {
    const parsedData = JSON.parse(worldJson);
    const loadedChunks = {};

    for (const chunkId in parsedData.chunks) {
        const chunkData = parsedData.chunks[chunkId];
        if (Array.isArray(chunkData)) {
            loadedChunks[chunkId] = {
                groundTextureKey: chunkData[0],
                objects: chunkData[1] || []
            };
        } else {
            loadedChunks[chunkId] = chunkData;
        }
    }
    
    worldData = {
        metadata: parsedData.metadata || { playerStartPosition: null },
        chunks: loadedChunks
    };

    // MUY IMPORTANTE: Llamamos a render3DWorldFromData SIN que redibuje el suelo,
    // para no sobreescribir la textura que acabamos de cargar.
    render3DWorldFromData({ redrawGround: false });
    alert(`¡Mundo cargado!`);
}




async function autoLoadGameAssets() {
    console.log("Buscando y actualizando assets de videojuego para cargar...");

    document.querySelectorAll('.palette-item[data-category="customEntity"]').forEach(btn => btn.remove());
    tools.customEntities = {};

    const entityGrid = editorDOM.entityPalette.querySelector('.palette-container');
    if (!entityGrid) {
        console.error("No se encontró el contenedor de la paleta de entidades.");
        return;
    }

    const characterDataElements = document.querySelectorAll('#listapersonajes .personaje');

    for (const charElement of characterDataElements) {
        const arco = charElement.querySelector('.change-arc-btn')?.dataset.arco;

        if (arco === 'videojuego') {
            const nombre = charElement.querySelector('.nombreh')?.value;
            if (!nombre) continue;

            const propiedadesJuego = procesarPropiedadesVideojuego(charElement);
            const toolId = `custom_${nombre.replace(/\s+/g, '_')}`;
            const promptVisualText = charElement.querySelector('.prompt-visualh')?.value;
            
            let modelType = 'sprite';
            let modelData = null;

            // **MODIFICADO**: Detectar modelos 3D
            if (promptVisualText) {
                try {
                    const parsed = JSON.parse(promptVisualText);
                    if (parsed && typeof parsed === 'object' && (Array.isArray(parsed.parts) || Array.isArray(parsed.objects))) {
                        modelType = 'json3d';
                        modelData = parsed;
                    }
                } catch (e) { /* No es JSON, se mantiene como 'sprite' */ }
            }

            const newTool = {
                name: nombre,
                type: 'custom',
                modelType: modelType,
                dataRef: nombre,
                isSolid: propiedadesJuego.fisica ? !propiedadesJuego.fisica.estatico : true,
                radius: propiedadesJuego.colision ? propiedadesJuego.colision.radio : 1.2,
                gameProps: propiedadesJuego 
            };

            let previewHTML = '';
            const imagenSrc = charElement.querySelector('.personaje-visual img')?.src;

            if (modelType === 'json3d' && modelData) {
                newTool.icon = modelData;
                const previewSrc = await generate3DPreview(modelData);
                previewHTML = `<div class="palette-item-preview"><img src="${previewSrc}" alt="${nombre}"></div>`;
            } else if (imagenSrc && !imagenSrc.endsWith('/')) {
                newTool.icon = imagenSrc;
                previewHTML = `<div class="palette-item-preview"><img src="${imagenSrc}" alt="${nombre}"></div>`;
            } else {
                console.warn(`Asset '${nombre}' omitido por falta de contenido visual válido.`);
                continue;
            }

            tools.customEntities[toolId] = newTool;

            const btn = document.createElement('button');
            btn.className = 'palette-item';
            btn.dataset.category = 'customEntity';
            btn.dataset.id = toolId;
            btn.innerHTML = `
                ${previewHTML}
                <span>${nombre}</span>
            `;
            btn.onclick = () => selectTool('customEntity', toolId);
            entityGrid.appendChild(btn);
        }
    }
    console.log(`Assets desde el arco 'videojuego' actualizados. Total: ${Object.keys(tools.customEntities).length}`);
}





async function refreshGameAssetsPalette() {
    console.log("Actualizando assets de la paleta...");

    document.querySelectorAll('.palette-item[data-category="customEntity"]').forEach(btn => btn.remove());
    tools.customEntities = {};

    const entityGrid = editorDOM.entityPalette.querySelector('.palette-container');
    if (!entityGrid) {
        console.error("No se encontró el contenedor de la paleta de entidades.");
        return;
    }
    
    const characterDataElements = document.querySelectorAll('#listapersonajes .personaje');
    
    for (const charElement of characterDataElements) {
        const arco = charElement.querySelector('.change-arc-btn')?.dataset.arco;
        
        if (arco === 'videojuego') {
            const nombre = charElement.querySelector('.nombreh')?.value;
            if (!nombre) continue;

            const toolId = `custom_${nombre.replace(/\s+/g, '_')}`;
            
            if (tools.customEntities[toolId]) continue;

            const promptVisualText = charElement.querySelector('.prompt-visualh')?.value;
            let modelType = 'sprite';
            let modelData = null;

            if (promptVisualText) {
                try {
                    const parsed = JSON.parse(promptVisualText);
                    if (parsed && typeof parsed === 'object' && (Array.isArray(parsed.parts) || Array.isArray(parsed.objects))) {
                        modelType = 'json3d';
                        modelData = parsed;
                    }
                } catch (e) { /* No es JSON, se queda como sprite */ }
            }
            
            const newTool = {
                name: nombre,
                type: 'custom',
                modelType: modelType,
                dataRef: nombre,
                isSolid: true,
                radius: 1.2
            };

            let previewHTML = '';
            const imagenSrc = charElement.querySelector('.personaje-visual img')?.src;

            if (modelType === 'json3d' && modelData) {
                 newTool.icon = modelData;
                 const previewSrc = await generate3DPreview(modelData);
                 previewHTML = `<div class="palette-item-preview"><img src="${previewSrc}" alt="${nombre}"></div>`;
            } else if (imagenSrc && !imagenSrc.endsWith('/')) {
                 newTool.icon = imagenSrc;
                 previewHTML = `<div class="palette-item-preview"><img src="${imagenSrc}" alt="${nombre}"></div>`;
            } else {
                continue;
            }

            tools.customEntities[toolId] = newTool;

            const btn = document.createElement('button');
            btn.className = 'palette-item';
            btn.dataset.category = 'customEntity';
            btn.dataset.id = toolId;
            btn.innerHTML = `${previewHTML}<span>${nombre}</span>`;
            btn.onclick = () => selectTool('customEntity', toolId);
            entityGrid.appendChild(btn);
        }
    }
    console.log("Assets de la paleta actualizados.", tools.customEntities);
}
async function renderizarPreviewsInicialesDeDatos() {
    console.log("Iniciando renderizado de previsualizaciones 3D en las tarjetas de Datos...");
    const todosLosDatos = document.querySelectorAll('#listapersonajes .personaje');

    for (const datoDIV of todosLosDatos) {
        const textarea = datoDIV.querySelector('.prompt-visualh');
        if (textarea && textarea.value) {
            let modelData = null;
            try {
                const parsed = JSON.parse(textarea.value);
                if (parsed && typeof parsed === 'object' && Array.isArray(parsed.objects)) {
                    modelData = parsed;
                }
            } catch (e) { continue; }

            if (modelData) {
                try {
                    const previewDataUrl = await generate3DPreview(modelData, 300);
                    const imgPreview = datoDIV.querySelector('.personaje-visual img');
                    if (imgPreview) {
                        imgPreview.src = previewDataUrl;
                        imgPreview.classList.remove('hidden');
                    }
                } catch (error) {
                    console.error(`Error generando preview inicial para el dato '${datoDIV.querySelector('.nombreh')?.value}':`, error);
                }
            }
        }
    }
}



function procesarPropiedadesVideojuego(charElement) {
    const promptVisualTextarea = charElement.querySelector('.descripcionh');
    if (!promptVisualTextarea) {
        console.warn("No se encontró el textarea '.descripcionh' para el dato:", charElement);
        return {};
    }

    const KEYWORD = 'Videojuego';
    const SEPARATOR = '---';
    let currentText = promptVisualTextarea.value.trim();
    let gameProps = {};

    const defaultProps = {
        tamano: { x: 3, y: 4.8, z: 1 },
        rotacionY: 0,
        esCubo3D: false,
        esCilindro3D: false,
        colision: { tipo: 'capsula', radio: 0.5, altura: 1.8 },
        interactable: false,
        fisica: { estatico: true, masa: 0 },
        movimiento: [] 
    };

    if (currentText.startsWith(KEYWORD)) {
        const separatorIndex = currentText.indexOf(SEPARATOR);
        const jsonText = currentText.substring(KEYWORD.length, separatorIndex > -1 ? separatorIndex : undefined).trim();

        try {
            if (jsonText) {
                gameProps = JSON.parse(jsonText);
                console.log(`Propiedades de videojuego leídas para "${charElement.querySelector('.nombreh')?.value}".`);
            } else {
                 gameProps = defaultProps;
            }
        } catch (e) {
            console.error(`Error al parsear las propiedades JSON para "${charElement.querySelector('.nombreh')?.value}". Se usarán las de por defecto. Error:`, e);
            gameProps = defaultProps;
        }
    } else {
        gameProps = defaultProps;
        const propsJsonString = JSON.stringify(gameProps, null, 2);
        
        let newTextContent = `${KEYWORD}\n${propsJsonString}`;
        if (currentText.length > 0) {
            newTextContent += `\n\n${SEPARATOR}\n\n${currentText}`;
        }

        promptVisualTextarea.value = newTextContent;
        console.log(`Propiedades de videojuego por defecto CREADAS para "${charElement.querySelector('.nombreh')?.value}".`);
    }

    return gameProps;
}