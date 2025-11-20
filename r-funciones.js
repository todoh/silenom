/**
 * r-funciones.js (Versión 2.2 - CORRECCIÓN DEFINITIVA)
 * ---------------------------
 * Lógica centralizada para la creación de escenas 3D desde JSON.
 * Incluye una función createMaterial más robusta para evitar errores.
 */

// =======================================================================
// === GESTIÓN DE LA INTERFAZ DEL EDITOR DE ENTIDADES ====================
// =======================================================================

function updateCollisionFieldsVisibility() {
    const tipo = editorDOM.editColisionTipoSelect.value;
    const radioContainer = document.getElementById('edit-colision-radio-container');
    const alturaContainer = document.getElementById('edit-colision-altura-container');

    radioContainer.style.display = (tipo === 'capsula' || tipo === 'esfera') ? 'block' : 'none';
    alturaContainer.style.display = (tipo === 'capsula' || tipo === 'caja') ? 'block' : 'none';
}

function renderizarRutaMovimiento(ruta) {
    const listaEl = document.getElementById('edit-movimiento-lista');
    listaEl.innerHTML = '';

    if (!ruta || ruta.length === 0) {
        listaEl.innerHTML = '<p style="color: #999; font-style: italic;">Sin ruta de movimiento.</p>';
        return;
    }

    ruta.forEach((paso, index) => {
        const pasoEl = document.createElement('div');
        pasoEl.className = 'ruta-paso';
        pasoEl.dataset.tipo = paso.tipo;

        let textoPaso = '';
        if (paso.tipo === 'aleatorio') {
            const duracionTexto = paso.duracion === null ? '(infinito)' : `(${paso.duracion}s)`;
            textoPaso = `Movimiento Aleatorio ${duracionTexto}`;
            pasoEl.dataset.duracion = paso.duracion;
        } else if (paso.tipo === 'ir_a') {
            textoPaso = `Ir a Coordenada (X: ${paso.coordenadas.x}, Z: ${paso.coordenadas.z})`;
            pasoEl.dataset.x = paso.coordenadas.x;
            pasoEl.dataset.z = paso.coordenadas.z;
        }

        pasoEl.innerHTML = `<span>${index + 1}. ${textoPaso}</span> <button title="Eliminar paso">&times;</button>`;
        pasoEl.querySelector('button').onclick = () => {
            ruta.splice(index, 1);
            renderizarRutaMovimiento(ruta);
        };

        listaEl.appendChild(pasoEl);
    });
}


// =======================================================================
// === MOTOR DE CREACIÓN DE ESCENAS 3D DESDE JSON (CORREGIDO) ============
// =======================================================================

const textureLoader = new THREE.TextureLoader();

function createGeometry(params) {
    if (!params || !params.type) return null;
    switch (params.type.toLowerCase()) {
        case 'box': return new THREE.BoxGeometry(params.width || 1, params.height || 1, params.depth || 1, params.widthSegments, params.heightSegments, params.depthSegments);
        case 'sphere': return new THREE.SphereGeometry(params.radius || 0.5, params.widthSegments || 32, params.heightSegments || 16);
        case 'cylinder': return new THREE.CylinderGeometry(params.radiusTop ?? 0.5, params.radiusBottom ?? 0.5, params.height || 1, params.radialSegments || 32, params.heightSegments, params.openEnded);
        case 'cone': return new THREE.ConeGeometry(params.radius || 0.5, params.height || 1, params.radialSegments || 32);
        case 'plane': return new THREE.PlaneGeometry(params.width || 1, params.height || 1, params.widthSegments, params.heightSegments);
        case 'torus': return new THREE.TorusGeometry(params.radius || 1, params.tube || 0.4, params.radialSegments || 8, params.tubularSegments || 6);
        case 'torusknot': return new THREE.TorusKnotGeometry(params.radius || 1, params.tube || 0.4, params.tubularSegments || 64, params.radialSegments || 8);
        case 'dodecahedron': return new THREE.DodecahedronGeometry(params.radius || 1, params.detail || 0);
        case 'icosahedron': return new THREE.IcosahedronGeometry(params.radius || 1, params.detail || 0);
        case 'octahedron': return new THREE.OctahedronGeometry(params.radius || 1, params.detail || 0);
        case 'tetrahedron': return new THREE.TetrahedronGeometry(params.radius || 1, params.detail || 0);
        default: console.warn(`Tipo de geometría desconocido: ${params.type}`); return null;
    }
}
 
