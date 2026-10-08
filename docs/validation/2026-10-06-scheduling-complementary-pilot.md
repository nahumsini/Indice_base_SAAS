# Agenda y eventos — validación del piloto local

Fecha: 6 de octubre de 2026. Rama de trabajo: `codex/opportunity-flow-visibility-20261006`.
Estado: código local probado; no publicado, sin commit/push/despliegue ni autorización de release.

## Resultado y alcance

Se implementó el módulo complementario `scheduling`, independiente del administrador de plataforma:
Agenda diaria de reservas, Reservas, Eventos, Indicadores y Configuración. Configuración contiene
Servicios, Equipo/disponibilidad y Página/enlaces. Los formularios públicos permiten solicitar un
diagnóstico 1:1 o inscribirse a un webinar, con enlace por empresa, consultor o evento.

El envío genera una solicitud por revisar, no una confirmación automática. Un operador autorizado
confirma/cancela y registra asistencia; la confirmación comprueba horario, cupo y cruces dentro de
la transacción. Cancelar un evento conserva el historial y cancela sus inscripciones activas.
Los indicadores vienen del servidor, respetan el periodo/alcance y abren su detalle por estado.
La asistencia sin observaciones se muestra como no disponible, no como cero.

No se insertaron entitlements/asignaciones en bases funcionales ni productivas. Las concesiones de
los fixtures son exclusivamente sintéticas en `indice_test_db`. La UI de pruebas no constituye una
sesión autenticada real ni una activación del módulo para una empresa.

## Archivos y contratos

- Frontend propietario: `react/src/app/ComplementaryModules/Scheduling/` (página pública, servicios
  tipados, hook de carga abortable, cinco pestañas, formularios y traducciones completas).
- Integración nativa: `App.tsx`, `routes.tsx`, `main.tsx`, `config/navigation.ts`,
  `config/moduleCatalog.ts`, `access/tabScopeCatalog.ts`, `context/LanguageContext.tsx` y la identidad
  del shell compartido. Se reutilizan Workbar, TitleBar, FilterBar, TableEngine, ModalFrame y memoria
  por empresa/usuario. Los datos de contacto y tokens no se guardan en memoria de workspace.
- Backend propietario: `src/main/java/com/indice/erp/scheduling/` (DTOs, repositorio, política de
  horario/estados, configuración, reservas, acceso, API privada y adaptador/API pública).
- Registro/permisos: `ConfigCenterTabPermissionCatalog`, `TabPermissionRouteClassifier`,
  `ModuleEntitlementInterceptor` y `KioskEngineFeatureFlags` (adaptador público apagado por defecto).
- Frontera de disponibilidad: `ConsultingBusyWindowService`, `ConsultingAdministrationService` y
  la lectura actual de entitlement de `ModuleAccessService`. El recurso compartido devuelve solo
  ocupación booleana; no entrega registros de otra empresa.
- Migración nueva y aplicada solo a la instancia desechable: V300. Registra `scheduling` como
  complemento piloto y crea tablas de servicios, equipo, disponibilidad, página, eventos, reservas,
  auditoría, mutex técnico y reintentos privados. No se editaron migraciones históricas.
- Pruebas nuevas: `src/test/java/com/indice/erp/scheduling/`, `react/tests/scheduling-*.mjs` y
  `react/tests/browser/scheduling.*`; se ampliaron las pruebas existentes de catálogo/clasificador
  y ModuleAccessService. Nuevos scripts `test:scheduling` y `test:scheduling-browser`.
- Decisión: [contrato del módulo](../scheduling-module-contract-v1.md), enlazado desde los sistemas
  operativos frontend/backend y el registro de módulos complementarios.

Los cambios preexistentes de capacitación independiente y oportunidades permanecieron intactos.
Este reporte no atribuye esos cambios a Agenda y eventos.

## Verificación

| Verificación | Resultado |
| --- | --- |
| Arranque Flyway desde MySQL 8 vacío, puerto loopback 13307, `indice_test_db` | PASS: V300 aplicada, sin grants automáticos; validación posterior de checksums correcta |
| Backend focalizado (12 clases, 68 pruebas) | PASS: reservas/aislamiento/CSRF/tab, estados/versiones, cancelación, solapamiento concurrente en una y dos empresas, capacidad, compatibilidad con consultoría, snapshots obsoletos de página/entitlement/ocupación, minimización pública, reintentos Engine y negativos HTTP |
| Integración de operaciones de plataforma (4 pruebas adicionales) | PASS: programación/disponibilidad de consultores y precios/payloads/notificaciones previos preservados |
| `./mvnw -q -DskipTests compile` | PASS |
| Regresión frontend focalizada (111 pruebas, incluido Scheduling) | PASS: permisos de Usuarios, identidad/Workbar, capacitación, plataforma y oportunidades preservados |
| Regresión compartida adicional (98 pruebas) | PASS: auth, kioscos, presentación pública y estándar de Learning Mode |
| `npm run typecheck` | PASS |
| `npm run build` | PASS; advertencia de chunks compartidos >600 kB, sin error de compilación |
| Navegador Chrome, API pública desde router real | PASS: consultor preseleccionado, horario, consentimiento, solicitud manual, CSRF, reintento con misma clave/payload, ningún fetch de auth/plataforma/finanzas |
| Navegador Chrome, shell privado con API sintética | PASS: guardar servicio/disponibilidad/página, navegación de pestañas por teclado, cancelar webinar, confirmar reserva, KPI→filtro, barra lateral configurable, permisos del operador, ocho idiomas, 390/1440 px y dark |
| Revisión visual de capturas públicas/privadas | PASS: superficies canónicas, formularios y navegación sin overflow horizontal de documento; tablas usan su scroll propio |
| `git diff --check` | PASS |
| Suite completa del repositorio / APPTEST / producción | N/A: no ejecutadas en esta fase local; no equivalen a las pruebas focalizadas |

