// =======================================================================
// === CÓDIGO COMPLETO Y CORREGIDO PARA r-preview-3d.js (VERSIÓN 2.2) ===
// =======================================================================

'use strict';

// --- ESTADO DEL PREVIEW (VARIABLES GLOBALES) ---
let previewState = {};
let playerController = {};
let cameraController = {};
let keyState = {};
let rotationStopHandler = null;

// --- CONSTANTES DEL MUNDO DEL PREVIEW ---
const PREVIEW_CHUNK_SIZE = 222;
// El radio debe coincidir con el del editor para que la curvatura sea la misma
const PREVIEW_WORLD_SPHERE_RADIUS = (GRID_WIDTH * PREVIEW_CHUNK_SIZE) / 2.2; 
const PLANET_CENTER_VEC3 = new THREE.Vector3((GRID_WIDTH * PREVIEW_CHUNK_SIZE) / 2, 0, (GRID_HEIGHT * PREVIEW_CHUNK_SIZE) / 2);
const PLANET_CENTER_CANNON = new CANNON.Vec3(PLANET_CENTER_VEC3.x, PLANET_CENTER_VEC3.y, PLANET_CENTER_VEC3.z);

// --- MANEJADORES DE EVENTOS ---
function handleKeyDown(e) {
    keyState[e.code] = true;
}

function handleKeyUp(e) {
    keyState[e.code] = false;
}

 // --- AÑADIDO: MANEJADOR PARA LA RUEDA DEL RATÓN (ZOOM) ---
function handleMouseWheel(event) {
    // Previene el scroll por defecto de la página
    event.preventDefault();

    const zoomSpeed = 0.05;
    cameraController.distance += event.deltaY * zoomSpeed;

    // Limita el zoom a los valores mínimo y máximo definidos
    cameraController.distance = THREE.MathUtils.clamp(
        cameraController.distance, 
        cameraController.minZoom, 
        cameraController.maxZoom
    );
}

// --- AÑADIDO: MANEJADOR PARA EL MOVIMIENTO DEL RATÓN (ROTACIÓN) ---
// --- CÓDIGO CORREGIDO ---
function handleMouseMove(event) {
    if (!previewState.isRightMouseDown) return;

    const rotationSensitivity = 0.005;
    
    // Actualiza solo el ángulo horizontal de la cámara basado en el movimiento del ratón
    cameraController.horizontalAngle -= event.movementX * rotationSensitivity;
}

// --- AÑADIDO: MANEJADOR PARA CUANDO SE SUELTA UN BOTÓN DEL RATÓN ---
function handleMouseUp(event) {
    if (event.button === 2) { // Botón derecho
        previewState.isRightMouseDown = false;
    }
}

// --- AÑADIDO: MANEJADOR PARA PREVENIR EL MENÚ CONTEXTUAL ---
function preventContextMenu(event) {
    event.preventDefault();
}

// --- MODIFICADO: ANTES handleMouseClick, AHORA MANEJA TODOS LOS CLICS ---
function handleMouseDown(event) {
    if (!previewState.isActive) return;

    // --- Lógica para el clic izquierdo (MOVER) ---
    if (event.button === 0) {
        const container = document.getElementById('r-game-container');
        const rect = container.getBoundingClientRect();
        
        previewState.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        previewState.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(previewState.mouse, previewState.camera);

        const intersects = raycaster.intersectObject(previewState.worldSphereMesh);

        if (intersects.length > 0) {
            playerController.targetDestination = intersects[0].point;
            playerController.isMovingToTarget = true;
        }
    }
    // --- Lógica para el clic derecho (ROTAR) ---
    else if (event.button === 2) {
        previewState.isRightMouseDown = true;
    }
}

