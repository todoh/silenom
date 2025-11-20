// =======================================================================
// === LÓGICA DEL EDITOR HÍBRIDO 2D/3D (UI, EVENTOS E INICIALIZACIÓN) ====
// =======================================================================
const brushSizes = {
   XS: 25,
    S: 50,  // Pincel pequeño de 50px de radio
    M: 120, // Pincel mediano de 120px de radio
    L: 250,
    XL: 430,
    XXL: 600  // Pincel grande de 250px de radio
};
let currentBrushSize = brushSizes.M;
// --- CORREGIDO: Se añade la constante CHUNK_SIZE que faltaba ---
const CHUNK_SIZE = 222;

// Estado actual del editor
let activeTool = { category: 'entity', id: 'selector' };


const WORLD_DATA_NAME_PREFIX = 'Mundo - ';
let editorState = {
    isPickingCoordinate: false,
    entityBeingEdited: null,
};
const WORLD_SPHERE_RADIUS = (GRID_WIDTH * CHUNK_SIZE) / 2.2; // Radio de nuestro "planeta"

// Referencias a los elementos del DOM.
const editorDOM = {
    mapGridContainer: document.getElementById('r-map-grid-container'),
    texturePalette: document.getElementById('r-texture-palette'),
    entityPalette: document.getElementById('r-entity-palette'),
    previewButton: document.getElementById('r-preview-button'),
    saveButton: document.getElementById('r-save-button'),
    loadWorldSelect: document.getElementById('r-load-world-select'),
    saveToCharacterButton: document.getElementById('r-save-to-character-btn'),
    previewModal: document.getElementById('r-preview-modal'),
    previewModalCloseBtn: document.querySelector('#r-preview-modal .modal-close-button1'),
    zoomInButton: document.getElementById('r-zoom-in-button'),
    zoomOutButton: document.getElementById('r-zoom-out-button'),
    characterModal: document.getElementById('r-character-modal-overlay'),
    characterModalCloseBtn: document.querySelector('#r-character-modal-overlay .character-modal-close-button'),
    characterGrid: document.getElementById('r-character-grid'),
    editEntityModal: document.getElementById('r-edit-entity-modal'),
    editEntityCloseBtn: document.getElementById('r-edit-entity-close-btn'),
    editEntitySaveBtn: document.getElementById('r-edit-entity-save-btn'),
    editEntityNameSpan: document.getElementById('r-edit-entity-name'),
    editColisionTipoSelect: document.getElementById('edit-colision-tipo'),
};

// Estado para el visor 3D del editor
let editor3DState = {
    isActive: false,isPainting: false, 
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    transformControls: null, 
    placeableObjects: new THREE.Group(),
    groundObjects: [],
    gridHelper: null
};

let selectedAvatarKey = null;

// --- FUNCIONES ORIGINALES PRESERVADAS ---

async function openAvatarSelectionModal() {
    const avatarGrid = document.getElementById('r-avatar-grid');
    avatarGrid.innerHTML = '';
    for (const toolId in tools.customEntities) {
        const tool = tools.customEntities[toolId];
        if (tool.modelType === 'json3d') {
            const btn = document.createElement('button');
            btn.className = 'palette-item';
            const previewSrc = await generate3DPreview(tool.icon);
            btn.innerHTML = `<div class="palette-item-preview"><img src="${previewSrc}" alt="${tool.name}"></div><span>${tool.name}</span>`;
            btn.onclick = () => {
                selectedAvatarKey = toolId;
                document.getElementById('r-avatar-modal').style.display = 'none';
                alert(`Avatar "${tool.name}" seleccionado.`);
            };
            avatarGrid.appendChild(btn);
        }
    }
    document.getElementById('r-avatar-modal').style.display = 'flex';
}

function findDatoElementByName(name) {
    const characterDataElements = document.querySelectorAll('#listapersonajes .personaje');
    for (const charElement of characterDataElements) {
        if (charElement.querySelector('.nombreh')?.value === name) {
            return charElement;
        }
    }
    return null;
}

