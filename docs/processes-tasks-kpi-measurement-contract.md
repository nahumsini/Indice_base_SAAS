# Processes and Tasks KPI measurements and internal views

Status: approved by the product owner; implementation closed on 2026-09-16.
Owner: Processes and Tasks. Extends `KPI_TAB_STANDARD.md` and
`processes-tasks-shared-processes-contract.md`.

## Presentation and compatibility

`/processes-tasks/kpis` uses Overview, Analysis, By unit and Performance with
`IndiceWorkspaceNavigation variant="views"`, the module yellow, and a shared
24 px grid gap between title, selector and filters. View/entity are persisted as
`view` and `entity`; invalid values restore Overview/Collaborators. They do not
change request scope or cause a dashboard reload. Tables stay mounted across
view/entity changes; global scope changes reset pagination. Responsive charts
mount only in their visible view.

The eight primary cards are tasks in scope, deliveries in period, open at cutoff,
past deadline, delivered on time, pending audit, observed audited quality and
missing required evidence. No evaluable deliveries/ratings yields an unavailable
value, not zero or a failing score. No evidence requirement yields Not applicable.
New measurements do not use universal traffic-light thresholds or imply labor
capacity. Supporting analysis and entity tables carry samples and explanations.

The existing authenticated `GET /api/v1/process-task-kpis` retains its routes,
request parameters, legacy summaries/cards/comparison/trend and authorization.
It adds `measurements` (definitionVersion 1), typed summary and dated activity.
Existing collaborator/process/project/unit rows gain a nullable `measurements`
projection. Projects also expose `deadlineExceeded` using their recorded deadline
and current status. Consumers with an older response show an explicit unavailable
notice and retain the existing cards. Unknown measurement versions fail closed in
presentation rather than fabricating zero-valued fields.

Legacy Agenda breakdown and operational-index comparison remain available under
an Analysis disclosure. They retain Agenda's classification rules; they are not
presented as the new deadline measurements. This release does not change task
states, completion rules, permissions, historical data or schema.

Highlighted attention rankings use visible late-open and pending-audit counts,
not the legacy productivity/health composites. A progress bar is shown only when
it represents a real proportion, such as late open tasks divided by open tasks.
Source failures show localized safe copy rather than raw server messages. A
single-category composition uses a deterministic accessible donut so the chart
cannot disappear because of chart-library arc geometry.

## Scope and temporal meaning

All measurements use the same backend `taskFilter` as the existing dashboard:
authenticated company, task visibility, unit/business, collaborator, project,
focus, status, search and period selection. No additional tenant authority comes
from the browser. A shared task counts once globally and once per participating
collaborator; per-person rows must not be summed into a unique-task total.

The cutoff follows the existing service: current server date clamped to the
requested range. Date-only deadlines are inclusive calendar dates. Dates and
DATETIME values use the existing persistence conventions; this release does not
introduce a tenant time-zone conversion. Historical results are reconstructed
from the currently retained timestamps, deadlines and assignments, not immutable
snapshots. Deadline edits/reopenings may change historical results. When a
retained cancellation timestamp exists it controls historical state: a task
cancelled after cutoff remains open at cutoff. Current `cancelled` status is only
the compatibility fallback for records without that timestamp.

The visible task cohort is deliberately retained. In particular, the new metrics
do not discover tasks outside the selected Agenda scope or include previously
excluded cancellations. The upcoming window is cutoff through cutoff + 7 days,
clipped to the selected period and cohort. No hidden filter expansion occurs.

## Measurement definitions

