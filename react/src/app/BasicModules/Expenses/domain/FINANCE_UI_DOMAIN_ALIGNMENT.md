# Finance UI Domain Alignment

Este contrato alinea los tabs actuales de Expenses con el dominio futuro de Finance.
No define endpoints ni cambia comportamiento. Su objetivo es evitar mezclar gastos reales,
presupuestos, movimientos de caja y reportes antes de crear backend.

## Principios

- Expenses no es Finance completo; es una parte de Finance.
- Petty Cash no es Expense: una emision de fondos es un fund movement.
- Un Expense si representa gasto real de negocio.
- Un Petty Cash Settlement puede crear Expense solo cuando existe comprobante valido.
- Purchase Orders comprometen presupuesto antes de que exista gasto real.
- Transfers entre Payment Accounts no son gastos.
- Financial Overview debe distinguir committed, actual, issued y settled.

## Alignment Matrix

| Finance area | Current UI tab | Main entity | Row nature | Budget effect | Cash effect | Overview effect | Readiness |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Expenses | `expenses` | `Expense` | Real expense | Actual consumption | Expense payment | Direct source | Frontend ready, contract ready |
| Budgets | `budgets` | `BudgetLine` | Planned budget | Planned control | None | Direct source | Frontend ready, contract ready |
| Providers | `providers` | `Provider` | Reference catalog | None | Indirect reference | Indirect dimension | Frontend ready, backend contract needed |
| Payment Accounts | `payment_accounts` | `PaymentAccount` | Account balance | None | Balance and movements | Direct source | Frontend ready, backend contract needed |
| Accounting Accounts | `accounting` | `AccountingAccount` | Classification | None | None | Indirect dimension | Frontend ready, backend contract needed |
| Petty Cash | `petty_cash` | `PettyCashMovement` | Fund movement | Temporary issued, actual settled | Fund movement | Direct source | Planned, backend contract needed |
| Purchase Orders | `purchase_orders` | `PurchaseOrder` | Committed order | Committed budget | None until paid | Direct source | Planned, backend contract needed |
| Financial Overview | `kpis` | `FinancialOverview` | Reporting output | Reporting output | Derived reporting | Output | Frontend ready, contract ready |

## Current UI Migration Map

- `expenses` -> Expenses / `Expense`
- `budgets` -> BudgetLines / Budgets
- `providers` -> Providers / `Provider`
- `accounting` -> AccountingAccounts / `AccountingAccount`
- `payment_accounts` -> PaymentAccounts / `PaymentAccount`
- `kpis` -> FinancialOverview / `FinancialOverview`
- `petty_cash` -> PettyCash / `PettyCashMovement`, planned and required before backend completion
- `purchase_orders` -> PurchaseOrders / `PurchaseOrder`, planned and required before backend completion

## Table Coherence Rules

Every operational Finance table must define:

- Primary entity identifier.
- Status source.
- Monetary source.
- Budget source.
- Payment account source.
- Audit source.
- Attachment source.
- Row nature: real expense, planned budget, committed order, fund movement, payment account balance, reference catalog, accounting classification, or reporting output.

Operational meaning by area:

- Expenses rows are real expense records.
- Budgets rows are planned control lines, not expenses.
- Providers rows are reference records.
- Payment Accounts rows are financial accounts and balances.
- Accounting Accounts rows are classification records.
- Petty Cash rows are fund movements until settlement creates expense.
- Purchase Orders rows are committed orders until converted or linked to expense.
- Financial Overview rows are derived reporting output.

## Status Coherence Rules

- UI filters must never use translated labels as values.
- Future backend statuses must be canonical uppercase enums.
- Existing lowercase legacy statuses must be mapped through adapters only.
- Current UI status values and mocks must not change during this phase.
- Future migration path: legacy UI status -> adapter -> canonical backend enum -> translated label.

## Scope Rules

Every Finance record must support:

- `companyId`
- `unitId`
- `businessId`

Access model:

- Super Admin can see all company records.
- Admin Corporate can see all units and businesses inside the company.
- Admin Unit can see all businesses inside assigned units.
- Admin Specific Business can see only assigned unit and business.
- Finance module users receive module actions by role.
- Petty Cash users can see their own assigned petty cash unless an admin scope applies.

## Backend Questions Before Implementation

- Which exact statuses consume budget for Expenses: approved, paid, closed, or ledger-posted?
- Is Budget or BudgetLine the aggregate root for write operations?
- Petty Cash issuance and settlement are defined in `domain/PETTY_CASH_DOMAIN_CONTRACT.md`.
- When does PurchaseOrder convert or link to Expense?
- Are Financial Overview totals calculated live from ledgers or persisted as snapshots?
- Are provider attachments compliance documents or generic file attachments?
- Is AccountingAccount group a fixed enum or a company configurable catalog?
- Petty Cash is a separate aggregate linked to a PaymentAccount with type `PETTY_CASH`.

## Typed Contract

The executable frontend contract lives in:

- `types/finance-tab-alignment.types.ts`
- `constants/financeTabAlignment.ts`

Those files are intentionally independent from React components so backend preparation can
consume the same alignment without changing UI behavior.
