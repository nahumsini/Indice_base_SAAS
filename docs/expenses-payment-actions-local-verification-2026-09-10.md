# Expense payment actions — local verification, 2026-09-10

## Requested behavior

Pending, overdue and partially paid ordinary expenses expose Abonar and Pagar independently.
Abonar opens the payment form. Pagar invokes the settlement owner directly: it calculates the
remaining balance while holding the company and scoped expense locks, adds one final installment,
and uses today's company business date. Existing installments, their dates and bank assignments,
the expense date, original currency and total remain unchanged.

Direct settlement uses the expense's assigned payment account. If unassigned, it follows the
existing paid-capture rule: payment history records the unassigned payment and Treasury moves no
bank balance. Supplied accounts are validated; the system never selects an arbitrary bank.
Ordinary partial payments and the modal's Liquidar action retain the existing account requirement.
Liquidar submits the remaining balance with the account/date chosen in the modal, regardless of
whether the amount field is blank or contains a partial amount. Evidence remains optional.

The form uses the existing Índice modal frame with native-currency metrics, a payment-progress bar,
searchable account selection, a compact optional attachment area, and distinct projected expense
and bank balances. Errors preserve captured fields. Both submit actions share an in-flight guard.
Direct settlement preserves retry identity; backend idempotency prevents another final payment.
Bank balances refresh from the owner rather than subtracting an optimistic amount on every retry.
A secondary budget-refresh failure cannot present a committed payment as failed.

## Implementation

- `react/src/app/BasicModules/Expenses/Expenses/Expenses.tsx`: separate settlement callback,
  payment-account refresh and payment-result handling.
- `Expenses/components/{ExpenseTable,EditableExpenseRow,ExpenseMobileCards}.tsx` and
  `components/table/ExpenseRowActions.tsx` in the Expenses module: separate actions, protected
  states, progress and duplicate-click protection on desktop/mobile.
- `components/modals/ExpensePaymentModal.tsx`, `services/expenses.service.ts`,
  `utils/expenseFilters.ts`, `translations/{types,es-MX,en-CA}.ts`: modal, localized copy and owner API.
- `src/main/java/com/indice/erp/finance/expenses/{ExpenseService,FinanceExpensesController}.java`
  and `dto/SettleExpensePaymentRequest.java`: protected CSRF-checked settlement endpoint; exact
  server-owned balance/date and transactional payment reuse. The reserved SETTLE: key prefix
  cannot be submitted through the ordinary installment endpoint.
- Canonical frontend/backend documents record the payment-action decision. Existing removal,
  printing, correction, import and fund work in the dirty worktree is preserved.

## Verification

Backend, isolated MySQL on port 13319 only: 93 tests, no failures or skips:

- ExpenseCorrectionIntegrationTest: 25 (including five native currencies, partial then final
  payment, unassigned draft settlement, original payment preservation, bank balance, retries,
  concurrent identical requests, foreign/inactive/currency/fund-account rejection, terminal states).
- ExpenseServiceTest: 23.
- FinanceExpensesControllerTest: 9 (including settlement write/CSRF guard and denied access).
- ExpenseDeletionIntegrationTest: 16.
- FinanceBulkActionsIntegrationTest: 20.

Frontend: `npm run test:expenses` (69), plus the existing frontend-standard and Finance bulk-action
regressions (30): all 99 passed. The new payment-action suite executes actual form/table handlers
with the repository hook harness and checks service payloads, retry behavior and account eligibility.
`npm run typecheck`, `npm run build`, Maven compile/package and `git diff --check` passed.
The existing large-bundle build warning remains; no new compilation errors remain.

Visual/interactive QA: the app browser had no available connection. A separate headless browser
rendered the actual component with synthetic fixtures on localhost:5191. Eight checks passed:
desktop layout, settlement from an empty amount, one payment on double click, optional evidence,
error preserving amount, account search, mobile without horizontal overflow, and accessible footer
buttons. Mobile dialog width was 358px at a 390px viewport. Screenshots were visually reviewed at
`/tmp/indice-payment-qa/payment-desktop.png` and `payment-mobile.png`.
This is isolated component QA plus backend integration coverage, not a production browser test.

## Local runtime and release scope

Frontend remains at localhost:5174. Backend is updated at localhost:8082 using a distinct
`/tmp/indice-budget-local/runtime/indice-expense-payments.jar`; the prior jar remains available
for rollback. The local runtime is checked against its existing functional database on port 13320.
Tests never use that functional database or production.

Schema migrations: N/A. Production mutations/deployment: N/A. Commit/push to main: N/A.
