# Expense corrections and individual paid capture

Status: implemented and verified locally. Production deployment: N/A for this task.

## Changed behavior

- Add Expense and quick capture now register a completed payment, using the same
  transactional owner as bulk import. The entered expense date is also the initial
  payment date. An August capture remains in August and has no overdue balance.
- Payment and accounting accounts may remain unassigned, as already approved for
  imports. An unassigned payment records history without inventing a bank debit.
  An assigned account must be eligible and use the native currency. Explicit tax
  breakdowns from the individual form are retained; import checkbox normalization
  does not overwrite them.
- Ordinary unposted registered expenses expose Edit. A new versioned correction
  operation updates their amounts and descriptive/classification fields while
  preserving payment amounts, dates, history, attachments and Treasury movements.
  It records the authenticated actor, timestamp and before/request snapshots,
  increments the version and refreshes linked budget consumption. Corrections do
  not recursively copy prior audit history into subsequent snapshots.
- Batch editing uses the same correction owner and rolls back the entire batch on
  failure. The previous generic PUT endpoint and deletion remain draft-only.
- Explicit quick payment resolves draft/submitted approval and records payment in
  one transaction. Failure rolls back approval; a retry keeps the payment key and
  cannot create a second debit. The modal also blocks concurrent submissions.
- The edit form keeps its values and displays the translated save error. Failed
  inline edits reload the persisted row. Successful modal saves refresh Finance
  and payment-account data.

## Deliberately preserved

Payments are not automatically resized or erased when the expense changes. A
larger corrected total leaves the difference pending; a total below already
recorded payments requires correcting/reversing the excess payment first. Paid
and budget-linked currencies cannot change through this operation. Fund custody,
posted journals, closed/cancelled/rejected records and purchase-order sources
retain their owner protections. Payables and duplicates retain pending creation.

No existing business records were migrated, deleted, or retrospectively marked
paid. This fixes new capture and enables explicit correction of existing records.
Previous local Budget Control work remains present.

## Files

- Backend: `ExpenseCorrectionService`, `ExpenseCorrectionsController`,
  `CorrectExpenseRequest`, `ExpenseImportService`, `ExpenseService`.
- Frontend: Expense form/payment modals, Expenses page/table, expense eligibility,
  expense service and translated API errors.
- Tests: `ExpenseCorrectionIntegrationTest`, `ExpenseOperationsControllerTest`,
  `expense-corrections-regression.test.mjs`, updated existing workflow regressions.
- Canonical Frontend and Backend Operating Systems updated for this decision.
- Schema changes and new migrations: N/A.

## Verification

Automated database tests used only `indice_budget_test_db` on loopback port 13319.

- 69 backend tests passed: correction integration (13), existing expense operations
  integration (31), expense service (23), operation/CSRF guards (2).
- 85 frontend tests passed: Expenses (55, including four new component/service flow
  tests), Expenses UI contract (24), Budget Control (6).
- TypeScript, Vite build, backend compile/package and `git diff --check` passed.
  Vite retains existing chunk-size warnings.
- Authenticated local API flow passed through the Vite proxy with local-mail MFA:
  August paid capture without a bank, replay without duplicate creation, registered
  amount correction, preserved original payment, CSRF denial, stale-version denial,
  remaining-balance payment, idempotent payment retry, and atomic payment of a draft.
- The local linked-budget flow also passed: increasing a test expense by MXN 100
  increased actual consumption by 100 and reduced available budget by 100. Restoring
  its original total restored both budget amounts and retained payment history.
- A negative bank balance also passed the automated payment test. That balance by
  itself does not explain the original production screenshot. No production logs
  or customer data were inspected during this local task.
- The first API verification script expected `total` instead of the existing
  payment-list field `count`; the harness was corrected and resumed from the same
  fixtures without repeating their transactions. All final checks passed.
- No in-app browser was available in this session. Component interaction and API
  checks passed; manual browser/visual verification remains pending.

## Local runtime

Frontend: `http://localhost:5174/expenses/expenses`.
Backend: loopback 8082; isolated preview database: loopback 13320,
`indice_budget_preview_20260909`. Local email inbox: `http://localhost:8025`.
The previous executable is retained for local rollback. Private runtime/fixture
verification is under `/tmp/indice-budget-local/runtime/`; credentials and session
material are not part of the repository.
