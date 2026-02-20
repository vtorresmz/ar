import * as THREE from 'three';
import { gameState } from './Config.js';
import { updateNPCs } from './NPCManager.js';

// ============================================
// SISTEMA DE ACTUALIZACIÓN DEL AMBIENTE
// ============================================
// Este archivo maneja principalmente las actualizaciones de NPCs
// Se mantiene el nombre ZombieManager por compatibilidad pero 
// ahora es un gestor de entidades del ambiente virtual

export function updateZombies(delta, scene) {
    // Obtener posición real del jugador (considerando VR)
    const playerPosition = new THREE.Vector3();
    gameState.camera.getWorldPosition(playerPosition);
    
    // Actualizar NPCs y sus animaciones
    updateNPCs(delta, playerPosition);
    
    // Aquí se pueden agregar otras actualizaciones del ambiente:
    // - Partículas ambientales
    // - Efectos visuales
    // - Animaciones de objetos decorativos
    // - etc.
}

