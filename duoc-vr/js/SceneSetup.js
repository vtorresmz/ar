import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { ROOM_SIZE, ROOM_HEIGHT, gameState } from './Config.js';

const FLOOR_TILE_MODEL = 1; // 1: baldosa grande (tilt-mode-1), 2: baldosa chica (tilt-model-2)
const OFFICE_WALL_HEIGHT = ROOM_HEIGHT;
const OFFICE_WALL_THICKNESS = 0.12;
// AJUSTE PUERTAS: ancho base del vano/puerta.
const OFFICE_DOOR_WIDTH = 1.55;
const MIN_WALL_SEGMENT = 0.35;
const BAKED_LIGHTMAP_RESOLUTION = 512;
const DOOR_MODEL_PATH = 'build/puertas/source/Door-Pack-Free.fbx';
// La puerta queda más baja que el muro para que quede "rodeada" por la planta.
// AJUSTE PUERTAS: alto objetivo de las puertas.
const DOOR_TARGET_HEIGHT = 2.8;
const DOOR_OPEN_DISTANCE = 2.4;
const DOOR_OPEN_ANGLE = THREE.MathUtils.degToRad(92);
const DOOR_OPEN_DAMPING = 8.0;
const DOOR_SIDE_EPSILON = 0.04;
const MAX_ACTIVE_DOORS = 36;
const DOOR_OPENING_CLEARANCE = 0.26;
const DOOR_PLACEMENT_OFFSET = 0.0;
// AJUSTE PUERTAS: margen interno al calzar la puerta dentro del vano.
const DOOR_FIT_MARGIN = 0.03;
// AJUSTE PUERTAS: evita que la puerta quede demasiado angosta al escalar.
const MIN_DOOR_HORIZONTAL_SCALE = 0.32;
const PLAN_WIDTH_METERS = 29.87;
const PLAN_DEPTH_METERS = 12.0;
const PLAN_HALF_WIDTH = PLAN_WIDTH_METERS / 2;
const PLAN_HALF_DEPTH = PLAN_DEPTH_METERS / 2;
const OFFICE_WORLD_MARGIN = 6.0;
const OFFICE_PLAN_SCALE = (ROOM_SIZE - OFFICE_WORLD_MARGIN * 2) / PLAN_WIDTH_METERS;
const OFFICE_PLAN_OFFSET_X = 0;
const OFFICE_PLAN_OFFSET_Z = 0;
const OFFICE_PACK_MODEL_PATH = 'build/cosas-oficina/source/Office_Pack.fbx';
const OFFICE_PACK_TEXTURE_PATH = 'build/cosas-oficina/textures/Office_Texture.png';
const MAX_OFFICE_FURNITURE_INSTANCES = 48;
const OFFICE_BASE_MODEL_PATHS = [
    'build/oficina-base/source/My_home.fbx',
    'build/mapas/oficina-base/source/My_home.fbx'
];
const OFFICE_BASE_WALL_TEXTURE_PATHS = [
    'assets/textures/muralla.webp'
];
const OFFICE_BASE_WALL_NORMAL_PATHS = [
    // Sin normal map dedicado para el set estandar de murallas.
];
const OFFICE_BASE_FLOOR_TEXTURE_PATHS = [
    'assets/textures/tilt-mode-1.webp'
];
// AJUSTE OFICINA-BASE (ESCALA):
// El objetivo es que el techo del modelo quede alineado al alto de la planta (ROOM_HEIGHT).
const OFFICE_BASE_TARGET_HEIGHT = ROOM_HEIGHT;
const OFFICE_BASE_SCALE_MULTIPLIER = 1.0;
// AJUSTE OFICINA-BASE (ALTURA): sube o baja solo el eje Y del modelo (techo/murallas).
// 1.0 = sin cambio, 1.15 = +15% de altura.
const OFFICE_BASE_VERTICAL_STRETCH = 1.22;
const OFFICE_BASE_MIN_FINAL_HEIGHT = ROOM_HEIGHT * 1.0;
const OFFICE_BASE_MAX_FINAL_HEIGHT = ROOM_HEIGHT * 1.35;
// AJUSTE OFICINA-BASE (ORIENTACION):
// Estos valores se aplican como ajuste adicional sobre la orientacion original del FBX.
const OFFICE_BASE_ROTATION_X = -Math.PI / 2; // -90 grados para pasar de vertical a horizontal
const OFFICE_BASE_ROTATION_Y = 0.0;
const OFFICE_BASE_ROTATION_Z = 0.0;
// AJUSTE OFICINA-BASE (POSICION):
// Mueve el bloque completo en el mundo para alinearlo con Francisca.
const OFFICE_BASE_OFFSET_X = 0.0;
const OFFICE_BASE_OFFSET_Z = -4.0;
// AJUSTE CUADRO/IMAGEN: posicion y orientacion del marco vacio para futura imagen.
const WALL_FRAME_POSITION = new THREE.Vector3(-23.57, 4.33, -7.48);
const WALL_FRAME_ROTATION_Y_DEG = -92.5;
const WALL_FRAME_OUTER_WIDTH = 2.0;
const WALL_FRAME_OUTER_HEIGHT = 1.2;
const WALL_FRAME_BORDER = 0.08;
const WALL_FRAME_DEPTH = 0.05;
// Slots de cuadros:
// 0 = cuadro base, negativos hacia la derecha (-1,-2,-3), positivos hacia la izquierda (1,2,3).
const WALL_FRAME_SLOT_INDICES = [0, -1, -2, -3, 1, 2, 3];
const WALL_FRAME_HORIZONTAL_GAP = 0.28;
const WALL_FRAME_HORIZONTAL_STEP = WALL_FRAME_OUTER_WIDTH + WALL_FRAME_HORIZONTAL_GAP;
const WALL_FRAME_SHOW_SLOT_LABELS = true;

function setupTiledTexture(texture, repeatX, repeatY) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.colorSpace = THREE.SRGBColorSpace;
    if (gameState.renderer) {
        const maxAnisotropy = gameState.renderer.capabilities.getMaxAnisotropy();
        texture.anisotropy = Math.min(8, maxAnisotropy);
    }
    return texture;
}

function ensureUV2(geometry) {
    if (!geometry || geometry.getAttribute('uv2')) return;
    const uv = geometry.getAttribute('uv');
    if (!uv) return;
    const uv2 = new Float32Array(uv.array.length);
    uv2.set(uv.array);
    geometry.setAttribute('uv2', new THREE.BufferAttribute(uv2, 2));
}

function createBakedLightMapTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = BAKED_LIGHTMAP_RESOLUTION;
    canvas.height = BAKED_LIGHTMAP_RESOLUTION;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (type === 'floor') {
        const center = ctx.createRadialGradient(
            canvas.width * 0.5,
            canvas.height * 0.5,
            canvas.width * 0.08,
            canvas.width * 0.5,
            canvas.height * 0.5,
            canvas.width * 0.58
        );
        center.addColorStop(0, 'rgba(230,230,230,0.95)');
        center.addColorStop(1, 'rgba(52,52,52,0.42)');
        ctx.fillStyle = center;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const edgeFade = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        edgeFade.addColorStop(0, 'rgba(20,20,20,0.72)');
        edgeFade.addColorStop(0.5, 'rgba(58,58,58,0.18)');
        edgeFade.addColorStop(1, 'rgba(20,20,20,0.72)');
        ctx.fillStyle = edgeFade;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (type === 'wall') {
        const vertical = ctx.createLinearGradient(0, 0, 0, canvas.height);
        vertical.addColorStop(0, 'rgba(160,160,160,0.64)');
        vertical.addColorStop(0.45, 'rgba(230,230,230,0.90)');
        vertical.addColorStop(1, 'rgba(96,96,96,0.70)');
        ctx.fillStyle = vertical;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const sideOcclusion = ctx.createLinearGradient(0, 0, canvas.width, 0);
        sideOcclusion.addColorStop(0, 'rgba(38,38,38,0.72)');
        sideOcclusion.addColorStop(0.12, 'rgba(88,88,88,0.15)');
        sideOcclusion.addColorStop(0.88, 'rgba(88,88,88,0.15)');
        sideOcclusion.addColorStop(1, 'rgba(38,38,38,0.72)');
        ctx.fillStyle = sideOcclusion;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        const ceiling = ctx.createRadialGradient(
            canvas.width * 0.5,
            canvas.height * 0.5,
            canvas.width * 0.12,
            canvas.width * 0.5,
            canvas.height * 0.5,
            canvas.width * 0.65
        );
        ceiling.addColorStop(0, 'rgba(245,245,245,0.78)');
        ceiling.addColorStop(1, 'rgba(72,72,72,0.45)');
        ctx.fillStyle = ceiling;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
}

function applyBakedLightMap(material, lightMap, intensity) {
    if (!material || !lightMap) return;
    material.lightMap = lightMap;
    material.lightMapIntensity = intensity;
    material.needsUpdate = true;
}

export function createRoom(scene, loadingManager = undefined) {
    const halfSize = ROOM_SIZE / 2;
    const textureLoader = new THREE.TextureLoader(loadingManager);
    gameState.wallColliders.length = 0;

    // Solo hay WebP de tile model 1 en el proyecto; model 2 usa el mismo atlas con mayor repetición.
    const floorTexturePath = 'assets/textures/tilt-mode-1.webp';

    const floorTexture = setupTiledTexture(
        textureLoader.load(floorTexturePath),
        FLOOR_TILE_MODEL === 2 ? 30 : 18,
        FLOOR_TILE_MODEL === 2 ? 30 : 18
    );

    const wallTexture = setupTiledTexture(
        textureLoader.load('assets/textures/muralla.webp'),
        20,
        2
    );

    const ceilingTexture = setupTiledTexture(
        textureLoader.load('assets/textures/techo-texture.webp'),
        12,
        12
    );

    const bakedFloorLightMap = createBakedLightMapTexture('floor');
    const bakedWallLightMap = createBakedLightMapTexture('wall');
    const bakedCeilingLightMap = createBakedLightMapTexture('ceiling');

    // Material para las paredes
    const wallMaterial = new THREE.MeshStandardMaterial({
        map: wallTexture,
        side: THREE.DoubleSide,
        roughness: 0.9,
        metalness: 0.05
    });

    const ceilingMaterial = new THREE.MeshStandardMaterial({
        map: ceilingTexture,
        side: THREE.DoubleSide,
        roughness: 0.94,
        metalness: 0.02
    });

    const ceilingStepMaterial = new THREE.MeshStandardMaterial({
        color: 0xf6f8fc,
        side: THREE.DoubleSide,
        roughness: 0.96,
        metalness: 0.01
    });

    const coveStripMaterial = new THREE.MeshStandardMaterial({
        color: 0xf8fbff,
        emissive: 0xd5ebff,
        emissiveIntensity: 1.15,
        roughness: 0.35,
        metalness: 0.05
    });

    applyBakedLightMap(wallMaterial, bakedWallLightMap, 0.62);
    applyBakedLightMap(ceilingMaterial, bakedCeilingLightMap, 0.50);
    applyBakedLightMap(ceilingStepMaterial, bakedCeilingLightMap, 0.46);

    // Suelo
    const floorGeometry = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
    ensureUV2(floorGeometry);
    const floorMaterial = new THREE.MeshStandardMaterial({
        map: floorTexture,
        roughness: 0.92,
        metalness: 0.04
    });
    applyBakedLightMap(floorMaterial, bakedFloorLightMap, 0.72);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Cielo falso tipo tray ceiling en dos niveles con iluminación perimetral
    createTrayCeiling(scene, {
        ceilingY: ROOM_HEIGHT,
        outerWidth: ROOM_SIZE,
        outerDepth: ROOM_SIZE,
        firstRecessWidth: ROOM_SIZE * 0.78,
        firstRecessDepth: ROOM_SIZE * 0.78,
        secondRecessWidth: ROOM_SIZE * 0.5,
        secondRecessDepth: ROOM_SIZE * 0.5,
        firstStepHeight: 0.26,
        secondStepHeight: 0.22,
        ceilingMaterial,
        ceilingStepMaterial,
        coveStripMaterial
    });

    // Pared trasera (Norte)
    const wallGeometry = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_HEIGHT);
    ensureUV2(wallGeometry);
    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.z = -halfSize;
    backWall.position.y = ROOM_HEIGHT / 2;
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Pared frontal (Sur)
    const frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
    frontWall.position.z = halfSize;
    frontWall.position.y = ROOM_HEIGHT / 2;
    frontWall.rotation.y = Math.PI;
    frontWall.receiveShadow = true;
    scene.add(frontWall);

    // Pared izquierda (Oeste)
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.x = -halfSize;
    leftWall.position.y = ROOM_HEIGHT / 2;
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Pared derecha (Este)
    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.x = halfSize;
    rightWall.position.y = ROOM_HEIGHT / 2;
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Planta completa tipo oficina con vanos y puertas operables.
    addCompleteOfficePlan(scene, wallMaterial, loadingManager);
    addEmptyWallFrames(scene);

    // Sin líneas artificiales en esquinas para mantener look arquitectónico realista
}

function addEmptyWallFrames(scene) {
    const yaw = THREE.MathUtils.degToRad(WALL_FRAME_ROTATION_Y_DEG);
    const localRight = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    gameState.imageFrameAnchors = new Map();

    WALL_FRAME_SLOT_INDICES.forEach((slotIndex) => {
        const offset = slotIndex * WALL_FRAME_HORIZONTAL_STEP;
        const framePosition = WALL_FRAME_POSITION.clone().addScaledVector(localRight, offset);
        const frameGroup = createEmptyWallFrame(slotIndex);
        frameGroup.position.copy(framePosition);
        frameGroup.rotation.y = yaw;
        scene.add(frameGroup);
        const anchor = frameGroup.getObjectByName(`empty-image-anchor-${slotIndex}`);
        if (anchor) {
            gameState.imageFrameAnchors.set(slotIndex, anchor);
        }
    });
}

function createEmptyWallFrame(slotIndex) {
    const frameGroup = new THREE.Group();
    frameGroup.name = `empty-image-frame-${slotIndex}`;
    frameGroup.userData.frameSlot = slotIndex;

    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x232323,
        roughness: 0.5,
        metalness: 0.22
    });

    const outerW = WALL_FRAME_OUTER_WIDTH;
    const outerH = WALL_FRAME_OUTER_HEIGHT;
    const border = WALL_FRAME_BORDER;
    const depth = WALL_FRAME_DEPTH;
    const innerW = Math.max(0.2, outerW - border * 2);
    const innerH = Math.max(0.2, outerH - border * 2);

    const topBar = new THREE.Mesh(new THREE.BoxGeometry(outerW, border, depth), frameMaterial);
    topBar.position.set(0, (outerH - border) * 0.5, 0);
    frameGroup.add(topBar);

    const bottomBar = new THREE.Mesh(new THREE.BoxGeometry(outerW, border, depth), frameMaterial);
    bottomBar.position.set(0, -(outerH - border) * 0.5, 0);
    frameGroup.add(bottomBar);

    const leftBar = new THREE.Mesh(new THREE.BoxGeometry(border, innerH, depth), frameMaterial);
    leftBar.position.set(-(outerW - border) * 0.5, 0, 0);
    frameGroup.add(leftBar);

    const rightBar = new THREE.Mesh(new THREE.BoxGeometry(border, innerH, depth), frameMaterial);
    rightBar.position.set((outerW - border) * 0.5, 0, 0);
    frameGroup.add(rightBar);

    // Ancla invisible para poner una imagen despues (map de textura).
    const imageAnchor = new THREE.Mesh(
        new THREE.PlaneGeometry(innerW, innerH),
        new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.0,
            side: THREE.DoubleSide,
            depthWrite: false
        })
    );
    imageAnchor.name = `empty-image-anchor-${slotIndex}`;
    imageAnchor.position.z = depth * 0.52;
    frameGroup.add(imageAnchor);

    if (WALL_FRAME_SHOW_SLOT_LABELS) {
        const label = createWallFrameSlotLabel(slotIndex);
        label.position.set(0, outerH * 0.62, depth * 0.55);
        frameGroup.add(label);
    }

    frameGroup.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = false;
        node.receiveShadow = false;
    });
    return frameGroup;
}

function createWallFrameSlotLabel(slotIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return new THREE.Mesh(
            new THREE.PlaneGeometry(0.42, 0.16),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.64)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(125, 207, 255, 0.85)';
    ctx.lineWidth = 5;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    ctx.font = 'bold 56px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#dff4ff';
    ctx.fillText(String(slotIndex), canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.16), material);
    mesh.name = `frame-slot-label-${slotIndex}`;
    return mesh;
}

function addCompleteOfficePlan(scene, wallMaterial, loadingManager) {
    // La planta actual se reemplaza por el modelo completo "oficina-base".
    void wallMaterial;
    loadOfficeBaseModel(scene, loadingManager);
}

function loadTextureWithFallback(textureLoader, pathCandidates) {
    return new Promise((resolve, reject) => {
        if (!Array.isArray(pathCandidates) || pathCandidates.length === 0) {
            reject(new Error('No hay rutas de textura configuradas.'));
            return;
        }

        let index = 0;
        let lastError = null;
        const tryLoad = () => {
            if (index >= pathCandidates.length) {
                reject(lastError || new Error('No se pudo cargar la textura.'));
                return;
            }

            const path = pathCandidates[index];
            index += 1;
            textureLoader.load(
                path,
                (texture) => {
                    texture.userData.sourcePath = path;
                    resolve(texture);
                },
                undefined,
                (error) => {
                    lastError = error;
                    tryLoad();
                }
            );
        };

        tryLoad();
    });
}

function loadFBXWithFallback(fbxLoader, pathCandidates, onLoad, onError) {
    if (!Array.isArray(pathCandidates) || pathCandidates.length === 0) {
        onError(new Error('No hay rutas FBX configuradas.'));
        return;
    }

    let index = 0;
    let lastError = null;
    const tryLoad = () => {
        if (index >= pathCandidates.length) {
            onError(lastError || new Error('No se pudo cargar el modelo FBX.'));
            return;
        }

        const path = pathCandidates[index];
        index += 1;
        fbxLoader.load(
            path,
            (fbx) => onLoad(fbx, path),
            undefined,
            (error) => {
                lastError = error;
                tryLoad();
            }
        );
    };

    tryLoad();
}

async function buildOfficeBaseTextureSet(loadingManager) {
    const textureLoader = new THREE.TextureLoader(loadingManager);
    const [wallMap, floorMap] = await Promise.all([
        loadTextureWithFallback(textureLoader, OFFICE_BASE_WALL_TEXTURE_PATHS),
        loadTextureWithFallback(textureLoader, OFFICE_BASE_FLOOR_TEXTURE_PATHS)
    ]);
    const wallNormalMap = await loadTextureWithFallback(textureLoader, OFFICE_BASE_WALL_NORMAL_PATHS)
        .catch(() => null);

    setupTiledTexture(wallMap, 20, 2);
    setupTiledTexture(
        floorMap,
        FLOOR_TILE_MODEL === 2 ? 30 : 18,
        FLOOR_TILE_MODEL === 2 ? 30 : 18
    );
    if (gameState.renderer) {
        const maxAnisotropy = gameState.renderer.capabilities.getMaxAnisotropy();
        wallMap.anisotropy = Math.min(8, maxAnisotropy);
        floorMap.anisotropy = Math.min(8, maxAnisotropy);
        if (wallNormalMap) {
            wallNormalMap.anisotropy = Math.min(8, maxAnisotropy);
        }
    }

    return { wallMap, wallNormalMap, floorMap };
}