/**
 * Crea un material buscándolo en la librería o usando un color simple.
 * @param {object} params - Parámetros del material desde el JSON.
 * @returns {THREE.Material} El material encontrado o creado.
 */
/**
 * Crea un material buscándolo en la librería o usando un color simple.
 * @param {object} params - Parámetros del material desde el JSON.
 * @returns {THREE.Material} El material encontrado o creado.
 */
function createMaterial(params) {
    // ---- INICIO DE LA CORRECCIÓN ----
    // 1. Añadir una guarda para parámetros nulos o indefinidos.
    // Si el JSON tiene "material": null, esta línea lo captura y devuelve un material de error visible.
    if (!params) {
        console.warn("Se intentó crear un material con datos nulos. Se usará un material de emergencia fucsia.");
        return new THREE.MeshStandardMaterial({ color: '#FF00FF' });
    }
    // ---- FIN DE LA CORRECCIÓN ----

    const safeParams = params; // Ya no se necesita el `|| {}`

    if (safeParams.materialRef) {
        if (MATERIAL_LIBRARY[safeParams.materialRef]) {
            return MATERIAL_LIBRARY[safeParams.materialRef];
        } else {
            console.warn(`El material '${safeParams.materialRef}' no existe en la librería.`);
            return new THREE.MeshStandardMaterial({ color: '#FF00FF' });
        }
    }

    const materialType = safeParams.type ? safeParams.type.toLowerCase() : 'standard';

    // ---- INICIO DE LA CORRECCIÓN ----
    // 2. Crear un objeto de parámetros "limpio", ignorando cualquier propiedad que sea `null`.
    // Esto evita pasar algo como `{ vertexShader: null }` al constructor de Three.js.
    const materialParams = {};
    for (const key in safeParams) {
        if (Object.prototype.hasOwnProperty.call(safeParams, key) && safeParams[key] !== null && key !== 'type') {
            materialParams[key] = safeParams[key];
        }
    }
    // ---- FIN DE LA CORRECCIÓN ----

    // El resto del código permanece igual, pero ahora opera sobre el `materialParams` limpio.
    for (const key of ['map', 'normalMap']) {
        if (typeof materialParams[key] === 'string') {
            materialParams[key] = textureLoader.load(materialParams[key]);
        }
    }

    switch (materialType) {
        case 'standard': default: return new THREE.MeshStandardMaterial(materialParams);
    }
}
function parseObject(objData) {
    if (!objData) return null;

    let object3D;
    const objectType = objData.type ? objData.type.toLowerCase() : 'mesh';

    switch (objectType) {
        case 'pointlight':
            object3D = new THREE.PointLight(objData.color, objData.intensity, objData.distance, objData.decay);
            break;
        case 'directionallight':
            object3D = new THREE.DirectionalLight(objData.color, objData.intensity);
            break;
        case 'spotlight':
            object3D = new THREE.SpotLight(objData.color, objData.intensity, objData.distance, objData.angle, objData.penumbra, objData.decay);
            break;
        case 'mesh':
        default:
            // === INICIO DE LA MODIFICACIÓN ===
            // Si el objeto tiene geometría, se crea como una malla (Mesh).
            if (objData.geometry) {
                const geometry = createGeometry(objData.geometry);
                const material = createMaterial(objData.material);
                
                // Si la creación de la geometría falla, se notifica y se omite.
                if (!geometry) {
                    console.error(`Fallo al crear la geometría para el objeto '${objData.name || '(sin nombre)'}'. Se omitirá el objeto.`);
                    return null;
                }
                
                object3D = new THREE.Mesh(geometry, material);
            } else {
                // Si NO tiene geometría, se crea como un Grupo para que sirva de contenedor.
                object3D = new THREE.Group();
            }
            // === FIN DE LA MODIFICACIÓN ===
            break;
    }

    // Aplicar propiedades comunes (funciona igual para Mesh y Group)
    object3D.name = objData.name || '';
    if (objData.position) object3D.position.set(objData.position.x || 0, objData.position.y || 0, objData.position.z || 0);
    if (objData.rotation) object3D.rotation.set(THREE.MathUtils.degToRad(objData.rotation.x || 0), THREE.MathUtils.degToRad(objData.rotation.y || 0), THREE.MathUtils.degToRad(objData.rotation.z || 0));
    if (objData.scale) object3D.scale.set(objData.scale.x ?? 1, objData.scale.y ?? 1, objData.scale.z ?? 1);
    if (objData.userData) object3D.userData = { ...objData.userData };

    // Procesar hijos recursivamente
    if (objData.children && Array.isArray(objData.children)) {
        objData.children.forEach(childData => {
            const childObject = parseObject(childData);
            if (childObject) {
                object3D.add(childObject);
            }
        });
    }
    return object3D;
}
function createModelFromJSON(jsonData) {
    const group = new THREE.Group();
    if (!jsonData || !Array.isArray(jsonData.objects)) {
        if (jsonData && Array.isArray(jsonData.parts)) {
             jsonData.objects = jsonData.parts;
        } else {
            console.error("El formato JSON no es válido. Se esperaba un array 'objects'.");
            return group;
        }
    }

    jsonData.objects.forEach(objData => {
        const object3D = parseObject(objData);
        if (object3D) group.add(object3D);
    });

    return group;
}
/**
 * Genera una textura procedural en un elemento Canvas.
 * @param {object} params - La "receta" de la textura leída desde el JSON.
 * @returns {HTMLCanvasElement} El canvas con la textura dibujada.
 */
