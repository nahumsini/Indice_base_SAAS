# Expenses Table Implementation Notes

This document is a compact historical reference for the Expenses table. The current implementation is modular and the canonical Finance contracts now live in `domain/` and `types/`.

## Current Runtime Source

The table experience is implemented through these files:

- `Expenses/Expenses.tsx`
- `Expenses/components/ExpenseTable.tsx`
- `Expenses/components/EditableExpenseRow.tsx`
- `components/table/ExpenseTableHeaderRow.tsx`
- `components/table/ExpenseInlineControls.tsx`
- `components/table/ExpenseAmountCells.tsx`
- `components/table/ExpenseRowActions.tsx`
- `constants/expenseColumns.ts`
- `constants/expenseTableConfig.ts`
- `utils/expenseFilters.ts`
- `utils/expenseTableUtils.ts`

## Preserved Behavior

The current UI still uses the legacy operational Expense model from `types/expenses.types.ts`.

Preserved table behavior includes:

- Search by folio, concept, description, and provider.
- Period, business unit, provider, and status filters.
- Configurable visible columns.
- Inline row editing.
- Full payment and partial payment row actions.
- Attachment modal flow.
- Duplicate and delete handlers as existing UI placeholders.
- Summary totals derived from filtered rows.
- Dark mode styling and responsive horizontal table scroll.

## Legacy UI Statuses

The UI still stores lowercase status values:

| UI status | Current meaning |
| --- | --- |
| `pending` | Expense is payable and has no payment recorded. |
| `partial` | Expense has partial payment. |
| `paid` | Expense has been fully paid. |
| `overdue` | Expense is unpaid after due date. |
| `audited` | Expense has been reviewed after payment. |

Canonical Finance statuses are defined separately in `types/finance-status.types.ts`.

## Finance Contract Alignment

The operational table column contract is defined in `types/expense-column-contract.types.ts`.

The table should not store translated labels or visual labels as domain values.

The adapter `adapters/expense.adapter.ts` maps current UI records into the future Finance domain model without changing UI behavior.

## Non-Goals

This implementation note does not define backend endpoints, DTOs, routes, permissions, approvals, payment workflows, or navigation.
