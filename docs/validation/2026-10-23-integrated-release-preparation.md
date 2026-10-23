# Liberación integrada — preparación del 23 de octubre de 2026

Actualización final: ambos entornos se desplegaron y verificaron correctamente.
La [activación y observación](2026-10-23-integrated-release-activation.md) terminaron
el 23 de octubre; la autorización puntual quedó cerrada a las 18:20:43 UTC.
Lo siguiente conserva el estado histórico de la preparación anterior a ese despliegue.

Estado a las 17:44 UTC: **PREPARACIÓN TÉCNICA COMPLETA / PENDIENTE DECISIÓN VIGENTE SOBRE STRIPE TEST**.
No se activó la versión en App Test ni en producción. Ambos entornos conservan las imágenes
`8c451b5612d0`, el esquema V346, sus contenedores y su configuración original.

Actualización a las 17:47 UTC: el propietario autorizó la excepción puntual mediante la
[decisión vigente](../decisions/2026-10-23-integrated-release-stripe-deferral.md).
La condición de autorización quedó resuelta exclusivamente para este intento; la revocación
sigue pendiente. La activación aún debe ejecutarse y verificarse por separado.

## Candidato y alcance

Aplicación: `3eddc38be95337075bbbeb92d2b3fe3772d098d2`, publicada en `main` y
`codex/continuacion-20261023`. Los commits posteriores que solo documenten la liberación no
cambian este artefacto. La integración sigue la elección del propietario: subir la carpeta
principal completa. La copia separada de WhatsApp compartido permanece excluida; sus migraciones
V348–V351 no se combinaron con este linaje.

La base del trabajo local se conservó en `4b791c15`, con 221 archivos nuevos o modificados.
Esta preparación agregó tres correcciones cohesivas:

- `079c1a9a`: MCP utiliza el identificador que devuelve Finanzas al sellar un comprobante, en vez
  de buscarlo por la clave temporal. La regresión cubre gastos, obligaciones y comprobantes de
  fondos, lectura privada, reintentos y sobrescritura posterior de la carga temporal.
- `1e77c625`: el ensayo sintético de recuperación simula el espacio del disco y comprueba además
  que la falta de espacio bloquee el despliegue. El límite real de producción sigue en 10 GiB.
- `3eddc38b`: revisión bilingüe y regeneración de las guías de Lupita para los flujos nuevos.
  Las versiones de los capítulos afectados cambian sin borrar el progreso histórico.

El candidato integra protección de identidad y roles de RH; comprobantes sellados, cuota de fotos
de asistencia y redacción de tokens en los proxies; plantillas de correo con archivos reutilizables;
agendas públicas múltiples con identidad visual; solicitudes y servicios de Agenda; herramientas
de Pizarra, Diagnóstico empresarial y proyectos; delegación de acuerdos a tareas y cumplimiento
de plazos, con sus herramientas MCP. Funneling conserva únicamente la prueba visual aislada de
Fase 0: no publica las fases posteriores ni herramientas visuales experimentales en producción.

## Verificación

- [CI del candidato exacto](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/39990639808):
  correcto, incluidos imágenes, arranque real y controles de tráfico Nginx en contenedores aislados.
- Backend: 3,923 pruebas, cero fallas/errores y una omisión histórica. Compilación incluida.
- Frontend: 1,087 pruebas en los 32 comandos de CI, cero fallas; TypeScript y build correctos.
- MCP: 170 pruebas y compilación correctas.
- Recuperación de despliegue: 17 pruebas correctas.
- Tokens de recuperación: dos pruebas correctas sobre tráfico y registros reales de ambas
  configuraciones Nginx, con identidades y tokens exclusivamente sintéticos.
- Preflight completo con cada entorno protegido real: correcto. Las pruebas de base de datos se
  ejecutaron exclusivamente en MySQL 8.4 desechable, `indice_test_db`, en el puerto privado 9352.
- Las tres imágenes inmutables están construidas. Se verificó la igualdad de bytes del JAR y de
  todos los archivos compilados web/MCP respecto de los artefactos probados.
- Cuatro dry runs canónicos correctos: preparación de web compatible y activación completa para
  cada entorno. No se modificaron contenedores durante esos dry runs.
- Escaneo de commits nuevos: cero hallazgos. El escaneo completo conserva 20 coincidencias
  idénticas a falsos positivos previamente revisados, comprobadas contra sus fuentes anteriores.
  Esto no resuelve la credencial histórica de Stripe.
- Escaneo de las cuatro imágenes y SBOM: cero secretos. Web, MCP y web de recuperación no tienen
  hallazgos HIGH/CRITICAL. Backend conserva los dos hallazgos de biblioteca Spring indicados abajo.

