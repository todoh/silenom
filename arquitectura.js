// arquitectura.js (Modificado y Corregido)

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
// MODIFICADO: Ya no importamos createMaterials, solo las definiciones.
import { componentDefinitions } from './arquitectura-models.js';

// --- VARIABLES GLOBALES ---
let scene, camera, renderer, raycaster, pointer, orbitControls, transformControls;
// MODIFICADO: 'materials' ahora apuntará a la librería global.
let materials = {};
let selectedObjects = [];
let clipboardObject = null;
let creationState = 'select';
let activeSubType = '';
let wallStartPoint = null;
let guideLine, placementGuide;
let isInitialized = false; // Flag para evitar múltiples inicializaciones

// --- VARIABLES DE CÁMARA ---
let cameraMode = 'dpad';
let cameraRadius = 50, cameraPhi = Math.PI / 3, cameraTheta = Math.PI / 4;
const rotationSpeed = 0.02, zoomSpeed = 0.1;
const moveState = { up: false, down: false, left: false, right: false };

// --- INICIALIZACIÓN ---
function init() {
    if (isInitialized) return;
    const container = document.getElementById('container');
    
    if (container.clientWidth === 0 || container.clientHeight === 0) {
        requestAnimationFrame(init);
        return;
    }

    // --- CORRECCIÓN DE INICIALIZACIÓN: ESPERA ACTIVA CON TIMEOUT ---
    function waitForMaterialLibrary() {
        let attempts = 0;
        const maxAttempts = 250; // ~5 segundos (250 * 20ms)

        function check() {
            // Comprueba si la librería está lista
            if (typeof window.inicializarLibreriaMateriales === 'function' && window.MATERIAL_LIBRARY && Object.keys(window.MATERIAL_LIBRARY).length > 0) {
                console.log("MATERIAL_LIBRARY encontrada y cargada. Inicializando escena.");
                materials = window.MATERIAL_LIBRARY;
                finishInit();
            } 
            // Comprueba si se ha agotado el tiempo de espera
            else if (attempts >= maxAttempts) {
                console.error("Error: MATERIAL_LIBRARY no se cargó a tiempo. Se procederá con materiales básicos. Verifique que 'r-funciones.js' se carga correctamente y no tiene errores.");
                materials = {}; // Usar un objeto vacío
                // Creamos materiales básicos para que la aplicación no falle
                materials.muro_estuco = new THREE.MeshStandardMaterial({ color: 0xcccccc });
                materials.cristal = new THREE.MeshStandardMaterial({ color: 0xadd8e6, transparent: true, opacity: 0.5 });
                materials.madera_vigas = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
                finishInit(); // Inicializa con los materiales de respaldo
            } 
            // Si no, espera y vuelve a intentarlo
            else {
                attempts++;
                setTimeout(check, 20); 
            }
        }
        check();
    }

    // Inicia el proceso de espera.
    if (typeof window.inicializarLibreriaMateriales === 'function') {
        window.inicializarLibreriaMateriales();
        waitForMaterialLibrary();
    } else {
        console.error("Error crítico: La función 'inicializarLibreriaMateriales' no existe. No se pueden cargar materiales.");
        materials = {}; // Usar un objeto vacío para evitar más errores.
        materials.muro_estuco = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        materials.cristal = new THREE.MeshStandardMaterial({ color: 0xadd8e6, transparent: true, opacity: 0.5 });
        materials.madera_vigas = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        finishInit(); // Continuar con materiales básicos.
    }
    
    function finishInit() {
        isInitialized = true;
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111827);
        
        camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.innerHTML = ''; // Limpiamos el contenedor por si acaso
        container.appendChild(renderer.domElement);

        raycaster = new THREE.Raycaster();
        pointer = new THREE.Vector2();

        orbitControls = new OrbitControls(camera, renderer.domElement);
        orbitControls.enableDamping = true;
        orbitControls.dampingFactor = 0.05;
        orbitControls.enabled = false;

        transformControls = new TransformControls(camera, renderer.domElement);
        transformControls.addEventListener('dragging-changed', event => {
            orbitControls.enabled = !event.value;
        });
        transformControls.addEventListener('objectChange', updatePropertiesPanel);
        scene.add(transformControls);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
        dirLight.position.set(15, 20, 10);
        scene.add(dirLight);

        const gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x444444);
        scene.add(gridHelper);

        setupEventListeners();
        setupCameraControls();
        createGuides();
        updateCameraModeUI();
        
        populateMaterialPalette();
        
        animate();
    }
}

