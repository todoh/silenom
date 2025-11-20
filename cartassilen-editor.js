// =================================================================
// ARCHIVO: cartassilen-editor.js
// Gestiona la UI del editor de cartas, guardado, carga y eventos.
// VERSIÓN COMPATIBLE CON "CARTAS SILEN - FASE 3"
// =================================================================

let editorCartasInicializado = false;

function configurarEditorDeCartas() {
    const btnCrearConIA = document.getElementById("btn-crear-con-ia");
    if (!btnCrearConIA || editorCartasInicializado) return;

    editorCartasInicializado = true;
    console.log("Componentes del editor de cartas encontrados. Inicializando ahora...");

    // --- 1. SELECCIÓN DE ELEMENTOS DEL DOM ---
    const inputCoste = document.getElementById("input-coste");
    const inputPoder = document.getElementById("input-poder");
    const inputTipo = document.getElementById("select-tipo-carta");
    const inputNombre = document.getElementById("input-nombre-carta");
    const inputImagen = document.getElementById("input-imagen-carta");
    const textareaTexto = document.getElementById("textarea-texto-carta");
    const previewImagen = document.getElementById("preview-imagen-carta");
    const contenedorCartas = document.getElementById("contenedor-cartas");

    const btnNuevaCarta = document.getElementById("btn-nueva-carta-manual");
    const btnGuardarCarta = document.getElementById("btn-guardar-carta");
    const btnExportarCartas = document.getElementById("btn-exportar-cartas");
    const btnGenerarImagenIA = document.getElementById("btn-generar-imagen-ia");
    const btnExportarImagenUnica = document.getElementById("btn-exportar-imagen-unica");

    const btnGuardarJSON = document.getElementById("btn-guardar-json");
    const btnCargarJSON = document.getElementById("btn-cargar-json");
    const inputCargarJSON = document.getElementById("input-cargar-json");
    const btnBorrarTodas = document.getElementById("btn-borrar-todas"); // <-- NUEVO BOTÓN
    
    // --- [NUEVA MODIFICACIÓN] ---
    // Forzar los tipos de carta correctos en el desplegable del editor.
    inputTipo.innerHTML = `
        <option value="ACCION">ACCION</option>
        <option value="ESTADO">ESTADO</option>
    `;
    // --- FIN DE LA MODIFICACIÓN ---

    // --- 2. ESTADO DE LA APLICACIÓN ---
    let cartasGuardadas = [];
    let idCartaEditando = null;
    let generacionesEnCurso = 0;
    const placeholderImagenSrc = "https://placehold.co/320x160/1a1a1a/FFF?text=Ilustraci%C3%B3n";

    // --- 3. FUNCIONES DE UI Y GESTIÓN DE DATOS ---
    const generacionStatusEl = document.createElement('div');
    generacionStatusEl.id = 'ia-generacion-status';
    generacionStatusEl.className = 'generacion-status-notificacion';
    generacionStatusEl.style.display = 'none';
    btnCrearConIA.parentNode.insertBefore(generacionStatusEl, btnCrearConIA.nextSibling);

    const actualizarContadorGeneraciones = (cambio) => {
        generacionesEnCurso += cambio;
        if (generacionesEnCurso > 0) {
            generacionStatusEl.textContent = `✨ ${generacionesEnCurso} carta(s) generándose...`;
            generacionStatusEl.style.display = 'inline-block';
        } else {
            generacionesEnCurso = 0;
            generacionStatusEl.style.display = 'none';
        }
    };

    const manejarSubidaImagen = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => { previewImagen.src = e.target.result; };
            reader.readAsDataURL(file);
        }
    };

    const limpiarEditor = () => {
        inputCoste.value = 0;
        inputPoder.value = 0;
        inputTipo.value = "ESTADO";
        inputNombre.value = "";
        textareaTexto.value = "";
        inputImagen.value = "";
        previewImagen.src = placeholderImagenSrc;
        idCartaEditando = null;
    };

    const persistirDatos = () => {
        try {
            localStorage.setItem("silenosCartasColeccionables", JSON.stringify(cartasGuardadas));
        } catch (error) {
            console.error("Error al guardar en localStorage:", error);
        }
    };

    const guardarCarta = () => {
        const nombre = inputNombre.value.trim();
        if (!nombre) {
            alert("Por favor, introduce un nombre para la carta.");
            return;
        }
        const datosCarta = {
            id: idCartaEditando || `carta-${Date.now()}`,
            nombre,
            coste: parseInt(inputCoste.value) || 0,
            poder: parseInt(inputPoder.value) || 0,
            tipo: inputTipo.value,
            texto: textareaTexto.value,
            imagenSrc: previewImagen.src
        };
        if (idCartaEditando) {
            const index = cartasGuardadas.findIndex(carta => carta.id === idCartaEditando);
            if (index !== -1) cartasGuardadas[index] = datosCarta;
        } else {
            cartasGuardadas.push(datosCarta);
        }
        limpiarEditor();
        persistirDatos();
        renderizarListaCartas();
    };
    
    const cargarCartaEnEditor = (idCarta) => {
        const carta = cartasGuardadas.find(c => c.id === idCarta);
        if (!carta) return;
        inputCoste.value = carta.coste;
        inputPoder.value = carta.poder;
        inputTipo.value = carta.tipo;
        inputNombre.value = carta.nombre;
        textareaTexto.value = carta.texto;
        previewImagen.src = carta.imagenSrc;
        idCartaEditando = carta.id;
        document.getElementById("editor-cartas").scrollIntoView({ behavior: 'smooth' });
    };

    const eliminarCarta = (id) => {
        const carta = cartasGuardadas.find(c => c.id === id);
        if (!carta) return;
        if (confirm(`¿Estás seguro de que quieres eliminar la carta "${carta.nombre}"?`)) {
            cartasGuardadas = cartasGuardadas.filter(c => c.id !== id);
            persistirDatos();
            renderizarListaCartas();
            if (idCartaEditando === id) {
                limpiarEditor();
            }
        }
    };

    // --- [NUEVA FUNCIÓN] ---
    const borrarTodasLasCartas = () => {
        if (cartasGuardadas.length === 0) {
            alert("No hay cartas que borrar.");
            return;
        }
        if (confirm("¿Estás seguro de que quieres eliminar TODAS las cartas de la colección? Esta acción no se puede deshacer.")) {
            cartasGuardadas = [];
            persistirDatos();
            renderizarListaCartas();
            limpiarEditor();
        }
    };
    // --- FIN DE LA NUEVA FUNCIÓN ---

    const renderizarListaCartas = () => {
        contenedorCartas.innerHTML = "";
        if (cartasGuardadas.length === 0) {
            contenedorCartas.innerHTML = "<p>No hay cartas creadas aún.</p>";
            return;
        }
        cartasGuardadas.forEach(carta => {
            const miniatura = document.createElement("div");
            miniatura.className = "carta-miniatura";
            miniatura.setAttribute("data-id", carta.id);
            miniatura.innerHTML = `<img src="${carta.imagenSrc}" alt="${carta.nombre}"><div class="nombre">${carta.nombre}</div><small>${carta.tipo}</small>`;
            
            const btnEliminar = document.createElement("button");
            btnEliminar.className = "btn-eliminar-miniatura";
            btnEliminar.innerHTML = "🗑️";
            btnEliminar.title = "Eliminar esta carta";
            btnEliminar.addEventListener("click", (e) => {
                e.stopPropagation();
                eliminarCarta(carta.id);
            });

            miniatura.appendChild(btnEliminar);
            miniatura.addEventListener("click", () => cargarCartaEnEditor(carta.id));
            contenedorCartas.appendChild(miniatura);
        });
    };

    const cargarDatos = () => {
        const datosGuardados = localStorage.getItem("silenosCartasColeccionables");
        if (datosGuardados) {
            try {
                cartasGuardadas = JSON.parse(datosGuardados);
            } catch (error) {
                cartasGuardadas = [];
            }
        }
        renderizarListaCartas();
    };

    const cargarCartaGeneradaEnEditor = (cartaCompleta) => {
        limpiarEditor(); 
        inputCoste.value = cartaCompleta.coste;
        inputPoder.value = cartaCompleta.poder;
        inputTipo.value = cartaCompleta.tipo;
        inputNombre.value = cartaCompleta.nombre;
        textareaTexto.value = cartaCompleta.texto;
        previewImagen.src = cartaCompleta.imagenSrc;
    };

    const guardarCartasAJSON = () => {
        if (cartasGuardadas.length === 0) {
            alert("No hay cartas para guardar.");
            return;
        }
        const dataStr = JSON.stringify(cartasGuardadas, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cartas_base_export.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const manejarCargaDeJSON = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const nuevasCartas = JSON.parse(e.target.result);
                if (!Array.isArray(nuevasCartas)) throw new Error("El archivo JSON debe ser un array.");
                
                nuevasCartas.forEach(nuevaCarta => {
                    if (nuevaCarta && nuevaCarta.id && nuevaCarta.nombre) {
                        const indexExistente = cartasGuardadas.findIndex(c => c.id === nuevaCarta.id);
                        if (indexExistente !== -1) {
                            cartasGuardadas[indexExistente] = nuevaCarta;
                        } else {
                            cartasGuardadas.push(nuevaCarta);
                        }
                    }
                });
                persistirDatos();
                renderizarListaCartas();
                alert(`¡Se han cargado y/o actualizado ${nuevasCartas.length} cartas!`);
            } catch (error) {
                alert(`Error al cargar el archivo: ${error.message}`);
            } finally {
                inputCargarJSON.value = '';
            }
        };
        reader.readAsText(file);
    };

    const clonarEstilosParaCanvas = (originalEl, tempEl) => {
        const styles = window.getComputedStyle(originalEl);
        const propiedades = [
            'width', 'height', 'fontFamily', 'fontSize', 'fontWeight', 'color', 
            'textAlign', 'lineHeight', 'padding', 'margin', 'border', 
            'borderRadius', 'backgroundColor', 'boxSizing', 'display', 
            'justifyContent', 'alignItems', 'position', 'top', 'left', 'right', 'bottom'
        ];
        propiedades.forEach(prop => { tempEl.style[prop] = styles[prop]; });
        tempEl.style.display = 'flex';
        tempEl.style.alignItems = 'center';
        tempEl.style.justifyContent = 'center';
        if (originalEl.id === 'input-nombre-carta' || originalEl.classList.contains('nombre-carta')) {
             tempEl.style.justifyContent = 'flex-start';
        }
    };

    const exportarCartaComoPNG = (carta) => {
        return new Promise((resolve, reject) => {
            if (typeof html2canvas === 'undefined') {
                return reject(new Error("La biblioteca html2canvas no está cargada."));
            }

            const originalElement = document.querySelector(".carta-preview");
            if (!originalElement) {
                return reject(new Error("No se encontró el elemento .carta-preview para clonar."));
            }

            const cartaClone = originalElement.cloneNode(true);
            const offscreenContainer = document.createElement('div');
            offscreenContainer.style.position = 'absolute';
            offscreenContainer.style.left = '-9999px';
            offscreenContainer.style.top = '0px';
            offscreenContainer.appendChild(cartaClone);
            document.body.appendChild(offscreenContainer);
            
            const cloneCoste = cartaClone.querySelector(".coste-carta > input");
            const clonePoder = cartaClone.querySelector(".poder-carta > input");
            const cloneTipo = cartaClone.querySelector(".tipo-carta > select");
            const cloneNombre = cartaClone.querySelector(".nombre-carta > input");
            const cloneTexto = cartaClone.querySelector(".texto-carta > textarea");
            const cloneImagen = cartaClone.querySelector(".imagen-carta > img");
            const cloneControles = cartaClone.querySelector('.image-controls');

            if (cloneControles) cloneControles.style.display = 'none';

            cloneCoste.value = carta.coste;
            clonePoder.value = carta.poder;
            cloneTipo.value = carta.tipo;
            cloneNombre.value = carta.nombre;
            cloneTexto.value = carta.texto;

            cloneImagen.crossOrigin = "anonymous";
            cloneImagen.src = carta.imagenSrc || placeholderImagenSrc;

            const onImageLoad = () => {
                const elementos = [
                    { el: cloneCoste, tag: 'span' },
                    { el: clonePoder, tag: 'span' },
                    { el: cloneTipo, tag: 'span' },
                    { el: cloneNombre, tag: 'span' },
                    { el: cloneTexto, tag: 'div' }
                ];
                
                elementos.forEach(item => {
                    const originalEl = item.el;
                    const tempEl = document.createElement(item.tag);
                    tempEl.className = originalEl.parentElement.className;
                    clonarEstilosParaCanvas(originalEl, tempEl);
                    
                    let valor = (originalEl.tagName === 'SELECT') ? originalEl.options[originalEl.selectedIndex]?.text || '' : originalEl.value;
                    
                    if (item.tag === 'div') {
                        tempEl.innerText = valor;
                        tempEl.style.whiteSpace = 'pre-wrap';
                        tempEl.style.wordWrap = 'break-word';
                        tempEl.style.display = 'block';
                        tempEl.style.padding = window.getComputedStyle(originalEl).padding;
                        tempEl.style.height = '100%';

                    } else {
                        tempEl.innerText = valor;
                    }

                    originalEl.style.display = 'none';
                    originalEl.parentElement.appendChild(tempEl);
                });

                html2canvas(cartaClone, {
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: null,
                    scale: 2
                }).then(canvas => {
                    const imageDataUrl = canvas.toDataURL("image/png");
                    if (typeof exportarDataURLComoPNG === 'function') {
                        exportarDataURLComoPNG(imageDataUrl, carta.nombre);
                    } else {
                        const a = document.createElement('a');
                        a.href = imageDataUrl;
                        a.download = `${carta.nombre || 'carta_sin_nombre'}.png`;
                        a.click();
                    }
                    resolve();
                }).catch(err => {
                    console.error(`Error en html2canvas para la carta "${carta.nombre}":`, err);
                    reject(err);
                }).finally(() => {
                    document.body.removeChild(offscreenContainer);
                });
            };

            if (cloneImagen.complete && cloneImagen.naturalHeight !== 0) {
                onImageLoad();
            } else {
                cloneImagen.onload = onImageLoad;
                cloneImagen.onerror = () => {
                    console.warn(`No se pudo cargar la imagen para ${carta.nombre} en el clon, se usará el placeholder.`);
                    cloneImagen.src = placeholderImagenSrc; 
                };
            }
        });
    };

    const exportarTodasComoPNGsEnTandas = async () => {
        if (cartasGuardadas.length === 0) {
            alert("No hay cartas para exportar.");
            return;
        }

        const TANDA_SIZE = 9;
        const btn = btnExportarCartas;
        const textoOriginal = btn.textContent;
        let exportadasConExito = 0;

        btn.disabled = true;

        const cartasAExportar = [...cartasGuardadas]; 

        for (let i = 0; i < cartasAExportar.length; i += TANDA_SIZE) {
            const tanda = cartasAExportar.slice(i, i + TANDA_SIZE);
            const numeroTanda = (i / TANDA_SIZE) + 1;
            const totalTandas = Math.ceil(cartasAExportar.length / TANDA_SIZE);
            
            btn.textContent = `Exportando tanda ${numeroTanda}/${totalTandas}...`;

            const resultados = await Promise.allSettled(tanda.map(exportarCartaComoPNG));
            
            resultados.forEach(resultado => {
                if (resultado.status === 'fulfilled') {
                    exportadasConExito++;
                }
            });
            
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        btn.disabled = false;
        btn.textContent = textoOriginal;
        alert(`Exportación completada. Se procesaron ${exportadasConExito} de ${cartasAExportar.length} cartas.`);
    };
    
    // --- 4. ASIGNACIÓN DE EVENT LISTENERS ---
    btnNuevaCarta.addEventListener("click", limpiarEditor);
    btnGuardarCarta.addEventListener("click", guardarCarta);
    btnExportarCartas.addEventListener("click", exportarTodasComoPNGsEnTandas);
    inputImagen.addEventListener("change", manejarSubidaImagen);
    btnBorrarTodas.addEventListener("click", borrarTodasLasCartas); // <-- NUEVO LISTENER

    btnCrearConIA.addEventListener("click", () => {
        if (typeof iniciarFlujoDeGeneracionCompleta === 'function') {
            const onGeneracionCompleta = (cartaCompleta) => {
                cargarCartaGeneradaEnEditor(cartaCompleta);
                const nuevoID = `carta-${Date.now()}`;
                const datosCarta = {
                    id: nuevoID,
                    nombre: cartaCompleta.nombre,
                    coste: cartaCompleta.coste,
                    poder: cartaCompleta.poder,
                    tipo: cartaCompleta.tipo,
                    texto: cartaCompleta.texto,
                    imagenSrc: cartaCompleta.imagenSrc
                };
                cartasGuardadas.push(datosCarta);
                persistirDatos();
                renderizarListaCartas();
                idCartaEditando = nuevoID;
                actualizarContadorGeneraciones(-1);
                console.log(`¡Carta "${cartaCompleta.nombre}" generada y guardada!`);
            };
            const onGeneracionError = (error) => {
                console.error("Error en el flujo de generación completa:", error);
                alert(`Ocurrió un error al generar la carta: ${error.message}`);
                actualizarContadorGeneraciones(-1);
            };
            iniciarFlujoDeGeneracionCompleta(onGeneracionCompleta, onGeneracionError, actualizarContadorGeneraciones);
        } else {
            alert("Error: La función para iniciar la generación con IA no está disponible.");
        }
    });
    
    btnGenerarImagenIA.addEventListener("click", async () => {
        const nombre = inputNombre.value.trim();
        const texto = textareaTexto.value.trim();
        const tipo = inputTipo.value;
        if (!nombre && !texto) {
            alert("Introduce un nombre o texto para generar una imagen.");
            return;
        }
        if (typeof iniciarGeneracionDeImagenSolo !== 'function') {
            alert("Error: La función para generar la imagen no está disponible.");
            return;
        }
        btnGenerarImagenIA.disabled = true;
        btnGenerarImagenIA.textContent = "Generando...";
        try {
            const imageUrl = await iniciarGeneracionDeImagenSolo(nombre, tipo, texto);
            if (imageUrl) {
                previewImagen.src = imageUrl;
                alert("¡Ilustración generada con éxito!");
            }
        } catch (error) {
            alert(`Error al generar la ilustración: ${error.message}`);
        } finally {
            btnGenerarImagenIA.disabled = false;
            btnGenerarImagenIA.textContent = "Generar Imagen (IA)";
        }
    });

    btnExportarImagenUnica.addEventListener('click', async () => {
        const btn = btnExportarImagenUnica;
        const cartaActual = {
            id: idCartaEditando || `temp-${Date.now()}`,
            nombre: inputNombre.value.trim() || 'carta_sin_nombre',
            coste: inputCoste.value,
            poder: inputPoder.value,
            tipo: inputTipo.value,
            texto: textareaTexto.value,
            imagenSrc: previewImagen.src
        };

        btn.textContent = "Exportando...";
        btn.disabled = true;
        try {
            await exportarCartaComoPNG(cartaActual);
        } catch (err) {
            alert("Error al exportar la imagen.");
            console.error("Error en la exportación única:", err);
        } finally {
            btn.textContent = "Exportar Imagen";
            btn.disabled = false;
        }
    });

    btnGuardarJSON.addEventListener("click", guardarCartasAJSON);
    btnCargarJSON.addEventListener("click", () => inputCargarJSON.click());
    inputCargarJSON.addEventListener("change", manejarCargaDeJSON);
    
    // --- 5. INICIALIZACIÓN ---
    cargarDatos();
    limpiarEditor();
}

const editorLoaderInterval = setInterval(() => {
    configurarEditorDeCartas();
    if (editorCartasInicializado) {
        clearInterval(editorLoaderInterval);
        console.log("Intervalo de carga del editor detenido.");
    }
}, 500);

