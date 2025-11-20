// =================================================================
// FABRICADOR_AVENTURAS4.JS - Nuevo Sistema de Generación Masiva (Versión 4)
// Basado en 64 Finales Arquetípicos del I Ching
// Modelo: Simétrico de Bifurcación Penúltima
// =================================================================

// --- Alias de Modelos para el Fabricador ---
const MODELO_O4 = 'gemini-2.5-pro';
const MODELO_A4 = 'gemini-2.5-flash'; // Para ramas de 6, 5 y 4 nodos
const MODELO_B4 = 'gemini-2.5-flash-lite'; // Para ramas de 3 nodos
const MODELO_C4 = 'gemini-2.5-flash-lite'; // Para ramas de 2 nodos
const MODELO_D4 = 'gemini-2.0-flash'; // Para ramas secundarias de 1 nodo
window.contadorMomentosGlobal = window.contadorMomentosGlobal || 0;
// =================================================================
// GESTIÓN DEL MODAL DEL FABRICADOR (V4)
// =================================================================
 
/**
 * [NUEVA FUNCIÓN HELPER]
 * Busca un elemento de dato en el DOM por su nombre exacto.
 * @param {string} nombre - El nombre del dato a buscar (ej: "Mapa").
 * @returns {HTMLElement|null} El elemento del dato si se encuentra, o null.
 */
function buscarDatoPorNombre(nombre) {
    const todosLosDatos = document.querySelectorAll('#listapersonajes .personaje');
    for (const datoEl of todosLosDatos) {
        if (datoEl.querySelector('.nombreh')?.value === nombre) {
            return datoEl;
        }
    }
    return null;
}

 
/**
 * Abre el modal específico para el Fabricador de Novelas de Aventura V4.
 */
function abrirModalFabricadorAventura4() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-fabricador-aventura');
    if (!overlay || !modal) {
        console.error("No se encontraron los elementos del modal del Fabricador de Aventuras.");
        return;
    }

    overlay.style.display = 'block';
    modal.style.display = 'flex';
    overlay.onclick = cerrarModalFabricadorAventura4;

    const generarBtn = document.getElementById('generar-fabricador-btn-modal');
    // Clonar para evitar listeners duplicados
    const nuevoGenerarBtn = generarBtn.cloneNode(true);
    generarBtn.parentNode.replaceChild(nuevoGenerarBtn, generarBtn);
    nuevoGenerarBtn.addEventListener('click', iniciarFabricacionNovelaAventura4);
}

/**
 * Cierra el modal del Fabricador de Novelas de Aventura V4.
 */
function cerrarModalFabricadorAventura4() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-fabricador-aventura');
    if (overlay && modal) {
        overlay.style.display = 'none';
        modal.style.display = 'none';
        overlay.onclick = null;
    }
}

// =================================================================
// LÓGICA DEL "FABRICADOR DE NOVELAS DE AVENTURA" (V4)
// =================================================================

