# Finance Domain Contract

Status: domain summary for the implemented Finance workspaces. This document explains business
boundaries; it does not certify deployment or rename the visible Expenses module.

Authority: [Backend OS](../../../../../../docs/indice-backend-operating-system-v1.md) and the
approved owner contracts linked below. The former backend-preparation plan is retained in
[UI Domain Alignment](FINANCE_UI_DOMAIN_ALIGNMENT.md) as historical context.

Business rules live in [Finance Business Rules](FINANCE_BUSINESS_RULES.md),
[Petty Cash](PETTY_CASH_DOMAIN_CONTRACT.md), and the
[financial closeout contract](../../../../../../docs/kpi-financial-closeout-contract-v1.md).
Frontend contracts live under [types](../types/); API contracts remain backend-owned.

## Finance Areas

```text
Finance
  -> Budgets
  -> BudgetLines
  -> PurchaseOrders
  -> Expenses
  -> PettyCash
  -> PaymentAccounts
  -> AccountingAccounts
  -> Providers
  -> Payments
  -> Attachments
  -> FinancialOverview
```

## Domain Boundaries

Budget defines planned money for a period.

BudgetLine defines the spendable unit inside a budget and owns planned, committed, actual, petty cash issued, petty cash settled, available, and health amounts.

PurchaseOrder reserves budget before an invoice or expense exists. APPROVED and ISSUED purchase orders increase committed budget.

Expense represents business consumption. APPROVED, PARTIALLY_PAID, PAID, and CLOSED expenses
contribute to actual consumption under the financial closeout contract. A captured draft is not
recognized consumption; receipt evidence and payment are distinct from approval.

PettyCash represents a controlled operational fund with a responsible user and a custody account.
Issuing funds is a fund movement, not an expense. Authorized internal-fund settlement lines create
company expenses once; external managed funds remain outside company expenses and budgets.
Explicit administrator authorization without an attachment follows the
[statement close contract](../../../../../../docs/petty-cash-statement-close-resolution-contract-v1.md).

PaymentAccount is a financial account such as cash, bank, credit card, or petty cash. Transfers between payment accounts are fund movements, not expenses.

AccountingAccount classifies expense impact for accounting and reporting.

Provider identifies who supplies goods or services.

Payment records money applied to an expense. An assigned payment account receives the corresponding
Treasury movement. Explicitly approved unassigned-payment flows retain payment history without
moving bank money or choosing a default account; see the Backend OS financial rules.

Attachment stores receipts, invoices, proofs, and audit evidence linked to business records.

FinancialOverview summarizes finance using committed, actual, issued, settled, pending, overdue, available, and health metrics.

## Status Contract

Canonical statuses are uppercase English keys. Translated labels must never be stored as internal values.

ExpenseStatus, PurchaseOrderStatus, BudgetStatus, BudgetHealthStatus, PettyCashStatus, and PaymentStatus are defined in `types/finance-status.types.ts`.

Each status declares its technical key, user meaning, when it applies, whether it affects budget, whether it affects payment account balances, and whether it appears in FinancialOverview.

## Budget Interaction Rules

BudgetLine availableAmount is derived:

```text
plannedAmount
- committedAmount
- actualExpenseAmount
```

BudgetHealthStatus is derived from availableAmount and plannedAmount:

| Status | Rule |
| --- | --- |
| `ON_TRACK` | availableAmount > 20% of plannedAmount |
| `WARNING` | availableAmount is between 0% and 20% of plannedAmount |
| `EXCEEDED` | availableAmount < 0 |

PurchaseOrder APPROVED or ISSUED increases committedAmount.

Expense APPROVED, PARTIALLY_PAID, PAID, or CLOSED increases actualExpenseAmount.

PettyCash ISSUED increases pettyCashIssuedAmount.

PettyCash SETTLED increases pettyCashSettledAmount and may create or link Expenses.

Transfers between PaymentAccounts do not create Expenses.

## Expense Column Contract

The operational Expenses table contract is defined in `types/expense-column-contract.types.ts`.

Columns declare default visibility, expected backend field, filter support, sort support, budget impact, and cash-flow impact.

Current UI columns can keep their labels and layout until the UI is intentionally migrated.

## Financial Overview Contract

FinancialOverview is defined in `types/financial-overview.types.ts` and supports fixed expenses, variable expenses, petty cash issued, petty cash settled, pending payments, overdue payments, committed budget, consumed budget, available budget, budget health, upcoming cash requirements, and top cost drivers.

## Implementation Boundary

Components depend on services and typed adapters. The current [Expenses service](../services/expenses.service.ts)
calls Finance APIs; backend owners enforce authorization, transactions, totals, and persistence.
A type or conceptual flow in this document is not evidence that every operation is implemented.
Inspect the affected service, owner contract, and regression coverage before extending a flow.
