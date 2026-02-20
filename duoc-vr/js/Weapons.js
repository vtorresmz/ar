import * as THREE from 'three';
import { gameState } from './Config.js';

// ============================================
// SISTEMA DE MANOS PARA VR Y PC
// ============================================

export function createHandVR(side = 'right') {
    const handGroup = new THREE.Group();
    
    // Palma de la mano - más grande para VR
    const palm = new THREE.Mesh(
        new THREE.BoxGeometry(0.10, 0.04, 0.14),
        new THREE.MeshStandardMaterial({ 
            color: 0xffdbac,
            roughness: 0.8,
            metalness: 0.1
        })
    );
    palm.castShadow = true;
    handGroup.add(palm);
    
    // Dedos más definidos
    const fingerPositions = [
        { x: -0.035, z: 0.08, length: 0.09, radius: 0.010, name: 'index' },   // Índice
        { x: -0.012, z: 0.08, length: 0.10, radius: 0.011, name: 'middle' },  // Medio
        { x: 0.012, z: 0.08, length: 0.09, radius: 0.010, name: 'ring' },     // Anular
        { x: 0.035, z: 0.08, length: 0.07, radius: 0.009, name: 'pinky' },    // Meñique
        { x: -0.048, z: -0.02, length: 0.06, radius: 0.012, name: 'thumb' }   // Pulgar
    ];
    
    fingerPositions.forEach((pos, i) => {
        const finger = new THREE.Mesh(
            new THREE.CylinderGeometry(pos.radius, pos.radius * 0.8, pos.length, 8),
            new THREE.MeshStandardMaterial({ 
                color: 0xffdbac,
                roughness: 0.8,
                metalness: 0.1
            })
        );
        finger.position.set(pos.x, 0, pos.z);
        finger.castShadow = true;
        
        if (pos.name === 'thumb') { // Pulgar
            finger.rotation.x = Math.PI / 4;
            finger.rotation.z = side === 'right' ? Math.PI / 5 : -Math.PI / 5;
        } else {
            finger.rotation.x = Math.PI / 2;
        }
        
        handGroup.add(finger);
    });
    
    // Rotar la mano según el lado para que apunte naturalmente
    handGroup.rotation.x = -Math.PI / 6;
    if (side === 'left') {
        handGroup.rotation.y = Math.PI / 10;
        handGroup.rotation.z = Math.PI / 20;
    } else {
        handGroup.rotation.y = -Math.PI / 10;
        handGroup.rotation.z = -Math.PI / 20;
    }
    
    // Escala general para manos más visibles
    handGroup.scale.set(1.2, 1.2, 1.2);
    
    return handGroup;
}

// Crear puntero visual para interacción en PC
export function createPointerHelper(camera) {
    // El puntero se muestra en el centro de la pantalla
    // Ya existe el crosshair en el HTML, no necesitamos crear uno nuevo
    return null;
}

export function updateHUD() {
    // Solo actualizar estadísticas básicas
    document.getElementById('zombieCount').textContent = gameState.zombies.length;
}