// --- Base de Finales del I Ching (V4) ---
// NOTE: The constant FINALES_I_CHING is assumed to be globally available from the original script.
// If it's not, it should be duplicated here as FINALES_I_CHING4. For this example, we assume it's accessible.
const FINALES_I_CHING4 = [
    { titulo: "1. Lo Creativo", descripcion: "El personaje alcanza un estado de pura potencia creativa, poder e iniciativa. Es un momento de gran fuerza y éxito, donde las acciones son directas y efectivas.", enfoque: "Poder, Creación, Liderazgo, Éxito incondicional." },
    { titulo: "2. Lo Receptivo", descripcion: "El personaje logra su objetivo a través de la paciencia, la devoción y la aceptación. No fuerza los resultados, sino que se adapta y nutre la situación hasta que da sus frutos.", enfoque: "Paciencia, Devoción, Soporte, Adaptabilidad." },
    { titulo: "3. La Dificultad Inicial", descripcion: "Tras un comienzo caótico y lleno de obstáculos, el personaje logra establecer un orden y encontrar su camino, aunque con gran esfuerzo.", enfoque: "Caos, Lucha, Superación, Nacimiento." },
    { titulo: "4. La Necedad Juvenil", descripcion: "El personaje, a través de la inexperiencia y la ignorancia, aprende una dura lección que lo obliga a madurar y a buscar la guía de otros.", enfoque: "Ignorancia, Aprendizaje, Humildad, Madurez." },
    { titulo: "5. La Espera", descripcion: "El personaje comprende que debe aguardar el momento oportuno. La paciencia y la confianza en el proceso natural de las cosas le traen la victoria.", enfoque: "Paciencia, Confianza, Nutrición, Tiempo." },
    { titulo: "6. El Conflicto", descripcion: "Una disputa o confrontación llega a su clímax. El personaje debe gestionarla con sabiduría, sabiendo cuándo luchar y cuándo ceder para evitar un desastre.", enfoque: "Conflicto, Disputa, Mediación, Justicia." },
    { titulo: "7. El Ejército", descripcion: "El personaje reúne aliados y organiza sus fuerzas para enfrentar un gran desafío. La disciplina y un liderazgo claro son la clave del éxito.", enfoque: "Organización, Disciplina, Liderazgo, Causa común." },
    { titulo: "8. La Solidaridad", descripcion: "La unión y la cooperación con otros llevan al personaje a un estado de éxito y seguridad. La lealtad es recompensada.", enfoque: "Unión, Alianza, Cooperación, Comunidad." },
    { titulo: "9. El Poder de lo Pequeño", descripcion: "A través de pequeñas acciones y una atención meticulosa al detalle, el personaje logra contener una gran fuerza y alcanzar sus metas.", enfoque: "Restricción, Detalle, Influencia sutil, Acumulación." },
    { titulo: "10. El Porte", descripcion: "El personaje actúa con corrección y prudencia, incluso en situaciones peligrosas. Su conducta intachable le permite navegar con éxito los desafíos.", enfoque: "Conducta, Prudencia, Cautela, Principios." },
    { titulo: "11. La Paz", descripcion: "Un período de armonía y tranquilidad llega después de la dificultad. El cielo y la tierra están en comunión, y todo florece.", enfoque: "Armonía, Prosperidad, Equilibrio, Buena fortuna." },
    { titulo: "12. El Estancamiento", descripcion: "Una fase de bloqueo y falta de comunicación. El personaje debe retirarse y esperar a que las condiciones cambien para poder avanzar.", enfoque: "Bloqueo, Incomunicación, Retirada, Paciencia." },
    { titulo: "13. La Comunidad con los Hombres", descripcion: "El personaje logra unir a personas diversas bajo un objetivo común y desinteresado, logrando grandes cosas en campo abierto.", enfoque: "Comunidad, Cooperación, Metas compartidas, Universalidad." },
    { titulo: "14. La Posesión de lo Grande", descripcion: "Gracias a la modestia y la claridad, el personaje administra una gran riqueza o poder con sabiduría, atrayendo la bendición del cielo.", enfoque: "Riqueza, Poder, Modestia, Claridad." },
    { titulo: "15. La Modestia", descripcion: "El personaje, a pesar de sus logros, mantiene una actitud humilde, lo que le permite llevar todas sus empresas a una conclusión exitosa.", enfoque: "Humildad, Sencillez, Éxito duradero, Equilibrio." },
    { titulo: "16. El Entusiasmo", descripcion: "La energía y la inspiración del personaje contagian a los demás, permitiéndole mover masas y llevar a cabo grandes empresas.", enfoque: "Inspiración, Alegría, Movimiento, Influencia." },
    { titulo: "17. El Seguimiento", descripcion: "El personaje se adapta a los tiempos y sigue a un líder o una idea con convicción, encontrando el éxito en la flexibilidad y la lealtad.", enfoque: "Adaptación, Lealtad, Flexibilidad, Seguir." },
    { titulo: "18. El Trabajo en lo Echado a Perder", descripcion: "El personaje se enfrenta a una situación corrompida o deteriorada y, con un esfuerzo decidido, logra repararla y traer un nuevo comienzo.", enfoque: "Reparación, Corrección, Renovación, Esfuerzo." },
    { titulo: "19. El Acercamiento", descripcion: "Una energía superior se acerca para bendecir y enseñar. Es un momento de gran fortuna y crecimiento, pero que requiere atención antes de que termine.", enfoque: "Prosperidad, Crecimiento, Liderazgo, Oportunidad." },
    { titulo: "20. La Contemplación", descripcion: "El personaje se toma un tiempo para observar y comprender profundamente una situación, ganando la confianza de los demás a través de su sabiduría.", enfoque: "Observación, Meditación, Sabiduría, Influencia espiritual." },
    { titulo: "21. La Mordedura Tajante", descripcion: "Un obstáculo persistente es eliminado a través de una acción decisiva y enérgica, como una mordedura que atraviesa algo.", enfoque: "Acción decisiva, Justicia, Superar obstáculos, Claridad." },
    { titulo: "22. La Gracia", descripcion: "El personaje encuentra el éxito en la belleza y la forma, pero comprende que la verdadera sustancia es más importante que la mera apariencia.", enfoque: "Belleza, Forma, Apariencia, Estética." },
    { titulo: "23. La Desintegración", descripcion: "Una estructura se derrumba. El personaje debe aceptar la pérdida y esperar el momento adecuado para reconstruir, protegiendo lo poco que queda.", enfoque: "Colapso, Pérdida, Dejar ir, Renovación futura." },
    { titulo: "24. El Retorno", descripcion: "Después de un período de oscuridad o alejamiento, la luz regresa. Es un momento de recuperación y un nuevo comienzo natural.", enfoque: "Regreso, Recuperación, Nuevo comienzo, Ciclos." },
    { titulo: "25. La Inocencia", descripcion: "El personaje actúa de acuerdo con su naturaleza verdadera y sin segundas intenciones, lo que le trae un éxito inesperado y puro.", enfoque: "Inocencia, Espontaneidad, Pureza, Éxito natural." },
    { titulo: "26. El Poder de lo Grande", descripcion: "El personaje acumula una gran fuerza interior y conocimiento, lo que le permite asumir grandes responsabilidades y alcanzar el éxito.", enfoque: "Acumulación, Fuerza interior, Potencial, Responsabilidad." },
    { titulo: "27. Las Comisuras de la Boca", descripcion: "El personaje se enfoca en nutrirse a sí mismo y a los demás, tanto física como espiritualmente. La moderación es la clave.", enfoque: "Nutrición, Cuidado, Moderación, Autocultivo." },
    { titulo: "28. La Preponderancia de lo Grande", descripcion: "Una situación de presión extrema. El personaje debe actuar con audacia y cuidado para evitar que la estructura se rompa.", enfoque: "Presión, Crisis, Acción extraordinaria, Audacia." },
    { titulo: "29. Lo Abismal", descripcion: "El personaje se enfrenta a un peligro repetido. A través de la práctica y la sinceridad de corazón, aprende a navegar el peligro sin caer en él.", enfoque: "P peligro, Repetición, Hábito, Sinceridad." },
    { titulo: "30. Lo Adherente", descripcion: "Como el fuego, el personaje se adhiere a lo correcto y trae luz y claridad al mundo, dependiendo de otros para mantener su brillo.", enfoque: "Claridad, Luz, Dependencia, Conciencia." },
    { titulo: "31. La Influencia (El cortejo)", descripcion: "Una atracción mutua y natural conduce a una unión exitosa. La modestia y la apertura son clave para que la influencia sea positiva.", enfoque: "Atracción, Unión, Relación, Comienzo." },
    { titulo: "32. La Duración", descripcion: "El personaje establece algo que perdura en el tiempo, como una institución o una relación, gracias a la constancia y el movimiento correcto.", enfoque: "Permanencia, Estabilidad, Matrimonio, Institución." },
    { titulo: "33. La Retirada", descripcion: "Frente a una fuerza abrumadora, el personaje se retira estratégicamente para conservar su fuerza y esperar un mejor momento.", enfoque: "Retirada estratégica, Conservación, Distancia, Sabiduría." },
    { titulo: "34. El Gran Vigor", descripcion: "El personaje posee una gran fuerza, pero debe tener cuidado de no usarla de forma imprudente o injusta. El poder debe ser canalizado correctamente.", enfoque: "Gran poder, Autocontrol, Responsabilidad, Potencial." },
    { titulo: "35. El Progreso", descripcion: "El personaje avanza rápidamente y recibe reconocimiento, como el sol que se eleva sobre la tierra. Es un momento de claridad y expansión.", enfoque: "Avance, Reconocimiento, Crecimiento, Claridad." },
    { titulo: "36. El Oscurecimiento de la Luz", descripcion: "El personaje debe ocultar su sabiduría y virtud en tiempos oscuros para sobrevivir, manteniendo su integridad interiormente.", enfoque: "Adversidad, Ocultar la luz, Persecución, Resiliencia." },
    { titulo: "37. El Clan", descripcion: "El personaje encuentra su fuerza y propósito dentro de la familia o un grupo muy unido. Cada miembro cumple su rol para el bien común.", enfoque: "Familia, Comunidad, Roles, Orden interno." },
    { titulo: "38. El Antagonismo", descripcion: "A pesar de la oposición y la polaridad, es posible lograr pequeños éxitos a través de la comprensión de las diferencias.", enfoque: "Oposición, Conflicto, Malentendido, Pequeños acuerdos." },
    { titulo: "39. El Impedimento", descripcion: "Obstáculos bloquean el camino. El personaje debe detenerse, buscar la causa del problema y encontrar aliados sabios para superarlo.", enfoque: "Obstáculo, Bloqueo, Reflexión, Búsqueda de ayuda." },
    { titulo: "40. La Liberación", descripcion: "Un período de tensión y dificultad llega a su fin. El personaje es liberado de una carga y puede volver a la normalidad.", enfoque: "Alivio, Perdón, Solución, Regreso a la normalidad." },
    { titulo: "41. La Merma", descripcion: "El personaje sacrifica algo de menor valor para obtener algo de mayor valor. La sinceridad en el sacrificio conduce al éxito.", enfoque: "Sacrificio, Reducción, Sinceridad, Inversión." },
    { titulo: "42. El Aumento", descripcion: "Un período de crecimiento y buena fortuna. El personaje comparte su abundancia y emula las buenas acciones, lo que genera aún más prosperidad.", enfoque: "Crecimiento, Abundancia, Generosidad, Expansión." },
    { titulo: "43. La Resolución", descripcion: "El personaje debe tomar una decisión firme y exponer un elemento negativo a la luz, actuando con resolución pero sin imprudencia.", enfoque: "Decisión, Revelación, Firmeza, Eliminación." },
    { titulo: "44. El Ir al Encuentro", descripcion: "Una fuerza seductora pero potencialmente peligrosa aparece. El personaje debe ser fuerte y no ceder a la tentación para evitar el desorden.", enfoque: "Tentación, Seducción, Peligro oculto, Firmeza." },
    { titulo: "45. La Reunión", descripcion: "El personaje reúne a la gente, creando una comunidad fuerte y próspera. Se deben tomar precauciones para evitar conflictos internos.", enfoque: "Congregación, Abundancia, Comunidad, Liderazgo." },
    { titulo: "46. La Subida", descripcion: "El personaje asciende con esfuerzo y perseverancia, como una planta que crece. El progreso es constante y conduce a un gran éxito.", enfoque: "Ascenso, Crecimiento, Perseverancia, Esfuerzo." },
    { titulo: "47. La Desazón (La Opresión)", descripcion: "El personaje se encuentra en una situación de agotamiento y restricción. A pesar de las dificultades, la perseverancia y la fe en uno mismo son vitales.", enfoque: "Agotamiento, Restricción, Adversidad, Fortaleza interior." },
    { titulo: "48. El Pozo", descripcion: "El personaje representa una fuente inagotable de nutrición para la comunidad, algo esencial que permanece aunque todo lo demás cambie.", enfoque: "Fuente de vida, Nutrición, Comunidad, Constancia." },
    { titulo: "49. La Revolución", descripcion: "Un cambio radical y fundamental es necesario. El personaje lidera o participa en una transformación que elimina lo viejo y establece un nuevo orden.", enfoque: "Cambio radical, Transformación, Renovación, Nuevo orden." },
    { titulo: "50. El Caldero", descripcion: "El personaje transforma la materia prima en algo refinado y espiritual, como un caldero que cocina los alimentos. Es un símbolo de civilización y alimento espiritual.", enfoque: "Transformación, Alquimia, Civilización, Nutrición espiritual." },
    { titulo: "51. La Conmoción (El Trueno)", descripcion: "Un evento súbito y aterrador sacude al personaje, pero si mantiene la calma y la introspección, puede superar el shock sin perder nada.", enfoque: "Shock, Sorpresa, Miedo, Autocontrol." },
    { titulo: "52. La Quietud (La Montaña)", descripcion: "El personaje alcanza un estado de calma y meditación profunda, deteniendo el movimiento y el pensamiento para encontrar paz interior.", enfoque: "Calma, Meditación, Detención, Paz interior." },
    { titulo: "53. El Desarrollo", descripcion: "El progreso se logra de manera gradual y constante, como el crecimiento de un árbol o el avance de una boda. La paciencia conduce al éxito.", enfoque: "Progreso gradual, Paciencia, Desarrollo, Orden." },
    { titulo: "54. La Muchacha que se Casa", descripcion: "Una situación delicada y potencialmente desafortunada. El personaje debe actuar con extrema precaución para evitar resultados negativos en una unión incorrecta.", enfoque: "Relación delicada, Precaución, Impulso, Consecuencias." },
    { titulo: "55. La Plenitud", descripcion: "El personaje alcanza un pico de abundancia y prosperidad. Debe disfrutarlo sin apego, sabiendo que, como el sol del mediodía, esta fase eventualmente pasará.", enfoque: "Abundancia, Apogeo, Prosperidad, Transitoriedad." },
    { titulo: "56. El Andariego", descripcion: "El personaje es un extraño en tierra extraña. Debe ser modesto y cuidadoso para encontrar un lugar y evitar problemas.", enfoque: "Viaje, Extranjero, Adaptabilidad, Precaución." },
    { titulo: "57. Lo Suave (El Viento)", descripcion: "El personaje logra sus objetivos a través de una influencia sutil y persistente, como el viento que penetra en todas partes.", enfoque: "Influencia sutil, Penetración, Perseverancia, Adaptación." },
    { titulo: "58. Lo Gozoso (El Lago)", descripcion: "La alegría compartida con otros conduce al éxito. El personaje disfruta de la compañía y el intercambio de ideas.", enfoque: "Alegría, Amistad, Comunicación, Celebración." },
    { titulo: "59. La Disolución", descripcion: "El personaje disuelve las barreras y los malentendidos, uniendo a la gente a través de un propósito superior o una fe compartida.", enfoque: "Dispersión, Unión, Reagrupación, Propósito superior." },
    { titulo: "60. La Limitación", descripcion: "El personaje establece límites claros y necesarios para evitar el despilfarro y el caos. La autodisciplina es la clave.", enfoque: "Límites, Disciplina, Orden, Ahorro." },
    { titulo: "61. La Verdad Interior", descripcion: "La sinceridad y la confianza del personaje son tan fuertes que pueden influir incluso en las criaturas más difíciles. La fe mueve montañas.", enfoque: "Sinceridad, Confianza, Fe, Influencia profunda." },
    { titulo: "62. La Preponderancia de lo Pequeño", descripcion: "En tiempos extraordinarios, las pequeñas acciones y la modestia son más efectivas que las grandes hazañas. El personaje debe ser humilde y cuidadoso.", enfoque: "Modestia, Cuidado, Pequeños detalles, Tiempos excepcionales." },
    { titulo: "63. Después de la Consumación", descripcion: "Se ha alcanzado un estado de orden perfecto, pero el personaje debe ser extremadamente cauteloso para mantenerlo, ya que cualquier pequeño error puede llevar al caos.", enfoque: "Orden, Finalización, Cuidado, Mantenimiento." },
    { titulo: "64. Antes de la Consumación", descripcion: "El personaje está al borde de un gran logro, pero la transición aún no ha terminado. La cautela y la planificación cuidadosa son esenciales para cruzar a la otra orilla.", enfoque: "Transición, Potencial, Cautela, Planificación." }
];

