// =======================================================================
// === CONSTANTES Y DATOS DEL MUNDO (ACTUALIZADO) ========================
// =======================================================================

const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;
const SUBGRID_SIZE = 10;

// Almacena todos los datos del mapa y la posición inicial del jugador.
let worldData = {
    metadata: {
        playerStartPosition: null
    },
    chunks: {}
};

// Objeto que define las herramientas de texturas, entidades base y entidades personalizadas.
// --- MODIFICADO ---
// Todas las texturas ahora usan 'materialRef' para ser consistentes con la librería de materiales.
let tools = {
    textures: {
        grass: { name: 'Hierba', isPassable: true, material: { materialRef: 'terreno_cesped' } },
        sand: { name: 'Arena', isPassable: true, material: { materialRef: 'terreno_arena' } },
        stone: { name: 'Roca', isPassable: true, material: { materialRef: 'piedra_base' } },
        water: { name: 'Agua', isPassable: false, material: { materialRef: 'cristal' } },
        forest: { name: 'Bosque', isPassable: true, material: { materialRef: 'terreno_bosque' } }, // Se podría crear una textura específica
        lava: { name: 'Lava', isPassable: false, material: { materialRef: 'lava' } },
        nieve: { name: 'Nieve', isPassable: true, material: { materialRef: 'terreno_nieve' } },
        bricks: { name: 'Ladrillos', isPassable: true, material: { materialRef: 'pared_ladrillo'} },
        wood: { name: 'Madera', isPassable: true, material: { materialRef: 'madera_vigas'} }
    },
    entities: {eraser: { name: "Borrador", icon: "❌", isSolid: false },
     selector: { name: "Selector", icon: "👆", isSolid: false },
        playerStart: { icon: '🚩', name: 'Inicio del Jugador', isSolid: false, radius: 0 }
        
        
  
 
     
}};
