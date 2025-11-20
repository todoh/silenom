import * as THREE from 'three';

// Definiciones de los componentes arquitectónicos
export const componentDefinitions = {
    // Paredes
    pared: { width: 0.2, height: 2.8, name: 'Pared' },
    muro: { width: 0.4, height: 2.0, name: 'Muro' },
    pared_moldura: { width: 0.2, height: 2.8, name: 'Pared con Moldura' },
    // Ventanas
    ventana_simple: { width: 1.5, height: 1.2, depth: 0.25, name: 'Ventana' },
    ventana_doble: { width: 2.5, height: 1.2, depth: 0.25, name: 'Ventana Doble' },
    // Puertas
    puerta_simple: { width: 0.9, height: 2.1, depth: 0.25, name: 'Puerta' },
    puerta_doble: { width: 1.8, height: 2.1, depth: 0.25, name: 'Puerta Doble' },
};

