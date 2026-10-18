# Sales opportunity call reminders

Status: approved local implementation, 2026-10-18. Owner: Sales (`crm.leads`).
Follows the Frontend and Backend Operating Systems and the existing `AppNotificationService`
inbox contract. This extension adds no endpoint, delivery provider or permission grant.

## User flow

- The opportunity column is **Siguiente acción / Next action**. Table and Agenda use the same
  accessible date/time editor and the same persisted schedule. Browser-local schedule drafts
  cannot override a saved opportunity or cross company/user boundaries.
- A call on an open opportunity with an active, authorized assigned owner and a complete date/time
  automatically produces an in-app bell notification for that owner one hour before the call.
  Closed, on-hold, deleted, unassigned, date-only and non-call actions are ineligible.
- The company business timezone is shown above the views and the saved timezone beside scheduled
  calls. The server resolves it through the business timezone resolver already adopted by Sales.
- Notification links open the existing opportunity history in its active flow after native page
  authorization. The global inbox contains the date/time and timezone, without customer contact data.
- Scheduling within the last hour produces an alert on the next worker pass. Past calls do not
  produce new alerts. This is an in-app reminder, not a desktop push, email or WhatsApp delivery.

## Persistence and delivery

V321 retains the legacy `nextActionAt` wall-clock API and adds server-derived
`nextActionScheduledAt` (UTC) and `nextActionTimezone` (IANA snapshot). Clients cannot set the derived
fields, including through snake-case aliases. A supplied date without a time remains a calendar
date; an explicit midnight is a valid complete schedule. Empty/null clears the schedule; an omitted
field leaves it unchanged. Invalid dates and DST gaps/overlaps are rejected instead of guessed.
Timezone configuration changes do not silently move already scheduled calls.

Existing non-midnight schedules are resolved and snapshotted by the worker as they approach the
delivery window. Legacy midnight values cannot distinguish a date-only input, so they require an
explicit time to be saved before arming a reminder. Existing records are not rewritten by migration.

Sales performs bounded cross-company candidate discovery every 60 seconds, up to ten batches of
100 per pass with a continuation cursor. Each candidate uses a separate tenant-scoped transaction,
locks its opportunity, rereads current state and checks company/module/tab authority and active
recipient membership. Failed candidates remain eligible for retry; no personal content is logged.
The inbox polls every 60 seconds. Delivery therefore has polling latency, and depends on the backend
being available; missed windows are recovered only while the call is still in the future.

The unique inbox event key (opportunity + UTC schedule, scoped to company and recipient) is the
durable delivery receipt. Concurrent workers, process restarts and repeated reads cannot create
duplicates or revive dismissed/read reminders. A previously notified combination is notified once,
even if the user switches away and later restores that same time/recipient.

Ordinary repository edits immediately cancel obsolete notifications in the same transaction while
retaining their history. Worker reconciliation also handles lifecycle changes through flow services.
Changing the schedule, action or recipient never sends a reminder based on stale job data.

## Verification and rollback

Focused tests cover date/time round trips, midnight/date-only distinction, clear/omit semantics,
DST validation, forged derived fields, the one-hour boundary, late/past scheduling, rescheduling,
owner changes, lifecycle/deletion, permission denial, tenant isolation, concurrent workers,
restart/dismissal deduplication, legacy adoption and worker discovery without a browser.
Database tests run only in an isolated `indice_test_db`; Flyway startup and version uniqueness are
required. Frontend checks include the shared editor, authoritative Agenda state, regressions,
TypeScript and build.

Rollback can run the prior application against the additive schema. Retain V321 and all inbox
records; do not reverse an applied migration or delete business data.

## Local handoff — 2026-10-18

- Changed backend files: `OpportunitySchedule`, `OpportunityReminderService`,
  `OpportunityReminderScheduler`, `SalesDefinitions`, `SalesRepository`, `SalesService`, and V321.
- Changed frontend areas: the shared `OpportunityScheduleInlineEditor`, Prospectos table/Agenda
  wiring and copy, schedule formatters/API adapters/types, the partial opportunity update path,
  and notification title/priority/style mappings. Canonical frontend/backend documents link here.
- Preserved: existing routes, flow/stage ownership, financial calculations, authorization and
  the unrelated working-tree changes. External delivery and production deployment: N/A.
- Passed: 41 Java tests (including 9 database integration cases), 62 frontend regressions,
  TypeScript, backend compilation, production frontend build, migration uniqueness and Flyway
  startup through V321 in isolated MySQL. Table/Agenda navigation and the shared editor were
  inspected in Chrome. No functional opportunity was changed for testing.
- Initial validation caught date parsing/JVM timezone issues, which were corrected. The CSRF
  test slice now mocks the unrelated learning response advice. Compilation was isolated from
  editor-generated class files after a concurrent-output failure. No unresolved test failure;
  the frontend build retains its existing large-chunk warning.
- Local frontend 5175 and backend 8083 are running with V321 applied. Backend classes are in
  `/tmp/indice-call-reminder-java/target/classes`; the previous runtime classes are retained in
  `/private/tmp/indice-sales-board-final-build-20261017/target/classes`. The isolated test MySQL
  container is stopped after validation. Reminder timing/availability limits are stated above.
