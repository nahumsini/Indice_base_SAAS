# Corrección de inserción de imágenes en Correo — 2026-10-23

Estado: **CORREGIDA Y VERIFICADA EN LOCAL; PUBLICACIÓN PENDIENTE**.

## Causa reproducida

La selección de un PNG válido terminaba sin insertar imagen: la preparación marcaba
ocupados al editor y a su propietario, dejando `contentEditable=false`. Al terminar,
el comando nativo de inserción se ejecutaba antes de liberar ese bloqueo. El navegador
rechazaba la operación. Una prueba nativa del compositor real reprodujo el fallo antes
de modificar la implementación.

Además, Insertar imagen estaba al final de una barra horizontal y podía quedar oculto.
El optimizador hacía un único intento de PNG a 640px y rechazaba imágenes detalladas
que superaban el presupuesto de 100 KiB, aunque el archivo original estuviera permitido.

## Cambio y comportamiento conservado

El editor confirma la liberación de su estado ocupado y el del propietario antes de
ejecutar la inserción, comprueba que realmente apareció la imagen y evita preparaciones
simultáneas. El botón con texto permanece visible, con contador y estado accesible de
preparación. La optimización valida firmas PNG/JPEG, intenta dimensiones/calidades
acotadas y conserva transparencia; los PNG opacos pueden convertirse a JPEG.

Se mantienen cursor, deshacer/rehacer nativos, borradores, plantillas, editor de firma privada,
permisos, aislamiento, rutas/DTOs, validación del servidor y MIME CID. Límites: tres
imágenes, 5 MiB originales, 20 millones de píxeles, borde máximo de 640px y 100 KiB
decodificados por imagen; HTML 500.000 caracteres. Los adjuntos conservan sus límites
independientes. No se modifican las restricciones PDF ni se implementa pegado de archivos.

Archivos: `MailRichEditor.tsx`, `mailFormat.ts`, comando y prueba nativa
`mail-inline-images-browser.mjs`, estándar frontend y contrato Correo/Mailing.
Backend, esquema, configuración del servidor y datos de producción: **N/A**.

## Verificación

- Prueba nativa: selección real mediante file chooser, bloqueo de guardado durante
  preparación, cursor, deshacer/rehacer, PNG detallado/transparencia, JPEG, MIME vacío
  y rechazo de contenido falso sin perder el mensaje,
  límite de tres imágenes, borrador y plantilla guardados, recarga/edición de plantilla,
  controles visibles a 320/390/1440px y modo oscuro. APIs/datos sintéticos y red externa
  bloqueada; ningún correo enviado.
- 37 regresiones enfocadas de Correo/editor/adjuntos/borradores/permisos: **PASS**.
- Flujos nativos existentes de adjuntos reutilizables y biblioteca compacta: **PASS**;
  conservan guardado incierto/reintento, importación, paginación, filtros y permisos.
- TypeScript y build frontend: **PASS**; permanece el aviso existente de chunks >600 kB.
- Catálogo de aprendizaje: `--check` **PASS**, sin cambios de huella, lecciones o versiones.
- `git diff --check`: **PASS**.

El arnés nativo corrigió su expectativa de seguir editando después de Guardar borrador:
el flujo vigente cierra el compositor guardado. También protegió su inicialización de
idioma frente a iframes sandbox sin acceso a localStorage. No se debilitó ese sandbox.

Evidencia visual sintética: `/tmp/indice-inline-image-review/`.
CI completo, despliegue y aceptación humana: **PENDIENTES**. Correo de proveedor real: **N/A**.
Este incremento no utiliza las excepciones de Stripe cerradas de liberaciones anteriores.
