# Sales board owner contract v1

Status: local analytical pilot authorized by the sales-consolidation request and the user’s
clarification that the primary objective is sales analysis, patterns and temporality, 2026-10-17.

The complementary `sales_board` module at `/sales-board` owns the consolidated read workspace.
Sales/CRM and POS retain creation, correction, cancellation, payment and fulfillment ownership.
Finance retains journal posting, reversal, period controls and financial statements.

## Single commercial identity

`sales_records` already contains both origins. Each row is counted once using its company/id;
server-owned `source_type` distinguishes `SALES` and `POS`. The unique, company-matched POS
summary link adds ticket evidence, never another monetary row. Unknown historical origins remain
explicitly unknown. Deleted records are not resurrected. Cancelled/rejected/voided sales can be
reviewed but contribute no registered-sales total. Returns continue through their owning domain.

Origin, sales channel, lead acquisition source and payment method are different dimensions.
The initial channel projection uses only the linked POS ticket's recorded channel. CRM has no
canonical sale-channel field, so those rows remain `UNCLASSIFIED`; opportunity/contact acquisition
sources and freeform metadata are not promoted into financial channel authority. This pilot
introduces no channel catalog or retrospective reclassification.

## Read contracts and accounting

The Sales reporting package publishes a tenant/organization-scoped, typed consolidated projection.
It owns commercial filters, pagination, native BigDecimal aggregates and POS link evidence under
the existing Sales/POS owner contract. Sales Board composes this read contract with a narrow
Finance-owned sale-posting evidence projection. No reporting GET mutates source records or ledger.
The accounting projection reports posted sale journals and linked posted reversals; an unposted
sale is not automatically eligible to post. Readiness, missing cost/currency evidence, reconciliation
and synchronization remain in the existing financial reporting engine.

The existing `sales:SALE:<id>` accounting identity is preserved. Linked POS tickets are never
posted separately. The board does not become a second source for KPIs or journals: its consumers
and the existing financial engine reference the same commercial record. Registered sale amounts,
collections and posted accounting revenue are never labeled as interchangeable.

## Access and UI

Native module entitlement/assignment plus `sales_board.overview` authorize the consolidated read
projection, including its limited sale-posting evidence. This does not grant POS/CRM operations,
Cartera operations or access to the complete ledger. Organization scope uses the existing server
resolver and fails closed when unassigned. Narrower unit/business filters must be owned and within
that scope. Administrative/management roles use that resolver; ordinary `user` roles cannot be
assigned this analytical permission. Public demo sessions are denied. Registration grants no company or user access and
creates no billing price; synthetic local access is a separate test-environment setup.

The coral shared module shell exposes Overview, Trends, Origins and Channels, and Sales Detail as
primary pill tabs in its workbar, matching the basic modules. Their canonical paths are
`/sales-board/overview`, `/sales-board/trends`, `/sales-board/channels`, and `/sales-board/sales`.
All four retain the existing `sales_board.overview` owner permission; no additional backend grant
is introduced. The shared filter workspace persists across these sections; the route owns the
selected section. Legacy `?view=` bookmarks redirect to the matching path while preserving filters.
This complementary analytics pilot adopts the KPI standard’s view separation;
channel composition replaces its default organizational ranking view. Organization remains a
shared filter. Three primary metrics are used instead of inventing eight unsupported metrics.
Use shared title/filter/table/pagination/modal/navigation engines, scoped navigation memory,
localized copy and responsive light/dark presentation. View/filter state is recoverable; fetched
records and selected rows are not persisted. All summary/group totals cover the full filtered
result, not merely the visible page. Native row currency is retained. Analytical totals use the
existing backend currency engine and explicitly preserve incomplete conversion evidence.

## Analytical workspace refinement (2026-10-19)

The approved tab order is Overview, Trends, Origins and Channels, and Sales Detail. The last
label changes, but `/sales-board/sales` and its permission remain stable. Each section has its
own purpose in the title bar. Search comes first, followed by period and origin. Today, current
week (Monday through today), and current month (through today) use the company date returned by
the server. Custom intervals expose both dates. Channel, status, unit, and business remain in
More filters. Trend granularity belongs beside its chart, not in every view's filters.

