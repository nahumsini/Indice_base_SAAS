# Budget Control → monthly payables

Decision: 2026-09-10. Owner: Finance / Budget Lines, using the Expense owner for expense creation
and all payment operations. Adopted by the canonical Frontend and Backend Operating Systems.

## Product behavior

- Budget Control already persists one scheduled line per recurrence date. Each eligible line creates
  at most one payable when its scheduled month arrives, using the company's business timezone.
  Future lines remain in Budget Control until then. This contract does not extend a finite schedule
  beyond the recurrence end date chosen by the user.
- The payable retains the scheduled date as expense date and due date, native currency, supplier,
  organizational scope, accounting classification and included-tax breakdown. Creation is DRAFT /
  UNPAID with zero paid amount and no payment date, account debit or Treasury movement. Expenses
  presents it as Pending through the due day. After that day, a positive balance is Overdue,
  including any unpaid remainder after installments. Paid and terminal records remain terminal.
- Abonar and Pagar use the existing Expense payment owner. Payment history, idempotency and
  account validation remain unchanged. Budget actual consumption is refreshed by the existing
  approval/payment lifecycle, not by creating the pending payable. Generation never pays a budget.
- Editing a generated source line does not rewrite the payable, its payments, due date or amount.
  Correct an existing payable through Expenses. Unmaterialized future lines use their latest valid
  budget data. Removing a payable never causes it to reappear on the next synchronization.
- Generic deletion of a budget line with linked expenses is blocked. Existing bulk Budget Control
  protections for financial activity remain in force. Deleting a planned line must not orphan debt.

## Eligibility and reconciliation

Only active, undeleted lines marked `metadata.source = expenses-frontend` are scheduled obligations.
The parent budget must be active and undeleted, contain the due date in its period, have the same
currency, and permit the line's unit/business. Unit and business ownership is checked strictly against
the company; the legacy nullable-company assignment compatibility is not used by this worker.
Amounts use BigDecimal and existing two-decimal rounding. Invalid schedule, amounts, concept,
provider or accounting references create a visible REVIEW outcome, not an incomplete expense.

Reconciliation precedes generation:

1. An existing linked expense resolves the occurrence as EXISTING, including paid, cancelled and
   soft-deleted records. It is neither recreated nor overwritten.
2. Existing actual/committed/custody amounts or legacy paid/audited markers require reconciliation.
3. Pre-rollout lines due before the rollout month are REVIEW / HISTORICAL_RECONCILIATION. Deploying
   the bridge does not manufacture every historical unpaid period. New explicitly backdated lines
   remain eligible. The rollout timestamp is persisted once by V269, not reset on application restart.
4. An unlinked expense with the same normalized concept, currency and organizational assignment
   in the scheduled expense/due month is REVIEW / POSSIBLE_MANUAL_EXPENSE. This conservative
   signal does not automatically attach an expense or change its payments.

The interface exposes the affected line and reason. Reconciliation of ambiguous historical/manual
records is not automated by this release. Corrected invalid lines are retried after their version
changes. Infrastructure failures roll back and remain eligible without a source edit.

## Persistence, authorization and concurrency

`finance_budget_expense_occurrences` has a primary key `(company_id, budget_line_id)`. Existing
`finance_expenses.budget_line_id` is not made unique: ordinary budget consumption may legitimately
link several expenses. The ledger stores the generated/existing expense, scheduled date, outcome,
source version and initiating actor (null for the server worker).

Each occurrence executes in its own transaction, locking the company before the line, following
Expense creation/payment lock order. The Expense owner creates the payable and the occurrence
is recorded in the same transaction. A failure after insertion rolls both back. Multiple servers,
UI retries and scheduled retries cannot create two expenses for one scheduled line. Updates to the
budget source take the same company lock and lock the current line before reading consumption.

- POST `/api/v1/finance/expenses/budget-obligations/synchronize`: authenticated Finance context,
  Expenses capability/tab permission, CSRF and server-resolved scope. No request body or client
  dates, company, actor, amount or status. Returns enabled/generated/reviews.