// --- NUEVA FUNCIÓN DE COMPATIBILIDAD ---
/**
 * Convierte un material de la librería global (posiblemente de una versión antigua de THREE)
 * a un material compatible con la versión de THREE usada en este módulo para evitar errores.
 * @param {object} libMaterial - El material de window.MATERIAL_LIBRARY.
 * @param {number} [fallbackColor=0xcccccc] - Un color hexadecimal para usar si el material no es válido.
 * @returns {THREE.Material} Un material válido para la escena actual.
 */
function convertToCurrentThreeMaterial(libMaterial, fallbackColor = 0xcccccc) {
    if (libMaterial && typeof libMaterial === 'object') {
        // Extraemos las propiedades del material de la librería.
        const props = {
            color: libMaterial.color,
            map: libMaterial.map,
            roughness: libMaterial.roughness,
            metalness: libMaterial.metalness,
            transparent: libMaterial.transparent,
            opacity: libMaterial.opacity,
        };
        // Limpiamos propiedades indefinidas para no pasarlas al constructor.
        Object.keys(props).forEach(key => props[key] === undefined && delete props[key]);
        
        const newMat = new THREE.MeshStandardMaterial(props);
        // Copiamos la referencia para que la exportación y la UI funcionen.
        if (libMaterial.userData) {
            newMat.userData.ref = libMaterial.userData.ref;
        }
        return newMat;
    }
    // Fallback si el material de la librería no es válido o no existe.
    return new THREE.MeshStandardMaterial({ color: fallbackColor });
}


// --- LÓGICA DE INTERACCIÓN ---

function onPointerMove(event) {
    const container = document.getElementById('container');
    const rect = container.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    if (creationState === 'wall' && wallStartPoint) {
        const intersects = getGridIntersects();
        if (intersects.length > 0) {
            const endPoint = intersects[0].point;
            const positions = guideLine.geometry.attributes.position.array;
            positions[3] = endPoint.x; positions[4] = endPoint.y; positions[5] = endPoint.z;
            guideLine.geometry.attributes.position.needsUpdate = true;
        }
    } else if (creationState === 'window' || creationState === 'door') {
        const intersects = getWallIntersects();
        if (intersects.length > 0) {
            placementGuide.visible = true;
            const intersect = intersects[0];
            const point = intersect.point;
            placementGuide.position.copy(point).add(intersect.face.normal.multiplyScalar(0.01));
            placementGuide.lookAt(point.clone().add(intersect.face.normal));
        } else {
            placementGuide.visible = false;
        }
    }
}

function onPointerDown(event) {
    if (event.target.tagName !== 'CANVAS' || transformControls.dragging) return;
    
    if (creationState === 'select') {
        handleSelection(event);
    } else if (creationState === 'wall') {
        handleWallCreation();
    } else if (creationState === 'window' || creationState === 'door') {
        placeObjectOnWall();
    }
}

// --- FUNCIONES DE CREACIÓN, SELECCIÓN Y MANIPULACIÓN ---

