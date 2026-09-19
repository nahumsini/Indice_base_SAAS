# Petty Cash Operational Fund Contract

This contract defines the operational model shared by Petty Cash and Expenses. It extends the
[Backend OS](../../../../../../docs/indice-backend-operating-system-v1.md).
For the surrounding domain, start with the [Domain Map](DOMAIN_MAP.md).

Specific approved extensions govern [statement closing and authorization without attachments](../../../../../../docs/petty-cash-statement-close-resolution-contract-v1.md),
[managed assets](../../../../../../docs/petty-cash-managed-assets-contract-v1.md), and
[prospective fund classification](../../../../../../docs/petty-cash-fund-classification-stages-v1.md).
«Supported» or «backed by evidence» below includes the explicit authorization path in the closing
contract; it does not impose an unconditional file requirement. Implementation and deployment
must be verified for the affected flow and version.

## Decision

Petty Cash is a controlled operational fund assigned to a responsible user.

Petty Cash is not an Expense.

An internal company fund becomes a source of Expenses only when an administrator authorizes a settlement line backed by evidence.

An external managed fund records third-party money. Its receipts are validated for the client statement, but never create company Expenses, consume company budget, or feed company accounting KPIs.

Funding, deposits, returns, shortages, and carry-forward movements are fund movements. They must not be counted as Expenses.

## Core Principle

```text
Internal company fund -> Statement / Cut-Off -> Settlement Lines -> Company Expenses
External managed fund -> Statement / Cut-Off -> Validated client statement (no company Expense)
```

The fund holds operational money.

The statement controls one period.

Settlement lines validate receipts.

Expenses are created only from supported settlement lines belonging to internal company funds.

In the company Expenses workspace, origin is resolved from the same-company settlement line
relationship, with a same-company payment account of type `PETTY_CASH` linked to exactly one fund
as a legacy fallback. Ordinary bank, cash or card accounts do not identify fund origin, even when
historical funds reference them; they remain available for ordinary expense imports. An ambiguous
custody account never selects an arbitrary fund. Historical `PETTY_CASH` audit markers still block
reclassification when the source cannot be resolved. Client-provided source
metadata does not authorize or identify a fund. The accounting-account column shows the source fund
name and is locked; full expense editing and account-only reclassification must reject fund expenses.
Legacy expenses linked to external managed funds are excluded from company Expenses list/detail
queries without deleting or rewriting those records. Historical closed/deleted funds retain their
identity for this purpose.

### Expenses presentation by fund

Authorized internal-fund expenses (`PAID`/`CLOSED`) collapse into one display row per fund and native
currency after the selected expense-date period and other row filters have been applied. The period
is the Expenses filter, not the statement's authorization/closing month. Each group retains all
receipt IDs and offers a read-only breakdown; it is never a new Expense, payment, or journal source.
Ordinary expenses retain their existing actions. Reversed/cancelled sources are not described as
authorized spend. External funds, funding movements and unapproved receipts do not enter a group.

The existing KPI monetary-aggregate service supplies native totals for the filtered original IDs,
including subtotal, taxes, total, paid-to-date and balance. Grouping does not alter KPI recognition,
receipt classification, exports, source dates, or treasury movements. Groups are not bulk mutation
targets. Different classifications display as multiple accounts and remain visible per receipt.
The existing Petty Cash control route accepts an optional `fundId` selection, validated against the
already authorized fund catalog; it does not grant access to that fund or bypass permissions.

## Fund Classification

Every fund has one explicit and persistent type:

- `INTERNAL_COMPANY`: administers company money. It requires a Budget and a Budget Line. Authorized receipts become company Expenses and update the linked budget.
- `EXTERNAL_MANAGED`: administers client or third-party money. It requires owner/client identity and a statement recipient. Managed assets are optional. It must not reference company budgets.

Both types require one active, same-currency Payment Account as the custody account. That account
answers where the fund balance is held. It does not answer who owns the money or where a later
deposit originates.

