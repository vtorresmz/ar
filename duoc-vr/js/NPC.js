import * as THREE from 'three';
import { NPCDialogueUI } from './NPCDialogueUI.js';

// Clase NPC reutilizable
export class NPC {
    constructor(config) {
        this.name = config.name || 'NPC';
        this.modelPath = config.modelPath;
        this.idleAnimationPath = config.idleAnimationPath;
        this.interactAnimationPath = config.interactAnimationPath;
        this.position = config.position || new THREE.Vector3(0, 0, 0);
        this.scale = config.scale || 0.015;
        this.dialogues = config.dialogues || {};
        this.greeting = config.greeting || '¡Hola!';
        this.dialogueRole = config.dialogueRole || 'Asistente Virtual Duoc UC';
        this.dialogueOffset = (config.dialogueOffset || new THREE.Vector3(1.8, 1.5, 0.5)).clone();
        this.dialoguePanelWidth = config.dialoguePanelWidth || 3.5;
        this.dialoguePanelHeight = config.dialoguePanelHeight || 3.5;
        this.dialogueUIConfig = config.dialogueUIConfig || {};
        // AJUSTE HITBOX NPC: valores editables por personaje.
        this.hitboxRadius = config.hitboxRadius || 0.60;
        this.hitboxHeight = config.hitboxHeight || 5.10;
        this.hitboxOffsetY = Number.isFinite(config.hitboxOffsetY)
            ? config.hitboxOffsetY
            : this.hitboxHeight / 2;
        this.showHitbox = config.showHitbox === true;
        this.showDialogueHitbox = config.showDialogueHitbox === true;
        
        // Estado
        this.model = null;
        this.mixer = null;
        this.idleAnimation = null;
        this.interactAnimation = null;
        this.currentAction = null;
        this.isInteracting = false;
        this.isLoaded = false;
        this.interactionDistance = config.interactionDistance || 3.0;
        
        // UI de diálogo
        this.dialogueGroup = null;
        this.closeButton = null;
        this.currentDialogueState = 'greeting'; // 'greeting', 'questions', 'answer'
        this.selectedQuestion = null;
        
        // Hitbox para interacción
        this.hitbox = null;
        
        // Array para almacenar botones VR interactivos
        this.vrButtons = [];
        this.dialogueUI = null;
        this.questionEntries = [];
        this.questionPage = 0;
        this.questionsPerPage = config.questionsPerPage || 6;
    }
    
    async load(scene, fbxLoader) {
        return new Promise((resolve, reject) => {
            // Cargar animación idle primero
            fbxLoader.load(
                this.idleAnimationPath,
                (fbx) => {
                    this.idleAnimation = fbx.animations[0];
                    console.log(`${this.name}: Idle animation loaded`);
                    
                    // Cargar animación de interacción
                    fbxLoader.load(
                        this.interactAnimationPath,
                        (fbx) => {
                            this.interactAnimation = fbx.animations[0];
                            console.log(`${this.name}: Interact animation loaded`);
                            
                            // Cargar modelo
                            fbxLoader.load(
                                this.modelPath,
                                (fbx) => {
                                    this.model = fbx;
                                    this.model.scale.set(this.scale, this.scale, this.scale);
                                    
                                    // Ajustar posición para que los pies estén en el suelo
                                    const box = new THREE.Box3().setFromObject(this.model);
                                    this.model.position.copy(this.position);
                                    this.model.position.y = -box.min.y * this.scale + this.position.y;
                                    
                                    // Configurar sombras
                                    this.model.traverse((child) => {
                                        if (child.isMesh) {
                                            child.castShadow = false;
                                            child.receiveShadow = false;
                                        }
                                    });
                                    
                                    // Crear mixer y reproducir animación idle
                                    this.mixer = new THREE.AnimationMixer(this.model);
                                    if (this.idleAnimation) {
                                        this.currentAction = this.mixer.clipAction(this.idleAnimation);
                                        this.currentAction.play();
                                    }
                                    
                                    // Crear hitbox para interacción
                                    this.createHitbox(scene);
                                    
                                    // Crear UI de diálogo
                                    this.createDialogueUI(scene);
                                    
                                    scene.add(this.model);
                                    this.isLoaded = true;
                                    
                                    console.log(`${this.name}: Model loaded successfully at`, this.position);
                                    resolve(this);
                                },
                                null,
                                (error) => {
                                    console.error(`${this.name}: Error loading model:`, error);
                                    reject(error);
                                }
                            );
                        },
                        null,
                        (error) => {
                            console.error(`${this.name}: Error loading interact animation:`, error);
                            // Continuar sin animación de interacción
                            this.loadModelOnly(scene, fbxLoader, resolve, reject);
                        }
                    );
                },
                null,
                (error) => {
                    console.error(`${this.name}: Error loading idle animation:`, error);
                    this.loadModelOnly(scene, fbxLoader, resolve, reject);
                }
            );
        });
    }
    
