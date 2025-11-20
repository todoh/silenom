// Archivo: chat.js

// Variable global para almacenar la información del archivo adjunto
let fileData = null;

// Tipos MIME que trataremos como texto plano
const textMimeTypes = [
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'image/svg+xml',
    'text/markdown'
];

// --- Event Listeners para manejar el archivo ---

// Se activa cuando el usuario selecciona un archivo
document.getElementById('file-input').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        
        // Comprobar si es un tipo de archivo de texto
        if (textMimeTypes.includes(file.type)) {
            reader.onload = function(e) {
                fileData = {
                    isText: true,
                    name: file.name,
                    content: e.target.result
                };
                // Mostrar nombre del archivo
                document.getElementById('file-name-preview').textContent = `Archivo: ${file.name}`;
                document.getElementById('file-preview-container').style.display = 'block';
            };
            reader.readAsText(file); // Leer como texto
        } else {
            // Para otros archivos (imágenes, PDF, etc.), usar base64
            reader.onload = function(e) {
                fileData = {
                    isText: false,
                    name: file.name,
                    mimeType: file.type,
                    data: e.target.result.split(',')[1] // Quitamos el prefijo
                };
                // Mostrar nombre del archivo
                document.getElementById('file-name-preview').textContent = `Archivo: ${file.name}`;
                document.getElementById('file-preview-container').style.display = 'block';
            };
            reader.readAsDataURL(file); // Leer como URL de datos (base64)
        }
    }
});

// Se activa al hacer clic en el botón "Quitar archivo"
//document.getElementById('remove-file-btn').addEventListener('click', function() {
  //  fileData = null;
    //document.getElementById('file-input').value = ''; // Limpiar el input
   // document.getElementById('file-preview-container').style.display = 'none';
   // document.getElementById('file-name-preview').textContent = '';
//});


// --- Función principal para llamar a la API de Gemini ---

// Archivo: chat.js (reemplaza la función llamarAGemini con esta)

async function llamarAGemini() {
    // const apiKey = 'TU_API_KEY'; 
    let prompt = document.getElementById('prompt').value;
    const selectedModel = document.getElementById('modelSelector').value;
    const responseContainer = document.getElementById('response-container');
    const submitBtn = document.getElementById('submitBtn');
    
    // --- Validaciones (sin cambios) ---
    if (fileData && !fileData.isText && !selectedModel.includes('1.5')) {
        responseContainer.innerText = "Para analizar este tipo de archivo (ej: imagen, PDF), selecciona un modelo multimodal como Gemini 1.5 Pro o Flash.";
        return;
    }
    if (!prompt && !fileData) {
        responseContainer.innerText = "Por favor, escribe una pregunta o adjunta un archivo.";
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = "Pensando...";
    responseContainer.innerText = "Procesando...";

    const apiURL = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

    // --- LÓGICA CORREGIDA PARA CONSTRUIR LA PETICIÓN ---
    let parts = [];

    if (fileData) {
        if (fileData.isText) {
            // 1. Para archivos de texto, se combina todo en un solo bloque de texto.
            const fullPrompt = `Analiza el siguiente contenido del archivo "${fileData.name}" y luego responde la pregunta del usuario.\n\n--- CONTENIDO DEL ARCHIVO ---\n${fileData.content}\n\n--- PREGUNTA ---\n${prompt}`;
            parts.push({ text: fullPrompt });
        } else {
            // 2. Para imágenes y otros archivos, se añade el texto PRIMERO.
            parts.push({ text: prompt });
            // Y LUEGO se añade el archivo.
            parts.push({
                inline_data: {
                    mime_type: fileData.mimeType,
                    data: fileData.data
                }
            });
        }
    } else {
        // 3. Si no hay archivo, solo se envía el texto.
        parts.push({ text: prompt });
    }
    
    // --- Llamada a la API (sin cambios en el resto) ---
    try {
        const response = await fetch(apiURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: parts // 'parts' ya está construido correctamente para todos los casos
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error ${response.status}: ${errorData.error.message}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
            const textoRespuesta = data.candidates[0].content.parts[0].text;
            responseContainer.innerText = textoRespuesta;
        } else {
            throw new Error("La respuesta de la API no tiene el formato esperado o está vacía.");
        }
    } catch (error) {
        console.error('Error al llamar a la API:', error);
        responseContainer.innerText = `Ha ocurrido un error: ${error.message}`;
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Enviar";
    }
}