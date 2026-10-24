# Recuperación de adjuntos de plantillas — 2026-10-23

Estado: **LOCAL; SIN DESPLIEGUE**. Continúa el ajuste del modal y de imágenes en la
rama de trabajo. La nueva captura procede de producción; ese entorno conserva su
versión anterior. No se atribuye esta nueva incidencia a un archivo específico sin
recibir su confirmación.

Actualización posterior: el propietario confirmó el mismo PDF y pidió adjuntarlo sin
exportación manual. La política de intake queda sustituida por la
[preparación automática](2026-10-23-automatic-mail-pdf-preparation.md); el diagnóstico
del consejo y sus correcciones siguen vigentes.

## Causa comprobada y corrección

El consejo `MailingDeliveryExceptionHandler` cubría los controladores de envío y baja,
pero omitía `MailingController`, propietario de las cargas/registro de plantillas.
Una regresión MVC real reprodujo la ausencia de `code`: doce casos fallaban antes de
agregar el controlador al consejo existente. El navegador recibía un rechazo sin el
código que sus mensajes localizados necesitan y lo mostraba como error desconocido.

Se conserva el estado HTTP y la redacción de motivos internos; el consejo sólo expone
los códigos de dominio existentes. Se distinguen preparación, transferencia y
verificación en la UI. El rechazo de contenido explica cómo guardar una copia mediante
Imprimir → Guardar como PDF y elegirla; no ofrece reintentar indefinidamente el mismo
contenido no admitido. Los fallos transitorios permiten reintentar registro sin repetir
una transferencia completada. El texto y los adjuntos válidos permanecen.

## Cambios y límites

- Backend: alcance del consejo de excepciones; regresión MVC sin base de datos.
- Frontend: estados de carga en MailingFiles; orientación PDF en los seis idiomas;
  flujo nativo de rechazo, recuperación y guardado; comando de prueba.
- Documentación: contrato Email/Mailing, estándar frontend y este registro.
- Preservado: validación PDF/Office/imágenes, permisos/empresa/CSRF, cuotas, cinco
  adjuntos y 10 MiB, objetos verificados inmutables y semántica de guardado.
- Esquema/migración, proveedores, correos reales, App Test/producción: **N/A**.

Un PDF que incluye otros archivos o acciones sigue siendo rechazado por el contrato
vigente. Corregir el mensaje no convierte ese documento ni elimina sus incrustaciones.
La comprobación de un archivo nuevo del usuario queda pendiente de identificarlo.

## Verificación

- **PASS:** 35 pruebas Java sin fallos/omisiones: doce casos MVC del controlador real,
  más las regresiones de PDF, Office, HTML, imágenes y transporte sintético local.
  Validación PDF real: un documento con EmbeddedFiles devuelve `email_pdf_active`;
  el PDF ordinario se admite. Sin base de datos ni proveedor externo.
- **PASS:** navegador nativo: rechazo explícito, texto preservado, selector habilitado
  para una copia, etapa de verificación y bloqueo de guardado durante la carga;
  503 recuperable con el mismo registro y sin segundo PUT; copia sintética de 463000
  bytes guardada y reabierta. Servidor/storage simulados en esta prueba de UI.
- **PASS:** las regresiones nativas de persistencia/reutilización de plantillas y de
  layout; sin hueco inferior durante el error a 390px. Captura móvil revisada.
- **PASS:** 37 regresiones enfocadas de Correo/Mailing; TypeScript; build (22,76s);
  compilación/empaquetado Java; catálogo generado y `git diff --check`.
- Advertencias: bundles de frontend mayores de 600kB y deprecaciones Java existentes;
  ninguna impidió compilar o ejecutar las pruebas.

Evidencia sintética en `/tmp/indice-template-file-errors-review/`; logs privados en
`/private/tmp/indice-template-production-diagnosis-20261023/`.

## Activación local

El frontend 5175 ya sirve este árbol. El backend 8083 ejecutaba el JAR de otra copia
local; se conservó ese JAR y su configuración/base funcional. Para no aplicar un
linaje de migraciones distinto, se preparó una copia privada con **una sola entrada
modificada**, la clase compilada de `MailingDeliveryExceptionHandler`. Se comprobó
que todas las demás entradas, incluidas las migraciones, son idénticas. No se cambió
el JAR original ni se ejecutó el script histórico que reemplaza archivos fuente.

Se reinició únicamente 8083 con esa copia y el bootstrap demo desactivado. Health OK;
la petición sin sesión vía 5175 ahora devuelve 401 con el código seguro esperado,
sin ejecutar una mutación de negocio. Frontend 200. El comando anterior y su JAR
quedan disponibles para volver al runtime previo; las variables quedan en evidencia
privada con permisos 0600, fuera del repositorio.

Esta activación aplica sólo la corrección de errores a ese runtime existente; no
representa un despliegue completo del backend de la rama. App Test y producción
permanecen sin cambios. El paquete completo de la rama compiló correctamente para
su posterior preparación de liberación.