/**
 * Punto de entrada para el "Fabricador de Novelas de Aventura" V4.
 */
async function iniciarFabricacionNovelaAventura4() {
    // --- PREPARACIÓN ---
    const sinopsisUsuario = document.getElementById('ia-fabricador-prompt-input').value;
    if (!sinopsisUsuario || sinopsisUsuario.trim() === '') {
        alert("Generación cancelada. Debes proporcionar una idea para la historia.");
        return;
    }
    cerrarModalFabricadorAventura4();

    try {
        progressBarManager.start("Iniciando Fabricador V4: Modelo Simétrico de Bifurcación Penúltima...");

        const finalesDisponibles = [...FINALES_I_CHING4].sort(() => Math.random() - 0.5);

        let nodoInicialEl = document.querySelector('.momento-nodo.inicio');
        if (!nodoInicialEl) {
            nodoInicialEl = crearNodoEnLienzo({
                id: `momento_inicial_${Date.now()}`,
                titulo: "El Origen de los 64 Caminos (V4)",
                descripcion: "Aquí comienza la historia...",
                x: 200, y: 400,
                acciones: []
            });
            marcarComoInicio(nodoInicialEl.id);
        }

        nodoInicialEl.dataset.descripcion = sinopsisUsuario;
        const promptTitulo = `
    **Rol:** Eres un experto en marketing editorial especializado en novelas de aventura.
    **Tarea:** Lee la siguiente sinopsis y crea un título de novela que sea corto (2 a 5 palabras), evocador y comercial.
    
    **Reglas Cruciales:**
    - Tu respuesta debe contener ÚNICAMENTE el texto del título.
    - NO uses comillas.
    - NO añadas ninguna palabra o saludo como "Aquí está el título:".

    **Ejemplo de Tarea:**
    * **Sinopsis de Entrada:** "Un arqueólogo descubre un antiguo mapa en las pirámides de Giza que apunta a una ciudad perdida bajo el hielo de la Antártida, pero una sociedad secreta que protege el secreto lo perseguirá sin descanso."
    * **Respuesta Esperada:** El Secreto de la Ciudad Helada

    **Sinopsis para Trabajar:**
    "${sinopsisUsuario}"
`;
        const nuevoTitulo = await llamarIAConFeedback(promptTitulo, "Creando título V4...", MODELO_D4, false, 1);
        if (nuevoTitulo) {
            nodoInicialEl.querySelector('.momento-titulo').textContent = `V4: ${nuevoTitulo.replace(/["']/g, '')}`;
        }

    
        const contextoGlobal = obtenerContextoSintetizado();

        const generarParDeRamas4 = async (idNodoOrigen, longitudPrincipal, modeloPrincipal) => {
            const idsRamaPrincipal = await generarRamaDeterminista4(idNodoOrigen, longitudPrincipal, modeloPrincipal, finalesDisponibles, contextoGlobal);

            if (idsRamaPrincipal && idsRamaPrincipal.length >= 2) {
                const idNodoPenultimo = idsRamaPrincipal[idsRamaPrincipal.length - 2];
                await generarRamaDeterminista4(idNodoPenultimo, 1, MODELO_D4, finalesDisponibles, contextoGlobal);
            } else if (idsRamaPrincipal && idsRamaPrincipal.length > 0) {
                console.warn(`La rama principal desde ${idNodoOrigen} era demasiado corta para la bifurcación penúltima. Longitud: ${idsRamaPrincipal.length}`);
            }
        };

        // --- FASE 1: Desde Profundidad 0 (Origen) ---
        progressBarManager.set(5, "Fase 1/5 (V4): Generando estructura inicial...");
        for (let i = 0; i < 2; i++) {
            await generarParDeRamas4(nodoInicialEl.id, 6, MODELO_O4);
        }
        
        // --- FASE 2: Desde Profundidad 1 ---
        progressBarManager.set(15, "Fase 2/5 (V4): Expandiendo desde Profundidad 1...");
        let mapaProfundidades = calcularProfundidades4();
        const nodosProfundidad1 = encontrarNodosEnProfundidad4(1, mapaProfundidades);
        for (const nodoId of nodosProfundidad1) {
            await generarParDeRamas4(nodoId, 5, MODELO_A4);
        }

        // --- FASE 3: Desde Profundidad 2 ---
        progressBarManager.set(30, "Fase 3/5 (V4): Expandiendo desde Profundidad 2...");
        mapaProfundidades = calcularProfundidades4();
        const nodosProfundidad2 = encontrarNodosEnProfundidad4(2, mapaProfundidades);
        for (const nodoId of nodosProfundidad2) {
            await generarParDeRamas4(nodoId, 4, MODELO_A4);
        }

        // --- FASE 4: Desde Profundidad 3 ---
        progressBarManager.set(50, "Fase 4/5 (V4): Expandiendo desde Profundidad 3...");
        mapaProfundidades = calcularProfundidades4();
        const nodosProfundidad3 = encontrarNodosEnProfundidad4(3, mapaProfundidades);
        for (const nodoId of nodosProfundidad3) {
            await generarParDeRamas4(nodoId, 3, MODELO_A4);
        }

        // --- FASE 5: Desde Profundidad 4 ---
        progressBarManager.set(75, "Fase 5/5 (V4): Completando red desde Profundidad 4...");
        mapaProfundidades = calcularProfundidades4();
        const nodosProfundidad4 = encontrarNodosEnProfundidad4(4, mapaProfundidades);
        for (const nodoId of nodosProfundidad4) {
            await generarParDeRamas4(nodoId, 2, MODELO_C4);
        }
        
        // --- FINALIZACIÓN ---
        progressBarManager.set(98, 'Organizando la red final (V4)...');
        if (typeof aplicarAutoLayout === 'function') aplicarAutoLayout();
        progressBarManager.finish(`¡Red simétrica V4 con ${64 - finalesDisponibles.length} finales fabricada con éxito!`);

    } catch (error) {
        console.error("Error catastrófico en el Fabricador de Novelas V4:", error);
        progressBarManager.error(`Error V4: ${error.message}`);
    }
}

