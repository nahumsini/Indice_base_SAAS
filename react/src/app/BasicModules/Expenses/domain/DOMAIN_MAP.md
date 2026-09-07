# Finance Domain Contract

Expenses is being prepared to become the Finance module. The current UI model remains in place while backend-ready domain entities, status contracts, table columns, and overview metrics are formalized.

Business rules live in `domain/FINANCE_BUSINESS_RULES.md`. Petty Cash rules live in `domain/PETTY_CASH_DOMAIN_CONTRACT.md`. Type contracts live in `types/finance-domain.types.ts`, `types/finance-status.types.ts`, `types/expense-column-contract.types.ts`, and `types/financial-overview.types.ts`.

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

Expense represents actual business consumption. PAID and CLOSED expenses increase actual budget consumption.

PettyCash represents controlled cash issued to a custodian. Issuing petty cash is a fund movement, not an expense. Settlement can create or link expenses only when receipts exist.

PaymentAccount is a financial account such as cash, bank, credit card, or petty cash. Transfers between payment accounts are fund movements, not expenses.

AccountingAccount classifies expense impact for accounting and reporting.

Provider identifies who supplies goods or services.

Payment records money applied to an expense. Payments affect account balances and cash-flow views.

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

Expense PAID or CLOSED increases actualExpenseAmount.

PettyCash ISSUED increases pettyCashIssuedAmount.

PettyCash SETTLED increases pettyCashSettledAmount and may create or link Expenses.

Transfers between PaymentAccounts do not create Expenses.

## Expense Column Contract

The operational Expenses table contract is defined in `types/expense-column-contract.types.ts`.

Columns declare default visibility, expected backend field, filter support, sort support, budget impact, and cash-flow impact.

Current UI columns can keep their labels and layout until the UI is intentionally migrated.

## Financial Overview Contract

FinancialOverview is defined in `types/financial-overview.types.ts` and supports fixed expenses, variable expenses, petty cash issued, petty cash settled, pending payments, overdue payments, committed budget, consumed budget, available budget, budget health, upcoming cash requirements, and top cost drivers.

## Backend Preparation Rule

Components should depend on services and typed adapters, not directly on transport details. The current service implementation is mock-backed and can later be replaced by real finance API calls without changing table, filters, KPI, or modal components.
