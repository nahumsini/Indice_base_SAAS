# Petty Cash Operational Fund Contract

This contract defines the implemented operational model shared by Petty Cash and Expenses.

## Decision

Petty Cash is a controlled operational fund assigned to a responsible user.

Petty Cash is not an Expense.

Petty Cash becomes a source of Expenses only when an administrator authorizes a settlement line backed by evidence.

Funding, deposits, returns, shortages, and carry-forward movements are fund movements. They must not be counted as Expenses.

## Core Principle

```text
Petty Cash Fund -> Statement / Cut-Off -> Settlement Lines -> Expenses
```

The fund holds operational money.

The statement controls one period.

Settlement lines validate receipts.

Expenses are created only from validated settlement lines.

## Shared Finance References

Petty Cash must not create duplicate catalogs.

It consumes the same Finance references used by Expenses:

- Providers come from Finance Providers.
- Internal funding sources come from Finance Payment Accounts. External custody or third-party
  money records an explicit source name and does not invent a company account.
- Spending/payment methods are constrained by the fund configuration and payment account capabilities.
- Receipt accounting classification comes from active Finance Accounting Accounts.
- The optional budget relationship is a spending ceiling. It is never interpreted as money already deposited in the fund.

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

- responsible user
- payment account with type `PETTY_CASH`
- unit and business scope
- currency
- optional budget control relationship / spending ceiling
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

Movements are not Expenses.

### PettyCashSettlementLine

The settlement line is the receipt-level proof.

Rule:

```text
1 receipt = 1 settlement line = 0 or 1 Expense
```

A settlement line may create an Expense only when it has the required amount, date, company scope, and at least one supporting document. Authorization creates a paid Expense and preserves the petty-cash fund, statement, and settlement-line relationship.

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
- Authorization does not subtract cash a second time; it converts the supported settlement line into an Expense.
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
- fundingSourcePaymentAccountId
- fundingSourceName
- name
- currencyCode
- limitAmount
- currentBalanceAmount
- cutOffDay
- fundingMethods
- spendingMethods
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

For `INITIAL_FUNDING`, `ADDITIONAL_DEPOSIT`, and `RETURN_TO_SOURCE`, the origin/destination is
exclusive: either an internal Payment Account or an explicit external source name. Internal flows
create a two-sided Treasury transfer; external flows create the corresponding one-sided Treasury
entry on the fund account and retain the external source in the movement audit context.

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

Verified expense amount is the sum of validated settlement lines that created or linked Expense records.

Petty Cash must use one currency per fund and per statement.

## Fund Administration Rules

The Funds workspace administers permanent fund configuration.

It owns:

- fund name
- responsible user
- creating user
- unit and business scope
- payment account with type `PETTY_CASH`
- funding source: a company payment account or an explicit external source name
- allowed funding methods
- allowed spending methods
- operational limit
- cut-off day
- kiosk access settings

Creating a fund does not create an Expense.

Creating a fund does not consume budget.

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

Uploading a receipt can reduce operational balance, but it still does not create an Expense until validation.

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

This allows a validated settlement line to become an Expense without re-entering core data.

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

Only a validated settlement line can create or link an Expense.

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

Petty Cash needs two budget views:

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

When a settlement line creates an Expense, that amount moves from estimated/pending exposure into verified expense.

## Financial Overview Rules

Financial Overview should distinguish:

- verified petty cash expenses
- estimated petty cash usage
- pending reconciliation
- shortages
- forgiven shortages
- employee charges
- upcoming cut-offs

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

## API Contract For Later Phases

Future backend endpoints should be shaped around the aggregate:

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

These endpoints are not part of Phase 5B.

## Non-Goals

Phase 5B does not:

- create backend controllers
- create migrations
- create repositories
- add routes
- implement approvals
- implement permissions
- implement payments
- implement MinIO attachment upload
- change existing Expenses behavior
- change auth, CSRF, sessions, or cookies