/**
 * Genera una rama lineal de N momentos que culmina en un final del I Ching (V4).
 */
async function generarRamaDeterminista4(idNodoOrigen, numCapitulos, modeloIA, finalesDisponibles, contextoGlobal) {
    if (finalesDisponibles.length === 0) {
        console.warn("Se agotaron los finales del I Ching (V4).");
        return [];
    }
    const finalAsignado = finalesDisponibles.pop();
    
    const nodoOrigenEl = document.getElementById(idNodoOrigen);
    if (!nodoOrigenEl) {
        console.error(`Nodo de origen V4 con ID ${idNodoOrigen} no encontrado.`);
        finalesDisponibles.push(finalAsignado);
        return [];
    }
    const contextoNodoOrigen = nodoOrigenEl.dataset.descripcion;

    let capitulosGenerados = null;
    const MAX_REINTENTOS = 3;
    for (let i = 0; i < MAX_REINTENTOS; i++) {
        // MODIFICADO: Se pasa numCapitulos en lugar de numMomentos
        const prompt = generarPromptParaRama4(contextoNodoOrigen, numCapitulos, finalAsignado, contextoGlobal);
        const respuestaIA = await llamarIAConFeedback(prompt, `Generando rama V4 de ${numCapitulos} capítulos hacia '${finalAsignado.titulo}' (Intento ${i + 1})...`, modeloIA, true, 2);
        
        if (respuestaIA && Array.isArray(respuestaIA) && respuestaIA.length === numCapitulos) {
            capitulosGenerados = respuestaIA;
            break;
        } else {
            console.warn(`Intento V4 ${i + 1} fallido para la rama hacia '${finalAsignado.titulo}'.`);
            if (i < MAX_REINTENTOS - 1) {
                await new Promise(resolve => setTimeout(resolve, 6000));
            }
        }
    }

    if (!capitulosGenerados) {
        // MODIFICADO: Mensaje de error actualizado
        console.error(`La IA no devolvió los ${numCapitulos} resúmenes de capítulo esperados para la rama V4.`);
        finalesDisponibles.unshift(finalAsignado);
        return [];
    }

    let ultimoNodoId = idNodoOrigen;
    const idsNuevos = [];
    const posOrigen = { x: parseFloat(nodoOrigenEl.style.left), y: parseFloat(nodoOrigenEl.style.top) };

    for (const [index, capituloData] of capitulosGenerados.entries()) {
        const esElUltimoNodo = index === capitulosGenerados.length - 1;
        const nuevoNodo = crearNodoEnLienzo({
            id: `capitulo_fabrica4_${Date.now()}_${Math.random().toString().substring(2)}`,
            // MODIFICACIÓN CLAVE: Se añade el prefijo "Capítulo" o "Capítulo Final" al título.
            titulo: esElUltimoNodo ? `Capítulo Final: ${capituloData.titulo}` : `Capítulo: ${capituloData.titulo}`,
            descripcion: capituloData.descripcion || "Resumen de capítulo no generado.",
            x: posOrigen.x + (Math.random() * 500 - 250),
            y: posOrigen.y + (index + 1) * 200 + (Math.random() * 50 - 25),
            acciones: []
        });

        await conectarMomentos(ultimoNodoId, nuevoNodo.id, contextoGlobal);
        
        if (esElUltimoNodo) {
             nuevoNodo.dataset.esFinalIching = "true";
        }
        
        ultimoNodoId = nuevoNodo.id;
        idsNuevos.push(nuevoNodo.id);
    }
    
    return idsNuevos;
}
/**
 * Crea el prompt para la IA, pidiendo una rama lineal hacia un final específico (V4).
 */
