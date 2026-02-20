import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// Importar módulos del proyecto
import { gameState } from './Config.js';
import { createRoom, setupLighting, updateDoors } from './SceneSetup.js';
import { 
    setupVRControllers, 
    onKeyDown, 
    onKeyUp, 
    onMouseDown, 
    onDesktopMouseMove,
    onDesktopMouseLeave,
    updateMovement, 
    updateVRMovement,
    highlightIntersections,
    highlightPCButtons
} from './Controllers.js';
import { updateZombies } from './ZombieManager.js';
import { createNPCFrancisca, createNPCRemy } from './NPCManager.js';

const DESKTOP_MAX_PIXEL_RATIO = 1.25;
const VR_MAX_PIXEL_RATIO = 1.0;
const DESKTOP_HIGHLIGHT_INTERVAL_MS = 33; // ~30 Hz
const VR_HIGHLIGHT_INTERVAL_MS = 22; // ~45 Hz
const DEBUG_COORDS_ENABLED = true;
const DEBUG_COORDS_UPDATE_INTERVAL_MS = 120;
const PLAYER_START_Y = 4.33;

let lastHighlightUpdateTime = 0;
let lastDebugCoordsUpdateTime = 0;
const PRELOAD_FADE_OUT_MS = 420;
let hasStartedExperience = false;
const playerWorldPosition = new THREE.Vector3();
const debugCameraQuaternion = new THREE.Quaternion();
const debugCameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');
let debugCoordsOverlay = null;

const preloadOverlay = document.getElementById('preloadOverlay');
const startExperienceButton = document.getElementById('startExperienceButton');
const preloadProgressFill = document.getElementById('preloadProgressFill');
const preloadProgressText = document.getElementById('preloadProgressText');

function updatePreloadProgress(loaded, total) {
    if (!preloadProgressFill || !preloadProgressText) return;
    const safeTotal = Math.max(1, total || 1);
    const rawPercent = (loaded / safeTotal) * 100;
    const percent = Math.max(0, Math.min(100, Math.round(rawPercent)));
    preloadProgressFill.style.width = `${percent}%`;
    preloadProgressText.textContent = `Cargando experiencia... ${percent}%`;
}

function revealStartButton() {
    updatePreloadProgress(1, 1);
    gameState.assetsReady = true;
    if (!preloadOverlay) return;
    preloadOverlay.classList.add('progress-complete');
    if (startExperienceButton) {
        startExperienceButton.disabled = false;
    }
}

function startExperience() {
    if (hasStartedExperience || !gameState.assetsReady) return;

    hasStartedExperience = true;
    gameState.experienceStarted = true;

    if (!preloadOverlay) return;
    preloadOverlay.classList.add('hide');
    window.setTimeout(() => {
        preloadOverlay.remove();
    }, PRELOAD_FADE_OUT_MS);
}

if (startExperienceButton) {
    startExperienceButton.addEventListener('click', () => {
        startExperience();
    });
}

function getTargetPixelRatio() {
    return gameState.renderer && gameState.renderer.xr.isPresenting
        ? Math.min(window.devicePixelRatio, VR_MAX_PIXEL_RATIO)
        : Math.min(window.devicePixelRatio, DESKTOP_MAX_PIXEL_RATIO);
}

function ensureDebugCoordsOverlay() {
    if (!DEBUG_COORDS_ENABLED || debugCoordsOverlay) return;
    debugCoordsOverlay = document.createElement('div');
    debugCoordsOverlay.id = 'debugCoordsOverlay';
    debugCoordsOverlay.style.position = 'absolute';
    debugCoordsOverlay.style.right = '10px';
    debugCoordsOverlay.style.bottom = '10px';
    debugCoordsOverlay.style.zIndex = '140';
    debugCoordsOverlay.style.padding = '10px 12px';
    debugCoordsOverlay.style.border = '1px solid rgba(126, 207, 255, 0.55)';
    debugCoordsOverlay.style.borderRadius = '8px';
    debugCoordsOverlay.style.background = 'rgba(0, 18, 34, 0.78)';
    debugCoordsOverlay.style.color = '#d7eeff';
    debugCoordsOverlay.style.fontSize = '12px';
    debugCoordsOverlay.style.lineHeight = '1.35';
    debugCoordsOverlay.style.whiteSpace = 'pre';
    debugCoordsOverlay.style.pointerEvents = 'none';
    debugCoordsOverlay.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    debugCoordsOverlay.textContent = 'DEBUG COORDS\nEsperando inicio de experiencia...';
    document.body.appendChild(debugCoordsOverlay);
}