function applyOfficeBaseMaterials(modelRoot, textures = null) {
    const floorNameMatcher = /floor|piso|suelo|ground|planta|tile_floor|base_floor/;
    const ceilingNameMatcher = /ceiling|techo|roof/;
    const modelBounds = new THREE.Box3().setFromObject(modelRoot);
    const floorThreshold = modelBounds.min.y + Math.max(0.12, modelBounds.getSize(new THREE.Vector3()).y * 0.08);

    modelRoot.traverse((node) => {
        if (!node.isMesh || !node.material) return;
        node.castShadow = false;
        node.receiveShadow = false;
        node.frustumCulled = false;

        const materials = Array.isArray(node.material) ? node.material : [node.material];
        const label = `${node.name}|${materials.map((mat) => mat?.name || '').join('|')}`.toLowerCase();
        const nodeBounds = new THREE.Box3().setFromObject(node);
        const nodeSize = nodeBounds.getSize(new THREE.Vector3());
        const nodeCenter = nodeBounds.getCenter(new THREE.Vector3());
        const hasFloorName = floorNameMatcher.test(label);
        const hasCeilingName = ceilingNameMatcher.test(label);
        const isHorizontalSlab = nodeSize.y <= Math.max(0.03, Math.min(nodeSize.x, nodeSize.z) * 0.28);
        const nearGround = nodeCenter.y <= floorThreshold;
        const isFloor = hasFloorName || (!hasCeilingName && isHorizontalSlab && nearGround);

        materials.forEach((material) => {
            if (!material) return;

            material.side = THREE.DoubleSide;
            material.transparent = false;
            material.opacity = 1.0;
            if (textures) {
                material.map = isFloor ? textures.floorMap : textures.wallMap;
                if (!isFloor && textures.wallNormalMap) {
                    material.normalMap = textures.wallNormalMap;
                } else {
                    material.normalMap = null;
                }
            }
            if (!material.color) {
                material.color = new THREE.Color(0xffffff);
            } else {
                material.color.setHex(0xffffff);
            }
            material.needsUpdate = true;
        });
    });
}

function removeOfficeBaseFurniture(modelRoot) {
    // AJUSTE OFICINA-BASE (MOBILIARIO):
    // Agrega palabras clave aqui si quieres quitar mas props del modelo base.
    const removableMatcher = /table|mesa|desk|escritorio|triky round side table/i;
    const toRemove = [];

    modelRoot.traverse((node) => {
        if (!node || !node.parent) return;
        const nodeName = String(node.name || '').toLowerCase();
        if (!nodeName) return;
        if (removableMatcher.test(nodeName)) {
            toRemove.push(node);
        }
    });

    if (toRemove.length === 0) return { removedCount: 0, removedNames: [] };

    const unique = new Set();
    const removedNames = [];
    toRemove.forEach((node) => {
        if (!node.parent || unique.has(node.uuid)) return;
        unique.add(node.uuid);
        removedNames.push(node.name || '(sin_nombre)');
        node.parent.remove(node);
    });

    return { removedCount: removedNames.length, removedNames };
}

function rebuildOfficeBaseWallColliders(modelRoot) {
    // AJUSTE COLISIONES: extrae colliders de murallas a partir del FBX ya posicionado/escalado.
    const skipMatcher = /floor|piso|suelo|ground|tile|ceramic|baldosa|ceiling|techo|roof|glass|window|ventana/i;
    const minWallHeight = Math.max(1.2, ROOM_HEIGHT * 0.45);
    const size = new THREE.Vector3();
    const colliders = [];

    modelRoot.updateWorldMatrix(true, true);
    modelRoot.traverse((node) => {
        if (!node || !node.isMesh || !node.visible) return;

        const label = `${node.name}|${node.material?.name || ''}`.toLowerCase();
        if (skipMatcher.test(label)) return;

        const bounds = new THREE.Box3().setFromObject(node);
        if (bounds.isEmpty()) return;
        bounds.getSize(size);

        if (
            !Number.isFinite(size.x) ||
            !Number.isFinite(size.y) ||
            !Number.isFinite(size.z)
        ) return;

        if (size.y < minWallHeight) return;
        const thinSide = Math.min(size.x, size.z);
        const longSide = Math.max(size.x, size.z);
        const isWallLike = thinSide <= 0.9 && longSide >= 0.55;
        if (!isWallLike) return;

        colliders.push(bounds.clone().expandByVector(new THREE.Vector3(0.10, 0.15, 0.10)));
    });

    gameState.wallColliders = colliders;
    return colliders;
}

function normalizeOfficeBaseOrientation(modelRoot) {
    // AJUSTE OFICINA-BASE (ROTACION):
    // Conserva la orientacion original importada y aplica solo un delta opcional.
    if (Math.abs(OFFICE_BASE_ROTATION_X) > 0.0001) modelRoot.rotateX(OFFICE_BASE_ROTATION_X);
    if (Math.abs(OFFICE_BASE_ROTATION_Y) > 0.0001) modelRoot.rotateY(OFFICE_BASE_ROTATION_Y);
    if (Math.abs(OFFICE_BASE_ROTATION_Z) > 0.0001) modelRoot.rotateZ(OFFICE_BASE_ROTATION_Z);
    modelRoot.updateWorldMatrix(true, true);
    const initialBounds = new THREE.Box3().setFromObject(modelRoot);
    if (initialBounds.isEmpty()) {
        return { upAxis: 'manual', size: new THREE.Vector3() };
    }

    const normalizedSize = initialBounds.getSize(new THREE.Vector3());
    return { upAxis: 'manual', size: normalizedSize };
}

function fitOfficeBaseToRoom(modelRoot) {
    const orientationInfo = normalizeOfficeBaseOrientation(modelRoot);
    const initialBounds = new THREE.Box3().setFromObject(modelRoot);
    if (initialBounds.isEmpty()) return null;

    const size = initialBounds.getSize(new THREE.Vector3());
    if (
        !Number.isFinite(size.x) ||
        !Number.isFinite(size.y) ||
        !Number.isFinite(size.z) ||
        size.x <= 0.0001 ||
        size.z <= 0.0001
    ) return null;

    // AJUSTE OFICINA-BASE (ESCALA): referencia principal de tamano por altura del modelo.
    const scaleFromHeight = OFFICE_BASE_TARGET_HEIGHT / Math.max(0.0001, size.y);
    let uniformScale = THREE.MathUtils.clamp(
        scaleFromHeight * OFFICE_BASE_SCALE_MULTIPLIER,
        0.005,
        20.0
    );
    modelRoot.scale.multiplyScalar(uniformScale);
    // AJUSTE OFICINA-BASE (ALTURA): estira verticalmente techo y murallas sin ensanchar la planta.
    if (Math.abs(OFFICE_BASE_VERTICAL_STRETCH - 1.0) > 0.0001) {
        modelRoot.scale.y *= OFFICE_BASE_VERTICAL_STRETCH;
    }

    const refreshBounds = () => {
        modelRoot.updateWorldMatrix(true, true);
        return new THREE.Box3().setFromObject(modelRoot);
    };

    let scaledBounds = refreshBounds();
    let scaledSize = scaledBounds.getSize(new THREE.Vector3());

    // Limite superior para evitar que el modelo quede gigante.
    const heightOverscaleRatio = scaledSize.y / Math.max(0.0001, OFFICE_BASE_MAX_FINAL_HEIGHT);
    if (heightOverscaleRatio > 1.0) {
        const downScale = 1.0 / heightOverscaleRatio;
        modelRoot.scale.multiplyScalar(downScale);
        uniformScale *= downScale;
        scaledBounds = refreshBounds();
        scaledSize = scaledBounds.getSize(new THREE.Vector3());
    }

    // Limite inferior para evitar que quede mas pequeno que la escala humana.
    if (scaledSize.y > 0.0001 && scaledSize.y < OFFICE_BASE_MIN_FINAL_HEIGHT) {
        const upScale = OFFICE_BASE_MIN_FINAL_HEIGHT / scaledSize.y;
        modelRoot.scale.multiplyScalar(upScale);
        uniformScale *= upScale;
        scaledBounds = refreshBounds();
        scaledSize = scaledBounds.getSize(new THREE.Vector3());
    }

    const center = scaledBounds.getCenter(new THREE.Vector3());
    // AJUSTE OFICINA-BASE (POSICION): mueve el modelo completo respecto al origen.
    const offsetX = OFFICE_PLAN_OFFSET_X + OFFICE_BASE_OFFSET_X - center.x;
    const offsetZ = OFFICE_PLAN_OFFSET_Z + OFFICE_BASE_OFFSET_Z - center.z;
    const offsetY = -scaledBounds.min.y;
    modelRoot.position.add(new THREE.Vector3(offsetX, offsetY, offsetZ));

    return {
        originalSize: size.clone(),
        finalSize: scaledSize.clone(),
        finalScale: uniformScale,
        verticalStretch: OFFICE_BASE_VERTICAL_STRETCH,
        finalCenter: scaledBounds.getCenter(new THREE.Vector3()),
        upAxis: orientationInfo.upAxis
    };
}

