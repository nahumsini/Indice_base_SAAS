# Petty Cash Domain Contract

Phase 5A defines Petty Cash before implementation. This contract does not create UI, backend endpoints, database migrations, approval workflows, or navigation changes.

## Decision

Petty Cash is a separate Finance aggregate linked to a `PaymentAccount` with type `PETTY_CASH`.

Petty Cash is not an `Expense`.

Issuing petty cash is a fund movement from a source `PaymentAccount` into a petty cash `PaymentAccount`.

Settlement can create or link `Expense` records only when valid receipts or proofs exist.

## Aggregate Boundary

`PettyCash` owns the custody cycle:

- issued amount
- settled amount
- returned amount
- settlement balance
- custodian
- issue date
- settlement due date
- settlement date
- status
- settlement lines
- attachments

`PaymentAccount` owns account balances.

`Expense` owns actual business consumption.

`BudgetLine` owns planned, committed, actual, issued, settled, available, and health amounts.

## Core Entities

### PettyCash

Fields:

- id
- companyId
- unitId
- businessId
- pettyCashAccountId
- sourcePaymentAccountId
- budgetLineId
- custodianUserId
- requestedByUserId
- approvedByUserId
- issuedByUserId
- settledByUserId
- issuedAmount
- settledAmount
- returnedAmount
- settlementBalance
- currencyCode
- issuedDate
- settlementDueDate
- settledDate
- status
- attachmentCount
- createdByUserId
- updatedByUserId
- createdAt
- updatedAt
- deletedAt
- customFields
- metadata

### PettyCashSettlementLine

Fields:

- id
- companyId
- pettyCashId
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

### FinanceFundMovement

Fields:

- id
- companyId
- unitId
- businessId
- fromPaymentAccountId
- toPaymentAccountId
- pettyCashId
- type
- amount
- currencyCode
- movementDate
- reference
- createdByUserId
- createdAt

## Status Contract

Canonical statuses:

- `ISSUED`
- `PARTIALLY_SETTLED`
- `SETTLED`
- `OVERDUE`
- `CANCELLED`

Status rules:

- `ISSUED`: funds were moved into petty cash custody.
- `PARTIALLY_SETTLED`: at least one receipt or return was reconciled, but settlement balance remains.
- `SETTLED`: issued amount is fully supported by receipt-backed expenses and/or returned cash.
- `OVERDUE`: settlement due date passed while settlement balance remains.
- `CANCELLED`: issuance was voided before active custody or reversed by an approved cancellation.

## Money Rules

```text
settlementBalance = issuedAmount - settledAmount - returnedAmount
```

`issuedAmount` is the amount transferred into custody.

`settledAmount` is the total supported by valid settlement receipts that create or link expenses.

`returnedAmount` is cash returned from the custodian to a payment account.

`settlementBalance` must be zero before a petty cash record can be `SETTLED`.

Amounts must use one currency per petty cash record.

## Budget Rules

Petty Cash issuance increases `BudgetLine.pettyCashIssuedAmount` when a `budgetLineId` exists.

Settlement receipt lines increase `BudgetLine.pettyCashSettledAmount`.

Receipt-backed expenses increase actual expense consumption according to the normal Expense ledger rules.

Issuance must not increase `actualExpenseAmount`.

Returns reduce open petty cash exposure but do not create expenses.

The BudgetLine available amount formula remains:

```text
availableAmount =
  plannedAmount
  - committedAmount
  - actualExpenseAmount
  - (pettyCashIssuedAmount - pettyCashSettledAmount)
```

## Payment Account Rules

Issuance creates a fund movement:

```text
sourcePaymentAccount -> pettyCashPaymentAccount
```

Return creates a fund movement:

```text
pettyCashPaymentAccount -> sourcePaymentAccount
```

Settlement receipts do not create a transfer between bank and petty cash. They consume issued custody and may create or link expenses.

Transfers between payment accounts are not expenses.

## Expense Creation Rule

A settlement line may create an `Expense` only when:

- it has a valid receipt or proof attachment
- it has a valid amount
- it has an expense date
- it has company scope
- optional provider/accounting/budget references are valid for the same company

The created Expense should use `expenseType = PETTY_CASH_SETTLEMENT`.

The Expense must reference the settlement line or petty cash record so it is not counted twice.

## Scope Rules

Every Petty Cash record must support:

- companyId
- unitId
- businessId

`custodianUserId`, `requestedByUserId`, `approvedByUserId`, `issuedByUserId`, and `settledByUserId` must reference active users inside the same company.

`pettyCashAccountId` must reference a `PaymentAccount` with type `PETTY_CASH`.

`sourcePaymentAccountId` must reference an active non-petty-cash `PaymentAccount`.

## Attachment Rules

Issuance attachments are optional unless company policy requires authorization proof.

Settlement receipt attachments are required before creating an Expense from a settlement line.

Attachment ownership must allow:

- `PETTY_CASH`
- `PETTY_CASH_SETTLEMENT_LINE`
- `EXPENSE`

## API Contract For Later Phases

Future backend endpoints should be shaped around the aggregate:

- list petty cash records
- get petty cash record
- issue petty cash
- add settlement line
- settle petty cash
- return unused cash
- cancel issued petty cash when allowed
- list settlement lines
- create expense from settlement line

These endpoints are not part of Phase 5A.

## Non-Goals

Phase 5A does not:

- create backend controllers
- create migrations
- create repositories
- add routes
- add UI tabs
- implement approvals
- implement payments
- implement MinIO attachment upload
- change existing Expenses behavior
- change auth, CSRF, sessions, or permissions

## Open Questions Before Implementation

- Should returned cash always go back to the original source account, or can finance choose another account?
- Should each settlement line create an Expense immediately, or only after final settlement approval?
- Should company policy require approval before issuance, before settlement, or both?
- Should settlement line attachments be copied to the created Expense or linked by shared ownership?
- Should overdue status be calculated dynamically or persisted by a scheduled job?