function generarPromptParaRama4(contextoNodoOrigen, numCapitulos, finalAsignado, contextoGlobal) {
    if (numCapitulos === 1) {
        return `
# TAREA: Escribir el Resumen de un ÚNICO Capítulo Final (V4)
**Rol:** Eres un novelista y estructurador de tramas experto. Tu tarea es escribir el resumen de un capítulo conclusivo para una novela de aventuras, basándote en el contexto proporcionado.
## CONTEXTO NARRATIVO
1.  **Contexto Global:** > ${contextoGlobal || "El héroe se aventura en un mundo de misterios antiguos y peligros olvidados."}
2.  **Resumen del Capítulo Anterior:** > "${contextoNodoOrigen}"
3.  **Final Predestinado (Tema del Capítulo):**
    * **Título Esencial:** ${finalAsignado.titulo}
    * **Descripción Temática:** ${finalAsignado.descripcion}
    * **Enfoque Central:** ${finalAsignado.enfoque}
## INSTRUCCIONES Y REGLAS
1.  **Convierte el Tema en un Capítulo:** Transforma el "Final Predestinado" en un resumen de capítulo narrativo. Este resumen debe ser la consecuencia directa y lógica de lo ocurrido en el "Resumen del Capítulo Anterior".
2.  **Calidad del Resumen:** El resumen debe ser rico y detallado (mínimo dos párrafos). Debe esbozar los eventos principales, el clímax y la resolución de este arco argumental, sirviendo como una guía clara para escribir el capítulo completo más tarde.
3.  **Puntuación de Final (Obligatorio):** Al final del texto del resumen, añade un nuevo párrafo con una puntuación que evalúe qué tan satisfactorio es este final. El formato debe ser exactamente: "Puntuación: [un número del 11 al 100]".
## FORMATO DE SALIDA OBLIGATORIO
- Tu respuesta debe ser un **Array JSON VÁLIDO que contenga un único objeto**.
- No incluyas texto o explicaciones fuera del array JSON.
- No uses bloques de markdown.
### EJEMPLO DE SALIDA ESPERADA:
[
    {
        "titulo": "El Sacrificio en la Cámara del Eclipse",
        "descripcion": "El capítulo arranca con el protagonista descifrando el último acertijo mientras el mecanismo del techo comienza a cerrarse, proyectando una sombra que avanza inexorable. La confrontación final no es de espadas, sino de intelecto y voluntad contra el guardián ancestral, una entidad hecha de pura energía.\\n\\nEl clímax se alcanza cuando se da cuenta de que la única forma de estabilizar el poder es absorbiéndolo, un acto que lo cambiará para siempre. El capítulo termina con él emergiendo de las ruinas, transformado, mientras el sol vuelve a brillar en el exterior.\\n\\nPuntuación: 92"
    }
]
`;
    }
    
    return `
# TAREA: Diseñar una Secuencia de Resúmenes de Capítulos (V4)
**Rol:** Eres un novelista y estructurador de tramas experto. Tu tarea es crear una secuencia coherente de ${numCapitulos} resúmenes de capítulo que conecten un punto de partida con un final predefinido.
## CONTEXTO NARRATIVO
1.  **Contexto Global:** > ${contextoGlobal || "El héroe se aventura en un mundo de misterios antiguos y peligros olvidados."}
2.  **Resumen del Capítulo Anterior:** > "${contextoNodoOrigen}"
3.  **Final Predestinado (Tema del último capítulo):**
    * **Título Esencial:** ${finalAsignado.titulo}
    * **Descripción Temática:** ${finalAsignado.descripcion}
    * **Enfoque Central:** ${finalAsignado.enfoque}
## INSTRUCCIONES Y REGLAS
1.  **Crea una Escaleta Coherente:** Diseña ${numCapitulos} resúmenes de capítulo que fluyan de manera lógica. El primer resumen debe ser una consecuencia directa del "Resumen del Capítulo Anterior". Cada resumen debe conectar con el siguiente.
2.  **Función de Cada Capítulo:** Cada resumen debe describir los eventos clave, el progreso del personaje, los nuevos conflictos o descubrimientos y cómo el final del capítulo establece el inicio del próximo. Debe ser una guía útil para escribir el capítulo completo más tarde.
3.  **Adapta el Final:** El resumen del último capítulo de tu secuencia **debe ser** la adaptación narrativa del "Final Predestinado".
## FORMATO DE SALIDA OBLIGATORIO
- Tu respuesta debe ser un **Array JSON VÁLIDO que contenga exactamente ${numCapitulos} objetos**.
- No incluyas texto o explicaciones fuera del array JSON.
- No uses bloques de markdown.
### EJEMPLO DE SALIDA ESPERADA (para ${numCapitulos} capítulos):
[
    { "titulo": "La Pista en el Astrolabio", "descripcion": "Tras escapar del derrumbe, el héroe descubre que una pieza que recuperó es parte de un astrolabio. Pasa el capítulo investigando en una biblioteca olvidada, donde es acechado por una figura misteriosa. Termina descifrando una coordenada que apunta al desierto." },
    { "titulo": "El Espejismo Viviente", "descripcion": "Siguiendo la coordenada, el equipo se adentra en el desierto. El calor y la desorientación los llevan a un oasis que no está en los mapas, donde las visiones de su pasado los atormentan. Descubren que el oasis es una prueba mental y deben superarla para encontrar el camino real." }
]
`;
}

/**
 * Calcula la profundidad de cada nodo en la red usando un recorrido BFS (V4).
 */
function calcularProfundidades4() {
    const profundidades = new Map();
    const cola = []; // [{ nodeId, depth }]
    const visitados = new Set();

    const nodoInicial = document.querySelector('.momento-nodo.inicio');
    if (!nodoInicial) return new Map();

    cola.push({ nodeId: nodoInicial.id, depth: 0 });
    visitados.add(nodoInicial.id);
    profundidades.set(nodoInicial.id, 0);

    while (cola.length > 0) {
        const { nodeId, depth } = cola.shift();
        const nodoEl = document.getElementById(nodeId);
        if (!nodoEl) continue;

        const acciones = JSON.parse(nodoEl.dataset.acciones || '[]');
        for (const accion of acciones) {
            const idDestino = accion.idDestino;
            if (idDestino && !visitados.has(idDestino)) {
                visitados.add(idDestino);
                profundidades.set(idDestino, depth + 1);
                cola.push({ nodeId: idDestino, depth: depth + 1 });
            }
        }
    }
    return profundidades;
}

/**
 * Filtra un mapa de profundidades para encontrar todos los nodos en un nivel específico (V4).
 */
function encontrarNodosEnProfundidad4(profundidadDeseada, mapaProfundidades) {
    const nodosEnProfundidad = [];
    for (const [nodeId, depth] of mapaProfundidades.entries()) {
        if (depth === profundidadDeseada) {
            nodosEnProfundidad.push(nodeId);
        }
    }
    return nodosEnProfundidad;
}

/**
 * Parsea de forma robusta una respuesta de texto de la IA que se espera que contenga JSON (V4).
 */
function parseAIJsonResponse4(rawResponse) {
    if (!rawResponse || typeof rawResponse !== 'string') {
        console.error("La respuesta de la IA (V4) está vacía o no es un string.");
        return null;
    }

    try {
        const firstBracket = rawResponse.indexOf('[');
        const firstBrace = rawResponse.indexOf('{');
        let startIndex = -1;
        if (firstBracket === -1) startIndex = firstBrace;
        else if (firstBrace === -1) startIndex = firstBracket;
        else startIndex = Math.min(firstBracket, firstBrace);

        if (startIndex === -1) {
            console.error("No se encontró un JSON válido (V4) en la respuesta.");
            return null;
        }
        
        const lastBracket = rawResponse.lastIndexOf(']');
        const lastBrace = rawResponse.lastIndexOf('}');
        const endIndex = Math.max(lastBracket, lastBrace);

        let jsonString = rawResponse.substring(startIndex, endIndex + 1);
        jsonString = jsonString.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
        jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');

        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error final al parsear el JSON extraído (V4). Error:", error.message);
        console.error("JSON problemático (V4):", rawResponse);
        return null;
    }
}

 
async function manejarCompletarMomento() {
    if (!panelState.nodoActual) {
        alert("No hay ningún momento seleccionado para completar.");
        return;
    }

    const nodoActual = panelState.nodoActual;
    const numParrafos = document.getElementById('panel-input-num-parrafos').value;

    nodoActual.classList.add('desarrollando');

    try {
        // --- START OF CHANGES ---

        // 1. Ensure the synthesized data is up-to-date before proceeding.
     

        // 2. Get the synthesized context if the user wants it.
        let contextoDatos = "";
        const usarContextoCheckbox = document.getElementById('panel-checkbox-usar-contexto');
        if (usarContextoCheckbox && usarContextoCheckbox.checked) {
            contextoDatos = obtenerContextoSintetizado();
            console.log("Usando contexto de datos para COMPLETAR.");
        }

        // --- END OF CHANGES ---

        const momentosSiguientes = encontrarMomentosSiguientes(nodoActual.id);
        const momentosPrevios = encontrarMomentosAnteriores(nodoActual.id);
        const momentoActualData = {
            titulo: nodoActual.querySelector('.momento-titulo').textContent,
            descripcion: nodoActual.dataset.descripcion
        };

        // 3. Pass the 'contextoDatos' to the prompt creation function.
        const prompt = crearPromptCompletar(momentosPrevios, momentoActualData, momentosSiguientes, numParrafos, contextoDatos);

        const respuestaIA = await llamarIAConFeedback(
            prompt,
            `Completando "${momentoActualData.titulo}"...`,
            'gemini-2.5-flash',
            true
        );

        if (!respuestaIA || !respuestaIA.descripcionDesarrollada) {
            throw new Error("La IA no devolvió la descripción desarrollada para completar el momento.");
        }

        nodoActual.dataset.descripcion = respuestaIA.descripcionDesarrollada;
        if (panelState.nodoActual.id === nodoActual.id) {
            document.getElementById('panel-editor-descripcion').value = respuestaIA.descripcionDesarrollada;
        }

        if (respuestaIA.accionesActualizadas && Array.isArray(respuestaIA.accionesActualizadas)) {
            let accionesActuales = JSON.parse(nodoActual.dataset.acciones || '[]');
            const mapaTextosBotones = new Map(respuestaIA.accionesActualizadas.map(a => [a.idDestino, a.textoBoton]));

            accionesActuales.forEach(accion => {
                if (mapaTextosBotones.has(accion.idDestino)) {
                    accion.textoBoton = mapaTextosBotones.get(accion.idDestino);
                }
            });

            nodoActual.dataset.acciones = JSON.stringify(accionesActuales);
        }

        if (typeof redibujarTodasLasConexiones === 'function') {
            redibujarTodasLasConexiones();
        }
        
        alert(`Momento "${momentoActualData.titulo}" completado con éxito.`);

    } catch (error) {
        console.error(`Error al completar el momento ${nodoActual.id}:`, error);
        alert(`Ocurrió un error al completar el momento: ${error.message}`);
    } finally {
        nodoActual.classList.remove('desarrollando');
    }
}

