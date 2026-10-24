# Adjuntar el mismo PDF sin exportarlo manualmente — 2026-10-23

Estado: **IMPLEMENTADO, VALIDADO Y ACTIVO EN LOCAL; SIN DESPLIEGUE**.

## Decisión y alcance

El propietario confirmó que se trata del mismo PDF de 462579 bytes y pidió dejarlo
funcional. Su diagnóstico previo verificó una página sin contraseña, formulario ni
acción de apertura: sólo `EmbeddedFiles` y `EF` causaban el rechazo. Esta decisión
sustituye la solución anterior que sólo informaba la causa y pedía exportar una copia.

Email prepara automáticamente una copia al registrar adjuntos privados y de plantillas.
Se eliminan archivos incrustados, asociaciones y anotaciones de adjuntos; se conservan
las páginas/texto y se vuelve a validar estrictamente. No se rasteriza ni modifica el
archivo del equipo. JavaScript, acciones, formularios y contraseña continúan bloqueados.
El mensaje de ayuda lo explica en los seis idiomas y muestra el tamaño recibido del
servidor. Guardado/reintento, modal compacto e imágenes conservan sus correcciones.

## Integridad y almacenamiento

Se comprueban primero longitud/MIME del objeto copiado, inaccesible mediante el enlace
de carga. Después de preparar se escribe esa copia y se vuelve a leer para comparar
todos sus bytes. La transacción cambia la reserva original por una reserva/commit del
tamaño final y actualiza metadatos; el candidato se elimina al hacer rollback.
Archivos ordinarios permanecen idénticos; READY es idempotente. Descarga, importación y
envío usan el validador estricto, sin permitir archivos incrustados en el resultado.
Continúan cinco archivos/10 MiB, 200 páginas, 20000 objetos y salida limitada a 10 MiB.

Cambios de esta extensión: MailPdfPolicy/MailFilePolicy, registro de MailingFileService,
MailAttachmentService/Repository, mensajes/ayuda, regresiones PDF/owner/navegador y
contratos. Esquema/migración, correos externos y producción: **N/A**. Otros cambios
concurrentes del árbol, incluida la biblioteca de archivos de empresa, se preservan.

## Verificación y límites

Se usa un PDF sintético con texto, gráficos y un archivo de diseño incrustado de
450000 bytes. La comparación comprueba texto y píxeles antes/después; el original no
se altera. La copia original del diagnóstico ya no pudo recuperarse: el staging remoto
devolvió 404. Esa lectura no modificó objetos/base/configuración de producción. La
aceptación del documento exacto queda a la selección del archivo por el propietario.

Las pruebas con base usan exclusivamente `indice_test_db` en MySQL desechable 13331;
MinIO desechable en 19301, ambos tmpfs y separados de los otros entornos locales.

Resultados:

- **PASS:** 39 pruebas Java focalizadas de PDF, Office, transporte sintético y errores
  MVC; sin fallos ni omisiones. Se detectó y corrigió una anotación de adjunto que
  permanecía por modificar una lista sin actualizar el array PDF; la regresión cubre
  su eliminación, además del texto/píxeles y el original intacto.
- **PASS:** 29 pruebas de MailboxIntegrationTest y dos de unicidad de migraciones en
  la base aislada. Incluyen tres casos con MinIO real: pequeño, 10 MiB y preparación
  del PDF con incrustaciones. Comprueban carga firmada, lectura/escritura final,
  registro idempotente, tamaño persistido, cuota real sin doble conteo, reutilización,
  sobrescritura de staging que no altera el PDF final y adjuntos privados.
- **PASS:** navegador nativo con selección del PDF original, tamaño preparado de la
  respuesta, rechazo de scripts, reintento temporal, texto preservado, móvil estable,
  guardado y reapertura; flujo nativo existente de reutilización de plantillas.
- **PASS:** 37 regresiones enfocadas frontend, TypeScript y build (2m 28s).
- **PASS:** comprobación del catálogo generado (89 lecciones/16 módulos) y diff sin
  errores. No se cambian versiones/progreso del catálogo.
- Entorno: el primer MySQL desechable interrumpió la conexión durante el arranque
  de Flyway; los 29 casos de contexto no llegaron a ejecutarse. Se repitió con buffer,
  caché, redo y memoria ajustados; pasaron los 31 casos sin omisiones. Los contenedores
  de ambas ejecuciones fueron retirados. No se utilizó la base funcional.
- Advertencias existentes: deprecaciones Java, descubrimiento de commons-logging y
  chunks web mayores de 600kB; no impidieron las validaciones finales.

## Activación local y rollback

Durante el trabajo otro flujo actualizó el backend de 8083 con la biblioteca de
archivos de empresa. Se capturó su configuración real de proceso en un archivo
privado 0600 y se tomó ese runtime como base, preservando el trabajo concurrente.
Se guardó una copia íntegra del JAR anterior y se generó otro JAR privado que sólo
cambia las clases afectadas de adjuntos e incorpora la preparación PDF y su callback.
Se verificó que clases ajenas, recursos y migraciones permanecen idénticos.

Se reinició únicamente el backend local, manteniendo la configuración existente y
desactivando el bootstrap demo. El JAR anterior y sus argumentos quedan disponibles
para rollback. El backend está sano en 8083, accesible desde Vite 5175. Una prueba
offline con **ese JAR exacto y sus dependencias** prepara y valida el PDF sintético
sin modificar el original. Health/frontend HTTP 200; sin errores de arranque.

Evidencia privada: `/private/tmp/indice-template-production-diagnosis-20261023/`,
incluidos los logs `pdf-preparation-integration-final.log`, `pdf-exact-runtime-smoke.log`
y los comprobantes de las únicas clases cambiadas. La aceptación del PDF exacto del
propietario sigue pendiente de volver a seleccionarlo en la aplicación local. App Test,
producción, main y publicación de la rama quedan fuera de esta activación.
