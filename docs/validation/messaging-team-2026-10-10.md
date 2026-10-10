# Team messaging local verification — 2026-10-10

Scope: current working tree on `codex/agenda-juntas-operacion`, base `25fd637a`.
This is local evidence, not production release approval. The authoritative behavior is in
[the messaging contract](../messaging-and-customer-care-contract.md).

## Behavior

- ERP and employee PIN share direct chats without subject, named groups of 3–50 participants,
  server-derived read cursors and personal task capture. Support retains subject and care workflow.
- ✓ acknowledges server commit; ✓✓ means every other participant read the message. Partial group
  reading shows a count. No device delivery or presence is inferred.
- Group roster is fixed at creation; a new audience requires a new group. Inactive memberships
  cannot read or receive new messages. Team groups never become visible to care operators.
- Tasks are assigned to the current collaborator via the task owner's existing permissions and
  scope; PIN also requires the composed native tool/create capability. Chat content is not copied.
- Drafts, photos, old direct pairs, care operations, CSRF, participant/tenant scope and retry keys
  remain protected. Availability is a read; entitlement locking happens during task creation.

## Changed files

- Frontend owner: `MessagingWorkspace.tsx`, `NewConversation.tsx`, `MessagingPrimitives.tsx`,
  `QuickMessageTask.tsx`, `teamCopy.ts`, `messaging.css`, `types.ts`, `api.ts`, `messageState.ts`,
  `useConversation.ts` under `react/src/app/Messaging`.
- Backend owner: `MessagingContracts`, `MessagingRepository`, `MessagingService`,
  `MessagingController`, `MessagingExceptionHandler`, new `MessagingTaskService`.
- Task owner: new `ProcessTaskMessagingContract`. PIN adapter:
  `MultiKioskMessagingController`; capability-helper documentation in `KioskMultiDashboardService`.
- Schema: forward-only `V312__messaging_groups_and_task_requests.sql`.
- Regressions: messaging runtime/browser, employee kiosk browser, messaging integration,
  PIN controller and new task-owner tests. Frontend/kiosk contracts and messaging runbook updated.
- Existing unrelated working-tree changes retained; no commit, push or production deployment.

## Verification

- Backend combined suite: 43 passed (28 messaging integration, 10 PIN controller, 3 task-owner,
  2 migration uniqueness); isolated `indice_test_db`, loopback port 13309.
- Additional legacy retry compatibility/subject-free direct tests: 3 passed, including one new
  legacy fingerprint case. Task-owner suite after the availability fix: 4 passed, including
  a new check that availability never requests a mutation lock outside a transaction.
- Flyway V312 startup passed in the isolated test database. The validated migration subsequently
  applied to the existing local demo database on port 13317; it was not used for integration tests.
- Frontend messaging regression suite: 78 passed. TypeScript passed. Production Vite build passed
  into `.run/messaging-team-build` (avoids the pre-existing Windows lock on normal build output).
- Messaging browser fixture passed: support flow, photos/retries, direct chat without subject,
  groups, partial/all-read updates on empty polls, task retry, draft preservation, company switch,
  320/390/768/1440 widths, reduced height and dark mode.
- Employee kiosk browser fixture passed: PIN isolation, hidden panes, draft guard, retry, logout,
  tools navigation and identity changes.
- Authenticated local smoke passed on frontend 5175/backend 8083: fictional participants created
  `QA - Equipo local` and `QA - ERP y kiosco`; shared ERP/PIN history and read cursors verified;
  both boundaries created real personal demo tasks and identical retries returned one record.
  Chrome loaded the mobile kiosk and normal ERP launcher. Message text/metatext met 4.5:1 contrast.
- Local screenshots: `.run/messaging-local-kiosk.png`, `.run/messaging-local-erp.png`,
  `.run/messaging-group-mobile.png`, `.run/messaging-group-dark.png`.
- `git diff --check` passed for affected tracked files.

## Failures resolved and limits

The first test compilation still used the old controller constructor. Test fixtures were updated.
Mockito could not mock a final kiosk record; fixtures now use real definitions. The live smoke
found an availability check taking a mutation-only entitlement lock outside a transaction; that
check moved to the transactional creation boundary, with regression coverage. A browser assertion
was corrected to await loaded permissions; resizing screenshots await the modal transition.
No unresolved functional failures remain in these checks.

Existing large frontend chunk warnings remain. Production throughput, push delivery, mutable group
rosters and external email were not part of this change. Rollback must retain V312 records and use
a version that understands `GROUP`; see the [operations runbook](../../deployment/messaging.md).
Financial calculations and financial schemas: N/A.
