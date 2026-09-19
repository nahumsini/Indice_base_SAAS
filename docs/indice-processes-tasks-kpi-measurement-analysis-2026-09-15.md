# Procesos y tareas: utilidad y cobertura de los indicadores

Actualización de ejecución: la propuesta fue autorizada e implementada. El alcance
y las definiciones entregadas están en el [contrato de mediciones y vistas](processes-tasks-kpi-measurement-contract.md).
El texto siguiente conserva el diagnóstico previo a la implementación.

Fecha: 2026-09-15. Estado: análisis y propuesta; no cambia fórmulas, API ni interfaz.

Complementa el [análisis de vistas internas](indice-processes-tasks-kpi-views-analysis-2026-09-15.md).
Ese análisis evaluó la reorganización visual. Este documento evalúa qué decisiones
pueden respaldar los datos que realmente escribe el módulo.

Referencias: [estándar de KPIs](KPI_TAB_STANDARD.md),
[contrato de procesos compartidos](processes-tasks-shared-processes-contract.md),
[estándar backend](indice-backend-operating-system-v1.md).

## Dictamen

Existe una base útil para volumen, carga, cierres, auditoría y seguimiento, pero el
tablero todavía no aprovecha toda la información generada. Antes de añadir más
indicadores conviene precisar algunas etiquetas y cálculos: puntualidad, vencidas,
evidencia, tendencias y puntuaciones compuestas pueden inducir a interpretaciones
distintas de lo que calculan hoy.

Los campos y flujos descritos se comprobaron en código y migraciones. No se consultó
una base de datos de clientes: disponibilidad del campo no garantiza cobertura,
antigüedad suficiente ni calidad de captura para una empresa concreta.

## Qué existe y qué significa actualmente

| Medición | Resultado de revisar la implementación | Consecuencia para el usuario |
|---|---|---|
| Volumen, abiertas y cerradas | Agregados del alcance de Agenda; se combinan fechas de agenda, cierre y auditoría según el rango. | Son útiles, pero «tareas del periodo» no significa exclusivamente tareas creadas durante el periodo. |
| Puntualidad | `(actionableTasks - overdueTasks) / actionableTasks`. No compara cada cierre con su fecha límite. | Un cierre tardío puede dejar de penalizar este porcentaje. Debe distinguirse «sin vencimiento detectado» de «entregadas a tiempo». |
| Vencidas | `agendaStatusExpression` devuelve `in_progress` o `paused` antes de evaluar vencimiento. La fecha utilizada es `COALESCE(agenda_date, due_date)`. | Una tarea en curso o pausada puede superar su fecha y permanecer fuera del contador de vencidas. Estado de trabajo y atraso deben poder coexistir en una futura medición de plazo. |
| Auditoría | Auditadas / cerradas; pendientes son cierres clasificados como `completed`. | Es cobertura de revisión; falta cuánto espera la revisión y con qué calificación termina. |
| Evidencia completa | Tareas con al menos un adjunto activo / total de tareas. | Mide cobertura de archivos, no cumplimiento de evidencia exigida. Penaliza tareas que no requieren archivos y no acredita su calidad. |
| Calidad y salud operativa | Calidad = promedio de ponderación × 20; sin ponderación se sustituye por cobertura de auditoría. Salud pondera avance 30%, cierre 25%, puntualidad 20%, auditoría 10%, calidad 10% y evidencia 5%. | «Sin calificación» no equivale a calidad medida. La puntuación es un índice compuesto, no productividad por hora; comparte componentes relacionados y requiere revisar sus insumos. |
| Tendencia | Agrupa principalmente por fecha de agenda/vencimiento; `totalTasks` cuenta estado `pending`, y `completedTasks` excluye auditadas. | Las leyendas «programadas» y «cerradas» no equivalen al total programado y a todos los cierres. No es una serie de cierres por fecha real de cierre. |
| Comparación anterior | Vuelve a agregar tareas usando fechas y estado almacenados, con reglas temporales; no utiliza snapshots históricos completos. | Cambios posteriores de fechas, asignación, avance o reaperturas pueden alterar el resultado histórico. No presentarlo como fotografía inmutable del cierre anterior. |
| Rendimiento por persona | La tarea compartida participa en cada asignación activa. | La suma de filas de personas puede superar el total de tareas únicas. No equivale a aportación individual ni horas trabajadas. |
| Salud de proyectos | `healthScore` copia `productivityScore`. | No es una medición independiente del plazo o riesgo del proyecto. |