function handleSelection(event) {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(scene.children.filter(c => c.userData.isExportable), true);
    
    let clickedObject = null;
    if (intersects.length > 0) {
        let currentObject = intersects[0].object;
        while(currentObject.parent && !currentObject.userData.isExportable) {
            currentObject = currentObject.parent;
        }
        clickedObject = currentObject;
    }

    if (!event.ctrlKey) {
        transformControls.detach();
        selectedObjects.forEach(obj => {
            obj.traverse(child => {
                if (child.isMesh) child.material.emissive.setHex(0x000000)
            });
        });
        selectedObjects = [];
    }

    if (clickedObject) {
        const index = selectedObjects.indexOf(clickedObject);
        if (index > -1) {
            if (event.ctrlKey) {
                selectedObjects.splice(index, 1);
                clickedObject.traverse(child => {
                    if (child.isMesh) child.material.emissive.setHex(0x000000)
                });
            }
        } else {
            selectedObjects.push(clickedObject);
            clickedObject.traverse(child => {
                if (child.isMesh) child.material.emissive.setHex(0x555500)
            });
        }
    }
    
    if (selectedObjects.length > 0) {
        transformControls.attach(selectedObjects[selectedObjects.length - 1]);
        updatePropertiesPanel();
    } else {
        document.getElementById('properties-panel').classList.add('hidden');
    }
}

function handleWallCreation() {
    const intersects = getGridIntersects();
    if (intersects.length > 0) {
        const point = intersects[0].point;
        if (!wallStartPoint) {
            wallStartPoint = point.clone();
            const positions = guideLine.geometry.attributes.position.array;
            positions[0] = wallStartPoint.x; positions[1] = wallStartPoint.y; positions[2] = wallStartPoint.z;
            guideLine.visible = true;
        } else {
            createWall(wallStartPoint, point);
            wallStartPoint = null;
            guideLine.visible = false;
        }
    }
}

function placeObjectOnWall() {
    const intersects = getWallIntersects();
    if (intersects.length > 0) {
        const intersect = intersects[0];
        if (creationState === 'window') createWindow(intersect);
        else if (creationState === 'door') createDoor(intersect);
    }
}

function createWall(start, end) {
    const props = componentDefinitions[activeSubType];
    const length = start.distanceTo(end);
    const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    
    const wallGroup = new THREE.Group();
    const wallGeometry = new THREE.BoxGeometry(props.width, props.height, length);
    
    // CORREGIDO: Usamos la función de conversión para asegurar compatibilidad.
    const wallMaterial = convertToCurrentThreeMaterial(materials.muro_estuco);
    wallMaterial.userData.ref = 'muro_estuco';
    const mainWall = new THREE.Mesh(wallGeometry, wallMaterial);
    wallGroup.add(mainWall);

    if (activeSubType === 'pared_moldura') {
        const molduraHeight = 0.1;
        const molduraGeo = new THREE.BoxGeometry(props.width + 0.05, molduraHeight, length);
        const topMoldura = new THREE.Mesh(molduraGeo, wallMaterial.clone());
        const bottomMoldura = new THREE.Mesh(molduraGeo, wallMaterial.clone());
        topMoldura.position.y = props.height / 2 - molduraHeight / 2;
        bottomMoldura.position.y = -props.height / 2 + molduraHeight / 2;
        wallGroup.add(topMoldura, bottomMoldura);
    }

    wallGroup.position.set(center.x, props.height / 2, center.z);
    wallGroup.lookAt(end.x, props.height / 2, end.z);
    wallGroup.name = props.name;
    wallGroup.userData.isExportable = true;
    wallGroup.userData.type = 'wall';
    scene.add(wallGroup);
}

function createWindow(intersect) {
    const props = componentDefinitions[activeSubType];
    const geometry = new THREE.BoxGeometry(props.width, props.height, props.depth);
    // CORREGIDO: Usamos la función de conversión.
    const windowMaterial = convertToCurrentThreeMaterial(materials.cristal, 0xadd8e6);
    windowMaterial.userData.ref = 'cristal';
    const windowObj = new THREE.Mesh(geometry, windowMaterial);
    
    const position = intersect.point.clone().add(intersect.face.normal.multiplyScalar(props.depth / 2));
    position.y = Math.max(props.height / 2 + 0.8, intersect.point.y);
    windowObj.position.copy(position);
    windowObj.lookAt(position.clone().add(intersect.face.normal));
    windowObj.name = props.name;
    windowObj.userData.isExportable = true;
    windowObj.userData.type = 'window';
    scene.add(windowObj);
}