Product decision, 2026-09-10: fund forms do not configure funding or spending method checklists and
do not choose a permanent funding origin. Every deposit chooses its actual origin. Internal funds
accept an active company Payment Account. External funds accept the same company accounts and add
**Medios externos**, which requires a named origin. A company source account must belong to the
authenticated company, match the fund currency and differ from its custody account. New deposits
derive `fundingMethod` as `INTERNAL_TRANSFER` or `EXTERNAL_MEDIA` from that choice. Legacy
`fundingMethods`, `spendingMethods` and default-source fields remain readable for API compatibility.
New funds and new classification stages store them empty. Ordinary edits preserve hidden legacy
values so a harmless edit never erases historical configuration; historical movements remain
unchanged.

Returning a positive balance at statement close also chooses its destination in that closing
operation. Both fund types may return to an active same-currency company Payment Account other
than custody. External funds may instead choose **Medios externos** and record the named recipient.
The backend validates the destination against the authenticated company before changing either
balance. Saved default-source fields are used only as a compatibility fallback for older clients.

Currency and the custody account are immutable after the first financial activity. Fund type can
change only through the prospective, audited type-stage operation defined in
`docs/petty-cash-fund-classification-stages-v1.md`. A change preserves the fund ID, currency,
custody account and exact balance; it never rewrites earlier statements, receipts or Expenses.

The application does not connect Sales directly to Funds. External fund entries are captured as fund movements with the origin and statement description needed for accountability.

Legacy funds remain readable and operable. Legacy records inferred as external without complete identity are marked `externalIdentityPending`; they may be edited without data loss, and the UI asks the administrator to complete their identity. New external funds must be complete.

## Shared Finance References

Petty Cash must not create duplicate catalogs.

It consumes the same Finance references used by Expenses:

- Providers come from Finance Providers.
- Deposit sources come from Finance Payment Accounts. External funds additionally support
  Medios externos, recording an explicit source name without inventing a company account.
- The actual receipt or movement records its route. Fund configuration does not maintain an
  allowed-method checklist.
- Receipt accounting classification comes from active Finance Accounting Accounts.
- The budget relationship is required only for internal funds and represents planned company cost. It is never interpreted as money already deposited in the fund.

The frontend may show the fund limit as "presupuesto del fondo", but the backend model should persist it through a `Budget` / `BudgetLine` relationship so Expenses and Financial Overview can see the same amount.

Kiosk access is enabled per Petty Cash Fund, but authentication uses the collaborator universal PIN. Petty Cash should not store a separate fund PIN.

## Aggregate Boundary

### PettyCashFund

The fund is the permanent operational cash container.

Examples:

- Maintenance petty cash
- Front desk petty cash
- Restaurant petty cash

The fund owns:

- explicit fund type
- responsible user
- payment account with type `PETTY_CASH`
- unit and business scope
- currency
- internal budget control relationship / spending ceiling, when applicable
- external owner/client and statement recipient, when applicable
- optional managed asset identity
- current balance
- status
- cut-off policy

The fund does not own actual business spend. Its balance can be positive, zero, or negative; a negative value means the fund spent before receiving enough funding and must not be silently clamped to zero.

### PettyCashStatement

The statement is the monthly cut-off and accountability document. On the first access in a new month, the previous open period becomes pending cut and the current month is opened with the fund's carried balance.

Examples:

- Maintenance petty cash - 2026-06
- Restaurant petty cash - 2026-06

The statement owns:

- opening balance
- assigned amount
- additional deposits
- declared closing balance
- estimated usage
- verified expense amount
- returned amount
- shortage amount
- carry-forward amount
- period start
- period end
- cut-off date
- settlement status
- traceable prior statement as the source of the opening balance
- immutable fund-type, owner/client, recipient and managed-asset snapshots used to reproduce historical statements
- immutable financial-configuration snapshot and type-stage identity used when a fund changes type

### PettyCashMovement

The movement records money moving between payment accounts or changing the statement balance.

Movement examples:

- initial funding
- additional deposit
- return to bank
- carry-forward to next statement
- shortage adjustment
- forgiven shortage adjustment
- employee charge

Movements are not Expenses. Entries also retain their business category, counterparty, client-facing statement description, funding method and internal note.

### PettyCashSettlementLine

The settlement line is the receipt-level proof.

