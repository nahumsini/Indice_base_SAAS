# Expenses To Finance Plan

Expenses is no longer treated as a standalone prototype. It is being prepared as one workspace inside Finance.

## Current Direction

The priority is architectural readiness, not new UI features.

Current focus:

- Keep UI behavior stable.
- Keep backend untouched.
- Keep mocks as temporary data only.
- Move business language into typed contracts.
- Prepare frontend services and adapters for a future Spring Boot backend.

## Module Areas

Finance will own:

- Budgets
- BudgetLines
- PurchaseOrders
- Expenses
- PettyCash
- PaymentAccounts
- AccountingAccounts
- Providers
- Payments
- Attachments
- FinancialOverview

## Completed Foundation

The Expenses workspace has been split into smaller modules:

- Page orchestration
- Header
- Filters
- KPIs
- Table
- Modals
- Hooks
- Services
- Adapters
- Utils
- Constants
- Types
- Data

## Current Contract Work

Finance business rules are documented in `domain/FINANCE_BUSINESS_RULES.md`.

The domain map is documented in `domain/DOMAIN_MAP.md`.

Canonical statuses live in `types/finance-status.types.ts`.

Domain entities live in `types/finance-domain.types.ts`.

Operational table columns live in `types/expense-column-contract.types.ts`.

Financial overview metrics live in `types/financial-overview.types.ts`.

## Core Business Rule

Petty Cash issuance is a fund movement, not an Expense.

Expenses represent actual business consumption.

PaymentAccount transfers do not create Expenses.

Budget views must distinguish committed, actual, issued, and settled amounts.

## Next Phases

1. Keep UI stable while contracts mature.
2. Define backend DTOs against the Finance contract.
3. Add backend endpoints after the contract is accepted.
4. Replace mock services with real API calls.
5. Migrate UI statuses from legacy lowercase values to canonical uppercase keys.
6. Remove mocks only after API parity exists.

## Non-Goals

Do not add workflows, approvals, partial payment features, redesigned screens, permissions, routes, or backend code as part of this plan.
