// =================================================================
// FABRICADOR_AVENTURAS.JS - Nuevo Sistema de Generación Masiva
// Basado en 64 Finales Arquetípicos del I Ching
// Modelo: Simétrico de Bifurcación Penúltima
// =================================================================

// --- Alias de Modelos para el Fabricador ---
const MODELO_O = 'gemini-2.5-pro';
const MODELO_A = 'gemini-2.5-flash'; // Para ramas de 6, 5 y 4 nodos
const MODELO_B = 'gemini-2.5-flash-lite'; // Para ramas de 3 nodos
const MODELO_C = 'gemini-2.5-flash-lite'; // Para ramas de 2 nodos
const MODELO_D = 'gemini-2.0-flash'; // Para ramas secundarias de 1 nodo

// =================================================================
// GESTIÓN DEL MODAL DEL FABRICADOR
// =================================================================

/**
 * Abre el modal específico para el Fabricador de Novelas de Aventura.
 */
function abrirModalFabricadorAventura() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-fabricador-aventura');
    if (!overlay || !modal) {
        console.error("No se encontraron los elementos del modal del Fabricador de Aventuras.");
        return;
    }

    overlay.style.display = 'block';
    modal.style.display = 'flex';
    overlay.onclick = cerrarModalFabricadorAventura;

    const generarBtn = document.getElementById('generar-fabricador-btn-modal');
    // Clonar para evitar listeners duplicados
    const nuevoGenerarBtn = generarBtn.cloneNode(true);
    generarBtn.parentNode.replaceChild(nuevoGenerarBtn, generarBtn);
    nuevoGenerarBtn.addEventListener('click', iniciarFabricacionNovelaAventura);
}

/**
 * Cierra el modal del Fabricador de Novelas de Aventura.
 */
function cerrarModalFabricadorAventura() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-fabricador-aventura');
    if (overlay && modal) {
        overlay.style.display = 'none';
        modal.style.display = 'none';
        overlay.onclick = null;
    }
}

// =================================================================
// LÓGICA DEL "FABRICADOR DE NOVELAS DE AVENTURA"
// =================================================================

// --- Base de Finales del I Ching ---

