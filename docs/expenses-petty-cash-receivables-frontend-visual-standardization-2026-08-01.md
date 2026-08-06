# Expenses, Petty Cash y Cartera — estandarización visual 2026-08-01

## Estado

Implementación terminada y validada contra `docs/indice-frontend-operating-system-v2.md`.

El alcance fue exclusivamente de presentación frontend. No se modificaron backend, APIs, DTO, rutas, payloads, servicios, cálculos, permisos, persistencia ni reglas financieras.

## Objetivo

Aplicar a Expenses, Petty Cash y Cartera la jerarquía tipográfica aprobada previamente para Inventarios, Ventas y Punto de Venta:

- peso regular para cuerpo, ayuda y metadatos;
- peso medio para títulos, nombres, acciones, etiquetas importantes, valores y estados;
- sentence case para navegación, encabezados y tablas;
- jerarquía mediante escala, color, separación y superficies, no mediante negritas repetidas;
- conservación de contraste, tema oscuro, responsividad y comportamiento operativo.

## Arquitectura y responsabilidad preservadas

```text
react/src/app/BasicModules/
├── Expenses/
│   ├── Expenses/
│   ├── Budgets/
│   ├── Providers/
│   ├── AccountingAccounts/
│   ├── PaymentAccounts/
│   ├── KPIs/
│   ├── Kiosk/
│   └── components/
├── PettyCash/
│   ├── Caja/
│   ├── Control/
│   ├── KPIs/
│   ├── Kiosk/
│   └── components/
└── Receivables/
    ├── views/
    ├── components/
    ├── hooks/
    └── services/
```

- Expenses continúa siendo propietario de gastos, cuentas por pagar, presupuestos, proveedores financieros, cuentas contables y cuentas de pago.
- Petty Cash conserva sus fondos, movimientos, conciliaciones, estados, adjuntos y adaptadores hacia catálogos financieros de Expenses.
- Cartera conserva ventas a crédito, cuentas por cobrar, pagos y políticas de crédito.
- `SalesCrmProvider` permanece como fuente de candidatos comerciales de Cartera.
- `IndiceModuleShell`, `IndiceTitleBar`, `IndiceModalFrame` y Kiosk Engine siguen siendo primitivas de presentación sin lógica de negocio.

## Alcance ejecutado

| Módulo | Fuentes auditadas | Fuentes modificadas | Tokens visuales normalizados |
| --- | ---: | ---: | ---: |
| Expenses | 186 | 36 | 251 |
| Petty Cash | 46 | 19 | 237 |
| Cartera | 38 | 13 | 104 |
| Total | 270 | 68 | 592 |

La comparación automática contra el snapshot previo confirmó que las 68 fuentes solo contienen los reemplazos tipográficos aprobados.

## Inventario de archivos modificados

### Expenses

#### Cuentas contables

- `AccountingAccounts/components/AccountingAccountsHeaderBanner.tsx`
- `AccountingAccounts/components/AccountingAccountsSummary.tsx`
- `AccountingAccounts/components/AccountingAccountsTable.tsx`
- `AccountingAccounts/components/AccountingCatalogImportModal.tsx`

#### Presupuestos

- `Budgets/components/BudgetLinesTable.tsx`
- `Budgets/components/BudgetTableHeader.tsx`

#### Gastos operativos

- `Expenses/components/AttachmentsModal.tsx`
- `Expenses/components/EditableExpenseRow.tsx`
- `Expenses/components/ExpenseMobileCards.tsx`
- `Expenses/components/ExpenseTable.tsx`

#### Cuentas de pago

- `PaymentAccounts/components/PaymentAccountsHeaderBanner.tsx`
- `PaymentAccounts/components/PaymentAccountsSummary.tsx`
- `PaymentAccounts/components/PaymentAccountsTable.tsx`

#### KPI y panorama financiero

- `KPIs/GastosKPIPage.tsx`
- `components/kpis/ExpensesSummary.tsx`
- `components/kpis/FinancialExecutiveSections.tsx`
- `components/kpis/FinancialOverviewPeriodFilter.tsx`
- `components/kpis/KpiPanelParts.tsx`