function openEntityEditorModal(entity) {
    if (!entity.dataRef) {
        alert("Este objeto no es personalizable (no proviene de un 'Dato').");
        return;
    }
    const datoElement = findDatoElementByName(entity.dataRef);
    if (!datoElement) {
        alert(`No se encontró el "Dato" original llamado "${entity.dataRef}".`);
        return;
    }
    editorState.entityBeingEdited = entity;
    const props = procesarPropiedadesVideojuego(datoElement);
    renderizarRutaMovimiento(props.movimiento || []);
    editorDOM.editEntityNameSpan.textContent = entity.dataRef;
    document.getElementById('edit-tamano-x').value = props.tamano?.x || 1;
    document.getElementById('edit-tamano-y').value = props.tamano?.y || 1.8;
    document.getElementById('edit-tamano-z').value = props.tamano?.z || 1;
    document.getElementById('edit-rotacion-y').value = props.rotacionY || 0;
    document.getElementById('edit-es-cubo-3d').checked = props.esCubo3D || false;
    document.getElementById('edit-es-cilindro-3d').checked = props.esCilindro3D || false;
    document.getElementById('edit-colision-tipo').value = props.colision?.tipo || 'ninguna';
    document.getElementById('edit-colision-radio').value = props.colision?.radio || 0.5;
    document.getElementById('edit-colision-altura').value = props.colision?.altura || 1.8;
    updateCollisionFieldsVisibility();
    editorDOM.editEntityModal.dataset.editingDatoName = entity.dataRef;
    editorDOM.editEntityModal.style.display = 'flex';
}

function saveEntityProperties() {
    const datoName = editorDOM.editEntityModal.dataset.editingDatoName;
    if (!datoName) return;
    const datoElement = findDatoElementByName(datoName);
    if (!datoElement) {
        alert("Error: Se perdió la referencia al 'Dato' original.");
        return;
    }
    const newProps = {
        tamano: {
            x: parseFloat(document.getElementById('edit-tamano-x').value),
            y: parseFloat(document.getElementById('edit-tamano-y').value),
            z: parseFloat(document.getElementById('edit-tamano-z').value)
        },
        rotacionY: parseFloat(document.getElementById('edit-rotacion-y').value),
        esCubo3D: document.getElementById('edit-es-cubo-3d').checked,
        esCilindro3D: document.getElementById('edit-es-cilindro-3d').checked,
        colision: {
            tipo: document.getElementById('edit-colision-tipo').value,
            radio: parseFloat(document.getElementById('edit-colision-radio').value),
            altura: parseFloat(document.getElementById('edit-colision-altura').value)
        },
        movimiento: []
    };
    const pasos = document.querySelectorAll('#edit-movimiento-lista .ruta-paso');
    pasos.forEach(pasoEl => {
        const pasoData = { tipo: pasoEl.dataset.tipo };
        if (pasoData.tipo === 'aleatorio') {
            pasoData.duracion = pasoEl.dataset.duracion === 'null' ? null : parseFloat(pasoEl.dataset.duracion);
        } else if (pasoData.tipo === 'ir_a') {
            pasoData.coordenadas = { x: parseFloat(pasoEl.dataset.x), z: parseFloat(pasoEl.dataset.z) };
        }
        newProps.movimiento.push(pasoData);
    });
    const KEYWORD = 'Videojuego';
    const SEPARATOR = '---';
    const promptVisualTextarea = datoElement.querySelector('.descripcionh');
    const oldText = promptVisualTextarea.value;
    const separatorIndex = oldText.indexOf(SEPARATOR);
    const descriptionText = separatorIndex > -1 ? oldText.substring(separatorIndex) : '';
    const newJsonString = JSON.stringify(newProps, null, 2);
    promptVisualTextarea.value = `${KEYWORD}\n${newJsonString}\n\n${descriptionText}`.trim();
    alert(`Propiedades de "${datoName}" actualizadas!`);
    editorDOM.editEntityModal.style.display = 'none';
}

function iniciarModoSeleccionCoordenada() {
    if (!editorState.entityBeingEdited) {
        alert("Error: No hay ninguna entidad seleccionada para editar.");
        return;
    }
    editorState.isPickingCoordinate = true;
    editorDOM.editEntityModal.style.display = 'none';
    editorDOM.mapGridContainer.style.cursor = 'crosshair';
}

function cargarcanvas() {
    console.log("Recarga manual del canvas 3D iniciada...");
    if (!editor3DState.isActive) {
        console.warn("El editor 3D no está activo. Intentando inicializar...");
        initialize3DEditor();
        return;
    }
    render3DWorldFromData();
    console.log("Canvas 3D recargado.");
}

// --- MOTOR DEL EDITOR 3D ---

