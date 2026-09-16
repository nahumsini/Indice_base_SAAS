# Human Resources KPI Measurement Contract

Status: approved runtime contract, 2026-09-16.

This document defines the meaning, availability, scope, and presentation of the
Human Resources KPI workspace. It extends the repository-wide
[KPI Tab Standard](KPI_TAB_STANDARD.md). Authorization, tenant isolation, and
the owner modules' operational rules remain authoritative.

## Scope and sources

The workspace combines the authenticated user's already-authorized HR sources:

| Source | Use | Availability rule |
|---|---|---|
| HR users | Employee scope and organizational dimensions | A failed request makes every employee-scoped result unavailable. |
| Attendance control overview | One operational date and the same weekday seven days earlier | The current-date request governs daily attendance availability. A failed comparison request is declared as partial data and does not replace the current result. |
| Permission requests | Current request state intersecting the selected period | The management source is used as authorized. A failure never falls back to the current user's personal list. |
| HR records | Current record state for records dated inside the selected period | Open and critical-open results use the same unique record cohort. |
| Assets | Current asset state | Complete pages are loaded at the server-supported page size. Assigned assets follow the responsible employee's scope. |
| Monetary aggregation | Registered value of the filtered asset identifiers | The backend remains authoritative for currency conversion and access scope. Failure is declared separately and renders the value unavailable. |

The workspace must distinguish a measured zero from `N/A`. A failed, denied, or
provably incomplete source produces `N/A`, an unavailable status, and a visible
source warning. The same warning is included in the printed report. Empty arrays
created after a failed request are never presented as measured zeros.

Complete collection loading follows the real source contract. Non-paginated
responses stop after the first complete response. Paginated responses follow
declared page metadata, deduplicate stable identifiers, and fail closed if the
declared total cannot be collected or a page repeats.

## Shared filter scope

Unit, business, department, employee search, attendance state, period, and
operational date form one shared workspace scope.

- Employee search covers employee identity and organization fields.
- Assigned assets belong to the scope through their responsible employee.
- Unassigned assets can be included by unit only when no narrower business or
  department filter is active.
- Permissions and records must belong to an employee in the filtered employee
  cohort. A name match is used only where the permission contract lacks an ID.
- When an attendance-state filter is active, failure of the attendance source
  makes the derived employee scope unavailable instead of returning zeros for
  other sources.
- Current permission and record statuses are not reconstructed historical
  statuses. The period selects the request overlap or record cohort; the status
  shown is the status available at query time.

## Attendance measurements

Attendance is measured for the selected operational date from assignments with
a working schedule. A working schedule has a rule, is not a rest day, and is not
`not_scheduled`.

Definitions:

- `present = on_time + late`
- `completed sample = present + confirmed absence`
- `confirmed attendance rate = present / completed sample`
- `punctuality rate = on_time / present`

Rates are unavailable when their denominator is zero. A confirmed absence can
therefore yield a valid 0% attendance rate. Pending or in-progress shifts,
leave, rest, and missing/not-scheduled configuration are reported separately and
do not enter either denominator. Pending work is not treated as a fault.

The comparison shown for attendance and punctuality uses the same operational
weekday seven days earlier. If that comparison source is unavailable, the
current measurement remains valid but the comparison is `N/A` and partial data
is declared.

## Records, permissions, and assets

- An open HR record is any record whose current status is not `resolved`.
- A critical-open record is an open record with high severity. It is a subset of
  open records and is never added to the open count a second time.
- A resolved high-severity record remains historical and is not an open risk.
- Pending permissions are a current inventory inside the selected overlap
  period. No arbitrary count threshold changes them from watch to critical.
- Assigned asset items include `assigned` and `custody` states.
- People with assigned assets are distinct responsible employee identifiers.
  This is not an equipment-coverage percentage because the system does not yet
  contain an authoritative population of roles that require equipment.
- Assets in maintenance are an explicit watch signal. Asset value is shown only
  when the authorized monetary aggregation succeeds.

## Status and attention semantics

The workspace does not calculate a workforce-health, readiness, performance, or
employee score. Statuses describe the visible facts only:

- `Measured`: the source is available and no defined attention signal exists.
- `Watch`: at least one explicit noncritical signal exists, such as lateness,
  missing schedule configuration, a pending permission, an open noncritical
  record, or an asset in maintenance.
- `Critical`: a confirmed absence or critical-open record exists.
- `Unavailable`: one or more sources required for that value or row failed, or
  a rate has no valid denominator yet. A zero denominator is not labelled as a
  measured result.

Unit and employee tables display counts of concrete attention signals. They do
not apply weights, hidden thresholds, complements, or inferred equipment needs.
Pending shifts, leave, and rest do not enter the attention queue.

## Report and consistency rules

Cards, charts, unit summaries, employee rows, the attention queue, and print
must reuse the definitions above. The printed report includes the complete
filtered workspace independently of the visible internal view, plus every
source warning. Source-dependent unit and employee cells render `N/A` rather
than zero when unavailable.

Rapid date changes are request-sequenced: only the most recent mounted request
may update dashboard state. This prevents an older response from overwriting a
newer operational date.

Source warnings use localized, source-specific copy. Raw backend or transport
error messages are not exposed in the workspace or its printed report.

## Deferred measurements

Turnover, target staffing, contract expiry, payroll cost, overtime, equipment
requirements, climate, productivity, and reconstructed historical states remain
deferred until their owner exposes an authoritative contract. They must not be
inferred from active account counts, current request states, attendance, or HR
records merely to fill a card.
