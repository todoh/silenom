/* ===================================
GESTIÓN DE ENTRADA/SALIDA (GUARDAR/CARGAR)
Guardado en carpeta con imágenes separadas e incremental
=================================== */

/* Constantes y estado */
const PROJECT_JSON_NAME = 'proyecto.json';
// --- MODIFICADO: Definimos todas las carpetas de Assets ---
const ASSETS_DIR_NAME = 'Assets';
const DATA_SUBDIR_NAME = 'Datos'; // Se mantiene como fallback
const CAPITULOS_DIR_NAME = 'Capitulos';
const ESCENAS_DIR_NAME = 'Escenas';
const PERSONAJES_DIR_NAME = 'Personajes';
const MOMENTOS_DIR_NAME = 'Momentos';
const COMPOSITOR_DIR_NAME = 'Compositor';

let projectRootHandle = null; // FileSystemDirectoryHandle de la carpeta del proyecto
let assetsDirHandle = null; // Subcarpeta Assets

// --- AÑADIDO: Handles para todas las subcarpetas ---
let datosDirHandle = null; // Handle para 'Datos' (fallback)
let capitulosDirHandle = null;
let escenasDirHandle = null;
let personajesDirHandle = null;
let momentosDirHandle = null;
let compositorDirHandle = null;

// --- AÑADIDO: Mapa de handles para carga fácil ---
let subDirHandles = {};

let manifestImagenes = {}; // { hash: { nombre, mime, bytes } }
let ultimoTituloProyecto = 'silenos_project'; // respaldo si no hay título

/* Detección de capacidades */
const supportsFSAccess = typeof window.showDirectoryPicker === 'function'; // Progressive enhancement

/* Utilidades */
function isDataUrl(str) {
    return typeof str === 'string' && str.startsWith('data:image');
}

/* dataURL -> Blob */
async function dataURLToBlob(dataURL) {
    const arr = dataURL.split(',');
    const header = arr[0];
    const b64 = arr[1] || '';
    const mime = header.substring(header.indexOf(':') + 1, header.indexOf(';'));
    const bin = atob(b64);
    const len = bin.length;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
    return new Blob([u8], {
        type: mime
    });
}

