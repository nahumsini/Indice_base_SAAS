# Expenses: eliminación, acciones, impresión y modales

Fecha: 2026-09-10. Alcance: implementación y ejecución local, sin despliegue.

## Comportamiento

- Eliminar está permitido en gastos ordinarios de cualquier estado, excepto auditados/cerrados.
- Las órdenes con recepción parcial, total o cantidades recibidas bloquean la eliminación. La validación se realiza también en backend y se serializa con la recepción.
- Los gastos de fondos conservan su administración desde Caja chica; sus agrupaciones no son registros editables.
- Eliminación individual y masiva usan la misma operación con motivo, versión y validación de toda la selección. El registro se conserva con `deleted_at`, historial de pagos, evidencia y auditoría.
- Se compensan únicamente los movimientos de Tesorería existentes, en su cuenta y moneda originales, incluso si la cuenta se desactivó después. No se generan créditos bancarios para pagos históricos sin movimiento bancario.
- Los asientos contabilizados del gasto y sus pagos reciben reversiones vinculadas, balanceadas y con los tipos de cambio originales. Un período contable actual cerrado o una configuración contable indisponible impide toda la operación y revierte la transacción.
- La tabla omite Duplicar e Imprimir, tanto en escritorio como en tarjetas móviles. Imprimir se encuentra en Ver detalle.
- El PDF reutiliza el documento estándar de la orden de compra: folio, estado, datos, totales, tabla de importes y firmas. Muestra fecha del gasto y pago, moneda nativa y nombres resueltos de cuentas. Se corrigió la superposición de fecha y folio en el pie del motor compartido.
- Crear/editar gasto, crear cuenta por pagar y registrar abono incorporan selectores buscables para catálogos grandes, controles de tamaño consistente, resúmenes monetarios claros y secciones opcionales plegables. La moneda elegida en la cuenta por pagar se conserva aunque cambie la preferencia durante la captura.

## Comportamiento conservado

Captura pagada frente a cuenta por pagar, cálculo de impuestos, fechas y moneda de la operación,
correcciones versionadas, validación de unidad/negocio, permisos, CSRF, límites de abonos,
cuentas de custodia y propiedad de Caja chica. El DELETE genérico de borradores permanece restringido;
no puede saltarse la operación de reversión para registros pagados, vinculados o contabilizados.

## Validación

- Backend: 85 pruebas satisfactorias entre ExpenseDeletionIntegrationTest (16), ExpenseCorrectionIntegrationTest (13), ExpenseServiceTest (23), FinanceExpensesControllerTest (7), FinanceBulkActionsIntegrationTest (20) y PaidInventoryReceiptFlowIntegrationTest (6).
- La suite de eliminación se ejecutó nuevamente tras ampliar la comprobación de reversión conjunta de gasto y abonos: 16/16 correctas.
- Frontend: 102 pruebas satisfactorias; incluye ejecución de handlers, preservación de datos ante errores, reglas de acciones y generación real del PDF para MXN, USD, CAD, COP y BRL.
- TypeScript, build Vite y empaquetado Maven correctos. `git diff --check` correcto.
- PDF: renderizado con Poppler y revisión visual de la página de prueba; pie, tabla y firmas sin superposición.
- Local: frontend 5174 y backend 8082 devuelven HTTP 200. El SHA-256 del jar activo coincide con el paquete compilado. Se conserva el jar previo para reversión local.
- Base automatizada: únicamente puerto 13319 / indice_budget_test_db. Backend funcional local: puerto 13320 / indice_budget_preview_20260909.
- Esquema/migraciones nuevas: N/A. Inicio local validó las 268 existentes, sin pendientes ni fallidas.
- Producción/main: N/A en esta entrega; cambios locales sin publicar.

## Fallos resueltos y límites

La primera prueba detectó una comparación de colaciones incompatible al enlazar asientos de abonos;
se corrigió usando la clave numérica. Otra prueba detectó el filtro ACTIVE al compensar una cuenta
inactiva; ahora solo la reversión interna exacta permite esa actualización, sin reactivar la cuenta.
Se actualizaron las regresiones que exigían las reglas anteriores de borrado y botones.

