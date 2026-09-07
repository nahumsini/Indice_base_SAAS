# Validación de Procesos, Kiosco y Comisiones — 2026-09-06

Estado: correcciones implementadas y verificadas en local. Este documento registra la evidencia de
esta revisión; no sustituye los contratos canónicos ni constituye una aprobación del lanzamiento
completo. Los cambios permanecen en el espacio de trabajo, sin publicar en producción.

## Alcance autorizado

Puntos 1, 3 y 4 del análisis: identidad del responsable entre Procesos/Agenda/Kiosco, visibilidad de
tareas en Kiosco y estabilidad/indicadores de Comisiones. El punto 2, aplicar cambios de una definición
de proceso a ejecuciones ya generadas, queda expresamente pendiente de una decisión separada.

## Comportamiento corregido

- **Responsables:** las consultas presentan el nombre vigente del perfil vinculado al identificador
  real del colaborador, con los respaldos de nombre/correo existentes. Un nombre almacenado en una
  tarea deja de ocultar esa identidad. La compatibilidad de búsqueda por nombre rechaza coincidencias
  ambiguas. Se conserva la asignación por identificadores y el alcance de empresa.
- **Kiosco:** el periodo «Todos» incluye tareas futuras e históricas según su estado; «Mañana» y
  «Ayer» usan la misma fecha de referencia al evaluar periodo y estado. Las tareas canceladas o con
  estados desconocidos no aparecen como pendientes. Se mantienen los filtros de colaborador, unidad
  y negocio.
- **Comisiones:** los decimales históricos recibidos como texto se normalizan al entrar al frontend.
  Los importes muestran su código de moneda; los valores inválidos se presentan como no disponibles.
  Un fallo de renderizado se contiene en la pestaña, con reintento, sin desmontar el espacio de trabajo.
  El mensaje global diferencia un recurso desactualizado de un error de la aplicación.
- **KPIs de Comisiones:** un endpoint de consulta calcula con `BigDecimal` a partir de las ventas
  persistidas y el motor monetario central. Recibe identificadores, nunca totales aportados por el
  navegador. Deduplica componentes, cuenta cada venta una sola vez en la base del porcentaje y
  excluye ventas canceladas/rechazadas. Usa evidencia de tipos de cambio para la moneda preferida;
  no altera los importes originales. Una conversión incompleta o un desglose inconsistente impide
  presentar un total o porcentaje como completo.

## Comportamiento y datos preservados

No se añadieron migraciones ni se reescribieron asignaciones, nombres históricos, tareas existentes,
políticas de comisión, cortes, pagos o tipos de cambio de las operaciones. Las versiones y ejecuciones
de procesos conservan su contrato vigente. No se borraron datos ni se reemplazó el trabajo previo
existente en el repositorio. Los permisos, el aislamiento por empresa y el alcance organizacional
se verifican en el backend; la nueva consulta queda clasificada explícitamente en Ventas.

La corrección de nombres no reasigna registros históricos cuyo identificador pudiera estar realmente
equivocado. Eso requiere revisar los datos concretos de la empresa afectada.

## Archivos del cambio

- Identidad: `ProcessesService`, `ProcessRunsService`, `ProcessTasksService`,
  `ProcessTaskCollaborationService`, `AgendaService` y `ProcessTaskKioskQueryService` bajo
  `src/main/java/com/indice/erp/processTasks/`.
- Filtros: `react/src/app/BasicModules/ProcessesTasks/Kiosk/taskKioskFilterEngine.ts`.
- Consulta: `SalesCommissionSummaryService.java` y `SalesCommissionSummaryController.java` bajo
  `src/main/java/com/indice/erp/sales/`; clasificación en `TabPermissionRouteClassifier.java` y
  autorización de consulta delegada en `ManagedCompanyReadOnlyInterceptor.java`.