function resetStateObjects() {
    previewState = {
        isActive: false, scene: null, camera: null, renderer: null, clock: null, animationFrameId: null,
        collidableObjects: [], physicsWorld: null, physicsMaterials: {}, worldSphereMesh: null,
        mouse: new THREE.Vector2(),
        isRightMouseDown: false 
    };
    playerController = {
        height: 1.8, speed: 18.0, runSpeedMultiplier: 1.6, radius: 0.5, mesh: null,
        canJump: true, jumpForce: 8, physicsBody: null, surfaceNormal: new THREE.Vector3(0, 1, 0),
        targetDestination: null,
        isMovingToTarget: false
    };
    // CÓDIGO MODIFICADO (en la función resetStateObjects)
cameraController = {
    // === PARÁMETRO 1: ALTURA ===
    // Sube este número para que la cámara esté MÁS ALTA y alejada.
    distance: 15,          

    // === PARÁMETRO 2: ÁNGULO HACIA ABAJO ===
    // Aumenta el divisor (2.5) para que el ángulo sea MENOS picado.
    // Reduce el divisor para un ángulo MÁS picado (casi 90 grados).
    // Math.PI / 2.5 es un ángulo de 72°, bastante cenital.
    angle: Math.PI / -1.35,   

    horizontalAngle: 0, 
    horizontalRotationDirection: 0,
    verticalRotationDirection: 0, 
    ROTATION_SPEED: 1.5, 
    minZoom: 5,           
    maxZoom: 100,           
    yaw: 0,
};
    keyState = {};
}
 
// EN: r-preview-3d.js (REEMPLAZA ESTA FUNCIÓN)

function startPreview(data, editorCanvas) {
    if (previewState.isActive) return;

    const container = document.getElementById('r-game-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Mostramos el modal si existe en el entorno del editor
    const previewModal = document.getElementById('r-preview-modal');
    if (previewModal) {
        previewModal.style.display = 'flex';
    }
    
    resetStateObjects();

    if (container.clientWidth === 0 || container.clientHeight === 0) {
         setTimeout(() => startPreview(data, editorCanvas), 100);
         return;
    }

    previewState.scene = new THREE.Scene();
    const fogColor = 0x152238;
    previewState.scene.background = new THREE.Color(fogColor);
    previewState.scene.fog = new THREE.Fog(fogColor, 150, 2000);

    previewState.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 5000);
    previewState.renderer = new THREE.WebGLRenderer({ antialias: true });
    previewState.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(previewState.renderer.domElement);
    
    previewState.physicsWorld = new CANNON.World();
    previewState.physicsWorld.gravity.set(0, 0, 0);
    const groundMaterial = new CANNON.Material("groundMaterial");
    const playerMaterial = new CANNON.Material("playerMaterial");
    previewState.physicsWorld.addContactMaterial(new CANNON.ContactMaterial(groundMaterial, playerMaterial, { friction: 0.4, restitution: 0.1 }));
    previewState.physicsMaterials = { groundMaterial, playerMaterial };
    
    previewState.clock = new THREE.Clock();

    const playerGeo = new THREE.BoxGeometry(playerController.radius * 2, playerController.height, playerController.radius * 2);
    const playerMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    playerController.mesh = new THREE.Mesh(playerGeo, playerMat);
    previewState.scene.add(playerController.mesh);

    let startPosition = getPositionOnSphere(PLANET_CENTER_VEC3.x, PLANET_CENTER_VEC3.z);
    if (data && data.metadata && data.metadata.playerStartPosition) {
        const { chunkX, chunkZ } = data.metadata.playerStartPosition;
        const flatX = (chunkX * PREVIEW_CHUNK_SIZE) + (PREVIEW_CHUNK_SIZE / 2);
        const flatZ = (chunkZ * PREVIEW_CHUNK_SIZE) + (PREVIEW_CHUNK_SIZE / 2);
        startPosition = getPositionOnSphere(flatX, flatZ);
    }
    playerController.mesh.position.copy(startPosition);

    previewState.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    
    // --- INICIO DE LA CORRECCIÓN DE LA LUZ ---
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(PLANET_CENTER_VEC3.x + 150, 200, PLANET_CENTER_VEC3.z + 100);
    
    // ¡CLAVE! Hacemos que la luz apunte al centro del planeta.
    dirLight.target.position.copy(PLANET_CENTER_VEC3);
    
    // Añadimos tanto la luz como su objetivo a la escena.
    previewState.scene.add(dirLight);
    previewState.scene.add(dirLight.target);
    // --- FIN DE LA CORRECCIÓN DE LA LUZ ---

    loadWorldFromData(data, startPosition, editorCanvas);

    const playerPosition = playerController.mesh.position;
    const startNormal = new THREE.Vector3().subVectors(playerPosition, PLANET_CENTER_VEC3).normalize();
    const cameraTarget = playerPosition.clone().addScaledVector(startNormal, 1.6);
    
    const offset = new THREE.Vector3(0, 0, cameraController.distance);
    const euler = new THREE.Euler(cameraController.angle, cameraController.horizontalAngle, 0, 'YXZ');
    offset.applyEuler(euler);
    const alignment = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), startNormal);
    offset.applyQuaternion(alignment);
    const idealPosition = playerPosition.clone().add(offset);

    previewState.camera.position.copy(idealPosition);
    previewState.camera.up.copy(startNormal);
    previewState.camera.lookAt(cameraTarget);

    setTimeout(() => {
        setupEventListeners();
        previewState.isActive = true;
        animatePreview();
    }, 100);
}

