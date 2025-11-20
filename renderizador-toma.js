// =======================================================================
// === RENDERIZADOR DE TOMAS 3D PARA STORYBOARD ==========================
// =======================================================================
// Este script se encarga de interpretar la descripción de una toma,
// montar una escena 3D con Three.js usando los modelos de 'datos.js',
// y generar una imagen PNG para la TOMA CARD.
// =======================================================================

class TomaRenderer {
    /**
     * Inicializa el renderizador 3D fuera de pantalla.
     * @param {number} width - Ancho de la imagen a generar.
     * @param {number} height - Alto de la imagen a generar.
     */
    constructor(width = 800, height = 450) {
        this.width = width;
        this.height = height;

        // 1. Escena y Cámara
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xdddddd); // Fondo gris claro
        this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.1, 1000);

        // 2. Renderer (no se añade al DOM, es para uso interno)
        this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;

        // 3. Luces
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(15, 20, 10);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // 4. Mapa de modelos de datos cacheados para acceso rápido
        this.datosMap = new Map();
        this.cachearDatos();
    }

    /**
     * Procesa la lista de datos global y la guarda en un mapa para un acceso más rápido.
     */
    cachearDatos() {
        const todosLosDatos = document.querySelectorAll('#listapersonajes .personaje');
        todosLosDatos.forEach(datoEl => {
            const nombreInput = datoEl.querySelector('.nombreh');
            const promptVisualInput = datoEl.querySelector('.prompt-visualh');
            if (nombreInput && nombreInput.value && promptVisualInput) {
                this.datosMap.set(nombreInput.value.trim().toLowerCase(), promptVisualInput.value);
            }
        });
        console.log(`[TomaRenderer] Cacheados ${this.datosMap.size} datos con modelos.`);
    }

    /**
     * Crea un modelo 3D a partir de un string JSON.
     * Adaptado de mini3d.js.
     * @param {string} jsonString - El string JSON del modelo.
     * @returns {THREE.Group|null}
     */
    createModelFromJSON(jsonString) {
        try {
            const jsonData = JSON.parse(jsonString);
            if (!jsonData || !Array.isArray(jsonData.objects)) return null;

            const group = new THREE.Group();
            jsonData.objects.forEach(obj => {
                let geometry;
                const geoParams = obj.geometry;

                switch (geoParams.type.toLowerCase()) {
                    case 'box':
                        geometry = new THREE.BoxGeometry(geoParams.width || 1, geoParams.height || 1, geoParams.depth || 1);
                        break;
                    case 'cylinder':
                        geometry = new THREE.CylinderGeometry(geoParams.radiusTop || 0.5, geoParams.radiusBottom || 0.5, geoParams.height || 1, geoParams.radialSegments || 16);
                        break;
                    case 'sphere':
                        geometry = new THREE.SphereGeometry(geoParams.radius || 0.5, geoParams.widthSegments || 16, geoParams.heightSegments || 16);
                        break;
                    default: return;
                }

                const matParams = obj.material || {};
                const material = new THREE.MeshStandardMaterial({
                    color: matParams.color || 0xffffff,
                    roughness: matParams.roughness || 0.5,
                    metalness: matParams.metalness || 0.5
                });

                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                group.add(mesh);
            });
            return group;

        } catch (e) {
            console.error("Error parseando o creando modelo 3D desde JSON:", e);
            return null;
        }
    }

    /**
     * Parsea la descripción de una toma para extraer instrucciones de la escena.
     * Sintaxis:
     * MODELO: [Nombre del Dato] POS: [x,y,z] ROT: [x,y,z] ESC: [x,y,z]
     * CAMARA: POS: [x,y,z] MIRA: [x,y,z]
     * @param {string} descripcion - El texto del guion conceptual.
     * @returns {object} - Un objeto con {modelos: [], camara: {}}
     */
    parsearDescripcion(descripcion) {
        const lineas = descripcion.split('\n');
        const resultado = { modelos: [], camara: {} };

        const parseVector = (str) => {
            try {
                return JSON.parse(str.replace(/(\w+)/g, '"$1"'));
            } catch {
                return str.split(',').map(Number);
            }
        };

        lineas.forEach(linea => {
            linea = linea.trim();
            if (linea.toUpperCase().startsWith('MODELO:')) {
                const modelo = {};
                const nombreMatch = linea.match(/MODELO:\s*([^P]+)/i);
                if (nombreMatch) modelo.nombre = nombreMatch[1].trim().toLowerCase();

                const posMatch = linea.match(/POS:\s*\[([^\]]+)\]/i);
                if (posMatch) modelo.posicion = parseVector(`[${posMatch[1]}]`);

                const rotMatch = linea.match(/ROT:\s*\[([^\]]+)\]/i);
                if (rotMatch) modelo.rotacion = parseVector(`[${rotMatch[1]}]`);

                const escMatch = linea.match(/ESC:\s*\[([^\]]+)\]/i);
                if (escMatch) modelo.escala = parseVector(`[${escMatch[1]}]`);
                
                if(modelo.nombre) resultado.modelos.push(modelo);

            } else if (linea.toUpperCase().startsWith('CAMARA:')) {
                const posMatch = linea.match(/POS:\s*\[([^\]]+)\]/i);
                if (posMatch) resultado.camara.posicion = parseVector(`[${posMatch[1]}]`);

                const miraMatch = linea.match(/MIRA:\s*\[([^\]]+)\]/i);
                if (miraMatch) resultado.camara.mira = parseVector(`[${miraMatch[1]}]`);
            }
        });
        return resultado;
    }

    /**
     * Renderiza una toma desde su descripción y devuelve una imagen en base64.
     * @param {object} toma - El objeto de la toma con 'guionConceptual'.
     * @returns {string|null} - La imagen en formato dataURL (PNG) o null si hay error.
     */
    renderizarToma(toma) {
        // 1. Limpiar la escena de objetos anteriores
        while (this.scene.children.length > 3) { // Mantenemos luces y helpers
            this.scene.remove(this.scene.children[3]);
        }
        
        // Añadir un suelo por defecto
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshStandardMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // 2. Parsear la descripción
        const instrucciones = this.parsearDescripcion(toma.guionConceptual);

        // 3. Montar la escena con los modelos
        instrucciones.modelos.forEach(inst => {
            const modeloJsonString = this.datosMap.get(inst.nombre);
            if (modeloJsonString) {
                const modelo3D = this.createModelFromJSON(modeloJsonString);
                if (modelo3D) {
                    if (inst.posicion) modelo3D.position.set(...inst.posicion);
                    if (inst.rotacion) modelo3D.rotation.set(...inst.rotacion.map(d => THREE.MathUtils.degToRad(d)));
                    if (inst.escala) modelo3D.scale.set(...inst.escala);
                    this.scene.add(modelo3D);
                }
            } else {
                console.warn(`[TomaRenderer] Modelo no encontrado en datos: ${inst.nombre}`);
            }
        });

        // 4. Configurar la cámara
        if (instrucciones.camara.posicion) {
            this.camera.position.set(...instrucciones.camara.posicion);
        } else {
            this.camera.position.set(0, 5, 15); // Posición por defecto
        }

        if (instrucciones.camara.mira) {
            this.camera.lookAt(new THREE.Vector3(...instrucciones.camara.mira));
        } else {
            this.camera.lookAt(0, 0, 0); // Mirar al origen por defecto
        }

        // 5. Renderizar y capturar
        this.renderer.render(this.scene, this.camera);
        try {
            return this.renderer.domElement.toDataURL('image/png');
        } catch (e) {
            console.error("Error al capturar el canvas:", e);
            return null;
        }
    }
}