/* SHA-1 del Blob (para nombres estables) */
async function sha1(blob) {
    const buf = await blob.arrayBuffer();
    const hashBuf = await crypto.subtle.digest('SHA-1', buf);
    const bytes = new Uint8Array(hashBuf);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* Obtener extensión a partir de MIME */
function extFromMime(mime) {
    if (mime === 'image/png') return 'png';
    if (mime === 'image/jpeg') return 'jpg';
    if (mime === 'image/gif') return 'gif';
    if (mime === 'image/webp') return 'webp';
    return 'png'; // por defecto png
}

/* Escribir archivo (File System Access) */
async function writeFile(dirHandle, fileName, blob) {
    const fileHandle = await dirHandle.getFileHandle(fileName, {
        create: true
    });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
}

/* Comprobar existencia de archivo (File System Access) */
async function fileExists(dirHandle, fileName) {
    try {
        await dirHandle.getFileHandle(fileName, {
            create: false
        });
        return true;
    } catch {
        return false;
    }
}

/* Cargar y guardar referencia del handle en IndexedDB (serialización de handles) */
async function saveDirectoryHandle(handle) {
    if (!('storage' in navigator) || !('persist' in navigator.storage)) return; // best effort
    try {
        const granted = await handle.requestPermission({
            mode: 'readwrite'
        });
        if (granted !== 'granted') return;
        localStorage.setItem('projectDirHandle', 'granted'); // marcador
        window._projectDirHandle = handle; // mantener en memoria
    } catch {}
}

async function restoreDirectoryHandle() {
    if (!supportsFSAccess) return null;
    try {
        return window._projectDirHandle || null;
    } catch {
        return null;
    }
}

/* Selección de carpeta */
async function selectProjectFolder() {
    if (!supportsFSAccess) {
        alert('Este navegador no permite escribir directamente en carpetas. Se usará un guardado alternativo (descarga de JSON). Para guardado incremental en carpeta, use un navegador con soporte de File System Access.');
        return null;
    }
    const handle = await window.showDirectoryPicker({
        mode: 'readwrite'
    });
    await saveDirectoryHandle(handle);
    return handle;
}

/* --- MODIFICADA: Esta función ahora crea Assets y TODAS las subcarpetas --- */
/* Asegurar carpeta del proyecto y subcarpetas de Assets */
async function ensureProjectFolder() {
    if (!projectRootHandle) {
        projectRootHandle = await restoreDirectoryHandle();
    }
    if (!projectRootHandle) {
        projectRootHandle = await selectProjectFolder();
    }
    if (!projectRootHandle) return false;

    // Crear/Obtener subcarpeta principal 'Assets'
    assetsDirHandle = await projectRootHandle.getDirectoryHandle(ASSETS_DIR_NAME, {
        create: true
    });

    // --- AÑADIDO: Crear todas las subcarpetas de assets en paralelo ---
    const [datHandle, capHandle, escHandle, perHandle, momHandle, compHandle] = await Promise.all([
        assetsDirHandle.getDirectoryHandle(DATA_SUBDIR_NAME, { create: true }),
        assetsDirHandle.getDirectoryHandle(CAPITULOS_DIR_NAME, { create: true }),
        assetsDirHandle.getDirectoryHandle(ESCENAS_DIR_NAME, { create: true }),
        assetsDirHandle.getDirectoryHandle(PERSONAJES_DIR_NAME, { create: true }),
        assetsDirHandle.getDirectoryHandle(MOMENTOS_DIR_NAME, { create: true }),
        assetsDirHandle.getDirectoryHandle(COMPOSITOR_DIR_NAME, { create: true })
    ]);

    // Asignar a variables globales
    datosDirHandle = datHandle;
    capitulosDirHandle = capHandle;
    escenasDirHandle = escHandle;
    personajesDirHandle = perHandle;
    momentosDirHandle = momHandle;
    compositorDirHandle = compHandle;

    // --- AÑADIDO: Poblar el mapa de handles (para la carga) ---
    subDirHandles = {
        [DATA_SUBDIR_NAME]: datosDirHandle,
        [CAPITULOS_DIR_NAME]: capitulosDirHandle,
        [ESCENAS_DIR_NAME]: escenasDirHandle,
        [PERSONAJES_DIR_NAME]: personajesDirHandle,
        [MOMENTOS_DIR_NAME]: momentosDirHandle,
        [COMPOSITOR_DIR_NAME]: compositorDirHandle,
    };
    
    return true;
}


/* --- MODIFICADA: Esta función ahora guarda en la subcarpeta correcta según el tipoDato --- */
/* Guardar imagen: dataURL -> Blob -> hash -> escribir si nueva -> devolver ruta relativa */
async function saveImageAndReturnPath(src, tipoDato = 'default') { // <-- AÑADIDO: tipoDato
    if (!src) return '';

    // Si ya es una ruta relativa "Assets/...", devolver tal cual
    if (typeof src === 'string' && src.startsWith(`${ASSETS_DIR_NAME}/`)) return src;

    // --- AÑADIDO: Lógica de selección de carpeta ---
    let dirHandle = datosDirHandle; // Fallback por defecto
    let subDirName = DATA_SUBDIR_NAME; // Fallback por defecto
    
    switch(tipoDato) {
        case 'capitulo':
            dirHandle = capitulosDirHandle;
            subDirName = CAPITULOS_DIR_NAME;
            break;
        case 'escena':
            dirHandle = escenasDirHandle;
            subDirName = ESCENAS_DIR_NAME;
            break;
        case 'personaje':
            dirHandle = personajesDirHandle;
            subDirName = PERSONAJES_DIR_NAME;
            break;
        case 'momento':
            dirHandle = momentosDirHandle;
            subDirName = MOMENTOS_DIR_NAME;
            break;
        case 'compositor':
            dirHandle = compositorDirHandle;
            subDirName = COMPOSITOR_DIR_NAME;
            break;
        default:
            // Ya está puesto en 'Datos' (datosDirHandle) por defecto
            break;
    }
    // --- FIN Lógica de selección ---


    let blob = null;
    let mime = 'image/png';

    // Si viene como data URL, convertir a Blob
    if (isDataUrl(src)) {
        blob = await dataURLToBlob(src);
        mime = blob.type || 'image/png';
    } else {
        // Si viene como URL http(s) o blob URL, intentar fetch
        try {
            const resp = await fetch(src);
            blob = await resp.blob();
            mime = blob.type || 'image/png';
        } catch (e) {
            console.error("No se pudo obtener la imagen desde la URL:", src, e);
            return src; // Devolver la URL original si falla el fetch
        }
    }

    const hash = await sha1(blob);
    const ext = extFromMime(mime);
    const fileName = `${hash}.${ext}`;
    
    // --- MODIFICADO: La ruta relativa ahora es dinámica ---
    const relativePrefix = `${ASSETS_DIR_NAME}/${subDirName}/`;
    const relativePath = `${relativePrefix}${fileName}`;

    // Si ya existe, no reescribir
    // --- MODIFICADO: Comprobamos y escribimos en el handle dinámico (dirHandle) ---
    if (supportsFSAccess && dirHandle) {
        const exists = await fileExists(dirHandle, fileName);
        if (!exists) {
            // Convertir a PNG siempre que se desee normalizar; si no, respetar mime
            let outBlob = blob;
            if (mime !== 'image/png') {
                // Intentar convertir a PNG usando canvas si es imagen raster
                try {
                    const bmp = await createImageBitmap(blob);
                    const canvas = document.createElement('canvas');
                    canvas.width = bmp.width;
                    canvas.height = bmp.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(bmp, 0, 0);
                    outBlob = await new Promise(res => canvas.toBlob(res, 'image/png', 0.92));
                } catch {
                    // si falla, guardar el blob original
                    outBlob = blob;
                }
            }
            // --- MODIFICADO: Escribimos en el handle dinámico (dirHandle) ---
            await writeFile(dirHandle, fileName, outBlob);
        }
    } else {
        // Sin FS Access no hay escritura incremental en carpeta local.
        // Se registra en manifest para que, si más tarde hay FS Access, se escriba.
    }

    manifestImagenes[hash] = {
        nombre: fileName,
        mime: 'image/png',
        bytes: blob.size
    };
    return relativePath;
}


/* --- MODIFICADA: Esta función ahora pasa el tipoDato al guardar --- */
/* Reemplaza los dataURL por rutas de imagen guardadas */
async function mapearImagenesEnEstructuras(data) {
    const procesarFrames = async (capitulo) => {
        capitulo.frames = await Promise.all((capitulo.frames || []).map(async (fr) => {
            if (fr.imagen) fr.imagen = await saveImageAndReturnPath(fr.imagen, 'capitulo');
            return fr;
        }));
    };
    for (const capitulo of(data.capitulos || [])) {
        await procesarFrames(capitulo);
    }
    for (const escena of(data.escenas || [])) {
        escena.tomas = await Promise.all((escena.tomas || []).map(async (t) => {
            if (t.imagen) t.imagen = await saveImageAndReturnPath(t.imagen, 'escena');
            return t;
        }));
    }
    for (const p of(data.personajes || [])) {
        if (p.imagen) p.imagen = await saveImageAndReturnPath(p.imagen, 'personaje');
    }
    for (const m of(data.momentos || [])) {
        if (m.imagen) m.imagen = await saveImageAndReturnPath(m.imagen, 'momento');
    }
    for (const g of(data.generacionesCompositor || [])) {
        if (g.src) g.src = await saveImageAndReturnPath(g.src, 'compositor');
    }
    return data;
}

/* io.js */

async function empaquetarDatosDelProyecto() {
    if (typeof actualizarPosicionesDesdeLienzo === 'function') actualizarPosicionesDesdeLienzo();
    if (typeof guardarEscenaActual === 'function') guardarEscenaActual();

    console.log("Empaquetando datos del proyecto (incluyendo archivados)...");

    const listaActivos = document.getElementById("listapersonajes")?.children || [];
    const listaArchivados = document.getElementById("bibliotecadatos-lista")?.children || [];
    
    // --- MODIFICACIÓN INICIO ---
    // Función reutilizable para convertir un elemento .personaje a objeto de datos
    const procesarNodoPersonaje = async (personajeNode) => {
        const id = personajeNode.dataset.id;
        if (!id) return null;
        const nombre = personajeNode.querySelector("input.nombreh")?.value || "";
        const descripcion = personajeNode.querySelector("textarea.descripcionh")?.value || "";
        const promptVisual = personajeNode.querySelector("textarea.prompt-visualh")?.value || "";
        const svgContent = personajeNode.dataset.svgContent || "";
        const embeddingStr = personajeNode.dataset.embedding || '[]';
        let embeddingArray = [];
        try {
            embeddingArray = JSON.parse(embeddingStr);
        } catch {
            embeddingArray = [];
        }

        const etiquetaEl = personajeNode.querySelector(".change-tag-btn");
        const arcoEl = personajeNode.querySelector(".change-arc-btn");
        const etiqueta = etiquetaEl ? etiquetaEl.dataset.etiqueta : 'indeterminado';
        const arco = arcoEl ? arcoEl.dataset.arco : 'sin_arco';

        // --- LÓGICA DE CARPETA AÑADIDA ---
        // Buscamos el sticker visual correspondiente en el lienzo
        const stickerVisual = document.querySelector(`#lienzo-visual .personaje-sticker[data-id="${id}"]`);
        const carpetaId = stickerVisual ? stickerVisual.dataset.carpetaId : null;
        // --- FIN LÓGICA DE CARPETA ---

        let imagenSrc = "";
        if (!svgContent) {
            const full = personajeNode.dataset.fullImageSrc || "";
            if (full) imagenSrc = full;
        }

        if (!nombre && !descripcion && !promptVisual && !imagenSrc && !svgContent) return null;

        return {
            id,
            nombre,
            descripcion,
            promptVisual,
            imagen: imagenSrc,
            svgContent,
            etiqueta,
            arco,
            embedding: embeddingArray,
            carpetaId: carpetaId // --- AÑADIMOS LA PROPIEDAD AL OBJETO GUARDADO ---
        };
    };
    // --- MODIFICACIÓN FIN ---

    const promesasCapitulos = Object.keys(escenas || {}).map(async (id) => {
        // ... (código de capítulos sin cambios) ...
        if (!id) return null;
        const capitulo = escenas[id];
        const framesProcesados = await Promise.all(
            (capitulo.frames || []).map(async (frame) => ({ ...frame,
                imagen: frame.imagen || ""
            }))
        );
        return { ...capitulo,
            id,
            frames: framesProcesados
        };
    });

    const promesasPersonajes = Array.from(listaActivos).map(procesarNodoPersonaje);
    const promesasArchivados = Array.from(listaArchivados).map(procesarNodoPersonaje);

    const promesasEscenasStory = Promise.all((storyScenes || []).map(async (escena) => {
        // ... (código de escenas de story sin cambios) ...
        const tomasProcesadas = await Promise.all(
            (escena.tomas || []).map(async (toma) => ({ ...toma,
                imagen: toma.imagen || ""
            }))
        );
        return { ...escena,
            tomas: tomasProcesadas
        };
    }));

    const nodosMomento = document.querySelectorAll('#momentos-lienzo .momento-nodo') || [];
    const promesasMomentos = Array.from(nodosMomento).map(async (nodo) => {
        // ... (código de momentos sin cambios) ...
        const imgEl = nodo.querySelector('.momento-imagen');
        const imagenSrc = imgEl?.src || '';
        const svgIlustracion = nodo.dataset.svgIlustracion || '';
        const llavesActivar = nodo.dataset.llavesActivar || '';
        const llavesDesactivar = nodo.dataset.llavesDesactivar || '';
        const objetosGanar = nodo.dataset.objetosGanar || '';
        const objetosPerder = nodo.dataset.objetosPerder || '';

        return {
            id: nodo.id,
            titulo: nodo.querySelector('.momento-titulo')?.textContent || '',
            descripcion: nodo.dataset.descripcion || '',
            x: parseInt(nodo.style.left, 10) || 0,
            y: parseInt(nodo.style.top, 10) || 0,
            imagen: imagenSrc,
            svgIlustracion: svgIlustracion,
            acciones: JSON.parse(nodo.dataset.acciones || '[]'),
            entidades: JSON.parse(nodo.dataset.entidades || '[]'),
            llavesActivar,
            llavesDesactivar,
            objetosGanar,
            objetosPerder
        };
    });

    const generacionesItems = document.querySelectorAll('#generaciones-container .generacion-item') || [];
    const promesasGeneraciones = Array.from(generacionesItems).map(async (item) => {
        // ... (código de generaciones sin cambios) ...
        const img = item.querySelector('img');
        const prompt = item.querySelector('.generacion-prompt');
        if (img && img.src && prompt && img.src.startsWith('data:image')) {
            return {
                src: img.src,
                prompt: prompt.textContent
            };
        }
        return null;
    });

    // --- AÑADIDO: Recopilamos las carpetas ---
    const carpetasDOM = document.querySelectorAll('#lienzo-visual .dato-carpeta');
    const carpetasData = Array.from(carpetasDOM).map(carpetaEl => ({
        id: carpetaEl.dataset.id,
        nombre: carpetaEl.querySelector('.carpeta-titulo')?.textContent || 'Carpeta'
    }));
    // --- FIN AÑADIDO ---

    const programadorBlueprintsJSON = localStorage.getItem('visualAutomationBlueprints');
    const programadorBlueprints = programadorBlueprintsJSON ? JSON.parse(programadorBlueprintsJSON) : [];

    const processedChapters = (await Promise.all(promesasCapitulos)).filter(Boolean).sort((a, b) => a.id.localeCompare(b.id));
    const processedCharacters = (await Promise.all(promesasPersonajes)).filter(Boolean);
    const processedArchived = (await Promise.all(promesasArchivados)).filter(Boolean);
    const processedStoryScenes = await promesasEscenasStory;
    const processedMomentos = (await Promise.all(promesasMomentos));
    const processedGeneraciones = (await Promise.all(promesasGeneraciones)).filter(Boolean);

    const titulo = document.getElementById("titulo-proyecto")?.innerText?.trim() || ultimoTituloProyecto;
    ultimoTituloProyecto = titulo;

    const data = {
        titulo,
        capitulos: processedChapters,
        escenas: processedStoryScenes,
        personajes: processedCharacters,
        personajesArchivados: processedArchived,
        momentos: processedMomentos,
        // --- MODIFICADO: Esta línea ahora es 100% correcta ---
        // (ya que posicionesDatos incluye stickers Y carpetas gracias a nuestros cambios anteriores)
        posicionesElementos: typeof posicionesDatos !== 'undefined' ? posicionesDatos : [],
        // --- AÑADIDO: Guardamos el nuevo array de carpetas ---
        carpetas: carpetasData,
        // --- FIN AÑADIDO ---
        generacionesCompositor: processedGeneraciones,
        guionLiterario: typeof guionLiterarioData !== 'undefined' ? guionLiterarioData : [],
        apiKeysGemini: typeof imageApiKeys !== 'undefined' ? imageApiKeys : [],

        informeGeneral: typeof ultimoInformeGenerado !== 'undefined' ? ultimoInformeGenerado : null,
        libros: typeof libros !== 'undefined' ? libros : [],
        animacionesSvg: typeof window.escenasSvg !== 'undefined' ? window.escenasSvg : [],
        programadorBlueprints: programadorBlueprints,
        contadorGlobalMomentos: typeof contadorMomentosGlobal !== 'undefined' ? contadorMomentosGlobal : 0,

        manifestImagenes
    };

    if (window.editor && window.editor.data) {
        data.juegoInteractivoData = window.editor.data;
    }
    return data;
}

/* Guardar proyecto en carpeta (incremental imágenes, sobreescribir JSON) */
/* Guardar proyecto en carpeta (incremental imágenes, sobreescribir JSON) */
async function guardarProyectoEnCarpeta() {
    // <-- AÑADIDO: Inicia la barra de progreso para dar feedback inmediato al usuario.
    if (typeof progressBarManager !== 'undefined') {
        progressBarManager.start('Guardando proyecto...');
    }

    if (!supportsFSAccess) {
        // Fallback: Lógica para navegadores sin acceso al sistema de archivos.
        try {
            // 1. Empaquetar los datos como siempre.
            let data = await empaquetarDatosDelProyecto();

            // 2. Convertir todas las imágenes a Base64 antes de crear el archivo.
            // Esta es la parte que más puede tardar.
            const dataConImagenesIncrustadas = await incrustarImagenesBase64(data);

            // 3. Crear el Blob con los datos que ya tienen las imágenes en Base64.
            const blob = new Blob([JSON.stringify(dataConImagenesIncrustadas, null, 2)], {
                type: "application/json"
            });
            const nombre = (data.titulo || 'silenos_project').replace(/\s+/g, '_');
            const downloadUrl = URL.createObjectURL(blob);

            const existingLink = document.getElementById('temp-download-link');
            if (existingLink) {
                existingLink.remove();
            }

            const a = document.createElement("a");
            a.id = 'temp-download-link';
            a.href = downloadUrl;
            a.download = `${nombre}.json`;
            a.textContent = `Descargar ${nombre}.json`;

            Object.assign(a.style, {
                position: 'fixed',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#28a745',
                color: 'white',
                padding: '12px 25px',
                borderRadius: '8px',
                textDecoration: 'none',
                zIndex: '100000001',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                fontSize: '16px',
                fontWeight: 'bold',
                border: '2px solid #fff'
            });

            a.onclick = () => {
                setTimeout(() => {
                    a.remove();
                    URL.revokeObjectURL(downloadUrl);
                }, 150);
            };
            document.body.appendChild(a);
            setTimeout(() => {
                if (document.getElementById('temp-download-link')) {
                    a.remove();
                    URL.revokeObjectURL(downloadUrl);
                }
            }, 15000);

            // <-- AÑADIDO: Finaliza la barra de progreso con un mensaje de éxito.
            if (typeof progressBarManager !== 'undefined') {
                progressBarManager.finish('¡Proyecto listo para descargar!');
            }

            alert('Este entorno no permite el guardado directo. Haz clic en el botón verde que ha aparecido para descargar el archivo del proyecto.');
            return;

        } catch (error) {
            console.error("Error durante el guardado alternativo:", error);
            if (typeof progressBarManager !== 'undefined') {
                progressBarManager.error('Error al guardar el proyecto.');
            }
            alert('Ocurrió un error al preparar el archivo del proyecto.');
            return;
        }
    }

    // Lógica para navegadores con soporte para File System Access API.
    const ensured = await ensureProjectFolder();
    if (!ensured) {
         if (typeof progressBarManager !== 'undefined') progressBarManager.error('No se pudo acceder a la carpeta.');
        return;
    }

    let data = await empaquetarDatosDelProyecto();
    data.manifestImagenes = manifestImagenes || {};
    // --- MODIFICADO: Esta función ahora usa 'tipoDato' ---
    await mapearImagenesEnEstructuras(data);

    const jsonBlob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
    });
    await writeFile(projectRootHandle, PROJECT_JSON_NAME, jsonBlob);

    console.log('Proyecto guardado en carpeta.');
    // Esta línea ya existía, pero ahora funciona en conjunto con el .start() del principio.
    if (typeof progressBarManager !== 'undefined') progressBarManager.finish("¡Guardado en carpeta!");
}

