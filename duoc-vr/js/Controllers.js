import * as THREE from 'three';
import { gameState, MOVE_SPEED, RUN_SPEED, ROOM_SIZE, ROOM_HEIGHT, VR_MOVEMENT_SPEED, VR_ROTATION_SPEED } from './Config.js';
import { interactWithNPC, closeNPCDialogue } from './NPCManager.js';
import { createHandVR } from './Weapons.js';

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const PLAYER_COLLISION_RADIUS = 0.34;
const MOVEMENT_COLLISION_STEP = 0.18;
const COLLIDER_Y_MARGIN = 0.35;
const NPC_TALK_CURSOR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <path d="M6 6h20v14H15l-7 6v-6H6z" fill="#5ec9ff" stroke="#0a4d6b" stroke-width="2"/>
  <circle cx="12" cy="13" r="1.6" fill="#ffffff"/>
  <circle cx="16" cy="13" r="1.6" fill="#ffffff"/>
  <circle cx="20" cy="13" r="1.6" fill="#ffffff"/>
</svg>`;
const NPC_TALK_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(NPC_TALK_CURSOR_SVG)}") 4 4, pointer`;
const TEMP_FORWARD = new THREE.Vector3();
const TEMP_RIGHT = new THREE.Vector3();
const TEMP_MOVE = new THREE.Vector3();
const TEMP_CAMERA_WORLD_POS = new THREE.Vector3();

function isPositionBlockedByWalls(x, z, playerY, radius = PLAYER_COLLISION_RADIUS) {
    const colliders = gameState.wallColliders;
    if (!Array.isArray(colliders) || colliders.length === 0) return false;

    for (let i = 0; i < colliders.length; i += 1) {
        const box = colliders[i];
        if (!box) continue;
        if (playerY < box.min.y - COLLIDER_Y_MARGIN || playerY > box.max.y + COLLIDER_Y_MARGIN) {
            continue;
        }

        const nearestX = THREE.MathUtils.clamp(x, box.min.x, box.max.x);
        const nearestZ = THREE.MathUtils.clamp(z, box.min.z, box.max.z);
        const dx = x - nearestX;
        const dz = z - nearestZ;
        if ((dx * dx + dz * dz) < (radius * radius)) {
            return true;
        }
    }

    return false;
}

function applyHorizontalCollisionStep(position, deltaX, deltaZ, playerY, radius = PLAYER_COLLISION_RADIUS) {
    if (!Number.isFinite(deltaX) || !Number.isFinite(deltaZ)) return;
    const travelDistance = Math.hypot(deltaX, deltaZ);
    const steps = Math.max(1, Math.ceil(travelDistance / MOVEMENT_COLLISION_STEP));
    const stepX = deltaX / steps;
    const stepZ = deltaZ / steps;

    let x = position.x;
    let z = position.z;

    for (let i = 0; i < steps; i += 1) {
        const fullX = x + stepX;
        const fullZ = z + stepZ;
        if (!isPositionBlockedByWalls(fullX, fullZ, playerY, radius)) {
            x = fullX;
            z = fullZ;
            continue;
        }

        // Permite "deslizar" por la muralla cuando una componente está bloqueada.
        if (!isPositionBlockedByWalls(fullX, z, playerY, radius)) {
            x = fullX;
            continue;
        }
        if (!isPositionBlockedByWalls(x, fullZ, playerY, radius)) {
            z = fullZ;
        }
    }

    position.x = x;
    position.z = z;
}

function setDesktopRayFromMouse(event) {
    const rect = gameState.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    gameState.raycaster.setFromCamera(mouse, gameState.camera);
}

function setDesktopRayFromCrosshair() {
    const playerPos = new THREE.Vector3();
    gameState.camera.getWorldPosition(playerPos);
    const lookDirection = new THREE.Vector3(0, 0, -1);
    lookDirection.applyQuaternion(gameState.camera.quaternion);
    gameState.raycaster.set(playerPos, lookDirection);
}

