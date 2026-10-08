# Meeting planning, workflows and finite series — local verification

Date: 2026-10-07. Status: implemented and verified locally; not released or deployed.
Approval: the product owner accepted the modal/workflow analysis and requested execution.
Owner contract: [Meeting control module v1](../meeting-control-module-contract-v1.md).

## Changed behavior

- Nueva junta offers a grouped one-off form or a three-stage native wizard: purpose/people,
  schedule, backend review. Required purpose/result, clear coordinator/minutes roles, active
  member selection, searchable participants and explicit access/invitation limitations.
- Back retains input. Requests preserve drafts on error; exact-payload retries reuse the same
  key. Successful planning opens the actual first created meeting, including future dates.
- Finite daily/weekly/monthly series materialize all reviewed occurrences atomically. Maximum
  52 within 366 days; intervals 1–12. Monthly clamping, DST-gap rejection, ambiguous recurring
  time policy and tenant-person overlap counts are explicit in review.
- Save/reuse planning flows; creator/admin listing and soft archive, maximum 100 active/company.
  Existing evidence is never copied into a new meeting or removed by flow archive.
- Planning edits distinguish one occurrence from this/future planned occurrences, require
  meeting and series versions, and retain prior/started sessions and open-assignee guards.
- Flows/series workspace offers one-frame confirmations for archive, pause/resume internal
  reminders and reasoned cancellation of future planned meetings. Earlier, started and
  completed sessions, minutes, decisions and agreements remain retained.
- Explicitly delegated minutes responsibility enables only minutes/decisions editing. It
  does not grant planning/lifecycle/module/tab/admin access. Legacy default delegation follows
  coordinator reassignment; explicit independent delegation cannot be silently removed.
- Native internal reminders are off by default. Enabled meetings can emit upcoming, missing
  minutes and overdue agreement signals with current tenant/membership/module/tab checks,
  durable recipient deduplication and per-record transaction isolation. Generic localized
  inbox labels/deep links contain no meeting title, evidence or participant content.
- Action-specific minutes/lifecycle/evidence labels explain consequences. Completion never
  marks agreements fulfilled; a permission-aware shortcut opens agreement follow-up.

## Modal classifications and UX rationale

| Operation | Native workflow type | Reason |
|---|---|---|
| One meeting / one-occurrence edit / minutes | Standard Form Modal | One coherent grouped task |
| Flow/series and bulk future edit | Modal Wizard Índice | People/schedule decisions precede backend review |
| Meeting detail / flows-series management | Operational Workspace Modal | Compare contextual records/settings and actions |
| Lifecycle / archive / pause-resume / cancel-future / discard | Confirmation Modal | One consequential, explicit decision |

All use `IndiceModalFrame`, blue identity, natural sentence case, stable header/footer,
native stepper/summary/validation, responsive body scrolling and one frame at a time.
The draft remains in memory only. Participant selection never promises access or email.

## Deliberately preserved

- `control_minutas` slug, `minutes-control` route, complementary pilot lifecycle and three
  native tabs; separate authorization and independent company/object scopes.
- Existing create/edit API shapes remain accepted through optional planning fields and the
  legacy request constructor; original statuses, calculations, persistence and audit retained.
- Calendar/table/search/filter/sort/pagination/workbar and safe scoped presentation memory.
- Agreements ownership/assignee rules, human-confirmed evidence and no hard-delete endpoints.
- No Root corporate register migration; no grant, billing-price or entitlement changes.
- Scheduling, Sales, Training, platform administration and all pre-existing unrelated dirty
  work were preserved. Dormant mock meeting files were not used in the native implementation.

## Files changed in this extension

- Backend additions under `src/main/java/com/indice/erp/meetings/`:
  `MeetingPlanningDtos`, `MeetingPlanningException`, `MeetingRecurrencePlanner`,
  `MeetingPlanningService`, `MeetingPlanningController`, `MeetingReminderService`,
  `MeetingReminderScheduler`.
- Existing owner files extended: `MeetingDtos`, `MeetingRepository`, `MeetingService`,
  `MeetingExceptionHandler`.
- Additive schema: `src/main/resources/db/migration/V303__meeting_workflows_and_series.sql`.
  No already-applied migration/baseline was edited.
