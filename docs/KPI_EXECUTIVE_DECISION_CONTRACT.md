# Contrato de KPI ejecutivos para decisiones diarias

Estado: vigente

Versión del contrato API: `domains/2.1`

Zona de corte empresarial: `America/Toronto`

## Objetivo

El bloque `domains` de `GET /api/kpis/executive-panel` es la fuente autoritativa para la revisión operativa de cada mañana. Los bloques históricos del endpoint se conservan por compatibilidad, pero no deben usarse para decisiones financieras ni operativas nuevas.

El cálculo usa una lectura `REPEATABLE_READ` de sólo lectura. Todas las consultas de una respuesta observan el mismo estado confirmado de la base de datos. La fecha de corte se fija al iniciar la solicitud y no depende de la zona horaria de MySQL.

## Reglas generales

- El periodo incluye ambas fechas: `from <= fecha <= to`.
- La comparación usa el intervalo inmediatamente anterior con la misma cantidad de días.
- `basis=period` representa actividad ocurrida dentro del intervalo.
- `basis=periodEnd` representa el rezago reconstruido al cierre del periodo.
- `basis=currentSnapshot` representa un saldo o rezago actual, aunque se haya originado antes del periodo.
- Un cero significa que la población válida fue medida y el resultado es cero.
- `available=false` significa que no existe población comparable o que una anomalía puede alterar la cifra. La interfaz debe mostrar `Sin datos` y no presentar el valor como confiable.
- Los registros eliminados lógicamente no participan.
- Los filtros de Unidad y Negocio se validan contra la empresa autenticada. Un identificador inválido genera error y nunca amplía silenciosamente el alcance.

## Tareas y procesos

| KPI | Fórmula y población |
|---|---|
| Cumplimiento | Tareas programadas en el periodo y completadas a más tardar en `to` / tareas programadas en el periodo. Se reconstruyen creación, finalización y cancelación al corte. |
| Tareas vencidas | Rezago completo con agenda o vencimiento anterior a `to`, creado al corte y no completado ni cancelado al corte. |
| Avance promedio | Promedio de `completion_percent`, limitado a 0-100, para tareas programadas en el periodo. Un corte histórico sin evidencia reconstruible queda no disponible. |
| Sin responsable | Tareas actualmente abiertas con estado `pending`, `in_progress` o `paused` y sin responsable. |

Invalidan las cifras afectadas: tareas abiertas sin fecha, avance fuera de 0-100, estado completado sin `completed_at`, estado cancelado sin `cancelled_at` y cortes históricos que dependen de un avance mutable. Una tarea abierta sin fecha invalida el rezago de vencidas porque no puede clasificarse temporalmente, pero no invalida el cumplimiento ni el avance promedio de la población programada que sí tiene fecha; la anomalía permanece visible en calidad de datos.

## Gastos

| KPI | Fórmula y población |
|---|---|
| Gasto ejecutado | Suma de `total_amount` del periodo con estado `APPROVED`, `PARTIALLY_PAID`, `PAID` o `CLOSED`. Se excluyen borradores, pendientes de aprobación, rechazados y cancelados. |
| Presupuesto consumido | `actual_expense_amount / planned_amount * 100` de presupuestos y líneas activas que se superponen al periodo. Sin presupuesto positivo se publica como no disponible. Si todos los gastos ejecutados del periodo carecen de una línea presupuestaria activa, el KPI también queda no disponible y explica la desconexión en vez de publicar un 0% engañoso. |
| Cuentas por pagar | Suma actual de `balance_amount > 0` cuyo `payment_status` sea `UNPAID`, `PARTIALLY_PAID` u `OVERDUE`, sin restringir la fecha de origen ni depender del estado operativo del flujo. Se excluyen rechazados y cancelados. |
| Pagos vencidos | Parte de cuentas por pagar cuya `due_date` es anterior a la fecha empresarial de corte. Una cuenta abierta sin vencimiento vuelve este KPI no disponible. |

Se verifican importes negativos, la igualdad `balance = max(total - paid, 0)` con tolerancia de 0.01, moneda ISO de tres letras, vigencia del presupuesto y cobertura de los gastos ejecutados por líneas presupuestarias activas.

## Caja chica

