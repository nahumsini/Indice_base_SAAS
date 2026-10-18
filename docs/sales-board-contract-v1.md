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

The coral shared module shell exposes one workspace with Overview, Trends, Origins and Channels,
and Sales views. This complementary analytics pilot adopts the KPI standard’s view separation;
channel composition replaces its default organizational ranking view. Organization remains a
shared filter. Three primary metrics are used instead of inventing eight unsupported metrics.
Use shared title/filter/table/pagination/modal/navigation engines, scoped navigation memory,
localized copy and responsive light/dark presentation. View/filter state is recoverable; fetched
records and selected rows are not persisted. All summary/group totals cover the full filtered
result, not merely the visible page. Native row currency is retained. Analytical totals use the
existing backend currency engine and explicitly preserve incomplete conversion evidence.

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
