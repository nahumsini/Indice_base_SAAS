# Expenses KPI workspace and measurement contract

Decision: 2026-09-15. Authorized adoption of the basic-module KPI workspace and
review of useful measurements derived from existing Expenses owner data.

## Findings and implementation scope

The previous page stacked all cards, charts, exceptions and the responsible-user
ranking. It limited the trend to 14 days, units/users to eight, cost-driver
candidates to twenty and budget lines to twenty-five before ranking them.
Cancelled/rejected rows could enter client counts even though monetary totals
excluded them. An empty punctuality sample looked like 0%; incomplete monetary
responses could also become zero. The synthetic financial-health score measures
neither liquidity nor profitability. Budget scope does not support provider or
payment-status filters, and current balances are not historical closing balances.

This change reorganizes and clarifies analytics. It preserves financial writes,
permissions, routes, native amounts, payment reversals and accounting ownership.
Money continues to come from the existing backend monetary engine. The Expenses
list adds optional `asOfDate` and `timeZone` metadata using its existing company
business-date resolver; old consumers and mutation response constructors remain
compatible. No migration or new endpoint is needed.

## Workspace

Shared green `IndiceWorkspaceNavigation`, `variant="views"`, equal 24 px gaps
between title, selector and filters. Views: Overview, Analysis, By unit, Control
and detail. A single filter scope and shared source/currency warnings apply.
View selection is remembered and URL-addressable (`view`); changing views does
not reload sources or monetary queries. Tables retain their local page and sort
while hidden; charts mount only when visible. Refresh reloads sources and monetary
results even when record IDs have not changed. Printing covers the complete
filtered dataset, independent of the visible view and table page.

## Eight primary cards

Captured/recognized expense cards and expense counts exclude cancelled/rejected
expenses and deleted rows (the owner list excludes deleted/external fund receipts).
Payments retain their independent owner contract: non-reversed payment history,
including valid retained payments regardless of expense lifecycle when status is
unfiltered. Counts use the same expense population as their monetary denominator.

| Card | Formula / source | Meaning and comparison |
|---|---|---|
| Captured expense | `EXPENSE_TOTAL`, expense-date cohort | Includes drafts; prior equivalent expense-date period |
| Recognized expense | `EXPENSE_ACTUAL`, same cohort | Approved, partially paid, paid, closed; prior equivalent period |
| Payments in period | `EXPENSE_PAID`, payment-date range, all matching expense dates | Active payment history, reversals excluded; prior equivalent payment period |
| Current outstanding | `EXPENSE_BALANCE`, selected expense-date cohort | Current remainder, not historical closing debt |
| Current overdue | `EXPENSE_OVERDUE_BALANCE`, same cohort | Company-current business date, not stored status alone |
| Payment punctuality | fully settled rows with valid payment and due dates; paid date <= due date / comparable settled rows | Expense-date cohort; sample shown; no sample is unavailable |
| Available budget | `BUDGET_AVAILABLE`, overlapping budget periods and organization | Planned - committed - actual owner balance; provider/account/status/search do not apply |
| Due in 30 days | `EXPENSE_BALANCE` for open rows due from company today to today+30 inclusive | Selected expense-date cohort; excludes already-overdue and undated balances |

Volume and spending direction have no invented healthy/critical benchmark.
Overdue amounts and negative budget availability remain explicit values; the
budget detail retains its owner health classification in the complete report.
No expense data means unavailable ratios, not perfect health.
Primary volume/ratio cards have neutral module styling with sample explanations;
no synthetic health badge is assigned. Captured/recognized
and payment progress are separate. Budget balance is not actual-minus-plan.

## Additional useful analysis

- Full selected-period trend: daily for <=31 days, monthly through 36 months,
  yearly beyond that; expense date and actual payment date stay separate.
- Amount concentration by provider, accounting account, business and unit: rank
  all candidates by server-converted value, not a preselected record-count top.
- Current aging (future, 1–30, 31–60, 61–90, >90 days, undated) and cumulative
  7/15/30/60-day due windows use the business date disclosed by Expenses.
- Budget planned, committed, actual and available for every selected line.
- Evidence coverage and actionable missing evidence/provider/classification/
  responsible/due-date, approval and audit queues. These are data/operational
  checks, not claims of tax deductibility or audited compliance.
- All units and responsible users are accessible, including unassigned, with
  pagination. Responsible-user payment/evidence ratios describe records; they
  are not an employee productivity or quality grade.
- Detail exposes source expenses with native ISO amounts, due date and evidence;
  exception selection narrows this local detail, not the global financial totals.

## Integrity and limits

Queries are batched in groups of <=100 without silently dropping groups. Missing
or partial conversion remains unavailable for consolidated ratios, rankings and
reports; native context stays visible. No currency conversion or monetary sum is
implemented locally. PDF export waits for complete sources and monetary results.

Period filters select expense dates; payments select payment dates for the same
non-date dimensions. Selecting a payment-status filter also restricts the payment
population by the expense's current status. Budget overlap is a whole-line view,
not prorated monthly budget. Current balances of historical expense cohorts must
not be compared as historical closing balances. Company cutoff metadata is
required for aging/projection; an older backend cannot silently use browser today.

Not supported by this data: profitability, cash runway, tax recoverability,
reconciled bank liquidity, full approval-cycle duration, immutable historical
balance comparisons or savings against a negotiated baseline. No values are
invented for these concepts.
