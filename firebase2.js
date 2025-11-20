// =================================================================
// firebase2.js - Lógica de Autenticación Unificada
// Gestiona el login con Firebase y la autorización para Google Drive
// =================================================================
 
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
 import {
    getFirestore,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
 
const firebaseConfig = {
  apiKey: "AIzaSyAfK_AOq-Pc2bzgXEzIEZ1ESWvnhMJUvwI",
  authDomain: "enraya-51670.firebaseapp.com",
  databaseURL: "https://enraya-51670-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "enraya-51670",
  storageBucket: "enraya-51670.firebasestorage.app",
  messagingSenderId: "103343380727",
  appId: "1:103343380727:web:b2fa02aee03c9506915bf2",
  measurementId: "G-2G31LLJY1T"
};

// El permiso (scope) que necesitamos para que tu app pueda usar la API de Google Drive.
const REQUIRED_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';


// --- 2. INICIALIZACIÓN DE FIREBASE Y GOOGLE ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Ya puedes usar la base de datos
const googleProvider = new GoogleAuthProvider();

// ¡¡ESTA ES LA CLAVE PARA DRIVE!!
// Añadimos el permiso de Drive al proveedor de Google.
// Cuando el usuario inicie sesión, Google le pedirá permiso para que tu app acceda a Drive.
googleProvider.addScope(REQUIRED_DRIVE_SCOPE);
let resolveGapiClientReady;
const gapiClientReadyPromise = new Promise(resolve => {
    resolveGapiClientReady = resolve;
});

console.log("Firebase y el proveedor de Google han sido inicializados.");
console.log("Firebase y el proveedor de Google han sido inicializados.");


// --- 3. MANEJO DE LA INTERFAZ DE USUARIO (UI) ---

// Referencias a los botones y elementos del DOM
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfoDiv = document.getElementById('user-info');
const userPicImg = document.getElementById('user-pic');
const userNameSpan = document.getElementById('user-name');
const cargarDriveBtn = document.getElementById('bcargardrive');
const guardarDriveBtn = document.getElementById('bguardardrive');
    

/**
 * Actualiza la UI para mostrar el estado de login correcto.
 * @param {object|null} user - El objeto de usuario de Firebase, o null si no hay sesión.
 */
function updateUI(user) {
    if (user) {
        // Usuario logueado
  userInfoDiv.style.display = 'flex';
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'flex';

        userPicImg.src = user.photoURL;
        userNameSpan.textContent = user.displayName;
const barra = document.getElementById('barra2');
  barra.style.display = 'flex';
        // Habilitamos los botones de Drive
        if (cargarDriveBtn) cargarDriveBtn.disabled = false;
        if (guardarDriveBtn) guardarDriveBtn.disabled = false;
    } else {
        // Usuario no logueado
         userInfoDiv.style.display = 'none';

        loginBtn.style.display = 'flex';
        logoutBtn.style.display = 'none';

        userPicImg.src = "";
        userNameSpan.textContent = "";

        // Deshabilitamos los botones de Drive
        if (cargarDriveBtn) cargarDriveBtn.disabled = true;
        if (guardarDriveBtn) guardarDriveBtn.disabled = true;
    }
}


// --- 4. LÓGICA DE AUTENTICACIÓN ---

/**
 * Inicia el proceso de login con el pop-up de Google.
 */
/**
 * Inicia el proceso de login con el pop-up de Google.
 * VERSIÓN CORREGIDA con async/await para esperar a GAPI.
 */
async function signInWithGoogle() { // <--- AÑADIMOS 'async'
    try {
        const result = await signInWithPopup(auth, googleProvider);
        // El login fue exitoso.
        console.log("Login con Firebase exitoso para:", result.user.displayName);

        // Obtenemos las credenciales.
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential.accessToken;

        if (accessToken) {
            console.log("¡Token de acceso para Google Drive obtenido!");

            // ▼▼▼ LA MAGIA ESTÁ AQUÍ ▼▼▼
            // Esperamos a que la promesa de GAPI se complete.
            console.log("Esperando a que el cliente GAPI esté listo...");
            await gapiClientReadyPromise;
            console.log("¡GAPI está listo! Actualizando el token.");

            // Ahora que estamos seguros de que gapi.client existe, lo usamos.
            gapi.client.setToken({ access_token: accessToken });
            console.log("Token de GAPI actualizado. ¡Listo para usar la API de Drive!");
        }

    } catch (error) {
        // Manejo de errores mejorado
        console.error("Error durante el inicio de sesión con Google:", error);
        if (error.code !== 'auth/popup-closed-by-user') {
            alert(`Error al iniciar sesión: ${error.message}`);
        }
    }
}

/**
 * Cierra la sesión del usuario en Firebase y limpia el token de Drive.
 */
function signOutUser() {
    signOut(auth).then(() => {
        console.log("El usuario ha cerrado sesión.");
        // Limpiamos el token de GAPI para que no se puedan hacer más llamadas a Drive.
        if (window.gapi && window.gapi.client) {
            gapi.client.setToken(null);
        }
    }).catch((error) => {
        console.error("Error al cerrar sesión:", error);
    });
}


// --- 5. OYENTE PRINCIPAL DE SESIÓN Y CONEXIONES CON HTML ---

// onAuthStateChanged es el corazón de Firebase Auth.
// Se ejecuta automáticamente cuando un usuario inicia o cierra sesión.
onAuthStateChanged(auth, (user) => {
    updateUI(user); // Actualizamos la UI en cualquier cambio de estado.
});

// Asignamos nuestras funciones a los clics de los botones.
loginBtn.addEventListener('click', signInWithGoogle);
logoutBtn.addEventListener('click', signOutUser);


// --- 6. INICIALIZACIÓN DE GAPI (Solo para la API de Drive) ---

/**
 * Esta función se hace global para que el `onload` del script de GAPI en el HTML pueda llamarla.
 */
window.gapiLoadedCallback = function() {
    gapi.load('client', () => {
        gapi.client.init({
            // El "discovery document" le dice a la librería cómo hablar con la API de Drive v3.
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"]
        }).then(() => {
            console.log("Cliente GAPI para Drive inicializado y listo.");
                        resolveGapiClientReady(); // <-- AÑADE ESTA LÍNEA AQUÍ

        }).catch(err => {
            console.error("Error inicializando el cliente GAPI:", err);
        });
    });
};


 

 // =============================================================
// LÓGICA DE ACCESO Y ESTADO DE SUSCRIPCIÓN
// =============================================================

let e_vitalicio = 0;
let e_suscrito = 0;
window.e_vitalicio = e_vitalicio;
window.e_suscrito = e_suscrito;

async function comprobacion() {
    const user = auth.currentUser;
    if (!user) {
        window.e_vitalicio = 0;
        window.e_suscrito = 0;
        return;
    }
    try {
        const idTokenResult = await user.getIdTokenResult(true);
        const tieneAccesoVitalicio = idTokenResult.claims.accesoVitalicio === true;
        e_vitalicio = tieneAccesoVitalicio ? 1 : 0;

        const subscriptionsRef = collection(db, 'customers', user.uid, 'subscriptions');
        const q = query(subscriptionsRef, where("status", "==", "active"));
        const querySnapshot = await getDocs(q);
        const tieneSuscripcionActiva = !querySnapshot.empty;
        e_suscrito = tieneSuscripcionActiva ? 1 : 0;

        window.e_vitalicio = e_vitalicio;
        window.e_suscrito = e_suscrito;
        console.log(`Comprobación finalizada -> Vitalicio: ${e_vitalicio}, Suscrito: ${e_suscrito}`);
    } catch (error) {
        console.error("Error durante la comprobación de acceso:", error);
        window.e_vitalicio = 0;
        window.e_suscrito = 0;
    }
}
window.comprobacion = comprobacion;


function gestionarAccesoPremiumUI() {
    const vipp = document.getElementById('membresia');
    const suscritop = document.getElementById('suscrito'); // Asumimos que quieres mostrar esto también

    if (window.e_vitalicio === 1) {
        // Si tiene acceso vitalicio, tiene acceso a todo.
        console.log("UI: El usuario tiene acceso vitalicio. Mostrando todo el contenido premium.");
        if (vipp) vipp.style.display = 'flex';
        if (suscritop) suscritop.style.display = 'flex'; // Muestra también este elemento
    } else {
        // Si no, no tiene acceso a nada.
        console.log("UI: Ocultando todo el contenido premium.");
        if (vipp) vipp.style.display = 'none';
        if (suscritop) suscritop.style.display = 'none';
    }
}

// --- Oyente Principal de Sesión (UNIFICADO Y CORREGIDO) ---
onAuthStateChanged(auth, async (user) => {
    // 1. Siempre actualizamos la interfaz básica (botones de login/logout, etc.)
    updateUI(user);

    if (user) {
        // 2. Si hay usuario, esperamos a que la comprobación termine
        console.log("Usuario detectado. Realizando comprobación de acceso...");
        await comprobacion();
        
        // 3. Con los datos ya calculados, actualizamos la UI del contenido premium
        gestionarAccesoPremiumUI();

    } else {
        // Si no hay usuario, reseteamos todo
        console.log("No hay usuario. Acceso por defecto a 0.");
        window.e_vitalicio = 0;
        window.e_suscrito = 0;
        gestionarAccesoPremiumUI(); // Oculta los elementos premium
    }
});