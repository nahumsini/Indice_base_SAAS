# Corrección de adjuntos de plantillas y Correo — 2026-10-23

Estado a las 20:35 UTC: **PUBLICADO Y VERIFICADO EN APP TEST Y PRODUCCIÓN**.
Ambos ejecutan el backend `fb01d39fe233`; Web y MCP conservan `3eddc38be953`.
El incremento visual posterior de la biblioteca de plantillas no forma parte de este despliegue.

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

Se revisaron las lecciones bilingües `correo.mail` v4 y `crm.mailing` v3: ya describen
el guardado y la revisión de adjuntos reutilizables, por lo que conservan texto y versión.
La corrección restaura ese flujo documentado y no requiere reaprenderlo ni reiniciar
progreso. Se regeneró únicamente la huella de fuentes del catálogo backend para que
su verificación reconozca el propietario corregido; el chequeo del generador pasa.

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

La primera ejecución del nuevo ensayo en CI se detuvo antes de ejecutar las pruebas
de archivos: el servicio MinIO sin privilegios no pudo escribir en el tmpfs. Se
reprodujo con UID 10001, entrada directa al binario y directorio de trabajo `/data`.
El arnés fija ahora el modo del volumen temporal y reproduce ese mismo usuario/arranque
localmente. Los dos tamaños volvieron a pasar, sin privilegios y sin omitir casos.
La ejecución CI fallida no se considera aprobada; se requiere otra ejecución completa.
Este ajuste del arnés no cambia los bytes de la aplicación previamente probada.

El arnés repetible es `scripts/test-mail-attachments-minio.sh`. Exige la base aislada,
rechaza nombres de contenedor ya ocupados, genera credenciales efímeras y limpia
únicamente el contenedor que creó. CI construye MinIO desde su fuente oficial fijada.

Evidencia privada local: `/private/tmp/indice-mail-upload-hotfix-20261023`, incluidos
`red-regression.log`, `focused-final.log`, `real-minio.log` y artefactos de compilación.
Fallas finales conocidas: ninguna en las comprobaciones descritas. Publicación y
observación automatizadas: **PASS**. Aceptación humana con el archivo del usuario:
**PENDIENTE**; no se afirma haber enviado ni publicado contenido de clientes.

## Preparación para publicación

Candidato: `fb01d39fe23381ada960de92863d875f3f14c806`.
[CI completo correcto](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/40015201961),
incluido el ensayo de dos tamaños contra MinIO oficial sin privilegios, el arranque
del backend, frontend, MCP, recuperación y tráfico Nginx real aislado. La ejecución
anterior `40011630127` falló en el arranque del arnés y quedó corregida; no se omitió
el chequeo para publicar. La compilación adicional de esa dependencia en Docker local
se detuvo por capacidad del motor de pruebas. Se retiró caché regenerable y se
confirmaron los contenedores funcionales activos, sin errores de disco nuevos.

La aplicación es idéntica a `54f4c581` en `src/main`, `react`, dependencias, despliegue
e integraciones. El último commit solo corrige el arnés y documenta el ensayo.
Se conserva el mismo JAR probado y la misma imagen, retagada para el candidato:

- Imagen: `indice-erp-backend:fb01d39fe233`.
- ID: `sha256:5c98b8dd16627b6e51b707ac17ee37706d18ec004189c0b1c86598ecd51264ff`.
- JAR SHA-256: `2c3a71ce75154b7f6765088a12c9841899d6e12b1878c5b8a79b72ae3f58cdef`.

El runtime base, sus capas y valores predeterminados son los de `3eddc38be953`,
con la sustitución del JAR verificada por bytes. Web y MCP conservan sus imágenes
`3eddc38be953`. No hay migraciones: ambos entornos permanecen en V353.

Respaldos completos nuevos: `apptest-20261023T193059Z` y
`production-20261023T193606Z`. SQL, objetos, configuración y archivos protegidos
pasaron manifiestos SHA-256, compresión y verificación fuera del servidor. La copia
externa de objetos utilizó una copia independiente del archivo anterior como base
de transferencia; los respaldos anteriores no se modificaron.

