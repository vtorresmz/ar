import * as THREE from 'three';
import { NPC } from './NPC.js';
import { gameState, franciscaDialogues } from './Config.js';

// AJUSTE ESCALA NPCs (independiente):
// Modifica solo REMY_SCALE para cambiar la altura/tamano de Remy sin tocar a Francisca.
const FRANCISCA_SCALE = 0.022;
const REMY_SCALE = 0.011;
const FRANCISCA_HITBOX_RADIUS = 0.70;
const FRANCISCA_HITBOX_HEIGHT = 2.99;
const FRANCISCA_HITBOX_OFFSET_Y = 1.99;

const REMY_START_POSITION = new THREE.Vector3(-16.91, 0.90, -19.76);
const REMY_DEMO_DIALOGUES = {
    '¿Cómo pido una sala de clases para una actividad?':
        'Debes coordinar con coordinación académica y solicitar el bloque con anticipación. Como demo: reserva con al menos 48 horas y confirma capacidad de la sala.',
    '¿Qué hago si un computador de la sala no enciende?':
        'Primero revisa cables de energía y monitor. Si sigue fallando, reporta el número del puesto a soporte TI para cambio de equipo o asistencia en terreno.',
    '¿Cuál es el uso correcto de los computadores del laboratorio?':
        'El uso es académico: clases, software de la asignatura y trabajos. Evita instalar programas sin autorización y cierra sesión al terminar.'
};

export async function createNPCFrancisca(scene, fbxLoader) {
    /**
     * Crea una instancia de NPC para el personaje Francisca
     * 
     * @param {Object} config - Configuración del NPC
     * @param {string} config.name - Nombre del personaje: "Francisca"
     * @param {string} config.modelPath - Ruta del modelo 3D: archivo FBX del modelo base (megan.fbx)
     * @param {string} config.idleAnimationPath - Ruta de la animación en reposo: saludando.fbx (se reproduce cuando el NPC está inactivo)
     * @param {string} config.interactAnimationPath - Ruta de la animación de interacción: pensar.fbx (se reproduce al interactuar)
     * @param {THREE.Vector3} config.position - Posición en la escena 3D (X: 0, Y: 0.12 elevado para evitar corte de piernas, Z: -4)
     * @param {number} config.scale - Escala del modelo: 0.022 (valor pequeño para ajustarse correctamente a la escena)
     * @param {number} config.interactionDistance - Distancia máxima de interacción: 4.0 unidades
     * @param {string} config.greeting - Mensaje de saludo inicial del NPC
     * @param {Array} config.dialogues - Array de objetos de diálogo: franciscaDialogues (conversaciones disponibles)
     * @returns {NPC} Instancia del NPC Francisca configurada y lista para usar
     */
    const francisca = new NPC({
        name: 'Francisca',
        modelPath: 'assets/characters/megan.fbx',
        idleAnimationPath: 'assets/characters/saludando.fbx',
        interactAnimationPath: 'assets/characters/pensar.fbx',
        position: new THREE.Vector3(0, 0.90, -4), // Elevado levemente para evitar corte de piernas
        scale: FRANCISCA_SCALE,
        // AJUSTE HITBOX FRANCISCA:
        // Cambia estos 3 valores para calibrar el collider en vivo.
        hitboxRadius: FRANCISCA_HITBOX_RADIUS,
        hitboxHeight: FRANCISCA_HITBOX_HEIGHT,
        hitboxOffsetY: FRANCISCA_HITBOX_OFFSET_Y,
        // Francisca: ocultar hitbox de cuerpo y de dialogo (modo no-debug).
        showHitbox: false,
        showDialogueHitbox: false,
        interactionDistance: 4.0,
        greeting: '¡Hola! Soy Francisca, tu asistente virtual. Cuéntame, ¿cómo puedo ayudarte?',
        dialogues: franciscaDialogues
    });
    
    try {
        await francisca.load(scene, fbxLoader);
        gameState.npcs.push(francisca);
        gameState.npcHitboxes.push(francisca.hitbox);
        
        // Agregar indicador visual encima del NPC
        addNPCIndicator(francisca, scene);
        
        console.log('✅ NPC Francisca creada exitosamente en posición:', francisca.position);
    } catch (error) {
        console.error('❌ Error creando NPC Francisca:', error);
        // Crear NPC placeholder si falla la carga
        createPlaceholderNPC(francisca, scene);
    }
}

export async function createNPCRemy(scene, fbxLoader) {
    const remy = new NPC({
        name: 'Remy',
        modelPath: 'assets/characters/Remy.fbx',
        // Remy queda fijo con animacion/pose ver-hora (sin desplazamiento por ruta).
        idleAnimationPath: 'assets/characters/ver-hora.fbx',
        // Al abrir diálogo, Remy cambia a pose de "hablando" (clip compatible con su rig).
        interactAnimationPath: 'assets/characters/hablando.fbx',
        position: REMY_START_POSITION.clone(),
        scale: REMY_SCALE,
        // Remy usa la misma UI de diálogo (NPCDialogueUI) que Francisca.
        interactionDistance: 4.0,
        // Remy: hitbox oculto (sigue existiendo para interacción).
        showHitbox: false,
        showDialogueHitbox: false,
        greeting: 'Hola, soy Remy. Estas son preguntas demo sobre salas de clases y uso de computadores.',
        dialogues: REMY_DEMO_DIALOGUES
    });

    try {
        await remy.load(scene, fbxLoader);

        // Posicion fija en el punto de inicio.
        if (remy.model) {
            remy.model.position.x = REMY_START_POSITION.x;
            remy.model.position.z = REMY_START_POSITION.z;
            remy.position.x = REMY_START_POSITION.x;
            remy.position.z = REMY_START_POSITION.z;
            // Guardamos ancla para forzar Remy fijo en runtime.
            remy.fixedStartPosition = remy.model.position.clone();
        }

        gameState.npcs.push(remy);
        gameState.npcHitboxes.push(remy.hitbox);
        console.log('✅ NPC Remy creado exitosamente en posición:', REMY_START_POSITION);
    } catch (error) {
        console.error('❌ Error creando NPC Remy:', error);
    }
}

