import * as THREE from 'three';

// Configuración de la habitación
export const ROOM_SIZE = 100; // 100 metros
export const ROOM_HEIGHT = 5; // 5 metros para una sensación más amplia
export const MOVE_SPEED = 7.5; // metros por segundo (caminata más ágil)
export const RUN_SPEED = 12.5; // metros por segundo (carrera)

// Configuración VR
export const VR_MOVEMENT_SPEED = 5.0;
export const VR_ROTATION_SPEED = 1.5;

// Configuración de interacción
export const INTERACTION_DISTANCE = 4.0; // metros
export const HAND_SCALE = 1.0;

// Variables principales del juego (estado global)
export const gameState = {
    camera: null,
    scene: null,
    renderer: null,
    controls: null,
    cameraRig: null,
    
    // Controles de movimiento
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    moveUp: false,
    moveDown: false,
    isRunning: false,
    
    // Física
    velocity: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    prevTime: performance.now(),
    
    // VR Controllers
    controller1: null,
    controller2: null,
    controllerGrip1: null,
    controllerGrip2: null,
    hand1: null,
    hand2: null,
    currentController: null,
    vrHeightOffsetY: 0,
    
    // Interacción
    interactiveObjects: [],
    selectedObject: null,
    raycaster: new THREE.Raycaster(),
    tempMatrix: new THREE.Matrix4(),
    
    // Manos VR
    handModel1: null,
    handModel2: null,
    
    // NPCs
    npcs: [],
    npcHitboxes: [],
    doors: [],
    wallColliders: [],
    currentNPCInteraction: null,
    preventPointerLockOnce: false,

    // Flujo de experiencia
    assetsReady: false,
    experienceStarted: false
};

// Diálogos de Francisca (FAQ de Duoc UC)
export const franciscaDialogues = {
    "¿Modalidad de pago online para matrícula?": "Si eres pre-inscrito, el pago se realiza en admision.duoc.cl. También puedes pagar en el Portal Experiencia Vivo Alumnos o en www2.duoc.cl/portal-de-pagos-en-linea.",
    "¿Quién puede ser mi sostenedor?": "El sostenedor debe ser mayor de 18 años, tener domicilio en Chile y no tener deudas con Duoc UC. Es el responsable financiero de tus estudios.",
    "¿Puedo ser mi propio sostenedor?": "Sí. Si tienes entre 18 y 21 años, debes acreditar un ingreso mínimo de $500.000.",
    "¿Puedo cambiar de sostenedor?": "Sí, mediante un proceso de 'novación'. Debes ir a la sede con el nuevo sostenedor máximo 10 días hábiles antes del fin del periodo.",
    "¿Debo inscribir ramos al matricularme?": "No. Los alumnos nuevos tienen su horario cargado automáticamente. La inscripción es desde el segundo semestre.",
    "¿Qué es la Jornada de Inicio?": "Es la semana previa a clases donde conoces docentes, coordinadores, directores y las instalaciones de tu sede.",
    "¿Modalidades de pago?": "Online: Portal de Alumnos, Banco Santander/Estado/Chile, Webpay. Presencial: Cajas Duoc UC, Caja Vecina, Estado Express.",
    "¿Puedo cambiarme de carrera?": "Sí, si cumples los requisitos y hay vacantes disponibles.",
    "¿Dónde veo los aranceles?": "En duoc.cl/oferta-academica/carreras, en la ficha de cada carrera.",
    "¿Cuál es el periodo de retracto?": "10 días corridos desde la publicación de resultados CRUCH. Ver fechas en demre.cl/calendario/.",
    "¿Puedo matricularme con DICOM?": "Sí. Duoc UC no solicita informe comercial DICOM."
};
