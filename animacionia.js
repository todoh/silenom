// animacionia.js (Versión con Flujo Avanzado de 5 Pasos y Suelo Plano)

document.addEventListener('DOMContentLoaded', () => {
    // --- REFERENCIAS AL DOM ---
    const scriptInput = document.getElementById('main-script-input2');
    const generateBtn = document.getElementById('generate-scene-btn');
    const playBtn = document.getElementById('play-scene-btn');
    const startRecordBtn = document.getElementById('start-record-btn2');
    const stopRecordBtn = document.getElementById('stop-record-btn2');
    const downloadLink = document.getElementById('download-link2');
    const statusEl = document.getElementById('status2');
    const canvasContainer = document.getElementById('canvas-container-3d');

    // --- ESTADO DEL MÓDULO ---
    let motorAnimacion3D = null;
    let recorder = null;

    // --- MOTOR 3D (ACTUALIZADO CON SUELO PLANO) ---
    class MotorAnimacion3D {
        constructor(container) {
            this.container = container;
            console.log(`Inicializando Motor3D. Dimensiones del contenedor detectadas: ${this.container.clientWidth}px x ${this.container.clientHeight}px`);

            if (this.container.clientWidth === 0 || this.container.clientHeight === 0) {
                console.warn("¡Atención! El contenedor del canvas 3D no tiene dimensiones. El canvas no será visible.");
            }

            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000); // Aspecto temporal 1
            this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.clock = new THREE.Clock();
            
            this.assetsEnEscena = {};
            this.lineaDeTiempo = [];
            this.estaReproduciendo = false;
            this.tiempoTranscurrido = 0;
            this.groundPlane = null; // <-- CAMBIO: De groundSphere a groundPlane

            this.setup();
        }

        setup() {
            this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
            const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
            dirLight.position.set(10, 15, 5);
            this.scene.add(dirLight);

            // <-- CAMBIO: Se usa PlaneGeometry en lugar de SphereGeometry
            const groundGeometry = new THREE.PlaneGeometry(200, 200, 32, 32);
            const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x404040, roughness: 0.9 });
            this.groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
            this.groundPlane.rotation.x = -Math.PI / 2; // Rotar para que esté plano
            this.groundPlane.position.y = 0; // Posicionar en el origen
            this.scene.add(this.groundPlane);

            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.container.appendChild(this.renderer.domElement);

            this.camera.position.set(0, 15, 30); // <-- CAMBIO: Ajuste de cámara para vista de suelo plano
            this.controls.target.set(0, 0, 0); // <-- CAMBIO: El control apunta al centro del suelo
            this.controls.enableDamping = true;
            
            window.addEventListener('resize', this.handleResize.bind(this));
            this.handleResize();
            this.animate();
        }

        handleResize() {
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;
            if (width > 0 && height > 0) {
                this.camera.aspect = width / height;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(width, height);
            }
        }

        animate() {
            requestAnimationFrame(this.animate.bind(this));
            this.controls.update();
            const delta = this.clock.getDelta();
            if (this.estaReproduciendo) {
                this.tiempoTranscurrido += delta;
                this.actualizarAnimaciones();
            }
            if (typeof updateAnimations === 'function') {
                updateAnimations(this.scene);
            }
            this.renderer.render(this.scene, this.camera);
        }

        limpiarEscena() {
            Object.values(this.assetsEnEscena).forEach(asset => this.scene.remove(asset));
            this.assetsEnEscena = {};
        }

        aplicarAmbiente(ambiente) {
            if (ambiente.cieloColor) {
                this.scene.background = new THREE.Color(ambiente.cieloColor);
            }
            if (ambiente.texturaSuelo && typeof MATERIAL_LIBRARY !== 'undefined') {
                const materialSuelo = MATERIAL_LIBRARY[ambiente.texturaSuelo];
                if (materialSuelo) {
                    this.groundPlane.material = materialSuelo; // <-- CAMBIO: Aplica al plano
                } else {
                    console.warn(`Textura de suelo '${ambiente.texturaSuelo}' no encontrada en MATERIAL_LIBRARY.`);
                }
            }
        }

        cargarEscena(objetos, assetsDisponibles) {
            this.limpiarEscena();
            objetos.forEach(item => {
                const assetData = assetsDisponibles.find(a => a.id === item.assetId);
                if (assetData && assetData.modelo) {
                    const modelo3D = createModelFromJSON(assetData.modelo);
                    modelo3D.position.set(item.posicion.x, item.posicion.y, item.posicion.z);
                    if (item.rotacion) modelo3D.rotation.y = THREE.MathUtils.degToRad(item.rotacion.y);
                    if (item.escala) modelo3D.scale.set(item.escala.x, item.escala.y, item.escala.z);
                    
                    this.scene.add(modelo3D);
                    this.assetsEnEscena[item.assetId] = modelo3D;
                }
            });
        }

        cargarLineaDeTiempo(lineaDeTiempo) {
             this.lineaDeTiempo = lineaDeTiempo.sort((a, b) => a.tiempo - b.tiempo);
        }
        
        reproducir() {
            this.tiempoTranscurrido = 0;
            this.estaReproduciendo = true;
            this.clock.start();
            this.lineaDeTiempo.forEach(evento => evento.ejecutado = false);
        }
        
        detener() { this.estaReproduciendo = false; }

        actualizarAnimaciones() {
            this.lineaDeTiempo.forEach(evento => {
                if (this.tiempoTranscurrido >= evento.tiempo && !evento.ejecutado) {
                    const objeto = this.assetsEnEscena[evento.assetId];
                    if (objeto) {
                        console.log(`Ejecutando animación para ${evento.assetId} en t=${evento.tiempo}`);
                        objeto.userData.behavior = evento.animacion;
                        if (evento.params) {
                            Object.assign(objeto.userData, evento.params);
                        }
                        evento.ejecutado = true;
                    }
                }
            });
        }
        
        getCanvas() { return this.renderer.domElement; }
    }

    // --- NUEVA FUNCIÓN PARA RESETEAR ---
    function resetearMotor3D() {
        if (!motorAnimacion3D) {
            // Si el motor no existe, lo crea por primera vez.
            motorAnimacion3D = new MotorAnimacion3D(canvasContainer);
        } else {
            // Si ya existe, lo limpia a fondo.
            motorAnimacion3D.detener();
            motorAnimacion3D.limpiarEscena();
            motorAnimacion3D.cargarLineaDeTiempo([]); // Vacía la línea de tiempo
            
            // Restablece el ambiente a valores por defecto
            motorAnimacion3D.scene.background = null; // Fondo transparente/negro por defecto
            motorAnimacion3D.groundPlane.material = new THREE.MeshStandardMaterial({ color: 0x404040, roughness: 0.9 });
            
            console.log("Motor 3D reseteado para una nueva generación.");
        }
    }

    // --- FUNCIONES DEL PIPELINE DE IA (5 PASOS) ---

    function recopilarAssetsVideojuego() {
        const assets = [];
        const datos = document.querySelectorAll('#listapersonajes .personaje');
        datos.forEach(datoEl => {
            const arco = datoEl.querySelector('.change-arc-btn')?.dataset.arco;
            if (arco === 'videojuego') {
                const nombre = datoEl.querySelector('.nombreh')?.value;
                const promptVisual = datoEl.querySelector('.prompt-visualh')?.value;
                if (nombre && promptVisual) {
                    try {
                        const modelo = JSON.parse(promptVisual);
                        assets.push({ id: `custom_${nombre.replace(/\s+/g, '_')}`, nombre: nombre, modelo: modelo });
                    } catch (e) { console.warn(`No se pudo parsear el modelo 3D para: ${nombre}`); }
                }
            }
        });
        return assets;
    }

    async function paso1_validarAssets(script, assets) {
        statusEl.textContent = 'Paso 1/5: Validando assets principales...';
        const nombresAssets = assets.map(a => `"${a.nombre}" (ID: ${a.id})`).join(', ');
        const prompt = `Analiza el guion: "${script}". Assets disponibles: [${nombresAssets}]. Responde SÓLO JSON: si los assets principales del guion existen, responde { "necesario": true }, si no, { "necesario": false, "faltantes": ["nombre del faltante"] }`;
        return await llamarIAConFeedback(prompt, "Paso 1", 'gemini-2.5-flash-lite', true);
    }

    async function paso2_crearCroquis(script, assets) {
        statusEl.textContent = 'Paso 2/5: Creando croquis de la escena...';
        const nombresAssets = assets.map(a => `"${a.nombre}" (ID: ${a.id})`).join(', ');
        const prompt = `Guion: "${script}". Assets disponibles: [${nombresAssets}]. Tu tarea es crear un plan para una escena 3D. Identifica los actores principales y sugiere de 3 a 5 assets de fondo de la lista para añadir detalle. Responde SÓLO JSON: { "croquis": "Breve descripción del plan de la escena.", "actoresPrincipales": ["id_actor1", "id_actor2"], "elementosSugeridos": ["id_fondo1", "id_fondo2"] }`;
        return await llamarIAConFeedback(prompt, "Paso 2", 'gemini-2.5-flash-lite', true);
    }
    
    async function paso3_componerDecorado(script, croquis, assets) {
        statusEl.textContent = 'Paso 3/5: Componiendo el decorado y ambiente...';
        const assetsParaIA = assets.map(a => ({ id: a.id, nombre: a.nombre, modelo: a.modelo }));
        const texturasDisponibles = Object.keys(tools.textures).join(', ');
        const prompt = `Guion: "${script}". Plan: "${croquis.croquis}". Assets de fondo a usar: ${JSON.stringify(croquis.elementosSugeridos)}. Lista de todos los assets disponibles con sus modelos: ${JSON.stringify(assetsParaIA)}. Texturas de suelo disponibles: [${texturasDisponibles}]. Basándote en las proporciones de los modelos, posiciona SÓLO los assets de fondo y ajusta su escala si es necesario. Elige un color de cielo (hex) y una textura para el suelo plano. Responde SÓLO JSON: { "ambiente": { "cieloColor": "#xxxxxx", "texturaSuelo": "nombreTextura" }, "decorado": [ { "assetId": "id_del_asset", "posicion": { "x": ..., "y": 0, "z": ... }, "rotacion": { "y": ... }, "escala": { "x":..., "y":..., "z":... } } ] }`;
        return await llamarIAConFeedback(prompt, "Paso 3", 'gemini-2.5-flash-lite', true);
    }
    
    async function paso4_posicionarActores(script, croquis, decorado, assets) {
        statusEl.textContent = 'Paso 4/5: Posicionando actores principales...';
        const assetsParaIA = assets.map(a => ({ id: a.id, nombre: a.nombre, modelo: a.modelo }));
        const prompt = `Guion: "${script}". Plan: "${croquis.croquis}". Actores a posicionar: ${JSON.stringify(croquis.actoresPrincipales)}. El decorado ya está en estas posiciones: ${JSON.stringify(decorado)}. Lista de todos los assets disponibles con sus modelos: ${JSON.stringify(assetsParaIA)}. Basándote en las proporciones de los modelos, posiciona SÓLO a los actores principales de forma coherente, ajustando su escala si es necesario para que todo se vea proporcionado. Responde SÓLO JSON: { "actores": [ { "assetId": "id_del_actor", "posicion": { "x": ..., "y": 0, "z": ... }, "rotacion": { "y": ... }, "escala": { "x":..., "y":..., "z":... } } ] }`;
        return await llamarIAConFeedback(prompt, "Paso 4", 'gemini-2.5-flash-lite', true);
    }

    async function paso5_crearAnimaciones(script, todosLosObjetos) {
        statusEl.textContent = 'Paso 5/5: Creando línea de tiempo de animación...';
        const animacionesDisponibles = Object.keys(BEHAVIORS).join(', ');
        const idsEnEscena = todosLosObjetos.map(o => o.assetId).join(', ');
        const prompt = `Guion: "${script}". Objetos en escena: [${idsEnEscena}]. Animaciones disponibles: [${animacionesDisponibles}]. Crea una línea de tiempo de animación para los objetos si el guion lo requiere. Si no se necesita animación, devuelve un array vacío. Responde SÓLO JSON: { "lineaDeTiempo": [ { "tiempo": segundos, "assetId": "id_objeto", "animacion": "nombre_animacion", "params": { "propiedad": valor } } ] }`;
        return await llamarIAConFeedback(prompt, "Paso 5", 'gemini-2.5-flash-lite', true);
    }

    // --- FUNCIÓN ORQUESTADORA ---
    async function runAdvancedGenerationPipeline() {
        const script = scriptInput.value;
        if (!script.trim()) {
            statusEl.textContent = "Por favor, escribe un guion.";
            return;
        }

        try {
            generateBtn.disabled = true;
            playBtn.disabled = true;
            startRecordBtn.disabled = true;
            
            // <-- CAMBIO: Llamada a la nueva función de reseteo
            resetearMotor3D();

            const assets = recopilarAssetsVideojuego();
            if (assets.length === 0) {
                statusEl.textContent = 'No se encontraron datos con el arco "Videojuego".';
                return;
            }

            const validacion = await paso1_validarAssets(script, assets);
            if (!validacion.necesario) {
                statusEl.textContent = `Faltan datos: ${validacion.faltantes.join(', ')}.`;
                return;
            }

            const croquis = await paso2_crearCroquis(script, assets);
            const composicionDecorado = await paso3_componerDecorado(script, croquis, assets);
            const composicionActores = await paso4_posicionarActores(script, croquis, composicionDecorado.decorado, assets);
            
            const todosLosObjetos = [...composicionDecorado.decorado, ...composicionActores.actores];
            const composicionAnimaciones = await paso5_crearAnimaciones(script, todosLosObjetos);
            
            // Renderizado Final
            motorAnimacion3D.aplicarAmbiente(composicionDecorado.ambiente);
            motorAnimacion3D.cargarEscena(todosLosObjetos, assets);
            motorAnimacion3D.cargarLineaDeTiempo(composicionAnimaciones.lineaDeTiempo);
            
            statusEl.textContent = "Composición generada. ¡Listo para reproducir!";
            playBtn.disabled = false;
            startRecordBtn.disabled = false;

        } catch (error) {
            console.error("Error en el proceso de generación avanzado:", error);
            statusEl.textContent = `Error: ${error.message}`;
        } finally {
            generateBtn.disabled = false;
        }
    }

    // --- LÓGICA DE GRABACIÓN (Sin cambios) ---
    function iniciarGrabacion() {
        if (!motorAnimacion3D) return;
        
        statusEl.textContent = "Iniciando grabación...";
        const canvas = motorAnimacion3D.getCanvas();
        const stream = canvas.captureStream(30);

        recorder = RecordRTC(stream, {
            type: 'video',
            mimeType: 'video/webm;codecs=vp9',
            bitsPerSecond: 6000000,
        });

        recorder.startRecording();
        motorAnimacion3D.reproducir();
        
        startRecordBtn.classList.add('hidden');
        stopRecordBtn.classList.remove('hidden');
    }
    function detenerGrabacion() {
        if (!recorder) return;
        statusEl.textContent = "Procesando video...";
        motorAnimacion3D.detener();

        recorder.stopRecording(() => {
            const blob = recorder.getBlob();
            const url = URL.createObjectURL(blob);
            downloadLink.href = url;
            downloadLink.download = `animacion3d_${Date.now()}.webm`;
            downloadLink.classList.remove('hidden');
            
            statusEl.textContent = "¡Video listo para descargar!";
            stopRecordBtn.classList.add('hidden');
            playBtn.disabled = false;
            startRecordBtn.disabled = false;
            startRecordBtn.classList.remove('hidden');
            
            recorder.destroy();
            recorder = null;
        });
    }

    // --- EVENT LISTENERS ---
    generateBtn.addEventListener('click', runAdvancedGenerationPipeline);
    playBtn.addEventListener('click', () => { if (motorAnimacion3D) motorAnimacion3D.reproducir(); });
    startRecordBtn.addEventListener('click', iniciarGrabacion);
    stopRecordBtn.addEventListener('click', detenerGrabacion);
});

