# Informe Técnico Ejecutivo - Entornos Virtuales Demo Escuela Diseño

Fecha: 19 de febrero de 2026  
Proyecto: `entornos virtuales demo Escuela diseño`

## 3) Features implementadas/pending con estado

### 3.1 Implementadas

| Feature | Estado | Evidencia técnica | Ejemplo simple para jefatura |
|---|---|---|---|
| Modo PC (W/A/S/D, mouse, correr, crosshair) | OK | `js/main.js`, `js/Controllers.js` | Un usuario entra desde notebook y puede recorrer el campus como videojuego en primera persona. |
| Modo VR con WebXR (Meta Quest) | OK | `js/main.js`, `js/Controllers.js` | Un estudiante con Quest puede caminar con joystick y mirar en 360. |
| Manos virtuales y gatillo VR | OK | `js/Weapons.js`, `js/Controllers.js` | En VR se ven manos y se apunta a botones para seleccionar respuestas. |
| NPC “Francisca” con FAQ | OK | `js/NPCManager.js`, `js/NPC.js`, `js/Config.js` | El alumno pregunta por matrícula y recibe respuesta guiada. |
| Diálogo 3D con paginación y cierre | OK | `js/NPC.js`, `js/NPCDialogueUI.js` | Si hay muchas preguntas, se navega por páginas sin saturar la pantalla. |
| Overlay de carga + botón “Iniciar experiencia” | OK | `index.html`, `js/main.js`, `css/styles.css` | El usuario no entra al entorno hasta que los assets están listos. |
| Escena de oficina (muros, texturas, zonas, mobiliario) | OK | `js/SceneSetup.js` | Se visualizan espacios como cocina, hall central, oficina y auditorio. |
| Puertas automáticas (abren al acercarse) | OK | `js/SceneSetup.js` (`updateDoors`) | Al acercarse, la puerta se abre; al alejarse, se cierra suavemente. |
| Fallback de resiliencia (NPC placeholder / puertas procedurales) | OK | `js/NPCManager.js`, `js/SceneSetup.js` | Si falla un FBX, la app no se rompe: muestra reemplazo funcional. |
| Optimizaciones base de rendimiento | OK | `js/main.js`, `js/SceneSetup.js` | Se limita calidad gráfica para mantener fluidez (VR/PC). |

### 3.2 Pendientes o parciales

| Feature | Estado | Impacto de negocio | Acción sugerida |
|---|---|---|---|
| Soporte multi-NPC real en producción | Parcial | Hoy solo existe Francisca; limita cobertura de casos académicos. | Crear 2-3 NPCs extra (finanzas, malla, bienestar) reutilizando `NPC`/`NPCManager`. |
| Métricas automáticas de performance en runtime | Pendiente | No hay panel interno para validar SLA de FPS/carga/estabilidad en cada build. | Agregar instrumentación (FPS promedio, tiempo de carga, errores por sesión). |
| Objetos agarrables VR visibles en escena final | Parcial | Existe lógica para agarrar objetos, pero no se están poblando en el flujo actual principal. | Definir si se habilita o se retira del alcance para no dejar deuda técnica. |
| Sombras dinámicas y esquema de luces de producción | Pendiente | La escena se ve funcional, pero sin profundidad visual cinematográfica/institucional. | Implementar pipeline de iluminación escalonado (bake + sombras selectivas) con presupuesto de rendimiento por dispositivo. |
| Dirección de arte integral (look and feel completo) | Pendiente | Sin dirección de arte, el resultado puede verse técnicamente correcto pero inconsistente visualmente. | Definir guía de arte (paleta, materiales, mood, narrativa espacial, UI, señalética) y ejecutar backlog visual. |
| HUD legado (zombies, ammo, etc.) | Pendiente de limpieza | Genera ruido conceptual para proyecto educativo. | Eliminar o desacoplar definitivamente módulos/estado legado. |
| Matriz formal de licencias de assets 3D | Pendiente | Riesgo legal/comercial si se publica sin trazabilidad. | Registrar origen, licencia y evidencia de cada FBX/textura. |