- Interfaz de Comisiones: adaptador `salesApiAdapters.ts`, contenedor `SalesCommissions.tsx`,
  componentes de tabla/detalle/cortes/vista, reglas, tipos y formateadores bajo
  `react/src/app/BasicModules/Sales/`; nuevos servicio `commissionSummaryApi`, hook
  `useCommissionSummary`, presentación `commissionSummaryPresentation`, traducciones
  `commissionFeedback` y `CommissionViewErrorBoundary`. Mensaje global en `react/src/app/routes.tsx`.
- Cobertura nueva: `ProcessAssignmentFlowIntegrationTest`, `SalesCommissionSummaryIntegrationTest`,
  `SalesCommissionSummaryControllerTest`, `task-kiosk-filter-runtime.test.mjs` y
  `commission-runtime.test.mjs`; ampliación de `ManagedCompanyReadOnlyInterceptorTest`.
- Contratos: `processes-tasks-shared-processes-contract.md`,
  `sales-commission-reporting-contract.md` y referencia desde el contrato canónico de backend.

## Verificación ejecutada

| Verificación | Resultado |
| --- | --- |
| Backend: Procesos, Agenda, Kiosco, Comisiones, autorización y CSRF relacionados | 149 pruebas, 22 suites; 0 fallos, 0 errores, 0 omitidas |
| Frontend: comportamiento y regresiones relacionadas | 133 pruebas; 0 fallos, 0 omitidas |
| TypeScript | `npm --prefix react run typecheck` correcto |
| Compilación frontend | Vite build correcto |
| Compilación y empaquetado backend | Maven `package` correcto con la batería enfocada |
| Navegador Chrome | Componentes reales de Comisiones en escritorio y móvil; cambio MXN/USD y recuperación mediante «Reintentar» correctos |
| Arranque local | APIs 8082/8083: `/api/v1/health` devuelve 200 y `ok`; frontends 5174/5175 devuelven 200 |
| Protección de la nueva consulta | Sin sesión devuelve 401 en ambas APIs locales |
| Flyway al arrancar | 264 migraciones validadas; ambos esquemas actualizados, sin migración necesaria |
| Integridad del diff | `git diff --check` correcto |

Las pruebas de base de datos usaron exclusivamente `indice_regression_v3_test_db` en el servidor
aislado de pruebas. La integración nueva de asignación crea un proceso, genera sus tareas, verifica
Agenda, resuelve un PIN sintético, comprueba acceso exclusivo del responsable en Kiosco y completa
una tarea conservando la identidad en su historial. Sus datos se revierten transaccionalmente.

La integración monetaria cubre varias monedas, varios componentes por venta, selección duplicada,
selección parcial, cancelación, conversión ausente, desglose inconsistente y acceso entre empresas
o negocios. Comprueba conciliación con el indicador central `SALES_COMMISSION` para el mismo conjunto.

La prueba de navegador usa componentes reales y respuestas de API sintéticas; la persistencia y
el cálculo real se verificaron por separado mediante integración con MySQL. No se presenta como
una reproducción autenticada en la empresa de Julio. La ejecución de regresión utiliza UTC de
forma consistente en Java y la conexión de pruebas, evitando diferencias de día entre ambos.

## Entrega local y límites

La aplicación queda disponible en `http://localhost:5174`, conectada al backend actualizado.
Se conserva el artefacto local anterior para reversión. Evidencias, capturas, resultados y copia
del artefacto verificado están en `/tmp/indice-launch-review-20260906/` (almacenamiento temporal).

Fallos pendientes en la batería enfocada: ninguno. Migraciones nuevas: N/A. Publicación: N/A.
La revisión no certifica por sí sola todos los módulos para el lanzamiento masivo. Quedan fuera
de este cambio el punto 2, las ampliaciones de Gantt y filtros de Agenda, y la inspección/reparación
de datos particulares en producción. El error exacto del despliegue observado por Julio requiere
su traza para atribuir una causa única; aquí se verificaron los casos históricos y de recuperación
descritos arriba.