/**
 * Genera una textura procedural en un elemento Canvas.
 * @param {object} params - La "receta" de la textura leída desde el JSON.
 * @returns {HTMLCanvasElement} El canvas con la textura dibujada.
 */
function generateProceduralTexture(params) {
    const canvas = document.createElement('canvas');
    const resolution = params.resolution || 256;
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');
    const recipe = params.recipe || 'default';

    // --- Elige la receta correcta ---
    switch (recipe) {
        case 'wood':
            generateWoodTexture(ctx, params);
            break;
        case 'stone':
            generateStoneTexture(ctx, params);
            break;
        case 'roof':
            generateRoofTexture(ctx, params);
            break;
        case 'grass':
            generateGrassTexture(ctx, params);
            break;
        case 'sand':
            generateSandTexture(ctx, params);
            break;
        case 'snow':
            generateSnowTexture(ctx, params);
            break;
        case 'forest':
            generateForestTexture(ctx, params);
            break;
        
        // --- INICIO DE LA CORRECCIÓN FINAL ---
        case 'marble':
            generateMarbleTexture(ctx, params);
            break;
        case 'bricks':
            generateBricksTexture(ctx, params);
            break;
        case 'tiles': // <-- AÑADIR ESTE ÚLTIMO CASO
            generateTilesTexture(ctx, params);
            break;
        // --- FIN DE LA CORRECCIÓN FINAL ---

        default:
            ctx.fillStyle = '#FF00FF'; // Color rosa de error si la receta no existe
            ctx.fillRect(0, 0, resolution, resolution);
            break;
    }

    return canvas;
}

// --- Receta para MADERA ---
function generateWoodTexture(ctx, params) {
    const resolution = ctx.canvas.width;
    const color1 = new THREE.Color(params.color1 || '#8D6E63');
    const color2 = new THREE.Color(params.color2 || '#5D4037');
    const rings = params.rings || 10;
    const distortion = params.distortion || 0.1;

    for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
            const noise = Math.abs(Math.sin(x * 0.1) * Math.cos(y * 0.05) + Math.cos(x * y * 0.001));
            const ringValue = Math.sin((y / resolution + noise * distortion) * rings * Math.PI);
            const t = (ringValue + 1) / 2;
            const finalColor = new THREE.Color().lerpColors(color1, color2, t);
            ctx.fillStyle = finalColor.getStyle();
            ctx.fillRect(x, y, 1, 1);
        }
    }
}