function loadOfficeBaseModel(scene, loadingManager) {
    const fbxLoader = new FBXLoader(loadingManager);

    buildOfficeBaseTextureSet(loadingManager)
        .catch((error) => {
            console.warn('No se pudieron cargar todas las texturas de oficina-base:', error);
            return null;
        })
        .then((textures) => {
            loadFBXWithFallback(
                fbxLoader,
                OFFICE_BASE_MODEL_PATHS,
                (fbx, sourcePath) => {
                    const stripInfo = removeOfficeBaseFurniture(fbx);
                    const fitInfo = fitOfficeBaseToRoom(fbx);
                    // Materiales despues del ajuste de orientacion/escala para clasificar bien el suelo.
                    applyOfficeBaseMaterials(fbx, textures);
                    const wallColliders = rebuildOfficeBaseWallColliders(fbx);
                    scene.add(fbx);
                    console.info(`oficina-base cargada desde: ${sourcePath}`);
                    if (stripInfo.removedCount > 0) {
                        console.info(
                            'oficina-base mobiliario removido:',
                            stripInfo.removedCount,
                            stripInfo.removedNames.join(', ')
                        );
                    }
                    if (fitInfo) {
                        console.info(
                            'oficina-base ajuste:',
                            `size=(${fitInfo.originalSize.x.toFixed(2)}, ${fitInfo.originalSize.y.toFixed(2)}, ${fitInfo.originalSize.z.toFixed(2)})`,
                            `final=(${fitInfo.finalSize.x.toFixed(2)}, ${fitInfo.finalSize.y.toFixed(2)}, ${fitInfo.finalSize.z.toFixed(2)})`,
                            `up=${fitInfo.upAxis}`,
                            `scale=${fitInfo.finalScale.toFixed(3)}`,
                            `yStretch=${fitInfo.verticalStretch.toFixed(3)}`
                        );
                    }
                    console.info('oficina-base colliders de muralla:', wallColliders.length);

                    // Con oficina-base se desactiva el sistema de puertas procedurales/FBX antiguas.
                    gameState.doors.length = 0;
                },
                (error) => {
                    console.error('No se pudo cargar oficina-base:', error);
                }
            );
        });
}

function scalePlanWallSpecs(wallSpecs) {
    return wallSpecs.map((wall) => ({
        ...wall,
        x1: wall.x1 * OFFICE_PLAN_SCALE + OFFICE_PLAN_OFFSET_X,
        z1: wall.z1 * OFFICE_PLAN_SCALE + OFFICE_PLAN_OFFSET_Z,
        x2: wall.x2 * OFFICE_PLAN_SCALE + OFFICE_PLAN_OFFSET_X,
        z2: wall.z2 * OFFICE_PLAN_SCALE + OFFICE_PLAN_OFFSET_Z,
        doorWidth: Number.isFinite(wall.doorWidth)
            ? THREE.MathUtils.clamp(wall.doorWidth, 1.2, 1.9)
            : wall.doorWidth,
        doorCenters: Array.isArray(wall.doorCenters)
            ? wall.doorCenters.map((center) => center * OFFICE_PLAN_SCALE)
            : wall.doorCenters
    }));
}

function resolveDoorWidth(wall) {
    const rawWidth = Number.isFinite(wall?.doorWidth) ? wall.doorWidth : OFFICE_DOOR_WIDTH;
    return Math.max(1.0, rawWidth + DOOR_OPENING_CLEARANCE);
}

function buildWallSegments(wallSpecs) {
    const segments = [];
    const lintelHeight = Math.max(0, OFFICE_WALL_HEIGHT - DOOR_TARGET_HEIGHT);

    wallSpecs.forEach((wall) => {
        const dx = wall.x2 - wall.x1;
        const dz = wall.z2 - wall.z1;
        const length = Math.hypot(dx, dz);
        if (length < MIN_WALL_SEGMENT) return;

        const dirX = dx / length;
        const dirZ = dz / length;
        const angle = Math.atan2(dirZ, dirX);
        const doorWidth = resolveDoorWidth(wall);

        const openings = (wall.doorCenters || [])
            .map((center) => ({
                start: Math.max(0, center - doorWidth / 2),
                end: Math.min(length, center + doorWidth / 2)
            }))
            .filter((opening) => opening.end - opening.start > MIN_WALL_SEGMENT)
            .sort((a, b) => a.start - b.start);

        let cursor = 0;
        openings.forEach((opening) => {
            if (opening.start - cursor > MIN_WALL_SEGMENT) {
                segments.push(buildSegment(wall, dirX, dirZ, angle, cursor, opening.start));
            }

            // Agrega el fragmento de muralla sobre el vano para cerrar el espacio hasta el techo.
            const openingLength = opening.end - opening.start;
            if (lintelHeight > 0.05 && openingLength > MIN_WALL_SEGMENT) {
                segments.push(
                    buildSegment(wall, dirX, dirZ, angle, opening.start, opening.end, {
                        height: lintelHeight,
                        centerY: DOOR_TARGET_HEIGHT + lintelHeight / 2
                    })
                );
            }

            cursor = Math.max(cursor, opening.end);
        });

        if (length - cursor > MIN_WALL_SEGMENT) {
            segments.push(buildSegment(wall, dirX, dirZ, angle, cursor, length));
        }
    });

    return segments;
}

function buildSegment(wall, dirX, dirZ, angle, startDistance, endDistance, options = {}) {
    const segmentLength = endDistance - startDistance;
    const midDistance = startDistance + segmentLength / 2;
    const x = wall.x1 + dirX * midDistance;
    const z = wall.z1 + dirZ * midDistance;
    const height = Number.isFinite(options.height) ? options.height : OFFICE_WALL_HEIGHT;
    const centerY = Number.isFinite(options.centerY) ? options.centerY : OFFICE_WALL_HEIGHT / 2;
    return { x, z, length: segmentLength, angle, height, centerY };
}

function buildDoorPlacements(wallSpecs) {
    const placements = [];

    wallSpecs.forEach((wall) => {
        if (!Array.isArray(wall.doorCenters) || wall.doorCenters.length === 0) return;

        const dx = wall.x2 - wall.x1;
        const dz = wall.z2 - wall.z1;
        const length = Math.hypot(dx, dz);
        if (length < MIN_WALL_SEGMENT) return;

        const dirX = dx / length;
        const dirZ = dz / length;
        const angle = Math.atan2(dirZ, dirX);
        const doorWidth = resolveDoorWidth(wall);

        wall.doorCenters.forEach((centerDistance) => {
            const clampedCenter = THREE.MathUtils.clamp(
                centerDistance,
                doorWidth / 2,
                Math.max(doorWidth / 2, length - doorWidth / 2)
            );

            placements.push({
                x: wall.x1 + dirX * clampedCenter,
                z: wall.z1 + dirZ * clampedCenter,
                angle,
                normalX: -dirZ,
                normalZ: dirX,
                openingWidth: doorWidth
            });
        });
    });

    return placements;
}

function loadDoorTextureSet(textureLoader, prefix, includeOpacity = false) {
    const maps = {
        baseColor: textureLoader.load(`build/puertas/textures/${prefix}_BaseColor.jpg`),
        normal: textureLoader.load(`build/puertas/textures/${prefix}_Normal.jpg`),
        roughness: textureLoader.load(`build/puertas/textures/${prefix}_Roughness.jpg`),
        metallic: textureLoader.load(`build/puertas/textures/${prefix}_Metallic.jpg`)
    };

    maps.baseColor.colorSpace = THREE.SRGBColorSpace;

    if (includeOpacity) {
        maps.opacity = textureLoader.load(`build/puertas/textures/${prefix}_Opacity.jpg`);
    }

    return maps;
}

function createDoorMaterials(loadingManager) {
    const textureLoader = new THREE.TextureLoader(loadingManager);
    const leafMaps = loadDoorTextureSet(textureLoader, 'Door-02', true);
    const frameMaps = loadDoorTextureSet(textureLoader, 'DoorFrame-02', false);

    const leafMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b5e3b,
        map: leafMaps.baseColor,
        normalMap: leafMaps.normal,
        roughnessMap: leafMaps.roughness,
        metalnessMap: leafMaps.metallic,
        alphaMap: leafMaps.opacity,
        alphaTest: 0.5,
        transparent: false,
        side: THREE.FrontSide,
        roughness: 0.95,
        metalness: 0.22
    });

    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x6f4b31,
        map: frameMaps.baseColor,
        normalMap: frameMaps.normal,
        roughnessMap: frameMaps.roughness,
        metalnessMap: frameMaps.metallic,
        roughness: 0.86,
        metalness: 0.16
    });

    return { leafMaterial, frameMaterial };
}

function getMeshMaterialLabel(mesh) {
    if (!mesh || !mesh.material) return '';
    if (Array.isArray(mesh.material)) {
        return mesh.material
            .map((mat) => (mat && mat.name ? mat.name.toLowerCase() : ''))
            .join('|');
    }
    return mesh.material.name ? mesh.material.name.toLowerCase() : '';
}

function cloneMeshWithWorldTransform(mesh) {
    const clone = new THREE.Mesh(mesh.geometry, mesh.material);
    clone.castShadow = false;
    clone.receiveShadow = false;
    mesh.updateWorldMatrix(true, false);
    clone.applyMatrix4(mesh.matrixWorld);
    return clone;
}

function isValidDoorSize(size) {
    if (!size) return false;
    if (!Number.isFinite(size.x) || !Number.isFinite(size.y) || !Number.isFinite(size.z)) return false;
    if (size.x < 0.35 || size.x > 4.5) return false;
    if (size.y < 1.6 || size.y > 6.0) return false;
    if (size.z < 0.02 || size.z > 2.0) return false;
    return true;
}