function findNearestNPC(playerPos) {
    let nearestNPC = null;
    let nearestDistance = Infinity;

    gameState.npcs.forEach((npc) => {
        if (!npc || !npc.isLoaded || !npc.model) return;
        const planarDistance = Math.hypot(
            npc.model.position.x - playerPos.x,
            npc.model.position.z - playerPos.z
        );
        const maxDistance = npc.interactionDistance * 1.35;
        if (planarDistance <= maxDistance && planarDistance < nearestDistance) {
            nearestDistance = planarDistance;
            nearestNPC = npc;
        }
    });

    return nearestNPC;
}

export function setupVRControllers(renderer, cameraRig) {
    // Controlador 1 (mano derecha)
    gameState.controller1 = renderer.xr.getController(0);
    gameState.controller1.addEventListener('selectstart', (event) => onVRInteract(event, gameState.scene));
    gameState.controller1.addEventListener('selectend', onSelectEnd);
    gameState.controller1.addEventListener('connected', function(event) {
        this.add(buildController(event.data));
    });
    gameState.controller1.addEventListener('disconnected', function() {
        this.remove(this.children[0]);
    });
    cameraRig.add(gameState.controller1);
    
    // Controlador 2 (mano izquierda)
    gameState.controller2 = renderer.xr.getController(1);
    gameState.controller2.addEventListener('selectstart', (event) => onVRInteract(event, gameState.scene));
    gameState.controller2.addEventListener('selectend', onSelectEnd);
    gameState.controller2.addEventListener('connected', function(event) {
        this.add(buildController(event.data));
    });
    gameState.controller2.addEventListener('disconnected', function() {
        this.remove(this.children[0]);
    });
    cameraRig.add(gameState.controller2);
    
    // Grips para las manos (modelos visuales)
    gameState.controllerGrip1 = renderer.xr.getControllerGrip(0);
    gameState.handModel1 = createHandVR('right');
    gameState.controllerGrip1.add(gameState.handModel1);
    cameraRig.add(gameState.controllerGrip1);
    
    gameState.controllerGrip2 = renderer.xr.getControllerGrip(1);
    gameState.handModel2 = createHandVR('left');
    gameState.controllerGrip2.add(gameState.handModel2);
    cameraRig.add(gameState.controllerGrip2);
}

function buildController(data) {
    let geometry, material;
    
    // Crear línea de raycast para apuntar
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));
    
    material = new THREE.LineBasicMaterial({ 
        vertexColors: true, 
        blending: THREE.AdditiveBlending,
        linewidth: 2
    });
    
    return new THREE.Line(geometry, material);
}