function stopPreview() {
    if (!previewState.isActive) return;
    cancelAnimationFrame(previewState.animationFrameId);
    cleanupEventListeners();
    previewState.isActive = false;
    document.getElementById('r-preview-modal').style.display = 'none';
    const container = document.getElementById('r-game-container');
    if (container) container.innerHTML = '';
}

function loadWorldFromData(data, startPosition, editorCanvas) {
    let finalTextureCanvas;

    // Si recibimos un canvas (desde el editor en modo preview), lo usamos.
    if (editorCanvas) {
        console.log("Preview: Usando lienzo renderizado por el editor.");
        finalTextureCanvas = editorCanvas;
    }
    // Si NO recibimos un canvas (en el HTML exportado), creamos uno base.
    // Este lienzo será pintado posteriormente por el script 'launcher'.
    else {
        console.log("Preview: Creando lienzo de textura base. Esperando carga de imagen externa.");
        const baseCanvas = document.createElement('canvas');
        baseCanvas.width = 2048;
        baseCanvas.height = 1024;
        const ctx = baseCanvas.getContext('2d');
        // Dibuja un color base simple (ej. agua) como placeholder.
        ctx.fillStyle = '#3B698B';
        ctx.fillRect(0, 0, baseCanvas.width, baseCanvas.height);
        finalTextureCanvas = baseCanvas;
    }

    // --- ¡AÑADIDO IMPORTANTE! ---
    // Guardamos las referencias en el estado del preview para que el launcher pueda acceder a ellas.
    previewState.textureCanvas = finalTextureCanvas;

    // Usamos THREE.Texture en lugar de CanvasTexture para mayor compatibilidad con la carga estática.
    const dynamicTexture = new THREE.Texture(finalTextureCanvas);
    dynamicTexture.encoding = THREE.sRGBEncoding;
    dynamicTexture.needsUpdate = true;

    // Guardamos también la referencia a la textura
    previewState.dynamicTexture = dynamicTexture;
    // --- FIN DEL AÑADIDO ---

    const sphereGeo = new THREE.SphereGeometry(PREVIEW_WORLD_SPHERE_RADIUS, 128, 64);
    const sphereMat = new THREE.MeshStandardMaterial({ map: dynamicTexture, roughness: 0.9, metalness: 0.1 });
    previewState.worldSphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    previewState.worldSphereMesh.position.copy(PLANET_CENTER_VEC3);
    previewState.worldSphereMesh.receiveShadow = true;
    previewState.scene.add(previewState.worldSphereMesh);

    // --- El resto de la función (físicas y colocación de objetos) permanece igual ---
    const groundShape = new CANNON.Sphere(PREVIEW_WORLD_SPHERE_RADIUS);
    const groundBody = new CANNON.Body({ mass: 0, position: PLANET_CENTER_CANNON, shape: groundShape, material: previewState.physicsMaterials.groundMaterial });
    previewState.physicsWorld.addBody(groundBody);
    const playerShape = new CANNON.Sphere(playerController.radius);
    playerController.physicsBody = new CANNON.Body({
        mass: 70, position: new CANNON.Vec3().copy(startPosition), shape: playerShape,
        material: previewState.physicsMaterials.playerMaterial, linearDamping: 0.5
    });
    previewState.physicsWorld.addBody(playerController.physicsBody);

    if (data?.chunks) {
        for (const chunkId in data.chunks) {
            const chunk = data.chunks[chunkId];
            if (!chunk?.objects) continue;
            const [chunkX, chunkZ] = chunkId.split('_').map(Number);
            for (const obj of chunk.objects) {
                const entityData = tools.customEntities[obj.type] || tools.entities[obj.type];
                if (!entityData) continue;
                let modelObject = null;
                if (entityData.modelType === 'json3d' && entityData.icon) {
                    modelObject = createModelFromJSON(entityData.icon);
                } else if (entityData.modelType === 'sprite') {
                    const iconSrc = (typeof findCharacterImageSrc === 'function' ? findCharacterImageSrc(obj.dataRef) : null) || entityData.icon;
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
                    const flatX = (chunkX * PREVIEW_CHUNK_SIZE) + obj.x;
                    const flatZ = (chunkZ * PREVIEW_CHUNK_SIZE) + obj.z;
                    const positionOnSphere = getPositionOnSphere(flatX, flatZ);
                    const box = new THREE.Box3().setFromObject(modelObject);
                    const yOffset = modelObject.isSprite ? box.getSize(new THREE.Vector3()).y / 2 : -box.min.y;
                    const surfaceNormal = new THREE.Vector3().subVectors(positionOnSphere, PLANET_CENTER_VEC3).normalize();
                    modelObject.position.copy(positionOnSphere).addScaledVector(surfaceNormal, yOffset);
                    const upVector = new THREE.Vector3(0, 1, 0);
                    modelObject.quaternion.setFromUnitVectors(upVector, surfaceNormal);
                    if (obj.rotationY) modelObject.rotateOnAxis(surfaceNormal, THREE.MathUtils.degToRad(obj.rotationY));
                    if (obj.scale) modelObject.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);
                    modelObject.castShadow = true;
                    previewState.scene.add(modelObject);
                }
            }
        }
    }
}