Ejemplo conceptual de puntualidad: una tarea que vencía el día 10 y se completó
el día 12, dentro del rango consultado, se clasifica como cerrada. Si es la única
tarea y no hay vencidas, la fórmula de puntualidad devuelve 100%, aunque la entrega
fue tardía. Es una consecuencia de la fórmula, no un dato observado de un cliente.

## Datos aprovechables y límites

| Fuente comprobada | Información disponible | Límite a respetar |
|---|---|---|
| `process_tasks` | Creación, inicio, fecha límite, agenda, cierre, cancelación, prioridad, avance, empresa/unidad/negocio/proyecto/proceso. | El inicio puede registrarse automáticamente al cerrar; fechas editables y cierre restablecido al reabrir. No hay un cronómetro de horas efectivas en estos flujos. |
| Auditoría de tareas | `audited_at`, auditor, `weighting` de 0 a 5 y notas. | La última auditoría no es todo el historial; mostrar cantidad evaluada y cobertura. |
| Adjuntos y `evidence_required` | Requisito de evidencia y existencia de archivos activos; el cierre exige al menos uno si es obligatorio. | Presencia no acredita contenido correcto; adjuntos actuales no reconstruyen automáticamente evidencia a una fecha histórica. |
| `process_task_assignees` | Miembros, rol, contribución pendiente/lista, asignación, fecha de contribución y retiro. | Las tareas de procesos compartidos pueden cerrarse por cualquier asignado (`any_assignee`); una contribución pendiente no siempre impide el cierre. |
| `process_task_events` | Eventos de creación, edición, cierre, auditoría, cancelación, reapertura, asignaciones y seguimientos. | `task_updated` no contiene un diff completo; el evento de reapertura también se registra al pasar de completada a otro estado, incluida cancelación. No es directamente una tasa de retrabajo. |
| `process_runs` y versiones | Ejecuciones, versión, fecha de inicio, finalización, estados e incidencias; tareas asociadas y sus plazos. | Generación anticipada de 45 días: no contar ejecuciones futuras como incumplidas. Los modos secuencial/escalonado no bloquean tareas por sí mismos. |
| `projects` | Fechas de inicio, límite y cierre; estado, prioridad, responsable y tareas. | El porcentaje de tareas no pondera esfuerzo y no predice una fecha de terminación. |
| Dependencias y seguimientos | Relaciones entre tareas, tipo y desfase; comentarios y fechas de seguimiento. | Una dependencia abierta no prueba bloqueo efectivo; un seguimiento con fecha no tiene por sí solo un estado de cita incumplida. |

## Indicadores prioritarios con los datos actuales

Estos son candidatos para contratos de medición, no fórmulas aprobadas ni métricas
ya entregadas. Las nuevas agregaciones pertenecen al backend del módulo.