// En r-editor.js
function initialize3DEditor() {
    if (editor3DState.isActive) return;
    const container = editorDOM.mapGridContainer;
    
    // Si el contenedor no tiene tamaño, esperamos 100ms y reintentamos.
    // Esto es más estable que el bucle de requestAnimationFrame.
    if (container.clientWidth === 0 || container.clientHeight === 0) {
        console.warn("El contenedor del editor 3D no tiene dimensiones. Se reintentará en 6s.");
        setTimeout(initialize3DEditor, 6000);
        return;
    }
    
    container.innerHTML = '';
    
    // ... el resto de la función se queda exactamente igual ...
    container.insertAdjacentHTML('afterbegin', `
        <div id="r-contextual-menu" style="position: absolute; top: 15px; left: 15px; background-color: rgba(40,40,40,0.8); border-radius: 8px; z-index: 200; display: none; padding: 4px; border: 1px solid rgba(255,255,255,0.2);">
            <button id="r-context-translate" class="active" title="Mover" style="background-color: #007bff; border: none; color: white; font-size: 20px; cursor: pointer; padding: 8px 12px; border-radius: 5px; transition: background-color 0.2s;">&#10021;</button>
            <button id="r-context-rotate" title="Rotar" style="background-color: transparent; border: none; color: white; font-size: 20px; cursor: pointer; padding: 8px 12px; border-radius: 5px; transition: background-color 0.2s;">&#8635;</button>
            <button id="r-context-scale" title="Escalar" style="background-color: transparent; border: none; color: white; font-size: 20px; cursor: pointer; padding: 8px 12px; border-radius: 5px; transition: background-color 0.2s;">&#8596;</button>
        </div>
    `);

    editor3DState.scene = new THREE.Scene();
    editor3DState.scene.background = null; // Fondo transparente
    editor3DState.scene.fog = new THREE.Fog(0x152238, 150, 20000);

    editor3DState.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Habilitar transparencia
    editor3DState.renderer.setSize(container.clientWidth, container.clientHeight);
    editor3DState.renderer.shadowMap.enabled = true;
    container.appendChild(editor3DState.renderer.domElement);

    const centerX = (GRID_WIDTH * CHUNK_SIZE) / 2;
    const centerZ = (GRID_HEIGHT * CHUNK_SIZE) / 2;
    
    editor3DState.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 1, 2000);
    editor3DState.camera.position.set(centerX, WORLD_SPHERE_RADIUS / 2, centerZ + WORLD_SPHERE_RADIUS * 1.8);

    editor3DState.controls = new THREE.OrbitControls(editor3DState.camera, editor3DState.renderer.domElement);
    editor3DState.controls.target.set(centerX, 0, centerZ);
    editor3DState.controls.enableDamping = true;
    editor3DState.controls.enablePan = false;
       // Reasignamos los botones del ratón para los controles de la cámara.
    editor3DState.controls.mouseButtons = {
        LEFT: null, // Anulamos el botón izquierdo para que no mueva la cámara.
        MIDDLE: THREE.MOUSE.DOLLY, // La rueda seguirá haciendo zoom.
        RIGHT: THREE.MOUSE.ROTATE // Asignamos la rotación al botón derecho.
    };
    editor3DState.textureCanvas = document.createElement('canvas');
    editor3DState.textureCanvas.width = 4948;
    editor3DState.textureCanvas.height = 2474;
    editor3DState.textureContext = editor3DState.textureCanvas.getContext('2d');
    
    editor3DState.dynamicTexture = new THREE.CanvasTexture(editor3DState.textureCanvas);
    editor3DState.dynamicTexture.encoding = THREE.sRGBEncoding;
    editor3DState.dynamicTexture.wrapS = THREE.RepeatWrapping;
    
    editor3DState.textureBrushes = {};
    for (const id in tools.textures) {
        const material = createMaterial(tools.textures[id].material);
        if (material.map && material.map.image) {
            editor3DState.textureBrushes[id] = material.map.image;
        } else if (material.color) {
            const colorCanvas = document.createElement('canvas');
            colorCanvas.width = 128;
            colorCanvas.height = 128;
            const ctx = colorCanvas.getContext('2d');
            ctx.fillStyle = material.color.getStyle();
            ctx.fillRect(0, 0, 128, 128);
            editor3DState.textureBrushes[id] = colorCanvas;
        }
    }
    
    const sphereGeo = new THREE.SphereGeometry(WORLD_SPHERE_RADIUS, 128, 64);
    const sphereMat = new THREE.MeshStandardMaterial({
        map: editor3DState.dynamicTexture,
        roughness: 0.8,
        metalness: 0.1
    });
    
    editor3DState.worldSphere = new THREE.Mesh(sphereGeo, sphereMat);
    editor3DState.worldSphere.position.set(centerX, 0, centerZ);
    editor3DState.worldSphere.receiveShadow = true;
    editor3DState.scene.add(editor3DState.worldSphere);
    
    editor3DState.groundObjects = [editor3DState.worldSphere];

    if (typeof THREE.TransformControls !== 'undefined') {
        editor3DState.transformControls = new THREE.TransformControls(editor3DState.camera, editor3DState.renderer.domElement);
        editor3DState.transformControls.addEventListener('dragging-changed', (event) => {
            editor3DState.controls.enabled = !event.value;
        });
        
        editor3DState.transformControls.addEventListener('mouseUp', () => {
             const object = editor3DState.transformControls.object;
             if (!object || !object.userData.sourceObject) return;
             const source = object.userData.sourceObject;
             source.rotationY = THREE.MathUtils.radToDeg(object.rotation.y);
             source.scale = { x: object.scale.x, y: object.scale.y, z: object.scale.z };
             render3DWorldFromData({ redrawGround: false });
        });
        editor3DState.scene.add(editor3DState.transformControls);
    }

    editor3DState.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(centerX + 150, 200, centerZ + 100);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.left = -WORLD_SPHERE_RADIUS;
    dirLight.shadow.camera.right = WORLD_SPHERE_RADIUS;
    dirLight.shadow.camera.top = WORLD_SPHERE_RADIUS;
    dirLight.shadow.camera.bottom = -WORLD_SPHERE_RADIUS;
    editor3DState.scene.add(dirLight);

    editor3DState.scene.add(editor3DState.placeableObjects);
    render3DWorldFromData();

    editor3DState.isActive = true;
    animate3DEditor();

    window.addEventListener('resize', handleEditorResize, false);
    editor3DState.renderer.domElement.addEventListener('click', handleEditorClick, false);
    editor3DState.renderer.domElement.addEventListener('contextmenu', handleEditorRightClick, false);
}
function animate3DEditor() {
    if (!editor3DState.isActive) return;
    requestAnimationFrame(animate3DEditor);
    editor3DState.controls.update();
    editor3DState.renderer.render(editor3DState.scene, editor3DState.camera);
}

