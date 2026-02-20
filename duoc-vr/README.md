# 🎓 Campus Virtual Duoc UC - Ambiente Interactivo VR

Ambiente virtual educativo en 3D donde estudiantes pueden explorar y hablar con asistentes virtuales (NPCs) para obtener información sobre procesos académicos de Duoc UC.

## 🌟 Características

- **Ambiente 3D inmersivo** con habitación, muebles y objetos interactivos
- **NPCs inteligentes** con sistema de diálogos interactivos
- **Interfaz adaptable** que crece dinámicamente según el contenido
- **Diseño moderno** inspirado en UI profesional con gradientes y animaciones
- **Soporte VR completo** para Meta Quest (Quest 2/3)
- **Modo PC** con controles de teclado y mouse + crosshair
- **Sistema de manos en VR** para interacción natural
- **Botones clickeables en 3D** para seleccionar respuestas

## 🎮 Controles

### PC (Escritorio)
- **W/A/S/D** - Movimiento (primera persona)
- **Shift** - Correr
- **Mouse** - Mirar alrededor
- **🎯 Crosshair** - Puntero en el centro de la pantalla para apuntar
- **E o Click** - Interactuar con NPCs (apunta con el crosshair)
- **Click en botones** - Seleccionar opciones del diálogo (apunta y haz click)
- **1-9** - También puedes usar el teclado para opciones
- **X o Esc** - Cerrar diálogo

### VR (Meta Quest)
- **👋 Manos virtuales** - Visibles y se mueven con los controladores
- **Joystick izquierdo** - Caminar
- **Joystick derecho** - Girar vista
- **Gatillo** - Interactuar con NPCs y botones (apunta con la mano)
- **Manos** - Visible en todo momento para interacción natural

## 📁 Estructura del Proyecto

```
duoc-vr/
├── index.html                    ← Punto de entrada
├── css/
│   └── styles.css                ← Estilos del UI
├── js/
│   ├── Config.js                 ← Configuración y constantes
│   ├── NPC.js                    ← Clase NPC reutilizable
│   ├── NPCManager.js             ← Gestión de NPCs
│   ├── SceneSetup.js             ← Creación del ambiente 3D
│   ├── Controllers.js            ← Controles VR y PC
│   ├── Weapons.js                ← Sistema de manos VR
│   ├── ZombieManager.js          ← Actualizaciones de NPCs
│   └── main.js                   ← Inicialización principal
└── assets/
    ├── characters/               ← Modelos FBX de personajes
    │   ├── megan.fbx
    │   ├── saludando.fbx
    │   └── pensar.fbx
    └── textures/
```

## 🤖 NPCs Disponibles

### Francisca - Asistente Virtual
Francisca es una asistente virtual que responde preguntas frecuentes sobre:
- Procesos de matrícula
- Información sobre sostenedores
- Modalidades de pago
- Inscripción de ramos
- Aranceles y más

## 🛠️ Tecnologías Utilizadas

- **Three.js** (v0.160.0) - Motor 3D
- **WebXR** - API de realidad virtual
- **FBX Loader** - Carga de modelos 3D animados
- **JavaScript ES6 Modules** - Organización modular del código

## 🚀 Instalación y Uso

1. Coloca los archivos en un servidor web (MAMP, XAMPP, etc.)
2. Asegúrate de tener los modelos FBX en `assets/characters/`
3. Abre `index.html` en un navegador compatible con WebXR
4. Para VR: Usa el botón "Entrar en Realidad Virtual"

## 📱 Compatibilidad VR

- ✅ Meta Quest 2
- ✅ Meta Quest 3
- ✅ Meta Quest Pro
- ⚠️ Otros dispositivos VR (pueden requerir ajustes)

## 🔧 Agregar Nuevos NPCs

Para agregar un nuevo NPC:

1. Abre `js/NPCManager.js`
2. Crea una nueva función similar a `createNPCFrancisca()`
3. Define los diálogos en `js/Config.js`
4. Llama a la función desde `js/main.js`

Ejemplo:

```javascript
const nuevoNPC = new NPC({
    name: 'Roberto',
    modelPath: 'assets/characters/roberto.fbx',
    idleAnimationPath: 'assets/characters/idle.fbx',
    interactAnimationPath: 'assets/characters/talk.fbx',
    position: new THREE.Vector3(5, 0, -4),
    greeting: '¡Hola! ¿En qué puedo ayudarte?',
    dialogues: {
        "¿Pregunta 1?": "Respuesta 1",
        "¿Pregunta 2?": "Respuesta 2"
    }
});
```

## 🎨 Personalización

### Cambiar Colores del UI de Diálogo
Edita en `js/NPC.js` → `createDialogueUI()`:
```javascript
color: 0x1a1a2e  // Color del panel de fondo
```

### Ajustar Tamaño de la Habitación
Edita en `js/Config.js`:
```javascript
export const ROOM_SIZE = 100; // metros
export const ROOM_HEIGHT = 3; // metros
```

### Velocidad de Movimiento
Edita en `js/Config.js`:
```javascript
export const MOVE_SPEED = 15.0;      // Caminando
export const RUN_SPEED = 30.0;        // Corriendo
export const VR_MOVEMENT_SPEED = 5.0; // VR
```

## 📝 Notas de Desarrollo

- El sistema de manos VR se crea automáticamente al entrar en VR
- Los NPCs tienen hitboxes cilíndricas para facilitar la interacción
- El UI 3D siempre mira hacia la cámara (billboard effect)
- Los diálogos soportan hasta 8 preguntas visibles simultáneamente

## 🐛 Solución de Problemas

**El NPC no aparece:**
- Verifica que los archivos FBX estén en `assets/characters/`
- Revisa la consola del navegador para errores de carga

**VR no funciona:**
- Usa HTTPS (requerido por WebXR)
- Verifica que tu navegador soporte WebXR
- En Meta Quest, usa el navegador nativo

**Controles VR no responden:**
- Verifica que los controladores estén conectados
- Revisa la consola para mensajes de gamepad

## 📄 Licencia

Proyecto educativo para Duoc UC.

## 👥 Contribuciones

Para agregar características o reportar bugs, contacta al equipo de desarrollo.

---

**Desarrollado para Duoc UC** 🎓
