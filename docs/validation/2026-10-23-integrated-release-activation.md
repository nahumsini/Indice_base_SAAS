# Liberación integrada — activación del 23 de octubre de 2026

Estado: **APP TEST Y PRODUCCIÓN DESPLEGADOS / VERIFICACIÓN CORRECTA**.
Comprobación final: 2026-10-23T18:20:33Z. Autorización puntual cerrada y deshabilitada
a las 18:20:43 UTC. La revocación histórica de Stripe TEST sigue pendiente.

## Artefacto y alcance

Aplicación desplegada: `3eddc38be95337075bbbeb92d2b3fe3772d098d2`.
Los commits posteriores de preparación, autorización y cierre contienen únicamente
documentación; no cambian código, dependencias, migraciones ni scripts del candidato.
Se conserva el alcance aprobado: carpeta principal integrada. La copia separada
de WhatsApp compartido permanece excluida y Funneling mantiene únicamente su Fase 0
aislada, como detalla la [preparación](2026-10-23-integrated-release-preparation.md).

Las mismas imágenes inmutables están activas en ambos entornos:

| Servicio | Imagen | Identificador de contenido |
| --- | --- | --- |
| Backend | `indice-erp-backend:3eddc38be953` | `sha256:bad87b6971670848c9c981e082f38a8f2c1f3532f195fb84470709b9d467275b` |
| Web | `indice-erp-web:3eddc38be953` | `sha256:49db1f3a48bdfb33a1371e8f8f20ea4919d2464e2100ad7311337392aecbfdbe` |
| MCP | `indice-erp-mcp:3eddc38be953` | `sha256:91555cbab66ef5eac38b93114c3113a1e5066f48549579e489ebff70aa199d3a` |

MinIO conserva su imagen `sha256:a16cad481969d7ddb6fcd2f1c58284af3d1266190b9bedc3ef0801aeb05a93a9`
y sus volúmenes. Se verificó previamente la igualdad de bytes del JAR y de los
archivos compilados web/MCP respecto de los artefactos probados.

## Orden y resultados reales

| Entorno | Inicio UTC | Activación verificada UTC | Observación UTC | Resultado |
| --- | --- | --- | --- | --- |
| [App Test](https://apptest.indiceapp.com) | 17:52:23 | 17:56:14 | 17:56:14–18:01:15, 5 minutos, 6 muestras | PASS |
| [Producción](https://app.indiceapp.com) | 18:01:30 | 18:05:20 | 18:05:20–18:20:23, 15 minutos, 16 muestras | PASS |

Se utilizó `deployment/scripts/up-host-network.sh` con archivos de entorno separados.
Primero se preparó la web compatible de recuperación de cada destino, conservando
V346; después se activó el candidato completo. Producción comenzó únicamente después
del PASS de App Test, incluidos navegador y conector autenticado de solo lectura.

Ambas bases pasaron V346 → V353, con cero migraciones fallidas y sin alterar los
checksums históricos. Los controles inmediatamente anteriores y posteriores a cada
activación comprobaron aislamiento entre entornos, catálogo/precios y suscripciones,
permisos existentes, configuración, archivos protegidos y montajes. La comprobación
final confirmó nuevamente imágenes, configuración, montajes, historial y salud.

Todas las muestras devolvieron HTTP 200 para web, API, almacenamiento y readiness MCP.
Hubo cero reinicios y cero errores nuevos de backend. El arranque y la revisión final
de los registros completos también terminaron sin ERROR/FATAL/OutOfMemoryError.
Las rutas protegidas conservaron HTTP 401 anónimo, además de las comprobaciones
canónicas de CSRF, login inválido sintético y metadatos OAuth/MCP.

En ambos entornos, Chrome aislado mostró el formulario de acceso sin errores de
JavaScript ni archivos fallidos; no se enviaron formularios reales. Las consultas
autenticadas MCP conservaron empresa, membresía, rol, alcance y asignaciones del
conector previamente conectado. Esto es evidencia técnica de continuidad, no una
aceptación humana completa de todos los módulos ni una prueba de cobros o correos.

## Respaldos, recuperación y capacidad

Respaldos nuevos anteriores a las activaciones:

- App Test: `apptest-20261023T174742Z`.
- Producción: `production-20261023T175039Z`.

Incluyen SQL, objetos, configuración y archivos protegidos. Los manifiestos SHA-256,
la compresión y las copias fuera del servidor pasaron verificación. Los ensayos de
restauración desconectados de los respaldos iniciales, migración y recuperación
compatible están documentados en la preparación; no se restauraron datos sobre
ninguna base funcional. Las pruebas con base de datos usaron únicamente bases aisladas.

Se conservan detenidos los contenedores `-rollback`: backend seguro `3eddc38be953`,
web `579d22fbb197-secure-recovery`, MCP anterior compatible y MinIO original. El backend
antiguo vulnerable permanece detenido y no debe reactivarse sobre V353. Esta recuperación
cubre presentación/integración; un defecto compartido por el backend nuevo requiere
corrección hacia adelante. No se revirtió Flyway ni se eliminó información de negocio.

El refresco inicial del respaldo de producción se detuvo por capacidad y conservó los
respaldos existentes. Se liberó únicamente caché regenerable de paquetes del sistema
y el nuevo respaldo terminó correctamente. Espacio libre final: **10.17 GiB**, por
encima del mínimo canónico de 10 GiB, sin reducir ese límite. El margen debe revisarse
antes de la siguiente liberación; no se borraron volúmenes ni respaldos operacionales.

## Validación y límites pendientes

El [CI del candidato exacto](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/39990639808)
pasó. La preparación registra 3,923 pruebas backend (una omisión histórica), 1,087 frontend,
170 MCP, 17 de recuperación y dos de tráfico/logs Nginx, además de TypeScript, builds,
dos preflights completos, cuatro dry runs y escaneos. Los fallos iniciales y sus
correcciones se conservan en ese informe; no hubo fallo de activación ni rollback real.

La [decisión puntual](../decisions/2026-10-23-integrated-release-stripe-deferral.md)
reemplazó únicamente el bloqueo de revocación de la clave histórica Stripe TEST.
El hallazgo sigue **HIGH y sin resolver**; no se revocó ninguna clave. La ventana
quedó cerrada y la autorización operacional está deshabilitada para impedir su reutilización.

Los dos hallazgos Spring y su evaluación de aplicabilidad permanecen registrados en
la preparación: no se afirma una actualización de biblioteca ni una excepción general.
Los enlaces de escritura del backend anterior tenían TTL de 900 segundos; la última
capacidad calculada venció antes de 18:09:30 UTC en App Test y 18:18:37 UTC en producción.
La comprobación final ocurrió después de ambos límites, con los escritores anteriores
detenidos. Esto no acredita integridad retrospectiva de evidencia antigua ni elimina
registros históricos o certifica un proxy externo no revisado.

No se habilitaron proveedores, cobros reales, envíos reales, publicaciones de precios
ni permisos OAuth nuevos. Aceptación humana integral: **NO EJECUTADA**. Cambios nuevos
de esquema durante la activación aparte de V347–V353: **N/A**.

Evidencia protegida: `/root/indice-release-20261023` y
`/private/tmp/indice-release-20261023`, incluidos `final-activation-evidence.json`,
canaries, comprobaciones de navegador/conector, respaldos, escaneos y manifiesto final.
No se incorporaron credenciales ni registros privados al repositorio.