#### Kiosco y administración

- `Kiosk/PayablesKioskPage.tsx`
- `components/modals/PayablesKioskAccessFormModal.tsx`
- `components/modals/PayablesKioskManagementModal.tsx`

#### Filtros, encabezado y tablas compartidas

- `components/filters/BudgetFiltersPanel.tsx`
- `components/filters/ExpensesFilters.tsx`
- `components/header/ExpensesHeader.tsx`
- `components/table/ExpenseAmountCells.tsx`
- `components/table/ExpenseBulkActionsBar.tsx`
- `components/table/ExpenseInlineControls.tsx`
- `components/table/ExpenseTableHeaderRow.tsx`

#### Formularios y primitivas financieras

- `components/modals/BudgetCreateModal.tsx`
- `components/modals/BudgetTaxControls.tsx`
- `components/modals/ExpenseFormModal.tsx`
- `components/modals/ExpensePaymentModal.tsx`
- `components/modals/FinanceModalPrimitives.tsx`
- `components/modals/PayableAccountDialog.tsx`
- `components/modals/QuickExpenseDialog.tsx`
- `components/modals/QuickProviderField.tsx`

La carpeta `Expenses/Providers` se auditó, pero no necesitó una segunda migración: ya había quedado cubierta como superficie compartida durante Inventarios.

### Petty Cash

- `Caja/Caja.tsx`
- `Caja/components/PettyCashExpenseTable.tsx`
- `Caja/components/UploadPettyCashExpenseModal.tsx`
- `Control/Control.tsx`
- `Control/components/CashFundTable.tsx`
- `KPIs/KPIs.tsx`
- `KPIs/components/PettyCashStatusBar.tsx`
- `Kiosk/PublicPettyCashKioskPage.tsx`
- `Kiosk/components/PettyCashKioskAttachmentsModal.tsx`
- `Kiosk/components/PettyCashKioskBalanceStrip.tsx`
- `Kiosk/components/PettyCashKioskExpenseCard.tsx`
- `Kiosk/components/PettyCashKioskIncomeCard.tsx`
- `Kiosk/components/PettyCashKioskWorkspace.tsx`
- `components/PettyCashFinancialViewWorkspace.tsx`
- `components/PettyCashFundsWorkspace.tsx`
- `components/PettyCashReconciliationWorkspace.tsx`
- `components/PettyCashShared.tsx`
- `components/PettyCashStatementsWorkspace.tsx`
- `components/statements/PettyCashStatementDetailModal.tsx`

### Cartera

- `components/ReceivablesSortableTable.tsx`
- `components/ReceivablesStatusBadge.tsx`
- `components/ReceivablesTableShell.tsx`
- `components/modals/CreditPolicyModal.tsx`
- `components/modals/CreditSaleModal.tsx`
- `components/modals/CreditSaleReadOnlyModal.tsx`
- `components/modals/PaymentModal.tsx`
- `components/modals/ReceivableFilesModal.tsx`
- `constants/receivables.constants.ts`
- `views/AccountsReceivableView.tsx`
- `views/CreditCustomersView.tsx`
- `views/CreditSalesView.tsx`
- `views/PaymentsView.tsx`

## Modales revisados y clasificación conservada