function fitDoorToOpeningWidth(doorRoot, openingWidth, baseScale) {
    if (!doorRoot || !Number.isFinite(baseScale) || baseScale <= 0) return;

    // AJUSTE PUERTAS (ANCHO): modifica OFFICE_DOOR_WIDTH / DOOR_FIT_MARGIN para probar.
    const targetOpening = Number.isFinite(openingWidth) ? openingWidth : OFFICE_DOOR_WIDTH;
    const usableOpening = Math.max(0.6, targetOpening - DOOR_FIT_MARGIN);

    doorRoot.scale.set(baseScale, baseScale, baseScale);
    const bounds = new THREE.Box3().setFromObject(doorRoot);
    const size = bounds.getSize(new THREE.Vector3());
    const horizontalSpan = Math.max(size.x, size.z);
    if (!Number.isFinite(horizontalSpan) || horizontalSpan <= 0.0001) return;

    const horizontalScale = THREE.MathUtils.clamp(
        usableOpening / horizontalSpan,
        MIN_DOOR_HORIZONTAL_SCALE,
        1.0
    );
    doorRoot.scale.set(baseScale * horizontalScale, baseScale, baseScale * horizontalScale);
}

function createProceduralDoorRoot() {
    const root = new THREE.Group();

    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x6a4429,
        roughness: 0.84,
        metalness: 0.06
    });
    const leafMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b5e3b,
        roughness: 0.92,
        metalness: 0.04
    });
    const glassMaterial = new THREE.MeshStandardMaterial({
        color: 0x8cb8d6,
        transparent: true,
        opacity: 0.36,
        roughness: 0.16,
        metalness: 0.25
    });

    const frame = new THREE.Group();
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.12, 0.1), frameMaterial);
    topBar.position.set(0.0, 2.04, 0);
    frame.add(topBar);

    const leftBar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.1, 0.1), frameMaterial);
    leftBar.position.set(-0.48, 1.02, 0);
    frame.add(leftBar);

    const rightBar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.1, 0.1), frameMaterial);
    rightBar.position.set(0.48, 1.02, 0);
    frame.add(rightBar);
    root.add(frame);

    const leafPivot = new THREE.Group();
    leafPivot.position.set(-0.42, 0, 0);
    root.add(leafPivot);

    const leafGroup = new THREE.Group();
    leafGroup.position.set(0.42, 0, 0);
    leafPivot.add(leafGroup);

    const leafPanel = new THREE.Mesh(new THREE.BoxGeometry(0.84, 2.02, 0.07), leafMaterial);
    leafPanel.position.set(0, 1.01, 0);
    leafGroup.add(leafPanel);

    const windowPanel = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.56, 0.02), glassMaterial);
    windowPanel.position.set(0, 1.47, 0.045);
    leafGroup.add(windowPanel);

    return { root, pivot: leafPivot };
}

function addProceduralDoors(scene, doorPlacements) {
    const placements = doorPlacements.slice(0, MAX_ACTIVE_DOORS);
    placements.forEach((placement) => {
        const procedural = createProceduralDoorRoot();
        const proceduralBounds = new THREE.Box3().setFromObject(procedural.root);
        const proceduralHeight = proceduralBounds.getSize(new THREE.Vector3()).y;
        let baseScale = 1;
        if (Number.isFinite(proceduralHeight) && proceduralHeight > 0.001) {
            baseScale = THREE.MathUtils.clamp(DOOR_TARGET_HEIGHT / proceduralHeight, 0.2, 3.0);
        }
        fitDoorToOpeningWidth(procedural.root, placement.openingWidth, baseScale);
        const normalX = Number.isFinite(placement.normalX) ? placement.normalX : 0;
        const normalZ = Number.isFinite(placement.normalZ) ? placement.normalZ : 0;
        const sideOffset = DOOR_PLACEMENT_OFFSET;
        procedural.root.position.set(
            placement.x + normalX * sideOffset,
            0,
            placement.z + normalZ * sideOffset
        );
        procedural.root.rotation.y = placement.angle;
        scene.add(procedural.root);
        registerDoorState(procedural.root, procedural.pivot, placement);
    });
}

function getNormalizedDoorNormal(placement) {
    const normalX = Number.isFinite(placement?.normalX) ? placement.normalX : 0;
    const normalZ = Number.isFinite(placement?.normalZ) ? placement.normalZ : 0;
    const length = Math.hypot(normalX, normalZ);
    if (length < 0.0001) return { x: 0, z: 1 };
    return { x: normalX / length, z: normalZ / length };
}

function computePositiveOpenNormalSign(doorRoot, pivot, normal) {
    if (!doorRoot || !pivot || !pivot.children || pivot.children.length === 0) return 1;

    const leaf = pivot.children[0];
    const baseRotation = pivot.rotation.y;
    const epsilonAngle = 0.12;

    doorRoot.updateWorldMatrix(true, true);
    const beforeCenter = new THREE.Box3().setFromObject(leaf).getCenter(new THREE.Vector3());

    pivot.rotation.y = baseRotation + epsilonAngle;
    doorRoot.updateWorldMatrix(true, true);
    const afterCenter = new THREE.Box3().setFromObject(leaf).getCenter(new THREE.Vector3());

    pivot.rotation.y = baseRotation;
    doorRoot.updateWorldMatrix(true, true);

    const openDisplacement = afterCenter.sub(beforeCenter);
    const projected = openDisplacement.x * normal.x + openDisplacement.z * normal.z;
    if (!Number.isFinite(projected) || Math.abs(projected) < 0.00001) return 1;
    return projected >= 0 ? 1 : -1;
}

function registerDoorState(root, pivot, placement) {
    const normal = getNormalizedDoorNormal(placement);
    const positiveOpenNormalSign = computePositiveOpenNormalSign(root, pivot, normal);

    gameState.doors.push({
        root,
        pivot,
        openAmount: 0,
        normalX: normal.x,
        normalZ: normal.z,
        positiveOpenNormalSign,
        lastPlayerSideSign: 1
    });
}

function normalizeDoorGroups(frameGroup, leafGroup) {
    const combined = new THREE.Group();
    combined.add(frameGroup);
    combined.add(leafGroup);

    const combinedBox = new THREE.Box3().setFromObject(combined);
    const combinedCenter = combinedBox.getCenter(new THREE.Vector3());
    const offset = new THREE.Vector3(combinedCenter.x, combinedBox.min.y, combinedCenter.z);

    frameGroup.position.sub(offset);
    leafGroup.position.sub(offset);

    const leafBox = new THREE.Box3().setFromObject(leafGroup);
    const leafSize = leafBox.getSize(new THREE.Vector3());
    const widthIsX = leafSize.x >= leafSize.z;
    const hingePoint = widthIsX
        ? new THREE.Vector3(leafBox.min.x, 0, (leafBox.min.z + leafBox.max.z) * 0.5)
        : new THREE.Vector3((leafBox.min.x + leafBox.max.x) * 0.5, 0, leafBox.min.z);

    leafGroup.position.sub(new THREE.Vector3(hingePoint.x, 0, hingePoint.z));

    const leafPivot = new THREE.Group();
    leafPivot.name = 'door-leaf-pivot';
    leafPivot.position.copy(hingePoint);
    leafPivot.add(leafGroup);

    const template = new THREE.Group();
    template.add(frameGroup);
    template.add(leafPivot);

    const normalizedBox = new THREE.Box3().setFromObject(template);
    const normalizedSize = normalizedBox.getSize(new THREE.Vector3());
    const referenceHeight = Math.max(0.001, normalizedSize.y);
    const scaleFactor = DOOR_TARGET_HEIGHT / referenceHeight;
    const rotationOffset = widthIsX ? 0 : Math.PI / 2;

    return { frameGroup, leafPivot, scaleFactor, rotationOffset };
}

function loadOfficeDoors(scene, loadingManager, doorPlacements) {
    if (!Array.isArray(doorPlacements) || doorPlacements.length === 0) return;

    gameState.doors.length = 0;
    const placements = doorPlacements.slice(0, MAX_ACTIVE_DOORS);

    const { leafMaterial, frameMaterial } = createDoorMaterials(loadingManager);
    const fbxLoader = new FBXLoader(loadingManager);

    fbxLoader.load(
        DOOR_MODEL_PATH,
        (fbx) => {
            const frameSource = new THREE.Group();
            const leafSource = new THREE.Group();

            fbx.updateMatrixWorld(true);
            fbx.traverse((child) => {
                if (!child.isMesh) return;

                const materialLabel = getMeshMaterialLabel(child);
                if (materialLabel.includes('door-02')) {
                    child.material = leafMaterial;
                    leafSource.add(cloneMeshWithWorldTransform(child));
                } else if (materialLabel.includes('doorframe-02')) {
                    child.material = frameMaterial;
                    frameSource.add(cloneMeshWithWorldTransform(child));
                }
            });

            if (leafSource.children.length === 0) {
                console.warn('No se encontraron meshes Door-02 en el FBX de puertas.');
                addProceduralDoors(scene, placements);
                return;
            }

            const { frameGroup, leafPivot, scaleFactor, rotationOffset } = normalizeDoorGroups(
                frameSource,
                leafSource
            );
            const clampedScaleFactor = THREE.MathUtils.clamp(scaleFactor, 0.006, 1.6);
            let addedDoors = 0;
            const fallbackPlacements = [];

            placements.forEach((placement) => {
                const doorRoot = new THREE.Group();
                doorRoot.name = 'office-door';

                if (frameGroup.children.length > 0) {
                    doorRoot.add(frameGroup.clone(true));
                }
                const doorLeafPivot = leafPivot.clone(true);
                doorRoot.add(doorLeafPivot);

                fitDoorToOpeningWidth(doorRoot, placement.openingWidth, clampedScaleFactor);
                const normalX = Number.isFinite(placement.normalX) ? placement.normalX : 0;
                const normalZ = Number.isFinite(placement.normalZ) ? placement.normalZ : 0;
                const sideOffset = DOOR_PLACEMENT_OFFSET;
                doorRoot.position.set(
                    placement.x + normalX * sideOffset,
                    0,
                    placement.z + normalZ * sideOffset
                );
                doorRoot.rotation.y = placement.angle + rotationOffset;

                const doorBounds = new THREE.Box3().setFromObject(doorRoot);
                const doorSize = doorBounds.getSize(new THREE.Vector3());
                if (!isValidDoorSize(doorSize)) {
                    fallbackPlacements.push(placement);
                    return;
                }

                scene.add(doorRoot);
                addedDoors += 1;
                registerDoorState(doorRoot, doorLeafPivot, placement);
            });

            if (fallbackPlacements.length > 0) {
                console.warn(
                    `Se reemplazan ${fallbackPlacements.length} puertas FBX por puertas procedurales (tamano no valido).`
                );
                addProceduralDoors(scene, fallbackPlacements);
            }

            if (addedDoors === 0) {
                console.warn('Puertas FBX descartadas por dimensiones; usando puertas procedurales.');
                addProceduralDoors(scene, placements);
            } else if (addedDoors < placements.length) {
                console.info(`Puertas cargadas: ${addedDoors}/${placements.length}`);
            }
        },
        undefined,
        (error) => {
            console.error('No se pudo cargar el modelo de puertas:', error);
            addProceduralDoors(scene, placements);
        }
    );
}