/**
 * [NUEVA FUNCIÓN HELPER]
 * Busca y devuelve los datos de los nodos HIJO directos.
 * @param {string} idNodoActual - El ID del momento del que se buscan los sucesores.
 * @returns {Array<object>} Un array de objetos con id, título y descripción de los hijos.
 */
function encontrarMomentosSiguientes(idNodoActual) {
    const momentosSiguientes = [];
    const nodoActual = document.getElementById(idNodoActual);
    if (!nodoActual) return [];

    try {
        const accionesData = JSON.parse(nodoActual.dataset.acciones || '[]');
        accionesData.forEach(accion => {
            const nodoDestino = document.getElementById(accion.idDestino);
            if (nodoDestino) {
                momentosSiguientes.push({
                    id: nodoDestino.id,
                    titulo: nodoDestino.querySelector('.momento-titulo').textContent,
                    descripcion: nodoDestino.dataset.descripcion || ''
                });
            }
        });
    } catch (e) {
        console.error(`Error al parsear acciones del nodo ${idNodoActual} para encontrar sucesores:`, e);
    }
    return momentosSiguientes;
}
// ▼▼▼ COPIA Y PEGA ESTA FUNCIÓN COMPLETA EN TU ARCHIVO ▼▼▼

/**
 * [NUEVA FUNCIÓN PROMPT - VERSIÓN CORREGIDA]
 * Construye el prompt para la tarea de "Completar", adaptándose a si hay nodos hijo o no.
 * @param {Array<object>} momentosPrevios - Contexto de los nodos padre.
 * @param {object} momentoActual - El nodo actual a desarrollar.
 * @param {Array<object>} momentosSiguientes - Los nodos hijo a los que se conectará.
 * @param {string} numParrafos - El número de párrafos deseado.
 * @param {string} [contextoDatos=""] - El contexto opcional de los datos del proyecto.
 * @returns {string} El prompt completo para la IA.
 */
function crearPromptCompletar(momentosPrevios, momentoActual, momentosSiguientes, numParrafos, contextoDatos = "") {
    let contextoPrevio = "Este es el comienzo de la historia.";
    if (momentosPrevios.length > 0) {
        contextoPrevio = momentosPrevios.map(m => `**Desde "${m.titulo}":**\n*${(m.descripcion || '').trim()}*`).join('\n\n');
    }

    const seccionContextoDatos = contextoDatos ? `## CONTEXTO DEL UNIVERSO (DATOS)\n${contextoDatos}\n` : '';
    const ideaCentral = (momentoActual.descripcion || '').trim();
    
    let promptFinal; 

    // Si hay nodos hijo, pedimos descripción Y textos de botones
    if (momentosSiguientes.length > 0) {
        const destinosTexto = momentosSiguientes.map(m =>
            `- **Hacia "${m.titulo}" (ID: ${m.id}):**\n  *Idea Central: ${(m.descripcion || '...').trim()}*`
        ).join('\n');

        promptFinal = `
# TAREA: Completar un Momento Narrativo Intermedio
**Rol:** Eres un escritor de ficción interactiva. Tu tarea es escribir el contenido de un momento clave, sabiendo qué pasó antes y qué opciones vienen después.
${seccionContextoDatos}
## CONTEXTO (LO QUE LLEVÓ AQUÍ)
${contextoPrevio}
## MOMENTO A COMPLETAR
**Título:** "${momentoActual.titulo}"
**Idea Central (a expandir):** "${ideaCentral}"
## POSIBLES DESTINOS (LO QUE VIENE DESPUÉS)
${destinosTexto}
## INSTRUCCIONES
1.  **Expande la "Idea Central"**: Transforma la idea del "MOMENTO A COMPLETAR" en un pasaje narrativo rico y detallado de **${numParrafos} párrafos**.
2.  **Escribe los Textos de las Acciones**: Para CADA UNO de los "Posibles Destinos", crea un texto de acción (para un botón) que sea una elección clara y atractiva.
## FORMATO DE SALIDA OBLIGGATORIO
Tu respuesta debe ser un **único objeto JSON VÁLIDO** con la siguiente estructura:
{
  "descripcionDesarrollada": "El texto expandido del momento actual...",
  "accionesActualizadas": [
    { "idDestino": "ID del primer destino", "textoBoton": "Texto para la acción que lleva al primer destino" }
  ]
}
`;
    // Si NO hay nodos hijo, solo pedimos la descripción
    } else {
        promptFinal = `
# TAREA: Completar un Momento Narrativo (Final o Aislado)
**Rol:** Eres un escritor experto. Tu tarea es expandir la descripción de un momento.
${seccionContextoDatos}
## CONTEXTO (LO QUE LLEVÓ AQUÍ)
${contextoPrevio}
## MOMENTO A COMPLETAR
**Título:** "${momentoActual.titulo}"
**Idea Central (a expandir):** "${ideaCentral}"
## INSTRUCCIONES
1.  **Expande la "Idea Central"**: Transforma la idea en un pasaje narrativo completo y detallado de **${numParrafos} párrafos**.
2.  **No Generes Opciones**: Este momento no tiene salidas definidas, así que solo enfócate en escribir su contenido.
## FORMATO DE SALIDA OBLIGATORIO
Tu respuesta debe ser un **único objeto JSON VÁLIDO** con la siguiente estructura:
{
  "descripcionDesarrollada": "El texto expandido del momento actual..."
}
`;
    }
    
    return promptFinal;
}
 
/**
 * [NUEVA FUNCIÓN PROMPT - VERSIÓN MEJORADA PARA AVANCE DE TRAMA]
 * Construye el prompt para solicitar a la IA que expanda un momento y cree ramas hijas DETALLADAS.
 * @param {Array<object>} momentosPrevios - Contexto de los momentos que llevan al actual.
 * @param {object} momentoActual - El momento que se quiere desarrollar.
 * @param {string} numParrafos - El número de párrafos deseado para el texto final del nodo actual.
 * @param {number} numSalidas - El número de ramas de salida a generar.
 * @param {string} [contextoDatos=""] - El contexto opcional de los datos del proyecto.
 * @returns {string} El prompt completo para la IA.
 */
