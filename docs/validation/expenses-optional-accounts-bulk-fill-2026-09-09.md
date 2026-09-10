# Expenses: optional import accounts and column fill

Status: implemented locally; not deployed. Extends the paid import released in v2026.09.09.3.

## Behavior

- Paid imports accept unassigned payment and accounting accounts and unchecked tax.
- An unassigned payment retains amount, native currency, expense/payment date, actor,
  timestamp and idempotent history. It debits no bank and creates no Treasury movement.
- If a payment account is supplied, its existing company, currency, active-status and
  fund-custody validations remain; its debit and payment evidence are atomic.
- Ordinary payment endpoints and selected-row settlement still require a payment account.
- Create-grid account selectors apply to all entered rows. A header tax checkbox supports
  all, none and mixed selection. Defaults also apply when more rows are typed or pasted.
- Explicit spreadsheet cells and individual edits override defaults. Empty rows remain
  excluded. Save/retry behavior, the 200-row limit and native currency are preserved.

## Implementation

- `ExpenseImportService` calls the dedicated import entry point in `ExpenseService`.
  The generic create path does not receive the optional-bank exception.
- `ExpenseBulkIntegrationModal` owns capture defaults and header actions, using the existing
  searchable account selector and `IndiceModalFrame` operational-workspace shell.
- Backend, frontend and Finance bulk canonical documents record the revised owner contract.
- Schema changes: N/A. Production writes and historical record rewrites: N/A.

## Verification

The backend used a new disposable MySQL database, `indice_expense_capture_test_db`, exposed
only on loopback port 13318. Functional and production databases were not used for tests.

- `ExpenseOperationsIntegrationTest`, `ExpenseServiceTest`, `ExpenseOperationsControllerTest`:
  56 passing tests, including five currencies, unassigned accounts, original payment dates,
  tax independently of account selection, retries, mixed batches and transaction rollback.
- `FundExpenseCloseoutIntegrationTest`, `AccountingForeignCurrencyIntegrationTest`,
  `FinanceExpensesControllerTest`: 9 passing regression tests.
- `npm run test:expenses`: 51 passing tests, including 35-row header fill, individual
  overrides, spreadsheet override/clear semantics and defaults that do not create blank expenses.
- `npm run test:expenses-ui`: 24 passing tests.
- `npm run typecheck`, `npm run build`, `git diff --check`: passed.

A static UI assertion initially expected the paste instructions directly in the modal source.
It now checks the localized copy and its use by the modal; the rerun passed. The build retains
the existing large-chunk warning. Browser discovery returned no available browsers, so manual
visual inspection was unavailable; component interaction and standard regression tests passed.

## Release limits

No migration is required. Existing payment dates, amounts, account balances and fund records
are not rewritten. A later bank assignment to an already recorded unassigned payment requires
an explicit correction workflow, not a generic account-label change. Deployment and visual
verification in the target environment remain separate release steps.

## Release preflight follow-up

The first full VPS preflight ran after UTC midnight while the company date was still
the preceding day. Three existing bulk-status assertions used the JVM date and
therefore sent a future payment date or a non-overdue due date. The fixture now
uses the same company timezone resolver as the business service. Production date
validation is unchanged. The failed evidence is retained and the complete preflight
must pass again on the updated release candidate before activation.
