// =======================================================================
// === VISOR 3D LIGERO E INTERACTIVO PARA EL EDITOR DE DATOS ============
// =======================================================================

class Mini3DViewer {
    /**
     * Inicializa el visor 3D en un canvas específico.
     * @param {HTMLCanvasElement} canvas - El elemento canvas donde se renderizará la escena.
     * @param {object} modelData - El objeto JSON que describe el modelo 3D.
     */
    constructor(canvas, modelData) {
        this.canvas = canvas;
        this.modelData = modelData;
        this.animationFrameId = null;

        const parent = this.canvas.parentElement;
        if (!parent) {
            console.error("El canvas del visor 3D debe estar dentro de un elemento padre.");
            return;
        }
        const rect = parent.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        if (width === 0 || height === 0) {
            console.error("El contenedor del visor 3D no tiene tamaño. No se puede inicializar Three.js.");
            return;
        }

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        this.camera.position.set(10, 10, 10);

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(5, 10, 7.5);
        this.scene.add(dirLight);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.screenSpacePanning = false;

        this.modelGroup = new THREE.Group();
        this.scene.add(this.modelGroup);
        this.updateModel(this.modelData);

        this.animate();
    }

    /**
     * Actualiza el modelo que se muestra en la escena y centra la cámara en él.
     * @param {object} newModelData - El nuevo objeto JSON del modelo.
     */
    updateModel(newModelData) {
        // Limpiar el grupo de modelo anterior
        while (this.modelGroup.children.length > 0) {
            this.modelGroup.remove(this.modelGroup.children[0]);
        }

        // === CORRECCIÓN CLAVE ===
        // Llama a la función GLOBAL createModelFromJSON (de r-funciones.js)
        // en lugar de a una función interna obsoleta.
        const newModel = createModelFromJSON(newModelData);
        this.modelGroup.add(newModel);

        // Lógica de centrado automático
        const box = new THREE.Box3().setFromObject(newModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        if (maxDim > 0) { // Evitar errores si el modelo está vacío
            const fov = this.camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            cameraZ *= 1.8; // Alejar un poco la cámara
            
            this.controls.target.copy(center);
            this.camera.position.set(
                center.x,
                center.y + (maxDim / 4),
                center.z + cameraZ
            );
            this.camera.lookAt(center);
            this.controls.update();
        }
    }

    /**
     * El bucle de animación que renderiza la escena.
     */
    animate = () => {
      this.animationFrameId = requestAnimationFrame(this.animate);
        this.controls.update();

        // ¡Llama al gestor de animaciones en cada frame!
        updateAnimations(this.scene);

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Limpia todos los recursos para evitar fugas de memoria.
     */
    cleanup() {
        cancelAnimationFrame(this.animationFrameId);
        this.renderer.dispose();
        this.controls.dispose();
        console.log("Mini 3D Viewer limpiado.");
    }

    // La función createModelFromJSON interna ha sido ELIMINADA.
}
