// auth-drive.js

// Sustituye esto con el Client ID de tu proyecto en Google Cloud Console.
const GOOGLE_CLIENT_ID = '438997287133-lpr4acdlv3cjikfki54fc2sj60t75n3i.apps.googleusercontent.com'; 
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

let tokenClient;
let gapi_access_token = null;

/**
 * Se llama cuando la librería de Google Identity Services (GSI) ha cargado.
 */
// En tu archivo auth-drive.js

function gsiClientLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: (tokenResponse) => {
            gapi_access_token = tokenResponse.access_token;
            console.log("Token de Drive obtenido con éxito.");
        },
    });

    // --- LÍNEAS NUEVAS ---
    // Una vez que el cliente de Google está listo, habilitamos los botones.
    try {
        document.getElementById('bguardardrive').disabled = false;
        document.getElementById('bcargardrive').disabled = false;
        console.log("Cliente de Google Drive listo. Botones habilitados.");
    } catch (e) {
        console.error("No se encontraron los botones de Drive para habilitarlos.", e);
    }
}

/**
 * Función principal para asegurar la autorización.
 * Si no tenemos token, lo solicita. Si lo tenemos, ejecuta la acción (callback).
 * @param {function} callback La función a ejecutar tras tener autorización (ej. _internal_saveToDrive)
 */
// En tu archivo auth-drive.js

// En tu archivo auth-drive.js

async function ensureDriveAuth(callback) {
    console.log("Paso 1: Se ha llamado a ensureDriveAuth."); // <-- MENSAJE AÑADIDO

    if (!tokenClient) {
        alert("El servicio de Google Drive aún no está listo. Por favor, espera un momento y vuelve a intentarlo.");
        console.error("ERROR: tokenClient no está inicializado.");
        return;
    }

    console.log("Paso 2: tokenClient existe. Verificando si ya tenemos un token de acceso..."); // <-- MENSAJE AÑADIDO

    if (gapi_access_token) {
        console.log("Paso 3: Ya teníamos un token. Ejecutando la función directamente."); // <-- MENSAJE AÑADIDO
        callback();
        return;
    }

    console.log("Paso 4: No teníamos token. Preparando la solicitud de uno nuevo..."); // <-- MENSAJE AÑADIDO

    tokenClient.callback = (tokenResponse) => {
        if (tokenResponse.error) {
            console.error("ERROR en la autorización:", tokenResponse.error);
            alert("No se pudo obtener el permiso para acceder a Google Drive.");
            return;
        }
        gapi_access_token = tokenResponse.access_token;
        console.log("Paso 6: ¡Autorización concedida! Ejecutando la función pendiente."); // <-- MENSAJE AÑADIDO
        callback();
    };

    console.log("Paso 5: Solicitando el token de acceso. La ventana emergente debería aparecer ahora."); // <-- MENSAJE AÑADIDO
    tokenClient.requestAccessToken();
}