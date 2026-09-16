# Sales KPI workspace contract

Status: approved by the module-by-module KPI adoption request, 2026-09-16.
Owner: Sales. Extends `KPI_TAB_STANDARD.md` under the Frontend and Backend
Operating Systems. It replaces the presentation and calculations of the existing
Sales KPI tab; it does not replace operational Contacts, Opportunities, Quotes,
Sales, Commissions, Contracts or After-sales workspaces.

## Workspace

Route `/sales/kpis`, existing Sales KPI capability, coral module tone,
`IndiceWorkspaceNavigation variant="views"`, and 24 px gaps between the title,
view navigation, filters and content. Views:

1. Overview: eight measurements with their scope and availability.
2. Analysis: opportunity-linked funnel, registered-sales volume, quote status and
   seller activity.
3. By unit: comparable operational record counts. It does not sum raw currencies.
4. Opportunities: paginated follow-up cohort, ordered with overdue actions first.

Search, period, unit, business and seller are global. Unit and Business use IDs and
Business options depend on Unit. Seller identity uses `user_company_id`; a normalized
display name is only the fallback for legacy unassigned rows. The Seller filter is in
the shared progressive disclosure because it is the fifth filter.

The active view, safe filters, disclosure state, sort and pagination survive tab
navigation and reload in company/user-scoped workspace memory. URL values override
remembered view/filter values. Switching views does not reload the source or repeat
unchanged monetary queries. The report includes all filtered rows, not only the active
view or current page, and preserves unavailable/partial monetary states.

## Time and filter semantics

`asOfDate` and `timeZone` come from the backend company business timezone. Browser
time does not decide overdue state or period boundaries.

- Sale totals and sale volume use `sale_date` in the selected event interval.
- Collections use payment date in that interval across every valid sale in the
  selected organization/search/seller scope, including older sales.
- Quotes use `created_date` in the event interval.
- Opportunities use `expected_close_date`. For the current week or month, the window
  extends to the calendar period end so future expected pipeline in that period is
  visible. Event flows still end at `asOfDate`.
- Current receivable and pending operational handoff are stocks. Period selection does
  not reconstruct a historical balance or a past handoff queue.
- `all` includes every available dated row; unknown expected-close dates are visible
  only in `all` because no period can be proven for them.

## Eight overview measurements

| Measurement | Definition |
| --- | --- |
| Registered sales | `SALES_TOTAL` for valid sales dated in the selected period. Cancelled, canceled, rejected and voided records are excluded. This is registered gross sales, not accounting revenue. |
| Collected in period | `SALES_COLLECTED` by payment date for valid sales in the non-period scope. It is cash collection, not sale value. |
| Current receivable | `SALES_RECEIVABLE_BALANCE` for valid sales in the non-period scope. It is a current stock even when a historical period is selected. |
| Average ticket | Complete preferred-currency Registered sales / count of the same valid period sales. Missing conversions make the value unavailable; excluded rows are not silently left in the denominator. |
| Active pipeline | `SALES_OPPORTUNITY_PIPELINE` for current non-terminal opportunities whose expected close is in the selected opportunity window. Values come from linked active quotes. |
| Open opportunities | Count of the same non-terminal opportunity cohort. Terminal lifecycle/stage and closed status are excluded. |
| Overdue follow-ups | Open opportunities in that cohort with `next_action_at` strictly before backend `asOfDate`. Missing next action is not labelled overdue. |
| Pending handoff | Unique current valid sales pending Finance, inventory movement or delivery. A row pending all three is counted once. |

There are no synthetic health scores or arbitrary good/bad thresholds. Card colors
indicate attention/availability, not an invented performance grade.

## Analysis definitions

The funnel uses one expected-close opportunity cohort and stable links. Once the
cohort is selected, linked quote/sale history is not discarded merely because the
linked document was created in another period:

1. opportunities in scope;
2. those opportunity IDs with a quote in scope;
3. those IDs with an approved/accepted/won quote;
4. those IDs with a valid sale.

An unlinked quote never advances the funnel. The funnel is traceability, not a claim
of historical stage conversion. Sales trend is a count by sale month; quote composition
is a count by status. Seller activity groups stable user-company IDs and ranks record
counts. It intentionally does not pretend seller revenue is available from the client
or divide unrelated quote and sale populations into a conversion rate.

By-unit comparison uses the same filtered definitions for registered sale count, open
opportunity count, quote count, overdue follow-up count and current pending handoff.
Higher record volume is not labelled better or worse. Opportunity detail avoids a
fake converted value per row and sorts actual dates/text rather than formatted money.

## Ownership, access and compatibility

- New read-only `GET /api/v1/sales/kpis/workspace` returns typed contacts,
  opportunities, quotes, sales, authorized organization options, backend business
  date/timezone and `definitionVersion`.
- Company comes exclusively from the authenticated session. The operational scope
  comes from `KpiRequestAccessService`; an unassigned scope fails closed.
- Contacts, opportunities and sales are scoped in their SQL query. Quote scope is
  inherited from its linked opportunity, with the linked contact as fallback only
  when no opportunity exists. Frontend filtering only narrows this authorized set.
- The source DTO intentionally omits monetary amounts. `SALES_TOTAL`,
  `SALES_COLLECTED`, `SALES_RECEIVABLE_BALANCE` and
  `SALES_OPPORTUNITY_PIPELINE` remain owned by the central BigDecimal/currency engine.
- Partial conversions remain visibly unavailable for headline totals and average
  ticket. Native ISO-labelled totals and exchange-rate context remain visible.
- Authorization or refresh revisions hide stale source rows and ignore prior async
  responses. Monetary responses are hidden whenever the authorized source is not ready.
- Existing `GET /api/v1/sales/kpis`, CRUD routes, permissions, opportunity flows,
  collections, commission, inventory and document contracts remain unchanged.
- No schema migration, credential change, automatic permission grant or production
  deployment is part of this adoption.

## Deliberate limits

Current data does not justify quota attainment, CAC, net profitability, forecast
accuracy, a weighted forecast, sales-cycle duration, loss-reason analysis, or reliable
historical won/lost conversion. Opportunity flow-position history is not guaranteed
complete for legacy records and may record more than one flow. Margin is not promoted
until an authoritative complete aggregate is available. These measurements require a
separate approved data contract; they must not be inferred from current snapshots.

Verification must cover period boundaries, current-stock semantics, cancellation,
linked funnel steps, duplicate display names, dependent organization filters, partial
currency conversion, full report scope, source refresh/authorization races, and
company/unit/business SQL isolation.