function createInstancedWalls(segments, wallMaterial) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    ensureUV2(geometry);
    const instancedWalls = new THREE.InstancedMesh(geometry, wallMaterial, segments.length);
    instancedWalls.name = 'full-office-plan-walls';
    instancedWalls.castShadow = false;
    instancedWalls.receiveShadow = false;

    const axisY = new THREE.Vector3(0, 1, 0);
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const matrix = new THREE.Matrix4();

    segments.forEach((segment, index) => {
        const segmentHeight = Number.isFinite(segment.height) ? segment.height : OFFICE_WALL_HEIGHT;
        const segmentCenterY = Number.isFinite(segment.centerY) ? segment.centerY : OFFICE_WALL_HEIGHT / 2;
        position.set(segment.x, segmentCenterY, segment.z);
        quaternion.setFromAxisAngle(axisY, segment.angle);
        scale.set(segment.length, segmentHeight, OFFICE_WALL_THICKNESS);
        matrix.compose(position, quaternion, scale);
        instancedWalls.setMatrixAt(index, matrix);
    });

    instancedWalls.instanceMatrix.needsUpdate = true;
    return instancedWalls;
}

function addZoneMarkers(scene) {
    const zones = [
        { id: 'zona_cocina', label: 'COCINA', x: -9.0, z: -3.4 },
        { id: 'zona_banos', label: 'BANOS', x: 2.6, z: -5.0 },
        { id: 'zona_distribuidor', label: 'DISTRIBUIDOR', x: 6.3, z: -2.5 },
        { id: 'zona_oficina', label: 'OFICINA', x: 11.5, z: -2.6 },
        { id: 'zona_hall', label: 'HALL CENTRAL', x: -1.8, z: 2.2 },
        { id: 'zona_auditorio', label: 'AUDITORIO', x: 11.5, z: 4.1 },
        { id: 'zona_acceso', label: 'ACCESO', x: -14.0, z: 3.2 }
    ];

    zones.forEach((zone) => {
        const marker = createZoneLabelSprite(zone.label);
        marker.position.set(
            zone.x * OFFICE_PLAN_SCALE + OFFICE_PLAN_OFFSET_X,
            OFFICE_WALL_HEIGHT + 0.28,
            zone.z * OFFICE_PLAN_SCALE + OFFICE_PLAN_OFFSET_Z
        );
        marker.userData.zoneId = zone.id;
        marker.userData.zoneLabel = zone.label;
        marker.renderOrder = 1100;
        scene.add(marker);
    });
}

function loadOfficeFurniture(scene, loadingManager) {
    const textureLoader = new THREE.TextureLoader(loadingManager);
    const officeTexture = textureLoader.load(OFFICE_PACK_TEXTURE_PATH);
    officeTexture.colorSpace = THREE.SRGBColorSpace;
    if (gameState.renderer) {
        officeTexture.anisotropy = Math.min(8, gameState.renderer.capabilities.getMaxAnisotropy());
    }

    const sharedMaterial = new THREE.MeshStandardMaterial({
        map: officeTexture,
        roughness: 0.88,
        metalness: 0.08
    });

    const fbxLoader = new FBXLoader(loadingManager);
    fbxLoader.load(
        OFFICE_PACK_MODEL_PATH,
        (fbx) => {
            const templates = extractOfficeFurnitureTemplates(fbx, sharedMaterial);
            if (templates.length === 0) {
                console.warn('No se pudieron extraer piezas útiles de cosas-oficina.');
                return;
            }

            const tableTemplate = selectFurnitureTemplate(
                templates,
                { minFootprint: 0.9, maxFootprint: 3.2, minHeight: 0.55, maxHeight: 1.5 },
                { footprint: 1.55, height: 0.82 }
            ) || templates[0];

            const chairTemplate = selectFurnitureTemplate(
                templates,
                { minFootprint: 0.35, maxFootprint: 1.15, minHeight: 0.6, maxHeight: 1.8 },
                { footprint: 0.62, height: 1.0 },
                tableTemplate
            ) || templates[Math.min(1, templates.length - 1)] || tableTemplate;

            if (tableTemplate && chairTemplate) {
                console.info(
                    '[OfficePack] table size:',
                    tableTemplate.size,
                    'chair size:',
                    chairTemplate.size
                );
            }

            populateOfficeFurniture(scene, tableTemplate, chairTemplate);
        },
        undefined,
        (error) => {
            console.warn('No se pudo cargar cosas-oficina:', error);
        }
    );
}

function extractOfficeFurnitureTemplates(fbx, material) {
    const templates = [];
    const roots = fbx.children && fbx.children.length > 0 ? fbx.children : [fbx];

    roots.forEach((root) => {
        if (!root) return;
        const templateRoot = root.clone(true);
        let meshCount = 0;
        templateRoot.traverse((node) => {
            if (!node.isMesh) return;
            node.castShadow = false;
            node.receiveShadow = false;
            node.material = material;
            meshCount += 1;
        });

        if (meshCount === 0) return;

        const bbox = new THREE.Box3().setFromObject(templateRoot);
        if (bbox.isEmpty()) return;

        const size = bbox.getSize(new THREE.Vector3());
        if (size.x < 0.25 || size.y < 0.25 || size.z < 0.25) return;
        if (size.x > 12.0 || size.y > 4.0 || size.z > 12.0) return;
        const footprint = Math.max(size.x, size.z);
        const minSpan = Math.max(0.05, Math.min(size.x, size.z));
        const slenderness = size.y / minSpan;
        if (size.y > 2.8) return;
        if (slenderness > 5.5 && footprint < 0.75) return;

        const center = bbox.getCenter(new THREE.Vector3());
        templateRoot.position.sub(new THREE.Vector3(center.x, bbox.min.y, center.z));

        templates.push({
            root: templateRoot,
            size,
            meshCount,
            footprint,
            height: size.y
        });
    });

    if (templates.length === 0) {
        const fallbackRoot = fbx.clone(true);
        let meshCount = 0;
        fallbackRoot.traverse((node) => {
            if (!node.isMesh) return;
            node.castShadow = false;
            node.receiveShadow = false;
            node.material = material;
            meshCount += 1;
        });

        if (meshCount > 0) {
            const bbox = new THREE.Box3().setFromObject(fallbackRoot);
            if (!bbox.isEmpty()) {
                const size = bbox.getSize(new THREE.Vector3());
                const center = bbox.getCenter(new THREE.Vector3());
                fallbackRoot.position.sub(new THREE.Vector3(center.x, bbox.min.y, center.z));
                templates.push({
                    root: fallbackRoot,
                    size,
                    meshCount,
                    footprint: Math.max(size.x, size.z),
                    height: size.y
                });
            }
        }
    }

    return templates;
}

function selectFurnitureTemplate(templates, limits, target, excludeTemplate = null) {
    const candidates = templates.filter((template) => {
        if (!template || template === excludeTemplate) return false;
        if (template.footprint < limits.minFootprint || template.footprint > limits.maxFootprint) return false;
        if (template.height < limits.minHeight || template.height > limits.maxHeight) return false;
        return true;
    });

    if (candidates.length === 0) return null;

    let selected = candidates[0];
    let bestScore = Infinity;
    candidates.forEach((candidate) => {
        const score = (
            Math.abs(candidate.footprint - target.footprint) * 1.7 +
            Math.abs(candidate.height - target.height) * 1.2 +
            candidate.meshCount * 0.04
        );
        if (score < bestScore) {
            bestScore = score;
            selected = candidate;
        }
    });

    return selected;
}

function placeFurnitureInstance(scene, template, x, z, rotationY, targetFootprint, targetHeight = 0) {
    if (!template || !template.root) return null;
    const instance = template.root.clone(true);
    const footprint = Math.max(0.001, template.footprint);
    let scaleFactor = targetFootprint / footprint;
    if (Number.isFinite(targetHeight) && targetHeight > 0 && Number.isFinite(template.height) && template.height > 0) {
        const heightScale = targetHeight / template.height;
        scaleFactor = Math.min(scaleFactor, heightScale * 1.1);
    }
    scaleFactor = THREE.MathUtils.clamp(scaleFactor, 0.015, 2.2);
    const worldX = x * OFFICE_PLAN_SCALE + OFFICE_PLAN_OFFSET_X;
    const worldZ = z * OFFICE_PLAN_SCALE + OFFICE_PLAN_OFFSET_Z;

    instance.scale.setScalar(scaleFactor);
    instance.position.set(worldX, 0, worldZ);
    instance.rotation.y = rotationY;
    scene.add(instance);
    return instance;
}