// --- BUCLE DE ANIMACIÓN Y FÍSICAS ---

function animatePreview() {
    if (!previewState.isActive) return;
    previewState.animationFrameId = requestAnimationFrame(animatePreview);
    
    const deltaTime = Math.min(previewState.clock.getDelta(), 0.1);

    if (playerController.physicsBody) {
        const gravityForce = 35;
        const bodyPos = playerController.physicsBody.position;
        const gravityDirection = PLANET_CENTER_CANNON.vsub(bodyPos).unit();
        const forceVector = gravityDirection.scale(gravityForce * playerController.physicsBody.mass);
        playerController.physicsBody.force.vadd(forceVector, playerController.physicsBody.force);
    }

    previewState.physicsWorld.step(1 / 60, deltaTime, 3);
    
    syncPlayerVisuals();
    updatePlayer(deltaTime);
    updateCamera(deltaTime);
    
    previewState.renderer.render(previewState.scene, previewState.camera);
}

function syncPlayerVisuals() {
    if (!playerController.physicsBody) return;
    const bodyPos = playerController.physicsBody.position;
    if (isNaN(bodyPos.x)) return;
    
    playerController.mesh.position.copy(bodyPos);

    const vectorFromCenter = new THREE.Vector3().subVectors(playerController.mesh.position, PLANET_CENTER_VEC3);
    playerController.surfaceNormal.copy(vectorFromCenter).normalize();

    const upVector = new THREE.Vector3(0, 1, 0);
    const orientation = new THREE.Quaternion().setFromUnitVectors(upVector, playerController.surfaceNormal);
    const yaw = new THREE.Quaternion().setFromAxisAngle(playerController.surfaceNormal, cameraController.yaw);
    playerController.mesh.quaternion.multiplyQuaternions(yaw, orientation);
}

