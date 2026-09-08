# Expenses fund grouping — 2026-09-08

Status: implemented and validated locally. Not committed, merged, or deployed by this task.
Builds on the existing uncommitted fund-origin/account-classification and atomic import work.

## Behavior

- Authorized internal-fund expenses collapse to one row per source fund and native currency.
- The Expenses date period and other row filters apply before grouping. Provider/search filters
  explicitly label the group as matching expenses. Searching a fund name finds its receipts.
- The table paginates groups and ordinary expenses together. A fund's receipts never split across
  summary pages. Expanding a group retains all original IDs, dates, providers, concepts, taxes,
  classifications, expense-record callbacks and supporting-file callbacks.
- Group rows have no editable account selector or bulk mutation checkbox. Ordinary rows retain
  existing edit, payment, classification and other actions. Current-month overdue carryover remains
  an ordinary expense on its original recognition date.
- Different accounting accounts display as multiple accounts; the fund reference stays visible.
- The existing Petty Cash control route accepts an optional numeric `fundId` selection. Its existing
  authorized fund catalog controls which fund can be opened; no new access is granted.
- Desktop and mobile use the same grouping and expanded state. The detail region has internal
  vertical scrolling and remains within the desktop table viewport while horizontally scrolling.

## Structure and state

Under `react/src/app/BasicModules/Expenses/`:

- `utils/expenseFundGroups.ts`: typed presentation rows, grouping, sorting and period labels.
- `hooks/useExpenseFundTotals.ts`: native summary amounts from the existing central monetary API;
  stale-response protection, authorization/data revision invalidation, batching and retry.
- `Expenses/components/ExpenseFundGroupRow.tsx`: read-only summary and receipt breakdown for desktop
  and mobile, with original record/evidence actions and source-fund navigation.
- `Expenses/components/expenseFundGroup.copy.ts`: localized copy for the eight supported locales.
- `Expenses/components/ExpenseTable.tsx`: groups before pagination, separates mutation selection
  from presentation rows, preserves original-expense inputs to existing summaries.
- `Expenses/Expenses.tsx`, `utils/expenseFilters.ts`: pass active period/filter context and search
  source fund names.
- `../PettyCash/CajaChica.tsx`: forwards the optional fund selection to the existing control view.

This is module-owned presentation using the existing table and monetary owner, not a new table
engine or financial ledger. Expansion is local state; original workspace pagination/sort memory is
preserved. No new persisted aggregate, backend endpoint, DTO, schema change or migration was added.
Original receipt-level KPI/export inputs, payments, treasury, classifications, dates and evidence
remain intact. Existing production financial data was not modified.

## Monetary contract

Uses `/api/v1/kpis/monetary-aggregate/batch` with original filtered expense IDs and these existing
metrics: `EXPENSE_TOTAL`, `EXPENSE_SUBTOTAL`, `EXPENSE_TAX`, `EXPENSE_PAID_TO_DATE`, `EXPENSE_BALANCE`.
Each group requests its own native currency. The frontend displays server native totals; it does
not re-sum fund money or convert the grouped value using a new exchange-rate rule.

Requests respect the existing 100-query batch limit. More than 10,000 receipts in one group is
outside the existing owner query limit and results in unavailable totals rather than truncation.
Loading, failed, partial or unexpected-currency responses never display a previous total or a
fabricated zero. Retry retains the original receipts and selection.

## Verification

- 66 frontend regression tests passed, including 9 new grouping cases covering identity/currency,
  period/provider/scope/status filters, overdue carryover, group/ordinary sorting, server amount
  authority, batching, error states, locked classification and original receipt identity.
- 14 existing backend monetary regression tests passed: `KpiMonetaryScopeIntegrationTest`,
  `KpiMonetaryFlowIntegrationTest`, `KpiCurrencyAggregationServiceTest`, and
  `BasicModuleKpiCurrencyRepositoryTest`. Database tests used only port 3308,
  `indice_closeout_v2_test_db`.
- TypeScript validation and frontend production build passed.
- 14 Chrome flow checks passed with real frontend components and intercepted synthetic API data:
  grouping/pagination, all receipts in a group, record/evidence callbacks, fund URL, bulk selection,
  provider filtering, source-fund search, failed query/retry, historical and annual totals,
  same-ID data refresh, optional column alignment, and mobile disclosure. No page errors.
- Desktop, dark and mobile screenshots inspected. No mobile page overflow at 390 CSS pixels.
- Local Expenses route on port 5174 and health endpoints through ports 5174/8082 returned HTTP 200.
- `git diff --check` passed.

Initial validation found a nonexistent localized label and nonstandard font weights; corrected.
The existing source-location sort assertion was updated for the extracted grouping utility, with
runtime assertions for ascending/descending ordinary balances and server-supplied group totals.
The browser fixture initially intercepted Vite module URLs and used the default English locale;
its API route matcher and locale setup were corrected before the successful final run.

Browser evidence and logs are under `/tmp/indice-fund-grouping-qa/`. Browser tests did not exercise
an authenticated production or functional-demo session, write business data, or deploy changes.