const FINALES_I_CHING = [
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
 * Punto de entrada para el "Fabricador de Novelas de Aventura".
 * Implementa el "Modelo Simétrico de Bifurcación Penúltima" para
 * generar una red con exactamente 64 finales a una profundidad de 6.
 */
async function iniciarFabricacionNovelaAventura() {
    // --- PREPARACIÓN ---
    const sinopsisUsuario = document.getElementById('ia-fabricador-prompt-input').value;
    if (!sinopsisUsuario || sinopsisUsuario.trim() === '') {
        // NOTE: Replaced alert with a more modern notification if available, but keeping alert for compatibility.
        // A proper UI modal/toast would be better.
        alert("Generación cancelada. Debes proporcionar una idea para la historia.");
        return;
    }
    cerrarModalFabricadorAventura();

    try {
        progressBarManager.start("Iniciando Fabricador: Modelo Simétrico de Bifurcación Penúltima...");

        const finalesDisponibles = [...FINALES_I_CHING].sort(() => Math.random() - 0.5);

        let nodoInicialEl = document.querySelector('.momento-nodo.inicio');
        if (!nodoInicialEl) {
            nodoInicialEl = crearNodoEnLienzo({
                id: `momento_inicial_${Date.now()}`,
                titulo: "El Origen de los 64 Caminos",
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
`;        const nuevoTitulo = await llamarIAConFeedback(promptTitulo, "Creando título...", MODELO_D, false, 1);
        if (nuevoTitulo) {
            nodoInicialEl.querySelector('.momento-titulo').textContent = nuevoTitulo.replace(/["']/g, '');
        }

        await gestionarSintesisDeDatos();
        const contextoGlobal = obtenerContextoSintetizado();

        /**
         * Genera un par de ramas: una principal de N nodos y una secundaria de 1 nodo
         * que nace del penúltimo nodo de la principal (en profundidad 5).
         */
        const generarParDeRamas = async (idNodoOrigen, longitudPrincipal, modeloPrincipal) => {
            const idsRamaPrincipal = await generarRamaDeterminista(idNodoOrigen, longitudPrincipal, modeloPrincipal, finalesDisponibles, contextoGlobal);

            if (idsRamaPrincipal && idsRamaPrincipal.length >= 2) {
                const idNodoPenultimo = idsRamaPrincipal[idsRamaPrincipal.length - 2];
                await generarRamaDeterminista(idNodoPenultimo, 1, MODELO_D, finalesDisponibles, contextoGlobal);
            } else if (idsRamaPrincipal && idsRamaPrincipal.length > 0) {
                 console.warn(`La rama principal desde ${idNodoOrigen} era demasiado corta para la bifurcación penúltima. Longitud: ${idsRamaPrincipal.length}`);
            }
        };

        // --- FASE 1: Desde Profundidad 0 (Origen) ---
        // Se mantiene Promise.all aquí porque son solo dos llamadas y es seguro.
        progressBarManager.set(5, "Fase 1/5: Generando estructura inicial (4 de 64 finales)...");
        await Promise.all([
            generarParDeRamas(nodoInicialEl.id, 6, MODELO_O),
            generarParDeRamas(nodoInicialEl.id, 6, MODELO_O)
        ]);
        console.log("===== FIN FASE 1 =====");
        console.log("Acciones del nodo inicial:", document.getElementById(nodoInicialEl.id).dataset.acciones);

        // --- FASE 2: Desde Profundidad 1 ---
        progressBarManager.set(15, "Fase 2/5: Expandiendo desde Profundidad 1 (8 de 64 finales)...");
        let mapaProfundidades = calcularProfundidades();
        const nodosProfundidad1 = encontrarNodosEnProfundidad(1, mapaProfundidades);
        // CAMBIO: Se reemplaza Promise.all por un bucle for...of secuencial
        for (const nodoId of nodosProfundidad1) {
            await generarParDeRamas(nodoId, 5, MODELO_A);
        }
        console.log("Nodos encontrados en profundidad 1:", nodosProfundidad1);

        // --- FASE 3: Desde Profundidad 2 ---
        progressBarManager.set(30, "Fase 3/5: Expandiendo desde Profundidad 2 (16 de 64 finales)...");
        mapaProfundidades = calcularProfundidades();
        const nodosProfundidad2 = encontrarNodosEnProfundidad(2, mapaProfundidades);
        // CAMBIO: Se reemplaza Promise.all por un bucle for...of secuencial
        for (const nodoId of nodosProfundidad2) {
            await generarParDeRamas(nodoId, 4, MODELO_A);
        }

        // --- FASE 4: Desde Profundidad 3 ---
        progressBarManager.set(50, "Fase 4/5: Expandiendo desde Profundidad 3 (32 de 64 finales)...");
        mapaProfundidades = calcularProfundidades();
        const nodosProfundidad3 = encontrarNodosEnProfundidad(3, mapaProfundidades);
        // CAMBIO: Se reemplaza Promise.all por un bucle for...of secuencial
        for (const nodoId of nodosProfundidad3) {
            await generarParDeRamas(nodoId, 3, MODELO_A);
        }

        // --- FASE 5: Desde Profundidad 4 ---
        progressBarManager.set(75, "Fase 5/5: Completando red desde Profundidad 4 (64 de 64 finales)...");
        mapaProfundidades = calcularProfundidades();
        const nodosProfundidad4 = encontrarNodosEnProfundidad(4, mapaProfundidades);
        // CAMBIO: Se reemplaza Promise.all por un bucle for...of secuencial
        for (const nodoId of nodosProfundidad4) {
            await generarParDeRamas(nodoId, 2, MODELO_C);
        }
        
        // --- FINALIZACIÓN ---
        progressBarManager.set(98, 'Organizando la red final...');
        if (typeof aplicarAutoLayout === 'function') aplicarAutoLayout();
        progressBarManager.finish(`¡Red simétrica con ${64 - finalesDisponibles.length} finales fabricada con éxito!`);

    } catch (error) {
        console.error("Error catastrófico en el Fabricador de Novelas (Modelo Simétrico):", error);
        progressBarManager.error(`Error: ${error.message}`);
    }
}

/**
 * Genera una rama lineal de N momentos que culmina en un final del I Ching.
 * Incorpora un sistema de reintentos para mayor robustez.
 * @param {string} idNodoOrigen - ID del nodo desde donde parte la rama.
 * @param {number} numMomentos - El número de momentos que tendrá la nueva rama.
 * @param {string} modeloIA - El alias del modelo de IA a utilizar.
 * @param {Array<Object>} finalesDisponibles - El array de finales del I Ching disponibles.
 * @param {string} contextoGlobal - El contexto general de la historia.
 * @returns {Promise<Array<string>>} Un array con los IDs de los nuevos nodos creados en la rama.
 */
async function generarRamaDeterminista(idNodoOrigen, numMomentos, modeloIA, finalesDisponibles, contextoGlobal) {
    if (finalesDisponibles.length === 0) {
        console.warn("Se agotaron los finales del I Ching.");
        return [];
    }
    const finalAsignado = finalesDisponibles.pop();
    
    const nodoOrigenEl = document.getElementById(idNodoOrigen);
    if (!nodoOrigenEl) {
        console.error(`Nodo de origen con ID ${idNodoOrigen} no encontrado.`);
        finalesDisponibles.push(finalAsignado); // Devolver el final al pool
        return [];
    }
    const contextoNodoOrigen = nodoOrigenEl.dataset.descripcion;

    let momentosGenerados = null;
    const MAX_REINTENTOS = 3;
    for (let i = 0; i < MAX_REINTENTOS; i++) {
        const prompt = generarPromptParaRama(contextoNodoOrigen, numMomentos, finalAsignado, contextoGlobal);
        const respuestaIA = await llamarIAConFeedback(prompt, `Generando rama de ${numMomentos} hacia '${finalAsignado.titulo}' (Intento ${i + 1})...`, modeloIA, true, 2);
        
        if (respuestaIA && Array.isArray(respuestaIA) && respuestaIA.length === numMomentos) {
            momentosGenerados = respuestaIA;
            break; // Éxito, salir del bucle
        } else {
            console.warn(`Intento ${i + 1} fallido para la rama hacia '${finalAsignado.titulo}'. Respuesta recibida:`, respuestaIA);
            if (i < MAX_REINTENTOS - 1) {
                await new Promise(resolve => setTimeout(resolve, 6000)); // Esperar 1 segundo antes de reintentar
            }
        }
    }

    if (!momentosGenerados) {
        console.error(`La IA no devolvió los ${numMomentos} momentos esperados para la rama después de ${MAX_REINTENTOS} intentos. Se devuelve el final al pool.`);
        finalesDisponibles.unshift(finalAsignado); // Devolver el final al principio del pool
        return [];
    }

    let ultimoNodoId = idNodoOrigen;
    const idsNuevos = [];
    const posOrigen = { x: parseFloat(nodoOrigenEl.style.left), y: parseFloat(nodoOrigenEl.style.top) };

    for (const [index, momentoData] of momentosGenerados.entries()) {
        const esElUltimoNodo = index === momentosGenerados.length - 1;
        const nuevoNodo = crearNodoEnLienzo({
            id: `momento_fabrica_${Date.now()}_${Math.random().toString().substring(2)}`,
            titulo: esElUltimoNodo ? `Final: ${momentoData.titulo}` : momentoData.titulo,
            descripcion: momentoData.descripcion || "Descripción no generada.",
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
 * Crea el prompt para la IA, pidiendo una rama lineal hacia un final específico.
 * VERSIÓN MEJORADA con estructura clara, ejemplos y reglas explícitas.
 * @param {string} contextoNodoOrigen - La descripción del nodo de partida.
 * @param {number} numMomentos - Cuántos momentos debe tener la rama.
 * @param {object} finalAsignado - El objeto del final del I Ching (titulo, descripcion, enfoque).
 * @param {string} contextoGlobal - El contexto general de la historia.
 * @returns {string} El prompt completo para la IA.
 */
function generarPromptParaRama(contextoNodoOrigen, numMomentos, finalAsignado, contextoGlobal) {
    // Prompt detallado y con ejemplo para ramas de un solo nodo final.
    if (numMomentos === 1) {
        return `
# TAREA: Crear un ÚNICO Momento Final

**Rol:** Eres un escritor experto en ficción interactiva y narrativa ramificada. Tu tarea es escribir un único momento que sirva como conclusión a una rama de la historia, basándote en el contexto proporcionado.

## CONTEXTO NARRATIVO
1.  **Contexto Global del Universo:**
    > ${contextoGlobal || "El héroe se aventura en un mundo de misterios antiguos y peligros olvidados."}

2.  **Momento de Origen (Punto de partida del jugador):**
    > "${contextoNodoOrigen}"

3.  **Final Predestinado (El clímax que DEBES adaptar):**
    * **Título Esencial:** ${finalAsignado.titulo}
    * **Descripción Temática:** ${finalAsignado.descripcion}
    * **Enfoque Central:** ${finalAsignado.enfoque}

## INSTRUCCIONES Y REGLAS
1.  **Adapta el Final:** Transforma el "Final Predestinado" en un momento narrativo que sea una consecuencia directa y lógica del "Momento de Origen". El título y la descripción deben encajar perfectamente en la historia.
2.  **Calidad de la Descripción:** La descripción debe ser rica y detallada, con una longitud mínima de dos párrafos consistentes.
3.  **Puntuación de Final (Obligatorio):** Al final del texto de la descripción, añade un nuevo párrafo con una puntuación que evalúe qué tan satisfactorio es este final para la trama general. El formato debe ser exactamente: "Puntuación: [un número del 11 al 100]".

## FORMATO DE SALIDA OBLIGATORIO
- Tu respuesta debe ser un **Array JSON VÁLIDO que contenga un único objeto**.
- No incluyas texto, explicaciones o saludos antes o después del array JSON.
- No envuelvas el código en bloques de markdown (\`\`\`json).

### EJEMPLO COMPLETO
* **Ejemplo de Entrada:**
    * **Momento de Origen:** "Con la gema en la mano, el héroe siente cómo la caverna empieza a temblar. Las estalactitas caen y el único camino de salida se está bloqueando."
    * **Final Predestinado:** { titulo: "23. La Desintegración", descripcion: "Una estructura se derrumba. El personaje debe aceptar la pérdida...", enfoque: "Colapso, Pérdida, Dejar ir..." }
* **Ejemplo de Salida Esperada (Tu respuesta debe seguir esta estructura exacta):**
[
    {
        "titulo": "El Colapso de la Gruta Ancestral",
        "descripcion": "Las paredes de la cueva ceden con un estruendo ensordecedor. El héroe aprieta la gema contra su pecho, sintiendo su calor como un último adiós a este lugar olvidado. No hay tiempo para la duda; salta a través de la grieta que se encoge, sintiendo el roce afilado de las rocas en su espalda mientras la entrada se sella para siempre detrás de él.\\n\\nAfuera, bajo la pálida luz de la luna, observa cómo la montaña se asienta, enterrando los secretos que una vez albergó. Ha sobrevivido, pero a un costo. El camino de regreso ha desaparecido, y con él, una parte de la historia. Es una pérdida, pero también una liberación. Ahora, solo puede mirar hacia adelante.\\n\\nPuntuación: 78"
    }
]
`;
    }
    
    // Prompt detallado y con ejemplo para ramas de múltiples nodos.
    return `
# TAREA: Crear una Secuencia Narrativa Lineal

**Rol:** Eres un escritor experto en ficción interactiva y narrativa ramificada. Tu tarea es crear una secuencia coherente de ${numMomentos} momentos que conecten un punto de partida con un final predefinido.

## CONTEXTO NARRATIVO
1.  **Contexto Global del Universo:**
    > ${contextoGlobal || "El héroe se aventura en un mundo de misterios antiguos y peligros olvidados."}

2.  **Momento de Origen (Punto de partida del jugador):**
    > "${contextoNodoOrigen}"

3.  **Final Predestinado (El clímax al que debe llegar esta rama):**
    * **Título Esencial:** ${finalAsignado.titulo}
    * **Descripción Temática:** ${finalAsignado.descripcion}
    * **Enfoque Central:** ${finalAsignado.enfoque}

## INSTRUCCIONES Y REGLAS
1.  **Crea una Cadena Coherente:** Diseña ${numMomentos} momentos que fluyan de manera lógica y natural. El primer momento debe ser una consecuencia directa del "Momento de Origen". Cada momento subsiguiente debe derivarse del anterior.
2.  **Adapta el Final:** El último momento de tu secuencia **debe ser** la adaptación del "Final Predestinado". Mantén su esencia temática, pero ajusta su título y descripción para que funcione como la conclusión culminante de la rama que has creado.
3.  **Secuencia Lineal:** No crees bifurcaciones ni opciones dentro de esta rama. Debe ser una única ruta directa.
4.  **Descripciones de Calidad:** Cada momento debe tener una descripción clara y evocadora.

## FORMATO DE SALIDA OBLIGATORIO
- Tu respuesta debe ser un **Array JSON VÁLIDO que contenga exactamente ${numMomentos} objetos**.
- No incluyas texto, explicaciones o saludos antes o después del array JSON.
- No envuelvas el código en bloques de markdown (\`\`\`json).

### EJEMPLO COMPLETO (para una rama de 3 momentos)
* **Ejemplo de Entrada:**
    * **Momento de Origen:** "El héroe descifra el enigma del pedestal, y una puerta de piedra se abre rechinando, revelando una escalera que desciende a la oscuridad."
    * **Final Predestinado:** { titulo: "48. El Pozo", descripcion: "El personaje representa una fuente inagotable de nutrición para la comunidad...", enfoque: "Fuente de vida, Nutrición, Comunidad..." }
* **Ejemplo de Salida Esperada (Tu respuesta debe seguir esta estructura exacta):**
[
    {
        "titulo": "El Descenso a las Profundidades",
        "descripcion": "Con cautela, el héroe enciende su antorcha y comienza a bajar los gastados escalones. El aire se vuelve más frío y húmedo, y el eco de sus pasos es el único sonido que rompe el silencio sepulcral."
    },
    {
        "titulo": "El Acuífero Subterráneo",
        "descripcion": "La escalera termina en una vasta caverna iluminada por cristales bioluminiscentes. En el centro, un lago subterráneo de aguas increíblemente puras se extiende hasta donde alcanza la vista. El agua parece vibrar con una energía vital."
    },
    {
        "titulo": "Final: La Fuente de la Vida Eterna",
        "descripcion": "El héroe se da cuenta de que no ha encontrado un tesoro, sino el mismísimo corazón del valle. Este lago es la fuente que nutre toda la vida en la superficie. Protegerlo se convierte en su nueva y más sagrada misión, asegurando la prosperidad de su comunidad para siempre."
    }
]
`;
}
/**
 * Calcula la profundidad de cada nodo en la red usando un recorrido BFS.
 * @returns {Map<string, number>} Un mapa donde la clave es el ID del nodo y el valor es su profundidad.
 */
function calcularProfundidades() {
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
const idDestino = accion.idDestino; // Corregido para que coincida con el JSON real
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
 * Filtra un mapa de profundidades para encontrar todos los nodos en un nivel específico.
 * @param {number} profundidadDeseada - La profundidad a buscar.
 * @param {Map<string, number>} mapaProfundidades - El mapa precalculado de profundidades.
 * @returns {Array<string>} Un array con los IDs de los nodos en la profundidad deseada.
 */
function encontrarNodosEnProfundidad(profundidadDeseada, mapaProfundidades) {
    const nodosEnProfundidad = [];
    for (const [nodeId, depth] of mapaProfundidades.entries()) {
        if (depth === profundidadDeseada) {
            nodosEnProfundidad.push(nodeId);
        }
    }
    return nodosEnProfundidad;
}

/**
 * Parsea de forma robusta una respuesta de texto de la IA que se espera que contenga JSON.
 * Limpia errores comunes como texto extra, bloques de código markdown, saltos de línea
 * no escapados y comas finales antes de intentar el parseo.
 *
 * @param {string} rawResponse La respuesta de texto completa de la IA.
 * @returns {object|null} El objeto JSON parseado o null si el parseo falla definitivamente.
 */
function parseAIJsonResponse(rawResponse) {
    if (!rawResponse || typeof rawResponse !== 'string') {
        console.error("La respuesta de la IA está vacía o no es un string.");
        return null;
    }

    try {
        // 1. EXTRAER EL BLOQUE JSON
        // Busca el primer '[' o '{' y el último ']' o '}' para aislar el JSON
        // y descartar texto como "Aquí está el JSON: ..." o envolturas de markdown.
        const firstBracket = rawResponse.indexOf('[');
        const firstBrace = rawResponse.indexOf('{');
        
        let startIndex = -1;
        if (firstBracket === -1) startIndex = firstBrace;
        else if (firstBrace === -1) startIndex = firstBracket;
        else startIndex = Math.min(firstBracket, firstBrace);

        if (startIndex === -1) {
            console.error("No se encontró un JSON válido (ni '[' ni '{') en la respuesta.");
            return null;
        }
        
        const lastBracket = rawResponse.lastIndexOf(']');
        const lastBrace = rawResponse.lastIndexOf('}');
        const endIndex = Math.max(lastBracket, lastBrace);

        let jsonString = rawResponse.substring(startIndex, endIndex + 1);

        // 2. SANITIZAR LA CADENA JSON EXTRAÍDA
        
        // Reemplaza los saltos de línea literales DENTRO de las comillas
        // Esta es una heurística y puede no ser perfecta, pero soluciona el 95% de los casos.
        // La idea es reemplazar \n que no esté precedido o seguido por comillas o llaves.
        // Una forma más simple y efectiva es simplemente escaparlos todos.
        jsonString = jsonString.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");

        // Elimina comas finales (trailing commas) antes de un '}' o ']'
        jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');

        // 3. PARSEAR EN UN BLOQUE TRY-CATCH
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error final al parsear el JSON extraído. Error:", error.message);
        console.error("JSON problemático (después de limpieza inicial):", rawResponse); // Muestra la respuesta original
        return null;
    }
}