function onVRInteract(event, scene) {
    if (!gameState.experienceStarted) return;
    const controller = event.target;
    
    // Preparar raycast desde el controlador
    gameState.tempMatrix.identity().extractRotation(controller.matrixWorld);
    const pointDirection = new THREE.Vector3(0, 0, -1);
    pointDirection.applyMatrix4(gameState.tempMatrix);
    
    const pointPosition = new THREE.Vector3();
    pointPosition.setFromMatrixPosition(controller.matrixWorld);
    
    gameState.raycaster.set(pointPosition, pointDirection);
    
    // Primero verificar si estamos apuntando a un botón VR de NPC
    let interactionMade = false;
    gameState.npcs.forEach(npc => {
        if (!npc.isInteracting || !npc.dialogueGroup.visible) return;
        
        // Verificar botón de cerrar
        if (npc.closeButton) {
            const closeIntersects = gameState.raycaster.intersectObject(npc.closeButton, true);
            if (closeIntersects.length > 0) {
                closeNPCDialogue();
                interactionMade = true;
                // Feedback háptico
                if (controller.gamepad && controller.gamepad.hapticActuators) {
                    controller.gamepad.hapticActuators[0]?.pulse(0.5, 100);
                }
                return;
            }
        }
        
        // Verificar botones de opciones
        npc.vrButtons.forEach(btn => {
            const intersects = gameState.raycaster.intersectObject(btn, true);
            if (intersects.length > 0) {
                const optionIndex = btn.userData.optionIndex;
                if (optionIndex >= 0) {
                    npc.handleInteraction(optionIndex);
                    interactionMade = true;
                    // Feedback háptico
                    if (controller.gamepad && controller.gamepad.hapticActuators) {
                        controller.gamepad.hapticActuators[0]?.pulse(0.5, 100);
                    }
                }
            }
        });
    });
    
    // Si no se tocó ningún botón VR, verificar NPC para iniciar interacción
    if (!interactionMade) {
        const npcIntersects = gameState.raycaster.intersectObjects(gameState.npcHitboxes, false);
        if (npcIntersects.length > 0) {
            const hitNPC = npcIntersects[0].object.userData.npcInstance;
            if (hitNPC && !hitNPC.isInteracting) {
                interactWithNPC(hitNPC);
                interactionMade = true;
                // Feedback háptico
                if (controller.gamepad && controller.gamepad.hapticActuators) {
                    controller.gamepad.hapticActuators[0]?.pulse(0.3, 100);
                }
            }
        }
    }
    
    // Interactuar con objetos del ambiente
    if (!interactionMade) {
        const intersections = gameState.raycaster.intersectObjects(gameState.interactiveObjects, false);
        if (intersections.length > 0) {
            const object = intersections[0].object;
            // Agarrar objeto
            gameState.selectedObject = object;
            gameState.selectedObject.material.emissive.setHex(0x555555);
            controller.attach(gameState.selectedObject);
            // Feedback háptico
            if (controller.gamepad && controller.gamepad.hapticActuators) {
                controller.gamepad.hapticActuators[0]?.pulse(0.2, 50);
            }
        }
    }
}

function onSelectEnd(event) {
    const controller = event.target;
    
    if (gameState.selectedObject) {
        // Soltar objeto
        gameState.selectedObject.material.emissive.setHex(0x000000);
        gameState.scene.attach(gameState.selectedObject);
        gameState.selectedObject = null;
    }
    
    gameState.currentController = null;
}

export function onKeyDown(event) {
    if (!gameState.experienceStarted) return;
    switch (event.code) {
        case 'KeyW': gameState.moveForward = true; break;
        case 'KeyA': gameState.moveLeft = true; break;
        case 'KeyS': gameState.moveBackward = true; break;
        case 'KeyD': gameState.moveRight = true; break;
        case 'Space': 
            if (event.shiftKey) {
                gameState.moveDown = true;
            } else {
                gameState.moveUp = true;
            }
            break;
        case 'ShiftLeft': 
        case 'ShiftRight':
            gameState.isRunning = true; 
            break;
        
        // Interacción con NPCs
        case 'KeyE':
            const playerPos = new THREE.Vector3();
            gameState.camera.getWorldPosition(playerPos);

            let targetNPC = null;

            // Si estamos mirando un NPC, priorizar ese.
            setDesktopRayFromCrosshair();
            const npcIntersects = gameState.raycaster.intersectObjects(gameState.npcHitboxes, false);
            if (npcIntersects.length > 0) {
                targetNPC = npcIntersects[0].object.userData.npcInstance || null;
            }

            // Fallback: NPC más cercano en plano XZ.
            if (!targetNPC) {
                targetNPC = findNearestNPC(playerPos);
            }

            if (targetNPC && !targetNPC.isInteracting) {
                interactWithNPC(targetNPC);
            }
            break;
            
        case 'KeyX':
        case 'Escape':
            closeNPCDialogue();
            break;
            
        // Teclas numéricas para seleccionar opciones del diálogo
        case 'Digit1': if (gameState.currentNPCInteraction) gameState.currentNPCInteraction.handleInteraction(0); break;
        case 'Digit2': if (gameState.currentNPCInteraction) gameState.currentNPCInteraction.handleInteraction(1); break;
        case 'Digit3': if (gameState.currentNPCInteraction) gameState.currentNPCInteraction.handleInteraction(2); break;
        case 'Digit4': if (gameState.currentNPCInteraction) gameState.currentNPCInteraction.handleInteraction(3); break;
        case 'Digit5': if (gameState.currentNPCInteraction) gameState.currentNPCInteraction.handleInteraction(4); break;
        case 'Digit6': if (gameState.currentNPCInteraction) gameState.currentNPCInteraction.handleInteraction(5); break;
        case 'Digit7': if (gameState.currentNPCInteraction) gameState.currentNPCInteraction.handleInteraction(6); break;
        case 'Digit8': if (gameState.currentNPCInteraction) gameState.currentNPCInteraction.handleInteraction(7); break;
        case 'Digit9': if (gameState.currentNPCInteraction) gameState.currentNPCInteraction.handleInteraction(8); break;
        case 'Digit0': if (gameState.currentNPCInteraction) gameState.currentNPCInteraction.handleInteraction(9); break;
    }
}