Rule for an internal company fund:

```text
1 receipt = 1 settlement line = 0 or 1 Expense
```

A settlement line may create an Expense only when it belongs to an internal company fund and has the required amount, date, accounting account, company scope, and at least one supporting document. Authorization creates a paid Expense and preserves the fund, statement, and settlement-line relationship.

For an external managed fund, validation changes the line to `VALIDATED`, contributes to the verified statement total and creates no Expense.

The Expense payment account is always the payment account assigned to the originating fund. The user cannot substitute another payment account during authorization.

## Monthly lifecycle

```text
previous closing balance
  -> current opening balance
  + funding movements
  - captured purchases
  = current fund balance (may be negative)
```

- A fund is permanent; a statement is monthly.
- A statement is opened for every active fund, including funds without a budget.
- A purchase reduces the fund and its payment account when captured.
- Validation does not subtract cash a second time. For internal funds it converts the supported line into an Expense; for external funds it finalizes the line only for the client statement.
- The `Cortes` tab is the auditable history for opening balance, funding, captured purchases, authorized expenses, closing balance, and prior-cut origin.

## Core Entities

### PettyCashFund

Fields:

- id
- companyId
- unitId
- businessId
- budgetId
- budgetLineId
- paymentAccountId
- responsibleUserId
- fundingSourcePaymentAccountId (legacy compatibility default; not configured by current forms)
- fundingSourceName (legacy compatibility default; not configured by current forms)
- fundType
- externalOwnerType
- externalOwnerName
- externalOwnerRelationship
- externalOwnerReference
- statementRecipientEmail
- managedAssetType
- managedAssetName
- managedAssetReference
- externalIdentityPending
- name
- currencyCode
- limitAmount
- currentBalanceAmount
- cutOffDay
- fundingMethods (legacy compatibility only)
- spendingMethods (legacy compatibility only)
- kioskEnabled
- kioskUsesUniversalPin
- kioskAccessToken
- status
- createdByUserId
- updatedByUserId
- createdAt
- updatedAt
- deletedAt
- customFields
- metadata

### PettyCashStatement

Fields:

- id
- companyId
- unitId
- businessId
- pettyCashFundId
- fundTypeSnapshot
- periodKey
- periodStart
- periodEnd
- cutOffDate
- openingBalanceAmount
- assignedAmount
- additionalDepositAmount
- declaredClosingBalanceAmount
- estimatedUsageAmount
- verifiedExpenseAmount
- returnedAmount
- shortageAmount
- forgivenShortageAmount
- employeeChargeAmount
- carryForwardAmount
- currencyCode
- status
- responsibleUserId
- reviewedByUserId
- closedByUserId
- createdByUserId
- updatedByUserId
- createdAt
- updatedAt
- deletedAt
- customFields
- metadata
- externalOwnerTypeSnapshot
- externalOwnerNameSnapshot
- externalOwnerRelationshipSnapshot
- externalOwnerReferenceSnapshot
- statementRecipientEmailSnapshot
- managedAssetTypeSnapshot
- managedAssetNameSnapshot
- managedAssetReferenceSnapshot

### PettyCashMovement

Fields:

- id
- companyId
- unitId
- businessId
- pettyCashFundId
- pettyCashStatementId
- fromPaymentAccountId
- toPaymentAccountId
- externalSourceName
- entryCategory
- counterpartyName
- statementDescription
- fundingMethod
- internalNote
- type
- amount
- currencyCode
- movementDate
- reference
- createdByUserId
- createdAt

### PettyCashSettlementLine

Fields:

- id
- companyId
- pettyCashFundId
- pettyCashStatementId
- expenseId
- providerId
- accountingAccountId
- description
- receiptReference
- subtotalAmount
- taxAmount
- totalAmount
- currencyCode
- expenseDate
- attachmentIds
- status
- createdByUserId
- updatedByUserId
- createdAt
- updatedAt
- deletedAt

## Status Contract

### PettyCashFundStatus

- `OPEN`
- `LOW_BALANCE`
- `NEEDS_RECONCILIATION`
- `CLOSED`

### PettyCashStatementStatus