| Prioridad / indicador | Pregunta y cálculo propuesto | Disponibilidad y condición | Destino |
|---|---|---|---|
| P1 · Entregas a tiempo | De las tareas cerradas en el rango con fecha límite válida, ¿cuántas cerraron en o antes de `due_date`? Mostrar numerador, denominador y excluidas sin plazo. | Datos guardados; nueva agregación. Definir fecha límite frente a fecha de agenda y zona de negocio. La fecha límite actual es editable: no prometer cumplimiento contra un compromiso original inmutable. | Resumen y Por unidad |
| P1 · Pendientes fuera de plazo | Tareas aún abiertas con `due_date` anterior al corte, incluyendo pendientes, en curso y pausadas; separar prioridad alta y antigüedad. | Datos guardados; nueva agregación independiente del estado visual de Agenda. Mantener explícito si incluye arrastre anterior al rango. | Resumen y Análisis |
| P1 · Espera de auditoría | Pendientes de auditar y días desde su cierre; para auditadas, mediana de `audited_at - completed_at`. | Conteo ya disponible en KPI; edad y duración necesitan agregación. Excluir tiempos negativos/incompletos y mostrar cobertura. | Análisis |
| P1 · Calidad auditada | Promedio observado de 0 a 5 y distribución de calificaciones; cantidad evaluada frente a auditadas. | El promedio ya llega en `averageWeighting`; distribución y cobertura necesitan agregación. «Sin evaluación» cuando no exista muestra; no sustituir por cobertura de auditoría. | Análisis y Rendimiento |
| P1 · Carga por responsable | Abiertas, vencidas y de alta prioridad por persona; tareas únicas frente a participaciones compartidas. | Parte ya llega por colaborador; prioridad requiere ampliar agregado. No traducir cantidad de tareas a saturación laboral sin estimaciones de esfuerzo/capacidad. | Rendimiento |
| P2 · Tiempo transcurrido hasta cierre | Mediana desde creación hasta cierre, con cantidad de casos válidos. Puede desglosarse por proceso o proyecto. | Datos guardados; nueva agregación. Preferir creación→cierre como tiempo transcurrido, pues inicio puede autocompletarse al cerrar. No llamarlo horas trabajadas; separar tareas futuras generadas anticipadamente y reaperturas. | Análisis y Rendimiento |
| P2 · Evidencia obligatoria pendiente | Abiertas que requieren evidencia y aún no tienen adjuntos. Cobertura documental entre tareas que sí la requieren, separando abiertas/cerradas. | Datos y validación de cierre existentes; nueva agregación. Si ninguna exige evidencia, «No aplica». En cerradas es control de integridad documental, no aprobación de calidad. | Análisis |
| P2 · Ejecuciones de procesos | Ejecuciones iniciadas, finalizadas, finalizadas con incidencias y abiertas con tareas fuera de plazo. | Existen runs y versión; el KPI actual no agrega runs. Calcular demora actual desde tareas, no depender solo de un flag persistido. Respetar generación futura, permisos y tareas que abarcan varias unidades. | Rendimiento → Procesos |
| P2 · Proyectos fuera de plazo | Proyectos abiertos con fecha límite superada; mostrar pendientes y fecha del proyecto, sin confundirla con fechas de tareas. | Fechas/estado/proyecto existen. Para incluir proyectos sin tareas visibles hay que definir alcance y autorización propios; no agregarlos sin más al endpoint actual. | Rendimiento → Proyectos |
| P2 · Próximos vencimientos | Pendientes que vencen en los próximos 7 días desde el corte indicado, por prioridad/responsable. | Fechas disponibles; requiere agregación con ventana explícita. No mezclar silenciosamente fechas fuera del periodo seleccionado: usar intersección o navegación que cambie el rango visible. | Análisis |

Los indicadores ya disponibles —sin responsable, antigüedad de vencidas, pendientes
de auditoría, promedio de ponderación y comparación— deben reorganizarse y aclararse;
no presentarlos como nueva captura de datos.

## Métricas condicionadas a mejorar la trazabilidad

- **Reaperturas registradas:** se pueden contar eventos, pero antes de usar una
  tasa de retrabajo hay que separar reapertura de cancelación, revisar todos los
  canales de escritura y definir cobertura histórica y denominador. No sustituir
  «sin eventos» por «sin retrabajo» en registros anteriores a su instrumentación.
- **Tiempo real de ejecución y capacidad:** no deducirlo de creación/inicio/cierre.
  Harían falta esfuerzo previsto, horas efectivas, calendario y capacidad acordada.
- **Bloqueos y resolución:** dependencias, pausas y contribuciones permiten detectar
  situaciones por revisar; no acreditan un bloqueo registrado con inicio y fin.
- **Cumplimiento de recurrencia completa:** los runs existentes permiten medir
  ejecuciones generadas. Detectar ejecuciones que debieron generarse y nunca existieron
  requiere contrastar el calendario del motor y sus versiones, no dividir solo runs.
- **Costo, rentabilidad o ahorro:** no hay base de costos ni horas imputadas en los
  contratos revisados que respalde estas métricas por tarea/proceso.

## Cómo incorporarlo sin saturar la interfaz

Conservar la propuesta **Resumen / Análisis / Por unidad / Rendimiento**, el amarillo
del módulo y el espaciado de 24 px. No crear una pestaña nueva por cada indicador.