export function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': gameState.moveForward = false; break;
        case 'KeyA': gameState.moveLeft = false; break;
        case 'KeyS': gameState.moveBackward = false; break;
        case 'KeyD': gameState.moveRight = false; break;
        case 'Space':
            gameState.moveUp = false;
            gameState.moveDown = false;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            gameState.isRunning = false;
            break;
    }
}

export function onMouseDown(event) {
    if (!gameState.experienceStarted) return;
    if (!gameState.controls.isLocked && event.target !== gameState.renderer.domElement) return;

    gameState.preventPointerLockOnce = false;

    if (gameState.controls.isLocked) {
        setDesktopRayFromCrosshair();
    } else {
        // Permite seleccionar NPC y botones del diálogo con click directo en pantalla
        setDesktopRayFromMouse(event);
    }
    
    // Primero, verificar si hay un NPC con diálogo activo
    let buttonClicked = false;
    gameState.npcs.forEach(npc => {
        if (!npc.isInteracting || !npc.dialogueGroup.visible) return;
        
        // Verificar botón de cerrar
        if (npc.closeButton) {
            const closeIntersects = gameState.raycaster.intersectObject(npc.closeButton, true);
            if (closeIntersects.length > 0) {
                closeNPCDialogue();
                buttonClicked = true;
                gameState.preventPointerLockOnce = true;
                return;
            }
        }
        
        // Verificar botones de opciones
        npc.vrButtons.forEach(btn => {
            const intersects = gameState.raycaster.intersectObject(btn, true);
            if (intersects.length > 0) {
                const optionIndex = btn.userData.optionIndex;
                if (optionIndex >= 0) {
                    npc.handleInteraction(optionIndex);
                    buttonClicked = true;
                    gameState.preventPointerLockOnce = true;
                }
            }
        });
    });
    
    // Si no se hizo clic en ningún botón, verificar interacción con NPC
    if (!buttonClicked) {
        const npcIntersects = gameState.raycaster.intersectObjects(gameState.npcHitboxes, false);
        
        if (npcIntersects.length > 0) {
            const hitNPC = npcIntersects[0].object.userData.npcInstance;
            if (hitNPC && !hitNPC.isInteracting) {
                interactWithNPC(hitNPC);
                gameState.preventPointerLockOnce = true;
            }
        }
    }
}

export function onDesktopMouseMove(event) {
    if (!gameState.experienceStarted) return;
    if (!gameState.renderer || gameState.renderer.xr.isPresenting) return;
    if (gameState.controls && gameState.controls.isLocked) return;

    setDesktopRayFromMouse(event);
    const npcIntersects = gameState.raycaster.intersectObjects(gameState.npcHitboxes, false);
    const isHoveringNPC = npcIntersects.length > 0;

    gameState.renderer.domElement.style.cursor = isHoveringNPC ? NPC_TALK_CURSOR : 'default';
}

