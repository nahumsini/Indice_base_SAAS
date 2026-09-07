# Finance Business Rules Contract

Phase 2.0 defines the business language that must be true before Expenses becomes Finance. This document is a contract for frontend code and the future backend; it does not change current UI behavior.

## Scope

Finance owns Budgets, BudgetLines, PurchaseOrders, Expenses, PettyCash, PaymentAccounts, AccountingAccounts, Providers, Payments, Attachments, and FinancialOverview.

Expenses is one workspace inside Finance. Petty Cash is a financial account and settlement workflow, not a subtype of Expense.

The detailed Petty Cash contract lives in `domain/PETTY_CASH_DOMAIN_CONTRACT.md`.

## Core Rules

1. PaymentAccount is a financial account used to hold or move funds. Examples: cash, bank, credit card, and petty cash.
2. Petty Cash issuance does not generate an Expense. It generates a fund movement from one PaymentAccount to a Petty Cash account.
3. Expense records represent actual business consumption and can affect budget actuals.
4. Petty Cash settlement can create or link Expenses only when a valid receipt or proof exists.
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
issued and settled amounts remain separate disclosures. See `docs/kpi-financial-closeout-contract-v1.md`.

## Budget Amount Buckets

PurchaseOrder with APPROVED or ISSUED status increases committedAmount.

Expense with APPROVED, PARTIALLY_PAID, PAID, or CLOSED status increases actualExpenseAmount.

PettyCash with ISSUED status increases pettyCashIssuedAmount.

PettyCash with SETTLED status increases pettyCashSettledAmount and can create or link actual Expenses when receipts exist.

PaymentAccount transfers do not create Expenses and must not increase actualExpenseAmount.

BudgetHealthStatus is derived and must not be manually edited.

## Budget Health

ON_TRACK applies when availableAmount is greater than 20% of plannedAmount.

WARNING applies when availableAmount is between 0% and 20% of plannedAmount.

EXCEEDED applies when availableAmount is below 0.

## Current UI Migration Note

The current Expenses UI still uses legacy lowercase status values. Those values remain untouched until the UI is intentionally migrated.

Temporary adapter mapping:

| Current UI status | Canonical ExpenseStatus | Canonical PaymentStatus |
| --- | --- | --- |
| `pending` | `APPROVED` | `UNPAID` |
| `partial` | `PARTIALLY_PAID` | `PARTIALLY_PAID` |
| `paid` | `PAID` | `PAID` |
| `overdue` | `APPROVED` | `OVERDUE` |
| `audited` | `CLOSED` | `PAID` |

## Non-Goals

This contract does not create backend endpoints, DTOs, routes, approvals, partial payment workflows, UI redesigns, permissions, or navigation changes.
