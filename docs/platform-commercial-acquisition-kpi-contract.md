# Platform commercial acquisition KPI contract

Decision: 2026-10-05. Owner: Platform Leads. This extends the Frontend and Backend Operating
Systems and the [lead diagnosis flow](./platform-lead-diagnosis-flow-v1.md). Implementation
and local verification do not certify deployment or enable website ingestion.

## Business question and layout

The workspace answers: how many consented diagnosis requests arrive, how promptly are they
contacted, which reach diagnosis/proposal/close, and which follow-ups require action now?
Mexico's diagnosis-led sale and Canada's current lead intake remain separate selectable markets.
It is not a tenant ERP sales dashboard or an automatic Canadian subscription funnel.

The existing root-only Website visits section retains its URL/permission identity. Its blue
platform workspace has three shared navigation views: `overview` (four primary cards, stages
and follow-up), `sources` (campaign results and declared plan interest), and `traffic` (existing
anonymous website observations). Use one period filter, and a lead-market filter only for
commercial views. Persist these preferences through existing workspace navigation memory.

This platform acquisition workspace is a domain exception to the basic-module eight-card grid
in `KPI_TAB_STANDARD.md`: four decision-oriented primary KPIs plus distinct stage and attention
distributions avoid duplicating stage counts as eight headline cards. No invented organizational
ranking, financial forecast, score or benchmark is required. The reference is the documented
24-hour contact promise; other rates show their numerator and denominator rather than arbitrary
green/red targets. Empty denominators are unavailable (`null` / `—`), not zero performance.

## Sources, time and market

- Confirmed requests are rows in `platform_leads`, saved by the established verified intake.
  They are confirmed persistence, not qualified leads, paid customers or validated prospects.
- The 7/30/90-day cohort begins at UTC midnight `days - 1` calendar days before today's UTC
  date and ends at `measuredAt`. Include only `created_at` in that range. A report observes
  the cohort's progression as of refresh; it is not a count of transitions occurring in the
  period. Recent cohorts are still maturing. Period DTOs declare UTC dates and measurement time.
- Stage reach is recorded history through `measuredAt`, counted once per lead per stage.
  Repeated events do not inflate stages; advancing does not erase a previous stage. No skipped
  stage is inferred. Completed diagnosis and trial start also use their existing saved timestamps.
- First recorded contact is the earliest `CONTACTED` or `DIAGNOSIS_SCHEDULED` transition.
  Calls/messages not recorded in the workflow cannot be counted. It is not email delivery time.
- Market derives only from recorded country (MX/Mexico/México/Mexique or CA/Canada/Canadá);
  other/missing country is `OTHER`. Language, currency and anonymous location do not grant or
  infer market authority. `all` includes all recorded markets. This is an analytical filter.
- UTM source/medium/campaign are declared intake attribution, not identity matching. Empty
  dimensions normalize to `unattributed`. Blank plan interest is `UNKNOWN`; declared interest
  is not a contracted plan. Entered company/campaign names retain their original text.

## KPI definitions and drilldowns

All commercial counts are calculated by the backend over the full data set, not the inbox's
200-row display limit. Percentages are `100 × numerator / denominator`, rounded half-up to two
decimal places. Dashboard aggregates share a repeatable-read transaction and measurement time.
The authorized detail endpoint recomputes the same predicate and exposes full totals with pages
of 25 in the UI (server permits 1–100). Opening detail is a new current read, not a frozen export.

| Indicator | Definition | Detail/action |
|---|---|---|
| Confirmed leads | All received cohort leads | All cohort requests |
| Contact within 24 h | Eligible leads contacted within 0–24 h / all cohort leads at least 24 h old | Eligible cases outside that deadline; younger leads do not fail |
| Lead to diagnosis | Leads with recorded completed diagnosis / received leads | Completed-diagnosis cohort leads |
| Proposal to close | Leads with recorded `WON` / leads with recorded `PROPOSAL` | Won cohort leads; established lifecycle requires proposal before won |
| Stage reach | Received/contacted/scheduled/diagnosed/proposal/won, once per stage | Cohort leads that reached that stage, including those now further ahead |
| Guided trials | Recorded trial start in the cohort | These cohort leads; does not imply an active technical account |
| Lost / nurture | Current `LOST` / `NURTURE` status within the cohort | Corresponding current-status leads; not historical loss-reason attribution |
| Average first contact | Nonnegative elapsed hours from creation to recorded first contact | Contacted cohort leads; not an average including never-contacted leads |
| Campaign results | Cohort received, diagnosed, proposed, won and corresponding rates per source/medium/campaign | Exact dimension-filtered cohort leads |
| Plan demand | Received and diagnosed per saved plan interest | Exact plan-filtered cohort leads |

