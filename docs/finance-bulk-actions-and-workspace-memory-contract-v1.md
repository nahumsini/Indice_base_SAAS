# Finance bulk actions and workspace memory

Decision: 2026-09-08. Expense import/payment extension: 2026-09-09, released as v2026.09.09.3.
Optional import accounts and column fill extension: 2026-09-09, pending deployment.

## Ownership and transaction boundaries

Expenses owns `POST /api/v1/finance/expenses/bulk-actions`. Petty Cash owns
`POST /api/v1/finance/petty-cash/funds/{fundId}/settlement-lines/bulk-actions`.
Both require the module capability, the existing Finance write guard and CSRF, and
derive company, actor and operating scope from the authenticated session. Neither accepts
client-provided authority. Requests contain 1–200 distinct IDs with expected versions.
The entire selection and target reference are validated before mutation. Failures roll
back the operation; a retry with stale versions cannot apply the adjustment twice.

The company row serializes classification with journal synchronization. Petty Cash then
locks the fund, cut, selected receipts and generated expenses. Changes retain actor,
previous values, target values and time in server-owned metadata. No schema migration
or historical data backfill is required.

## Expenses

The selected-row toolbar exposes delete, unit, business, provider, planned payment
account and accounting account. It replaces the previous draft-only toolbar gating.
These are explicit classification adjustments, not generic edits of published expenses.
Ordinary paid expenses can change unit, business, provider or accounting classification
before journal posting. Amounts, taxes, currency, dates, status and payment history remain
unchanged. Source-linked purchase orders, budget lines, fund-origin expenses, posted
journals, and cancelled/rejected/closed expenses require their owning adjustment workflow.

Changing unit clears the previous business and requires company-wide operating scope.
A business must belong to the unit of every selected expense and be inside the actor's
scope. Providers and accounting accounts must be active and company-owned.

Payment account means **planned account for future payments**. The expense must have a
remaining balance. The account must be active, company-owned, match every selected native
currency and not be a fund custody account. This operation does not rewrite recorded
payments or transfer their money. A request to correct the source of an existing payment
requires a separate reversal/rebooking decision.

Delete is soft deletion of unpaid drafts only, with a reason. Paid expenses cannot be
deleted through classification. Their payment reversal remains a separate financial flow.

### Explicit selected-row status actions and paid import (2026-09-09)

`POST /api/v1/finance/expenses/bulk-status` shares the authentication, tenant/scope, tab,
capability, CSRF, company lock, expected-version and atomic-selection protections above.
It accepts a target (`PAID`, `PENDING`, `OVERDUE`), effective date and request key.
Only ordinary open expenses with a remaining balance qualify; fund, budget, purchase-order,
posted and terminal records remain protected. The entire batch is validated before mutation.

- Paid requires one eligible payment account matching every selected native currency and
  a date between each expense date and today in the company timezone. It submits/approves
  open drafts through the expense owner, then pays only the server-calculated remainder.
  Existing installments stay intact. Payment history and Treasury are atomic, with per-row
  idempotency keys; stale selection retries conflict instead of creating duplicate payments.
- Pending sets an explicit due date today or later. Overdue sets one before today. These
  actions preserve expense dates, original amounts and existing partial payments; partial
  expenses remain partially paid when no longer overdue. Previous values and actor are audited.
- Paid expenses require reversal to reopen. A status action never silently removes a payment,
  rebooks its account, manufactures a balance, or modifies a fund's monthly cut.

Bulk entry initially selects paid and lets the user choose pending before importing. The user
decision of 2026-09-09 permits paid imports without a payment account or accounting account.
The import owner records the full payment, native currency, original expense/payment date,
actor and creation timestamp in the existing payment history (`SETTLED_ON_CREATE`), even when
the payment account is null. That explicit unassigned payment never debits a default bank or
creates a Treasury movement. A supplied account must still be eligible; its Treasury movement
and payment history remain atomic. The exception belongs only to import: ordinary payment and
selected-row settlement still require an account. Assigning a bank to a recorded payment later
requires its own explicit correction workflow; generic classification must not rebook it.
Paid rows require an expense date no later than today in the company timezone; pending rows
use a separately selected due date. Selecting
Includes tax treats the captured amount as gross. The import owner derives the included
tax from an explicit fractional rate with BigDecimal and HALF_UP two-decimal rounding;
unchecked rows have zero tax. Existing currency-associated tax profiles supply defaults;
variable rates must be entered explicitly. Currency is fixed for the open capture, and
each account must match it. Legacy import callers without the marker retain their explicit
breakdown. Batch retries reuse actor/payload-bound request evidence and return original IDs.

The create grid headers provide searchable payment/accounting selectors that apply to every
entered row, plus an all/none/mixed tax checkbox. These selections also supply defaults when
new rows are typed or pasted. Explicit spreadsheet cells and individual row edits override
defaults; blank rows are never imported because of a default. Bulk controls respect the open
batch's currency, are disabled during saving and reset on clearing or reopening the capture.
They operate on the capture only; existing records are unchanged until a successful import.

Overdue rows expose quick payment on desktop and mobile through the existing payment modal,
including account selection and partial-payment support. Successful mutations refresh expenses
and payment-account projections; a failed save retains capture and selection. No migration or
automatic rewriting of previously imported records is part of this extension.

## Petty Cash / Balances

Receipt rows support selection and bulk provider/accounting classification or deletion
through the fund owner. Unit/business are inherited from the fund and are not offered.
Payment account is also fund-owned; its toolbar action explains that it cannot be
reassigned per receipt. This preserves custody and avoids presenting a selector which
would only change a label while leaving the money elsewhere.

Every selected receipt must belong to the requested fund and monthly cut. Explicitly
closed cuts, rejected/reversed receipts and posted generated expenses are protected.
Provider/accounting corrections on an authorized internal receipt update its generated
expense in the same transaction, without creating another payment or Treasury movement.
An authorized internal expense must retain an accounting account.

Delete uses the existing audited reversal, with a reason: records and evidence remain,
the fund outflow is reversed once, and cut/budget projections are updated. When reversing
an older open cut, subsequent open cuts receive corrected opening/closing projections.
A later closed cut whose opening would change blocks the entire operation. Carryover is
not a new deposit. The response returns refreshed receipts, fund, cut and affected successors.

The table footer displays totals for the filtered rows and selected rows, across pages.
These are sums of the displayed receipt amounts, including historical rows when explicitly
visible, not a replacement for the backend-owned cash-balance and authorized-expense KPIs.
Currencies are never added together. Selection is transient and is cleared when changing
fund/cut/view, and pruned when records leave the filtered result. Mobile and desktop use
the same selection, actions and totals.

## Workspace memory

All four Petty Cash tabs use `useWorkspaceNavigationMemory`; Expenses retains and validates
its existing filter/table memory. The safe state includes filters, fund/cut IDs, view,
sort and pagination. The module waits for accessible data before resolving stored IDs.
Unknown enum values and inaccessible/dependent references revert to valid defaults.
Clear filters resets pagination to page one. Active advanced filters remain visible.

The shared hook scopes storage to company/user/module/tab, restores only declared fields,
captures explicit URL parameters before asynchronous work, and preserves intervening user
edits. Local persistence covers navigation before the remote-save debounce; edits made
while remote restoration is pending are retained as a partial overlay. Authorization
changes cancel pending writes for the old scope. Storage failures do not block navigation.

Selection, confirmation dialogs, reasons, records, totals, busy state and permissions are
never workspace memory. No alternate storage or modal engine is introduced.

## Release boundary

New changes remain local until their deployment is requested. Validation uses the isolated
regression database, never functional or production company data.
