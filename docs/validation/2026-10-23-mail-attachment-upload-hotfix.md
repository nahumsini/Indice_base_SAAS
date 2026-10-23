# Corrección de adjuntos de plantillas y Correo — 2026-10-23

Estado inicial: corrección verificada localmente; publicación pendiente del CI y
de las puertas de liberación. Este informe no acredita activación en producción.

## Incidente y causa

En producción, el archivo alcanzaba MinIO pero el registro de la plantilla devolvía
un error interno. Los registros identificaron `IllegalArgumentException: Invalid file
size limit` en `MailingFileService.register`, incluidos los intentos del 23 de octubre
a las 18:58 y 19:15 UTC. No se registran aquí nombres, correos, contenido, claves ni URLs firmadas.

Los propietarios de Correo y Mailing pedían `MailFilePolicy.MAX + 1` a `readObject`,
pero el adaptador admite presupuestos de hasta `MAX` (10 MiB) y realiza internamente
la lectura adicional para detectar excesos. Esto rechazaba la operación antes de leer
cualquier archivo, incluso uno pequeño. Se encontró el mismo error en seis lecturas
de registro, descarga, importación y transporte. Las simulaciones anteriores no
restringían el presupuesto de lectura y por eso no reproducían el fallo del proveedor.

## Corrección y comportamiento conservado

- Las seis llamadas pasan el límite de contenido aceptado, sin agregar un byte.
- El contrato de almacenamiento documenta que el proveedor detecta excesos y no trunca.
- Los dobles de contrato verifican el rango aceptado por el proveedor real.
- Las regresiones del adaptador cubren el límite exacto, el rechazo de un presupuesto
  inválido antes de contactar almacenamiento y el rechazo de contenido excesivo.
- El CI ejecuta un ensayo adicional contra MinIO desechable real, con archivos pequeños
  y de exactamente 10 MiB. Comprueba PUT firmado, registro repetido, persistencia de
  plantilla, descarga, importación a Correo, adjunto privado y transporte simulado.

Permanecen las rutas y DTOs, permisos y aislamiento de empresa/cuenta, CSRF, cuota,
sellado inmutable, políticas de contenido, cinco archivos y 10 MiB totales. No hay
cambios de interfaz, dependencias ni esquema. Los trabajos ajenos a este hotfix en la
carpeta principal permanecen intactos; el candidato parte de `99ff0f5b` en una copia aislada.

## Evidencia local

La regresión reprodujo dos fallas antes de corregir la aplicación: registro de adjunto
y ciclo de archivos de plantilla. Después de corregirla pasaron 123 casos enfocados
de Correo/Mailing/almacenamiento, numeración de migraciones y exposición MVC.
La suite enfocada contiene además un caso condicional omitido sin MinIO; el ensayo
dedicado lo ejecutó obligatoriamente con sus dos tamaños: **2 PASS, cero omitidos**.
No se usó esa omisión como evidencia de éxito del proveedor real.

Base de pruebas: exclusivamente `indice_test_db` en MySQL 8.4 desechable, tmpfs y puerto
privado 13321, verificado antes de Maven. MinIO del ensayo usó tmpfs y puerto privado
19300 y se eliminó al terminar. SMTP permaneció simulado: ningún correo real se envió.
No se usaron ni modificaron datos funcionales durante estas pruebas.

El arnés repetible es `scripts/test-mail-attachments-minio.sh`. Exige la base aislada,
rechaza nombres de contenedor ya ocupados, genera credenciales efímeras y limpia
únicamente el contenedor que creó. CI construye MinIO desde su fuente oficial fijada.

Evidencia privada local: `/private/tmp/indice-mail-upload-hotfix-20261023`, incluidos
`red-regression.log`, `focused-final.log`, `real-minio.log` y artefactos de compilación.
Fallas finales conocidas: ninguna en las comprobaciones descritas. Publicación,
backups actuales, observación y aceptación humana posterior: **PENDIENTES**.