export function onDesktopMouseLeave() {
    if (!gameState.renderer) return;
    gameState.renderer.domElement.style.cursor = 'default';
}

export function updateMovement(delta) {
    if (!gameState.experienceStarted) return;
    // Movimiento desktop solamente en primera persona bloqueada (Pointer Lock).
    if (!gameState.controls.isLocked) return;

    const inputForward = Number(gameState.moveForward) - Number(gameState.moveBackward);
    const inputStrafe = Number(gameState.moveRight) - Number(gameState.moveLeft);
    const inputVertical = Number(gameState.moveUp) - Number(gameState.moveDown);
    const currentSpeed = gameState.isRunning ? RUN_SPEED : MOVE_SPEED;
    const inputLength = Math.hypot(inputForward, inputStrafe);
    const moveForwardFactor = inputLength > 1 ? inputForward / inputLength : inputForward;
    const moveStrafeFactor = inputLength > 1 ? inputStrafe / inputLength : inputStrafe;

    if (inputForward !== 0 || inputStrafe !== 0) {
        gameState.camera.getWorldDirection(TEMP_FORWARD);
        TEMP_FORWARD.y = 0;
        if (TEMP_FORWARD.lengthSq() < 1e-6) {
            TEMP_FORWARD.set(0, 0, -1);
        } else {
            TEMP_FORWARD.normalize();
        }

        TEMP_RIGHT.crossVectors(TEMP_FORWARD, WORLD_UP).normalize();

        TEMP_MOVE.set(0, 0, 0);
        TEMP_MOVE.addScaledVector(TEMP_RIGHT, moveStrafeFactor * currentSpeed * delta);
        TEMP_MOVE.addScaledVector(TEMP_FORWARD, moveForwardFactor * currentSpeed * delta);

        applyHorizontalCollisionStep(
            gameState.camera.position,
            TEMP_MOVE.x,
            TEMP_MOVE.z,
            gameState.camera.position.y
        );
    }

    if (inputVertical !== 0) {
        gameState.camera.position.y += inputVertical * MOVE_SPEED * 0.45 * delta;
    }

    // Límites de la habitación
    const halfSize = ROOM_SIZE / 2 - 0.2;
    gameState.camera.position.x = Math.max(-halfSize, Math.min(halfSize, gameState.camera.position.x));
    gameState.camera.position.z = Math.max(-halfSize, Math.min(halfSize, gameState.camera.position.z));
    gameState.camera.position.y = Math.max(0.5, Math.min(ROOM_HEIGHT - 0.5, gameState.camera.position.y));
}

