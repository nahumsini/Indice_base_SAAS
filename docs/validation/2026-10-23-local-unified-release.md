# Liberación unificada del trabajo local — 23 de octubre de 2026

Estado: preparación y verificaciones completas; activación pendiente.

## Código integrado

Candidato de aplicación: `76780da79ff63c0a1ea0c7ac7f99c49d4e26744d`.
Rama: `release/local-unified-20261023`. Base publicada:
`7c03687e9f264ac0292efcff596837c9eb3c0504`.
El [diff completo de 159 archivos](https://github.com/nahumsini/Indice_base_SAAS/compare/7c03687e9f264ac0292efcff596837c9eb3c0504...76780da79ff63c0a1ea0c7ac7f99c49d4e26744d)
identifica el cambio revisable.

Se capturaron las tres carpetas de trabajo sin alterar sus archivos ni índices originales:

- Principal: 35 rutas; snapshot `8b067521ec56fa7f4e0997a2046b1cfc458d7249`.
- Seguridad: 155 rutas; snapshot `4a2eb7f6b95c`, conservando las implementaciones más recientes de `main` al resolver duplicados.
- Conversaciones de WhatsApp: 179 rutas; snapshot `e582fbbdcf5a`, con adopción de migraciones todavía no publicadas como V356–V359.

Los tres snapshots son ancestros de la rama integrada. La comprobación final confirmó
que sus HEAD originales, archivos capturados y conjunto de cambios no habían cambiado.
La biblioteca compacta de plantillas de `eb679242e16b3b01ed1dfcb5bbc66f1a8ee6c742`
también está integrada. No se incorporan variantes antiguas de recuperación como código actual.

El cambio incluye la biblioteca de información/materiales de empresa y sus selecciones por
campaña, mejoras de Funneling/calendario, la biblioteca compacta de plantillas y la superficie
protegida de Conversaciones. Esta última conserva apagados sus controles de publicación y
proveedor: el adaptador real de onboarding de Meta sigue pendiente. La identidad global de
empresa conserva su propietario; los materiales de campañas no la reemplazan.

Durante la integración se completó la clasificación nativa de `/api/v1/sales/company-library`
como `crm.funneling`, las 89 guías bilingües de 16 módulos y las comprobaciones de sus nuevas
pestañas. Se corrigió una expectativa antigua de 12 guías comerciales frente a 14 y el peso
tipográfico del día actual del calendario para cumplir el estándar existente.

## Artefactos exactos

| Componente | Referencia | ID local inmutable |
| --- | --- | --- |
| Backend | `indice-erp-backend:76780da79ff6-secure` | `sha256:0095175165069d93ec0bee9eed60bc3d9a7c82394f381b09e7c08cee751f08eb` |
| Web | `indice-erp-web:76780da79ff6-secure` | `sha256:535eff58fd26c0dade5d402e2b4353575bd0a7b5e46c1d496abc996c15ee2dcb` |
| MCP | `indice-erp-mcp:ff974188ba44-secure` | `sha256:76e8227be453da3d216971026305c0043a9d6445d89ce7da154da1804d7b923f` |
| Backend compatible de recuperación | `indice-erp-backend:fb01d39fe233-v359-secure` | `sha256:6e64a64e35d6871c935c2c675d0716b109c3892b1c0e03b7b8114d6488d3928c` |
| Web de recuperación | `indice-erp-web:3eddc38be953-secure` | `sha256:fb68c04b6e61e5ef740dc93e7d5fa1e649c6a751be570c615a33b60a920f8857` |

SHA-256 del JAR de aplicación: `49d1be7b3867c6fbf61cfa6d521dbf228453d4e90f5766bc8d5e43d02c9cbc91`.
Se verificaron los bytes del JAR, todos los recursos Flyway y de aprendizaje y cada archivo
web extraído de las imágenes. La última corrección del calendario no modifica el código ni
las dependencias de MCP; su árbol es idéntico al de `ff974188ba44ab2f433de4118427aaf257424016`.
MinIO conserva su imagen y volumen anteriores. Los defaults de usuario, arranque, entorno y
montajes de los runtimes se conservan; las únicas diferencias de los archivos de entorno
preparados son las tres referencias de imágenes.

## Seguridad y compatibilidad

Los análisis actualizados detectaron problemas adicionales durante la preparación y se
resolvieron antes de activar servicios:

- Brotli del sistema: `brotli-libs=1.2.1-r0`, paquete oficial con verificación nativa de firma.
- Node de MCP: `22.23.4`, obtenido de la imagen oficial fijada a
  `sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914`.
- MCP: Zod `4.6.7` e `ip-address` `10.7.4`; `npm audit --omit=dev` reporta cero vulnerabilidades.

Las fuentes primarias incluyen el [aviso oficial de Node](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
y el [aviso revisado de Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
Se conservaron los patrones interoperables de confirmación, evitando formatos internos de
Zod que algunos clientes JSON Schema no reconocen. La comparación sintética de las 608
herramientas conserva nombres, descripciones, anotaciones y estructura de campos. Las
diferencias de patrones se limitan al escape equivalente de `/` y al patrón de correo de
la biblioteca actualizada, revisado con 1.098.056 casos de frontera equivalentes.

SCA, análisis de secretos y SBOM corresponden a los IDs exactos de aplicación y recuperación.
Los dos hallazgos de Spring MVC, [CVE-2026-47884](https://spring.io/security/cve-2026-47884/)
y [CVE-2026-47890](https://spring.io/security/cve-2026-47890/), conservan evaluación de
no aplicabilidad: no hay resolutores/vistas XSLT ni renderizado implícito mediante wildcard,
ni fragmentos de vista SSE; también pasa `MvcViewExposureRegressionTest`. Esto evalúa sus
condiciones de exposición y no afirma que la dependencia esté parcheada. No se aceptan
otros HIGH/CRITICAL sin resolver. Los 20 avisos del análisis del árbol son identificadores,
interpolaciones o fixtures sintéticos revisados; no son credenciales reales. El delta de
commits de la liberación no contiene secretos detectados.

La revocación de la clave histórica de Stripe TEST sigue HIGH y pendiente bajo la
[decisión puntual del propietario](../decisions/2026-10-23-local-unified-stripe-deferral.md).
No se reutiliza la autorización cerrada del hotfix anterior.

## Pruebas y recuperación

[CI completo del candidato](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/40027119178): **PASS**.
Incluye las pruebas del backend, TypeScript/build, regresiones frontend, contratos MCP,
auditoría de dependencias, recuperación del wrapper, Compose, imágenes y adjuntos contra
MinIO real. Las verificaciones locales y del host complementan esa ejecución:

- Migraciones únicas y arranque limpio aislado hasta V359; suite backend completa y pruebas enfocadas de permisos, marca, almacenamiento y correo.
- Los 33 comandos de regresión frontend del CI, typecheck/build y flujos nativos de plantillas, campañas, marca y conversaciones con datos sintéticos; tamaños móviles, escritorio y recuperación de borradores.
- 171 casos de MCP con dependencias parcheadas; también se verificó su runtime Node exacto. Los casos que leen fuente e imágenes de prueba se repitieron con copias públicas legibles montadas de solo lectura; no se alteraron los permisos privados de la fuente.
- Dos configuraciones Nginx probadas con contenedores reales: los tokens sintéticos de recuperación no aparecen en sus registros.
- Respaldos completos nuevos de SQL, objetos, entorno y archivos protegidos: App Test `20261023T210120Z` y producción `20261023T210123Z`; copias fuera del servidor verificadas por hash.
- Ambos respaldos restaurados en redes privadas sin salida ni puertos publicados. Se probó V353 → V359 y el backend compatible de recuperación, comparando valores crudos de todas las columnas/filas originales, precios, referencias de suscripciones e historial publicado.

La única exclusión de la comparación de filas son las nuevas claves de permisos de
Conversaciones: antes se exige que no existan y después que sean exactamente dos por
membresía/invitación, todas con `can_view=0`. No se normalizan timestamps ni datos de negocio.
La aplicación del ensayo tiene autoridad SELECT; Flyway utiliza una cuenta separada sólo
en la base restaurada. Los eventos de MySQL y workers externos se deshabilitan únicamente
en esas copias aisladas. Los objetos se extraen y comparan contra su archivo completo.

El primer ensayo confirmó que el JAR V353 original no valida V354–V359. La recuperación
compatible conserva exactamente todas sus clases, recursos, manifiesto y métodos de
compresión y agrega únicamente los seis SQL originales. El marcador vacío `BOOT.SF` se
conserva; no se elimina ninguna firma criptográfica. No se usa `repair`, bypass de validación
ni reversión de migraciones. Antes de la activación se prepara el runtime anterior con
parches de seguridad, y el wrapper retiene el backend compatible como recuperación de V359.

Para conservar la capacidad se archivaron fuera del host 25 imágenes antiguas sin referencias
de contenedores, verificando sus 210 blobs y linajes OCI antes de retirar sus tags. Después
se limpiaron cachés públicas y salidas generadas de esta liberación. No se eliminaron
volúmenes de datos, respaldos de negocio ni imágenes de contenedores activos o recuperables.
El piso de activación se mantiene en 10 GiB. Ambos dry-runs y las configuraciones reales pasan.

Los contextos autenticados de App Test y producción conservan identidad, empresa, membresía,
rol y asignación antes de activar. No se disparan envíos reales, cobros ni activación de
proveedores como parte de estas pruebas. La aceptación humana del producto sigue UNKNOWN.

## Activación y cierre

Pendiente de registrar tras App Test, producción, observación y verificación final.