- **Resumen:** ocho indicadores principales como máximo conforme al estándar,
  con etiquetas precisas. Revisar el contrato de los ocho existentes antes de
  sustituirlos; el cambio visual aprobado no autoriza cambiar sus cálculos.
- **Análisis:** bloques de plazos, auditoría/calidad y documentación. Elegir un
  bloque a la vez si el volumen lo requiere; cada cifra lleva al detalle aplicable.
- **Por unidad:** comparar el mismo indicador y mostrar cantidad de casos. Incluir
  todas las unidades disponibles, sin limitar la lectura a las ocho mejor puntuadas.
- **Rendimiento:** selector de Colaboradores / Procesos / Proyectos; métricas
  correspondientes a la entidad y acceso a sus tareas o ejecuciones.

Para gerencia, los datos prioritarios son compromiso de entrega, atraso y calidad.
Para operación, son tareas por atender, responsables, espera de auditoría y evidencia
pendiente. El alcance visible sigue siendo el autorizado y filtrado; «Resumen» no
amplía automáticamente el enfoque de Mis tareas a toda la empresa.

## Secuencia y aceptación propuestas

1. Separar la reorganización visual de la revisión de mediciones.
2. Acordar contratos exactos de puntualidad, atraso, evidencia y tendencia; documentar
   cualquier cambio frente a los contratos actuales sin romper consumidores existentes.
3. Priorizar plazos reales, espera de auditoría y calidad observada. Agregar campos
   compatibles en el servicio actual cuando proceda; no introducir otro motor de KPIs.
4. Incorporar ejecuciones y proyectos después, con sus unidades de conteo explícitas.
5. Tratar estados «sin datos», «sin muestra comparable» y «no aplica» por separado
   de cero. No asignar semáforos o metas universales a métricas nuevas sin un criterio.
6. Definir cada indicador con fórmula, muestra, corte, exclusiones, comparación,
   explicación, acción y estado vacío conforme a `KPI_TAB_STANDARD.md`, sección 8.

Casos mínimos para probar antes de cambiar cálculos: cierre a tiempo/tardío; abierta,
en curso y pausada vencidas; fecha de agenda distinta de vencimiento; tarea sin
fecha válida; evidencia opcional/obligatoria; sin evaluaciones; cierre directo sin
inicio; auditoría en otro periodo; reapertura/cancelación; asignación compartida;
generación futura; ejecución con tarea cancelada; permisos y aislamiento de empresa.

## Evidencia y verificación

Fuentes inspeccionadas:

- `src/main/java/com/indice/erp/processTasks/kpis/ProcessTaskKpisService.java`:
  `loadSummary`, `loadCollaborators`, `loadTrend`, `buildComparison`,
  `mapProjectRow`, `addComputedScores`, `taskFilter`, `agendaStatusExpression`.
- `src/main/java/com/indice/erp/processTasks/tasks/ProcessTasksService.java`:
  creación/edición/cierre/auditoría/cancelación, `lifecycleForStatus`,
  `requireEvidenceForCompletion`, `refreshLinkedProcessRun`, seguimientos.
- `src/main/java/com/indice/erp/processTasks/tasks/ProcessTaskCollaborationService.java`:
  asignaciones, contribuciones, `resetContributions`, eventos.
- `src/main/java/com/indice/erp/processTasks/processes/ProcessRunsService.java`:
  generación y consulta de ejecuciones, demora calculada y evidencias por tarea.
- `src/main/java/com/indice/erp/processTasks/projects/ProjectsService.java`:
  fechas, estados y agregados de tareas del proyecto.
- Migraciones V32, V43, V206 y V249: ciclo de vida, auditoría, colaboración y runs.
- `react/src/app/BasicModules/ProcessesTasks/KPIs/KPIs.tsx`, `kpisApi.ts` y
  `translations/standardUiCopy.ts`: contrato consumido, etiquetas y gráficas.

La regresión frontend 19/19 registrada en el análisis de vistas no certifica estas
fórmulas. Esta ampliación es documental: pruebas de runtime, compilación y despliegue
N/A; sin consultas o mutaciones de datos de clientes. Las limitaciones históricas
y de cobertura deben validarse con datos de prueba aislados antes de implementar.
