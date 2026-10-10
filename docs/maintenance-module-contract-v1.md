# Maintenance module contract v1

Status: approved implementation scope; pilot until the public release gate is completed.

Maintenance owns technical requests, work orders, preventive procedures, equipment service
history, evidence, outage intervals and operational indicators. The authenticated route remains
`/maintenance`; APIs live under `/api/v1/maintenance`. The six tabs are requests, orders, assets,
preventive, indicators and configuration. New storage and API identifiers are English.

## Authority and ownership

Every operation requires a current company membership, module entitlement/assignment and the
relevant tab grant. Managers operate within the native HR organizational scope. Technicians see
their assigned orders; requesters see their own reports. Asset selectors use the current work
profile's organizational scope. Configuration is restricted to company administrators; operational
management also admits managers/approvers within their assigned scope. Public demo sessions are
not authorized. QR codes contain an authenticated deep link, never access credentials.

HR retains equipment ownership, custody, personal information and accounting values. A maintenance
asset is a technical dossier or a location, optionally linked to an HR asset through its owner
contract. Maintenance must not silently unassign equipment or change HR custody status. Technical
outages belong to Maintenance and do not replace HR status.

Inventory owns stock and movements. Parts consumption and reversal must use its transactional
owner service and require native Inventory permission. Expenses owns invoices and payments;
Maintenance may link an existing expense with native Finance permission. Closing an order never
creates a payment. Parts, labor and service expenses are separate cost sources; expense references
that duplicate parts costs are excluded from actual totals. Currency is explicit and immutable
after a cost entry. Unavailable source data is not reported as zero.

## Operational lifecycle

Requests are NEW, ACCEPTED or REJECTED. Acceptance creates exactly one corrective order. Rejection
requires a reason. Orders progress through OPEN, ASSIGNED, IN_PROGRESS, WAITING_PARTS,
WAITING_VENDOR, PENDING_VALIDATION, CLOSED or CANCELLED. Technicians execute their assigned work;
managers assign, reschedule, validate, cancel and reopen. Closure requires diagnosis, resolution,
completed required procedure steps and the evidence required by the order's procedure snapshot.
Cancellation, reopening and date changes retain an audit reason. The original deadline remains
available for on-time performance; rescheduling never erases lateness.

Business records are retained. Mutations use optimistic versions, creation keys and transactional
company locks. Retries cannot duplicate requests, accepted orders, cost entries or preventive
cycles. Audit events are append-only. A blocking order creates one open outage per asset;
restoration is explicit and prohibited while another blocking order remains unresolved.

## Prevention and indicators

Preventive plans use a local anchor date, an IANA timezone and daily/weekly/monthly recurrence.
Monthly dates derive from the original anchor (January 31 -> February 28 -> March 31). A bounded
worker generates due cycles with a unique plan/cycle key, only while the company is entitled.
Generated work has a deadline; a deadline is not a confirmed technician appointment. Assignment
and scheduling use current membership and the shared Scheduling/HR availability contracts.

Backlog includes all unresolved work, even from earlier months. Period indicators disclose their
range and denominator. Response time starts at the report and ends at triage; repair duration is
elapsed time from execution to validated closure. Outage intervals are clipped to the selected
period and never double-count overlapping faults on one asset. Financial totals are grouped by
currency and preserve source completeness. Empty samples produce null, not invented performance.
Cost summaries use closed orders in the selected closure period, with estimated, incurred and paid
service amounts shown separately. Above 500 orders the server returns an explicit limit state,
without partial totals; users narrow the period. Preventive drilldowns use original deadlines
and exclude cancelled work so the list matches the indicator denominator.

## Interface and commercial scope

Use the Frontend OS shell, tab authorization, shared filters/table/pagination, workspace navigation
memory and modal engine. Report/progress/edit are standard forms; an order dossier is an
operational workspace; preventive setup is a dependent wizard. Confirmation and draft guards
must use the same active frame. Support all eight application locales and mobile layouts.

Core maintenance is included without an additional module charge, alongside the approved Agenda
and Meetings exception. This decision does not bypass tenant entitlements, seat/storage limits or
native module permissions, and does not change existing subscriptions or external prices.
External messaging, sensor ingestion, offline synchronization and predictive AI are future scope.

## Verification

Use the isolated integration database. Cover tenant/unit boundaries, technician ownership, CSRF,
concurrent versions, accepted-request retries, invalid transitions, required evidence, preventive
month-end/retry behavior, outages, owner-service rollback and currency isolation. Preserve Agenda,
Meetings, HR, Inventory and Finance regressions. Local preview is functional data, not a test DB.

### Local verification, 2026-10-09

- 34 Maintenance/migration checks passed against isolated `indice_test_db`, including actual native
  inventory issue/reversal, Finance links, Process tasks, concurrent retries and immutable evidence
  registration. Object storage is mocked in evidence integration tests; content validation is real.
- 142 connected-owner regression cases passed across Agenda, Meetings, Consulting, HR assets,
  Inventory and Expenses. The HR MVC slice needed mocks for the existing global Learning advice;
  its ten cases passed after correcting that test setup. No HR production behavior was changed.
- 41 focused frontend regressions, TypeScript and the production frontend build passed. Vite still
  reports existing large shared application chunks; this is not a Maintenance flow failure.
- `npm run test:maintenance-browser` exercises synthetic browser flows: execution/validation,
  stable retry keys, dirty drafts, preventive wizard, QR, sorting, metric drilldowns, views,
  mobile, all eight locales and permission revocation. Use the repository's installed Playwright
  runtime or `INDICE_PLAYWRIGHT_MODULE`/`INDICE_CHROME_PATH` overrides for a local browser.
- Local frontend `127.0.0.1:5175` and backend `127.0.0.1:8083` were checked with a real authenticated
  session and all six tabs. Additive migrations reached V311 after a local database backup;
  no business records were created by the browser smoke. Prior Agenda/Meetings work remains intact.

Release status remains pilot. Public deployment, external messaging/calendar synchronization,
sensors, offline operation and predictive AI: N/A for this implementation. Public release
certification remains governed by the repository release gate.
