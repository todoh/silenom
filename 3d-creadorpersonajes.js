import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- VARIABLES GLOBALES ---
let scene, camera, renderer, controls, currentModelJSON, characterGroup, clock;
let isCharacterCreatorInitialized = false;

// --- CONSTANTES DE UI ---
const sceneContainer = document.getElementById('scene-container');
const modelSelect = document.getElementById('model-select');
const generateBtn = document.getElementById('generate-btn5');
 
const promptInput = document.getElementById('prompt');
const jsonOutput = document.getElementById('json-output');
const copyJsonBtn = document.getElementById('copy-json-btn');
const loader = document.getElementById('loader');
const skinColorInput = document.getElementById('skin-color');
const shirtColorInput = document.getElementById('shirt-color');
const pantsUpperColorInput = document.getElementById('pants-upper-color');
const pantsLowerColorInput = document.getElementById('pants-lower-color');
const shoesColorInput = document.getElementById('shoes-color');
const accessorySelect = document.getElementById('accessory-select');
const addAccessoryBtn = document.getElementById('add-accessory-btn');
const equippedAccessoriesContainer = document.getElementById('equipped-accessories');
// --- NUEVO: Selector de Animación ---
const animationSelect = document.getElementById('animation-select');


// --- DATOS DE LOS MODELOS BASE (CON PIERNAS ARTICULADAS) ---
const models = {
    "niño": {
        "objects": [
            { "name": "torso", "type": "Mesh", "geometry": { "type": "Box", "width": 0.8, "height": 1.3, "depth": 0.4 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": 0.8, "z": 0 } },
            { "name": "neck", "type": "Mesh", "geometry": { "type": "Cylinder", "radiusTop": 0.18, "radiusBottom": 0.18, "height": 0.2 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": 1.55, "z": 0 } },
            { "name": "head", "type": "Mesh", "geometry": { "type": "Sphere", "radius": 0.5 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": 2.15, "z": 0 } },
            { "name": "left_shoulder", "type": "Mesh", "geometry": { "type": "Sphere", "radius": 0.18 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": -0.5, "y": 1.4, "z": 0 }, "children": [ { "name": "left_arm", "type": "Mesh", "geometry": { "type": "Cylinder", "radiusTop": 0.13, "radiusBottom": 0.13, "height": 1.6 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": -0.8, "z": 0 }, "children": [ { "name": "left_hand", "type": "Mesh", "geometry": { "type": "Sphere", "radius": 0.18 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": -0.8, "z": 0 } } ] } ] },
            { "name": "right_shoulder", "type": "Mesh", "geometry": { "type": "Sphere", "radius": 0.18 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0.5, "y": 1.4, "z": 0 }, "children": [ { "name": "right_arm", "type": "Mesh", "geometry": { "type": "Cylinder", "radiusTop": 0.13, "radiusBottom": 0.13, "height": 1.6 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": -0.8, "z": 0 }, "children": [ { "name": "right_hand", "type": "Mesh", "geometry": { "type": "Sphere", "radius": 0.18 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": -0.8, "z": 0 } } ] } ] },
            { "name": "left_upper_leg", "type": "Mesh", "geometry": { "type": "Cylinder", "radiusTop": 0.18, "radiusBottom": 0.16, "height": 0.9 }, "material": { "type": "Standard", "color": 6780467 }, "position": { "x": -0.25, "y": -0.3, "z": 0 }, "children": [
                { "name": "left_knee", "type": "Mesh", "geometry": { "type": "Sphere", "radius": 0.16 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": -0.45, "z": 0 }, "children": [
                    { "name": "left_lower_leg", "type": "Mesh", "geometry": { "type": "Cylinder", "radiusTop": 0.16, "radiusBottom": 0.15, "height": 0.9 }, "material": { "type": "Standard", "color": 6780467 }, "position": { "x": 0, "y": -0.45, "z": 0 }, "children": [
                        { "name": "left_foot", "type": "Mesh", "geometry": { "type": "Box", "width": 0.36, "height": 0.2, "depth": 0.55 }, "material": { "type": "Standard", "color": 1118481 }, "position": { "x": 0, "y": -0.55, "z": 0.15 } }
                    ]}
                ]}
            ]},
            { "name": "right_upper_leg", "type": "Mesh", "geometry": { "type": "Cylinder", "radiusTop": 0.18, "radiusBottom": 0.16, "height": 0.9 }, "material": { "type": "Standard", "color": 6780467 }, "position": { "x": 0.25, "y": -0.3, "z": 0 }, "children": [
                { "name": "right_knee", "type": "Mesh", "geometry": { "type": "Sphere", "radius": 0.16 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": -0.45, "z": 0 }, "children": [
                    { "name": "right_lower_leg", "type": "Mesh", "geometry": { "type": "Cylinder", "radiusTop": 0.16, "radiusBottom": 0.15, "height": 0.9 }, "material": { "type": "Standard", "color": 6780467 }, "position": { "x": 0, "y": -0.45, "z": 0 }, "children": [
                        { "name": "right_foot", "type": "Mesh", "geometry": { "type": "Box", "width": 0.36, "height": 0.2, "depth": 0.55 }, "material": { "type": "Standard", "color": 1118481 }, "position": { "x": 0, "y": -0.55, "z": 0.15 } }
                    ]}
                ]}
            ]}
        ]
    },
    "adolescente": {
        "objects": [
            {"name": "hips", "type": "Mesh", "geometry": {"type": "Sphere", "radius": 0.163}, "material": {"type": "Standard", "color": 6780467}, "position": {"x": 0, "y": 0.636, "z": 0}, "scale": {"x": 0.6, "y": 0.4, "z": 0.4}},
            {"name": "torso", "type": "Mesh", "geometry": {"type": "Box", "width": 1.043, "height": 1.695, "depth": 0.522}, "material": {"type": "Standard", "color": 15921906}, "position": {"x": 0, "y": 1.043, "z": 0}},
            {"name": "neck", "type": "Mesh", "geometry": {"type": "Cylinder", "radiusTop": 0.235, "radiusBottom": 0.235, "height": 0.261}, "material": {"type": "Standard", "color": 15921906}, "position": {"x": 0, "y": 2.021, "z": 0}},
            {"name": "head", "type": "Mesh", "geometry": {"type": "Sphere", "radius": 0.497}, "material": {"type": "Standard", "color": 15921906}, "position": {"x": 0, "y": 2.648, "z": 0}},
            {"name": "left_shoulder", "type": "Mesh", "geometry": {"type": "Sphere", "radius": 0.235}, "material": {"type": "Standard", "color": 15921906}, "position": {"x": -0.652, "y": 1.826, "z": 0}, "children": [{"name": "left_arm", "type": "Mesh", "geometry": {"type": "Cylinder", "radiusTop": 0.17, "radiusBottom": 0.17, "height": 2.086}, "material": {"type": "Standard", "color": 15921906}, "position": {"x": 0, "y": -1.043, "z": 0}, "children": [{"name": "left_hand", "type": "Mesh", "geometry": {"type": "Sphere", "radius": 0.235}, "material": {"type": "Standard", "color": 15921906}, "position": {"x": 0, "y": -1.043, "z": 0}}]}]},
            {"name": "right_shoulder", "type": "Mesh", "geometry": {"type": "Sphere", "radius": 0.235}, "material": {"type": "Standard", "color": 15921906}, "position": {"x": 0.652, "y": 1.826, "z": 0}, "children": [{"name": "right_arm", "type": "Mesh", "geometry": {"type": "Cylinder", "radiusTop": 0.17, "radiusBottom": 0.17, "height": 2.086}, "material": {"type": "Standard", "color": 15921906}, "position": {"x": 0, "y": -1.043, "z": 0}, "children": [{"name": "right_hand", "type": "Mesh", "geometry": {"type": "Sphere", "radius": 0.235}, "material": {"type": "Standard", "color": 15921906}, "position": {"x": 0, "y": -1.043, "z": 0}}]}]},
            { "name": "left_upper_leg", "type": "Mesh", "geometry": { "type": "Cylinder", "radiusTop": 0.235, "radiusBottom": 0.2, "height": 1.17 }, "material": { "type": "Standard", "color": 6780467 }, "position": { "x": -0.326, "y": -0.2, "z": 0 }, "children": [
                { "name": "left_knee", "type": "Mesh", "geometry": { "type": "Sphere", "radius": 0.2 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": -0.585, "z": 0 }, "children": [
                    { "name": "left_lower_leg", "type": "Mesh", "geometry": { "type": "Cylinder", "radiusTop": 0.2, "radiusBottom": 0.18, "height": 1.17 }, "material": { "type": "Standard", "color": 6780467 }, "position": { "x": 0, "y": -0.585, "z": 0 }, "children": [
                        { "name": "left_foot", "type": "Mesh", "geometry": { "type": "Box", "width": 0.469, "height": 0.261, "depth": 0.717 }, "material": { "type": "Standard", "color": 1118481 }, "position": { "x": 0, "y": -0.7, "z": 0.196 } }
                    ]}
                ]}
            ]},
            { "name": "right_upper_leg", "type": "Mesh", "geometry": { "type": "Cylinder", "radiusTop": 0.235, "radiusBottom": 0.2, "height": 1.17 }, "material": { "type": "Standard", "color": 6780467 }, "position": { "x": 0.326, "y": -0.2, "z": 0 }, "children": [
                { "name": "right_knee", "type": "Mesh", "geometry": { "type": "Sphere", "radius": 0.2 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": -0.585, "z": 0 }, "children": [
                    { "name": "right_lower_leg", "type": "Mesh", "geometry": { "type": "Cylinder", "radiusTop": 0.2, "radiusBottom": 0.18, "height": 1.17 }, "material": { "type": "Standard", "color": 6780467 }, "position": { "x": 0, "y": -0.585, "z": 0 }, "children": [
                        { "name": "right_foot", "type": "Mesh", "geometry": { "type": "Box", "width": 0.469, "height": 0.261, "depth": 0.717 }, "material": { "type": "Standard", "color": 1118481 }, "position": { "x": 0, "y": -0.7, "z": 0.196 } }
                    ]}
                ]}
            ]}
        ]
    },
    "adulto": {
        "objects": [
            { "name": "hips", "type": "Mesh", "geometry": { "type": "Box", "width": 0.896, "height": 0.512, "depth": 0.448 }, "material": { "type": "Standard", "color": 6780467 }, "position": { "x": 0, "y": 1.152, "z": 0 } },
            { "name": "torso", "type": "Mesh", "geometry": { "type": "Box", "width": 1.024, "height": 1.792, "depth": 0.512 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": 2.304, "z": 0 } },
            { "name": "neck", "type": "Mesh", "geometry": { "type": "Cylinder", "radiusTop": 0.23, "radiusBottom": 0.23, "height": 0.32 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": 3.36, "z": 0 } },
            { "name": "head", "type": "Mesh", "geometry": { "type": "Sphere", "radius": 0.6 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": 4.088, "z": 0 } },
            { "name": "left_shoulder", "type": "Mesh", "geometry": { "type": "Sphere", "radius": 0.23 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": -0.64, "y": 3.04, "z": 0 }, "children": [ { "name": "left_upper_arm", "type": "Mesh", "geometry": { "type": "Cylinder", "radiusTop": 0.16, "radiusBottom": 0.141, "height": 1.152 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": -0.576, "z": 0 }, "children": [ { "name": "left_forearm", "type": "Mesh", "geometry": { "type": "Cylinder", "radiusTop": 0.141, "radiusBottom": 0.115, "height": 1.728 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": -0.864, "z": 0 }, "children": [ { "name": "left_hand", "type": "Mesh", "geometry": { "type": "Sphere", "radius": 0.192 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": -0.864, "z": 0 } } ] } ] } ] },
            { "name": "right_shoulder", "type": "Mesh", "geometry": { "type": "Sphere", "radius": 0.23 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0.64, "y": 3.04, "z": 0 }, "children": [ { "name": "right_upper_arm", "type": "Mesh", "geometry": { "type": "Cylinder", "radiusTop": 0.16, "radiusBottom": 0.141, "height": 1.152 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": -0.576, "z": 0 }, "children": [ { "name": "right_forearm", "type": "Mesh", "geometry": { "type": "Cylinder", "radiusTop": 0.141, "radiusBottom": 0.115, "height": 1.728 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": -0.864, "z": 0 }, "children": [ { "name": "right_hand", "type": "Mesh", "geometry": { "type": "Sphere", "radius": 0.192 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": -0.864, "z": 0 } } ] } ] } ] },
            { "name": "left_upper_leg", "type": "Mesh", "geometry": { "type": "Cylinder", "radiusTop": 0.224, "radiusBottom": 0.179, "height": 1.28 }, "material": { "type": "Standard", "color": 6780467 }, "position": { "x": -0.32, "y": 0.256, "z": 0 }, "children": [
                { "name": "left_knee", "type": "Mesh", "geometry": { "type": "Sphere", "radius": 0.179 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": -0.64, "z": 0 }, "children": [
                    { "name": "left_lower_leg", "type": "Mesh", "geometry": { "type": "Cylinder", "radiusTop": 0.179, "radiusBottom": 0.141, "height": 1.28 }, "material": { "type": "Standard", "color": 6780467 }, "position": { "x": 0, "y": -0.64, "z": 0 }, "children": [
                        { "name": "left_foot", "type": "Mesh", "geometry": { "type": "Box", "width": 0.461, "height": 0.256, "depth": 0.704 }, "material": { "type": "Standard", "color": 1118481 }, "position": { "x": 0, "y": -0.672, "z": 0.192 } }
                    ]}
                ]}
            ]},
            { "name": "right_upper_leg", "type": "Mesh", "geometry": { "type": "Cylinder", "radiusTop": 0.224, "radiusBottom": 0.179, "height": 1.28 }, "material": { "type": "Standard", "color": 6780467 }, "position": { "x": 0.32, "y": 0.256, "z": 0 }, "children": [
                { "name": "right_knee", "type": "Mesh", "geometry": { "type": "Sphere", "radius": 0.179 }, "material": { "type": "Standard", "color": 15921906 }, "position": { "x": 0, "y": -0.64, "z": 0 }, "children": [
                    { "name": "right_lower_leg", "type": "Mesh", "geometry": { "type": "Cylinder", "radiusTop": 0.179, "radiusBottom": 0.141, "height": 1.28 }, "material": { "type": "Standard", "color": 6780467 }, "position": { "x": 0, "y": -0.64, "z": 0 }, "children": [
                        { "name": "right_foot", "type": "Mesh", "geometry": { "type": "Box", "width": 0.461, "height": 0.256, "depth": 0.704 }, "material": { "type": "Standard", "color": 1118481 }, "position": { "x": 0, "y": -0.672, "z": 0.192 } }
                    ]}
                ]}
            ]}
        ]
    }
};

// --- DEFINICIONES DE ANIMACIONES (AMPLITUD EN GRADOS) ---
const animations = {
    static: {}, // No aplica ninguna animación
    breathing: {
        torso: {
            behavior: "BreathingObject",
            breathSpeed: 1.0,
            breathAmplitude: 0.03
        }
    },
    walking: {
        left_shoulder: {
            behavior: "ArmSwayingObject",
            swaySpeed: 2.5,
            swayAmplitude: 35, // Amplitud en GRADOS
            phaseOffset: 0
        },
        right_shoulder: {
            behavior: "ArmSwayingObject",
            swaySpeed: 2.5,
            swayAmplitude: 35, // Amplitud en GRADOS
            phaseOffset: Math.PI
        },
        left_upper_leg: {
            behavior: "LegSwayingObject",
            swaySpeed: 2.5,
            swayAmplitude: 25, // Amplitud en GRADOS
            phaseOffset: Math.PI
        },
        right_upper_leg: {
            behavior: "LegSwayingObject",
            swaySpeed: 2.5,
            swayAmplitude: 25, // Amplitud en GRADOS
            phaseOffset: 0
        }
    }
};

// --- FUNCIÓN DE INICIALIZACIÓN PRINCIPAL ---
function initCharacterCreator() {
    if (isCharacterCreatorInitialized) {
        onWindowResize();
        return;
    }
    console.log("Initializing Character Creator 3D Scene...");

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2d3748);
    clock = new THREE.Clock(); // Reloj para las animaciones

    camera = new THREE.PerspectiveCamera(75, sceneContainer.clientWidth / sceneContainer.clientHeight, 0.1, 1000);
    camera.position.set(0, 2.5, 6);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    
    sceneContainer.innerHTML = '';
    sceneContainer.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1.5, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);
    
    const groundPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshStandardMaterial({ color: 0x444444, side: THREE.DoubleSide })
    );
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.receiveShadow = true;
    scene.add(groundPlane);

    loadModelFromJSON(models[modelSelect.value]);
    animate();
    
    // Listeners
    window.addEventListener('resize', onWindowResize);
    modelSelect.addEventListener('change', () => loadModelFromJSON(models[modelSelect.value]));
    generateBtn.addEventListener('click', callGeminiAPI2);
    copyJsonBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(jsonOutput.value);
        copyJsonBtn.textContent = '¡Copiado!';
        setTimeout(() => { copyJsonBtn.textContent = 'Copiar JSON'; }, 2000);
    });
    skinColorInput.addEventListener('input', (event) => applyColor('skin', event.target.value));
    shirtColorInput.addEventListener('input', (event) => applyColor('shirt', event.target.value));
    pantsUpperColorInput.addEventListener('input', (event) => applyColor('pants-upper', event.target.value));
    pantsLowerColorInput.addEventListener('input', (event) => applyColor('pants-lower', event.target.value));
    shoesColorInput.addEventListener('input', (event) => applyColor('shoes', event.target.value));
    addAccessoryBtn.addEventListener('click', addAccessory);
    animationSelect.addEventListener('change', (event) => applyAnimation(event.target.value));

    isCharacterCreatorInitialized = true;
}

// --- LÓGICA DE CARGA DE MODELOS ---
function createObject(data) {
    let object;
    const isGroup = data.type === 'Group' || data.isGroup;
    
    if (isGroup) {
        object = new THREE.Group();
    } else {
        let geometry;
        switch (data.geometry.type) {
            case 'Box': geometry = new THREE.BoxGeometry(data.geometry.width, data.geometry.height, data.geometry.depth); break;
            case 'Cylinder': geometry = new THREE.CylinderGeometry(data.geometry.radiusTop, data.geometry.radiusBottom, data.geometry.height, 32); break;
            case 'Sphere': geometry = new THREE.SphereGeometry(data.geometry.radius, 32, 32); break;
            case 'Torus': geometry = new THREE.TorusGeometry(data.geometry.radius, data.geometry.tube, 16, 100); break;
            case 'Circle': geometry = new THREE.CircleGeometry(data.geometry.radius, 32); break;
            default: geometry = new THREE.BoxGeometry(1, 1, 1);
        }
        const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(data.material.color) });
        object = new THREE.Mesh(geometry, material);
        object.castShadow = true;
        object.receiveShadow = true;
    }

    object.name = data.name;
    if(data.position) object.position.set(data.position.x, data.position.y, data.position.z);
    if(data.rotation) object.rotation.set(THREE.MathUtils.degToRad(data.rotation.x || 0), THREE.MathUtils.degToRad(data.rotation.y || 0), THREE.MathUtils.degToRad(data.rotation.z || 0));
    if(data.scale) object.scale.set(data.scale.x, data.scale.y, data.scale.z);
    if(data.userData) object.userData = JSON.parse(JSON.stringify(data.userData));

    if (data.children && data.children.length > 0) {
        data.children.forEach(childData => {
            const childObject = createObject(childData);
            object.add(childObject);
        });
    }
    return object;
}

function loadModelFromJSON(modelData) {
    if (characterGroup) scene.remove(characterGroup);
    equippedAccessoriesContainer.innerHTML = ''; 

    currentModelJSON = JSON.parse(JSON.stringify(modelData));
    jsonOutput.value = JSON.stringify(modelData, null, 2);

    characterGroup = new THREE.Group();
    characterGroup.name = "character";

    if (modelData.objects && modelData.objects.length > 0) {
        modelData.objects.forEach(objData => characterGroup.add(createObject(objData)));
    }
    
    const bbox = new THREE.Box3().setFromObject(characterGroup);
    characterGroup.position.y = -bbox.min.y;
    scene.add(characterGroup);
    
    const modelHeight = bbox.max.y - bbox.min.y;
    controls.target.set(0, modelHeight / 2, 0);
    
    let animationFound = 'static';
    characterGroup.traverse(obj => {
        const option = Array.from(accessorySelect.options).find(opt => opt.value === obj.name);
        if (option) updateAccessoryUI(obj.name, option.text);
        if (obj.name === 'zapatilla') updateAccessoryUI('zapatillas', 'Zapatillas');
        if (obj.userData && obj.userData.behavior) {
            if (obj.userData.behavior.includes("Swaying")) animationFound = 'walking';
            else if (obj.userData.behavior.includes("Breathing")) animationFound = 'breathing';
        }
    });
    animationSelect.value = animationFound;
}

// --- LÓGICA DE ANIMACIÓN (CORREGIDA) ---
function applyAnimation(animationName) {
    if (!characterGroup) return;

    const animationData = animations[animationName];

    characterGroup.traverse((object) => {
        if (object.userData && object.userData.behavior) {
            delete object.userData.behavior;
            if(object.userData.initialScale) object.scale.copy(object.userData.initialScale);
            if(object.userData.initialRotation) object.rotation.copy(object.userData.initialRotation);
        }
    });

    for (const partName in animationData) {
        const objectToAnimate = characterGroup.getObjectByName(partName, true);
        if (objectToAnimate) {
            if (!objectToAnimate.userData.initialScale) {
                objectToAnimate.userData.initialScale = objectToAnimate.scale.clone();
            }
             if (!objectToAnimate.userData.initialRotation) {
                objectToAnimate.userData.initialRotation = objectToAnimate.rotation.clone();
            }
            Object.assign(objectToAnimate.userData, animationData[partName]);
        }
    }
    updateJsonFromScene();
}

function updateAnimations(time) {
    if (!characterGroup) return;
    characterGroup.traverse((object) => {
        if (object.userData && object.userData.behavior) {
            switch (object.userData.behavior) {
                case "BreathingObject":
                    const { breathSpeed = 1, breathAmplitude = 0.05 } = object.userData;
                    const scaleFactor = 1 + Math.sin(time * breathSpeed) * breathAmplitude;
                    object.scale.set(object.userData.initialScale.x, object.userData.initialScale.y * scaleFactor, object.userData.initialScale.z);
                    break;
                case "ArmSwayingObject":
                case "LegSwayingObject":
                    // La amplitud ahora viene en grados desde el JSON
                    const { swaySpeed = 1, swayAmplitude = 30, phaseOffset = 0 } = object.userData;
                    // Se convierte la amplitud de grados a radianes para el cálculo matemático
                    const swayAngleRad = Math.sin(time * swaySpeed + phaseOffset) * THREE.MathUtils.degToRad(swayAmplitude);
                    object.rotation.x = object.userData.initialRotation.x + swayAngleRad;
                    break;
            }
        }
    });
}


// --- LÓGICA DE EDICIÓN MANUAL Y ACCESORIOS ---
function applyColor(partType, hexColor) {
    if (!characterGroup) return;
    const color = new THREE.Color(hexColor);
    const skinParts = ['head', 'neck', 'shoulder', 'arm', 'hand', 'forearm', 'knee'];
    const shirtParts = ['torso', 'upper_arm'];
    const pantsUpperParts = ['hips', 'upper_leg'];
    const pantsLowerParts = ['lower_leg'];
    const shoesParts = ['foot', 'zapatilla'];

    let targetParts;
    switch(partType) {
        case 'skin': targetParts = skinParts; break;
        case 'shirt': targetParts = shirtParts; break;
        case 'pants-upper': targetParts = pantsUpperParts; break;
        case 'pants-lower': targetParts = pantsLowerParts; break;
        case 'shoes': targetParts = shoesParts; break;
        default: targetParts = [];
    }

    characterGroup.traverse((object) => {
        if (object.isMesh) {
            const objectName = object.name.toLowerCase();
            if (targetParts.some(partName => objectName.includes(partName))) {
                if (!object.userData.originalMaterial) {
                    object.userData.originalMaterial = object.material;
                    object.material = object.material.clone();
                }
                object.material.color.set(color);
            }
        }
    });
    updateJsonFromScene();
}

function addAccessory() {
    const accessoryType = accessorySelect.value;
    if (!characterGroup || characterGroup.getObjectByName(accessoryType, true)) return;

    switch (accessoryType) {
        case 'gorra_plana': case 'gorra_beisbol': {
            const parent = characterGroup.getObjectByName('head', true);
            if (!parent) return;
            const headBox = new THREE.Box3().setFromObject(parent);
            const headRadius = (headBox.max.x - headBox.min.x) / 2;
            const accessory = new THREE.Group();
            accessory.name = accessoryType;
            const cap = new THREE.Mesh(new THREE.SphereGeometry(headRadius * 1.05, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1a202c }));
            const brim = new THREE.Mesh(new THREE.BoxGeometry(headRadius * 1.6, 0.05, headRadius), new THREE.MeshStandardMaterial({ color: 0x1a202c }));
            brim.position.set(0, headRadius * 0.2, headRadius * 0.8);
            if (accessoryType === 'gorra_beisbol') brim.rotation.x = -0.2;
            accessory.add(cap, brim);
            accessory.position.y = headRadius * 0.8;
            parent.add(accessory);
            break;
        }
        case 'gafas': {
            const parent = characterGroup.getObjectByName('head', true);
            if (!parent) return;
            const headBox = new THREE.Box3().setFromObject(parent);
            const headSize = { x: headBox.max.x - headBox.min.x, z: headBox.max.z - headBox.min.z };
            const accessory = new THREE.Group();
            accessory.name = accessoryType;
            const lensMaterial = new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.6 });
            const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
            const leftLens = new THREE.Mesh(new THREE.CircleGeometry(headSize.x * 0.2, 32), lensMaterial);
            leftLens.position.x = -headSize.x * 0.25;
            const rightLens = new THREE.Mesh(new THREE.CircleGeometry(headSize.x * 0.2, 32), lensMaterial);
            rightLens.position.x = headSize.x * 0.25;
            const bridge = new THREE.Mesh(new THREE.BoxGeometry(headSize.x * 0.1, 0.03, 0.03), frameMaterial);
            accessory.add(leftLens, rightLens, bridge);
            accessory.position.set(0, 0.05, headSize.z / 2);
            parent.add(accessory);
            break;
        }
        case 'collar': {
            const parent = characterGroup.getObjectByName('neck', true);
            if (!parent) return;
            const neckBox = new THREE.Box3().setFromObject(parent);
            const neckRadius = (neckBox.max.x - neckBox.min.x) / 2;
            const accessory = new THREE.Mesh(new THREE.TorusGeometry(neckRadius * 1.5, 0.05, 16, 100), new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 }));
            accessory.name = accessoryType;
            accessory.rotation.x = Math.PI / 2;
            parent.add(accessory);
            break;
        }
        case 'zapatillas': {
            ['left_foot', 'right_foot'].forEach(footName => {
                const foot = characterGroup.getObjectByName(footName, true);
                if (foot && !foot.getObjectByName('zapatilla')) {
                    const footBox = new THREE.Box3().setFromObject(foot);
                    const footSize = { x: footBox.max.x - footBox.min.x, y: footBox.max.y - footBox.min.y, z: footBox.max.z - footBox.min.z };
                    const shoe = new THREE.Group();
                    shoe.name = 'zapatilla';
                    const sole = new THREE.Mesh(new THREE.BoxGeometry(footSize.x * 1.1, footSize.y * 0.5, footSize.z * 1.1), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
                    sole.position.y = -footSize.y * 0.25;
                    const body = new THREE.Mesh(new THREE.BoxGeometry(footSize.x, footSize.y * 1.5, footSize.z * 0.9), new THREE.MeshStandardMaterial({ color: 0xFAFAFA }));
                    body.position.y = footSize.y * 0.5;
                    shoe.add(sole, body);
                    foot.add(shoe);
                }
            });
            break;
        }
    }
    updateJsonFromScene();
    updateAccessoryUI(accessoryType, accessorySelect.options[accessorySelect.selectedIndex].text);
}

function removeAccessory(accessoryName) {
    if (!characterGroup) return;
    if (accessoryName === 'zapatillas') {
        ['left_foot', 'right_foot'].forEach(footName => {
            const shoe = characterGroup.getObjectByName('zapatilla', true);
            if (shoe) shoe.parent.remove(shoe);
        });
    } else {
        const accessory = characterGroup.getObjectByName(accessoryName, true);
        if (accessory) accessory.parent.remove(accessory);
    }
    updateJsonFromScene();
    const uiElement = document.getElementById(`accessory-ui-${accessoryName}`);
    if (uiElement) uiElement.remove();
}

function updateAccessoryUI(id, name) {
    if (document.getElementById(`accessory-ui-${id}`)) return;
    const div = document.createElement('div');
    div.id = `accessory-ui-${id}`;
    div.className = 'flex items-center justify-between bg-gray-700 p-1.5 rounded-md text-sm';
    const span = document.createElement('span');
    span.textContent = name;
    const button = document.createElement('button');
    button.textContent = 'x';
    button.className = 'bg-red-600 hover:bg-red-700 text-white font-bold w-5 h-5 rounded-full flex items-center justify-center text-xs';
    button.onclick = () => removeAccessory(id);
    div.appendChild(span);
    div.appendChild(button);
    equippedAccessoriesContainer.appendChild(div);
}

// --- LÓGICA DE ACTUALIZACIÓN DE JSON ---
function updateJsonFromScene() {
    if (!characterGroup) return;

    function objectToJSON(obj) {
        const isGroup = obj.isGroup;
        const data = {
            name: obj.name,
            type: isGroup ? 'Group' : 'Mesh',
            position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
            rotation: { x: THREE.MathUtils.radToDeg(obj.rotation.x), y: THREE.MathUtils.radToDeg(obj.rotation.y), z: THREE.MathUtils.radToDeg(obj.rotation.z) },
            scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
        };
        
        if (obj.userData && Object.keys(obj.userData).length > 0) {
            const cleanUserData = {};
            for(const key in obj.userData){
                if(key !== 'initialScale' && key !== 'initialRotation' && key !== 'originalMaterial'){
                    cleanUserData[key] = obj.userData[key];
                }
            }
            if(Object.keys(cleanUserData).length > 0) {
                 data.userData = cleanUserData;
            }
        }
        if (!isGroup) {
            data.material = { type: 'Standard', color: obj.material.color.getHex() };
            const geomParams = obj.geometry.parameters;
            switch (obj.geometry.type) {
                case 'BoxGeometry': data.geometry = { type: 'Box', width: geomParams.width, height: geomParams.height, depth: geomParams.depth }; break;
                case 'CylinderGeometry': data.geometry = { type: 'Cylinder', radiusTop: geomParams.radiusTop, radiusBottom: geomParams.radiusBottom, height: geomParams.height }; break;
                case 'SphereGeometry': data.geometry = { type: 'Sphere', radius: geomParams.radius }; break;
                case 'TorusGeometry': data.geometry = { type: 'Torus', radius: geomParams.radius, tube: geomParams.tube }; break;
                case 'CircleGeometry': data.geometry = { type: 'Circle', radius: geomParams.radius }; break;
            }
        }
        if (obj.children.length > 0) {
            data.children = obj.children.filter(c => c.isMesh || c.isGroup).map(objectToJSON);
        }
        return data;
    }
    currentModelJSON = { objects: characterGroup.children.map(objectToJSON) };
    jsonOutput.value = JSON.stringify(currentModelJSON, null, 2);
}




// --- LÓGICA DE LA API DE GEMINI ---
async function callGeminiAPI2() {
 const apiKey = localStorage.getItem('silenosGoogleApiKey'); 
     
    const userPrompt = promptInput.value;

    if (!apiKey) {
        alert("Por favor, introduce tu Google API Key.");
        return;
    }
    if (!userPrompt) {
        alert("Por favor, describe las modificaciones que quieres hacer.");
        return;
    }

    setLoading(true);

    const systemPrompt = `Eres un asistente experto en la edición de modelos 3D definidos en formato JSON para Three.js. Tu tarea es recibir un objeto JSON que representa un personaje y una descripción en texto de las modificaciones deseadas. Debes devolver ÚNICAMENTE el objeto JSON modificado, sin explicaciones, texto adicional, ni formato markdown. Mantén la estructura original del JSON. Si necesitas añadir una nueva parte (ej. "un sombrero"), asegúrate de que tenga las propiedades necesarias (name, type, geometry, material, position) y añádela al array 'objects' o como 'child' de un objeto existente (ej. la cabeza). Los colores deben ser valores numéricos enteros.

Aquí está el JSON a modificar:
${JSON.stringify(currentModelJSON, null, 2)}

Y aquí está la modificación solicitada por el usuario:`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
                }],
                generationConfig: {
                    responseMimeType: "application/json",
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error de la API: ${response.status} - ${errorData.error.message}`);
        }

        const result = await response.json();
        const jsonText = result.candidates[0].content.parts[0].text;
        
        const cleanedJsonText = jsonText.replace(/^```json\s*|```$/g, '').trim();

        const newModelJSON = JSON.parse(cleanedJsonText);
        loadModelFromJSON(newModelJSON);

    } catch (error) {
        console.error("Error al llamar a la API de Gemini:", error);
        alert("Hubo un error al generar el modelo. Revisa la consola para más detalles.\n\n" + error.message);
    } finally {
        setLoading(false);
    }
}
        
function setLoading(isLoading) {
    if (isLoading) {
        generateBtn.disabled = true;
        generateBtn.classList.add('opacity-50', 'cursor-not-allowed');
        loader.classList.remove('hidden');
    } else {
        generateBtn.disabled = false;
        generateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        loader.classList.add('hidden');
    }
}

// --- FUNCIONES DE RENDERIZADO Y REDIMENSIONADO ---
function onWindowResize() {
    if (!isCharacterCreatorInitialized) return;
    camera.aspect = sceneContainer.clientWidth / sceneContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();
    updateAnimations(elapsedTime); // Actualiza las animaciones en cada frame
    controls.update();
    renderer.render(scene, camera);
}

// --- OBSERVADOR DE VISIBILIDAD PARA INICIAR LA APP ---
const creatorPanel = document.getElementById('generadorpersonajes');
const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
        if (mutation.attributeName === 'style') {
            const isVisible = creatorPanel.style.display !== 'none';
            if (isVisible) {
                initCharacterCreator();
            }
        }
    }
});

observer.observe(creatorPanel, { attributes:  true });