// --- MODIFICADO: LÓGICA DE MOVIMIENTO ACTUALIZADA ---
function updatePlayer(deltaTime) {
    if (!playerController.physicsBody) return;
    const speed = playerController.speed * (keyState['ShiftLeft'] ? playerController.runSpeedMultiplier : 1.0);

    const cameraDirection = new THREE.Vector3();
    previewState.camera.getWorldDirection(cameraDirection);
    const forward = cameraDirection.projectOnPlane(playerController.surfaceNormal).normalize();
    const right = new THREE.Vector3().crossVectors(playerController.surfaceNormal, forward).normalize();

    const moveDirection = new THREE.Vector3();
    let isKeyboardInput = false;

    // --- Lógica de movimiento con teclado (WASD) ---
    if (keyState['KeyW']) { moveDirection.add(forward); isKeyboardInput = true; }
    if (keyState['KeyS']) { moveDirection.sub(forward); isKeyboardInput = true; }
    if (keyState['KeyA']) { moveDirection.add(right); isKeyboardInput = true; }
    if (keyState['KeyD']) { moveDirection.sub(right); isKeyboardInput = true; }

    // Si se usa el teclado, se cancela el movimiento por clic
    if (isKeyboardInput) {
        playerController.isMovingToTarget = false;
        playerController.targetDestination = null;
    }

    if (moveDirection.lengthSq() > 0.01) {
        // Movimiento por teclado
        moveDirection.normalize();
        const targetVelocity = new CANNON.Vec3(moveDirection.x * speed, moveDirection.y * speed, moveDirection.z * speed);
        playerController.physicsBody.velocity.lerp(targetVelocity, 0.2, playerController.physicsBody.velocity);

        // Rotación del personaje
        const targetYaw = Math.atan2(moveDirection.dot(right), moveDirection.dot(forward));
        let diff = targetYaw - cameraController.yaw;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        cameraController.yaw += diff * (15 * deltaTime);
    } 
    // --- Lógica de movimiento por clic ---
    else if (playerController.isMovingToTarget && playerController.targetDestination) {
        const currentPos = playerController.physicsBody.position;
        const targetPos = playerController.targetDestination;

        const distanceToTarget = currentPos.distanceTo(targetPos);

        // Si está lo suficientemente cerca, detenerse
        if (distanceToTarget < playerController.radius * 2) {
            playerController.isMovingToTarget = false;
            playerController.targetDestination = null;
             // Opcional: frenar al personaje
            playerController.physicsBody.velocity.set(0, 0, 0);

        } else {
            // Calcular la dirección hacia el objetivo sobre la superficie de la esfera
            const directionToTarget = new THREE.Vector3().subVectors(targetPos, currentPos);
            const surfaceDirection = directionToTarget.projectOnPlane(playerController.surfaceNormal).normalize();
            
            // Aplicar velocidad en esa dirección
            const targetVelocity = new CANNON.Vec3(surfaceDirection.x * speed, surfaceDirection.y * speed, surfaceDirection.z * speed);
            playerController.physicsBody.velocity.lerp(targetVelocity, 0.2, playerController.physicsBody.velocity);
            
            // Rotar el personaje para que mire hacia el destino
            const targetYaw = Math.atan2(surfaceDirection.dot(right), surfaceDirection.dot(forward));
            let diff = targetYaw - cameraController.yaw;
            while (diff < -Math.PI) diff += 2 * Math.PI;
            while (diff > Math.PI) diff -= 2 * Math.PI;
            cameraController.yaw += diff * (15 * deltaTime);
        }
    }
}
 
