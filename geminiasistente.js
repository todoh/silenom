/**
 * geminiasistente.js (Arquitectura Híbrida v5 - Lotes Optimizados)
 * Este script implementa un sistema de análisis narrativo avanzado con un flujo de trabajo híbrido.
 * - Utiliza modelos de IA ligeros para tareas de clasificación y resumen rápido.
 * - Emplea una única llamada a la API por lote de personajes para optimizar el uso y evitar límites de peticiones.
 * - Genera una línea de tiempo interactiva con resúmenes emergentes.
 */
let ultimoInformeGenerado = null;

document.addEventListener('DOMContentLoaded', () => {
    const botonAnalisis = document.getElementById('analizar-datos-btn');
    if (botonAnalisis) {
        botonAnalisis.addEventListener('click', generarInformeExtendido);
    }
});

function recolectarDatos() {
    console.log("Iniciando recolección de datos desde el DOM...");
    const contenedorDatos = document.getElementById('listapersonajes');
    if (!contenedorDatos) {
        console.error("Error crítico: No se encontró el contenedor de datos con id '#listapersonajes'.");
        return {};
    }
    const elementosDato = contenedorDatos.querySelectorAll('.personaje');
    const datosAgrupados = {};
    elementosDato.forEach(elemento => {
        const nombreInput = elemento.querySelector('.nombreh');
        const descripcionTextarea = elemento.querySelector('textarea');
        const etiquetaBtn = elemento.querySelector('.change-tag-btn');
        const nombre = nombreInput ? nombreInput.value.trim() : '';
        const descripcion = descripcionTextarea ? descripcionTextarea.value.trim() : '';
        const etiqueta = etiquetaBtn ? (etiquetaBtn.dataset.etiqueta || 'indeterminado').toLowerCase() : 'indeterminado';
        if (etiqueta !== 'indeterminado' && etiqueta !== 'visual' && nombre) {
            if (!datosAgrupados[etiqueta]) {
                datosAgrupados[etiqueta] = [];
            }
            datosAgrupados[etiqueta].push({ nombre, descripcion });
        }
    });
    console.log(`${Object.values(datosAgrupados).reduce((s, a) => s + a.length, 0)} datos agrupados en ${Object.keys(datosAgrupados).length} categorías.`);
    return datosAgrupados;
}

// --- SECCIÓN DE ORQUESTACIÓN PRINCIPAL ---