La prueba del navegador bloquea toda red no local. Las APIs y participantes del fixture son
sintéticos; las pruebas de negocio/persistencia se ejecutaron aparte contra MySQL real aislado.
Capturas locales: `/tmp/indice-scheduling-public-{desktop,mobile,dark}.png` y
`/tmp/indice-scheduling-private-{desktop,mobile,dark}.png`.

## Fallos encontrados y resueltos

- La base de pruebas habitual de puerto 3307 tenía checksums históricos inconsistentes y una
  migración fuera de orden. Se dejó sin reparar, sin reset y sin edición de historia. La validación
  se trasladó a un contenedor nuevo, `indice-scheduling-tests-20261006`, sin volúmenes funcionales.
- La prueba integrada descubrió acceso directo a un campo de un repositorio proxificado; se
  corrigió mediante acceso por método. También se corrigió el orden de la transición de publicación
  del registro Engine para revocar correctamente las sesiones al pausar.
- Se añadieron lecturas actuales de página/entitlement/ocupación para no aceptar capturas usando
  un snapshot REPEATABLE_READ obsoleto. Se mantuvo la transacción Engine, sin separar la persistencia
  del registro idempotente.
- Los selectores/fixtures de navegador se ajustaron a roles de pestaña, endpoints reales y cargas
  asíncronas. No se modificaron controles de producción para eludir autenticación ni permisos.
- Se eliminó al terminar el contenedor desechable y su base sintética de pruebas (`--rm`), sin
  eliminar información funcional. La instancia funcional existente no tiene V300 aplicada y el
  backend 8082 continúa sirviendo su versión anterior; no se presenta como preview de este piloto.

## Comportamiento deliberadamente preservado

Consultoría mantiene beneficios mensuales, precios, payloads y flujo de notificaciones. Solo se
añade la comprobación del recurso común al confirmar/programar una sesión. Se conservaron rutas,
roles y datos existentes; no se modificaron Stripe, planes, producción, empresas/distribuidores,
prospectos ni el sistema de autenticación. Dinero/inventario: N/A. Identificadores nuevos: inglés.
El mayor archivo Java nuevo es `SchedulingRepository` (161 líneas); no hubo reestructura global.

## Pendientes y siguiente fase segura

1. Aplicar el piloto en un entorno autorizado, habilitar un entitlement de empresa y las pestañas
   del usuario por los flujos existentes; levantar el backend actualizado. Los servidores locales
   que ya estaban corriendo no fueron reiniciados ni se migró su base funcional por este trabajo.
2. Habilitar el adaptador público solo en el entorno piloto y publicar una página explícitamente.
   Comprobar usuarios reales administrador/operador, sesión anónima y sesiones ERP activas/bloqueadas.
   La política comercial existente puede bloquear una sesión ERP restringida aun en una liga pública;
   no se debilitó esa política para este módulo.
3. Completar UAT y el gate de seguridad/despliegue en APPTEST: HTTPS, rate limits en el edge, correo,
   consentimientos/retención, carga y concurrencia real, pausa/revocación y rollback operativo.
4. Integraciones futuras: verificación de correo, avisos/recordatorios, cancelación pública verificada,
   reunión/streaming, CRM/atribución, calendario externo, vacaciones/excepciones y vista semana/mes.

Actualmente la confirmación y el contacto con participantes son manuales. No se presenta el piloto
como sistema automatizado de correo, CRM, cobro o webinar streaming. La bandera pública apagada y
el retiro de entitlement/publicación son controles de rollback sin borrar registros.

## Vista local solicitada después de la implementación

- Inicio: `cd react` y `node tests/scheduling-preview.mjs`.
- Módulo: `http://127.0.0.1:5197/scheduling/calendar`.
- Página pública: `http://127.0.0.1:5197/book/piloto` (admite `?consultant=2` y `?event=4`).
- Usa la UI real con APIs sintéticas en memoria. No se conecta al backend, a bases de datos ni
  a correo; todas las APIs ajenas al preview se rechazan. El banner identifica la vista de prueba.
  Los cambios desaparecen al detener el proceso. No introducir datos personales reales.
- Archivos de esta vista: `react/tests/scheduling-preview.mjs` y los fixtures
  `react/tests/browser/scheduling.{html,tsx}`. No se añadieron mocks a código de producción.
- Se verificaron las cinco pestañas, recarga directa de Configuración, solicitud pública con
  consultor preseleccionado, recepción manual y ancho móvil, sin errores del navegador/API.
  También se comprobaron rechazo de una API de plataforma y de una mutación sin CSRF del preview.
- PASS: `npm run typecheck`, `npm run test:scheduling`, `npm run test:scheduling-browser`,
  `node --check tests/scheduling-preview.mjs` y `git diff --check`.
- La primera comprobación automatizada contó respuestas 304 de módulos JS como errores de API;
  se corrigió el filtro a rutas que comienzan con `/api/`. Se separó también la caché Vite de este
  preview para no compartir optimización de dependencias con los otros servidores locales.
- Backend, migraciones, build de producción y despliegue adicionales: N/A; solo se levantó una
  vista sintética aislada. ERP 5174, backend 8082 y datos funcionales permanecen sin reiniciar.
