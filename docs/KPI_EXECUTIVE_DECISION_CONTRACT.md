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

- Personas: `hr_users`, `user_attendance_daily_records`.
- Tareas y procesos: `process_tasks`.
- Gastos y presupuesto: `finance_expenses`, `finance_budgets`, `finance_budget_lines`.
- Caja chica: `finance_petty_cash_funds`, `finance_petty_cash_settlement_lines`.
- Inventarios: `sales_inventory_balances`, `sales_products`, `sales_inventory_movements`.
- Ventas: `sales_records`, `sales_opportunities`.
- Alcance organizacional: `units`, `businesses`.
- Tasas: instantánea diaria producida por `BusinessExchangeRateService`.

## Autoevaluador Índice `diagnosis/1.0`

La primera pestaña conserva `domains/2.1` como evidencia compatible y agrega un contrato hermano
`diagnosis/1.0`. Ambos se calculan dentro de la misma lectura `REPEATABLE READ`. El diagnóstico no
reemplaza las cifras de dominio ni convierte el score ejecutivo histórico en una metodología nueva.

Los cuatro sectores son `people`, `processes`, `products` y `finance`:

- Personas observa regularidad de asistencia sobre jornadas comparables `on_time`, `late` y `absence`;
  la puntualidad usa únicamente jornadas con presencia (`on_time` o `late`). Permisos, descansos,
  pendientes y días no programados no entran al denominador. No se presumen días esperados que el
  sistema no pueda demostrar.
- Procesos usa cumplimiento, rezago vencido y tareas sin responsable de `domains/2.1`.
- Productos usa agotados, stock bajo, venta del periodo y conversión comercial de `domains/2.1`.
- Finanzas usa control presupuestal, pagos vencidos, utilización de caja chica y fondos en atención de
  `domains/2.1`.

Cada regla publica un código estable, fuente, métrica, valor, base temporal, peso, disponibilidad y
módulo responsable. La interfaz localiza su explicación y acción; no inventa reglas de negocio.

La clasificación tipo FODA es deliberadamente interna:

- `strength`: evidencia disponible con estado sano;
- `symptom`: evidencia crítica;
- `opportunity`: evidencia en atención;
- `data_gap`: evidencia ausente, parcial o estructuralmente inválida.

No se presentan factores externos como oportunidades o amenazas sin una fuente externa explícita. Los
patrones entre sectores son hipótesis de revisión producidas por reglas nombradas, no causalidad
demostrada.

El score usa 100 puntos para `healthy`, 60 para `watch` y 25 para `critical`, ponderados sólo entre
reglas disponibles. Un sector requiere al menos 50% de su peso cubierto para publicar score. El score
general requiere score publicable en los cuatro sectores. Un dato ausente reduce cobertura y nunca
recibe cero. `decisionReady=true` exige cobertura mínima de todos los sectores, ausencia de parciales,
calidad íntegra de `domains/2.1` y registros de Personas estructuralmente válidos.

## Matriz de portafolio de productos `portfolio-bcg/1.0`

La primera pestaña agrega el contrato hermano `portfolio-bcg/1.0`, calculado dentro de la misma lectura
`REPEATABLE READ` y con los mismos filtros de empresa, Unidad, Negocio, periodo y moneda preferida. Es
una adaptación interna de la matriz BCG: no representa participación de mercado, no usa datos de
competidores y no debe comunicarse como la matriz BCG clásica sin esta aclaración.

La población se obtiene de los renglones de producto de `sales_records.sale_lines_json`, enlazados al
catálogo vigente `sales_products`. Se excluyen ventas canceladas, rechazadas o anuladas y renglones con
producto inexistente, cantidad negativa, subtotal negativo o descuento fuera de 0-100. La venta neta por
renglón es `subtotal * (1 - discountPercent / 100)`. Los subtotales se consolidan con las mismas reglas de
moneda y evidencia cambiaria de los demás KPI. El inventario de `sales_inventory_balances` es evidencia
complementaria y no altera el cuadrante.

Los ejes y umbrales son explícitos:

- Fuerza relativa = venta neta actual del producto / venta neta actual del líder de su categoría. Es alta
  desde 50%.
- Crecimiento = `(venta neta actual - venta neta anterior) / venta neta anterior`. Es alto desde 0%.
- Un producto sin venta anterior positiva o con importes parcialmente excluidos permanece
  `unclassified`; la ausencia de comparación nunca se convierte en crecimiento cero.
- Los cuadrantes son `star` (fuerza alta, crecimiento alto), `cash_cow` (fuerza alta, crecimiento bajo),
  `question_mark` (fuerza baja, crecimiento alto) y `dog` (fuerza baja, crecimiento bajo).
- El tamaño de la burbuja representa la venta actual del producto / venta total actual del portafolio.

La respuesta calcula totales y resúmenes con toda la población elegible. Para conservar legibilidad, la
visualización contiene como máximo los 40 productos con mayor venta y publica `truncated=true` cuando
aplica. `dataQuality.decisionReady=true` exige renglones atribuibles en ambos periodos, al menos un
producto clasificable, ausencia de anomalías estructurales y conversión monetaria completa y verificable.

## Matrices de decisión `decision-matrices/1.0`

La pestaña Matriz agrega el contrato hermano `decision-matrices/1.0`, calculado dentro de la misma
lectura `REPEATABLE READ` y con el mismo alcance autenticado, periodo y moneda preferida. Estas vistas
son instrumentos internos de orientación: hacen explícita su evidencia, sus umbrales y su calidad, y no
incorporan datos de mercado o causalidad que el sistema no pueda demostrar.

### Salud empresarial

Cruza margen operativo con ejecución observada por Unidad y Negocio. El margen se considera alto desde
10%. La ejecución se considera alta desde 70 puntos y combina cumplimiento de tareas, control del rezago
y asistencia: 65%, 15% y 20% cuando las tres evidencias existen; 80% y 20% para tareas y rezago cuando no
hay asistencia comparable. Sólo se clasifica un elemento con ventas positivas y tareas medidas.

Los cuadrantes son `engine` (margen y ejecución altos), `contained_potential` (ejecución alta y margen
bajo), `fragile_growth` (margen alto y ejecución baja) y `priority_intervention` (ambos bajos). Una mezcla
de monedas de origen se reporta como calidad parcial; nunca se presenta como una consolidación confiable.

### Rentabilidad y rotación de producto

Cruza velocidad diaria de venta con margen de contribución. La velocidad alta es la mediana de los
productos elegibles del periodo y el margen alto comienza en 20%. El costo se obtiene exclusivamente de
`unitCost` capturado en cada renglón de venta; un producto con costo ausente o incompleto permanece
`unclassified`. El margen de contribución es una orientación comercial y no sustituye la contabilidad de
costos.

Los cuadrantes son `winner` (rotación y margen altos), `sacrificed_volume` (rotación alta y margen bajo),
`hidden_gem` (rotación baja y margen alto) y `catalog_drain` (ambos bajos).

### Inventario inteligente

Cruza la velocidad promedio diaria del periodo con la existencia disponible actual. La cobertura se
calcula como `availableQuantity / salesVelocityPerDay`. Menos de 14 días indica `stockout_risk`, entre 14
y 60 días indica `balanced` y más de 60 días indica `overstock`. Una existencia positiva sin venta en el
periodo indica `stagnant`. Los productos sin inventario rastreable permanecen `unclassified`.

Cada matriz publica su propio `dataQuality`. `decisionReady=true` requiere al menos un elemento
clasificable y ausencia de exclusiones o evidencia parcial relevante. Los puntos no clasificables se
conservan para explicar el vacío; la interfaz no completa costos, ventas, tareas, existencias ni monedas
con supuestos.

## Criterio de liberación

Una modificación a estas fórmulas requiere actualizar este documento, las pruebas unitarias del contrato, las pruebas SQL contra MySQL y la regresión del panel web. La compilación completa de backend, el `typecheck`, la prueba KPI de interfaz y el build de producción deben pasar antes de publicar.
