# Correo: plantilla, imágenes y datos pendientes — 2026-10-24

Estado: **corrección local verificada; sin publicación en producción**.

## Diagnóstico confirmado

El aviso de la captura «Completa las variables de la plantilla antes de revisar el
mensaje» corresponde a la protección de revisión de `MailComposer.persist(true)`.
No procede de la preparación ni de la carga de imágenes. Antes del cambio, una
reproducción nativa cargó una plantilla con imagen y variables, insertó otra imagen
y conservó ambas; Revisar envío se detuvo por los tokens pendientes. Faltaba una
forma directa de identificar y completar esos datos. Esa prueba falló al buscar
los campos de resolución que la UI todavía no ofrecía.

Esto reproduce el bloqueo de revisión de la captura con fixtures sintéticos. No
certifica el archivo original del propietario ni atribuye a variables cualquier
posible rechazo independiente de una imagen.

## Cambio

El compositor muestra los datos pendientes al insertar una plantilla o reabrir un
borrador incompleto. Aplicar datos actualiza asunto/texto/HTML del borrador en memoria,
conservando imágenes, formato permitido y la plantilla compartida. El texto introducido
se escapa, incluso cuando el token cruza nodos de negrita/color. La revisión conserva
su protección y enfoca el primer dato pendiente. Los campos incompletos no se borran.
Los valores corresponden a este mensaje y a todos sus destinatarios; se indica en la UI.

Se corrigió además el desplazamiento nativo del marco del compositor: el foco y el
cursor desplazan únicamente el cuerpo y conservan cabecera/pie en pantallas pequeñas.
Se usa el mismo patrón de `overflow:clip` ya aprobado para el editor de plantillas,
sin cambiar el motor compartido de modales.

Se conservan borradores/autoguardado, versiones y reintentos inciertos, destinatarios,
permisos, CSRF, límites de imágenes/contenido, sandbox de vista previa y envío confirmado.
Backend, esquema, infraestructura y modificaciones de datos reales: **N/A**.

## Archivos

- `MailComposer.tsx`: resolución y enfoque de datos pendientes; aviso consistente.
- `MailTemplateVariables.tsx`, `mailTemplateVariableModel.ts`, `mailTemplateVariablesCopy.ts`:
  controles, sustitución segura y traducciones para los ocho locales del runtime.
- `components/mail-editor/mailEditor.css`: cuerpo como dueño del scroll del compositor.
- `mail-inline-images-browser.mjs`: flujo nativo completo con plantilla importada.
- `email-daily-workflow.test.mjs`: carga de la dependencia real de variables en su arnés.
- Contrato propietario Correo/Mailing actualizado. El trabajo concurrente se conservó.

## Verificación

- Chromium real: selección de archivo, cursor, deshacer/rehacer, optimización PNG/JPEG,
  límites y recuperación de entrada inválida, guardado/recarga de borradores y plantillas.
- Plantilla importada con imagen y tokens, otra imagen insertada, revisión bloqueada,
  enfoque del primer dato pendiente, aplicación de valores con `&`/`<`, tokens partidos
  entre nodos, guardado y llegada a la confirmación de envío: **PASS**. No se pulsó Enviar.
- La plantilla compartida conserva sus tokens; ninguna imagen o destinatario se pierde.
- Teléfonos de 320/390 px: sin desbordamiento horizontal y cabecera/pie fijos después
  del foco/scroll nativo. También se cubren escritorio y modo oscuro del editor.
- 43 regresiones enfocadas de correo, adjuntos, borradores, autosave, permisos y audiencia: **PASS**.
- TypeScript y build frontend: **PASS**. Se conserva el aviso previo de chunks >600 kB.
- `git diff --check`: **PASS**.

Una primera iteración detectó una colisión de nombres `.ts`/`.tsx` en macOS; se
renombró el modelo y se repitieron TypeScript/build y navegador. El arnés corrigió
su expectativa del primer dato (asunto antes de cuerpo) y el nombre vigente del botón
Enviar correo. Ningún control de negocio se cambió para acomodar esas expectativas.

Evidencia sintética local: `/tmp/indice-inline-image-review/template-fields-{320,390}.png`.
CI de liberación, publicación y aceptación del propietario: **PENDIENTES**.
La excepción Stripe del despliegue anterior permanece cerrada y no se reutilizó.