- `OPEN`
- `CUT_PENDING`
- `PARTIALLY_SETTLED`
- `SETTLED`
- `SHORTAGE`
- `FORGIVEN_SHORTAGE`
- `CHARGED_TO_EMPLOYEE`
- `CLOSED`

Carry-forward is not a primary status. It is a closing result stored in `carryForwardAmount` and represented by a movement.

### PettyCashMovementType

- `INITIAL_FUNDING`
- `ADDITIONAL_DEPOSIT`
- `RETURN_TO_SOURCE`
- `CARRY_FORWARD`
- `SHORTAGE_ADJUSTMENT`
- `FORGIVEN_SHORTAGE`
- `EMPLOYEE_CHARGE`

For `INITIAL_FUNDING`, `ADDITIONAL_DEPOSIT`, and `RETURN_TO_SOURCE`, the origin/destination follows
the fund classification. Internal company funds use the selected company Payment Account and create
a two-sided Treasury transfer. External managed funds can also use a selected company account,
which creates the same two-sided transfer. Medios externos creates a one-sided entry on the fund
account and retains the external source name. Each movement chooses exactly one route; supplying
both an account and an external source is rejected. A return on closing uses the fund's configured
source account, or the named external origin when no source account is configured. Opening balances
use the same route. All money changes occur within the existing transactional fund/Treasury use case;
external classification continues to exclude company Expenses and budget consumption.

### PettyCashSettlementLineStatus

- `DRAFT`
- `RECEIPT_ATTACHED`
- `VALIDATED`
- `EXPENSE_CREATED`
- `REJECTED`
- `REVERSED`

`REVERSED` is terminal and auditable. Reversing a purchase restores the fund through an opposite
Treasury movement, preserves its evidence and cancellation metadata, and cancels—without deleting—
any Expense generated from that settlement line. A second reversal must be rejected.

## Money Rules

Estimated usage:

```text
estimatedUsageAmount =
  openingBalanceAmount
  + assignedAmount
  + additionalDepositAmount
  - declaredClosingBalanceAmount
```

Settlement balance:

```text
settlementBalance =
  estimatedUsageAmount
  - verifiedExpenseAmount
  - returnedAmount
  - shortageAmount
```

For internal funds, verified expense amount is the sum of settlement lines that created or linked Expense records. For external funds, the same statement field is the verified outflow total and has no company accounting meaning.

Petty Cash must use one currency per fund and per statement.

## Fund Administration Rules

The Funds workspace administers permanent fund configuration.

It owns:

- explicit fund classification
- fund name
- responsible user
- creating user
- unit and business scope
- payment account with type `PETTY_CASH`
- funding source: a created company Payment Account; external funds can instead select Medios externos and name the origin
- owner/client, statement recipient and optional managed assets for external funds
- allowed spending methods
- operational limit
- cut-off day
- kiosk access settings

Creating a fund does not create an Expense.

Creating a fund does not consume budget. Internal budget impact occurs through actual authorized receipts, not the fund limit or funding deposits.

Creating a fund may create or link a PaymentAccount of type `PETTY_CASH`.

## Fund Operation Rules

The Fund Operation workspace is for the responsible user or authorized operator.

It should be simpler than Expenses and focused on:

- selecting an assigned fund
- entering money into the fund
- registering cash outflows with receipt support
- attaching receipts, tickets, invoices, or supporting files
- seeing current balance, entries, exits, and pending reconciliation

Operational entries are PettyCashMovements.

Operational exits with proof are PettyCashSettlementLines.

Entering money increases fund balance.

Uploading a receipt reduces operational balance. It does not create an Expense until an internal-fund receipt is authorized; an external-fund receipt is only validated for its statement.

The basic receipt capture should stay compatible with Expenses:

- providerId
- accountingAccountId
- description
- receiptReference
- subtotalAmount
- taxAmount
- totalAmount
- currencyCode
- expenseDate
- attachmentIds

This allows an internal supported settlement line to become an Expense without re-entering core data. External receipts may omit company accounting classification because they never enter company accounting.

## Kiosk Rules

Kiosk access belongs to a specific PettyCashFund.

The kiosk should expose only the limited operation needed by the assigned responsible user:

- view assigned fund
- enter money when allowed
- upload receipt
- view recent entries and receipts
- never edit company-wide Finance configuration

Kiosk access should require:

- fund-specific link or access token
- PIN
- company scope validation
- fund scope validation
- active fund status

Kiosk PIN must be stored hashed in backend, never as plain text.

Kiosk does not replace the normal authenticated ERP session. It is a narrow operational entry point for assigned fund work.

## Expense Rules

Petty Cash itself never becomes an Expense.

Only a supported settlement line from an internal company fund can create or link an Expense.

An external managed fund must never create or link a company Expense, even when its receipt is validated.

The created Expense should preserve traceability:

- `source = PETTY_CASH`
- `pettyCashFundId`
- `pettyCashStatementId`
- `pettyCashSettlementLineId`

The backend must prevent the same settlement line from creating more than one Expense.

## Payment Account Rules

Petty Cash uses a `PaymentAccount` with type `PETTY_CASH`.

Funding movements affect PaymentAccount balances.

Funding movements do not create Expenses.

Examples:

```text
BANK -> PETTY_CASH_ACCOUNT
PETTY_CASH_ACCOUNT -> BANK
PETTY_CASH_ACCOUNT -> NEXT_STATEMENT_CARRY_FORWARD
```

## Budget Rules

Internal company funds need two budget views:

- verified expense: actual Expenses created from validated receipts
- estimated expense: operational usage pending reconciliation

Recommended available budget views:

```text
accountingAvailable =
  plannedAmount
  - committedAmount
  - verifiedExpenseAmount
```

```text
operationalAvailable =
  plannedAmount
  - committedAmount
  - verifiedExpenseAmount
  - pendingPettyCashEstimatedAmount
```

Estimated usage should affect operational visibility, not accounting expense totals.

When an internal settlement line creates an Expense, that amount moves from estimated/pending exposure into verified expense.

External managed fund activity is excluded from company planned, committed, spent and available budget totals.

## Financial Overview Rules

Financial Overview should distinguish internal company-fund activity:

- verified petty cash expenses
- estimated petty cash usage
- pending reconciliation
- shortages
- forgiven shortages
- employee charges
- upcoming cut-offs

External managed fund movements and verified outflows remain operational statement information and are excluded from company accounting KPIs.

Shortages should not automatically become Expenses.

If a shortage is forgiven, it may create an adjustment according to accounting policy.

If a shortage is charged to an employee, it should become an employee receivable or payroll deduction path, not a normal operating Expense.

## Cut-Off Rules

Petty Cash supports automatic monthly cut-off.

Each fund may define:

- cut-off day
- default statement period
- default responsible user
- default review policy

At cut-off, the system generates a PettyCashStatement.

The responsible user declares closing balance and attaches receipts.

The statement can be closed only after the settlement outcome is known.

## Carry-Forward Rules

Carry-forward remains linked to the original fund.

The next statement should reference the previous statement when carrying a balance forward.

Recommended fields:

- previousStatementId
- carryForwardAmount
- openingBalanceAmount

## User Rules

A user may manage multiple Petty Cash funds when permissions allow it.

Each fund still needs:

- responsibleUserId
- company scope
- unit scope
- business scope
- clear limit

Multiple funds for one user should be visible in KPIs and control alerts.

## Attachment Rules

Settlement receipt attachments are required before creating an Expense.

Attachment ownership must support:

- `PETTY_CASH_FUND`
- `PETTY_CASH_STATEMENT`
- `PETTY_CASH_SETTLEMENT_LINE`
- `EXPENSE`

## API Contract

Backend endpoints are shaped around the aggregate:

- list funds
- create fund
- update fund
- close fund
- configure fund kiosk
- list statements
- create or generate statement
- declare statement closing balance
- add movement
- add settlement line
- validate settlement line
- create expense from settlement line
- close statement
- carry forward statement balance

## Non-Goals

This fund classification change does not:

- change existing Expenses status behavior, including MCP-created Expense drafts
- connect Sales directly to Funds
- replace backend authorization, tenant scope, CSRF, sessions, or cookies
- hard-delete financial or audit history