### 3.3 Comentario técnico: por qué faltan sombras/luces avanzadas y cómo añadirlas

#### ¿Por qué faltan hoy?

1. En el estado actual se priorizó estabilidad y FPS: el renderer tiene sombras desactivadas (`renderer.shadowMap.enabled = false`), especialmente para mantener fluidez en VR.
2. El proyecto está en etapa funcional-producto mínimo: primero se aseguró interacción PC/VR, navegación y diálogo NPC.
3. No existe aún una dirección de arte cerrada: sin lineamientos visuales definitivos, iluminar “a nivel final” puede generar retrabajo (colores, materiales, intensidad, mood).

#### Procedimiento recomendado para añadir luces y sombras sin romper rendimiento

1. Definir objetivo visual por escena: referencia de estilo (realista, corporativo limpio, cálido, etc.) y reglas de iluminación.
2. Separar iluminación en capas:  
   `a)` luz base baked (lightmaps/ao), `b)` luces dinámicas clave, `c)` acentos puntuales.
3. Activar sombras de forma selectiva (no global):  
   solo objetos principales (NPC, puertas, mobiliario crítico), evitando sombras en todo el set.
4. Configurar presupuesto técnico por plataforma:  
   desktop (calidad media/alta), VR (calidad media/baja con prioridad a estabilidad).
5. Ajustar materiales PBR con criterio artístico: calibrar roughness/metalness y color space para coherencia de look.
6. Medir después de cada iteración: FPS, frame time, temperatura y estabilidad en sesiones de 20 minutos.
7. Cerrar con “Quality Gates”:  
   no aprobar cambios visuales que bajen de `45 FPS` en PC o `72 FPS` en VR.

#### Impacto de luces y sombras en performance (explicación ejecutiva)

1. Cada luz dinámica agrega cálculos por píxel en tiempo real: a más luces simultáneas, más trabajo para la GPU.
2. Las sombras dinámicas son costosas porque requieren renderizados extra (shadow maps) desde la perspectiva de cada luz.
3. En VR el costo se duplica de forma práctica, porque la escena debe sostener alta fluidez y baja latencia para ambos ojos.
4. Materiales complejos + luces + sombras aumentan el tiempo por frame; si el frame tarda demasiado, baja FPS y aparece sensación de tirones.

Ejemplo simple para jefatura: si una escena sin sombras corre fluida, al activar sombras globales en todos los objetos puede perder suficiente FPS para afectar comodidad en Quest.

#### Cómo se soluciona técnicamente

1. Usar sombras solo donde aportan valor visual real: NPC principal, puertas y 2-3 elementos ancla.
2. Preferir iluminación baked para el entorno estático (muros/piso/techo) y dejar dinámico solo lo imprescindible.
3. Limitar resolución y alcance de sombras por plataforma (PC vs VR), con perfiles de calidad.
4. Reducir cantidad de luces activas al mismo tiempo y usar culling por zona.
5. Optimizar materiales y geometría antes de subir calidad lumínica (menos polígonos/menos texturas gigantes).
6. Validar cambios con métricas objetivas por build: FPS promedio, p95 frame time, errores y estabilidad de 20 minutos.

#### Recursos que deberíamos tener para implementar bien

| Recurso | Mínimo recomendado | Objetivo |
|---|---|---|
| Perfil técnico | 1 dev 3D/WebXR | Implementar pipeline de luces/sombras y optimización |
| Perfil artístico | 1 artista técnico o director/a de arte | Definir look final, mood y coherencia visual |
| QA de rendimiento | 1 persona QA (part-time) | Ejecutar pruebas repetibles PC + Quest y validar SLA |
| Equipamiento pruebas | 1 PC gama media + 1 PC gama alta + 1 Meta Quest 2/3 | Comparar rendimiento por segmento de usuario |
| Herramientas medición | Chrome DevTools + trazas de frame time + checklist QA | Tomar decisiones por datos, no por percepción |
| Tiempo de ejecución | 2 a 4 semanas por iteraciones | Cerrar calidad visual sin romper performance |

## 4) Stack + licencias (con versiones)

### 4.1 Herramientas, lenguajes y tecnologías