function addNPCIndicator(npc, scene) {
    const indicatorGroup = new THREE.Group();
    
    // Icono de chat flotante
    const iconGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const iconMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0.9
    });
    const icon = new THREE.Mesh(iconGeometry, iconMaterial);
    indicatorGroup.add(icon);
    
    // Texto del indicador en lugar del signo "!"
    const infoLabel = createIndicatorLabel('INFORMACIÓNES');
    infoLabel.position.set(0, 0.01, 0.16);
    indicatorGroup.add(infoLabel);
    
    indicatorGroup.position.copy(npc.position);
    indicatorGroup.position.y = getIndicatorBaseY(npc);
    
    // Animación de flotación
    indicatorGroup.userData.baseY = indicatorGroup.position.y;
    indicatorGroup.userData.isIndicator = true;
    npc.indicator = indicatorGroup;
    
    scene.add(indicatorGroup);
}

function createIndicatorLabel(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return new THREE.Mesh(
            new THREE.PlaneGeometry(0.6, 0.14),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 110px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.lineWidth = 16;
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    const labelGeometry = new THREE.PlaneGeometry(0.65, 0.16);
    const labelMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    return new THREE.Mesh(labelGeometry, labelMaterial);
}

function getIndicatorBaseY(npc) {
    const fallbackY = npc.position.y + 3;
    const headClearance =0.20; // 5x del margen original (0.35)
    if (!npc || !npc.model) return fallbackY;

    const bounds = new THREE.Box3().setFromObject(npc.model);
    if (!Number.isFinite(bounds.max.y)) return fallbackY;

    // Margen para que el indicador quede claramente sobre la cabeza.
    return Math.max(fallbackY, bounds.max.y + headClearance);
}

function createPlaceholderNPC(npcConfig, scene) {
    const group = new THREE.Group();
    
    // Cuerpo
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.35, 1.2, 16),
        new THREE.MeshStandardMaterial({ color: 0x6a5acd, roughness: 0.7 })
    );
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);
    
    // Cabeza
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.8 })
    );
    head.position.y = 1.4;
    head.castShadow = true;
    group.add(head);
    
    // Ojos
    const eyeGeometry = new THREE.SphereGeometry(0.04, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x4169e1 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.08, 1.45, 0.2);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.08, 1.45, 0.2);
    group.add(rightEye);
    
    // Sonrisa
    const smileGeometry = new THREE.TorusGeometry(0.08, 0.02, 8, 16, Math.PI);
    const smileMaterial = new THREE.MeshBasicMaterial({ color: 0xff6b6b });
    const smile = new THREE.Mesh(smileGeometry, smileMaterial);
    smile.position.set(0, 1.35, 0.2);
    smile.rotation.x = Math.PI;
    group.add(smile);
    
    // Cabello
    const hairGeometry = new THREE.SphereGeometry(0.28, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.y = 1.5;
    hair.castShadow = true;
    group.add(hair);
    
    group.position.copy(npcConfig.position);
    npcConfig.model = group;
    npcConfig.isLoaded = true;
    
    npcConfig.createHitbox(scene);
    npcConfig.createDialogueUI(scene);
    
    scene.add(group);
    gameState.npcs.push(npcConfig);
    gameState.npcHitboxes.push(npcConfig.hitbox);
    
    console.log('✅ NPC Placeholder creado para', npcConfig.name);
}

export function updateNPCs(delta, playerPosition) {
    const cameraQuaternion = new THREE.Quaternion();
    gameState.camera.getWorldQuaternion(cameraQuaternion);
    
    const time = performance.now() * 0.001;
    
    gameState.npcs.forEach(npc => {
        npc.update(delta, playerPosition, cameraQuaternion);
        lockRemyAtStart(npc);
        
        // Animar indicador flotante
        if (npc.indicator && !npc.isInteracting) {
            npc.indicator.position.y = npc.indicator.userData.baseY + Math.sin(time * 2) * 0.1;
            npc.indicator.rotation.y = 0;
            npc.indicator.visible = true;
        } else if (npc.indicator) {
            npc.indicator.visible = false;
        }
    });
}

function lockRemyAtStart(npc) {
    if (!npc || npc.name !== 'Remy' || !npc.model || !npc.fixedStartPosition) return;

    // Remy siempre se mantiene en su punto inicial (sin ruta, sin desplazamiento).
    npc.model.position.copy(npc.fixedStartPosition);
    npc.position.x = npc.fixedStartPosition.x;
    npc.position.z = npc.fixedStartPosition.z;
}

export function interactWithNPC(npc, optionIndex = 0) {
    if (!npc.isInteracting) {
        npc.startInteraction();
        gameState.currentNPCInteraction = npc;
    } else {
        npc.handleInteraction(optionIndex);
    }
}

export function closeNPCDialogue() {
    if (gameState.currentNPCInteraction) {
        gameState.currentNPCInteraction.endInteraction();
        gameState.currentNPCInteraction = null;
    }
}