function crearPromptDesarrollo(momentosPrevios, momentoActual, numParrafos, numSalidas, contextoDatos = "") {
    let contextoPrevio = "No hay momentos anteriores. Este es el comienzo de la historia.";
    if (momentosPrevios.length > 0) {
        contextoPrevio = momentosPrevios.map(m =>
            `**Desde "${m.titulo}":**\n*${(m.descripcion || '').trim()}*`
        ).join('\n\n');
    }

    const seccionContextoDatos = contextoDatos ? `## CONTEXTO DEL UNIVERSO (DATOS)\n${contextoDatos}\n` : '';

    if (parseInt(numSalidas, 10) === 0) {
        return `
# TAREA: Escribir un Momento Conclusivo (Final)
**Rol:** Eres un escritor experto. Tu tarea es expandir una idea para convertirla en el final de un arco narrativo.
${seccionContextoDatos}
## CONTEXTO DE LA ESCENA
${contextoPrevio}
## MOMENTO FINAL A ESCRIBIR
**Título:** "${momentoActual.titulo}"
**Idea Central para el Final:** "${(momentoActual.descripcion || '').trim()}"
## INSTRUCCIONES
1.  **Escribe la Conclusión**: Transforma la "Idea Central" en un pasaje narrativo completo y conclusivo de **${numParrafos} párrafos**. Debe sentirse como un final.
2.  **No Generes Opciones**: Este es un final. No propongas ninguna acción o camino a seguir.
## FORMATO DE SALIDA OBLIGATORIO
Tu respuesta debe ser un **único objeto JSON VÁLIDO** con la siguiente estructura:
{
  "descripcionDesarrollada": "El texto conclusivo que has escrito va aquí..."
}
`;
    }

    // --- INICIO DE LA MODIFICACIÓN CLAVE ---
    return `
# TAREA: Expansión Narrativa y Creación de Ramas DETALLADAS
**Rol:** Eres un escritor de ficción interactiva y un maestro en hacer avanzar la trama.
${seccionContextoDatos}
## CONTEXTO DE LA ESCENA
${contextoPrevio}
## MOMENTO CLAVE A DESARROLLAR
**Título:** "${momentoActual.titulo}"
**Idea Central:** "${(momentoActual.descripcion || '').trim()}"
## INSTRUCCIONES
1.  **Expande la "Idea Central"**: Transforma la idea del "MOMENTO CLAVE" en un pasaje narrativo completo de **${numParrafos} párrafos**.
2.  **Genera las Salidas (¡CON DETALLE!)**: Crea exactamente **${numSalidas} opciones** que el personaje podría tomar a continuación. Para cada opción:
    * **textoBoton**: Escribe un texto de acción claro y conciso para el botón de elección.
    * **descripcionDetalladaSiguiente**: Escribe un resumen de **al menos dos párrafos** para el siguiente momento. Este resumen debe describir la nueva escena, el resultado inmediato de la elección y establecer un nuevo conflicto o misterio. ¡Debe hacer que la trama avance significativamente!

## FORMATO DE SALIDA OBLIGATORIO
Tu respuesta debe ser un **único objeto JSON VÁLIDO** con la siguiente estructura:
{
  "descripcionDesarrollada": "El texto expandido del momento actual va aquí...",
  "posiblesSalidas": [
    { 
      "textoBoton": "Enfrentarse directamente al guardia", 
      "descripcionDetalladaSiguiente": "Al optar por la confrontación, el héroe desenvaina su espada. El guardia, sorprendido, hace sonar una alarma antes de caer. Ahora, las puertas del pasillo se cierran con estrépito y se escuchan pasos apresurados acercándose desde todas direcciones.\\n\\nAtrapado y con refuerzos en camino, el héroe debe encontrar una ruta de escape alternativa o prepararse para una lucha imposible. Su audacia le ha costado el elemento sorpresa y lo ha puesto en una situación aún más precaria."
    }
  ]
}
`;
    // --- FIN DE LA MODIFICACIÓN CLAVE ---
}
 
/**
 * [FUNCIÓN MODIFICADA - AHORA ES UN LANZADOR]
 * Orquesta el proceso de desarrollo de un momento. Se activa al pulsar el botón "Desarrollar".
 * No espera a que termine el proceso, permitiendo múltiples ejecuciones en paralelo.
 */
function manejarDesarrolloMomento() { // ¡Ya no necesita ser async!
    if (!panelState.nodoActual) {
        alert("No hay ningún momento seleccionado para desarrollar.");
        return;
    }

    const nodoSeleccionado = panelState.nodoActual;

    // Comprobar si este nodo ya está en proceso de desarrollo
    if (nodoSeleccionado.classList.contains('desarrollando')) {
        console.log(`El momento "${nodoSeleccionado.id}" ya está en proceso de generación.`);
        return; // No hacer nada si ya se está generando
    }

    // "Dispara y olvida": Llama a la función pesada pero NO la espera con await.
    // Esto libera el hilo principal de inmediato, permitiendo que la UI siga respondiendo
    // y que el usuario pueda hacer clic en otro momento para desarrollarlo.
    desarrollarMomentoEnParalelo(nodoSeleccionado);

    // El botón del panel ya no se deshabilita, por lo que el usuario puede
    // seleccionar otro nodo y pulsar "Desarrollar" de nuevo.
}

/**
 * [FUNCIÓN FALTANTE]
 * Busca en todo el lienzo los nodos que tienen una acción apuntando al nodo actual.
 * @param {string} idNodoActual - El ID del momento para el cual buscar predecesores.
 * @returns {Array<object>} Un array de objetos, cada uno con el título y la descripción de un momento anterior.
 */
function encontrarMomentosAnteriores(idNodoActual) {
    const momentosPrevios = [];
    // Selecciona todos los nodos de momentos en el lienzo
    const todosLosNodos = document.querySelectorAll('#momentos-lienzo .momento-nodo');

    todosLosNodos.forEach(nodo => {
        // Evita comparar un nodo consigo mismo
        if (nodo.id === idNodoActual) {
            return; // Equivalente a 'continue' en un bucle forEach
        }

        // Intenta parsear las acciones del nodo, si no hay, usa un array vacío
        try {
            const accionesData = JSON.parse(nodo.dataset.acciones || '[]');

            // Comprueba si alguna de las acciones de este nodo apunta al nodo actual
            const apuntaAlActual = accionesData.some(accion => accion.idDestino === idNodoActual);

            if (apuntaAlActual) {
                // Si encuentra un nodo que apunta al actual, lo añade a la lista de predecesores
                momentosPrevios.push({
                    titulo: nodo.querySelector('.momento-titulo').textContent,
                    descripcion: nodo.dataset.descripcion || ''
                });
            }
        } catch (e) {
            console.error(`Error al parsear acciones del nodo ${nodo.id}:`, e);
        }
    });

    return momentosPrevios;
}
 


// =================================================================================
// --- INICIO DE LAS NUEVAS FUNCIONES PARA ENRIQUECIMIENTO AUTOMÁTICO ---
// =================================================================================

/**
 * [NUEVA FUNCIÓN AÑADIDA]
 * Crea un prompt para que una IA más ligera enriquezca un resumen de momento recién creado.
 * @param {string} contextoPrevio - La descripción desarrollada del nodo padre.
 * @param {string} ideaAEnriquecer - El resumen corto del nuevo momento que se va a expandir.
 * @returns {string} El prompt completo para la IA.
 */