async function render3DWorldFromData(options = {}) {
    const { redrawGround = true } = options; // Por defecto, siempre redibuja el suelo

    if (editor3DState.transformControls) editor3DState.transformControls.detach();
    
    while (editor3DState.placeableObjects.children.length > 0) {
        editor3DState.placeableObjects.remove(editor3DState.placeableObjects.children[0]);
    }
    
    // --- INICIO DE LA MODIFICACIÓN ---
    // Este bloque completo ahora solo se ejecutará si se lo pedimos explícitamente.
    if (redrawGround) {
        const ctx = editor3DState.textureContext;
        const canvasWidth = editor3DState.textureCanvas.width;
        const canvasHeight = editor3DState.textureCanvas.height;
        
        const baseTexture = editor3DState.textureBrushes['water'];
        if (baseTexture) {
            ctx.fillStyle = ctx.createPattern(baseTexture, 'repeat');
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        } else {
            ctx.fillStyle = '#e1e3e6ff';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
        
        const totalWorldWidth = GRID_WIDTH * CHUNK_SIZE;
        const totalWorldHeight = GRID_HEIGHT * CHUNK_SIZE;

        for (const chunkId in worldData.chunks) {
            const chunk = worldData.chunks[chunkId];
            const [chunkX, chunkZ] = chunkId.split('_').map(Number);
            
            const textureKey = chunk.groundTextureKey || 'grass';
            const brush = editor3DState.textureBrushes[textureKey];
            if (!brush) continue;
            
            const worldX = chunkX * CHUNK_SIZE;
            const worldZ = chunkZ * CHUNK_SIZE;
            
            const u = worldX / totalWorldWidth;
            const v = worldZ / totalWorldHeight;
            
            const canvasX = u * canvasWidth;
            const canvasY = v * canvasHeight;
            const canvasChunkWidth = (CHUNK_SIZE / totalWorldWidth) * canvasWidth;
            const canvasChunkHeight = (CHUNK_SIZE / totalWorldHeight) * canvasHeight;
            
            ctx.drawImage(brush, canvasX, canvasY, canvasChunkWidth, canvasChunkHeight);
        }
        
        editor3DState.dynamicTexture.needsUpdate = true;
    }
    // --- FIN DE LA MODIFICACIÓN ---

    // La lógica para renderizar los OBJETOS siempre se ejecuta, que es lo que queremos.
    const sphereCenter = editor3DState.worldSphere.position;

    for (const chunkId in worldData.chunks) {
        const chunk = worldData.chunks[chunkId];
        if (!chunk) continue;
        const [chunkX, chunkZ] = chunkId.split('_').map(Number);

        for (const obj of chunk.objects) {
            const entityData = tools.customEntities[obj.type] || tools.entities[obj.type];
            if (!entityData) continue;

            let modelObject = null;
            if (entityData.modelType === 'json3d' && entityData.icon) {
                modelObject = createModelFromJSON(entityData.icon);
            } else if (entityData.modelType === 'sprite') {
                const iconSrc = findCharacterImageSrc(obj.dataRef) || entityData.icon;
                if (iconSrc) {
                    const map = new THREE.TextureLoader().load(iconSrc);
                    const material = new THREE.SpriteMaterial({ map, transparent: true, alphaTest: 0.1 });
                    const sprite = new THREE.Sprite(material);
                    const gameProps = (entityData.gameProps) ? entityData.gameProps : { tamano: { x: 3, y: 4.8 } };
                    sprite.scale.set(gameProps.tamano.x, gameProps.tamano.y, 1);
                    modelObject = sprite;
                }
            } else if (entityData.model) {
                modelObject = createModelFromJSON(entityData.model);
            }

            if (modelObject) {
                const flatX = (chunkX * CHUNK_SIZE) + obj.x;
                const flatZ = (chunkZ * CHUNK_SIZE) + obj.z;
                const flatX_relative = flatX - sphereCenter.x;
                const flatZ_relative = flatZ - sphereCenter.z;
                const y_squared = WORLD_SPHERE_RADIUS * WORLD_SPHERE_RADIUS - (flatX_relative * flatX_relative + flatZ_relative * flatZ_relative);
                
                if (y_squared >= 0) {
                    const y_on_sphere = Math.sqrt(y_squared);
                    const positionOnSphere = new THREE.Vector3(flatX, sphereCenter.y + y_on_sphere, flatZ);
                    const box = new THREE.Box3().setFromObject(modelObject);
                    const yOffset = modelObject.isSprite ? box.getSize(new THREE.Vector3()).y / 2 : -box.min.y;
                    const surfaceNormal = new THREE.Vector3().subVectors(positionOnSphere, sphereCenter).normalize();
                    modelObject.position.copy(positionOnSphere).addScaledVector(surfaceNormal, yOffset);
                    const upVector = new THREE.Vector3(0, 1, 0);
                    modelObject.quaternion.setFromUnitVectors(upVector, surfaceNormal);
                    
                    if (obj.rotationY) {
                         modelObject.rotateOnAxis(surfaceNormal, THREE.MathUtils.degToRad(obj.rotationY));
                    }
                    if (obj.scale) {
                        modelObject.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);
                    }

                    modelObject.castShadow = true;
                    modelObject.userData.sourceObject = obj;
                    editor3DState.placeableObjects.add(modelObject);
                }
            }
        }
    }

    const playerStart = worldData.metadata.playerStartPosition;
    if (playerStart) {
        const startX = (playerStart.chunkX * CHUNK_SIZE) + (playerStart.subX * (CHUNK_SIZE / SUBGRID_SIZE)) + ((CHUNK_SIZE / SUBGRID_SIZE) / 2);
        const startZ = (playerStart.chunkZ * CHUNK_SIZE) + (playerStart.subZ * (CHUNK_SIZE / SUBGRID_SIZE)) + ((CHUNK_SIZE / SUBGRID_SIZE) / 2);
        const startMarkerGeo = new THREE.ConeGeometry(1.5, 4, 12);
        const startMarkerMat = new THREE.MeshLambertMaterial({ color: 0xff4444 });
        const startMarker = new THREE.Mesh(startMarkerGeo, startMarkerMat);
        const flatX_relative = startX - sphereCenter.x;
        const flatZ_relative = startZ - sphereCenter.z;
        const y_squared = WORLD_SPHERE_RADIUS * WORLD_SPHERE_RADIUS - (flatX_relative * flatX_relative + flatZ_relative * flatZ_relative);
        
        if (y_squared >= 0) {
            const y_on_sphere = Math.sqrt(y_squared);
            const positionOnSphere = new THREE.Vector3(startX, sphereCenter.y + y_on_sphere, startZ);
            const surfaceNormal = new THREE.Vector3().subVectors(positionOnSphere, sphereCenter).normalize();
            startMarker.position.copy(positionOnSphere).addScaledVector(surfaceNormal, 2);
            const upVector = new THREE.Vector3(0, 1, 0);
            startMarker.quaternion.setFromUnitVectors(upVector, surfaceNormal);
            editor3DState.placeableObjects.add(startMarker);
        }
    }
}
function handleEditorResize() {
    if (!editor3DState.isActive) return;
    const container = editorDOM.mapGridContainer;
    editor3DState.camera.aspect = container.clientWidth / container.clientHeight;
    editor3DState.camera.updateProjectionMatrix();
    editor3DState.renderer.setSize(container.clientWidth, container.clientHeight);
}