| Componente | Versión | Uso en el proyecto | Licencia |
|---|---|---|---|
| HTML5 | N/A | Estructura de la app (`index.html`) | Estándar abierto |
| CSS3 | N/A | Estilos de UI (`css/styles.css`) | Estándar abierto |
| JavaScript ES Modules | N/A (según navegador) | Lógica de app modular (`js/*.js`) | Estándar abierto |
| Three.js | `0.160.0` | Motor 3D/WebGL | MIT |
| `PointerLockControls` (addon Three.js) | `0.160.0` | Controles first-person en PC | MIT (mismo repositorio Three.js) |
| `FBXLoader` (addon Three.js) | `0.160.0` | Carga de modelos/animaciones FBX | MIT (mismo repositorio Three.js) |
| `VRButton` (addon Three.js) | `0.160.0` | Entrada/salida de sesión WebXR | MIT (mismo repositorio Three.js) |
| WebXR Device API | Depende del navegador/dispositivo | Soporte VR en navegador | Estándar W3C |

### 4.2 Estado de licencias de assets (importante)

| Recurso | Ruta / alcance | Origen declarado | Condición de licencia declarada | Riesgo |
|---|---|---|---|---|
| Texturas de suelo, murallas y techos | `assets/textures/*` | Creadas con ChatGPT Premium 5.2 | Uso gratis (declarado por equipo) | Medio |
| Puertas, escritorios e indumentarias | `build/puertas/*`, `build/cosas-oficina/*` y assets asociados | Unreal Marketplace / Fab Free Assets: https://www.unrealengine.com/marketplace/en-US/ | Gratis; en el caso de assets de Fab, uso gratis no comercial | Medio-Alto |
| Modelos de personajes y animaciones | `assets/characters/*` | Integración interna del proyecto | Debe quedar trazabilidad por archivo para cierre legal | Medio |

Nota ejecutiva: según lo declarado, todas las licencias actuales son de uso gratis, pero los assets de Fab son gratis solo para uso no comercial.  
Si el proyecto pasa a producción real/comercial, esos assets deben comprarse para evitar conflictos de licencia.

Nota de control: esta declaración ya está incorporada en el informe, pero se recomienda adjuntar respaldo documental (capturas/licencias/IDs de asset) dentro del repositorio para auditoría.

## 5) Diagrama de arquitectura (simple)

```text
[Usuario PC/VR]
      |
      v
[Navegador (WebGL + WebXR)]
      |
      v
[index.html + css/styles.css]
      |
      v
[js/main.js]  ---> ciclo de render (setAnimationLoop)
   |     |  \
   |     |   \--> [js/NPCManager.js] -> [js/NPC.js] -> [js/NPCDialogueUI.js]
   |     |
   |     \------> [js/Controllers.js] (input PC/VR + raycast interacción)
   |
   \-----------> [js/SceneSetup.js] (sala, muros, puertas, mobiliario, luces)
   |
   \-----------> [js/ZombieManager.js] (actualiza NPCs; módulo legado renombrable)
   |
   \-----------> [js/Config.js] (estado global gameState y constantes)
                         |
                         v
                 [Assets FBX + texturas]
```

Ejemplo simple: `main.js` orquesta todo. Si el usuario presiona gatillo en VR, `Controllers.js` detecta raycast, manda acción al NPC, y `NPCDialogueUI.js` actualiza el panel 3D.

## 6) Requisitos de hardware/red por tipo de usuario

Supuesto técnico actual: carga inicial aproximada local de proyecto ~`60.9 MB` (sin contar CDN externos del navegador).