| KPI | Fórmula y población |
|---|---|
| Saldo disponible | Suma de `current_balance_amount` de fondos no cerrados. |
| Utilización | `(límite - saldo) / límite * 100` para fondos activos con límite consolidado positivo. |
| Pendiente de comprobación | Suma completa de líneas `DRAFT`, `RECEIPT_ATTACHED` o `VALIDATED`, sin limitar la fecha de origen. |
| Fondos en atención | Fondos `LOW_BALANCE` o `NEEDS_RECONCILIATION`. |

Se controlan límites negativos, comprobaciones pendientes con importe negativo, moneda inválida y falta de evidencia.

## Inventarios

| KPI | Fórmula y población |
|---|---|
| Valor de inventario | Suma actual de `available_quantity * unit_cost` por producto y almacén con control de inventario. |
| Ubicaciones con stock bajo | Combinaciones producto-almacén con existencia positiva menor o igual al mínimo. |
| Ubicaciones agotadas | Combinaciones producto-almacén con existencia disponible menor o igual a cero. |
| Inventario comprometido | `reserved / (available + reserved) * 100`. |
| Movimientos del periodo | Operaciones no canceladas agrupadas por identificador de movimiento dentro del periodo. |

Los alcances heredados guardados como texto se resuelven contra los nombres canónicos de Unidad y Negocio. Cantidades, mínimos, reservas o costos negativos y monedas inválidas invalidan las cifras de existencia afectadas.

## Ventas

| KPI | Fórmula y población |
|---|---|
| Ventas del periodo | Suma de `total_amount` por `sale_date`; excluye estados comerciales `cancelled`, `canceled`, `rejected` y `voided`. |
| Ticket promedio | Venta consolidada / cantidad de operaciones cuya moneda fue consolidada. Las operaciones excluidas por moneda tampoco entran al denominador. |
| Conversión comercial | Oportunidades `won` / oportunidades `won + lost` de la cohorte creada en el periodo. |
| Pipeline ponderado | Suma actual de `estimated_value * probability / 100` de oportunidades abiertas; la probabilidad se limita técnicamente a 0-100 y cualquier valor original fuera del rango invalida el KPI. |

Se controlan ventas sin fecha, importes negativos, monedas inválidas, oportunidades cerradas sin fecha de creación y valores, monedas o probabilidades inválidas en el pipeline. Los pendientes financieros y de inventario son rezagos completos, no sólo actividad del periodo.

## Moneda y tasas de cambio

1. Los importes se agrupan primero en su moneda nativa.
2. Cada subtotal nativo se convierte a la moneda preferida; nunca se suman monedas crudas distintas.
3. Una tasa ausente, no positiva o sin fuente verificable excluye esa moneda y marca el KPI como no disponible.
4. Una fuente `fallback` o `stale`, una fecha cambiaria inválida o una referencia con más de siete días impide `decisionReady=true` cuando hubo conversión.
5. La respuesta conserva monedas excluidas, fecha de tasa y observaciones para auditoría.

## Semáforo de calidad

`dataQuality.decisionReady=true` sólo cuando se cumplen simultáneamente estas condiciones:

- los cinco dominios no contienen anomalías estructurales;
- todos los importes necesarios pudieron consolidarse;
- la evidencia cambiaria relevante es oficial y vigente;
- la lectura completa terminó en una instantánea consistente.

Si alguna condición falla, la cabecera muestra revisión requerida, los dominios afectados explican las observaciones y cada métrica comprometida publica `available=false`. La ausencia de datos no se sustituye con estimaciones ni con conversión 1:1.

## Fuentes físicas

- Tareas y procesos: `process_tasks`.
- Gastos y presupuesto: `finance_expenses`, `finance_budgets`, `finance_budget_lines`.
- Caja chica: `finance_petty_cash_funds`, `finance_petty_cash_settlement_lines`.
- Inventarios: `sales_inventory_balances`, `sales_products`, `sales_inventory_movements`.
- Ventas: `sales_records`, `sales_opportunities`.
- Alcance organizacional: `units`, `businesses`.
- Tasas: instantánea diaria producida por `BusinessExchangeRateService`.

## Criterio de liberación

Una modificación a estas fórmulas requiere actualizar este documento, las pruebas unitarias del contrato, las pruebas SQL contra MySQL y la regresión del panel web. La compilación completa de backend, el `typecheck`, la prueba KPI de interfaz y el build de producción deben pasar antes de publicar.