function handleEditorClick(event) {
    if (event.button !== 0) return;

    const container = editorDOM.mapGridContainer;
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(((event.clientX - rect.left) / container.clientWidth) * 2 - 1, -((event.clientY - rect.top) / container.clientHeight) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, editor3DState.camera);

    if (editorState.isPickingCoordinate) {
        const intersects = raycaster.intersectObjects(editor3DState.groundObjects);
        if (intersects.length > 0) {
            const point = intersects[0].point;
            const nuevoPaso = { tipo: 'ir_a', coordenadas: { x: point.x, z: point.z } };
            const listaEl = document.getElementById('edit-movimiento-lista');
            let rutaActual = [];
            listaEl.querySelectorAll('.ruta-paso').forEach(pasoEl => {
                const pasoData = { tipo: pasoEl.dataset.tipo };
                if (pasoData.tipo === 'aleatorio') pasoData.duracion = pasoEl.dataset.duracion === 'null' ? null : parseFloat(pasoEl.dataset.duracion);
                else if (pasoData.tipo === 'ir_a') pasoData.coordenadas = { x: parseFloat(pasoEl.dataset.x), z: parseFloat(pasoEl.dataset.z) };
                rutaActual.push(pasoData);
            });
            rutaActual.push(nuevoPaso);
            renderizarRutaMovimiento(rutaActual);
            editorState.isPickingCoordinate = false;
            editorDOM.mapGridContainer.style.cursor = 'default';
            editorDOM.editEntityModal.style.display = 'flex';
        }
        return;
    }

    const contextMenu = document.getElementById('r-contextual-menu');
    if (activeTool.id === 'selector') {
        const intersectsObjects = raycaster.intersectObjects(editor3DState.placeableObjects.children, true);
        if (intersectsObjects.length > 0) {
            let mainParent = intersectsObjects[0].object;
            while (mainParent.parent && mainParent.parent !== editor3DState.placeableObjects) mainParent = mainParent.parent;
            editor3DState.transformControls.attach(mainParent);
            if (contextMenu) contextMenu.style.display = 'block';
        } else {
            editor3DState.transformControls.detach();
            if (contextMenu) contextMenu.style.display = 'none';
        }
        return;
    }
    
    const intersects = raycaster.intersectObjects(editor3DState.groundObjects, true);

    if (intersects.length > 0) {
        const intersection = intersects[0];
        const point = intersection.point;
        const worldX = point.x;
        const worldZ = point.z;
        const chunkX = Math.floor(worldX / CHUNK_SIZE);
        const chunkZ = Math.floor(worldZ / CHUNK_SIZE);
        const chunkId = `${chunkX}_${chunkZ}`;
        
        if (!worldData.chunks[chunkId]) {
            worldData.chunks[chunkId] = { groundTextureKey: 'grass', objects: [] };
        }
        const chunk = worldData.chunks[chunkId];
        
        if (activeTool.category === 'texture') {
            const brush = editor3DState.textureBrushes[activeTool.id];
        if (!brush || !intersection.uv) return; // Salimos si no hay pincel o coordenadas UV

        // 1. Obtenemos el contexto del lienzo 2D que sirve de textura
        const ctx = editor3DState.textureContext;

        // 2. Convertimos las coordenadas UV (de 0 a 1) a coordenadas de píxeles en nuestro lienzo
        const canvasX = intersection.uv.x * editor3DState.textureCanvas.width;
        const canvasY = (1 - intersection.uv.y) * editor3DState.textureCanvas.height;

        // 3. Dibujamos la textura seleccionada en la posición del clic
        // Usamos currentBrushSize para definir el tamaño del "pincelazo"
        ctx.save(); // Guardamos el estado del canvas
        ctx.beginPath();
        // Creamos un área circular para que el pintado sea redondo
        ctx.arc(canvasX, canvasY, currentBrushSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip(); // Usamos el círculo como máscara

        // Dibujamos la textura del pincel, repetida para llenar el área
        const pattern = ctx.createPattern(brush, 'repeat');
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, editor3DState.textureCanvas.width, editor3DState.textureCanvas.height);
        
        ctx.restore(); // Restauramos el estado del canvas

        // 4. ¡MUY IMPORTANTE! Avisamos a Three.js que la textura ha cambiado
        // Esto hace que la GPU actualice la apariencia del planeta.
        editor3DState.dynamicTexture.needsUpdate = true;
        
        // La lógica de chunks ya no es necesaria para el pintado, pero sí para la persistencia.
        // Opcional: Guardar qué textura se usó en el chunk para poder reconstruirlo al cargar.
        const chunkX = Math.floor(point.x / CHUNK_SIZE);
        const chunkZ = Math.floor(point.z / CHUNK_SIZE);
        const chunkId = `${chunkX}_${chunkZ}`;
        if (worldData.chunks[chunkId]) {
            // Podrías guardar la última textura usada si quieres
            // worldData.chunks[chunkId].lastPaintedTexture = activeTool.id;
        }
            
        } else if (activeTool.category === 'entity' || activeTool.category === 'customEntity') {
            const posX_in_chunk = worldX - (chunkX * CHUNK_SIZE);
            const posZ_in_chunk = worldZ - (chunkZ * CHUNK_SIZE);

            if (activeTool.id === 'eraser') {
                const intersectsEraser = raycaster.intersectObjects(editor3DState.placeableObjects.children, true);
                if (intersectsEraser.length > 0) {
                    let objectToDelete = intersectsEraser[0].object;
                    while (objectToDelete.parent && objectToDelete.parent !== editor3DState.placeableObjects) {
                        objectToDelete = objectToDelete.parent;
                    }
                    const sourceObject = objectToDelete.userData.sourceObject;
                    if (sourceObject) {
                        for (const currentChunkId in worldData.chunks) {
                            const currentChunk = worldData.chunks[currentChunkId];
                            const objectIndex = currentChunk.objects.indexOf(sourceObject);
                            if (objectIndex > -1) {
                                currentChunk.objects.splice(objectIndex, 1);
                                break;
                            }
                        }
                    }
                }
            } else if (activeTool.id === 'playerStart') {
                worldData.metadata.playerStartPosition = {
                    chunkX,
                    chunkZ,
                    subX: Math.floor(posX_in_chunk / (CHUNK_SIZE / SUBGRID_SIZE)),
                    subZ: Math.floor(posZ_in_chunk / (CHUNK_SIZE / SUBGRID_SIZE))
                };
            } else if (activeTool.id !== 'selector') {
                const newObject = { type: activeTool.id, x: posX_in_chunk, z: posZ_in_chunk };
                if (activeTool.category === 'customEntity') {
                    newObject.dataRef = tools.customEntities[activeTool.id].dataRef;
                }
                chunk.objects.push(newObject);
            }
            
            // --- INICIO DE LA MODIFICACIÓN ---
            // Llamamos a la función con la nueva opción para NO redibujar el suelo.
            render3DWorldFromData({ redrawGround: false }); 
            // --- FIN DE LA MODIFICACIÓN ---
        }
    }
}
function handleEditorRightClick(event) {
    event.preventDefault();
    if (activeTool.id !== 'selector') return;
    const container = editorDOM.mapGridContainer;
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(((event.clientX - rect.left) / container.clientWidth) * 2 - 1, -((event.clientY - rect.top) / container.clientHeight) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, editor3DState.camera);
    const intersects = raycaster.intersectObjects(editor3DState.placeableObjects.children, true);
    if (intersects.length > 0) {
        let mainParent = intersects[0].object;
        while (mainParent.parent && mainParent.parent !== editor3DState.placeableObjects) {
            mainParent = mainParent.parent;
        }
        if (mainParent.userData.sourceObject) {
            openEntityEditorModal(mainParent.userData.sourceObject);
        }
    }
}