function updateDebugCoordsOverlay(time, worldPosition = null) {
    if (!DEBUG_COORDS_ENABLED || !debugCoordsOverlay) return;
    if (time - lastDebugCoordsUpdateTime < DEBUG_COORDS_UPDATE_INTERVAL_MS) return;
    lastDebugCoordsUpdateTime = time;

    if (!gameState.experienceStarted || !gameState.camera) {
        debugCoordsOverlay.textContent = 'DEBUG COORDS\nEsperando inicio de experiencia...';
        return;
    }

    const p = worldPosition || playerWorldPosition;
    const x = p.x;
    const y = p.y;
    const z = p.z;
    gameState.camera.getWorldQuaternion(debugCameraQuaternion);
    debugCameraEuler.setFromQuaternion(debugCameraQuaternion, 'YXZ');
    const yaw = THREE.MathUtils.radToDeg(debugCameraEuler.y);
    const mode = gameState.renderer.xr.isPresenting ? 'VR' : 'PC';
    const lockState = gameState.controls?.isLocked ? 'LOCK' : 'FREE';
    const rig = gameState.cameraRig ? gameState.cameraRig.position : { x: 0, y: 0, z: 0 };

    debugCoordsOverlay.textContent =
`DEBUG COORDS (${mode}/${lockState})
PLAYER  X:${x.toFixed(2)}  Y:${y.toFixed(2)}  Z:${z.toFixed(2)}
RIG     X:${rig.x.toFixed(2)}  Y:${rig.y.toFixed(2)}  Z:${rig.z.toFixed(2)}
YAW     ${yaw.toFixed(1)}°
NPC POS new THREE.Vector3(${x.toFixed(2)}, 0.90, ${z.toFixed(2)})`;
}

// Inicializar aplicación
init();
animate();