    loadModelOnly(scene, fbxLoader, resolve, reject) {
        fbxLoader.load(
            this.modelPath,
            (fbx) => {
                this.model = fbx;
                this.model.scale.set(this.scale, this.scale, this.scale);
                this.model.position.copy(this.position);
                
                const box = new THREE.Box3().setFromObject(this.model);
                this.model.position.y = -box.min.y * this.scale + this.position.y;
                
                this.model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = false;
                        child.receiveShadow = false;
                    }
                });
                
                this.createHitbox(scene);
                this.createDialogueUI(scene);
                
                scene.add(this.model);
                this.isLoaded = true;
                resolve(this);
            },
            null,
            reject
        );
    }
    
    createHitbox(scene) {
        const hitboxGeometry = new THREE.CylinderGeometry(
            this.hitboxRadius,
            this.hitboxRadius,
            this.hitboxHeight,
            16
        );
        const hitboxMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            // Mostrar collider solo en modo debug para calibración manual.
            opacity: this.showHitbox ? 0.22 : 0.0,
            wireframe: this.showHitbox,
            depthWrite: false,
            depthTest: !this.showHitbox
        });
        this.hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
        this.hitbox.position.copy(this.position);
        this.hitbox.position.y = this.position.y + this.hitboxOffsetY;
        this.hitbox.userData.isNPC = true;
        this.hitbox.userData.npcInstance = this;
        this.hitbox.userData.isDebugCollider = this.showHitbox;
        if (this.showHitbox) {
            this.hitbox.renderOrder = 1500;
        }
        scene.add(this.hitbox);
    }
    
    createDialogueUI(scene) {
        this.dialogueUI = new NPCDialogueUI({
            name: this.name,
            role: this.dialogueRole,
            basePosition: this.position,
            offset: this.dialogueOffset,
            panelWidth: this.dialoguePanelWidth,
            panelHeight: this.dialoguePanelHeight,
            showHitbox: this.showDialogueHitbox,
            ...this.dialogueUIConfig
        });

        this.dialogueUI.attachToScene(scene);
        this.dialogueGroup = this.dialogueUI.group;
        this.closeButton = this.dialogueUI.closeButton;
        this.closeButton.userData.npcInstance = this;
        this.vrButtons = this.dialogueUI.vrButtons;
    }
    
    // Limpiar botones anteriores
    clearVRButtons() {
        if (!this.dialogueUI) return;
        this.dialogueUI.clearOptionButtons();
        this.vrButtons = this.dialogueUI.vrButtons;
    }
    
    updateDialogueText(lines, options = []) {
        if (!this.dialogueUI) return;
        this.dialogueUI.render(lines, options);
        this.vrButtons = this.dialogueUI.vrButtons;
        this.vrButtons.forEach((button) => {
            button.userData.npcInstance = this;
        });
        this.closeButton = this.dialogueUI.closeButton;
        if (this.closeButton) {
            this.closeButton.userData.npcInstance = this;
        }
    }

    setDialogueVisible(visible) {
        if (!this.dialogueUI) return;
        this.dialogueUI.setVisible(visible);
    }
    
    showGreeting() {
        this.currentDialogueState = 'greeting';
        this.setDialogueVisible(true);
        this.updateDialogueText(
            [this.greeting],
            ['Ver preguntas frecuentes']
        );
    }
    
    showQuestions(page = this.questionPage) {
        this.currentDialogueState = 'questions';
        this.setDialogueVisible(true);

        const questionTitles = Object.keys(this.dialogues);
        const totalPages = Math.max(1, Math.ceil(questionTitles.length / this.questionsPerPage));
        this.questionPage = Math.max(0, Math.min(page, totalPages - 1));

        const start = this.questionPage * this.questionsPerPage;
        const visibleQuestions = questionTitles.slice(start, start + this.questionsPerPage);

        this.questionEntries = visibleQuestions.map((question) => ({
            type: 'question',
            label: question,
            value: question
        }));

        if (this.questionPage > 0) {
            this.questionEntries.push({
                type: 'prev',
                label: '← Página anterior'
            });
        }

        if (this.questionPage < totalPages - 1) {
            this.questionEntries.push({
                type: 'next',
                label: 'Página siguiente →'
            });
        }

        const promptLine = totalPages > 1
            ? `Selecciona una pregunta (${this.questionPage + 1}/${totalPages})`
            : 'Selecciona una pregunta frecuente y te respondo al instante:';

        this.updateDialogueText(
            [promptLine],
            this.questionEntries.map((entry) => entry.label)
        );
    }
    
    showAnswer(questionRef) {
        const questions = Object.keys(this.dialogues);
        const question = typeof questionRef === 'number'
            ? questions[questionRef]
            : questionRef;

        if (!question || !Object.prototype.hasOwnProperty.call(this.dialogues, question)) return;

        const answer = this.dialogues[question];
        this.currentDialogueState = 'answer';
        this.setDialogueVisible(true);
        this.selectedQuestion = question;
        this.updateDialogueText(
            [question, '', answer],
            ['← Volver a preguntas']
        );
    }
    
    handleInteraction(optionIndex) {
        switch (this.currentDialogueState) {
            case 'greeting':
                if (optionIndex === 0) {
                    this.showQuestions(0);
                }
                break;
            case 'questions':
                if (optionIndex < 0 || optionIndex >= this.questionEntries.length) break;
                if (this.questionEntries[optionIndex].type === 'question') {
                    this.showAnswer(this.questionEntries[optionIndex].value);
                } else if (this.questionEntries[optionIndex].type === 'prev') {
                    this.showQuestions(this.questionPage - 1);
                } else if (this.questionEntries[optionIndex].type === 'next') {
                    this.showQuestions(this.questionPage + 1);
                }
                break;
            case 'answer':
                if (optionIndex === 0) {
                    this.showQuestions(this.questionPage);
                }
                break;
        }
    }
    
    startInteraction() {
        if (this.isInteracting) return;
        
        this.isInteracting = true;
        
        // Cambiar a animación de pensar
        if (this.mixer && this.interactAnimation) {
            if (this.currentAction) {
                this.currentAction.fadeOut(0.3);
            }
            this.currentAction = this.mixer.clipAction(this.interactAnimation);
            this.currentAction.reset().fadeIn(0.3).play();
        }
        
        this.showQuestions();
    }
    
    endInteraction() {
        if (!this.isInteracting) return;
        
        this.isInteracting = false;
        this.setDialogueVisible(false);
        
        // Volver a animación idle
        if (this.mixer && this.idleAnimation) {
            if (this.currentAction) {
                this.currentAction.fadeOut(0.3);
            }
            this.currentAction = this.mixer.clipAction(this.idleAnimation);
            this.currentAction.reset().fadeIn(0.3).play();
        }
    }
    
    update(delta, playerPosition, cameraQuaternion) {
        if (!this.isLoaded) return;
        
        // Actualizar animación
        if (this.mixer) {
            this.mixer.update(delta);
        }
        
        // Calcular distancia al jugador
        const distance = this.model.position.distanceTo(playerPosition);
        
        // Hacer que el NPC mire al jugador cuando está cerca
        if (distance < this.interactionDistance * 2) {
            const direction = new THREE.Vector3();
            direction.subVectors(playerPosition, this.model.position);
            direction.y = 0;
            const angle = Math.atan2(direction.x, direction.z);
            this.model.rotation.y = angle;
        }
        
        // Hacer que el diálogo siempre mire a la cámara
        if (this.dialogueGroup && this.dialogueGroup.visible) {
            this.dialogueGroup.quaternion.copy(cameraQuaternion);
        }
        
        // Auto-cerrar diálogo si el jugador se aleja
        if (this.isInteracting && distance > this.interactionDistance * 1.5) {
            this.endInteraction();
        }
    }
    
    checkProximity(playerPosition) {
        if (!this.isLoaded) return false;
        const planarDistance = Math.hypot(
            this.model.position.x - playerPosition.x,
            this.model.position.z - playerPosition.z
        );
        return planarDistance <= this.interactionDistance;
    }
}
