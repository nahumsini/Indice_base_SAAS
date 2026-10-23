# Juntas: delegación y cumplimiento en plazo — verificación 2026-10-23

Estado: implementado y probado en código local. No se hizo commit, push, merge ni despliegue a
app-test/app. El backend funcional 8083 y el frontend 5175 conservaron sus procesos. La base funcional
no recibió migraciones ni datos de pruebas. Se conservó el trabajo previo del árbol sucio.

## Comportamiento

- Detalle de junta: Operational Workspace Modal compacto, preparación/agenda/personas antes de
  acuerdos/resultados, una acción principal en el pie según estado y acciones secundarias en Más
  opciones. La sala nativa conserva ejecución, minuta, asistencia, votaciones y cierre.
- Crear tarea y delegar: Standard Form Modal con responsable participante, fecha compromiso y motivo
  de cambios. La transacción conserva la fecha original, registra cambios y crea una sola tarea nativa
  vinculada. Reintentos idénticos recuperan esa tarea; los cambios de petición generan conflicto.
- Validar cumplimiento: Standard Form Modal con resultado/evidencia. Terminar la tarea y cerrar la
  junta mantienen independiente la validación del acuerdo. Las versiones obsoletas conservan el
  formulario y requieren volver a revisar.
- Cumplimiento en plazo: cálculo del backend por junta, sobre acuerdos evaluables cuyo plazo original
  terminó, en la zona horaria de la junta. Se muestran cumplidos a tiempo/tarde, vencidos, plazos
  vigentes, cancelados e históricos sin base verificable. Denominador cero muestra Pendiente de
  evaluación. Reprogramar conserva el plazo original.
- MCP: cuatro consultas y tres acciones con sus vistas previas, confirmación inmutable, versiones,
  auditoría, reintentos y permisos actuales. La vista previa muestra responsables resueltos por nombre.
  Las nuevas autorizaciones son opt-in; delegar requiere también tasks.create y tasks.delegate.

Se preservaron rutas y contratos anteriores, permisos independientes de Juntas/Acuerdos/Indicadores,
propiedad de tareas en Procesos, delegación limitada de minuta, cierre y votación explícitos, minutas
cerradas con adendas, idiomas y protección de borradores. La minuta/decisiones siguen siendo los
campos de texto existentes; las hojas estructuradas por tema son una evolución posterior.

## Verificación final

- 88 pruebas Java, nueve clases: cero fallas/errores/omitidas; compilación incluida.
- Flyway validó el esquema aislado hasta V352 y pasó la prueba de unicidad de versiones.
- 47 pruebas React: cero fallas; TypeScript y build de producción correctos.
- 161 pruebas MCP: cero fallas; compilación TypeScript correcta.
- Navegador, meeting-agreements-browser: modal/sala, 70 %, revisión de delegación, falla temporal y
  reintento, vínculo único, validación independiente, geometría móvil y modo oscuro.
- Navegador, meeting-control-browser: creación, CSRF/reintentos, series, delegación de minuta,
  flujos guardados, planeación futura, pausa/cancelación, enlaces, calendario, ciclo de vida,
  acuerdos, ocho idiomas, permisos, móvil y oscuro.
- git diff --check: correcto. Aviso del build: tamaño de algunos chunks; no bloquea la compilación.
- Sin fallas pendientes en las comprobaciones anteriores.

La base usada fue indice_test_db, MySQL 8.4 en indice-meeting-performance-test, tmpfs, puerto
127.0.0.1:13329. El lanzador comprueba identidad, imagen, tmpfs, puerto y nombre de base antes de
permitir Maven. El contenedor de pruebas se eliminó al terminar. No se usaron los puertos de bases
funcionales. Se verificó un INSERT de la forma del binario anterior: permanece permitido y sin una
calificación inventada. No equivale a ejecutar una reversión completa de despliegue.

Evidencia local sanitizada: [verification.json](/private/tmp/indice-meetings-review-20261023/verification.json),
[captura escritorio](/private/tmp/indice-meetings-review-20261023/agreement-desktop.png),
[captura celular oscuro](/private/tmp/indice-meetings-review-20261023/agreement-phone-dark.png).

## Activación e integración pendientes