function createDoor(intersect) {
    const props = componentDefinitions[activeSubType];
    const doorGroup = new THREE.Group();
    // CORREGIDO: Usamos la función de conversión.
    const doorMaterial = convertToCurrentThreeMaterial(materials.madera_vigas, 0x8B4513);
    doorMaterial.userData.ref = 'madera_vigas';
    
    if (activeSubType === 'puerta_doble') {
        const doorGeo = new THREE.BoxGeometry(props.width / 2, props.height, props.depth);
        const door1 = new THREE.Mesh(doorGeo, doorMaterial);
        door1.position.x = -props.width / 4;
        const door2 = new THREE.Mesh(doorGeo, doorMaterial.clone());
        door2.position.x = props.width / 4;
        doorGroup.add(door1, door2);
    } else { // Puerta simple
        const geometry = new THREE.BoxGeometry(props.width, props.height, props.depth);
        const doorObj = new THREE.Mesh(geometry, doorMaterial);
        doorGroup.add(doorObj);
    }

    const position = intersect.point.clone().add(intersect.face.normal.multiplyScalar(props.depth / 2));
    position.y = props.height / 2;
    doorGroup.position.copy(position);
    doorGroup.lookAt(position.clone().add(intersect.face.normal));
    doorGroup.name = props.name;
    doorGroup.userData.isExportable = true;
    doorGroup.userData.type = 'door';
    scene.add(doorGroup);
}

function updatePropertiesPanel() {
    const panel = document.getElementById('properties-panel');
    if (selectedObjects.length === 0) {
        panel.classList.add('hidden');
        return;
    }
    panel.classList.remove('hidden');
    
    const propNameInput = document.getElementById('propName');
    const propMaterialInfo = document.getElementById('propMaterial'); 

    if (selectedObjects.length > 1) {
        propNameInput.value = "(Varios objetos seleccionados)";
        propNameInput.disabled = true;
        if (propMaterialInfo) propMaterialInfo.textContent = "(Varios)";
    } else {
        const obj = selectedObjects[0];
        propNameInput.value = obj.name;
        propNameInput.disabled = false;
        
        if (propMaterialInfo) {
            let materialRef = 'Desconocido';
            obj.traverse(child => {
                if (child.isMesh && child.material.userData.ref) {
                    materialRef = child.material.userData.ref;
                    return;
                }
            });
            propMaterialInfo.textContent = materialRef;
        }
    }
    
    let firstMaterialColor = '#ffffff';
    selectedObjects[0].traverse(child => {
        if (child.isMesh) {
            firstMaterialColor = '#' + child.material.color.getHexString();
        }
    });
    document.getElementById('propColor').value = firstMaterialColor;
}


function applyPropertyChanges() {
    if (selectedObjects.length === 1) {
        selectedObjects[0].name = document.getElementById('propName').value;
    }
}

function deleteSelectedObject() {
    if (selectedObjects.length === 0) return;
    transformControls.detach();
    selectedObjects.forEach(obj => scene.remove(obj));
    selectedObjects = [];
    document.getElementById('properties-panel').classList.add('hidden');
}

function importModelFromJSON() {
    const jsonInput = document.getElementById('jsonInput');
    const jsonString = jsonInput.value;
    if (!jsonString.trim()) {
        alert("La caja de texto está vacía.");
        return;
    }

    if (typeof window.createModelFromJSON !== 'function') {
        alert("Error: La función avanzada 'createModelFromJSON' no está cargada. Asegúrate de que r-funciones.js esté incluido en tu HTML.");
        return;
    }

    try {
        const modelData = JSON.parse(jsonString);
        const newModel = window.createModelFromJSON(modelData);
        
        if (!newModel || newModel.children.length === 0) {
            throw new Error("createModelFromJSON no pudo crear un modelo válido a partir del JSON.");
        }
        
        // --- CORRECCIÓN DE COMPATIBILIDAD DE MATERIALES ---
        // Recorremos el modelo recién creado y "traducimos" cada material.
        newModel.traverse(child => {
            if(child.isMesh) {
                child.material = convertToCurrentThreeMaterial(child.material);
            }
        });
        // --- FIN DE LA CORRECCIÓN ---

        newModel.userData.isExportable = true;
        newModel.name = modelData.name || 'ObjetoImportado';
        scene.add(newModel);

        jsonInput.value = "";
        alert("Modelo complejo importado con éxito.");

    } catch (error) {
        alert("Error al importar el modelo. Revisa el formato del JSON.\n\n" + error.message);
        console.error("Error de importación:", error);
    }
}