Las pruebas iniciales detectaron fixtures desactualizados de fotos/almacenamiento y un fallo real
en el registro MCP de evidencia sellada; quedaron corregidos. El gate del catálogo de aprendizaje
exigió revisar sus lecciones, no solo regenerar un digest. Una base local desechable agotó su
presupuesto de memoria; la suite se repitió con límites ajustados y terminó correctamente.
El contexto del empaquetado MCP y los permisos de lectura de los archivos usados por el ensayo
Nginx también se corrigieron antes de la verificación final. No fueron cambios a datos funcionales.

## Datos, respaldos y recuperación

Ambos entornos tienen respaldos independientes de SQL, archivos y configuración, manifiestos
SHA-256 y verificación de archivos comprimidos. Las copias fuera del servidor también pasaron
la comprobación de hashes. Los respaldos iniciales son `apptest-20261023T163315Z` y
`production-20261023T163319Z`; se refrescan antes de una eventual activación.

Las dos restauraciones desconectadas migraron V346 → V353 y arrancaron el candidato y el backend
compatible de recuperación. Se conservaron datos de negocio, identidades globales, permisos,
catálogo/precios de facturación y checksums históricos. La aplicación de los ensayos tuvo permisos
SQL de solo lectura; únicamente Flyway tuvo autoridad para migrar las copias.

V349 copia cuatro campos de contacto al empleo. Su columna existente `updated_at`, con
`ON UPDATE`, refleja esa modificación: se verificaron 29 perfiles en App Test y 454 en producción,
con fecha dentro de la ventana de migración y sin cambios posteriores al arrancar recuperación.
Los timestamps originales permanecen en los respaldos y en las capturas privadas del ensayo.
La vista derivada de RH presentó tres diferencias exclusivamente de espacios en nombres en la
copia de producción. Se compararon sus contenidos normalizando solo ese formato; los nombres
globales almacenados y los restantes campos de negocio se compararon sin esa normalización.
No se editó ninguna migración aplicada ni se reparó o revirtió el historial Flyway.

Recuperación web: fuente `579d22fb`, basada en la interfaz anterior con cinco líneas que agregan
el tamaño de las fotos; TypeScript y build correctos. Utiliza la configuración Nginx con redacción
actual. El backend de recuperación conserva los controles de seguridad del candidato y el MCP
anterior conserva compatibilidad. Esto permite recuperar fallas de presentación o integración;
un defecto compartido por el backend nuevo requiere una corrección hacia adelante. Nunca se
reactiva el backend anterior vulnerable sobre el esquema actualizado.

Se liberaron únicamente cachés regenerables y copias de compilaciones antiguas previamente
conservadas y verificadas fuera del servidor. Se conservaron fuentes, imágenes de recuperación,
respaldos operacionales y volúmenes. El servidor tiene aproximadamente 12 GiB libres y pasó el
límite canónico de 10 GiB sin reducirlo.

## Hallazgos y activación pendiente

La revocación de la clave histórica Stripe TEST sigue pendiente, confirmado por el propietario
en esta sesión. La [excepción anterior](../decisions/2026-10-22-integrated-release-stripe-deferral.md)
se cerró con su liberación y declara: “This decision does not authorize another release or waive
any other release gate.” La decisión del 23 de octubre indicada arriba reemplaza únicamente
ese bloqueo para este candidato y este intento, conforme a la
[puerta canónica de liberación](../indice-public-release-security-gate.md).

Los hallazgos Spring `CVE-2026-47884` y `CVE-2026-47890` permanecen registrados, sin afirmar una
actualización de biblioteca. Según los avisos primarios, requieren respectivamente renderizado
XSLT con resolución implícita de vistas o fragmentos de vistas enviados mediante SSE.
La revisión de este código y dos regresiones MVC no encontraron esas condiciones; esa es una
evaluación de aplicabilidad del artefacto exacto, no una excepción general de seguridad.
[Aviso XSLT](https://spring.io/security/cve-2026-47884/),
[aviso de fragmentos SSE](https://spring.io/security/cve-2026-47890/).

Los enlaces de escritura emitidos antes de activar deben vencer conforme a su TTL. Los cambios
no eliminan registros antiguos ni acreditan la redacción de un proxy externo que no se revisó.
Permisos OAuth nuevos permanecen opt-in; no se activaron proveedores, cobros, publicaciones de
precios ni envíos de correo reales como parte de las pruebas. La advertencia conocida de tamaño
de chunks del frontend continúa sin bloquear el build.

Evidencia operacional protegida: `/root/indice-release-20261023` y
`/private/tmp/indice-release-20261023`, incluidos manifiesto, SBOM, hashes, comparaciones de datos,
dry runs y pruebas de recuperación. Activación, canary y aceptación funcional posterior al
despliegue: **NO EJECUTADOS**. Esta preparación no certifica toda la plataforma.