Las migraciones V351/V352 se aplicaron únicamente en la base temporal. Para activar el flujo en el
entorno funcional se requiere publicar versiones compatibles de backend/frontend/MCP y autorizar los
scopes nuevos. Los conectores existentes conservan su autorización actual. Preservar rollback y
seguir deployment/README.md al liberar.

Se comprobó que el worktree paralelo de WhatsApp contiene otra V351:
V351__sales_whatsapp_onboarding_control.sql. Antes de combinar ambos trabajos se necesita un plan de
consolidación del linaje Flyway. Este cambio no fusiona ramas ni renombra/edita migraciones aplicadas.

Despliegue y prueba con servicios externos reales: N/A. Mensajes a terceros: N/A.

## Archivos de este cambio

- `deployment/tests/run-meeting-performance-isolated.py`
- `docs/indice-frontend-operating-system-v2.md`
- `docs/indice-mcp-operating-system-v1.md`
- `docs/meeting-control-module-contract-v1.md`
- `docs/modal-engine-inventory-and-migration.md`
- `integrations/indice-mcp/src/contracts.ts`
- `integrations/indice-mcp/src/indiceClient.ts`
- `integrations/indice-mcp/src/mcpServer.ts`
- `integrations/indice-mcp/src/meetingTools.ts`
- `integrations/indice-mcp/src/test/mcpServer.test.ts`
- `integrations/indice-mcp/src/test/meetingTools.test.ts`
- `integrations/indice-mcp/src/toolPolicy.ts`
- `react/package.json`
- `react/src/app/Auth/AiOAuthAuthorizePage.tsx`
- `react/src/app/ComplementaryModules/MinutesControl/components/AgreementEditors.tsx`
- `react/src/app/ComplementaryModules/MinutesControl/components/MeetingDetail.tsx`
- `react/src/app/ComplementaryModules/MinutesControl/components/MeetingExecution.tsx`
- `react/src/app/ComplementaryModules/MinutesControl/components/MeetingPerformance.tsx`
- `react/src/app/ComplementaryModules/MinutesControl/components/MeetingSessionWorkspace.tsx`
- `react/src/app/ComplementaryModules/MinutesControl/services/meetingApi.ts`
- `react/src/app/ComplementaryModules/MinutesControl/translations/meetingOutcomeCopy.ts`
- `react/tests/meeting-agreements-browser.mjs`
- `react/tests/meeting-control-browser.mjs`
- `react/tests/meeting-delegation.test.mjs`
- `react/tests/meeting-session.test.mjs`
- `src/main/java/com/indice/erp/access/tab/TabPermissionRouteClassifier.java`
- `src/main/java/com/indice/erp/ai/access/AiAccessTokenService.java`
- `src/main/java/com/indice/erp/ai/access/AiToolCapabilityService.java`
- `src/main/java/com/indice/erp/ai/meetings/AiMeetingAccess.java`
- `src/main/java/com/indice/erp/ai/meetings/AiMeetingActionService.java`
- `src/main/java/com/indice/erp/ai/meetings/AiMeetingApiController.java`
- `src/main/java/com/indice/erp/meetings/MeetingAccessService.java`
- `src/main/java/com/indice/erp/meetings/MeetingAgreementPerformanceService.java`
- `src/main/java/com/indice/erp/meetings/MeetingAssistantService.java`
- `src/main/java/com/indice/erp/meetings/MeetingController.java`
- `src/main/java/com/indice/erp/meetings/MeetingDtos.java`
- `src/main/java/com/indice/erp/meetings/MeetingService.java`
- `src/main/java/com/indice/erp/processTasks/tasks/ProcessTaskMeetingContract.java`
- `src/main/resources/db/migration/V351__meeting_agreement_deadline_performance.sql`
- `src/main/resources/db/migration/V352__meeting_deadline_rollback_compatibility.sql`
- `src/test/java/com/indice/erp/access/tab/TabPermissionRouteClassifierTest.java`
- `src/test/java/com/indice/erp/ai/access/AiToolCapabilityServiceTest.java`
- `src/test/java/com/indice/erp/meetings/MeetingAgreementPerformanceTest.java`
- `src/test/java/com/indice/erp/meetings/MeetingIntegrationTest.java`