export function updateVRMovement(delta) {
    if (!gameState.experienceStarted) return;
    // Solo procesar si estamos en modo VR
    if (!gameState.renderer.xr.isPresenting) return;
    
    const session = gameState.renderer.xr.getSession();
    if (!session) return;
    
    // Obtener los input sources (controladores)
    const inputSources = session.inputSources;
    if (!inputSources) return;
    
    let moveX = 0;
    let moveZ = 0;
    let rotateY = 0;
    
    for (const source of inputSources) {
        if (!source.gamepad) continue;
        
        const gamepad = source.gamepad;
        const axes = gamepad.axes;
        
        // Meta Quest 2/3 típicamente tienen 4 ejes:
        // axes[0] = touchpad/thumbstick X (obsoleto en Quest)
        // axes[1] = touchpad/thumbstick Y (obsoleto en Quest)
        // axes[2] = thumbstick X
        // axes[3] = thumbstick Y
        
        // Detectar qué mano es basándose en handedness
        if (source.handedness === 'left') {
            // Joystick izquierdo: movimiento
            // Para Quest, los thumbsticks están en axes[2] y axes[3]
            if (axes.length >= 4) {
                moveX = axes[2];
                moveZ = axes[3];
            }
            // Fallback para otros dispositivos
            if ((moveX === 0 && moveZ === 0) && axes.length >= 2) {
                moveX = axes[0];
                moveZ = axes[1];
            }
        } else if (source.handedness === 'right') {
            // Joystick derecho: rotación
            if (axes.length >= 4) {
                rotateY = axes[2];
            }
            // Fallback
            if (rotateY === 0 && axes.length >= 2) {
                rotateY = axes[0];
            }
        }
    }
    
    // Aplicar zona muerta para evitar drift
    const deadzone = 0.15;
    if (Math.abs(moveX) < deadzone) moveX = 0;
    if (Math.abs(moveZ) < deadzone) moveZ = 0;
    if (Math.abs(rotateY) < deadzone) rotateY = 0;
    
    // Aplicar rotación (snap turn o continua)
    if (rotateY !== 0) {
        gameState.cameraRig.rotation.y -= rotateY * VR_ROTATION_SPEED * delta;
    }
    
    // Calcular dirección de movimiento basada en la orientación de la cámara
    if (moveX !== 0 || moveZ !== 0) {
        // Obtener la dirección hacia donde mira la cámara en el plano XZ
        gameState.camera.getWorldDirection(TEMP_FORWARD);
        TEMP_FORWARD.y = 0;
        if (TEMP_FORWARD.lengthSq() < 1e-6) {
            TEMP_FORWARD.set(0, 0, -1);
        } else {
            TEMP_FORWARD.normalize();
        }

        TEMP_RIGHT.crossVectors(TEMP_FORWARD, WORLD_UP).normalize();

        TEMP_MOVE.set(0, 0, 0);
        TEMP_MOVE.addScaledVector(TEMP_RIGHT, moveX * VR_MOVEMENT_SPEED * delta);
        TEMP_MOVE.addScaledVector(TEMP_FORWARD, -moveZ * VR_MOVEMENT_SPEED * delta);

        gameState.camera.getWorldPosition(TEMP_CAMERA_WORLD_POS);
        applyHorizontalCollisionStep(
            gameState.cameraRig.position,
            TEMP_MOVE.x,
            TEMP_MOVE.z,
            TEMP_CAMERA_WORLD_POS.y
        );
        
        // Límites de la habitación
        const halfSize = ROOM_SIZE / 2 - 0.5;
        gameState.cameraRig.position.x = Math.max(-halfSize, Math.min(halfSize, gameState.cameraRig.position.x));
        gameState.cameraRig.position.z = Math.max(-halfSize, Math.min(halfSize, gameState.cameraRig.position.z));
    }
}