async function generarInformeExtendido() {
    const informeContainer = document.getElementById('informe-container');
    const botonAnalisis = document.getElementById('analizar-datos-btn');
    if (botonAnalisis) botonAnalisis.disabled = true;

    renderizarPlatzhalters(informeContainer);

    try {
        if (typeof apiKey === 'undefined' || !apiKey) {
            throw new Error("La API Key de Gemini no está definida.");
        }

        const datosDelProyecto = recolectarDatos();
        if (Object.keys(datosDelProyecto).length === 0) {
            throw new Error("No se encontraron datos en el proyecto para analizar.");
        }

        // --- PASO 1: Ejecutar análisis paralelos que no tienen dependencias ---
        actualizarPlatzhalter('platzhalter-nube', 'Identificando personajes para la nube...');
        actualizarPlatzhalter('platzhalter-ritmo-temas', 'Analizando Ritmo y Temas...');
        actualizarPlatzhalter('platzhalter-tono', 'Analizando Tono y Sentimiento...');
        actualizarPlatzhalter('platzhalter-diagnostico', 'Realizando Diagnóstico...');

        const promesasIndependientes = {
            identificarPersonajesNube: ejecutarAnalisisModulo('identificarCategoriasPersonajes', datosDelProyecto),
            analisisTematico: ejecutarAnalisisModulo('analisisTematico', datosDelProyecto),
            analisisTono: ejecutarAnalisisModulo('analisisTono', datosDelProyecto),
            diagnostico: ejecutarAnalisisModulo('diagnostico', datosDelProyecto)
        };

        // --- PASO 2: Flujo de la Trama (dos llamadas secuenciales) ---
        actualizarPlatzhalter('platzhalter-trama', 'Identificando eventos clave...');
        const { nombres_eventos } = await ejecutarAnalisisModulo('identificarEventos', datosDelProyecto, {}, 'gemini-2.0-flash-lite');
        actualizarPlatzhalter('platzhalter-trama', 'Resumiendo y ordenando eventos...');
        const analisisTramaCompleto = await ejecutarAnalisisModulo('resumirYOrdenarEventos', datosDelProyecto, { nombresEventos: nombres_eventos }, 'gemini-2.0-flash-lite');

        // --- PASO 3: Flujo de Personajes (identificación + análisis por lotes en una sola llamada) ---
        actualizarPlatzhalter('platzhalter-personajes', 'Listando todos los personajes para análisis profundo...');
        const { lista_personajes_completa } = await ejecutarAnalisisModulo('listarTodosLosPersonajes', datosDelProyecto, {}, 'gemini-2.5-flash-lite');
        
        const BATCH_SIZE = 12;
        let analisisDetalladoPersonajes = [];
        for (let i = 0; i < lista_personajes_completa.length; i += BATCH_SIZE) {
            const batchNombres = lista_personajes_completa.slice(i, i + BATCH_SIZE);
            actualizarPlatzhalter('platzhalter-personajes', `Analizando lote de personajes (${i + 1}-${i + batchNombres.length} de ${lista_personajes_completa.length})...`);
            
            // UNA SOLA LLAMADA por lote para reducir RPM
            const resultadoLote = await ejecutarAnalisisModulo('analisisDetalladoLotePersonajes', datosDelProyecto, { nombresPersonajes: batchNombres }, 'gemini-2.0-flash-lite');
            
            if (resultadoLote.analisis_personajes && Array.isArray(resultadoLote.analisis_personajes)) {
                 analisisDetalladoPersonajes.push(...resultadoLote.analisis_personajes);
            }
        }

        // --- PASO 4: Esperar análisis independientes y generar la nube de relaciones ---
        const resultadosIndependientes = await Promise.all(Object.values(promesasIndependientes));
        const [
            { categorias_personajes },
            analisisTematico,
            analisisTono,
            analisisDiagnostico
        ] = resultadosIndependientes;

        const datosSoloPersonajesNube = {};
        categorias_personajes.forEach(cat => {
            if (datosDelProyecto[cat]) datosSoloPersonajesNube[cat] = datosDelProyecto[cat];
        });
        actualizarPlatzhalter('platzhalter-nube', 'Generando Nube de Personajes...');
        const analisisNube = await ejecutarAnalisisModulo('nubePersonajes', datosSoloPersonajesNube);

        // --- PASO 5: Ensamblar y renderizar ---
        ultimoInformeGenerado = {
            nube: analisisNube,
            personajesOriginales: Object.values(datosSoloPersonajesNube).flat(),
            personajes: { analisis_detallado: analisisDetalladoPersonajes },
            trama: analisisTramaCompleto,
            temas: analisisTematico,
            tono: analisisTono,
            diagnostico: analisisDiagnostico
        };

        renderizarInformeCompleto(ultimoInformeGenerado);

    } catch (error) {
        console.error("Error detallado durante la generación del informe extendido:", error);
        informeContainer.innerHTML = `<div><strong>¡Ha ocurrido un error!</strong><span>${error.message}</span><p>Revisa la consola del desarrollador para más detalles.</p></div>`;
    } finally {
        if (botonAnalisis) botonAnalisis.disabled = false;
    }
}