- Frontend under `react/src/app/ComplementaryModules/MinutesControl/`: `MinutesControl`,
  `MeetingPlanningForm`, `MeetingPlanningModal`, `MeetingWorkflows`, `MeetingEditors`,
  `MeetingDetail`, `MeetingPrimitives`, `tabs/MeetingsTab`, `services/meetingApi`,
  `translations/meetingWorkflowCopy`, `utils/meetingPlanning`.
- Explicit notification presentation extension:
  `react/src/app/components/notifications/notificationCatalog.ts`.
- Tests: `MeetingRecurrencePlannerTest`, expanded `MeetingIntegrationTest`,
  `react/tests/meeting-control-regression.test.mjs`, `meeting-control-browser.mjs`,
  `tests/browser/meeting-control.tsx`.
- Documentation: owner contract, frontend/backend canonical owner extensions and this report.

## Verification results

- **55 backend tests PASS**, no skips: `MeetingIntegrationTest` (23), recurrence planner (5),
  meeting access (5), route classifier (10), module access (4), Scheduling access (4),
  tab catalog (2), migration uniqueness (2). Maven compilation also passed.
- Database tests used only isolated `indice_test_db` at `127.0.0.1:13307`. Tests assert the
  database identity before writing. Covered tenant/object isolation, exact-tab denial,
  CSRF, atomic/idempotent and concurrent whole-series retries, 80-character keys,
  explicit overlap acknowledgment, monthly/DST behavior, independent minutes rights,
  late-row rollback of bulk edits, stale versions, retained history/agreements, archive,
  reminder deduplication, inactive membership, revoked entitlement and tab-limited signals.
- Flyway startup validated all 302 migration files and schema V303, zero pending/failed;
  migration uniqueness passed. The dedicated native-local database also started at V303.
- **145 frontend regressions PASS**: 30 meeting/Scheduling/notification/learning/workbar tests
  plus 115 auth/users/Training/platform/distributor tests. Eight locales provide all new
  planning/consequence labels and generic notification identity.
- **TypeScript PASS** (`npm run typecheck`) and **production bundle PASS** (`npm run build`).
- **Playwright flow PASS** with synthetic, isolated API fixtures: single-create retry/CSRF;
  wizard retained Back state; three reviewed dates and delegated minutes role; save/reuse/archive
  flow; future-edit review; pause/resume/cancel; scoped notification links; no coordinator
  controls for delegated minutes; calendar/table/filter/sort, lifecycle, agreements, indicator
  drilldown, discard, eight locales, narrow/mobile and dark mode. Zero unexpected API calls or
  browser errors. Visual screenshots inspected, not just generated.
- **Native local smoke PASS** at `http://127.0.0.1:5175`: native synthetic-demo authentication,
  module membership/calendar, guided planning and real backend two-date preview, native
  flows/series reads. Every meeting response 200, zero browser errors. This smoke created
  no business records; its entered draft was discarded. Mutation regression used isolated DB.
- `git diff --check` PASS. Local services remain running: frontend 5175, backend 8083;
  only the dedicated 8083 process was restarted. Other local environments were not stopped.

## Failures, warnings and remaining risks

Initial test-only issues were corrected and rerun: cross-tenant test lacked its entitlement,
notification assertion used the API alias instead of database `event_type`, browser selectors
counted stepper items or matched decorative emojis/compound labels, and the first native-smoke
Close selector matched both header and footer. Final checks above have no remaining failures.

Existing compiler deprecation/unchecked/Mockito warnings and Vite chunks over 600 kB remain;
no unrelated dependency/bundle rewrite was performed. This is focused verification, not the
entire repository test suite or production security acceptance.

Internal notification checks default to about every minute with bounded batches; delivery is
best effort, not an exact-time SLA. Paused series and cancelled source meetings send no notices.
Finite series do not renew themselves. Flows have archive/reuse, not an independent template
editor. Bulk future edits preserve cadence and reject overlaps; they are not a recurrence-rule
redesign. Custom timezone selection, external calendars/video invitations/email/WhatsApp,
attachments and automatic Processes tasks are outside this extension.

Release requires user visual acceptance and the repository security/deployment gates in a
separately authorized target environment. Production/APPTEST deployment, rollback execution,
remote push/merge and billing: **N/A — not performed**. No customer/production data was accessed
or modified. Application rollback must retain additive schema/evidence, not reverse V303.

Local entry: <http://127.0.0.1:5175/minutes-control/meetings>.