export function highlightIntersections() {
    if (!gameState.experienceStarted) return;
    // Resaltar objetos cuando el controlador apunta a ellos
    if (!gameState.controller1 && !gameState.controller2) return;
    const activeControllers = [gameState.controller1, gameState.controller2].filter(Boolean);
    const activeDialogueNPCs = gameState.npcs.filter(
        npc => npc.isInteracting && npc.dialogueGroup.visible
    );
    
    // Resetear opacidad de todos los botones VR primero
    activeDialogueNPCs.forEach(npc => {
        if (npc.vrButtons) {
            npc.vrButtons.forEach(btn => {
                if (btn.userData.buttonMesh) {
                    btn.userData.buttonMesh.material.opacity = 0.0;
                    btn.scale.set(1, 1, 1);
                }
            });
        }
        if (npc.closeButton && npc.closeButton.userData.buttonMesh) {
            npc.closeButton.userData.buttonMesh.material.opacity = 0.0;
            npc.closeButton.scale.set(1, 1, 1);
        }
    });
    
    activeControllers.forEach(controller => {
        gameState.tempMatrix.identity().extractRotation(controller.matrixWorld);
        gameState.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        gameState.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(gameState.tempMatrix);
        
        // Verificar botones VR de NPCs
        activeDialogueNPCs.forEach(npc => {
            // Verificar botón de cerrar
            if (npc.closeButton) {
                const closeIntersects = gameState.raycaster.intersectObject(npc.closeButton, true);
                if (closeIntersects.length > 0) {
                    npc.closeButton.userData.buttonMesh.material.opacity = 0.3;
                    npc.closeButton.userData.buttonMesh.material.color.setHex(0xff5555);
                    npc.closeButton.scale.set(1.15, 1.15, 1.15);
                }
            }
            
            // Verificar botones de opciones
            npc.vrButtons.forEach(btn => {
                const intersects = gameState.raycaster.intersectObject(btn, true);
                if (intersects.length > 0) {
                    btn.userData.buttonMesh.material.opacity = 0.25;
                    btn.userData.buttonMesh.material.color.setHex(0x7ecfff);
                    btn.scale.set(1.08, 1.08, 1.08);
                }
            });
        });
        
    });

    // Resaltar objetos interactivos normales una sola vez (evita duplicar raycasts por controlador)
    if (gameState.interactiveObjects.length > 0) {
        const primaryController = activeControllers[0];
        gameState.tempMatrix.identity().extractRotation(primaryController.matrixWorld);
        gameState.raycaster.ray.origin.setFromMatrixPosition(primaryController.matrixWorld);
        gameState.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(gameState.tempMatrix);

        gameState.interactiveObjects.forEach(obj => {
            if (obj !== gameState.selectedObject && obj.material.emissive) {
                obj.material.emissive.setHex(0x000000);
            }
        });

        const intersections = gameState.raycaster.intersectObjects(gameState.interactiveObjects, false);
        if (intersections.length > 0) {
            const object = intersections[0].object;
            if (object !== gameState.selectedObject && object.material.emissive) {
                object.material.emissive.setHex(0x333333);
            }
        }
    }
}

export function highlightPCButtons() {
    if (!gameState.experienceStarted) return;
    // Resaltar botones cuando el crosshair apunta a ellos (modo PC)
    if (!gameState.controls.isLocked) return;
    const activeDialogueNPCs = gameState.npcs.filter(
        npc => npc.isInteracting && npc.dialogueGroup.visible
    );
    if (activeDialogueNPCs.length === 0) return;
    
    // Resetear opacidad de todos los botones VR primero
    activeDialogueNPCs.forEach(npc => {
        if (npc.vrButtons) {
            npc.vrButtons.forEach(btn => {
                if (btn.userData.buttonMesh) {
                    btn.userData.buttonMesh.material.opacity = 0.0;
                    btn.scale.set(1, 1, 1);
                }
            });
        }
        if (npc.closeButton && npc.closeButton.userData.buttonMesh) {
            npc.closeButton.userData.buttonMesh.material.opacity = 0.0;
            npc.closeButton.scale.set(1, 1, 1);
        }
    });
    
    // Configurar raycaster desde la cámara (centro del crosshair)
    const playerPos = new THREE.Vector3();
    gameState.camera.getWorldPosition(playerPos);
    
    const lookDirection = new THREE.Vector3(0, 0, -1);
    lookDirection.applyQuaternion(gameState.camera.quaternion);
    
    gameState.raycaster.set(playerPos, lookDirection);
    
    // Verificar botones VR de NPCs
    activeDialogueNPCs.forEach(npc => {
        // Verificar botón de cerrar
        if (npc.closeButton) {
            const closeIntersects = gameState.raycaster.intersectObject(npc.closeButton, true);
            if (closeIntersects.length > 0) {
                npc.closeButton.userData.buttonMesh.material.opacity = 0.3;
                npc.closeButton.userData.buttonMesh.material.color.setHex(0xff5555);
                npc.closeButton.scale.set(1.15, 1.15, 1.15);
            }
        }
        
        // Verificar botones de opciones
        npc.vrButtons.forEach(btn => {
            const intersects = gameState.raycaster.intersectObject(btn, true);
            if (intersects.length > 0) {
                btn.userData.buttonMesh.material.opacity = 0.25;
                btn.userData.buttonMesh.material.color.setHex(0x7ecfff);
                btn.scale.set(1.08, 1.08, 1.08);
            }
        });
    });
}