// --- Receta para PIEDRA ---
function generateStoneTexture(ctx, params) {
    const resolution = ctx.canvas.width;
    const color1 = new THREE.Color(params.color1 || '#BDBDBD'); // Gris claro
    const color2 = new THREE.Color(params.color2 || '#616161'); // Gris oscuro
    const scale = params.scale || 0.05;

    for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
            const noise = Math.random();
            const t = Math.round(noise * 5) / 5; // Crea un efecto de manchas de color plano
            const finalColor = new THREE.Color().lerpColors(color1, color2, t);
            ctx.fillStyle = finalColor.getStyle();
            ctx.fillRect(x, y, 1, 1);
        }
    }
}

// --- Receta para TEJADO ---
function generateRoofTexture(ctx, params) {
    const resolution = ctx.canvas.width;
    const color1 = new THREE.Color(params.color1 || '#5D4037'); // Teja
    const color2 = new THREE.Color(params.color2 || '#3E2723'); // Sombra
    const tileSize = params.tileSize || 32;

    for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
            const isEdgeX = x % tileSize < 2 || x % tileSize > tileSize - 3;
            const isEdgeY = y % tileSize < 2 || y % tileSize > tileSize - 3;
            ctx.fillStyle = (isEdgeX || isEdgeY) ? color2.getStyle() : color1.getStyle();
            ctx.fillRect(x, y, 1, 1);
        }
    }
}
// --- (NUEVA) Receta para HIERBA ---
function generateGrassTexture(ctx, params) {
    const resolution = ctx.canvas.width;
    const color1 = new THREE.Color(params.color1 || '#4CAF50');
    const color2 = new THREE.Color(params.color2 || '#388E3C');
    for (let i = 0; i < 20000; i++) {
        const x = Math.random() * resolution;
        const y = Math.random() * resolution;
        const length = Math.random() * 5 + 2;
        const angle = Math.random() * Math.PI * 0.2 - Math.PI * 0.1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.sin(angle) * length, y - Math.cos(angle) * length);
        ctx.strokeStyle = Math.random() > 0.5 ? color1.getStyle() : color2.getStyle();
        ctx.stroke();
    }
}

// --- (NUEVA) Receta para ARENA ---
function generateSandTexture(ctx, params) {
    const resolution = ctx.canvas.width;
    const color1 = new THREE.Color(params.color1 || '#FBC02D');
    const color2 = new THREE.Color(params.color2 || '#F9A825');
    const imageData = ctx.createImageData(resolution, resolution);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const color = Math.random() > 0.5 ? color1 : color2;
        data[i] = color.r * 255;
        data[i + 1] = color.g * 255;
        data[i + 2] = color.b * 255;
        data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
}
// --- (NUEVA) Receta para BOSQUE ---
function generateForestTexture(ctx, params) {
    const resolution = ctx.canvas.width;
    const color1 = new THREE.Color(params.color1 || '#1B5E20');
    const color2 = new THREE.Color(params.color2 || '#2E7D32');
    ctx.fillStyle = color1.getStyle();
    ctx.fillRect(0, 0, resolution, resolution);
    for (let i = 0; i < 500; i++) {
        ctx.fillStyle = color2.clone().addScalar((Math.random() - 0.5) * 0.2).getStyle();
        ctx.beginPath();
        ctx.arc(Math.random() * resolution, Math.random() * resolution, Math.random() * 10 + 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// --- (NUEVA) Receta para NIEVE ---
function generateSnowTexture(ctx, params) {
    const resolution = ctx.canvas.width;
    const color1 = new THREE.Color(params.color1 || '#FFFFFF');
    const color2 = new THREE.Color(params.color2 || '#E0E0E0');
    const imageData = ctx.createImageData(resolution, resolution);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random();
        const color = noise < 0.95 ? color1 : color2;
        data[i] = color.r * 255;
        data[i+1] = color.g * 255;
        data[i+2] = color.b * 255;
        data[i+3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
}
// --- (NUEVA) Receta para MÁRMOL ---
function generateMarbleTexture(ctx, params) {
    const resolution = ctx.canvas.width;
    const color1 = new THREE.Color(params.color1 || '#FFFFFF'); // Color base
    const color2 = new THREE.Color(params.color2 || '#888888'); // Color de la veta
    const frequency = params.frequency || 10.0;
    const turbulence = params.turbulence || 8.0;

    for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
            const noise = Math.abs(Math.sin((x + y * turbulence) * Math.PI / resolution * frequency));
            const t = Math.pow(noise, 0.75);
            const finalColor = new THREE.Color().lerpColors(color1, color2, t);
            ctx.fillStyle = finalColor.getStyle();
            ctx.fillRect(x, y, 1, 1);
        }
    }
}

// --- (NUEVA) Receta para LADRILLOS ---
function generateBricksTexture(ctx, params) {
    const resolution = ctx.canvas.width;
    const brickColor = new THREE.Color(params.brickColor || '#B71C1C');
    const mortarColor = new THREE.Color(params.mortarColor || '#A1887F');
    const brickWidth = params.brickWidth || 64;
    const brickHeight = params.brickHeight || 24;
    const mortarSize = params.mortarSize || 3;

    for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
            const isMortarX = x % brickWidth < mortarSize;
            const row = Math.floor(y / brickHeight);
            const offsetX = row % 2 === 0 ? 0 : brickWidth / 2;
            const isMortarY = y % brickHeight < mortarSize;
            const isMortarXOffset = (x + offsetX) % brickWidth < mortarSize;
            
            ctx.fillStyle = (isMortarXOffset || isMortarY) ? mortarColor.getStyle() : brickColor.getStyle();
            ctx.fillRect(x, y, 1, 1);
        }
    }
}