async function ejecutarAnalisisModulo(modulo, datos, datosExtra = {}, model = 'gemini-2.5-flash-lite') {
    let prompt;
    switch (modulo) {
        case 'identificarCategoriasPersonajes': prompt = crearPromptIdentificarCategoriasPersonajes(datos); break;
        case 'nubePersonajes': prompt = crearPromptNubePersonajes(datos); break;
        case 'analisisTematico': prompt = crearPromptAnalisisTematico(datos); break;
        case 'analisisTono': prompt = crearPromptTonoSentimiento(datos); break;
        case 'diagnostico': prompt = crearPromptDiagnostico(datos); break;
        case 'listarTodosLosPersonajes': prompt = crearPromptListarPersonajes(datos); break;
        case 'analisisDetalladoLotePersonajes': prompt = crearPromptAnalisisDetalladoLotePersonajes(datos, datosExtra.nombresPersonajes); break;
        case 'identificarEventos': prompt = crearPromptIdentificarEventos(datos); break;
        case 'resumirYOrdenarEventos': prompt = crearPromptResumirYOrdenarEventos(datos, datosExtra.nombresEventos); break;
        default: throw new Error(`Módulo de análisis desconocido: ${modulo}`);
    }
    return await llamarApiGemini(prompt, model);
}

// --- SECCIÓN DE CREACIÓN DE PROMPTS ---

function crearPromptIdentificarCategoriasPersonajes(datos) { const schema = { "categorias_personajes": ["string"] }; return `Identifica qué categorías representan "personajes" (entidades con agencia). Categorías disponibles: [${Object.keys(datos).join(', ')}]. Devuelve SÓLO un JSON con la estructura: ${JSON.stringify(schema)}. Contexto: ${JSON.stringify(datos, null, 2)}`; }
function crearPromptNubePersonajes(datos) { const schema = { "nodos": [{ "id": "string", "relevancia": "number" }], "enlaces": [{ "origen": "string", "destino": "string", "tipo": "string" }] }; return `Analiza personajes y relaciones. Devuelve SÓLO un JSON con 'nodos' (personajes, relevancia 1-10) y 'enlaces'. Estructura: ${JSON.stringify(schema)}. Datos: ${JSON.stringify(datos)}`; }
function crearPromptListarPersonajes(datos) { const schema = { "lista_personajes_completa": ["string"] }; return `Analiza todos los datos del proyecto e identifica a cada entidad individual que sea un personaje. Devuelve SÓLO un JSON con una lista de sus nombres. Estructura: ${JSON.stringify(schema)}. Datos: ${JSON.stringify(datos, null, 2)}`; }
function crearPromptAnalisisDetalladoLotePersonajes(datos, nombresPersonajes) {
    const schema = {
        "analisis_personajes": [{
            "nombre": "string",
            "analisis_texto": ["string", "string"],
            "pentagrama": { "stat1": "number", "stat2": "number", "stat3": "number", "stat4": "number", "stat5": "number" }
        }]
    };
    return `Como experto literario, analiza CADA UNO de los personajes en la lista [${nombresPersonajes.join(', ')}]. Para cada personaje, escribe dos párrafos detallados sobre su rol, personalidad y motivaciones. Luego, define 5 habilidades/estadísticas clave para él y puntúalas de 1 a 10. Devuelve SÓLO un JSON con una clave "analisis_personajes" que contenga un array con los resultados de todos los personajes. La estructura debe ser: ${JSON.stringify(schema)}. Contexto de la historia: ${JSON.stringify(datos)}`;
}
function crearPromptIdentificarEventos(datos) { const schema = { "nombres_eventos": ["string"] }; return `Analiza toda la narrativa, incluyendo datos con etiqueta 'evento' y el resto. Identifica los 5 a 8 eventos más cruciales para la trama. Devuelve SÓLO un JSON con un array de sus nombres. Estructura: ${JSON.stringify(schema)}. Datos: ${JSON.stringify(datos)}`; }
function crearPromptResumirYOrdenarEventos(datos, nombresEventos) { const schema = { "linea_de_tiempo": [{ "nombre": "string", "resumen": "string" }] }; return `Para la lista de eventos [${nombresEventos.join(', ')}], crea un resumen conciso de cada uno basado en el contexto general. Luego, ordénalos cronológicamente. Devuelve SÓLO un JSON con la estructura: ${JSON.stringify(schema)}. Contexto: ${JSON.stringify(datos)}`; }
function crearPromptAnalisisTematico(datos) { const schema = { "analisis_tematico": [{ "tema": "string", "importancia": "number" }] }; return `Identifica los 5 temas principales y su importancia (1-10). Devuelve SÓLO un JSON. Estructura: ${JSON.stringify(schema)}. Datos: ${JSON.stringify(datos)}`; }
function crearPromptTonoSentimiento(datos) { const schema = { "tono_general": "string", "sentimiento_por_evento": [{ "nombre_evento": "string", "puntuacion_sentimiento": "number" }] }; return `Describe el tono general. Asigna una puntuación de sentimiento (-1.0 a 1.0) a eventos clave. Devuelve SÓLO un JSON. Estructura: ${JSON.stringify(schema)}. Datos: ${JSON.stringify(datos)}`; }
function crearPromptDiagnostico(datos) { const schema = { "puntos_fuertes": ["string"], "posibles_inconsistencias": [{ "tipo": "string", "descripcion": "string", "sugerencia_resolucion": "string" }], "oportunidades_narrativas": [{ "descripcion": "string", "sugerencia_desarrollo": "string" }] }; return `Actúa como editor experto. Busca inconsistencias y oportunidades. Devuelve SÓLO un JSON. Estructura: ${JSON.stringify(schema)}. Datos: ${JSON.stringify(datos)}`; }