function selectTool(category, id) {
    activeTool = { category, id };
    document.querySelectorAll('.palette-item.selected').forEach(el => el.classList.remove('selected'));
    const toolElement = document.querySelector(`.palette-item[data-id='${id}']`);
    if (toolElement) toolElement.classList.add('selected');

    if (id !== 'selector' && editor3DState.transformControls) {
        editor3DState.transformControls.detach();
        const contextMenu = document.getElementById('r-contextual-menu');
        if (contextMenu) contextMenu.style.display = 'none';
    }

    editorDOM.mapGridContainer.style.cursor = (id === 'selector') ? 'pointer' : 'crosshair';
}

function zoomIn() {
    if (editor3DState.isActive) editor3DState.controls.dollyIn(1.2);
}

function zoomOut() {
    if (editor3DState.isActive) editor3DState.controls.dollyOut(1.2);
}

function findCharacterImageSrc(dataRefName) {
    const allCharacters = document.querySelectorAll('#listapersonajes .personaje');
    for (const charElement of allCharacters) {
        const nameInput = charElement.querySelector('.nombreh');
        if (nameInput && nameInput.value === dataRefName) {
            const imgElement = charElement.querySelector('.personaje-visual img');
            if (imgElement && imgElement.src) return imgElement.src;
        }
    }
    return null;
}