// --- (NUEVA) Receta para BALDOSAS ---
function generateTilesTexture(ctx, params) {
    const resolution = ctx.canvas.width;
    const color1 = new THREE.Color(params.color1 || '#FAFAFA');
    const color2 = new THREE.Color(params.color2 || '#E0E0E0');
    const groutColor = new THREE.Color(params.groutColor || '#757575');
    const tileSize = params.tileSize || 64;
    const groutSize = params.groutSize || 2;

    for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
            const isGroutX = x % tileSize < groutSize;
            const isGroutY = y % tileSize < groutSize;
            const tileX = Math.floor(x / tileSize);
            const tileY = Math.floor(y / tileSize);
            
            if (isGroutX || isGroutY) {
                ctx.fillStyle = groutColor.getStyle();
            } else {
                ctx.fillStyle = (tileX + tileY) % 2 === 0 ? color1.getStyle() : color2.getStyle();
            }
            ctx.fillRect(x, y, 1, 1);
        }
    }
}
// Objeto global que actuará como nuestro almacén de materiales pre-generados
const MATERIAL_LIBRARY = {};

/**
 * Pre-genera todos los materiales procedurales y los guarda en la librería.
 * Esta función debe ser llamada UNA SOLA VEZ al iniciar la aplicación.
 */