| Propietario | Modal o flujo | Clasificación |
| --- | --- | --- |
| Expenses | Crear/editar gasto | Standard Form |
| Expenses | Gasto rápido | Standard Form |
| Expenses | Registrar pago | Standard Form |
| Expenses | Cuenta por pagar | Standard Form |
| Expenses | Crear presupuesto | Wizard |
| Expenses | Importar catálogo contable | Standard Form |
| Expenses | Adjuntos de gasto | Operational Workspace acotado |
| Expenses | Administrar kioscos de cuentas por pagar | Operational Workspace |
| Expenses | Crear/editar acceso al kiosco | Standard Form |
| Petty Cash | Crear/editar fondo | Standard Form |
| Petty Cash | Administrar kioscos del fondo | Operational Workspace con reemplazo de vistas |
| Petty Cash | Cerrar estado | Confirmation |
| Petty Cash | Depósito/ingreso | Standard Form |
| Petty Cash | Comprobante y operación | Standard Form |
| Petty Cash | Adjuntos | Operational Workspace acotado |
| Petty Cash | Detalle de estado | Vista operativa de solo lectura |
| Cartera | Política de crédito | Standard Form |
| Cartera | Venta a crédito | Standard Form |
| Cartera | Registrar pago | Standard Form |
| Cartera | Detalle de venta | Vista operativa de solo lectura |
| Cartera | Archivos de cuenta por cobrar | Operational Workspace acotado |

No se alteraron anatomía, pasos, validaciones, submit, cierre, estados `busy`, navegación entre vistas ni consecuencias de acciones.

## Kioscos preservados

### Expenses / Cuentas por pagar

- Ruta pública de workspace completo conservada.
- Acceso por PIN de cinco dígitos conservado.
- Identidad de empleado o proveedor conservada.
- Registro anónimo de proveedor conservado cuando la definición lo permite.
- Inscripción, verificación y retiro de consentimiento facial conservados cuando están disponibles.
- Se mantienen `KioskPublicShell`, `KioskIdentityGate` y `KioskModalFrame`.
- Tokens, CSRF, idempotencia, archivos y revisión financiera permanecen bajo los servicios existentes.

### Petty Cash

- Ruta pública de workspace completo conservada.
- Identificación por PIN de cinco dígitos y responsable del fondo conservada.
- Se mantienen `KioskPublicShell`, `KioskIdentityGate` y `KioskWorkspaceTabs`.
- Captura de gasto, ingreso, adjuntos, historial, eliminación y token de identificación no cambiaron.

## Pruebas agregadas

- `react/tests/expenses-frontend-standard-regression.test.mjs`
- `react/tests/petty-cash-frontend-standard-regression.test.mjs`
- `react/tests/receivables-frontend-standard-regression.test.mjs`

Scripts agregados a `react/package.json`:

- `test:expenses-ui`
- `test:petty-cash-ui`
- `test:receivables-ui`

Los candados comprueban:

- ausencia de `font-semibold`, `font-bold`, `font-extrabold` y `font-black`;
- ausencia de uppercase rutinario y tracking amplio;
- conservación de los shells visuales compartidos;
- conservación del Kiosk Engine financiero;
- conservación de `SalesCrmProvider` y el frame compartido de Cartera.

## Validación final

| Verificación | Resultado |
| --- | --- |
| Auditoría exacta de fuentes contra snapshot | Aprobada |
| `test:expenses-ui` | 4/4 |
| `test:petty-cash-ui` | 4/4 |
| `test:receivables-ui` | 4/4 |
| `test:expenses` | 5/5 |
| `test:kiosks` | 10/10 |
| `test:auth` | 2/2 |
| `test:inventory-ui` | 1/1 |
| `test:sales-ui` | 1/1 |
| `test:pos-ui` | 1/1 |
| Validación telefónica | 18 positivas, 6 negativas y prefijos visibles |
| TypeScript | Aprobado |
| Build Vite | Aprobado, 4,525 módulos transformados |
| `git diff --check` del alcance | Aprobado |

## Puntos de retorno locales

| Momento | Ref local | Commit |
| --- | --- | --- |
| Antes de los tres módulos | `refs/codex/backups/pre-expenses-petty-receivables-2026-08-01` | `cf9e78e22cedff84aa041b624f97a97a339d810a` |
| Expenses terminado, antes de Petty Cash | `refs/codex/backups/post-expenses-pre-petty-cash-2026-08-01` | `e8a0b6ad860bb80e0e28e70ca3a5ab0083acf267` |
| Petty Cash terminado, antes de Cartera | `refs/codex/backups/post-petty-cash-pre-receivables-2026-08-01` | `901cf6bf934835879904e4feacc23329ce55aaf2` |
| Cartera terminada, antes del cierre | `refs/codex/backups/post-receivables-pre-final-validation-2026-08-01` | `30135dd1a891fd9ed52ecab3150faabc1b5ff24f` |

