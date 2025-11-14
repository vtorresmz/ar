# 🪑 Silla AR Project

Proyecto de Realidad Aumentada que muestra una silla 3D interactiva usando diferentes tecnologías AR.

## 🌐 Demo en Vivo

**Principal:** https://vtorresmz.github.io/ar/silla-ar-project/

## 📱 Versiones Disponibles

### 1. **AR con Marcador (index-arjs.html)** - ✅ RECOMENDADO PARA iOS
- ✅ **Compatible con Safari iOS y Android**
- 🎯 Usa AR.js con marcador HIRO
- 📥 [Descargar marcador HIRO](https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/images/hiro.png)
- 🎮 Controles: Botones + gestos (pinch to zoom, two-finger rotate)

**Cómo usar:**
1. Descarga e imprime el marcador HIRO (o muéstralo en otra pantalla)
2. Abre `index-arjs.html` en Safari iOS o Chrome Android
3. Permite acceso a la cámara
4. Apunta al marcador y manipula el objeto

### 2. **WebXR con Hit-Test (index-webxr.html)** - Para Chrome Android
- ⚠️ Solo Chrome Android con ARCore
- 🚫 NO funciona en Safari iOS (iOS no soporta WebXR)
- 🎯 Detecta superficies y coloca objetos
- 👆 Tap para colocar la silla

### 3. **Vista 3D Interactiva (silla.html)**
- 🖥️ Vista 3D sin AR
- 🖱️ Controles con mouse/touch para rotar
- ✅ Funciona en cualquier navegador

## 🔧 Tecnologías

- **Three.js** - Motor 3D
- **AR.js** - AR basado en marcadores (compatible con iOS)
- **WebXR** - AR nativo del navegador (solo Chrome Android)
- **A-Frame** - Framework WebVR/AR

## 🎯 Características AR.js

### Gestos Táctiles:
- **Pinch (dos dedos)**: Escalar el objeto
- **Dos dedos rotación**: Rotar el objeto
- **Botones**: Control preciso de escala y rotación

### Controles:
- 🔼 Aumentar tamaño
- 🔽 Disminuir tamaño  
- ↻ Rotar 45°
- ⟲ Reiniciar posición/escala

## 📦 Archivos del Proyecto

```
├── index.html              # Detección automática de dispositivo
├── index-arjs.html         # AR con marcador (RECOMENDADO)
├── index-webxr.html        # WebXR para Android
├── index-ios.html          # Info para usuarios iOS
├── index-marker.html       # WebXR image tracking (experimental)
├── silla.html              # Vista 3D sin AR
└── README.md
```

## 🚀 Desarrollo Local

```bash
# Servidor simple
python -m http.server 8080
# O con Node.js
npx http-server -p 8080

# Luego abre http://localhost:8080
```

## 📱 Compatibilidad

| Navegador | AR.js Marcador | WebXR Hit-Test |
|-----------|---------------|----------------|
| Safari iOS | ✅ Sí | ❌ No |
| Chrome Android | ✅ Sí | ✅ Sí (con ARCore) |
| Firefox Android | ✅ Sí | ❌ No |
| Chrome Desktop | ⚠️ Solo vista | ❌ No |
| WebXR Viewer | ✅ Sí | ✅ Sí |

## 💡 Características

### ✅ Ya Implementado:
- ✅ AR basado en marcadores (funciona en iOS Safari)
- ✅ WebXR para Android
- ✅ Gestos táctiles: pinch to zoom, rotate
- ✅ Controles con botones
- ✅ Detección automática de dispositivo
- ✅ Vista 3D interactiva sin AR

### 🚀 Posibles Mejoras:
- [ ] Generar archivo USDZ para AR Quick Look (iOS nativo)
- [ ] Múltiples marcadores personalizados
- [ ] Catálogo de muebles
- [ ] Guardar screenshots desde AR
- [ ] Compartir configuraciones

## 🐛 Solución de Problemas

**"No se detecta el marcador":**
- Asegúrate de tener buena iluminación
- El marcador debe estar plano y visible completamente
- Mantén una distancia de 20-50cm de la cámara
- Imprime el marcador en tamaño A4 o muéstralo en una tablet

**"No funciona en iOS":**
- Usa `index-arjs.html` con marcador HIRO
- O descarga WebXR Viewer de Mozilla
- Safari iOS NO soporta WebXR estándar (limitación de Apple)

**"Cámara no se inicia":**
- Permite permisos de cámara en Ajustes > Safari > Cámara
- Verifica que estás usando HTTPS (GitHub Pages lo hace automáticamente)
- Recarga la página y acepta permisos

**"El objeto está muy grande/pequeño":**
- Usa los botones 🔼 🔽 para ajustar
- O usa gestos pinch (dos dedos juntar/separar)

## 📖 Cómo Funciona

### AR.js (Marcador)
1. La cámara busca el patrón del marcador HIRO
2. Cuando lo detecta, calcula su posición y orientación
3. Coloca el modelo 3D sobre el marcador
4. Puedes manipular el objeto con gestos o botones
5. El objeto sigue al marcador mientras sea visible

### WebXR (Android)
1. Usa ARCore para escanear el entorno
2. Detecta superficies planas (mesas, suelos, paredes)
3. Muestra una retícula verde donde puedes colocar objetos
4. Tap para colocar el objeto en esa posición
5. El objeto permanece "anclado" en el espacio real

## 📄 Licencia

MIT