/* --- MODIFICADA: Esta función ahora carga desde Assets y todas las subcarpetas --- */
/* Cargar proyecto desde carpeta */
async function cargarProyectoDesdeCarpeta() {
    if (supportsFSAccess) {
        try {
            projectRootHandle = await window.showDirectoryPicker({
                mode: 'readwrite'
            });
            await saveDirectoryHandle(projectRootHandle);
            
            // --- MODIFICADO: Obtener handle de 'Assets' ---
            assetsDirHandle = await projectRootHandle.getDirectoryHandle(ASSETS_DIR_NAME, {
                create: true // true para asegurar que existe al cargar y re-guardar
            });
            
            // --- AÑADIDO: Obtener handles de TODAS las subcarpetas ---
            const [datHandle, capHandle, escHandle, perHandle, momHandle, compHandle] = await Promise.all([
                assetsDirHandle.getDirectoryHandle(DATA_SUBDIR_NAME, { create: true }),
                assetsDirHandle.getDirectoryHandle(CAPITULOS_DIR_NAME, { create: true }),
                assetsDirHandle.getDirectoryHandle(ESCENAS_DIR_NAME, { create: true }),
                assetsDirHandle.getDirectoryHandle(PERSONAJES_DIR_NAME, { create: true }),
                assetsDirHandle.getDirectoryHandle(MOMENTOS_DIR_NAME, { create: true }),
                assetsDirHandle.getDirectoryHandle(COMPOSITOR_DIR_NAME, { create: true })
            ]);
            
            // Asignar a variables globales
            datosDirHandle = datHandle;
            capitulosDirHandle = capHandle;
            escenasDirHandle = escHandle;
            personajesDirHandle = perHandle;
            momentosDirHandle = momHandle;
            compositorDirHandle = compHandle;

            // Poblar el mapa de handles (para la carga)
            subDirHandles = {
                [DATA_SUBDIR_NAME]: datosDirHandle,
                [CAPITULOS_DIR_NAME]: capitulosDirHandle,
                [ESCENAS_DIR_NAME]: escenasDirHandle,
                [PERSONAJES_DIR_NAME]: personajesDirHandle,
                [MOMENTOS_DIR_NAME]: momentosDirHandle,
                [COMPOSITOR_DIR_NAME]: compositorDirHandle,
            };

            const projFileHandle = await projectRootHandle.getFileHandle(PROJECT_JSON_NAME, {
                create: false
            });
            const file = await projFileHandle.getFile();
            const text = await file.text();
            const data = JSON.parse(text);

            manifestImagenes = data.manifestImagenes || {};

            // --- MODIFICADO: Esta función ahora sabe leer de subcarpetas ---
            const dataHidratado = await reHidratarRutasAURLs(data);
            cargarDatosEnLaApp(dataHidratado);

            console.log('Proyecto cargado desde carpeta.');
            return;
        } catch (err) {
            console.error('Error al cargar desde carpeta:', err);
            // --- AÑADIDO: Comprobación de error común (carpeta 'Imagenes' antigua) ---
            if (err.name === 'NotFoundError') {
                try {
                    // Intenta buscar la carpeta 'Imagenes' antigua por compatibilidad
                    const oldImagesHandle = await projectRootHandle.getDirectoryHandle('Imagenes', { create: false });
                    if (oldImagesHandle) {
                        alert('Proyecto antiguo detectado. Cargando desde "Imagenes". El proyecto se guardará en la nueva estructura "Assets/..." la próxima vez que guarde.');
                        
                        // --- AÑADIDO: Guardamos el handle antiguo en el mapa para el cargador ---
                        subDirHandles['Imagenes'] = oldImagesHandle;
                        
                        const projFileHandle = await projectRootHandle.getFileHandle(PROJECT_JSON_NAME, { create: false });
                        const file = await projFileHandle.getFile();
                        const text = await file.text();
                        const data = JSON.parse(text);
                        manifestImagenes = data.manifestImagenes || {};
                        const dataHidratado = await reHidratarRutasAURLs(data);
                        cargarDatosEnLaApp(dataHidratado);
                        console.log('Proyecto antiguo cargado (modo compatibilidad).');
                        
                        // Resetea el handle para forzar la nueva estructura al guardar
                        datosDirHandle = null;
                        assetsDirHandle = null;
                        return;
                    }
                } catch (e) {
                     // El error no era la carpeta antigua
                }
            }
            alert('No se pudo cargar el proyecto desde la carpeta seleccionada.');
            return;
        }
    }

    // Fallback para navegadores sin File System Access API
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.addEventListener('change', async () => {
            const files = Array.from(input.files || []);
            const projectEntry = files.find(f => f.name === PROJECT_JSON_NAME);
            if (!projectEntry) {
                alert('No se encontró proyecto.json en la carpeta seleccionada.');
                resolve();
                return;
            }
            try {
                const text = await projectEntry.text();
                const data = JSON.parse(text);
                const byPath = new Map();
                for (const f of files) {
                    const rel = f.webkitRelativePath || f.name;
                    byPath.set(rel.replace(/^[^/]+\/?/, ''), f); // Esto quita la carpeta raíz del proyecto
                    byPath.set(rel, f);
                    byPath.set(f.name, f);
                }
                const dataHidratado = await reHidratarRutasAURLs(data, byPath);
                cargarDatosEnLaApp(dataHidratado);
                manifestImagenes = data.manifestImagenes || {};
                console.log('Proyecto cargado desde selección de carpeta (fallback).');
                resolve();
            } catch (e) {
                console.error(e);
                alert('Fallo al leer proyecto.json.');
                resolve();
            }
        });
        if ('showPicker' in HTMLInputElement.prototype) input.showPicker();
        else input.click();
    });
}