function populateMaterialPalette() {
    const container = document.getElementById('material-palette-container');
    if (!container || Object.keys(materials).length === 0) return;
    container.innerHTML = '';

    for (const key in materials) {
        const material = materials[key];
        const item = document.createElement('div');
        item.className = 'material-item';
        item.title = key;
        item.dataset.materialRef = key;

        const preview = document.createElement('div');
        preview.className = 'material-preview';

        if (material.map && material.map.image) {
            const img = document.createElement('img');
            img.src = material.map.image.toDataURL();
            preview.appendChild(img);
        } else if (material.color) {
            preview.style.backgroundColor = `#${material.color.getHexString()}`;
        }
        
        item.appendChild(preview);
        
        item.addEventListener('click', () => {
            if (selectedObjects.length > 0) {
                applyMaterial(key);
            } else {
                alert("Selecciona al menos un objeto para aplicarle el material.");
            }
        });

        container.appendChild(item);
    }
}

function applyMaterial(materialRef) {
    if (!materials[materialRef]) {
        console.error(`El material "${materialRef}" no se encontró en la librería.`);
        return;
    }

    const newMaterial = convertToCurrentThreeMaterial(materials[materialRef]);
    newMaterial.userData.ref = materialRef; 
    
    selectedObjects.forEach(obj => {
        obj.traverse(child => {
            if (child.isMesh) {
                child.material = newMaterial.clone();
            }
        });
    });
    
    updatePropertiesPanel();
}


// --- HELPERS Y GUÍAS ---
function createGuides() {
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    guideLine = new THREE.Line(lineGeometry, lineMaterial);
    guideLine.visible = false;
    scene.add(guideLine);
    const guideMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, opacity: 0.5, transparent: true });
    placementGuide = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), guideMaterial);
    placementGuide.visible = false;
    scene.add(placementGuide);
}
function getGridIntersects() {
    raycaster.setFromCamera(pointer, camera);
    const gridPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersects = [];
    const point = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(gridPlane, point)) intersects.push({ point });
    return intersects;
}
function getWallIntersects() {
    raycaster.setFromCamera(pointer, camera);
    const walls = scene.children.filter(c => c.userData.type === 'wall');
    return raycaster.intersectObjects(walls, true);
}

// --- CONFIGURACIÓN Y BUCLE PRINCIPAL ---

function setupEventListeners() {
    const container = document.getElementById('container');
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', onWindowResize);
    document.getElementById('exportJsonBtn').addEventListener('click', exportSceneToJSON);
    document.getElementById('importJsonBtn').addEventListener('click', importModelFromJSON);
    document.getElementById('updatePropsBtn').addEventListener('click', applyPropertyChanges);
    document.getElementById('deleteBtn').addEventListener('click', deleteSelectedObject);
    document.getElementById('toggle-camera-btn').addEventListener('click', toggleCameraMode);
    
    window.addEventListener('keydown', handleKeyDown);

    const toolSelects = document.querySelectorAll('.tool-select');
    const selectBtn = document.getElementById('tool-select');

    selectBtn.addEventListener('click', () => {
        creationState = 'select';
        selectBtn.classList.add('active');
        toolSelects.forEach(s => s.value = '');
        deselectAllObjects();
    });

    toolSelects.forEach(select => {
        select.addEventListener('change', (event) => {
            const selectedValue = event.target.value;
            if (selectedValue) {
                creationState = event.target.id.split('-')[1];
                activeSubType = selectedValue;
                
                toolSelects.forEach(s => { if (s !== select) s.value = ''; });
                selectBtn.classList.remove('active');
                deselectAllObjects();

                if (creationState === 'window' || creationState === 'door') {
                    const props = componentDefinitions[activeSubType];
                    placementGuide.geometry = new THREE.BoxGeometry(props.width, props.height, props.depth);
                }
            }
        });
    });

    document.getElementById('mode-translate').addEventListener('click', () => transformControls.setMode('translate'));
    document.getElementById('mode-rotate').addEventListener('click', () => transformControls.setMode('rotate'));
    document.getElementById('mode-scale').addEventListener('click', () => transformControls.setMode('scale'));
    
    document.getElementById('propColor').addEventListener('input', (event) => {
        const newColor = new THREE.Color(event.target.value);
        selectedObjects.forEach(obj => {
            obj.traverse(child => {
                if (child.isMesh && child.material && child.material.color) {
                    child.material.color.set(newColor);
                    delete child.material.userData.ref; 
                }
            });
            updatePropertiesPanel();
        });
    });
}