Campaign ranking returns the top 20 source groups with the full group count shown as coverage;
the cohort totals do not truncate. Plan values are limited by the existing intake contract.
Tables use the shared operational table/header, expandable persisted columns, local overflow,
localized Actions column and shared pagination. Detail projects company, current stage, owner,
market, origin, plan, receipt/contact and next-action dates. It omits email, phone, challenges,
notes, raw payloads and credentials. The existing authorized follow-up view owns any editing.

## Current attention, independent from intake period

Attention applies the selected market but **all intake dates**, excluding `WON`, `LOST` and
`NURTURE`. These categories overlap and must not be summed as a unique backlog total:

- Overdue: next action is earlier than measurement time.
- Uncontacted after 24 h: no recorded first contact and creation at least 24 h ago.
- Unassigned: no assigned administrator.
- Missing next action: no next-action date.
- Trial attention: current `TRIAL_ACTIVE` with saved end date expired or due within three days;
  show due-soon and expired counts separately in the supporting text.

Each attention row opens those records, including older requests outside the cohort. Amber
indicates a nonzero actionable category, not a health score. No automatic reassignment,
notification, lifecycle transition, contact or billing mutation is performed.

## Website availability and separate measurement

The existing global website connector stays governed by
[product-analytics-security-contract.md](./product-analytics-security-contract.md). This change
does not configure its deployment token or enable collection. If neither configured nor receiving,
show measurement pending with unavailable traffic values, not a flat zero chart. Saved commercial
leads remain usable independently from this connector.

The additive web-summary fields `converting_sessions` and `conversion_rate_percent` count distinct
measured sessions with at least one `LEAD_SUBMIT` observation / all measured sessions in scope.
Repeated submits or different pages within one session count once. Existing `conversion_count`
remains unchanged for compatibility. This metric is labeled measured website submission rate;
it is **not** an exact anonymous visitor → confirmed persisted lead → paid customer rate.
This release adds no identity linkage, campaign spend, CAC, MRR or revenue attribution.

## Protected endpoints and invariants

| Endpoint | Classification / authority |
|---|---|
| `GET /api/v1/platform-admin/leads/analytics` | Internal platform-owned commercial aggregate; session actor + `MANAGE_LEADS` via platform access service |
| `GET /api/v1/platform-admin/leads/analytics/details` | Same authority; minimally projected commercial records, bounded pages and dimensions |

No read precedes authorization; no client-supplied actor/company/role grants scope. Existing root
or active MFA platform administrator rules remain authoritative. Unauthenticated requests return
401, insufficient platform authority 403, invalid scope/pagination 400. Parameters allow only
7/30/90 days, declared markets/views and bounded source/medium/campaign/plan dimensions; values
are SQL-bound and ordering/predicates are static. These are GET reads, not session mutations.

Preserve ingestion, consent, lead transitions, account activation, tenancy, permissions, routes,
CSRF mutation enforcement, billing and entitlement behavior. No schema change or backfill.

## Verification

Cover authorization before reads, invalid parameters, zero denominators, duplicate historical
stages, young-lead SLA eligibility, market separation, old actionable backlog, terminal exclusions,
more than 200 records, matching totals/pages/dimension drilldowns, duplicate submission sessions,
stale frontend responses, localized labels, view/filter memory and opening the correct follow-up.
Run repository SQL tests only in the isolated test database, then compile, frontend typecheck,
build and relevant regressions. Never repair a functional database to make tests pass.