/**
 * Carga los datos de un archivo JSON que no proviene de una carpeta (método antiguo).
 * Esta función ahora actúa como un punto de entrada que pasa los datos a la función de actualización.
 */
function cargarJSON(event) {
    let file = event.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = function(e) {
        let data;
        try {
            data = JSON.parse(e.target.result);
        } catch (error) {
            alert("Error: El archivo no es un JSON válido.");
            console.error("Error al parsear JSON:", error);
            return;
        }
        // Llama a la nueva función que maneja la conversión y carga.
        convertirYcargarProyecto(data);
    };
    reader.readAsText(file);
}
// Añadir el listener al input de archivo
document.getElementById('file-load')?.addEventListener('change', cargarJSON);


/**
 * Nueva función para convertir formatos de proyecto antiguos al formato moderno
 * y luego cargarlo en la aplicación.
 * @param {object} data Los datos del proyecto leídos del JSON.
 */
function convertirYcargarProyecto(data) {
    console.log("Detectando formato del proyecto...");
    // Criterio de detección: los proyectos nuevos tienen una propiedad 'libros'.
    const esFormatoAntiguo = !data.hasOwnProperty('libros');

    if (esFormatoAntiguo) {
        console.log("Detectado formato de proyecto antiguo. Actualizando estructura de datos...");
        alert("Se ha detectado un formato de proyecto antiguo. Se actualizará al nuevo sistema de 'Libros'. El contenido se agrupará en un libro llamado 'Capítulos Antiguos'.");

        const newData = { ...data
        };
        newData.libros = [];
        const libroMigrado = {
            id: `libro_migracion_${Date.now()}`,
            titulo: "Capítulos Antiguos"
        };
        newData.libros.push(libroMigrado);

        const nuevasEscenas = {};
        if (data.capitulos && Array.isArray(data.capitulos)) {
            data.capitulos.forEach(capitulo => {
                if (capitulo.id) {
                    nuevasEscenas[capitulo.id] = {
                        ...capitulo,
                        libroId: libroMigrado.id
                    };
                }
            });
        }
        // Reemplaza la propiedad 'capitulos' con la nueva estructura de escenas para el cargador.
        newData.capitulos = Object.values(nuevasEscenas);

        cargarDatosEnLaApp(newData);

    } else {
        console.log("Detectado formato de proyecto moderno.");
        cargarDatosEnLaApp(data);
    }
}