function deselectAllObjects() {
    if (transformControls) transformControls.detach();
    selectedObjects.forEach(obj => {
        obj.traverse(child => {
            if (child.isMesh) child.material.emissive.setHex(0x000000);
        });
    });
    selectedObjects = [];
    document.getElementById('properties-panel').classList.add('hidden');
}

function handleKeyDown(event) {
    switch (event.key.toLowerCase()) {
        case 'w': transformControls.setMode('translate'); break;
        case 'e': transformControls.setMode('rotate'); break;
        case 'r': transformControls.setMode('scale'); break;
    }

    if (event.ctrlKey && event.key === 'c') {
        if (selectedObjects.length > 0) {
            const objectToCopy = selectedObjects[selectedObjects.length - 1];
            clipboardObject = objectToCopy.clone();
        }
    }

    if (event.ctrlKey && event.key === 'v') {
        if (clipboardObject) {
            const intersects = getGridIntersects();
            if (intersects.length > 0) {
                const newObject = clipboardObject.clone();
                const point = intersects[0].point;
                newObject.position.set(point.x, clipboardObject.position.y, point.z);
                scene.add(newObject);
            }
        }
    }
    
    if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedObjects.length > 0) {
            deleteSelectedObject();
        }
    }
}

// --- INICIO DE LA SECCIÓN DE EXPORTACIÓN MEJORADA ---

function serializeObject(object3D) {
    if (!object3D.isMesh && !object3D.isGroup || !object3D.visible) return null;

    const objData = {
        name: object3D.name,
        position: { x: object3D.position.x, y: object3D.position.y, z: object3D.position.z },
        rotation: {
            x: THREE.MathUtils.radToDeg(object3D.rotation.x),
            y: THREE.MathUtils.radToDeg(object3D.rotation.y),
            z: THREE.MathUtils.radToDeg(object3D.rotation.z)
        },
        scale: { x: object3D.scale.x, y: object3D.scale.y, z: object3D.scale.z },
        userData: object3D.userData
    };

    if (object3D.isMesh) {
        const geometry = object3D.geometry;
        const geomParams = geometry.parameters;
        const geomType = geometry.type.toLowerCase();

        if (geomType.includes('box') && geomParams) {
            objData.geometry = { type: 'box', width: geomParams.width, height: geomParams.height, depth: geomParams.depth };
        } else if (geomType.includes('cone') && geomParams) {
            objData.geometry = { type: 'cone', radius: geomParams.radius, height: geomParams.height, radialSegments: geomParams.radialSegments };
        } else if (geomType.includes('sphere') && geomParams) {
            objData.geometry = { type: 'sphere', radius: geomParams.radius, widthSegments: geomParams.widthSegments, heightSegments: geomParams.heightSegments };
        } else if (geomType.includes('cylinder') && geomParams) {
            objData.geometry = { type: 'cylinder', radiusTop: geomParams.radiusTop, radiusBottom: geomParams.radiusBottom, height: geomParams.height, radialSegments: geomParams.radialSegments };
        } else {
            console.warn(`Geometría no reconocida '${geometry.type}' para el objeto '${object3D.name}'. Exportando como caja de contorno.`);
            const box = new THREE.Box3().setFromObject(object3D);
            const size = new THREE.Vector3();
            box.getSize(size);
            objData.geometry = { type: 'box', width: size.x, height: size.y, depth: size.z };
        }

        const material = object3D.material;
        if (material) {
            objData.material = {
                materialRef: material.userData.ref || 'desconocido',
            };
        }
    }

    if (object3D.isGroup) {
        objData.children = [];
        object3D.children.forEach(child => {
            const childData = serializeObject(child);
            if (childData) {
                objData.children.push(childData);
            }
        });
    }

    return objData;
}