function crearPromptEnriquecimiento(contextoPrevio, ideaAEnriquecer) {
    return `
# TAREA: Enriquecimiento de Trama (V4.1)
**Rol:** Eres un escritor y continuista de historias. Tu tarea es tomar una idea breve y expandirla en una escena vibrante.

## CONTEXTO NARRATIVO
**Escena Anterior:**
> ${contextoPrevio}

## IDEA A DESARROLLAR
**Resumen Inicial:**
> "${ideaAEnriquecer}"

## INSTRUCCIONES
1.  **Expande la Idea:** Convierte el "Resumen Inicial" en un pasaje narrativo más completo y detallado. Utiliza al menos dos párrafos.
2.  **Genera Tensión o Misterio:** El texto debe ser evocador, estableciendo la atmósfera y presentando nuevos detalles o un giro sutil que invite a la continuación. Debe dejar al lector preguntándose qué pasará a continuación.
3.  **Mantén la Coherencia:** Asegúrate de que tu texto es una continuación lógica y coherente de la "Escena Anterior".

## FORMATO DE SALIDA OBLIGATORIO
- Tu respuesta debe ser un **único objeto JSON VÁLIDO**.
- No incluyas texto o explicaciones fuera del objeto JSON.
- La estructura debe ser:
{
  "descripcionEnriquecida": "El texto narrativo completo y detallado que has escrito va aquí..."
}
`;
}

/**
 * [NUEVA FUNCIÓN AÑADIDA]
 * Toma un nodo recién creado con una descripción breve y usa una IA ligera para enriquecerla.
 * @param {HTMLElement} nodoAEnriquecer - El elemento del nodo a procesar.
 * @param {string} descripcionNodoPadre - La descripción ya desarrollada del nodo del que este desciende.
 */
async function enriquecerNodoRecienCreado(nodoAEnriquecer, descripcionNodoPadre) {
    const ideaInicial = nodoAEnriquecer.dataset.descripcion;
    // Añadir una clase visual para indicar que se está procesando
    nodoAEnriquecer.classList.add('enriqueciendo');

    try {
        const prompt = crearPromptEnriquecimiento(descripcionNodoPadre, ideaInicial);
        
        // Usamos un modelo más ligero como se solicita. MODELO_C4 es 'gemini-2.5-flash-lite'
        const respuestaIA = await llamarIAConFeedback(
            prompt,
            `Enriqueciendo: "${(ideaInicial || '...').substring(0, 30)}..."`,
            MODELO_C4, // gemini-2.5-flash-lite
            true,
            3 // Nivel de feedback bajo para no saturar la UI
        );

        if (respuestaIA && respuestaIA.descripcionEnriquecida) {
            // Actualizar el nodo con la nueva descripción
            nodoAEnriquecer.dataset.descripcion = respuestaIA.descripcionEnriquecida;
            
            // Opcional: Actualizar el panel si este nodo está seleccionado (poco probable pero seguro)
            if (panelState.nodoActual && panelState.nodoActual.id === nodoAEnriquecer.id) {
                document.getElementById('panel-editor-descripcion').value = respuestaIA.descripcionEnriquecida;
            }
        } else {
            console.warn(`El enriquecimiento para el nodo ${nodoAEnriquecer.id} no devolvió contenido.`);
        }

    } catch (error) {
        console.error(`Error al enriquecer el nodo ${nodoAEnriquecer.id}:`, error);
        // No mostramos alert para no interrumpir al usuario por un fallo en una tarea secundaria.
        // El nodo simplemente se quedará con su descripción corta.
    } finally {
        // Quitar la clase visual al terminar
        nodoAEnriquecer.classList.remove('enriqueciendo');
    }
}

// ===============================================================================
// --- FIN DE LAS NUEVAS FUNCIONES PARA ENRIQUECIMIENTO AUTOMÁTICO ---
// ===============================================================================


/**
 * [FUNCIÓN PARALELIZABLE MODIFICADA]
 * Contiene la lógica pesada para desarrollar un momento.
 * Opera sobre un nodo específico y AHORA CREA NODOS HIJOS YA DETALLADOS.
 * @param {HTMLElement} nodoADesarrollar - El nodo del momento que se va a procesar.
 */
async function desarrollarMomentoEnParalelo(nodoADesarrollar) {
    nodoADesarrollar.classList.add('desarrollando');
    nodoADesarrollar.classList.remove('momento-final'); 

    try {
        let contextoDatos = "";
        const usarContextoCheckbox = document.getElementById('panel-checkbox-usar-contexto');
        if (usarContextoCheckbox && usarContextoCheckbox.checked) {
            contextoDatos = obtenerContextoSintetizado();
            console.log("Usando contexto de datos para DESARROLLAR.");
        }

        const idActual = nodoADesarrollar.id;
        const numParrafos = document.getElementById('panel-input-num-parrafos').value;
        const numSalidas = parseInt(document.getElementById('panel-input-num-salidas').value, 10);

        const momentosPrevios = encontrarMomentosAnteriores(idActual);
        const momentoActualData = {
            titulo: nodoADesarrollar.querySelector('.momento-titulo').textContent,
            descripcion: nodoADesarrollar.dataset.descripcion
        };

        const prompt = crearPromptDesarrollo(momentosPrevios, momentoActualData, numParrafos, numSalidas, contextoDatos);
        const respuestaIA = await llamarIAConFeedback(
            prompt,
            `Desarrollando "${momentoActualData.titulo}"...`,
            'gemini-2.5-flash',
            true
        );

        if (!respuestaIA || !respuestaIA.descripcionDesarrollada) {
            throw new Error("La IA no devolvió una descripción desarrollada.");
        }

        nodoADesarrollar.dataset.descripcion = respuestaIA.descripcionDesarrollada;

        if (numSalidas > 0) {
            if (!Array.isArray(respuestaIA.posiblesSalidas) || respuestaIA.posiblesSalidas.length === 0) {
                throw new Error("La IA no devolvió las ramas de salida esperadas.");
            }

            const posOrigen = { x: parseFloat(nodoADesarrollar.style.left), y: parseFloat(nodoADesarrollar.style.top) };

            for (const [index, salida] of respuestaIA.posiblesSalidas.entries()) {
                contadorMomentosGlobal++;
                
                // --- INICIO DE LA MODIFICACIÓN CLAVE ---
                // Usamos la nueva descripción detallada directamente.
                const descripcionDelNuevoNodo = salida.descripcionDetalladaSiguiente || salida.descripcionSiguiente || "...";
                // --- FIN DE LA MODIFICACIÓN CLAVE ---

                const nuevoNodo = crearNodoEnLienzo({
                    id: `momento_rama_${Date.now()}_${index}`,
                    titulo: `Nuevo Momento... ${contadorMomentosGlobal}`,
                    descripcion: descripcionDelNuevoNodo, // Aplicamos la descripción detallada aquí.
                    x: posOrigen.x + (index * 250) - ((respuestaIA.posiblesSalidas.length - 1) * 125),
                    y: posOrigen.y + 250,
                    acciones: []
                });
                await conectarMomentos(idActual, nuevoNodo.id, salida.textoBoton);
            }
            
            // Ya no es necesario el enriquecimiento automático.
            // La llamada a Promise.all(promesasEnriquecimiento) se puede eliminar por completo.

            if (typeof aplicarAutoLayout === 'function') aplicarAutoLayout();

        } else {
            nodoADesarrollar.classList.add('momento-final');
        }

        if (panelState.nodoActual && panelState.nodoActual.id === idActual) {
            document.getElementById('panel-editor-descripcion').value = respuestaIA.descripcionDesarrollada;
        }

    } catch (error) {
        console.error(`Error al desarrollar el momento ${nodoADesarrollar.id}:`, error);
        alert(`Ocurrió un error desarrollando "${nodoADesarrollar.querySelector('.momento-titulo').textContent}": ${error.message}`);
    } finally {
        nodoADesarrollar.classList.remove('desarrollando');
    }
}