/* --- MODIFICADA: Esta función ahora lee de la subcarpeta correcta dinámicamente --- */
/* Convierte rutas relativas "Assets/Subcarpeta/<hash>.png" a Data URLs (Base64) para visualización */
async function rutaAObjectURL(path, byPathMap) {
    if (!path || typeof path !== 'string') return '';
    // Si ya es un data URL o una URL web, la devolvemos tal cual.
    if (path.startsWith('data:') || path.startsWith('http')) return path;

    // Helper function para leer un archivo (File o Blob) como dataURL
    const readFileAsDataURL = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    if (supportsFSAccess) {
        try {
            // --- AÑADIDO: LÓGICA DE CARGA DINÁMICA ---
            let dirHandle = null;
            let fileName = '';
            
            if (path.startsWith(`${ASSETS_DIR_NAME}/`)) {
                const parts = path.split('/'); // ["Assets", "Personajes", "hash.png"]
                const folderName = parts[1];
                fileName = parts[2];
                dirHandle = subDirHandles[folderName]; // Usar el mapa
                
                if (!dirHandle) {
                     console.warn(`No se encontró handle para la carpeta: ${folderName}`);
                     return '';
                }
            } 
            // --- AÑADIDO: LÓGICA DE COMPATIBILIDAD (Proyectos antiguos) ---
            else if (path.startsWith('Imagenes/')) {
                fileName = path.replace('Imagenes/', '');
                // Intento perezoso de obtener el handle antiguo si no lo tenemos
                if (!subDirHandles['Imagenes']) {
                     try {
                        subDirHandles['Imagenes'] = await projectRootHandle.getDirectoryHandle('Imagenes', { create: false });
                     } catch {}
                }
                dirHandle = subDirHandles['Imagenes'];
            } 
            // --- FIN COMPATIBILIDAD ---
            else {
                // Fallback para rutas muy antiguas o sin prefijo
                fileName = path.split('/').pop(); 
                dirHandle = datosDirHandle; // Asumir 'Datos' si no hay prefijo
            }

            if (!dirHandle) {
                console.warn(`No se pudo determinar el directorio para: ${path}`);
                return '';
            }

            const fileHandle = await dirHandle.getFileHandle(fileName, { create: false });
            const file = await fileHandle.getFile();
            return await readFileAsDataURL(file); // Convertir a dataURL
        } catch (e) {
            console.warn(`No se pudo cargar la imagen ${path} desde la carpeta.`, e);
            return '';
        }
    } else if (byPathMap) {
        // La lógica del byPathMap usa rutas relativas a la carpeta del proyecto
        // (ej: 'Assets/Personajes/hash.png' o 'Imagenes/hash.png')
        // El código original que las genera ('rel.replace(/^[^/]+\/?/, '')')
        // ya crea estas rutas correctamente.
        const f = byPathMap.get(path) || byPathMap.get(path.replace(/^.?\//, '')) || byPathMap.get(path.split('/').pop());
        if (f) {
            return await readFileAsDataURL(f); // Convertir a dataURL
        }
    }
    return ''; // Devuelve vacío si no se puede resolver
}


/* Rehidratar todas las estructuras con rutas -> object URLs (para la UI) */
async function reHidratarRutasAURLs(data, byPathMap) {
    const clone = JSON.parse(JSON.stringify(data));
    const hidratarFrames = async (capitulo) => {
        capitulo.frames = await Promise.all((capitulo.frames || []).map(async (fr) => {
            if (fr.imagen) fr.imagen = await rutaAObjectURL(fr.imagen, byPathMap);
            return fr;
        }));
    };
    for (const capitulo of(clone.capitulos || [])) {
        await hidratarFrames(capitulo);
    }
    for (const escena of(clone.escenas || [])) {
        escena.tomas = await Promise.all((escena.tomas || []).map(async (t) => {
            if (t.imagen) t.imagen = await rutaAObjectURL(t.imagen, byPathMap);
            return t;
        }));
    }
    for (const p of(clone.personajes || [])) {
        if (p.imagen) p.imagen = await rutaAObjectURL(p.imagen, byPathMap);
    }
    for (const m of(clone.momentos || [])) {
        if (m.imagen) m.imagen = await rutaAObjectURL(m.imagen, byPathMap);
    }
    for (const g of(clone.generacionesCompositor || [])) {
        if (g.src) g.src = await rutaAObjectURL(g.src, byPathMap);
    }
    return clone;
}


/* io.js */

function cargarDatosEnLaApp(data) {
    if (typeof reiniciarEstadoApp === 'function') reiniciarEstadoApp();

    if (data.contadorGlobalMomentos && typeof data.contadorGlobalMomentos === 'number') {
        window.contadorMomentosGlobal = data.contadorGlobalMomentos;
    } else {
        window.contadorMomentosGlobal = 0;
    }

    if (data.titulo) {
        document.getElementById("titulo-proyecto").innerText = data.titulo;
        const tituloInput = document.getElementById('asistente-titulo-input');
        if (tituloInput) {
            tituloInput.value = data.titulo;
        }
    }

    // --- MODIFICACIÓN INICIO: Cargar posiciones PRIMERO ---
    if (data.posicionesElementos && Array.isArray(data.posicionesElementos)) {
        posicionesDatos = data.posicionesElementos;
    } else if (data.posicionesCanvas && Array.isArray(data.posicionesCanvas)) {
        posicionesDatos = data.posicionesCanvas; 
    } else {
        posicionesDatos = [];
    }
    // --- MODIFICACIÓN FIN ---
    
    // --- AÑADIDO: Renderizar las CARPETAS antes que los datos ---
    if (data.carpetas && Array.isArray(data.carpetas) && typeof renderizarCarpetasDesdeDatos === 'function') {
        // Esta función (de datos-lienzo.js) usa 'posicionesDatos' para colocar las carpetas.
        renderizarCarpetasDesdeDatos(data.carpetas);
    }
    // --- FIN AÑADIDO ---

    if (data.capitulos && Array.isArray(data.capitulos)) {
        // ... (código de capítulos sin cambios) ...
        data.capitulos.forEach(capitulo => {
            const capituloId = capitulo.id;
            if (capituloId) {
                escenas[capituloId] = { ...capitulo
                };
                delete escenas[capituloId].id;
            }
        });
        const idsNumericos = Object.keys(escenas).map(id => parseInt(id.replace(/[^0-9]/g, ''), 10)).filter(num => !isNaN(num));
        ultimoId = idsNumericos.length > 0 ? Math.max(...idsNumericos) : 0;
    }

    if (data.libros && Array.isArray(data.libros)) {
        // ... (código de libros sin cambios) ...
        libros = data.libros;
    } else {
        libros = [];
    }

    if (libros.length > 0) {
        if (typeof seleccionarLibro === 'function') seleccionarLibro(libros[0].id);
    }
    if (typeof actualizarLista === 'function') actualizarLista();

    // Carga de personajes ACTIVOS
    if (data.personajes && Array.isArray(data.personajes)) {
        data.personajes.forEach(p => {
            if (typeof agregarPersonajeDesdeDatos === 'function') {
                // agregarPersonajeDesdeDatos ahora recibe p.carpetaId
                // y se lo pasa a crearStickerParaDato, que lo asigna al sticker.
                agregarPersonajeDesdeDatos(p);
            }
        });
    }

    // Carga de personajes ARCHIVADOS
    if (data.personajesArchivados && Array.isArray(data.personajesArchivados)) {
        data.personajesArchivados.forEach(p_archivado => {
            if (typeof agregarPersonajeDesdeDatos === 'function' && typeof moverDatoEntreVistas === 'function') {
                const elementoArchivado = agregarPersonajeDesdeDatos(p_archivado);
                
                if (elementoArchivado) {
                    moverDatoEntreVistas(elementoArchivado.dataset.id);
                }
            }
        });
    }

    if (data.guionLiterario && Array.isArray(data.guionLiterario)) {
        // ... (código de guion literario sin cambios) ...
        guionLiterarioData = data.guionLiterario;
        window.guionesGuardados = {};
        guionLiterarioData.forEach(guion => {
            if (guion.generadoPorIA && guion.tituloOriginal) {
                guionesGuardados[guion.tituloOriginal] = guion;
            }
        });
        if (typeof renderizarGuion === 'function') renderizarGuion();
        if (guionLiterarioData.length > 0 && typeof mostrarCapituloSeleccionado === 'function') {
            mostrarCapituloSeleccionado(0);
        }
    }

      if (data.apiKeysGemini && Array.isArray(data.apiKeysGemini) && data.apiKeysGemini.length > 0) {
        // ... (código de API keys sin cambios) ...
        console.log("Cargando array de API keys (formato nuevo).");
        if (typeof updateApiKey === 'function') {
            const input = document.getElementById('apiInput');
            if (input) {
                input.value = data.apiKeysGemini.join(', ');
                updateApiKey();
            }
        }
    } else if (data.apiKeyGemini && typeof data.apiKeyGemini === 'string') {
        // ... (código de API keys sin cambios) ...
        console.log("Cargando una sola API key (formato antiguo).");
        if (typeof updateApiKey === 'function') {
            const input = document.getElementById('apiInput');
            if (input) {
                input.value = data.apiKeyGemini;
                updateApiKey();
            }
        }
    }

    if (data.momentos && Array.isArray(data.momentos)) {
        // ... (código de momentos sin cambios) ...
        data.momentos.forEach(momento => {
            if (typeof crearMomentoEnLienzoDesdeDatos === 'function') {
                crearMomentoEnLienzoDesdeDatos(momento);
            }
        });
        if (typeof redrawAllConnections === 'function') {
            setTimeout(redrawAllConnections, 100);
        }
    }

    if (data.escenas && Array.isArray(data.escenas)) {
        // ... (código de escenas de story sin cambios) ...
        storyScenes = data.escenas;
        if (typeof renderEscenasUI === 'function') renderEscenasUI();
    }

    if (data.informeGeneral) {
        // ... (código de informe sin cambios) ...
        ultimoInformeGenerado = data.informeGeneral;
        if (typeof renderizarInformeCompleto === 'function') {
            renderizarInformeCompleto(ultimoInformeGenerado);
        }
    }

    if (data.animacionesSvg && Array.isArray(data.animacionesSvg)) {
        // ... (código de animaciones sin cambios) ...
        if (typeof window.escenasSvg !== 'undefined') {
            window.escenasSvg = data.animacionesSvg;
            if (window.escenasSvg.length > 0) {
                if (typeof cargarEscena === 'function') setTimeout(() => cargarEscena(0), 100);
            } else if (typeof renderizarListaDeEscenas === 'function') {
                setTimeout(renderizarListaDeEscenas, 100);
            }
        }
    }

    if (data.programadorBlueprints && Array.isArray(data.programadorBlueprints)) {
        // ... (código de programador sin cambios) ...
        localStorage.setItem('visualAutomationBlueprints', JSON.stringify(data.programadorBlueprints));
        if (typeof pUpdateBlueprintDropdown === 'function') {
            pLoadBlueprintsFromStorage();
            pUpdateBlueprintDropdown();
        }
    }

    if (data.juegoInteractivoData) {
        // ... (código de juego interactivo sin cambios) ...
        if (window.editor) {
            window.editor.data = data.juegoInteractivoData;
            window.editor.renderAll();
        } else {
            window.pendingInteractiveData = data.juegoInteractivoData;
        }
    }
    
    // --- MODIFICACIÓN INICIO: Aplicar posiciones y redimensionar carpetas ---
    if (typeof aplicarPosicionesAlLienzo === 'function' && posicionesDatos.length > 0) {
        setTimeout(() => {
            // 1. Aplica las posiciones guardadas a TODOS los elementos (stickers y carpetas)
            aplicarPosicionesAlLienzo(posicionesDatos);
            
            // 2. AHORA que los stickers están en sus posiciones,
            //    le decimos a las carpetas que se redimensionen a su contenido.
            if (typeof actualizarLimitesCarpeta === 'function') {
                document.querySelectorAll('.dato-carpeta').forEach(carpetaEl => {
                    // Quitamos la transición para un ajuste instantáneo al cargar
                    carpetaEl.style.transition = 'none'; 
                    actualizarLimitesCarpeta(carpetaEl);
                    // Devolvemos la transición para futuras operaciones
                    setTimeout(() => carpetaEl.style.transition = '', 50); 
                });
            }
            console.log("Posiciones de elementos restauradas y carpetas redimensionadas.");
        }, 150); // Damos tiempo al DOM para renderizar todo
    }
    // --- MODIFICACIÓN FIN ---

    console.log("Datos del proyecto cargados en la aplicación.");
    if (typeof renderizarVisorDeLibros === 'function') renderizarVisorDeLibros();
    if (typeof flexear === 'function') flexear('silenos');
}

/* ================================== */
/* API pública para la Interfaz de Usuario */
/* ================================== */

async function guardarProyecto() {
    await guardarProyectoEnCarpeta();
}

async function cargarProyecto() {
    await cargarProyectoDesdeCarpeta();
}

/* Opcional: atajos para viejas funciones (compatibilidad) */
async function guardarJSON() {
    await guardarProyecto();
}

async function exportarSoloJSON() {
    const data = await empaquetarDatosDelProyecto();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const nombre = (data.titulo || 'silenos_project').replace(/\s+/g, '_');
    a.download = `${nombre}.json`;
    a.click();
}

/**
 * Convierte una URL de imagen (blob:, http:, etc.) a un data URL en Base64.
 * Si la URL ya es un data URL, la devuelve directamente.
 * @param {string} url La URL de la imagen a convertir.
 * @returns {Promise<string>} Una promesa que se resuelve con el data URL.
 */
async function urlToDataURL(url) {
    // Si la URL está vacía, no es un string o ya es un data URL, no hacer nada.
    if (!url || typeof url !== 'string' || url.startsWith('data:')) {
        return url;
    }

    // --- INICIO DE LA MODIFICACIÓN ---
    // El error "URL scheme 'blob' is not supported" viene de 'fetch'
    // (que parece estar modificado por animaciones.js).
    // Usaremos XMLHttpRequest (XHR) para las 'blob:' URLs para evadir esto.
    if (url.startsWith('blob:')) {
        // console.log(`Intentando convertir URL blob via XHR: ${url}`);
        return new Promise((resolve, reject) => {
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.responseType = 'blob'; // Pedir la respuesta como un Blob
                
                xhr.onload = function() {
                    // status 0 puede ser normal para peticiones de blob locales
                    if (this.status === 200 || this.status === 0) {
                        const blob = this.response;
                        // Ahora que tenemos el blob, lo convertimos a data URL
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = (err) => {
                            console.error('Error de FileReader', err);
                            reject(err);
                        };
                        reader.readAsDataURL(blob);
                    } else {
                        // Si hay un error de XHR, rechazar
                        reject(new Error(`XHR falló con estado ${this.status}`));
                    }
                };
                
                xhr.onerror = (err) => {
                    // Error de red
                    console.error('Error de XHR al cargar el blob', err);
                    reject(new Error('Error de XHR al cargar el blob'));
                };
                
                xhr.send();
            } catch (error) {
                console.error(`Error de XHR iniciando la petición para: ${url}`, error);
                reject(error);
            }
        }).catch(error => {
            console.error(`No se pudo convertir la URL (blob:) a Base64 con XHR: ${url}`, error);
            return url; // Devolver la original en caso de error
        });
    }
    // --- FIN DE LA MODIFICACIÓN ---

    // Lógica original de 'fetch' para URLs http/https
    try {
        // console.log(`Intentando convertir URL http/https via fetch: ${url}`);
        // Usa fetch para obtener la imagen, funciona para http: (si CORS lo permite)
        const response = await fetch(url);
        const blob = await response.blob();

        // Usa FileReader para convertir el Blob a Base64
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error(`No se pudo convertir la URL (http/https) a Base64 con fetch: ${url}`, error);
        return url; // En caso de error, devolver la URL original.
    }
}


/**
 * Recorre el objeto de datos del proyecto y convierte todas las rutas de imagen
 * a data URLs (Base64) para poder incrustarlas en el JSON.
 * @param {object} data El objeto de datos del proyecto.
 * @returns {Promise<object>} El objeto de datos con las imágenes incrustadas.
 */
async function incrustarImagenesBase64(data) {
    console.log("Incrustando imágenes en formato Base64 para exportación...");
    // Se clona el objeto para no modificar la versión en memoria de la aplicación.
    const dataClone = JSON.parse(JSON.stringify(data));

    const promesas = [];

    const procesarImagen = async (objeto, clave) => {
        if (objeto && objeto[clave]) {
            objeto[clave] = await urlToDataURL(objeto[clave]);
        }
    };

    (dataClone.capitulos || []).forEach(cap => {
        (cap.frames || []).forEach(fr => promesas.push(procesarImagen(fr, 'imagen')));
    });

    (dataClone.escenas || []).forEach(esc => {
        (esc.tomas || []).forEach(t => promesas.push(procesarImagen(t, 'imagen')));
    });

    (dataClone.personajes || []).forEach(p => promesas.push(procesarImagen(p, 'imagen')));
    (dataClone.momentos || []).forEach(m => promesas.push(procesarImagen(m, 'imagen')));
    (dataClone.generacionesCompositor || []).forEach(g => promesas.push(procesarImagen(g, 'src')));

    // Esperamos a que todas las conversiones de imágenes terminen.
    await Promise.all(promesas);

    console.log("Imágenes incrustadas correctamente.");
    return dataClone;
}