function exportSceneToJSON() {
    const sceneData = { objects: [] };
    scene.children.forEach(child => {
        if (child.userData.isExportable) {
            const objectData = serializeObject(child);
            if (objectData) {
                sceneData.objects.push(objectData);
            }
        }
    });
    document.getElementById('jsonOutput').value = JSON.stringify(sceneData, null, 2);
}

// --- FIN DE LA SECCIÓN DE EXPORTACIÓN MEJORADA ---


function onWindowResize() {
    const container = document.getElementById('container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// --- LÓGICA DE CONTROL DE CÁMARA ---

function toggleCameraMode() {
    if (cameraMode === 'dpad') {
        cameraMode = 'orbit';
        orbitControls.target.copy(scene.position);
    } else {
        cameraMode = 'dpad';
        const pos = camera.position;
        cameraRadius = pos.length();
        cameraPhi = Math.acos(pos.y / cameraRadius);
        cameraTheta = Math.atan2(pos.x, pos.z);
    }
    updateCameraModeUI();
}

function updateCameraModeUI() {
    const dPad = document.getElementById('d-pad-controls');
    const btn = document.getElementById('toggle-camera-btn');
    const container = document.getElementById('container');

    if (cameraMode === 'dpad') {
        orbitControls.enabled = false;
        dPad.style.display = 'grid';
        btn.textContent = 'Cambiar a Control Ratón';
        container.className = 'dpad-mode';
    } else {
        orbitControls.enabled = true;
        dPad.style.display = 'none';
        btn.textContent = 'Cambiar a Control Fijo';
        container.className = 'orbit-mode';
    }
}

function setupCameraControls() {
    const handleMove = (dir, state) => e => { e.preventDefault(); moveState[dir] = state; };
    const dPad = id => document.getElementById(`d-pad-${id}`);
    ['up', 'down', 'left', 'right'].forEach(dir => {
        dPad(dir).addEventListener('mousedown', handleMove(dir, true));
        dPad(dir).addEventListener('mouseup', handleMove(dir, false));
        dPad(dir).addEventListener('mouseleave', handleMove(dir, false));
        dPad(dir).addEventListener('touchstart', handleMove(dir, true));
        dPad(dir).addEventListener('touchend', handleMove(dir, false));
    });
}

function updateCameraDpad() {
    if (moveState.up) cameraPhi -= rotationSpeed;
    if (moveState.down) cameraPhi += rotationSpeed;
    if (moveState.left) cameraTheta -= rotationSpeed;
    if (moveState.right) cameraTheta += rotationSpeed;
    cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraPhi));
    const x = cameraRadius * Math.sin(cameraPhi) * Math.sin(cameraTheta);
    const y = cameraRadius * Math.cos(cameraPhi);
    const z = cameraRadius * Math.sin(cameraPhi) * Math.cos(cameraTheta);
    camera.position.set(x, y, z);
    camera.lookAt(scene.position);
}

function animate() {
    requestAnimationFrame(animate);
    
    if(!isInitialized) return; // No renderizar si no está listo

    if (cameraMode === 'dpad') {
        updateCameraDpad();
    } else {
        orbitControls.update();
    }
    
    renderer.render(scene, camera);
}

document.addEventListener('DOMContentLoaded', init);
