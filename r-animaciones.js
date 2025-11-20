/**
 * r-animaciones.js (Versión Híbrida)
 * -----------------
 * Módulo centralizado para gestionar todas las lógicas de animación 3D.
 * Contiene la biblioteca de comportamientos original y añade nuevas funcionalidades.
 */

const BEHAVIORS = {
    /**
     * Anima un objeto para que funcione como las manecillas de un reloj.
     */
    'ClockAnimation': function(object) {
        const hourHand = object.getObjectByName('manecilla_horas');
        const minuteHand = object.getObjectByName('manecilla_minutos');
        const secondHand = object.getObjectByName('manecilla_segundos');
        if (hourHand && minuteHand && secondHand) {
            const now = new Date();
            const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
            const minutes = now.getMinutes() + seconds / 60;
            const hours = now.getHours() + minutes / 60;
            secondHand.rotation.z = -(seconds / 60) * Math.PI * 2;
            minuteHand.rotation.z = -(minutes / 60) * Math.PI * 2;
            hourHand.rotation.z = -(hours / 12) * Math.PI * 2;
        }
    },

    /**
     * Anima un objeto para que gire constantemente sobre su propio eje Y.
     */
    'SpinningObject': function(object) {
        object.rotation.y += 0.01;
    },
    
    /**
     * Anima un objeto para que flote suavemente hacia arriba y hacia abajo.
     */
    'BobbingObject': function(object) {
        if (object.userData.initialPositionY === undefined) {
            object.userData.initialPositionY = object.position.y;
        }
        const amplitude = object.userData.amplitude || 0.2;
        const speed = object.userData.speed || 2;
        object.position.y = object.userData.initialPositionY + Math.sin(Date.now() * 0.001 * speed) * amplitude;
    },
    
    /**
     * Hace que un objeto crezca y se encoja rítmicamente (palpite).
     */
    'PulsatingObject': function(object) {
        if (object.userData.initialScale === undefined) {
            object.userData.initialScale = object.scale.clone();
        }
        const initialScale = object.userData.initialScale;
        const speed = object.userData.speed || 2;
        const amplitude = object.userData.amplitude || 0.1;
        const scaleFactor = 1 + Math.sin(Date.now() * 0.001 * speed) * amplitude;
        object.scale.set(initialScale.x * scaleFactor, initialScale.y * scaleFactor, initialScale.z * scaleFactor);
    },

    /**
     * Hace que el color de un objeto cicle a través del arcoíris.
     */
    'ColorCycle': function(object) {
        if (!object.material || !object.material.color) return;
        const speed = object.userData.speed || 0.2;
        const hue = (Date.now() * 0.001 * speed) % 1;
        object.material.color.setHSL(hue, 1.0, 0.5);
    },
    
    /**
     * Hace que un objeto orbite alrededor de su punto de anclaje (su "padre").
     */
    'OrbitObject': function(object) {
        if (object.userData.initialPosition === undefined) {
            object.userData.initialPosition = object.position.clone();
        }
        const initialPos = object.userData.initialPosition;
        const radius = object.userData.orbitRadius || 5;
        const speed = object.userData.orbitSpeed || 1;
        const time = Date.now() * 0.001 * speed;
        object.position.x = initialPos.x + Math.cos(time) * radius;
        object.position.z = initialPos.z + Math.sin(time) * radius;
    },

    // =======================================================================
    // === NUEVAS ANIMACIONES AÑADIDAS =======================================
    // =======================================================================

    /**
     * 🆕 Simula una respiración sutil expandiendo y contrayendo un objeto en su eje X y Z.
     */
    'BreathingObject': function(object) {
        if (object.userData.initialScale === undefined) {
            object.userData.initialScale = object.scale.clone();
        }
        const initialScale = object.userData.initialScale;
        const speed = object.userData.breathSpeed || 1.5;
        const amplitude = object.userData.breathAmplitude || 0.03;
        const breathFactor = 1 + Math.sin(Date.now() * 0.001 * speed) * amplitude;
        object.scale.set(initialScale.x * breathFactor, initialScale.y, initialScale.z * breathFactor);
    },

    /**
     * 🆕 Simula el balanceo natural de un brazo u objeto similar.
     */
    'ArmSwayingObject': function(object) {
        if (object.userData.initialRotation === undefined) {
            object.userData.initialRotation = object.rotation.clone();
        }
        const initialRotation = object.userData.initialRotation;
        const speed = object.userData.swaySpeed || 1.8;
        const amplitudeRad = THREE.MathUtils.degToRad(object.userData.swayAmplitude || 8);
        const swayAngle = Math.sin(Date.now() * 0.001 * speed) * amplitudeRad;
        object.rotation.x = initialRotation.x + swayAngle;
    },

    /**
     * 🆕 Hace que la opacidad de un material oscile. El material debe tener 'transparent: true'.
     */
    'OpacityCycle': function(object) {
        if (!object.material || object.material.transparent === false) return;
        const min = object.userData.minOpacity || 0.1;
        const max = object.userData.maxOpacity || 1.0;
        const speed = object.userData.speed || 1;
        const sineWave = (Math.sin(Date.now() * 0.001 * speed) + 1) / 2;
        object.material.opacity = min + sineWave * (max - min);
    },

    /**
     * 🆕 Causa un parpadeo en el objeto, alternando su visibilidad.
     */
    'Flicker': function(object) {
        const onDuration = object.userData.onDuration || 150;
        const offDuration = object.userData.offDuration || 100;
        const cycleDuration = onDuration + offDuration;
        const timeInCycle = Date.now() % cycleDuration;
        object.visible = timeInCycle < onDuration;
    }
};

function updateAnimations(scene) {
    scene.traverse(object => {
        if (object.userData.behavior) {
            const behaviorFunction = BEHAVIORS[object.userData.behavior];
            if (behaviorFunction) {
                behaviorFunction(object);
            }
        }
    });
}