La revisión interactiva en navegador queda pendiente: Browser no encontró navegadores disponibles.
La validación de UI se realizó con regresiones de componentes, TypeScript y compilación, sin afirmar
que se ejecutó una sesión visual completa. Vite conserva avisos de chunks grandes; no impiden el build.
No se ejecutaron operaciones de prueba sobre producción ni se modificó información histórica.

## Archivos cambiados

- `docs/finance-bulk-actions-and-workspace-memory-contract-v1.md`
- `docs/indice-backend-operating-system-v1.md`
- `docs/indice-frontend-operating-system-v2.md`
- `react/package.json`
- `react/src/app/BasicModules/Expenses/Expenses/Expenses.tsx`
- `react/src/app/BasicModules/Expenses/Expenses/components/EditableExpenseRow.tsx`
- `react/src/app/BasicModules/Expenses/Expenses/components/ExpenseDetailModal.tsx`
- `react/src/app/BasicModules/Expenses/Expenses/components/ExpenseMobileCards.tsx`
- `react/src/app/BasicModules/Expenses/Expenses/components/ExpenseTable.tsx`
- `react/src/app/BasicModules/Expenses/adapters/expense.adapter.ts`
- `react/src/app/BasicModules/Expenses/components/modals/ExpenseDeleteModal.tsx`
- `react/src/app/BasicModules/Expenses/components/modals/ExpenseFormModal.tsx`
- `react/src/app/BasicModules/Expenses/components/modals/ExpensePaymentModal.tsx`
- `react/src/app/BasicModules/Expenses/components/modals/PayableAccountDialog.tsx`
- `react/src/app/BasicModules/Expenses/components/modals/QuickProviderField.tsx`
- `react/src/app/BasicModules/Expenses/components/table/ExpenseAccountSelect.tsx`
- `react/src/app/BasicModules/Expenses/components/table/ExpenseRowActions.tsx`
- `react/src/app/BasicModules/Expenses/translations/en-CA.ts`
- `react/src/app/BasicModules/Expenses/translations/es-MX.ts`
- `react/src/app/BasicModules/Expenses/types/expenses.types.ts`
- `react/src/app/BasicModules/Expenses/types/finance-api.types.ts`
- `react/src/app/BasicModules/Expenses/utils/expenseFilters.ts`
- `react/src/app/BasicModules/Expenses/utils/expensePrintDocument.ts`
- `react/src/app/BasicModules/shared/print/documentPdfEngine.ts`
- `react/tests/expense-actions-and-modals-regression.test.mjs`
- `react/tests/expense-corrections-regression.test.mjs`
- `react/tests/expenses-frontend-standard-regression.test.mjs`
- `react/tests/expenses-workflow-regression.test.mjs`
- `src/main/java/com/indice/erp/finance/expenses/ExpenseBulkActionService.java`
- `src/main/java/com/indice/erp/finance/expenses/ExpenseDeletionService.java`
- `src/main/java/com/indice/erp/finance/expenses/ExpenseMapper.java`
- `src/main/java/com/indice/erp/finance/expenses/ExpenseRecord.java`
- `src/main/java/com/indice/erp/finance/expenses/ExpenseService.java`
- `src/main/java/com/indice/erp/finance/expenses/ExpenseSql.java`
- `src/main/java/com/indice/erp/finance/expenses/dto/ExpenseResponse.java`
- `src/main/java/com/indice/erp/finance/reporting/ExpenseAccountingReversalService.java`
- `src/main/java/com/indice/erp/finance/treasury/TreasuryService.java`
- `src/main/java/com/indice/erp/pos/purchaseorder/PurchaseOrderExpensePolicy.java`
- `src/main/java/com/indice/erp/pos/purchaseorder/PurchaseOrderRepository.java`
- `src/main/java/com/indice/erp/pos/purchaseorder/PurchaseOrderService.java`
- `src/test/java/com/indice/erp/finance/expenses/ExpenseDeletionIntegrationTest.java`
- `src/test/java/com/indice/erp/finance/expenses/ExpenseServiceTest.java`
- `src/test/java/com/indice/erp/finance/expenses/FinanceExpensesControllerTest.java`
- `src/test/java/com/indice/erp/finance/pettycash/FinanceBulkActionsIntegrationTest.java`
