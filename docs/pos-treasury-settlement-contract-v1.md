# POS Treasury Settlement Contract v1

Status: approved product decision, 2026-09-05
Owners: Point of Sale for register policy and cuts; Finance for accounts, balances, and movements.

## Objective

Every completed POS collection must have a traceable financial destination. A sale proves the
commercial event; only a captured collection or an approved settlement changes an operational
payment-account balance. Sales keeps its existing collection flow. This contract adds the missing
POS-to-Treasury bridge without making POS the owner of Finance data.

## Domain boundaries

- A payment account answers **where the money is held**.
- A fund answers **for what purpose and under whose custody it is administered**.
- A budget answers **how much may be spent** and never holds money.
- POS owns cash registers, shifts, tickets, payment-method totals, cuts, and each register's
  settlement policy.
- Finance owns payment accounts, the universal cash account, pending and available balances, and
  the append-only account-movement ledger.
- Cross-module writes go through the Finance Treasury owner contract. POS never updates
  `finance_payment_accounts.current_balance` directly.

## Universal cash

Finance provisions one system-managed `UNIVERSAL_CASH` account for every company and currency that
needs it. It is active, cannot be renamed, deactivated, or deleted, and is the default cash
destination. The UI label is `Efectivo universal` plus the currency when disambiguation is needed.

The universal account is a default holding account, not permission to mix currencies, tenants, or
third-party ownership. Funds and later custody subledgers retain their own ownership and purpose.

## Register settlement policy

Each register stores one policy per currency and payment method:

- `CASH`: required destination. Defaults to universal cash but may target another active cash or
  bank account. A bank destination is pending until the physical deposit is confirmed.
- `CARD`: required when enabled. The configured account receives a pending balance at cut and an
  available balance only after settlement confirmation.
- `TRANSFER`: required when enabled. It is available immediately by default because the customer
  transfer is the collection evidence; the policy may require confirmation.
- `WALLET`: required when enabled and pending by default.
- `CREDIT`: creates a receivable and does not change a payment account.

The backend derives the destination from the authenticated company's register policy. A checkout
cannot use a client-provided account to override company policy.

The register also stores a non-negative retained cash target. At cut, the operator counts cash;
the amount delivered to the configured destination is safe drops plus the non-negative amount above
the retained target. The retained amount remains visible in the cut. Overages and shortages remain
explicit and are never clamped away.

## Cut and settlement lifecycle

Closing a shift is one transaction:

1. lock the open shift and calculate authoritative method totals;
2. persist the immutable cut;
3. snapshot the register policy used by that cut;
4. create exactly one settlement per applicable payment method;
5. append idempotent Finance movements;
6. update the account balance projections;
7. close the shift.

Settlement states are `SETTLED`, `PENDING`, `RECONCILIATION_REQUIRED`, and `REVERSED`.

- Immediate destinations append an available-balance movement and finish as `SETTLED`.
- Deferred destinations append a pending-balance movement and remain `PENDING`.
- Confirmation removes the full pending amount and adds the actually received amount to available.
  A difference is retained as a settlement variance and produces `RECONCILIATION_REQUIRED`; it is
  never silently written off.
- A duplicate close or confirmation returns the existing outcome through company-scoped
  idempotency keys and never posts a second movement.
- Corrections and voids append reversals; financial history is not deleted or rewritten.

## Treasury ledger

Every balance change has an immutable movement containing company, account, native currency,
organizational scope, source module/type/id, stable event key, available delta, pending delta,
actor, business timestamp, record timestamp, and optional reversal reference. The account row keeps
`current_balance` and `pending_balance` only as transactionally maintained projections.

Opening balances and legacy current balances receive an explicit baseline movement. Expense
payments, fund movements, and POS settlements use the same owner contract going forward. Expense
payment requests also carry a client-generated idempotency key and lock the expense aggregate so a
network retry or concurrent click cannot register the same installment twice or overpay it.

A fund shortage charged to its responsible collaborator creates an HR-owned external deduction.
It remains pending across future periods, is excluded from automatic payroll calculation, and only
affects pay when a preparer explicitly adds it to that collaborator's draft payroll run. The source
fund statement stays immutable and linked through the deduction reference.

## Existing data and safe rollout

- Existing sales, tickets, payments, cuts, and shifts are never rewritten.
- Existing accounts receive a ledger baseline equal to their current balance.
- Existing registers receive universal cash as the cash destination for each currency observed in
  their shifts. Non-cash methods without an explicit destination use a system-managed pending POS
  account and are marked `NEEDS_REVIEW`. This compatibility policy is provisioned transactionally
  on the first protected prepare, checkout, or cut operation; no read-only endpoint mutates it.
- An already-open shift may close using that compatibility policy. New and edited registers expose
  the policy in their standard configuration modal.
- Historical nullable `pos_payments.payment_account_id` remains readable; new payments store the
  server-resolved destination snapshot.

## Authorization and validation

- Register policy follows the existing POS manage-register capability and tab permission.
- Settlement confirmation requires the POS cuts mutation permission.
- Every account reference is checked for the authenticated company, active status, currency, and
  compatible organizational scope.
- Root and superadmin gain wider scope through the existing access resolver, not through controller
  bypasses.
- Browser mutations retain CSRF enforcement and every query carries `company_id`.

## Frontend behavior

Cash-register create and edit remain Indice Standard Form Modals. They add a `Destino de cobros`
section for one selected currency, with plain-language rows for cash, card, transfer, wallet, and
credit. Cash defaults to universal cash. Enabled methods require a destination before save.

The Accounts workspace shows available, pending, and total balances and identifies system-managed
accounts. POS cuts show the snapshotted destination and settlement state; pending settlements expose
a bounded confirmation form. Production failures show an error and retry path; no financial mock is
used as runtime fallback.
