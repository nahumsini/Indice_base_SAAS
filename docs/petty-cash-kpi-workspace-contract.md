# Petty Cash KPI workspace

Approved module adoption, 2026-09-15. Extends `KPI_TAB_STANDARD.md`, the Petty Cash
domain, prospective classification and signed statement-close contracts.

## Presentation and scope

Use Overview / Analysis / By unit / Statements and receipts, green shared view
navigation and equal 24 px title/navigation/filter gaps. All views share search,
statement period/status, fund classification, unit and business. Default classification
is INTERNAL_COMPANY; EXTERNAL_MANAGED has an explicitly separate custody view.
There is no combined company/third-party total. Historical classification comes from
the statement snapshot, never the fund's current classification. Unit/business are
the fund's current organizational assignment (the source has no historical snapshot).

Overview contains eight indicators; Analysis contains authorization composition,
period evolution, evidence and fund/responsible comparisons; By unit includes every
unit with pagination; Detail includes every selected statement, receipt and movement.
View changes preserve filters/pages, do not reload sources, and mount charts only in
the active view. Memory is company/user scoped; `view` overrides memory. Refresh
reloads the actual workspace and its aggregates. Print covers all filtered rows,
independent of the selected view, table sort and page. Native transaction currencies
are preserved in details and report rows.

## Measurement definitions

| Indicator | Owner / formula / exclusions |
| --- | --- |
| Funds delivered | Statement assigned + additional deposits. Excludes opening carry; not company expense. |
| Captured purchases | Valid settlement-line totals; excludes REJECTED and REVERSED. |
| Authorized outflows | Valid lines in EXPENSE_CREATED for internal snapshots; VALIDATED for external snapshots. External outflow is not a company expense. |
| Awaiting authorization | Remaining valid receipt totals; attachment presence alone does not authorize. |
| Current recorded balance | Signed current balance of active, currently same-classification funds related to the selected statements; include funds with no statements only in the all-period/all-status scope. Not a physical count, historical balance, available budget or company liquidity. |
| Recorded shortages | Persisted statement shortage amounts, including resolved historical shortages; not an outstanding debt or surplus forgiveness. |
| Evidence coverage | Valid lines with at least one attachment / all valid lines. Empty denominator is unavailable. Authorized without attachment remains authorized. |
| Statements still open | Nonterminal statements, including SETTLED. Excludes CLOSED, TRANSFERRED_TO_NEXT_CUT, FORGIVEN_SHORTAGE and CHARGED_TO_EMPLOYEE. Not a count of overdue cuts. |

Authorization composition is captured = authorized + pending by the same receipt
population. No funding/current-balance/shortage pie: these are not disjoint amounts.
Trend includes every selected statement period, with the same global filters.
Rankings show amounts, not employee performance scores. The former weighted health
score is removed. No volume-based healthy/critical thresholds are invented.

Counts and documentary exceptions derive from workspace records. Monetary aggregation
remains server-owned BigDecimal, grouped by native currency and converted by the
existing rate owner. Additive PETTY_CASH_CUSTODY_* metrics support both classifications
for explicit Petty Cash analytics; existing company-only metrics are unchanged.
Every query retains company, operational scope, deleted/status checks and explicit ID
selection. Empty IDs yield zero; failed or partial conversions display unavailable,
with native currency context. Batch requests obey the 100-query limit without dropping
groups. Oversized record selections fail visibly rather than silently truncating.

Unlinked movements are excluded because no historical classification/cut can be proven;
their exclusion is disclosed. Rejected/reversed receipts remain in the native detail
for audit but do not contribute to indicators. Closed funds are not current cash.

## Boundaries and verification

No ledger writes, closing rules, payroll charges, fund-type changes, Treasury postings,
budget effects, permissions of existing metrics, or historical records are changed.
No schema migration. Loading/error/empty/partial states are explicit; failed source
loads never produce a synthetic zero dashboard. New copy supports all module locales.
Focused regression must cover snapshots, external validation, negative balances,
empty denominators, full trend/group coverage, filters, navigation/report scope,
batching, source refresh and server tenant/organizational scope.
