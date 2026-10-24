# Publicación del corte local — 2026-10-24

Estado: **PASS**, producción activada y observación finalizada.

Candidato: `210ee8ced37bcde91a4e0b62aa7038c95fb7f0c1`.
Rama: `release/local-all-20261024`.
Destino autorizado: producción (`https://app.indiceapp.com`), conservando App Test.
CI: https://github.com/nahumsini/Indice_base_SAAS/actions/runs/40063157092

## Alcance

El corte integra todos los cambios de la carpeta principal, incluidos los de otras
conversaciones: biblioteca de archivos de empresa y V360, administración y retiro
de flujos de oportunidades y colores privados, navegación y cuotas, mejoras de
plantillas/PDF y carga de imágenes en correo. Las otras dos copias locales fueron
comparadas contra sus snapshots ya integrados; sus diferencias restantes eran
parches antiguos, incluidas migraciones WhatsApp renumeradas a V356–V359.

Se añadieron límites de 100 MiB exclusivamente a `/storage/` en ambos proxies;
API general conserva 25 MiB y MCP 14 MiB. Se actualizaron body-parser 2.4.0,
fast-uri 3.1.9, DOMPurify 3.4.17, Vite 6.4.5 y source-map-js 1.2.2. Las auditorías
npm completas de frontend y MCP no reportan vulnerabilidades pendientes.

## Comprobaciones

- Preflight canónico con configuración protegida de producción: PASS.
- Backend: 4,063 pruebas, 0 errores, 0 fallos y 3 pruebas MinIO condicionadas.
- Los cambios posteriores al preflight solo afectan dependencias/prueba frontend
  y documentación; Java, MCP y despliegue conservan exactamente los mismos bytes.
  El frontend final se recompiló y verificó; CI corresponde al candidato exacto.
- TypeScript y build; bloque frontend completo: 1,110 casos, 0 fallos y 0 omitidos.
- Navegador real: modal largo/móvil, carga/reintento/persistencia de adjuntos e
  imágenes insertadas desde archivo: PASS; fixtures sintéticos, sin enviar correo.
- MCP: 171 casos completos en fuente y 20 casos HTTP/OAuth en la imagen final: PASS.
- Nginx real aislado: 2 configuraciones; recuperación y límite de archivos: 18 casos PASS.
- Escaneo de imágenes y SBOM por identidad: cero secretos; solo los dos avisos
  Spring CVE-2026-47884/CVE-2026-47890 clasificados no aplicables por ausencia
  de XSLT/vistas implícitas/fragmentos SSE y 2 pruebas de exposición MVC.
  Esto no afirma que Spring esté parcheado ni exime nuevas vulnerabilidades.
- Gitleaks: 0 secretos en el delta; 20 coincidencias en código/fixtures comparadas
  byte a byte con la revisión explícita anterior, todas falsos positivos.
- Respaldo SQL, objetos y configuración protegida: copia fuera del servidor y
  huellas verificadas; restauración completa aislada con aplicación SELECT-only.
- Actualización V359→V360 y recuperación: datos originales y checksums históricos
  idénticos; el backend anterior conserva sus clases/recursos y añade únicamente
  el recurso V360 sin repair ni desactivar validación.
- Dry run de producción y guardas de precios, permisos, configuración y App Test: PASS.

El único cambio posterior a construir las imágenes fue actualizar las aserciones
heredadas de oportunidades a la estructura vigente del modal. Se verificó por Git
que todos los insumos de aplicación/build/despliegue son idénticos al build
`52391681067460e1eba4b67b44d733ea4bbbcec9`; las imágenes y sus pruebas de restauración
se conservaron por identidad. El candidato final incorpora esa corrección de pruebas.

## Correcciones del entorno de pruebas

La imagen MCP necesitó un fixture Java de scopes montado solo lectura; los mocks
CLI de recuperación usaron el directorio privado TMPDIR porque `/tmp` es noexec.
Ambas comprobaciones se repitieron completas y pasaron; las fallas iniciales se
conservan en evidencia operativa privada. Estas correcciones del entorno de pruebas no modificaron producción.

La recuperación conserva las imágenes web/MCP previas. Se verificó en la imagen
MCP retenida que ambos parsers ya usan `inflate:false`, mitigación documentada de
GHSA-27r3-jxmh-p828. DOMPurify anterior solo se usa como dependencia opcional de
jsPDF, con configuración por defecto; no se usan los modos/hook/XHTML requeridos
por sus tres avisos. Esta revisión de aplicabilidad no afirma que esas bibliotecas
anteriores estén parcheadas; la versión nueva sí incluye los parches.

