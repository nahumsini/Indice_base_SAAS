# Biblioteca de plantillas compacta — 2026-10-23

Estado: **IMPLEMENTADA Y VERIFICADA EN LOCAL**. No se publicó este diseño en los
entornos públicos. La autorización del hotfix de adjuntos identifica exclusivamente
el backend `fb01d39f`; no se reutiliza para publicar este incremento visual.

## Alcance y clasificación

La biblioteca compartida de Correo y Mailing conserva su tipo **Operational Workspace
Modal**: permite seleccionar y revisar contenido en paralelo. Utiliza el mismo
`SalesModalFrame`/`IndiceModalFrame`, con ancho máximo `6xl` y altura según contenido.
Crear/editar sigue siendo **Standard Form**; archivar/descartar reemplaza el contenido
con **Confirmation**, sin superponer modales.

La tabla compacta agrupa nombre, asunto, estado singular y fecha/hora de actualización.
La selección ocupa toda la fila, tiene estado accesible y no requiere desplazamiento
horizontal. El selector Ordenar por mantiene los tres campos y ambos sentidos del
ordenamiento de servidor. Se conserva la implementación completa de tabla y sus
preferencias de ancho para sus consumidores; la biblioteca usa su variante compacta
con las primitivas y el shell compartidos. Una sola paginación del motor compartido
queda bajo los dos paneles, con 10/25/50/100/200 registros.

La vista previa elimina tarjetas anidadas y el texto de previsualización repetido
cuando coincide con el asunto. Mantiene el mensaje seguro y los adjuntos descargables.
Editar y Archivar/Restaurar permanecen junto a la vista previa; Nueva plantilla queda
como acción principal del pie. Cerrar sustituye a Cancelar en el listado de consulta.
Correo conserva azul y Mailing coral; los nuevos textos cubren seis idiomas.

En móvil se muestra listado o vista previa dentro del mismo marco. Atrás conserva
búsqueda, estado, orden y página. La regresión detectó que los refrescos de la tabla
pueden desmontar el botón original; ahora el retorno recupera la fila actual por su
identificador si aquel nodo ya no existe. Los objetivos interactivos conservan 44px.

## Comportamiento conservado

Rutas, APIs, DTOs, permisos de lectura/gestión, paginación y orden de servidor,
validadores, bloqueo de operaciones, confirmaciones, identidad de reintento/guardado,
archivos verificados y límite de cinco adjuntos/10 MiB. No se modificaron transporte,
datos de negocio ni migraciones. Las guías bilingües `correo.mail` v4 y `crm.mailing`
v3 siguen describiendo el flujo vigente; solo se regeneró su huella de fuentes,
sin alterar versiones, contenido o progreso del aprendizaje.

Cambios: `TemplateManager.tsx`, `TemplateTable.tsx`, `TemplateForm.tsx`, presentación
opcional de `MailingFiles.tsx`, `templateWorkspaceCopy.ts`, fixture y prueba nativa,
comando de prueba, documentos canónicos/dominio y huella del catálogo generado.
Los trabajos de Funneling/Brand de la carpeta principal permanecen intactos.

## Verificación

- TypeScript y `npm run build`: **PASS**. Se mantiene el aviso existente de chunks
  superiores a 600 kB; no es un error de compilación.
- Seis suites enfocadas de Correo/Mailing/adjuntos/modal móvil: **28 PASS**, sin fallas
  ni casos omitidos.
- `npm run test:mail-templates-browser`: **PASS**. Crear, cargar adjunto, respuesta de
  guardado perdida y reintento con la misma identidad, recargar/editar, importación
  a Correo y snapshot de campaña. SMTP real y lanzamientos: **N/A**, no se ejecutan.
- `npm run test:template-workspace-browser`: **PASS**. Paginación de servidor, seis
  órdenes, búsqueda/estado, confirmación de archivo y restauración, enlace de archivo,
  acceso de consulta, falla de carga/reintento, regreso con foco después de refrescar,
  escritorio, móvil, 320×568 y paisaje 780×440. Datos y API exclusivamente sintéticos.
- Capturas revisadas: escritorio azul y oscuro, listado móvil y vista previa móvil.
  El caso de una plantilla mide 1152×712 a 1440×1000, sin overflow de tabla o documento.
- Generador del catálogo y `git diff --check`: **PASS**.

Evidencia privada: `/private/tmp/indice-mail-upload-hotfix-20261023/modal-*` y
`/tmp/indice-template-workspace-review/`. Fallas finales: ninguna. La prueba nueva
se ajustó para cancelar desde el pie y buscar el registro de lectura que está fuera
de la primera página; la falla real de retorno de foco quedó corregida y cubierta.
CI completo de este incremento visual y aceptación humana integrada: **PENDIENTES**;
el CI aprobado del hotfix no se presenta como evidencia de este diseño nuevo.