Ambos respaldos se restauraron por separado, sin red externa ni puertos publicados.
El candidato y el backend seguro anterior de recuperación arrancaron con MinIO y
MCP privados. La aplicación tuvo permisos SQL de solo lectura y se compararon todas
las columnas originales, sin normalizaciones ni excepciones de timestamps: hashes,
facturación, historial y esquema V353 quedaron iguales. Las copias desechables se
eliminaron al terminar, preservando los respaldos completos. La recuperación
compatible es `3eddc38be953`; nunca se reactiva el backend vulnerable `8c451b5612d0`.

Las simulaciones canónicas de ambos destinos pasan. Se preservaron los puertos y
montajes Nginx separados, configuración protegida, acceso y catálogo/precios actuales.
Los conectores autenticados de solo lectura tienen una referencia previa para
comprobar continuidad después de activar.

Escaneos de commits e imagen: cero secretos. El escáner conserva únicamente los dos
hallazgos Spring ya registrados: `CVE-2026-47884` y `CVE-2026-47890`. Se revisaron otra
vez los avisos primarios, la ausencia de sus condiciones en el propietario actual
y las dos regresiones MVC. El proveedor exige respectivamente uso de vistas XSLT
con resolución implícita o fragmentos de vistas vía SSE; no se encontraron esas
condiciones. No se afirma actualización de biblioteca ni una excepción general.
[Aviso XSLT](https://spring.io/security/cve-2026-47884/),
[aviso SSE](https://spring.io/security/cve-2026-47890/).

Se conservaron todos los volúmenes, fuentes, respaldos operacionales e imágenes de
aplicación/recuperación. Solo se retiraron cachés y herramientas de compilación o
escaneo sin contenedores que las referenciaran, y copias generadas retenidas fuera
del servidor tras verificar 8,797 archivos. El mínimo canónico de despliegue sigue
en 10 GiB, sin reducirlo; las simulaciones pasan con aproximadamente 10.37 GiB libres.
La reserva adicional del arnés de backup se ajustó de 256 a 128 MiB tras medir
archivo y capacidad, manteniendo los 10 GiB y verificando el resultado real.

La revocación histórica de Stripe TEST sigue pendiente y la
[excepción del despliegue anterior](../decisions/2026-10-23-integrated-release-stripe-deferral.md)
está cerrada y no se puede reutilizar. Al terminar la preparación todavía faltaba
la decisión vigente. Después el propietario respondió **"Autorizar excepción puntual"**
para este candidato, bajo la
[decisión específica del hotfix](../decisions/2026-10-23-mail-attachment-hotfix-stripe-deferral.md).
No se enviaron correos reales ni se activaron proveedores, precios o permisos nuevos.

## Activación y cierre

| Destino | Inicio UTC | Verificación de runtime UTC | Fin de observación UTC | Resultado |
| --- | --- | --- | --- | --- |
| App Test | 20:20:59 | 20:22:24 | 20:27:25 | PASS |
| Producción | 20:27:59 | 20:29:24 | 20:34:25 | PASS |

Se utilizó `deployment/scripts/up-host-network.sh` con las imágenes y los archivos
de entorno preparados. Producción comenzó después de App Test, sus seis muestras
durante cinco minutos, navegador nativo y continuidad de ambos conectores autenticados.
Los dos destinos pasaron smoke público, API, MinIO, CSRF/login inválido, MCP público y
fronteras anónimas 401. El navegador abrió el login sin envío y sin errores JS/activos.

La verificación final de las **20:35:00 UTC** confirmó en ambos destinos los bytes
del JAR, imágenes exactas, cero reinicios/errores backend, configuración y montajes
sin cambios, archivos protegidos iguales, linaje V353 intacto y recuperación segura
anterior detenida disponible. Las comprobaciones de cada activación también
confirmaron catálogo/suscripciones y permisos sin cambios y aislamiento del otro entorno.
No se cambiaron o eliminaron registros de archivos pendientes del usuario.

La autorización operacional se deshabilitó a las **20:35:00 UTC** al completar el
intento ordenado. La revocación histórica de Stripe TEST continúa **HIGH / sin resolver**;
esta ventana está cerrada. Evidencia operacional privada: `final-runtime-verification.json`,
`*-canary.json`, `*-browser-smoke.json`, `*-connectors-verified.json`, logs de activación
y `release-authorization.json` deshabilitado en la carpeta protegida de esta liberación.