// --- INICIALIZACIÓN Y EVENT LISTENERS (CORREGIDO) ---

document.addEventListener('DOMContentLoaded', async () => {
    if (Object.keys(worldData.chunks).length === 0) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            for (let z = 0; z < GRID_HEIGHT; z++) {
                worldData.chunks[`${x}_${z}`] = { groundTextureKey: 'grass', objects: [] };
            }
        }
    }
    if (!worldData.metadata.playerStartPosition) {
        worldData.metadata.playerStartPosition = { chunkX: Math.floor(GRID_WIDTH/2), chunkZ: Math.floor(GRID_HEIGHT/2), subX: 0, subZ: 0 };
    }

    await populatePalettes();
    selectTool('texture', 'grass');
    populateWorldList();

    const renderizadorEl = document.getElementById('renderizador');
    const observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            if (mutation.attributeName === 'style') {
                const isVisible = renderizadorEl.style.display !== 'none';
                if (isVisible && !editor3DState.isActive) {
                    console.log("El editor se ha hecho visible. Inicializando Three.js...");
                    initialize3DEditor();
                }
            }
        }
    });
    observer.observe(renderizadorEl, { attributes: true });

    editorDOM.saveButton.addEventListener('click', saveWorldToCharacter);
    if (editorDOM.saveToCharacterButton) {
        editorDOM.saveToCharacterButton.addEventListener('click', saveWorldToCharacter);
    }