`deployment/compose/docker-compose.local.yml` quedó deliberadamente fuera de los snapshots y del alcance de producto.

## Regla para un retorno parcial

Un retorno debe hacerse por módulo y archivo desde el snapshot inmediatamente anterior, sin restablecer todo el repositorio. Esto protege los cambios acumulados de Inventarios, Ventas, POS y los demás módulos existentes en el árbol de trabajo.

## Criterio de cierre

La fase queda cerrada porque los tres módulos usan la jerarquía tipográfica del Frontend Engine V2, conservan sus primitivas y contratos funcionales, pasan las regresiones existentes y nuevas, y generan correctamente el build de producción.

## Addendum de jerarquía UX para Expenses — 2026-08-05

La estandarización tipográfica anterior no resolvía por sí sola la densidad operativa de Gastos. Se adopta la siguiente jerarquía adicional:

- La lista de gastos es un índice resumido; el contexto completo vive en un expediente financiero.
- El expediente reúne resumen de total/abonado/saldo, datos generales, fechas, historial de abonos, evidencia, archivos y trazabilidad.
- Las acciones visibles por fila se limitan a consultar el expediente y registrar abono; las demás se agrupan en un menú contextual.
- El encabezado conserva altas como acciones visibles y agrupa Kiosko CxP y Columnas.
- Las columnas iniciales se reducen a la información de decisión. Impuestos, subtotal, cuenta contable y archivos permanecen disponibles mediante configuración.
- La tarjeta móvil muestra identidad, estado, total y saldo, con acceso directo al expediente; no replica la tabla de escritorio.
- Ningún texto operativo del módulo debe bajar de 12 px.
- Los comprobantes de abono conservan monto, fecha y cuenta de pago, y se presentan como evidencia del abono en el expediente y el modal de archivos.

Estos criterios complementan las reglas de modal y tipografía existentes y deben protegerse con regresiones de flujo y jerarquía.

## Addendum de jerarquía UX para Cartera y Caja Chica — 2026-08-05

La jerarquía aplicada a Gastos se extiende a los otros espacios operativos de Finanzas sin modificar sus contratos de dominio.

### Cartera

- Las cuatro vistas usan un índice móvil compacto en lugar de trasladar la tabla completa al teléfono.
- Las cuentas por cobrar abren un expediente que concentra resumen financiero, datos de la cuenta, calendario de parcialidades e historial de abonos con sus comprobantes.
- Registrar abono permanece como acción directa desde la cuenta y desde el expediente.
- Los comprobantes de abonos se conservan en el historial y continúan disponibles en el modal de archivos.
- Las columnas iniciales priorizan identidad, estado, importes y vencimiento; alcance, configuración financiera y metadatos permanecen disponibles desde Columnas.
- Los KPI visibles se limitan a cuatro decisiones principales; la distribución y las alertas conservan el detalle operativo.

### Caja Chica

- Fondos, operación de saldos, historial de cortes e indicadores financieros presentan tarjetas resumidas en móvil y conservan tablas en escritorio.
- Cada tarjeta muestra identidad, estado y los dos importes prioritarios del contexto; el detalle y la operación siguen accesibles mediante botones de 40 px.
- En Fondos se priorizan Ver detalle y Editar; activar/desactivar y eliminar se agrupan en el menú contextual.
- En Saldos se priorizan evidencia y autorización; copiar, rechazar y eliminar se agrupan como acciones secundarias.
- Los encabezados conservan hasta dos acciones visibles y agrupan proveedor/columnas cuando corresponde.
- El detalle de corte funciona como expediente de solo lectura con resumen, periodo, responsable, estado, movimientos y comprobantes.

En ambos módulos el radio rutinario es `rounded-xl`, las sombras se reservan para capas flotantes y ningún texto operativo baja de `text-xs` (12 px).