function pushChairCluster(chairPlacements, centerX, centerZ, width, depth, rotationY) {
    const halfW = width / 2;
    const halfD = depth / 2;
    chairPlacements.push({ x: centerX - halfW, z: centerZ - halfD, rot: rotationY + Math.PI / 2 });
    chairPlacements.push({ x: centerX - halfW, z: centerZ + halfD, rot: rotationY + Math.PI / 2 });
    chairPlacements.push({ x: centerX + halfW, z: centerZ - halfD, rot: rotationY - Math.PI / 2 });
    chairPlacements.push({ x: centerX + halfW, z: centerZ + halfD, rot: rotationY - Math.PI / 2 });
}

function populateOfficeFurniture(scene, tableTemplate, chairTemplate) {
    const heavyTemplate = (
        tableTemplate.meshCount > 50 ||
        chairTemplate.meshCount > 50 ||
        tableTemplate.footprint > 6.0 ||
        chairTemplate.footprint > 6.0
    );

    if (heavyTemplate) {
        const anchorTables = [
            { x: -9.2, z: -3.4, rot: Math.PI / 2, size: 2.1 },
            { x: -5.2, z: 1.8, rot: 0, size: 1.9 },
            { x: -0.6, z: 2.2, rot: 0, size: 1.9 },
            { x: 11.2, z: -2.5, rot: 0, size: 1.7 },
            { x: 11.3, z: 4.2, rot: 0, size: 2.6 }
        ];

        anchorTables.forEach((table) => {
            placeFurnitureInstance(scene, tableTemplate, table.x, table.z, table.rot, table.size, 0.82);
        });
        return;
    }

    const tables = [
        { x: -9.4, z: -3.4, rot: Math.PI / 2, size: 1.9 },
        { x: -7.3, z: -3.4, rot: Math.PI / 2, size: 1.7 },
        { x: -5.4, z: 1.7, rot: 0, size: 1.85 },
        { x: -2.2, z: 1.7, rot: 0, size: 1.75 },
        { x: 0.8, z: 2.1, rot: 0, size: 1.55 },
        { x: 3.9, z: 2.1, rot: 0, size: 1.45 },
        { x: 11.2, z: -2.5, rot: 0, size: 1.55 },
        { x: 10.4, z: -2.5, rot: 0, size: 1.3 },
        { x: 11.2, z: 4.2, rot: 0, size: 2.45 }
    ];

    const chairs = [];
    pushChairCluster(chairs, -9.4, -3.4, 1.8, 1.0, 0);
    pushChairCluster(chairs, -7.3, -3.4, 1.6, 0.95, 0);
    pushChairCluster(chairs, -5.4, 1.7, 1.85, 1.05, Math.PI / 2);
    pushChairCluster(chairs, -2.2, 1.7, 1.75, 1.0, Math.PI / 2);
    pushChairCluster(chairs, 0.8, 2.1, 1.5, 0.95, 0);
    pushChairCluster(chairs, 11.2, 4.2, 2.2, 1.2, 0);
    chairs.push(
        { x: 10.3, z: -2.8, rot: Math.PI / 2 },
        { x: 12.0, z: -2.3, rot: -Math.PI / 2 },
        { x: -1.0, z: 3.1, rot: Math.PI },
        { x: 3.1, z: 3.1, rot: Math.PI }
    );

    let placed = 0;
    tables.forEach((table) => {
        if (placed >= MAX_OFFICE_FURNITURE_INSTANCES) return;
        const instance = placeFurnitureInstance(
            scene,
            tableTemplate,
            table.x,
            table.z,
            table.rot,
            table.size,
            0.82
        );
        if (instance) placed += 1;
    });

    chairs.forEach((chair) => {
        if (placed >= MAX_OFFICE_FURNITURE_INSTANCES) return;
        const instance = placeFurnitureInstance(scene, chairTemplate, chair.x, chair.z, chair.rot, 0.74, 1.0);
        if (instance) placed += 1;
    });
}

function createZoneLabelSprite(label) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        const fallbackMaterial = new THREE.SpriteMaterial({ color: 0x9fd8ff });
        return new THREE.Sprite(fallbackMaterial);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const borderRadius = 26;
    const padding = 16;
    const width = canvas.width - (padding * 2);
    const height = canvas.height - (padding * 2);

    ctx.fillStyle = 'rgba(4, 15, 38, 0.82)';
    ctx.strokeStyle = 'rgba(126, 207, 255, 0.78)';
    ctx.lineWidth = 6;

    drawRoundedRect(ctx, padding, padding, width, height, borderRadius);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#d7eeff';
    ctx.font = 'bold 72px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        depthTest: true
    });
    const sprite = new THREE.Sprite(material);
    const widthScale = Math.max(5.2, Math.min(9.2, label.length * 0.29));
    sprite.scale.set(widthScale, 1.45, 1);
    return sprite;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function addHorizontalCeilingPlane(scene, width, depth, y, material) {
    const geometry = new THREE.PlaneGeometry(width, depth);
    ensureUV2(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = y;
    mesh.receiveShadow = false;
    scene.add(mesh);
    return mesh;
}

function addHorizontalCeilingRing(scene, outerWidth, outerDepth, innerWidth, innerDepth, y, material) {
    const depthBand = (outerDepth - innerDepth) / 2;
    const widthBand = (outerWidth - innerWidth) / 2;

    if (depthBand > 0.01) {
        const frontBand = addHorizontalCeilingPlane(scene, outerWidth, depthBand, y, material);
        frontBand.position.z = -(innerDepth / 2 + depthBand / 2);

        const backBand = addHorizontalCeilingPlane(scene, outerWidth, depthBand, y, material);
        backBand.position.z = innerDepth / 2 + depthBand / 2;
    }

    if (widthBand > 0.01) {
        const leftBand = addHorizontalCeilingPlane(scene, widthBand, innerDepth, y, material);
        leftBand.position.x = -(innerWidth / 2 + widthBand / 2);

        const rightBand = addHorizontalCeilingPlane(scene, widthBand, innerDepth, y, material);
        rightBand.position.x = innerWidth / 2 + widthBand / 2;
    }
}

function addVerticalCeilingStep(scene, openingWidth, openingDepth, yBottom, yTop, material) {
    const stepHeight = yTop - yBottom;
    const stepCenterY = yBottom + stepHeight / 2;

    const frontGeometry = new THREE.PlaneGeometry(openingWidth, stepHeight);
    ensureUV2(frontGeometry);
    const front = new THREE.Mesh(frontGeometry, material);
    front.position.set(0, stepCenterY, -openingDepth / 2);
    scene.add(front);

    const backGeometry = new THREE.PlaneGeometry(openingWidth, stepHeight);
    ensureUV2(backGeometry);
    const back = new THREE.Mesh(backGeometry, material);
    back.position.set(0, stepCenterY, openingDepth / 2);
    back.rotation.y = Math.PI;
    scene.add(back);

    const leftGeometry = new THREE.PlaneGeometry(openingDepth, stepHeight);
    ensureUV2(leftGeometry);
    const left = new THREE.Mesh(leftGeometry, material);
    left.position.set(-openingWidth / 2, stepCenterY, 0);
    left.rotation.y = Math.PI / 2;
    scene.add(left);

    const rightGeometry = new THREE.PlaneGeometry(openingDepth, stepHeight);
    ensureUV2(rightGeometry);
    const right = new THREE.Mesh(rightGeometry, material);
    right.position.set(openingWidth / 2, stepCenterY, 0);
    right.rotation.y = -Math.PI / 2;
    scene.add(right);
}

function addCoveLighting(scene, openingWidth, openingDepth, y, stripMaterial) {
    const stripThickness = 0.03;
    const stripDepth = 0.16;
    const inset = 0.38;
    const stripY = y - 0.02;

    const horizontalStripGeometry = new THREE.BoxGeometry(
        Math.max(0.5, openingWidth - inset * 2),
        stripThickness,
        stripDepth
    );
    const verticalStripGeometry = new THREE.BoxGeometry(
        stripDepth,
        stripThickness,
        Math.max(0.5, openingDepth - inset * 2)
    );

    const frontStrip = new THREE.Mesh(horizontalStripGeometry, stripMaterial);
    frontStrip.position.set(0, stripY, -(openingDepth / 2 - stripDepth / 2 - 0.03));
    scene.add(frontStrip);

    const backStrip = new THREE.Mesh(horizontalStripGeometry, stripMaterial);
    backStrip.position.set(0, stripY, openingDepth / 2 - stripDepth / 2 - 0.03);
    scene.add(backStrip);

    const leftStrip = new THREE.Mesh(verticalStripGeometry, stripMaterial);
    leftStrip.position.set(-(openingWidth / 2 - stripDepth / 2 - 0.03), stripY, 0);
    scene.add(leftStrip);

    const rightStrip = new THREE.Mesh(verticalStripGeometry, stripMaterial);
    rightStrip.position.set(openingWidth / 2 - stripDepth / 2 - 0.03, stripY, 0);
    scene.add(rightStrip);

    const ledColor = 0xf2f8ff;
    const ledY = y - 0.06;
    const edgeX = openingWidth / 2 - 8;
    const edgeZ = openingDepth / 2 - 8;
    const ledPositions = [
        [-edgeX, ledY, -edgeZ],
        [edgeX, ledY, -edgeZ],
        [-edgeX, ledY, edgeZ],
        [edgeX, ledY, edgeZ]
    ];

    ledPositions.forEach(([x, yPos, z]) => {
        const ledLight = new THREE.PointLight(ledColor, 0.16, 24, 2.0);
        ledLight.position.set(x, yPos, z);
        scene.add(ledLight);
    });
}

function addRecessedSpots(scene, outerWidth, outerDepth, innerWidth, innerDepth, y) {
    const ringMaterial = new THREE.MeshStandardMaterial({
        color: 0xd6dce5,
        roughness: 0.35,
        metalness: 0.7
    });
    const lensMaterial = new THREE.MeshStandardMaterial({
        color: 0xeef3fb,
        emissive: 0xc8defa,
        emissiveIntensity: 0.35,
        roughness: 0.2,
        metalness: 0.05
    });

    const offsetX = innerWidth / 2 + (outerWidth - innerWidth) * 0.35;
    const offsetZ = innerDepth / 2 + (outerDepth - innerDepth) * 0.35;
    const lane = Math.min(innerWidth, innerDepth) * 0.35;
    const linear = [-lane * 0.75, lane * 0.75];

    const spotPositions = [];
    linear.forEach((value) => {
        spotPositions.push([value, -offsetZ]);
        spotPositions.push([value, offsetZ]);
        spotPositions.push([-offsetX, value]);
        spotPositions.push([offsetX, value]);
    });

    spotPositions.forEach(([x, z]) => {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 14), ringMaterial);
        ring.position.set(x, y - 0.03, z);
        scene.add(ring);

        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 12), lensMaterial);
        lens.position.set(x, y - 0.04, z);
        scene.add(lens);
    });
}