| Tipo de usuario | Hardware mínimo | Hardware recomendado | Red mínima | Ejemplo de experiencia |
|---|---|---|---|---|
| Alumno/Docente en PC (escritorio) | CPU 4 núcleos, 8 GB RAM, GPU integrada moderna | CPU 6+ núcleos, 16 GB RAM, GPU dedicada gama media | 20 Mbps, latencia < 80 ms | Recorre sala y conversa con Francisca sin VR. |
| Alumno en VR (Meta Quest 2/3) | Meta Quest 2 con navegador WebXR y controladores | Meta Quest 3 por mayor fluidez visual | Wi-Fi 5 GHz estable, 30+ Mbps | Interacción natural con manos/gatillo y diálogo 3D. |
| Presentación ejecutiva (demo estable) | PC con salida a pantalla grande, navegador actualizado | PC con GPU dedicada + red cableada | 50+ Mbps o servidor local LAN | Menor tiempo de carga y menor riesgo en demo en vivo. |
| Equipo QA/Desarrollo | Igual que PC recomendado + herramientas dev | PC alto rendimiento + Quest 2/3 para pruebas cruzadas | 50+ Mbps + entorno local (MAMP/XAMPP) | Ejecuta pruebas repetidas de rendimiento y estabilidad. |

Ejemplo de red para jefatura: con 61 MB de carga inicial, a 20 Mbps la espera puede rondar ~25 segundos; a 50 Mbps baja a ~10 segundos (aprox., sin cache previa).

## 7) Bitácora de experimentos (tabla) + 3 aprendizajes principales

### 7.1 Bitácora de experimentos (base para completar juntos)

| Fecha | Hipótesis | Cambio aplicado | Resultado observado | Estado |
|---|---|---|---|---|
| 2026-02-19 | Bajar pixel ratio mejora fluidez en VR sin pérdida crítica de lectura | Tope de pixel ratio (`1.25` desktop, `1.0` VR) | Menor carga GPU esperada; falta benchmark formal | En validación |
| 2026-02-19 | Reducir raycasts por frame estabiliza CPU | Throttle de highlight/raycast (`~30Hz` PC, `~45Hz` VR) | Menor costo por frame esperado; falta medición con profiler | En validación |
| 2026-02-19 | Instanciar muros reduce draw calls | Muros en `InstancedMesh` | Mejora estructural de rendimiento esperada | En validación |
| 2026-02-19 | Desactivar sombras prioriza estabilidad de FPS | `renderer.shadowMap.enabled = false` | Menos carga visual; mejora probable de FPS | En validación |
| Pendiente | Reducir peso del personaje principal baja tiempo de carga inicial | Comprimir/retopologizar `megan.fbx` | Pendiente de prueba | Pendiente |

### 7.2 Tres aprendizajes principales (propuesta inicial)

1. El mayor cuello de botella inicial no es el código JS, sino el peso de assets 3D (principalmente `megan.fbx`).
2. En VR, pequeñas decisiones de render (sombras, raycast por frame, pixel ratio) tienen impacto directo en comodidad del usuario.
3. Tener fallback (NPC/puertas) evita caídas totales y mejora la percepción de robustez en demos institucionales.

## 8) Métricas mínimas de performance (FPS, carga, estabilidad)

### 8.1 Umbrales mínimos propuestos (aceptación)

| Métrica | Mínimo aceptable | Meta recomendada | Método de medición | Estado actual |
|---|---|---|---|---|
| FPS en PC | `>= 45 FPS` sostenidos | `>= 60 FPS` | Promedio 3 minutos por escena en Chrome Performance | Sin medición formal registrada |
| FPS en VR (Quest) | `>= 72 FPS` sostenidos | `>= 90 FPS` si el dispositivo lo soporta | Medición por sesión WebXR + profiler | Sin medición formal registrada |
| Tiempo de carga inicial (primer ingreso, sin cache) | `<= 25 s` en 20 Mbps | `<= 12 s` en 50 Mbps | `navigation timing` + marca de “assets ready” | Estimado, no instrumentado |
| Estabilidad funcional | 0 bloqueos críticos en 20 min de uso | 0 errores críticos en consola | Prueba guiada (PC + VR) | Parcial: hay manejo de fallos, falta suite formal |

### 8.2 Lectura ejecutiva rápida

- Hoy el proyecto ya es demostrable y usable en PC/VR.
- Para cierre “producción institucional”, faltan cinco cierres clave:  
  `1)` benchmark formal, `2)` iluminación/sombras de producción con presupuesto de rendimiento, `3)` dirección de arte integral, `4)` limpieza de módulos legados, `5)` matriz de licencias de assets.
