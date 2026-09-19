# Finance Business Rules Contract

Status: approved financial vocabulary and recognition rules. Applies to frontend and backend
within the [Backend OS](../../../../../../docs/indice-backend-operating-system-v1.md) and the
[financial closeout contract](../../../../../../docs/kpi-financial-closeout-contract-v1.md).
The original Phase 2 preparation notes do not describe current implementation readiness.

## Scope

This contract describes the financial relationship between Budgets, BudgetLines, PurchaseOrders,
Expenses, PettyCash, PaymentAccounts, AccountingAccounts, Providers, Payments, Attachments, and
FinancialOverview. It does not transfer ownership between modules: purchase orders, inventory,
funds, accounting, and expenses keep their explicit owner services and contracts.

Expenses is one workspace inside Finance. Petty Cash is an operational fund linked to a custody
account and a settlement workflow; fund identity and account identity are distinct.

The detailed fund contract lives in [Petty Cash](PETTY_CASH_DOMAIN_CONTRACT.md).

## Core Rules

1. PaymentAccount is a financial account used to hold or move funds. Examples: cash, bank, credit card, and petty cash.
2. Petty Cash issuance does not generate an Expense. It records a fund movement using the funding
   source permitted by the fund contract. External means require their explicit named-origin flow.
3. Expense records represent actual business consumption and can affect budget actuals.
4. An authorized internal-fund settlement line can create or link a company Expense once. Explicit
   administrator authorization without an attachment follows the
   [statement close contract](../../../../../../docs/petty-cash-statement-close-resolution-contract-v1.md).
   External-fund validation never creates company expense or budget consumption.
5. Budget can be affected by PurchaseOrders, Expenses, and PettyCash, but each affects a different amount bucket.
6. Transfers between PaymentAccounts, including bank to petty cash, are not Expenses.
7. FinancialOverview must distinguish committed, actual, issued, and settled amounts.

## Canonical Flow

```text
Budget
  -> BudgetLine
  -> PurchaseOrder OR PettyCash OR DirectExpense
  -> Expense
  -> Payment
  -> ClosedExpense
  -> FinancialOverview
```

## Budget Interaction

BudgetLine tracks plannedAmount, committedAmount, actualExpenseAmount, pettyCashIssuedAmount, pettyCashSettledAmount, availableAmount, and healthStatus.

The canonical available amount formula is:

```text
availableAmount =
  plannedAmount
  - committedAmount
  - actualExpenseAmount
```

Funding transfers custody and does not consume budget. The authorized expense is recognized once;
issued and settled amounts remain separate disclosures. See the financial closeout contract linked above.

## Budget Amount Buckets

PurchaseOrder with APPROVED or ISSUED status increases committedAmount.

Expense with APPROVED, PARTIALLY_PAID, PAID, or CLOSED status increases actualExpenseAmount.

PettyCash with ISSUED status increases pettyCashIssuedAmount.

PettyCash with SETTLED status increases pettyCashSettledAmount. Company expense recognition comes
from authorized internal-fund settlement lines, not a second charge on statement closure.

PaymentAccount transfers do not create Expenses and must not increase actualExpenseAmount.

BudgetHealthStatus is derived and must not be manually edited.

## Budget Health

ON_TRACK applies when availableAmount is greater than 20% of plannedAmount.

WARNING applies when availableAmount is between 0% and 20% of plannedAmount.

EXCEEDED applies when availableAmount is below 0.

## UI Compatibility Mapping

Legacy lowercase labels remain an adapter concern. They do not authorize a status mutation,
create a payment, or replace the backend transition rules. Changes must preserve API compatibility
and use the owner's payment, correction, or closure flow.

Expense and payment meanings are separate:

| Current UI status | Canonical ExpenseStatus | Canonical PaymentStatus |
| --- | --- | --- |
| `pending` | `APPROVED` | `UNPAID` |
| `partial` | `PARTIALLY_PAID` | `PARTIALLY_PAID` |
| `paid` | `PAID` | `PAID` |
| `overdue` | `APPROVED` | `OVERDUE` |
| `audited` | `CLOSED` | `PAID` |

## Non-Goals

This contract does not create backend endpoints, DTOs, routes, approvals, partial payment workflows, UI redesigns, permissions, or navigation changes.
