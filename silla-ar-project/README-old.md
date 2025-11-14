# Proyecto Silla AR

Experiencia de Realidad Aumentada con Three.js para visualizar una silla 3D.

## Archivos

- `silla.html` - Visualizador 3D estándar (escritorio)
- `silla-ar.html` - Experiencia de Realidad Aumentada (móvil)

## Cómo usar

### Versión Escritorio (`silla.html`)
1. Abre el archivo en cualquier navegador moderno
2. Arrastra con el mouse para rotar la silla
3. Usa la rueda del mouse para zoom

### Versión AR (`silla-ar.html`)
1. Abre desde un servidor HTTPS en tu móvil
2. Usa Chrome (Android) o Safari (iOS 13+)
3. Presiona "Iniciar AR"
4. Apunta a una superficie plana
5. Toca para colocar la silla
6. Camina para explorar

## Requisitos AR

- Dispositivo con soporte WebXR
- iOS 13+ (Safari) o Android con ARCore (Chrome)
- Conexión HTTPS
- Permisos de cámara

## Servidor Local HTTPS

Para probar AR localmente:

```bash
# Opción 1: Python
python3 -m http.server 8000

# Opción 2: Node.js (http-server)
npx http-server -p 8000

# Opción 3: PHP
php -S localhost:8000
```

Luego accede desde tu móvil a: `https://[tu-ip-local]:8000/silla-ar.html`

## Tecnologías

- Three.js r128
- WebXR API
- WebGL