| Measurement | Definition and sample |
|---|---|
| Tasks in scope | Unique task IDs returned by the shared filter. |
| Deliveries in period | Retained completion date inside the selected range and no later than cutoff; excludes cancelled records. Auditing does not add another delivery. |
| Delivered on time | Deliveries whose completion calendar date is on/before the current recorded `due_date`, divided by deliveries with a deadline. Excluded missing deadlines are counted explicitly. |
| Open at cutoff | Task existed at cutoff, had not closed/cancelled by cutoff, and is not a legacy completed task with a missing timestamp. Current cancelled records are excluded. |
| Past deadline | Open-at-cutoff tasks with `due_date < cutoff`, independently of pending/in-progress/paused Agenda status or a rescheduled agenda date. |
| Priority/aging | Open and late tasks with priority `high`; late age in calendar days grouped 1–3, 4–7, 8+. |
| Pending audit | Closed by cutoff (or legacy completed) and not audited by cutoff. Known completion dates support median wait in whole calendar days. |
| Audit turnaround | Median elapsed days between valid completion and audit timestamps for audits inside the period and by cutoff. Invalid/negative durations are excluded; sample size is returned. |
| Audited quality | Observed 0–5 ratings for audits dated in the period and by cutoff. Average, six rating buckets, rated and audited counts. No substitution with audit coverage. |
| Required evidence | Only tasks with `evidence_required`; current active attachments determine presence. Missing evidence is separated into open and closed tasks. This is document presence, not review of file contents. |
| Elapsed time to close | Median creation-to-latest-completion days for valid deliveries. Tasks materialized by a process run (`process_run_id`) are excluded to avoid mixing advance generation with execution time; a manually created task may retain `process_id` and remains eligible. Not working hours; reopening history is not reconstructed. |
| Upcoming deadlines | Open tasks with deadline in the explicit upcoming window and selected cohort. |
| Runs observed | Distinct runs represented by visible tasks with an existing start date no later than cutoff. Future runs excluded. |
| Runs with visible delays | Observed runs with at least one visible open task past its deadline. Computed from tasks, not a stale persisted delay flag. |
| Fully observed completed runs | All non-deleted run tasks must be represented in the filtered cohort and all completed by cutoff. Partial runs are never called fully completed. This is not cancellation-incidence or scheduled-generation compliance. |
| Project past deadline | Current project state is neither completed nor cancelled and its recorded deadline precedes cutoff. Only projects already represented in the authorized task cohort are considered. |
| Activity series | All selected tasks grouped by agenda/start/deadline date for planned activity, completion timestamp for deliveries, audit timestamp for audits. Events outside the selected period are excluded; audited tasks remain in the delivery series on their completion date. |

A future record without enough information is not inferred from an index. Retrabajo,
hours worked, full run cancellation incidence, cost, capacity and missing recurring
materializations remain outside this contract until their traceability is defined.

## Navigation, detail and export

Performance uses one entity selector: Collaborators, Processes, Projects.
Each entity table retains column controls, sorting, pagination and Agenda access,
and defaults to the relevant new workload/deadline/quality/run/project columns.
Agenda links preserve global search unless an entity-specific search replaces it.
They open the entity's Agenda; they do not claim that Agenda's `overdue` status
exactly matches the independent deadline measurement.

By unit includes every unit in the response, with pagination and sorting. The chart
shows the same page as the table; page bounds and total units are explicit. Null
on-time rates are not converted to zero.

The print report uses the complete dashboard independently of active view, entity
or table page. It includes the eight measured cards, measurement details, every
unit and every measured entity, and retains the existing operational report
sections. Customer-entered names remain escaped by the common print engine.

## Verification

Regression coverage:

- `ProcessTaskKpiMeasurementsTest`: on-time/late deliveries, paused/in-progress
  delay, evidence requirement, null versus zero ratings, audit age/duration,
  deduplicated team participation, future/partial runs, actual event dates,
  cutoff and clipped upcoming window.
- `ProcessTaskKpiMeasurementsIntegrationTest`: real MySQL SQL/mapping and legacy
  summary compatibility, tenant isolation, restricted visibility and search.
- Existing API-controller and task-visibility tests.
- `react/tests/process-task-kpi-views.test.mjs`: isolated views, memory validation,
  unchanged loading dependencies, filter-preserving links, retained table
  instances, complete printing, escaped report names, missing measurements and
  eight supported locales, safe errors, evidence-based rankings and the
  single-category chart fallback.
- Existing Processes and Tasks UI regression, TypeScript and production build.

Integration tests use the isolated `indice_test_db` database and transactional
synthetic fixtures, never the functional or production database. Flyway
validated 276 migrations and advanced that test schema from 272 to 276. No
production deployment is part of this task.

### Delivery evidence

- Backend: 35 focused tests passed (12 measurement, 2 real-MySQL integration,
  17 API-controller, 4 visibility tests).
- Frontend: 29 focused tests passed (19 existing module regressions and 10 KPI
  view/data/export regressions). TypeScript and production build passed.
- The existing build still reports large chunks; this change introduces no new
  runtime dependencies.
- Isolated frontend at `http://127.0.0.1:5175/processes-tasks/kpis` validated
  against the backend on port 8082. Authenticated desktop review covered
  Overview, Analysis, By unit and Performance; mobile review covered Overview.
  There were no browser exceptions, horizontal page overflow, raw server errors
  or failed KPI requests. The one-category composition rendered visibly.