// --- SECCIÓN DE RENDERIZADO ---

function renderizarPlatzhalters(container) { container.innerHTML = `<div id="platzhalter-nube" class="platzhalter-card full-width-card"><h3>Generando Nube de Personajes...</h3><div class="spinner"></div></div><div id="platzhalter-personajes" class="platzhalter-card full-width-card"><h3>Analizando Personajes...</h3><div class="spinner"></div></div><div id="platzhalter-trama" class="platzhalter-card"><h3>Analizando Trama...</h3><div class="spinner"></div></div><div id="platzhalter-ritmo-temas" class="platzhalter-card"><h3>Analizando Ritmo y Temas...</h3><div class="spinner"></div></div><div id="platzhalter-tono" class="platzhalter-card full-width-card"><h3>Analizando Tono y Sentimiento...</h3><div class="spinner"></div></div><div id="platzhalter-diagnostico" class="platzhalter-card full-width-card"><h3>Realizando Diagnóstico...</h3><div class="spinner"></div></div>`;}
function actualizarPlatzhalter(id, mensaje) { const container = document.getElementById(id); if (container) { container.querySelector('h3').textContent = mensaje; } }

function renderizarSeccionNubePersonajes(data, personajesOriginales) { const container = document.getElementById('platzhalter-nube'); if (!container) return; const canvasId = 'character-cloud-canvas'; container.innerHTML = `<h3>Nube de Relaciones</h3><canvas id="${canvasId}" style="width: 100%; display: block; border: 1px solid #ccc; border-radius: 8px;"></canvas>`; const canvas = document.getElementById(canvasId); const ctx = canvas.getContext('2d'); const anchoReal = canvas.clientWidth; canvas.width = anchoReal; canvas.height = Math.max(400, anchoReal / 2); let nodos = data.nodos.map(n => ({ id: n.id, relevancia: n.relevancia, x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: 0, vy: 0, radius: 5 + n.relevancia * 3.9 })); function simular() { for (let i = 0; i < nodos.length; i++) { const nodoA = nodos[i]; for (let j = i + 1; j < nodos.length; j++) { const nodoB = nodos[j]; const dx = nodoB.x - nodoA.x, dy = nodoB.y - nodoA.y; let dist = Math.sqrt(dx * dx + dy * dy); if (dist < 1) dist = 1; const fuerza = -200 / (dist * dist); nodoA.vx += fuerza * dx / dist; nodoA.vy += fuerza * dy / dist; nodoB.vx -= fuerza * dx / dist; nodoB.vy -= fuerza * dy / dist; } nodoA.vx += (canvas.width / 2 - nodoA.x) * 0.0005; nodoA.vy += (canvas.height / 2 - nodoA.y) * 0.0005; } data.enlaces.forEach(enlace => { const origen = nodos.find(n => n.id === enlace.origen); const destino = nodos.find(n => n.id === enlace.destino); if (origen && destino) { const dx = destino.x - origen.x, dy = destino.y - origen.y; const dist = Math.sqrt(dx * dx + dy * dy); const fuerza = 0.01 * (dist - 150); origen.vx += fuerza * dx / dist; origen.vy += fuerza * dy / dist; destino.vx -= fuerza * dx / dist; destino.vy -= fuerza * dy / dist; } }); nodos.forEach(nodo => { nodo.x += nodo.vx; nodo.y += nodo.vy; nodo.vx *= 0.95; nodo.vy *= 0.95; nodo.x = Math.max(nodo.radius, Math.min(canvas.width - nodo.radius, nodo.x)); nodo.y = Math.max(nodo.radius, Math.min(canvas.height - nodo.radius, nodo.y)); }); } function dibujar() { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1; data.enlaces.forEach(enlace => { const o = nodos.find(n => n.id === enlace.origen), d = nodos.find(n => n.id === enlace.destino); if (o && d) { ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(d.x, d.y); ctx.stroke(); } }); nodos.forEach(nodo => { ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'; ctx.shadowBlur = 6; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2; ctx.beginPath(); ctx.arc(nodo.x, nodo.y, nodo.radius, 0, 2 * Math.PI); ctx.fillStyle = '#ffababff'; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#000'; ctx.font = '18px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(nodo.id, nodo.x, nodo.y); }); } function loop() { simular(); dibujar(); requestAnimationFrame(loop); } loop(); }

function renderizarSeccionPersonajesAvanzado(data) {
    const container = document.getElementById('platzhalter-personajes');
    if (!container) return;
    let content = '<div class="character-grid">';
    data.analisis_detallado.forEach((personaje, index) => {
        const canvasId = `personaje-radar-${index}`;
        content += `<div class="character-card">
            <h4>${personaje.nombre}</h4>
            <div class="character-analysis-text">
                <p>${personaje.analisis_texto[0]}</p>
                <p>${personaje.analisis_texto[1]}</p>
            </div>
            <div class="chart-container-radar"><canvas id="${canvasId}"></canvas></div>
        </div>`;
    });
    content += '</div>';
    container.innerHTML = `<h3>Análisis Profundo de Personajes</h3>${content}`;
    setTimeout(() => {
        data.analisis_detallado.forEach((personaje, index) => {
            const canvasId = `personaje-radar-${index}`;
            const labels = Object.keys(personaje.pentagrama);
            const scores = Object.values(personaje.pentagrama);
            renderRadarChart(canvasId, labels, scores, personaje.nombre);
        });
    }, 100);
}

function renderizarSeccionTrama(data) {
    const container = document.getElementById('platzhalter-trama');
    if (!container) return;
    const timelineStyles = `<style>.timeline-container-horizontal{position:relative;width:95%;margin:50px auto 20px auto;padding-top:20px}.timeline-line{position:absolute;top:10px;left:0;width:100%;height:3px;background-color:#e0e0e0;border-radius:2px}.timeline-events{position:relative;display:flex;justify-content:space-between;height:100%}.timeline-event{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;width:100px;cursor:pointer}.timeline-dot{position:absolute;top:0;width:15px;height:15px;background-color:#3498db;border-radius:50%;transform:translateY(-45%);border:2px solid white;box-shadow:0 0 5px rgba(0,0,0,0.2);transition:transform .2s ease}.timeline-event:hover .timeline-dot{transform:translateY(-45%) scale(1.5)}.timeline-label{margin-top:25px;font-size:.8em;font-weight:500;color:#333}.dark-theme .timeline-line{background-color:#444}.dark-theme .timeline-label{color:#ccc}#timeline-tooltip{position:absolute;display:none;background:rgba(0,0,0,0.8);color:white;padding:10px;border-radius:6px;font-size:.9em;max-width:300px;z-index:1000;pointer-events:none;}</style>`;
    let timelineHTML = '';
    if (data.linea_de_tiempo && data.linea_de_tiempo.length > 0) {
        timelineHTML = `<hr><h4>Línea de Tiempo de Eventos Clave</h4><div class="timeline-container-horizontal"><div class="timeline-line"></div><div class="timeline-events">`;
        data.linea_de_tiempo.forEach(evento => {
            timelineHTML += `<div class="timeline-event" data-resumen="${evento.resumen.replace(/"/g, '&quot;')}"><div class="timeline-dot"></div><div class="timeline-label">${evento.nombre}</div></div>`;
        });
        timelineHTML += `</div></div>`;
    }
    container.innerHTML = `<h3>Análisis de Trama</h3>${timelineStyles}${timelineHTML}<div id="timeline-tooltip"></div>`;
    
    const timelineContainer = container.querySelector('.timeline-events');
    const tooltip = document.getElementById('timeline-tooltip');
    if (timelineContainer && tooltip) {
        timelineContainer.addEventListener('mouseover', e => {
            const eventNode = e.target.closest('.timeline-event');
            if (eventNode && eventNode.dataset.resumen) {
                tooltip.textContent = eventNode.dataset.resumen;
                tooltip.style.display = 'block';
            }
        });
        timelineContainer.addEventListener('mousemove', e => {
            if (tooltip.style.display === 'block') {
                const rect = container.getBoundingClientRect();
                tooltip.style.left = `${e.clientX - rect.left + 15}px`;
                tooltip.style.top = `${e.clientY - rect.top + 15}px`;
            }
        });
        timelineContainer.addEventListener('mouseout', e => {
            const eventNode = e.target.closest('.timeline-event');
            if (eventNode) {
                tooltip.style.display = 'none';
            }
        });
    }
}

function renderizarSeccionRitmoYTemas(datosTrama, datosTemas) { const container = document.getElementById('platzhalter-ritmo-temas'); if (!container) return; container.innerHTML = `<h3>Análisis de Ritmo y Temas</h3><div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;"><div style="flex: 1; min-width: 300px;"><h4>Temas Principales</h4><div style="position: relative; height: 300px; width: 100%;"><canvas id="themes-chart"></canvas></div></div></div>`; const temasLabels = datosTemas.analisis_tematico.map(t => t.tema); const temasData = datosTemas.analisis_tematico.map(t => t.importancia); setTimeout(() => { renderDoughnutChart('themes-chart', temasLabels, temasData, 'Importancia de Temas'); }, 100); }
function renderizarSeccionTono(datosTono) { const container = document.getElementById('platzhalter-tono'); if (!container) return; const labels = datosTono.sentimiento_por_evento.map(e => e.nombre_evento); const data = datosTono.sentimiento_por_evento.map(e => e.puntuacion_sentimiento); container.innerHTML = `<h3>Análisis de Tono y Sentimiento</h3><p><strong>Tono General:</strong> ${datosTono.tono_general}</p><h4>Viaje Emocional de la Trama</h4><div class="chart-container"><canvas id="sentiment-chart"></canvas></div>`; setTimeout(() => { renderLineChart('sentiment-chart', labels, data, 'Puntuación de Sentimiento'); }, 100); }
function renderizarSeccionDiagnostico(data) { const container = document.getElementById('platzhalter-diagnostico'); if (!container) return; const content = `<h4>Puntos Fuertes</h4><ul>${data.puntos_fuertes.map(p => `<li>${p}</li>`).join('')}</ul><hr><h4>Posibles Inconsistencias</h4><ul>${data.posibles_inconsistencias.map(i => `<li><b>${i.tipo}:</b> ${i.descripcion} <br><i>Sugerencia: ${i.sugerencia_resolucion}</i></li>`).join('')}</ul><hr><h4>Oportunidades Narrativas</h4><ul>${data.oportunidades_narrativas.map(o => `<li>${o.descripcion} <br><i>Sugerencia: ${o.sugerencia_desarrollo}</i></li>`).join('')}</ul>`; container.innerHTML = `<h3>Diagnóstico Proactivo</h3>${content}`; }

// --- SECCIÓN DE UTILIDADES (API Y GRÁFICOS) ---

async function llamarApiGemini(prompt, model = 'gemini-2.5-flash-lite') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    if (!response.ok) throw new Error(`Error de API (${model}): ${response.status}. Detalles: ${await response.text()}`);
    const data = await response.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!replyText) throw new Error("La respuesta de la IA estaba vacía o no tenía el formato esperado.");
    let textoJsonLimpio = replyText.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || replyText;
    const inicioJson = textoJsonLimpio.indexOf('{');
    const finJson = textoJsonLimpio.lastIndexOf('}');
    if (inicioJson === -1 || finJson <= inicioJson) throw new Error("No se pudo encontrar un objeto JSON en la respuesta.");
    textoJsonLimpio = textoJsonLimpio.substring(inicioJson, finJson + 1);
    try { return JSON.parse(textoJsonLimpio); } catch (e) { console.error("Fallo al parsear JSON:", textoJsonLimpio); throw new Error(`Error al analizar el JSON de la IA: ${e.message}`); }
}

function renderRadarChart(canvasId, labels, data, label) { const ctx = document.getElementById(canvasId)?.getContext('2d'); if (!ctx) return; new Chart(ctx, { type: 'radar', data: { labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)), datasets: [{ label: label, data: data, fill: true, backgroundColor: 'rgba(54, 162, 235, 0.2)', borderColor: 'rgb(54, 162, 235)', }] }, options: { responsive: true, maintainAspectRatio: false, scales: { r: { suggestedMin: 0, suggestedMax: 10, ticks: { backdropColor: 'rgba(255, 255, 255, 0.75)' } } } } }); }
function renderDoughnutChart(canvasId, labels, data, label) { const ctx = document.getElementById(canvasId)?.getContext('2d'); if (!ctx) return; new Chart(ctx, { type: 'doughnut', data: { labels: labels, datasets: [{ label: label, data: data, backgroundColor: ['rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)'], hoverOffset: 4 }] }, options: { responsive: true, maintainAspectRatio: false, } }); }
function renderLineChart(canvasId, labels, data, label) { const ctx = document.getElementById(canvasId)?.getContext('2d'); if (!ctx) return; new Chart(ctx, { type: 'line', data: { labels: labels, datasets: [{ label: label, data: data, fill: true, borderColor: 'rgb(75, 192, 192)', backgroundColor: 'rgba(75, 192, 192, 0.2)', tension: 0.1, pointRadius: 5, pointHoverRadius: 8 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { suggestedMin: -1, suggestedMax: 1 } } } }); }

function renderizarInformeCompleto(datosInforme) {
    const informeContainer = document.getElementById('informe-container');
    if (!informeContainer) return;
    if (!datosInforme) { informeContainer.innerHTML = '<p>No hay informe para mostrar.</p>'; return; }

    renderizarPlatzhalters(informeContainer);

    if (datosInforme.nube && datosInforme.personajesOriginales) { renderizarSeccionNubePersonajes(datosInforme.nube, datosInforme.personajesOriginales); }
    if (datosInforme.personajes) { renderizarSeccionPersonajesAvanzado(datosInforme.personajes); }
    if (datosInforme.trama) { renderizarSeccionTrama(datosInforme.trama); }
    if (datosInforme.temas) { renderizarSeccionRitmoYTemas(null, datosInforme.temas); }
    if (datosInforme.tono) { renderizarSeccionTono(datosInforme.tono); }
    if (datosInforme.diagnostico) { renderizarSeccionDiagnostico(datosInforme.diagnostico); }
}