## Operación y límites

Se retiraron copias de compilación, cachés públicas descargables y la imagen MySQL
nueva usada solo por el preflight, después de verificar que no tenía contenedores.
Se conservaron todos los respaldos, volúmenes y las imágenes de recuperación.
La guía permite un umbral puntual revisado: 8 GiB para este intento, con 8.29 GiB
libres antes de activación; el valor por defecto del repositorio sigue en 10 GiB.
Conviene ampliar capacidad del servidor antes de próximas publicaciones grandes.

Se conservan precios, referencias de suscripción, permisos, secretos y switches de
proveedores. Esta publicación no activa WhatsApp, cobros ni envíos reales.
Aceptación humana: UNKNOWN hasta revisión del propietario. No se afirma haber
probado el PDF original del usuario; la preparación se verificó con equivalentes
sintéticos y regresiones de almacenamiento.

La revocación histórica de Stripe TEST sigue HIGH y pendiente. Esta preparación
no reutiliza ninguna excepción cerrada. El propietario autorizó una excepción puntual
para este candidato y únicamente producción, registrada en la
[decisión acotada](../decisions/2026-10-24-production-local-stripe-deferral.md).

## Archivos y comportamiento

- Correo: `MailRichEditor`, `MailAttachmentService`, `MailFilePolicy`, `MailPdfPolicy`
  y `MailingFileService`; plantilla compacta, inserción de imágenes desde archivo y
  preparación/reintento de PDF con errores recuperables. La carga conserva el texto.
- Archivos de empresa: `react/src/app/SystemTools/Files`, `com/indice/erp/files`,
  cuotas compartidas y `V360__company_file_library.sql`.
- Oportunidades: administrador/retiro de flujos, colores privados y contrato propietario.
- Operación: proxies de almacenamiento, dependencias, navegación, catálogo de aprendizaje
  y documentación canónica. El corte completo se conserva en la rama publicada.
- Comportamiento preservado: contratos y límites de autorización, aislamiento entre
  empresas, precios/referencias comerciales, configuración protegida y banderas externas.

## Identidad de artefactos

| Componente | Imagen inmutable |
| --- | --- |
| Backend | `sha256:af414e60dcf6a78076d5b591761f90c5edf3337d2e2b8c32b3d9c0a0e8aa28f9` |
| Web | `sha256:507fb8cce7756451f41d1b9df6eec32dc14b3f7ab111d265335292eddba6070c` |
| MCP | `sha256:071fb61e5586584c636290fdc3b1918ca140559ee51d7edb6957b5e992a1af11` |
| Backend de recuperación compatible | `sha256:6708f355d503204a4ea8e7525d62aecc2d15348c3cd484ea6b97bcd925d48034` |

## Activación y cierre

Activación iniciada: **2026-10-24T05:16:01Z**. Arranque y smoke verificados:
**2026-10-24T05:17:26Z**. Observación de cinco minutos entre
**2026-10-24T05:17:26.339Z** y **2026-10-24T05:22:27.280Z**: seis muestras, web/API/MCP/almacenamiento
HTTP 200, cero errores nuevos de backend y cero reinicios. Verificación final:
**2026-10-24T05:22:34.587078Z**.

V360 aplicada correctamente, historial anterior intacto y recuperación compatible retenida.
Se conservaron precios, suscripciones, permisos, configuración y contenedores de App Test.
La consulta MCP autenticada posterior pasó y conservó el mismo alcance y moneda, sin
mutaciones ni datos comerciales en este informe. Espacio libre final: aproximadamente
8.31 GiB; el seguimiento de capacidad sigue recomendado.

La autorización operativa ahora tiene `authorized=false`, `canBeReused=false` y se
cerró en **2026-10-24T05:22:34.589611Z**. La excepción no se puede reutilizar. La revocación histórica
de Stripe TEST continúa **HIGH y pendiente**; aceptación humana **UNKNOWN** hasta revisión.
Los commits posteriores de este cierre solo contienen documentación; el artefacto ejecutado
continúa correspondiendo al candidato aprobado `210ee8ce` y al build inmutable descrito arriba.