// =======================================================================
// === FUNCIÓN updateCamera (CORREGIDA) ==================================
// =======================================================================
function updateCamera(deltaTime) {
    if (!playerController.mesh) return;

    const playerPosition = playerController.mesh.position;
    
    // --- CORRECCIÓN CLAVE ---
    // En lugar de mirar directamente a la posición del jugador, creamos un
    // "objetivo" ligeramente por encima de él. Esto estabiliza la cámara
    // y la hace sentir como una verdadera cámara en tercera persona.
    // El valor 1.6 es una buena altura inicial, ajústalo si tu personaje es más alto o bajo.
    const cameraTarget = playerPosition.clone().addScaledVector(playerController.surfaceNormal, 1.6); 

    // --- EL RESTO DEL CÓDIGO PERMANECE IGUAL ---
    // Calcula la posición orbital de la cámara basándose en la distancia,
    // el ángulo vertical (angle) y el horizontal (horizontalAngle).
    const offset = new THREE.Vector3(0, 0, cameraController.distance);
    const euler = new THREE.Euler(cameraController.angle, cameraController.horizontalAngle, 0, 'YXZ');
    offset.applyEuler(euler);
    
    // Alinea el offset con la normal de la superficie del planeta en la
    // posición del jugador para que la cámara se oriente correctamente.
    const alignment = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), playerController.surfaceNormal);
    offset.applyQuaternion(alignment);
    
    // La posición ideal de la cámara es la posición del jugador más el offset calculado.
    const idealPosition = playerPosition.clone().add(offset);
    
    // Lógica para evitar que la cámara atraviese el planeta (colisión).
    let finalPosition = idealPosition;
    const cameraNearPlane = 0.5;
    const minDistanceFromServer = PREVIEW_WORLD_SPHERE_RADIUS + cameraNearPlane;
    const distanceToCenter = idealPosition.distanceTo(PLANET_CENTER_VEC3);

    if (distanceToCenter < minDistanceFromServer) {
        const direction = new THREE.Vector3().subVectors(idealPosition, PLANET_CENTER_VEC3).normalize();
        finalPosition = PLANET_CENTER_VEC3.clone().addScaledVector(direction, minDistanceFromServer);
    }

    // Suaviza el movimiento de la cámara para que no sea instantáneo.
 if (cameraController.isFirstUpdate) {
        previewState.camera.position.copy(finalPosition); // Teletransporte en el primer fotograma
        cameraController.isFirstUpdate = false; // Desactiva la bandera
    } else {
        previewState.camera.position.lerp(finalPosition, 0.1); // Suavizado para el resto de fotogramas
    }
    // Finalmente, ajusta la orientación de la cámara.
    previewState.camera.up.copy(playerController.surfaceNormal);
    
    // --- PUNTO FINAL DE LA CORRECCIÓN ---
    // Ahora, en lugar de mirar a playerPosition, mira al cameraTarget que definimos.
    previewState.camera.lookAt(cameraTarget); 
}

// --- FUNCIONES AUXILIARES Y DE EVENTOS ---

function getPositionOnSphere(flatX, flatZ) {
    const relativeX = flatX - PLANET_CENTER_VEC3.x;
    const relativeZ = flatZ - PLANET_CENTER_VEC3.z;
    const y_squared = PREVIEW_WORLD_SPHERE_RADIUS * PREVIEW_WORLD_SPHERE_RADIUS - (relativeX * relativeX + relativeZ * relativeZ);
    if (y_squared < 0) return new THREE.Vector3(flatX, PLANET_CENTER_VEC3.y, flatZ);
    return new THREE.Vector3(flatX, PLANET_CENTER_VEC3.y + Math.sqrt(y_squared), flatZ);
}

function setupEventListeners() {
    const container = document.getElementById('r-game-container');
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    if (container) {
        container.addEventListener('mousedown', handleMouseDown); // <-- MODIFICADO
        container.addEventListener('wheel', handleMouseWheel); // <-- AÑADIDO
        container.addEventListener('mousemove', handleMouseMove); // <-- AÑADIDO
        container.addEventListener('mouseup', handleMouseUp); // <-- AÑADIDO
        container.addEventListener('contextmenu', preventContextMenu); // <-- AÑADIDO
    }
}

function cleanupEventListeners() {
    const container = document.getElementById('r-game-container');
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    if (container) {
        container.removeEventListener('mousedown', handleMouseDown); // <-- MODIFICADO
        container.removeEventListener('wheel', handleMouseWheel); // <-- AÑADIDO
        container.removeEventListener('mousemove', handleMouseMove); // <-- AÑADIDO
        container.removeEventListener('mouseup', handleMouseUp); // <-- AÑADIDO
        container.removeEventListener('contextmenu', preventContextMenu); // <-- AÑADIDO
    }
}