editorDOM.previewButton.addEventListener('click', () => {
    startPreview(worldData, editor3DState.textureCanvas);
});    editorDOM.previewModalCloseBtn.addEventListener('click', stopPreview);

    if (editorDOM.loadWorldSelect) {
        editorDOM.loadWorldSelect.addEventListener('change', async (event) => {
            await loadWorldData(event.target.value);
            render3DWorldFromData();
        });
        editorDOM.loadWorldSelect.addEventListener('click', populateWorldList);
    }

    if (editorDOM.editEntityModal) {
        editorDOM.editEntityCloseBtn.addEventListener('click', () => editorDOM.editEntityModal.style.display = 'none');
        editorDOM.editEntitySaveBtn.addEventListener('click', saveEntityProperties);
        editorDOM.editColisionTipoSelect.addEventListener('change', updateCollisionFieldsVisibility);
        const cuboCheckbox = document.getElementById('edit-es-cubo-3d');
        const cilindroCheckbox = document.getElementById('edit-es-cilindro-3d');
        cuboCheckbox.addEventListener('change', () => { if (cuboCheckbox.checked) cilindroCheckbox.checked = false; });
        cilindroCheckbox.addEventListener('change', () => { if (cilindroCheckbox.checked) cuboCheckbox.checked = false; });
        document.getElementById('movimiento-seleccionar-coord-btn').addEventListener('click', iniciarModoSeleccionCoordenada);
    }

    if (document.getElementById('r-avatar-modal-close-btn')) {
        document.getElementById('r-avatar-modal-close-btn').addEventListener('click', () => {
            document.getElementById('r-avatar-modal').style.display = 'none';
        });
    }

    editorDOM.mapGridContainer.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target || !target.parentElement || target.parentElement.id !== 'r-contextual-menu') return;

        e.stopPropagation(); 
        const contextMenu = target.parentElement;
        const allButtons = contextMenu.querySelectorAll('button');
        allButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.style.backgroundColor = 'transparent';
        });
        target.classList.add('active');
        target.style.backgroundColor = '#fcfcfcff';

        if (editor3DState.transformControls) {
            if (target.id === 'r-context-translate') editor3DState.transformControls.setMode('translate');
            if (target.id === 'r-context-rotate') editor3DState.transformControls.setMode('rotate');
            if (target.id === 'r-context-scale') editor3DState.transformControls.setMode('scale');
        }
    });

  const brushSizeButtons = document.querySelectorAll('.brush-size-btn');
    brushSizeButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Quita la clase 'active' de todos los botones
            brushSizeButtons.forEach(btn => btn.classList.remove('active'));
            // Añade 'active' al botón pulsado
            button.classList.add('active');
            // Actualiza el tamaño del pincel según el data-size del botón
            const sizeKey = button.dataset.size; // '50', '120', '250'
            currentBrushSize = parseInt(sizeKey, 10);
            console.log(`Tamaño del pincel cambiado a: ${currentBrushSize}px`);
        });
    });

});



    // 1. Seleccionamos el botón y el panel por su ID
    const toggleButton2 = document.getElementById('toggleButton2');
    const sidePanel2 = document.getElementById('r-side-panel');

    // 2. Añadimos un "escuchador de eventos" para el clic en el botón
    toggleButton2.addEventListener('click', function() {
        // 3. Usamos classList.toggle para añadir/quitar la clase 'desplegado'
        sidePanel2.classList.toggle('desplegado');

        // 4. Cambiamos el texto del botón basándonos en si el panel tiene la clase
        if (sidePanel.classList.contains('desplegado')) {
            toggleButton2.textContent = 'Plegar';
        } else {
            toggleButton2.textContent = 'Desplegar';
        }
    });
