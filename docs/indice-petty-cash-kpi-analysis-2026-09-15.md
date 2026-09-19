# Caja chica: revisión y aplicación de vistas de indicadores

Fecha: 2026-09-15. Evidencia de implementación; gobierna el contrato
[`petty-cash-kpi-workspace-contract.md`](./petty-cash-kpi-workspace-contract.md).

## Superficie real

La ruta `/cash/kpis` monta `PettyCashFinancialViewWorkspace` desde `CajaChica.tsx`.
El componente anterior `KPIs/KPIs.tsx` pertenece al scaffold legado y no controla
esta pestaña. La implementación usa las fuentes reales del contexto de Caja chica.

## Hallazgos y resultado

| Hallazgo | Cambio |
| --- | --- |
| Tarjetas, gráficas, rankings y tablas en una sola página | Resumen / Análisis / Por unidad / Cortes y comprobantes; navegación verde compartida, separación de 24 px y filtros globales. |
| Conteos incluían terceros, pero las métricas financieras los excluían | Selector explícito empresa/terceros, clasificación histórica del corte y métricas de custodia aditivas. Las métricas empresariales existentes conservan su contrato. |
| VALIDATED externo contado como pendiente | Autorización según el origen del corte: EXPENSE_CREATED interno o VALIDATED externo. |
| Adjuntos confundidos con autorización | Evidencia y autorización son mediciones independientes; se conserva autorización sin archivo. |
| Saldo negativo convertido a cero y presentado como presupuesto disponible | Saldo registrado actual con signo, fondos activos y clasificación actual; no representa presupuesto ni arqueo físico. |
| Puntaje compuesto de salud y porcentajes con umbrales arbitrarios | Ocho indicadores explicables, sin calificación sintética. Se muestran pendientes concretos. |
| Fondeos, uso, faltantes y saldo tratados como una composición | Composición únicamente de compras vigentes: autorizadas + pendientes. |
| Seis periodos globales y seis unidades visibles | Todos los periodos filtrados, todas las unidades y responsables con paginación. Solicitudes agrupadas de hasta 100 consultas. |
| Movimientos sin corte entraban por fondo aun en periodos históricos | Se excluyen de este análisis y se informa cuántos no tienen corte. |
| Fallo de fuente sin estado recuperable | Error visible y actualización global; respuestas de una autorización anterior no pueden sustituir las actuales. |
| Totales ausentes o parciales aparentaban cero | No disponible y advertencia; se conserva el contexto nativo y del tipo de cambio. |

El resumen muestra fondos entregados, compras capturadas, salidas autorizadas,
importe por autorizar, saldo actual, faltantes registrados, cobertura documental y
cortes sin cerrar. SETTLED no se confunde con un cierre terminal. Los faltantes
históricos pueden estar resueltos y no se presentan como deuda pendiente.

Las acciones de seguimiento abren los comprobantes pendientes/sin adjunto, cortes
sin cerrar/con faltantes y fondos negativos. Las tablas originales de movimientos
y cortes conservan moneda nativa y paginación; se agregan comprobantes y saldos
actuales. El reporte incluye el alcance completo, todas las tablas y todos los
periodos, sin depender de la vista, el seguimiento local o la página visible.

## Archivos y límites

- Orquestación: `PettyCash/components/PettyCashFinancialViewWorkspace.tsx`.
- Selectores, consultas, presentación, tablas, traducciones y reporte: archivos
  `pettyCashKpi*`, `usePettyCashKpiAggregates`, `workspaceCopy` y componentes
  `PettyCashKpi*` dentro de `PettyCash/KPIs/`.
- Actualización de fuente: `PettyCashContext.tsx` y `CajaChica.tsx`.
- Contrato monetario aditivo: `shared/kpiMonetaryApi.ts`, `BasicModuleKpiMetric`,
  `BasicModuleKpiCurrencyRepository`, `KpiMonetaryScopeSql` y
  `KpiRequestAccessService`.
- Regresión frontend: `petty-cash-kpi-workspace.test.mjs`, suite de Caja chica y
  ajuste de dos expectativas obsoletas en la regresión estándar.
- Integración: `PettyCashKpiCurrencyIntegrationTest` y caso de autorización de
  custodia en `KpiRequestAccessIntegrationTest`.

No se modificaron movimientos contables, autorizaciones de compra, cierres,
deducciones de nómina, etapas de clasificación, efectos presupuestales ni datos
históricos. No hay migraciones nuevas. Unidad y negocio históricos se presentan
según la asignación actual del fondo: la fuente no proporciona snapshots de esas
dimensiones. No se calcula puntualidad de cierre sin evidencia temporal suficiente.
Migración de esquema: N/A. Despliegue de producción: N/A.

## Validación

- 57 pruebas de interfaz: suite `test:petty-cash-ui`, incluidas diez nuevas pruebas
  del workspace y del ciclo de carga/actualización/cambio de autorización.
- 58 pruebas unitarias backend: repositorio monetario (6), conversión monetaria
  (4), servicio de Caja chica (38), validación monetaria (8) y SQL existente (2).
- 9 pruebas de integración: métricas de custodia (4), autorización KPI (4) y
  alcance organizacional de todos los propietarios monetarios (1).
- Integración contra un MySQL desechable en `127.0.0.1:13323/indice_test_db`.
  Migraciones existentes aplicadas en esa base aislada; contenedor eliminado al
  terminar. No se ejecutaron pruebas de base de datos contra la base funcional.
- TypeScript, build frontend y compilación del backend local aprobados.
- El build conserva la advertencia existente de tamaño de algunos chunks.
- Frontend en 5174 y backend en 8082 actualizados; salud real
  `/api/v1/health` verificada tanto directamente como por el proxy. El workspace
  protegido responde 401 sin sesión. Se verificó el código servido por Vite y la
  coincidencia de archivos con los checkouts activos.
- Revisión visual autenticada pendiente: el navegador integrado no ofreció
  ninguna sesión disponible. No se afirma una comprobación visual de escritorio,
  móvil o impresión con datos reales.

Resultado: 124 pruebas aprobadas, sin fallos pendientes de las comprobaciones
ejecutadas. Previsualización: `http://localhost:5174/cash/kpis?view=overview`.