- GET `/api/v1/finance/expenses/budget-obligations/reviews`: protected, company/scope-filtered read.
- A server scheduler runs with company-derived system context and checks the Expenses entitlement.
  It processes companies and candidate lines in batches of 100, skips future months before locking,
  and isolates failed lines/companies. Default interval and initial delay: 60 seconds.
- Entering Expenses synchronizes before loading rows. The scheduler also catches up missed months
  after downtime without requiring anyone to open the tab. Existing expense data still loads if
  synchronization fails; failure is visible. Tests delay the scheduler and invoke it explicitly.
- `app.finance.budget-obligations.enabled`, mapped from
  `APP_FINANCE_BUDGET_OBLIGATIONS_ENABLED` (default true), disables new generation when false.

## Despliegue y reversión

Esta sección complementa `deployment/README.md`; no sustituye el preflight ni los smoke tests.

1. Ejecutar las pruebas financieras en MySQL aislado, TypeScript, regresiones de Expenses/Budgets y
   build. Validar unicidad de migraciones y arranque Flyway. No usar bases funcionales para pruebas.
2. Conservar imágenes anteriores y respaldo verificable de MySQL y archivos. Registrar versión
   Flyway, conteos e importes por moneda de gastos, pagos, movimientos y líneas antes del cambio.
3. En APPTEST, iniciar con `APP_FINANCE_BUDGET_OBLIGATIONS_ENABLED=false`. V269 agrega solamente
   las dos tablas del puente y su fecha de activación; no modifica gastos, pagos ni presupuestos.
   Confirmar arranque y que el flag efectivo está desactivado antes de continuar.
4. Habilitar el flag y recrear el backend. Revisar el resultado y las partidas REVIEW. Comprobar una
   cuenta pendiente del mes, una vencida, sus abonos y el cambio al siguiente mes usando datos de
   prueba. Repetir la sincronización y comprobar que no aumenta la cantidad de ocurrencias/gastos.
   La generación sola debe dejar intactos los pagos y movimientos bancarios anteriores.
5. En producción, repetir respaldo, flag desactivado, arranque y activación con las imágenes ya
   verificadas. Revisar datos heredados y registrar la comparación antes/después; no rellenar deuda
   histórica por SQL ni eliminar filas existentes para forzar su generación.
6. Para detener nuevas generaciones, desactivar el flag y recrear el backend. Para revertir la
   aplicación, restaurar las imágenes anteriores compatibles y conservar ambas tablas, su fecha
   de activación y las cuentas creadas. No borrar ocurrencias, no revertir V269 y no restaurar una
   base antigua encima de pagos recibidos después del respaldo. Las correcciones de datos pasan
   por el owner de Expenses y su trazabilidad.

Consultas de control de solo lectura (después de V269; acotar a la empresa de la revisión):

```sql
SELECT status, reason, COUNT(*) AS occurrences
FROM finance_budget_expense_occurrences
WHERE company_id = :company_id
GROUP BY status, reason;

SELECT currency_code, COUNT(*) AS expense_count,
       SUM(total_amount) AS total_amount, SUM(paid_amount) AS paid_amount,
       SUM(balance_amount) AS balance_amount
FROM finance_expenses
WHERE company_id = :company_id AND deleted_at IS NULL
GROUP BY currency_code;

SELECT COUNT(*) AS inconsistent_occurrences
FROM finance_budget_expense_occurrences occurrence
LEFT JOIN finance_expenses expense
  ON expense.id = occurrence.expense_id AND expense.company_id = occurrence.company_id
WHERE occurrence.company_id = :company_id AND occurrence.status = 'GENERATED'
  AND (expense.id IS NULL OR expense.budget_line_id <> occurrence.budget_line_id);
```

`inconsistent_occurrences` debe ser cero. Estas consultas no autorizan cambios financieros ni
sustituyen comparar el historial de pagos/movimientos durante la ventana de despliegue.