The three supported summary metrics remain authoritative backend projections. The count is
labelled Number of sales and explains its cancelled/rejected exclusions. Metric links open active
sales; the period's general detail link preserves the chosen status. A small-sample cue is shown
below ten active sales; this is a reading aid, not a statistical significance threshold. The
largest recorded origin/channel is descriptive only. Channel shares use complete, positive
preferred-currency totals; incomplete or zero-denominator shares remain unknown. Trend points
open their exact interval, with the series-detail list providing the keyboard alternative.

Sales Detail reuses the shared configurable-column, sortable/resizable table, pagination and
modal engines. Folio and actions stay visible; column visibility/order/widths store presentation
preferences only. Native amount sorting is server-side: currency code A–Z first, amount in the
requested direction within each currency, and record id as stable tiebreaker. It does not compare
unconverted currencies as equivalent. The modal separates commercial data, native amounts,
collection/fulfillment states, and Finance-owned accounting evidence.

CSV export reads all matching pages through the same authorized owner endpoint (200 per request),
with explicit dates and filters captured at the start, capped at 10,000 records. It refuses an
oversized result rather than truncating; aborts on scope/view/filter disposal, changed counts,
empty intermediate pages or duplicate ids; and escapes spreadsheet formulas in text fields.
Exports retain native currencies and localized statuses. This is a live paginated report, not
an immutable cross-request snapshot: concurrent updates that keep the count and ids unchanged
can appear in later pages. No new endpoint, business mutation, grant, posting or migration is added.

## Analytical definitions

- Scope: authenticated company and operational unit/business, sale date (inclusive bounds),
  source, recorded channel, commercial status, and literal search of number/customer/seller.
  Records without a sale date cannot belong to a dated interval and are excluded.
- Registered sales: `SUM(total_amount)` of nondeleted rows whose commercial status is not
  cancelled/canceled/rejected/voided. Includes taxes. It is not collections, recognized revenue,
  net sales after returns, or profit. Existing POS returns and Finance net reporting retain ownership.
- Active count: count of those same eligible rows. A POS link is enrichment, not a second record.
- Average sale: complete preferred-currency registered total / active count, HALF_UP to two
  decimals. Zero denominator or incomplete conversion yields null, never a fabricated zero.
- Supporting amounts: sum of recorded taxes; amount before tax = total minus recorded tax.
  Cancelled/rejected count is visible separately and never inflates registered totals.
- Comparison: immediately preceding interval with exactly the same number of calendar days and
  identical filters. Percentage change = `(current - previous) / abs(previous) * 100`, HALF_UP to
  two decimals; a zero prior value or missing monetary evidence yields null.
- Trend: full interval including zero-sale dates. Calendar-week buckets end on Sunday; calendar
  months and first/last partial buckets retain exact dates. Previous buckets use matching day
  offsets and duration, not an implied same-weekday or same-calendar-month comparison.
  Auto grouping uses day for <=62 days, week for <=366, otherwise month. Explicit day/week/month
  is supported; total range is bounded to 3,661 inclusive days. Hours are not inferred from CRM
  creation timestamps. The display describes observed activity, not statistical seasonality.
- Weekday pattern: registered total / number of occurrences of that weekday in the selected
  interval, including dates without sales. A weekday absent from the interval yields null.
  Currency-incomplete points are chart gaps; zero-sale points remain genuine zeroes.
- Currency: shared verified daily analytical reference, same reference for current and previous
  periods. Native currency breakdowns remain available when conversion is incomplete. This is
  analytical comparison, not historical booked foreign-exchange accounting. Currency subtotals
  are summed before conversion; chart/bucket display rounding can differ by cents from totals.
- Data reads run within a repeatable-read transaction. Pagination affects detail only. Summary,
  comparison, channel composition and trends cover the full filtered set.

Users can drill from a channel or trend interval into the filtered sales list and open a read-only
sale detail. Detail exposes recorded commercial/payment/inventory/delivery states, original
currency, POS ticket reference and limited posting evidence. No new customer, campaign, sale,
payment, cancellation, stock movement or journal action is introduced.

## Verification

Isolated-database integration tests must cover POS/CRM deduplication, tenant/unit/business scope,
missing links/channels, cancellation, multi-currency aggregation, pagination vs full totals,
posted/reversed journal evidence, invalid filters and module/tab/session gates. Existing Sales,
POS and financial owner regressions remain relevant. Frontend requires focused flows, TypeScript,
build and browser review. Financial operations and production deployment are outside this pilot.