function createTrayCeiling(scene, config) {
    const {
        ceilingY,
        outerWidth,
        outerDepth,
        firstRecessWidth,
        firstRecessDepth,
        secondRecessWidth,
        secondRecessDepth,
        firstStepHeight,
        secondStepHeight,
        ceilingMaterial,
        ceilingStepMaterial,
        coveStripMaterial
    } = config;

    const firstLevelY = ceilingY + firstStepHeight;
    const secondLevelY = firstLevelY + secondStepHeight;

    addHorizontalCeilingRing(
        scene,
        outerWidth,
        outerDepth,
        firstRecessWidth,
        firstRecessDepth,
        ceilingY,
        ceilingMaterial
    );
    addVerticalCeilingStep(scene, firstRecessWidth, firstRecessDepth, ceilingY, firstLevelY, ceilingStepMaterial);

    addHorizontalCeilingRing(
        scene,
        firstRecessWidth,
        firstRecessDepth,
        secondRecessWidth,
        secondRecessDepth,
        firstLevelY,
        ceilingMaterial
    );
    addVerticalCeilingStep(
        scene,
        secondRecessWidth,
        secondRecessDepth,
        firstLevelY,
        secondLevelY,
        ceilingStepMaterial
    );

    addHorizontalCeilingPlane(scene, secondRecessWidth, secondRecessDepth, secondLevelY, ceilingMaterial);
    addCoveLighting(scene, firstRecessWidth, firstRecessDepth, firstLevelY, coveStripMaterial);
    addRecessedSpots(scene, outerWidth, outerDepth, firstRecessWidth, firstRecessDepth, ceilingY);
}

function addRoomEdges(scene) {
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    const halfSize = ROOM_SIZE / 2;

    // Esquinas verticales
    const corners = [
        [halfSize, halfSize],
        [halfSize, -halfSize],
        [-halfSize, halfSize],
        [-halfSize, -halfSize]
    ];

    corners.forEach(([x, z]) => {
        const points = [
            new THREE.Vector3(x, 0, z),
            new THREE.Vector3(x, ROOM_HEIGHT, z)
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, edgeMaterial);
        scene.add(line);
    });
}

export function updateDoors(delta, playerPosition) {
    if (!playerPosition || !Array.isArray(gameState.doors) || gameState.doors.length === 0) return;

    gameState.doors.forEach((door) => {
        if (!door.root || !door.pivot) return;
        const distance = door.root.position.distanceTo(playerPosition);
        const toPlayerX = playerPosition.x - door.root.position.x;
        const toPlayerZ = playerPosition.z - door.root.position.z;
        const sideProjection = toPlayerX * (door.normalX || 0) + toPlayerZ * (door.normalZ || 0);

        let playerSideSign = door.lastPlayerSideSign || 1;
        if (Math.abs(sideProjection) > DOOR_SIDE_EPSILON) {
            playerSideSign = sideProjection >= 0 ? 1 : -1;
            door.lastPlayerSideSign = playerSideSign;
        }

        // La puerta abre alejándose del usuario para acompañar su dirección de avance.
        const desiredOpenNormalSign = -playerSideSign;
        const positiveOpenNormalSign = door.positiveOpenNormalSign || 1;
        const swingSign = desiredOpenNormalSign * positiveOpenNormalSign;

        const target = distance <= DOOR_OPEN_DISTANCE ? DOOR_OPEN_ANGLE * swingSign : 0;
        door.openAmount = THREE.MathUtils.damp(door.openAmount, target, DOOR_OPEN_DAMPING, delta);
        door.pivot.rotation.y = door.openAmount;
    });
}

export function setupLighting(scene) {
    // Iluminación ambiental
    const ambientLight = new THREE.AmbientLight(0xf5f9ff, 0.45);
    scene.add(ambientLight);

    // Luz de relleno suave para mantener volúmenes limpios
    const directionalLight = new THREE.DirectionalLight(0xf8fcff, 0.38);
    directionalLight.position.set(0, ROOM_HEIGHT + 3, 0);
    directionalLight.castShadow = false;
    scene.add(directionalLight);

    // Luz central muy sutil y fría para evitar sombras demasiado duras
    const pointLight = new THREE.PointLight(0xecf5ff, 0.14, 20);
    pointLight.position.set(0, ROOM_HEIGHT - 0.2, 0);
    scene.add(pointLight);
}

export function addFurniture(scene) {
    // Mesa en el centro
    const tableGroup = new THREE.Group();
    
    // Superficie de la mesa
    const tableTop = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.05, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 })
    );
    tableTop.position.y = 0.75;
    tableTop.castShadow = false;
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);

    // Patas de la mesa
    const legGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.75);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
    
    const legPositions = [
        [0.5, 0.375, 0.35],
        [0.5, 0.375, -0.35],
        [-0.5, 0.375, 0.35],
        [-0.5, 0.375, -0.35]
    ];

    legPositions.forEach(([x, y, z]) => {
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.position.set(x, y, z);
        leg.castShadow = false;
        tableGroup.add(leg);
    });

    scene.add(tableGroup);

    // Silla
    const chairGroup = new THREE.Group();
    
    // Asiento
    const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.05, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.7 })
    );
    seat.position.set(-0.8, 0.5, 0);
    seat.castShadow = false;
    chairGroup.add(seat);

    // Respaldo
    const backrest = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.5, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.7 })
    );
    backrest.position.set(-0.8, 0.75, -0.2);
    backrest.castShadow = false;
    chairGroup.add(backrest);

    // Patas de la silla
    const chairLegPositions = [
        [-0.95, 0.25, -0.15],
        [-0.95, 0.25, 0.15],
        [-0.65, 0.25, -0.15],
        [-0.65, 0.25, 0.15]
    ];

    chairLegPositions.forEach(([x, y, z]) => {
        const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.5),
            legMaterial
        );
        leg.position.set(x, y, z);
        leg.castShadow = false;
        chairGroup.add(leg);
    });

    scene.add(chairGroup);

    // Cuadro en la pared
    const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.6, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x8b6914 })
    );
    frame.position.set(0, 1.8, -49.8);
    frame.castShadow = false;
    scene.add(frame);

    // "Pintura" dentro del marco
    const painting = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x4169e1 })
    );
    painting.position.set(0, 1.8, -49.5);
    scene.add(painting);

    // Estante en la pared
    const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.05, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x8b4513 })
    );
    shelf.position.set(15, 1.5, -48);
    shelf.castShadow = false;
    scene.add(shelf);

    // Libros en el estante
    const bookColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
    bookColors.forEach((color, i) => {
        const book = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.15, 0.12),
            new THREE.MeshStandardMaterial({ color })
        );
        book.position.set(14.5 + i * 0.08, 1.58, -47.9);
        book.rotation.y = Math.random() * 0.2 - 0.1;
        book.castShadow = false;
        book.userData.interactive = true;
        gameState.interactiveObjects.push(book);
        scene.add(book);
    });
    
    // Distribuir más objetos interactivos en el espacio
    addInteractiveObjects(scene);
}

export function addInteractiveObjects(scene) {
    // Añadir cubos interactivos distribuidos en la habitación
    const cubeColors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0xa8e6cf, 0xff8b94];
    const positions = [
        [10, 0.5, 10], [-10, 0.5, 10], [10, 0.5, -10], [-10, 0.5, -10],
        [20, 0.5, 20], [-20, 0.5, 20], [20, 0.5, -20], [-20, 0.5, -20],
        [30, 0.5, 0], [-30, 0.5, 0], [0, 0.5, 30], [0, 0.5, -30]
    ];
    
    positions.forEach((pos, i) => {
        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ 
                color: cubeColors[i % cubeColors.length],
                roughness: 0.5,
                metalness: 0.3
            })
        );
        cube.position.set(...pos);
        cube.castShadow = false;
        cube.receiveShadow = false;
        cube.userData.interactive = true;
        cube.userData.originalPosition = cube.position.clone();
        gameState.interactiveObjects.push(cube);
        scene.add(cube);
    });
    
    // Añadir esferas interactivas
    for (let i = 0; i < 4; i++) {
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 16, 16),
            new THREE.MeshStandardMaterial({
                color: Math.random() * 0xffffff,
                roughness: 0.3,
                metalness: 0.6
            })
        );
        const angle = (i / 4) * Math.PI * 2;
        const radius = 25;
        sphere.position.set(
            Math.cos(angle) * radius,
            1,
            Math.sin(angle) * radius
        );
        sphere.castShadow = false;
        sphere.receiveShadow = false;
        sphere.userData.interactive = true;
        sphere.userData.originalPosition = sphere.position.clone();
        gameState.interactiveObjects.push(sphere);
        scene.add(sphere);
    }
}