function inicializarLibreriaMateriales() {
    console.log("Pre-generando la librería de materiales extendida...");

    // --- MATERIALES EXISTENTES ---
    const recetaMaderaVigas = { recipe: "wood", color1: "#6D4C41", color2: "#4E342E", rings: 8 };
    const recetaMaderaColumnas = { recipe: "wood", color1: "#A1887F", color2: "#795548", rings: 15 };
    const recetaPiedraBase = { recipe: "stone", color1: "#757575", color2: "#424242" };
    const recetaTejado = { recipe: "roof", color1: "#616161", color2: "#212121", tileSize: 35 };
    
    MATERIAL_LIBRARY['madera_vigas'] = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(generateProceduralTexture(recetaMaderaVigas)) });
    MATERIAL_LIBRARY['madera_columnas'] = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(generateProceduralTexture(recetaMaderaColumnas)) });
    MATERIAL_LIBRARY['piedra_base'] = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(generateProceduralTexture(recetaPiedraBase)), roughness: 0.8 });
    MATERIAL_LIBRARY['tejado'] = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(generateProceduralTexture(recetaTejado)) });
    MATERIAL_LIBRARY['oro_brillante'] = new THREE.MeshStandardMaterial({ color: "#FFD700", metalness: 0.9, roughness: 0.2 });

    // --- (NUEVOS) MATERIALES PROCEDURALES ---
    const recetaMarmolBlanco = { recipe: "marble", color1: "#FFFFFF", color2: "#B0BEC5", turbulence: 4 };
    const recetaLadrilloRojo = { recipe: "bricks", brickColor: "#C62828", mortarColor: "#A1887F" };
    const recetaBaldosaAjedrez = { recipe: "tiles", color1: "#212121", color2: "#FFFFFF", groutColor: "#757575" };

    MATERIAL_LIBRARY['marmol_blanco'] = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(generateProceduralTexture(recetaMarmolBlanco)), roughness: 0.1, metalness: 0.1 });
    MATERIAL_LIBRARY['pared_ladrillo'] = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(generateProceduralTexture(recetaLadrilloRojo)), roughness: 0.8 });
    MATERIAL_LIBRARY['suelo_ajedrez'] = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(generateProceduralTexture(recetaBaldosaAjedrez)), roughness: 0.4 });

    // --- (NUEVOS) METALES ---
    MATERIAL_LIBRARY['plata_pulida'] = new THREE.MeshStandardMaterial({ color: "#E0E0E0", metalness: 1.0, roughness: 0.1 });
    MATERIAL_LIBRARY['cobre_gastado'] = new THREE.MeshStandardMaterial({ color: "#B87333", metalness: 0.8, roughness: 0.4 });
    MATERIAL_LIBRARY['acero_oscuro'] = new THREE.MeshStandardMaterial({ color: "#424242", metalness: 1.0, roughness: 0.5 });
    
    // --- (NUEVOS) PLÁSTICOS Y CRISTALES ---
    MATERIAL_LIBRARY['plastico_rojo_mate'] = new THREE.MeshStandardMaterial({ color: "#D32F2F", roughness: 0.9, metalness: 0.0 });
    MATERIAL_LIBRARY['plastico_azul_brillante'] = new THREE.MeshStandardMaterial({ color: "#1976D2", roughness: 0.1, metalness: 0.0 });
    MATERIAL_LIBRARY['cristal'] = new THREE.MeshStandardMaterial({ color: "#E0F7FA", roughness: 0.0, metalness: 0.1, transparent: true, opacity: 0.3 });

    // --- (NUEVOS) MATERIALES EMISIVOS (QUE BRILLAN) ---
    MATERIAL_LIBRARY['luz_neon_verde'] = new THREE.MeshStandardMaterial({ color: "#69F0AE", emissive: "#69F0AE", emissiveIntensity: 1.5 });
    MATERIAL_LIBRARY['lava'] = new THREE.MeshStandardMaterial({ color: "#F4511E", emissive: "#BF360C", emissiveIntensity: 1 });

    // --- (NUEVOS) MATERIALES DE CONSTRUCCIÓN Y TERRENO ---
    MATERIAL_LIBRARY['muro_estuco'] = new THREE.MeshStandardMaterial({ color: "#F5F5F5", roughness: 0.9 });
    MATERIAL_LIBRARY['terreno_cesped'] = new THREE.MeshStandardMaterial({ color: "#4CAF50", map: new THREE.CanvasTexture(generateProceduralTexture({recipe: 'grass'})) });
    MATERIAL_LIBRARY['terreno_arena'] = new THREE.MeshStandardMaterial({ color: "#FBC02D", map: new THREE.CanvasTexture(generateProceduralTexture({recipe: 'sand'})) });
    MATERIAL_LIBRARY['terreno_nieve'] = new THREE.MeshStandardMaterial({ color: "#FFFFFF", map: new THREE.CanvasTexture(generateProceduralTexture({recipe: 'snow'})) });
    MATERIAL_LIBRARY['terreno_bosque'] = new THREE.MeshStandardMaterial({ color: "#1B5E20", map: new THREE.CanvasTexture(generateProceduralTexture({recipe: 'forest'})) });
    MATERIAL_LIBRARY['tela_roja'] = new THREE.MeshStandardMaterial({ color: "#E53935", roughness: 0.9 });

    console.log("Librería de materiales extendida y lista.", MATERIAL_LIBRARY);
}