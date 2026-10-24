# Ajuste local del formulario de plantillas — 2026-10-23

Estado: **IMPLEMENTADO EN LOCAL; DESPLIEGUE DIFERIDO POR EL PROPIETARIO**.

## Causa y corrección

Se reprodujo la captura con un mensaje largo y un adjunto sintético. El marco usa
overflow hidden: el navegador podía desplazarlo programáticamente al enfocar contenido
inferior. El encabezado llegaba a -259px y el pie terminaba en 707px dentro de un marco
que acababa en 984px. Esto ocultaba el título y dejaba una zona vacía bajo las acciones.

La clase del propietario `mail-template-editor` usa overflow clip para impedir ese
desplazamiento exterior; el cuerpo compartido conserva su scroll, incluso con ventana
baja/teclado. El marco y el motor compartidos se mantienen. `SalesModalFrame` sólo
reenvía el `bodyRef` existente del motor para reiniciar el cuerpo al cambiar de vista.

Clasificación: **Standard Form** para crear/editar; **Confirmation** para descartar y
**Operational Workspace** para la biblioteca. Se conserva el ancho estándar de 48rem.
Nombre/asunto comparten fila en escritorio y se apilan en móvil; el editor limita su
altura, la vista previa segura se abre desde un disclosure nativo y los adjuntos usan
su presentación compacta. Atrás y Guardar permanecen en una fila también en móvil.
El título Editar plantilla tiene seis traducciones.

## Comportamiento preservado

Contenido y placeholders, datos/API/DTOs, permiso de gestión, versiones/identidad de
guardado/reintento, adjuntos verificados, cuotas, validaciones y bloqueo durante cargas.
Descartar reemplaza la vista dentro del mismo modal y cancelar conserva texto y archivos.
El iframe mantiene sandbox/CSP; el editor conserva la corrección local de imágenes.
No se modifica configuración, base de datos, esquema ni producción.

Cambios: TemplateManager/Form, CSS del editor, copy del workspace, passthrough de
bodyRef, prueba/comando nativos y estándares. El catálogo sólo cambia su huella de
fuentes: 89 lecciones bilingües/16 módulos y versiones/progreso sin cambios.

## Verificación

- **PASS:** regresión nativa del fallo antes/después; texto largo, foco nativo, desplazamiento
  hacia adjuntos, preview abierta/cerrada, guardado sin alterar adjuntos, descarte
  cancelado y formulario nuevo con altura según contenido.
- **PASS:** tamaños 1440×1000, 1586×1568, 390×844, 320×568 y 780×440; encabezado/pie estables,
  marco sin scroll y sin overflow horizontal. Capturas de claro/oscuro revisadas.
- **PASS:** los tres flujos nativos existentes de plantillas, biblioteca compacta e imágenes.
- **PASS:** 37 regresiones enfocadas de Correo/Mailing, sin fallos ni omisiones; TypeScript.
- **PASS:** `AiLearningServiceTest` (dos pruebas sin fallos ni omisiones; Mockito, sin base de datos).
- **PASS:** `generate-lupita-learning-catalog --check` y `git diff --check`.
- **PASS:** build de producción del frontend (17,94s); advertencia de chunks mayores de
  600kB, sin errores de compilación.

Evidencia sintética: `/tmp/indice-template-editor-layout-review/` y logs privados en
`/private/tmp/indice-template-production-diagnosis-20261023/`.
Revisión humana en la aplicación local: pendiente. Envíos reales, publicación y
activación de proveedores: **N/A**. La prueba no utiliza una base funcional/producción.