function init() {
    ensureDebugCoordsOverlay();
    const loadingManager = new THREE.LoadingManager();
    loadingManager.onStart = (_url, itemsLoaded, itemsTotal) => {
        updatePreloadProgress(itemsLoaded, itemsTotal);
    };
    loadingManager.onProgress = (_url, itemsLoaded, itemsTotal) => {
        updatePreloadProgress(itemsLoaded, itemsTotal);
    };
    loadingManager.onLoad = () => {
        revealStartButton();
    };
    loadingManager.onError = (url) => {
        console.warn(`No se pudo cargar: ${url}`);
    };

    // Crear escena
    gameState.scene = new THREE.Scene();
    gameState.scene.background = new THREE.Color(0x87CEEB); // Cielo azul claro

    // Crear cámara
    gameState.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );
    
    // Crear camera rig para movimiento VR
    gameState.cameraRig = new THREE.Group();
    gameState.cameraRig.add(gameState.camera);
    gameState.scene.add(gameState.cameraRig);
    gameState.cameraRig.position.set(0, 0, 0); // El rig está en el suelo
    gameState.camera.position.set(0, PLAYER_START_Y, 0); // Altura inicial solicitada para vista de usuario

    // Crear renderer con soporte WebXR
    gameState.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    gameState.renderer.setPixelRatio(getTargetPixelRatio());
    gameState.renderer.setSize(window.innerWidth, window.innerHeight);
    // Sombras desactivadas para priorizar rendimiento estable en desktop/VR.
    gameState.renderer.shadowMap.enabled = false;
    gameState.renderer.xr.enabled = true;
    document.getElementById('container').appendChild(gameState.renderer.domElement);

    // Configurar VR Button
    const vrButton = VRButton.createButton(gameState.renderer);
    document.getElementById('vrButton').replaceWith(vrButton);
    
    // Configurar controladores VR y manos
    setupVRControllers(gameState.renderer, gameState.cameraRig);

    // Iluminación
    setupLighting(gameState.scene);

    // Crear la habitación
    createRoom(gameState.scene, loadingManager);

    // Controles de primera persona (solo para modo no-VR)
    gameState.controls = new PointerLockControls(gameState.camera, gameState.renderer.domElement);

    // Event listeners para PointerLockControls
    const crosshairDot = document.querySelector('.crosshair-dot');
    gameState.renderer.domElement.addEventListener('click', () => {
        if (!gameState.experienceStarted) return;
        if (!gameState.renderer.xr.isPresenting) {
            if (gameState.preventPointerLockOnce) {
                gameState.preventPointerLockOnce = false;
                return;
            }
            gameState.controls.lock();
        }
    });

    gameState.controls.addEventListener('lock', () => {
        document.getElementById('info').style.opacity = '0.3';
        document.getElementById('crosshair').style.display = 'block';
        if (crosshairDot) crosshairDot.style.display = 'block';
    });

    gameState.controls.addEventListener('unlock', () => {
        document.getElementById('info').style.opacity = '1';
        document.getElementById('crosshair').style.display = 'none';
        if (crosshairDot) crosshairDot.style.display = 'none';
    });

    // Controles de teclado
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    // Interacción con click (escritorio)
    document.addEventListener('mousedown', onMouseDown);
    gameState.renderer.domElement.addEventListener('mousemove', onDesktopMouseMove);
    gameState.renderer.domElement.addEventListener('mouseleave', onDesktopMouseLeave);
    
    // Cargar NPC Francisca
    const fbxLoader = new FBXLoader(loadingManager);
    createNPCFrancisca(gameState.scene, fbxLoader);
    createNPCRemy(gameState.scene, fbxLoader);

    // Redimensionar ventana
    window.addEventListener('resize', onWindowResize);

    // Detectar cuando entramos en VR
    gameState.renderer.xr.addEventListener('sessionstart', () => {
        gameState.renderer.setPixelRatio(getTargetPixelRatio());
        gameState.renderer.setSize(window.innerWidth, window.innerHeight, false);
        document.getElementById('info').classList.add('hidden');
        document.getElementById('vrInfo').classList.remove('hidden');
        document.getElementById('crosshair').style.display = 'none';
        if (crosshairDot) crosshairDot.style.display = 'none';
    });

    gameState.renderer.xr.addEventListener('sessionend', () => {
        gameState.renderer.setPixelRatio(getTargetPixelRatio());
        gameState.renderer.setSize(window.innerWidth, window.innerHeight, false);
        document.getElementById('info').classList.remove('hidden');
        document.getElementById('vrInfo').classList.add('hidden');
        document.getElementById('crosshair').style.display = 'none';
        if (crosshairDot) crosshairDot.style.display = 'none';
    });
}

function onWindowResize() {
    gameState.camera.aspect = window.innerWidth / window.innerHeight;
    gameState.camera.updateProjectionMatrix();
    gameState.renderer.setPixelRatio(getTargetPixelRatio());
    gameState.renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    gameState.renderer.setAnimationLoop(() => {
        const time = performance.now();
        const delta = (time - gameState.prevTime) / 1000;

        if (gameState.experienceStarted) {
            updateMovement(delta);
            updateVRMovement(delta); // Movimiento con joysticks en VR
            gameState.camera.getWorldPosition(playerWorldPosition);
            updateDoors(delta, playerWorldPosition);
            updateZombies(delta, gameState.scene); // Actualiza NPCs principalmente
            updateDebugCoordsOverlay(time, playerWorldPosition);
            
            // Throttle de resaltado/raycast para reducir costo de CPU
            const highlightInterval = gameState.renderer.xr.isPresenting
                ? VR_HIGHLIGHT_INTERVAL_MS
                : DESKTOP_HIGHLIGHT_INTERVAL_MS;
            if (time - lastHighlightUpdateTime >= highlightInterval) {
                if (gameState.renderer.xr.isPresenting) {
                    highlightIntersections(); // VR: resaltar con controladores
                } else if (gameState.controls.isLocked) {
                    highlightPCButtons(); // PC: resaltar con crosshair
                }
                lastHighlightUpdateTime = time;
            }
        }
        else {
            updateDebugCoordsOverlay(time);
        }
        
        gameState.renderer.render(gameState.scene, gameState.camera);

        gameState.prevTime = time;
    });
}
