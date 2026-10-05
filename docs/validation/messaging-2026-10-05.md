# Messaging verification — 2026-10-05

Scope: local working tree on `codex/continuacion-2026-09-24`, based on `d3241c5b`.
Status: implementation and local verification complete; production release not performed.
Existing uncommitted analytics work was preserved. This record is not a production certification.

## Delivered behavior

- Global individual messaging, company participant isolation, request history and unread counts.
- Indice support available without a distributor, including support-only billing recovery.
- Current distributor portfolio care, public-history transfer, internal-note isolation and revocation.
- Platform Customer Care queue, assignment/version conflicts, priorities, closure/reopening,
  elapsed pending indicators, response/resolution measurements and workflow audit.
- Persistent messages, idempotent sends/creation, bounded pagination and retryable notification outbox.
- Eight locale variants. Existing distributor/system tickets remain reachable under Previous tickets.

## Evidence

Implementation areas: `src/main/java/com/indice/erp/messaging/`,
`react/src/app/Messaging/`, `V280__messaging_and_customer_care.sql`, the global Header and billing
recovery header, PlatformAdmin/DistributorPortal care integration, notification presentation,
the exact recovery-route classifier, regression tests, canonical references and the operations
runbook. Existing analytics edits and their tests/translations were not replaced.

| Check | Result |
| --- | --- |
| MessagingIntegrationTest | PASS: 17 tests, real MySQL `indice_test_db` |
| MigrationVersionUniquenessTest | PASS: 2 tests |
| SystemTicketOperationsServiceTest | PASS: 3 tests |
| SubscriptionAccessInterceptorTest | PASS: 4 tests |
| PlatformAdminMfaInterceptorTest | PASS: 4 tests |
| Flyway startup | PASS: V280 applied and validated in isolated test database |
| Frontend runtime/notification/distributor/platform regressions | PASS: 76 tests |
| Chromium desktop/mobile fixture | PASS: 5 flow groups |
| TypeScript | PASS: `npm run typecheck --prefix react` |
| Frontend production build | PASS; existing large-chunk warning remains |
| Authenticated target-deployment smoke, production capacity, backup restore | NOT RUN |

Backend coverage includes tenant and participant denial, CSRF/HTTP authority, revoked memberships,
restricted subscription scope, internal-note visibility, pagination, rate limits, concurrent retry
deduplication, competing assignments, transaction rollback, persisted history and notifier recovery.
Browser coverage includes support without consultant, creation/send response loss, stable retry keys,
escaped message text, mobile navigation, operator assignment/resolution and clearing state on company
switch. The browser uses synthetic HTTP responses; backend integration tests use actual SQL.

The normal Maven test output contained class files locked by another running process. Verification
used a temporary POM with a separate build directory; no other process was stopped. Generated
artifacts and reports are retained locally under `.run/messaging-check-20261005/` (ignored by Git).
The standard commands for another environment are in [the runbook](../../deployment/messaging.md).

## Modal layout revision

- Classification: **Operational Workspace Modal**, retaining the canonical blue
  `IndiceModalFrame` shell. `MessagingModal.tsx` owns the chat presentation adapter;
  the shared frame only gains an optional typed `contentStyle` presentation prop.
- Changed: desktop inbox/thread split, independent pane scrolling, mobile list/detail Back
  navigation, compact growing composer, 44px touch targets, 16px mobile inputs, visual viewport
  sizing and inline unsent-draft discard protection. New-message channel choices are direct buttons.
- Preserved: APIs, schema, company/participant permissions, localization, idempotent retries,
  operator assignment/resolution and account-switch clearing.
- Files: `MessagingLauncher.tsx`, new `MessagingModal.tsx`, `MessagingWorkspace.tsx`, `copy.ts`,
  shared `IndiceModalFrame.tsx`, browser fixture/regression and messaging contract.
- Verified: TypeScript, production build, 76 existing regressions, and six Chromium browser
  flow groups using the actual shared modal. Browser checks include desktop pane positions,
  390px mobile width, reduced 480px height, visible send action, draft protection and account
  changes while the dialog is open. Local frontend at port 5174 responds with HTTP 200.
- Test failures during iteration: responsive measurements initially ran before the viewport update;
  they now wait for visible bounds. Account-switch fixture lookup needed `includeHidden` because
  Radix correctly hides background controls from the accessibility tree. Final browser run passed.
- Remaining limits: browser HTTP responses are synthetic; physical mobile keyboard behavior has
  not been tested on a device. Existing production-build chunk size warning remains. Backend and
  database changes for this modal revision: N/A.

## Remaining release work (deployment)

Deploy the candidate under the existing deployment/security gate, verify backup/rollback and perform
the authenticated client/distributor/operator smoke flow through the target proxy. Confirm operator
coverage, service hours, infrastructure alert routing and traffic capacity there. No production
database, active production deployment, external email or customer messages were changed by this work.
Kiosk access, groups and external email are outside this release's agreed first scope.

## Photograph extension and local operation

Approved in the same session on 2026-10-05: photographs within conversations.

- Changed: up to five JPEG/PNG/WebP photographs per message, maximum 8 MiB each; photo-only
  replies, previews/removal, inline images and enlarge/reduce, photo draft protection and stable
  upload/send identities across retries. New conversations retain their initial-text requirement.
- Backend: additive V281 attachment metadata, participant/channel-scoped presign and download,
  actual object size/type/signature checks, immutable final objects, transactional quota/message
  registration, rate limits, rollback cleanup and bounded expired-staging cleanup.
- Preserved: existing text APIs accept old payloads; direct-chat privacy, care routing,
  internal-note isolation, notifications and workflow ownership remain in effect. Support-only
  recovery adds only the exact authorized photo routes. Sent messages/photos are not deleted.
- Files: `messaging/MessagingAttachmentService.java`, `MessagingAttachmentRepository.java`,
  messaging contracts/controller/service, `V281__messaging_photos.sql`, recovery classification;
  frontend `Messaging/MessagePhotos.tsx`, `usePhotoDraft.ts`, `photoCopy.ts`, conversation hook,
  API/types/workspace; focused integration/browser tests and domain/runbook documentation.
- Passed: 23 messaging integration tests on **indice_test_db**, two migration uniqueness tests,
  four subscription interceptor tests; TypeScript and frontend production build; 76 frontend
  regressions and seven browser flow groups including images, failure/retry and mobile layout.
- Local end-to-end: actual authenticated application on 5174, backend on 8084, isolated preview
  database `indice_messaging_preview_20261005` and private MinIO. Verified real PUT/commit/read,
  unsigned object rejection (403), immutable saved bytes after overwriting the staging upload,
  idempotent send, actual mobile UI upload and persistence after page reload. Synthetic preview
  cases use the subject `Prueba local: fotografías`; no external customer was contacted.
- Flyway: preview startup reports V281 success, zero pending/failed migrations. Backend readiness
  and the frontend/backend listeners were confirmed after the final restart.
- Iteration failures resolved: Mockito rollback callbacks crossed the automatic reset boundary;
  fixture invocations are now cleared before setup. A misplaced HTTP test was corrected. Local
  startup initially overlapped compilation, then encountered the earlier Java child process on
  8084; final startup occurred after compile and stopping the verified port owner.
- Remaining limits: signed downloads can remain usable for 60 seconds after access revocation;
  format/signature checks are not an antivirus scan; physical mobile hardware and production
  storage/CORS configuration still require release-environment verification. Existing bundle-size
  warning persists. Production deployment: N/A, local operation only.

## Commercial operations frontend

The prior authorized Root frontend is also integrated: pending suggestions, Mexico/Canada reference
journeys, server-side customer search, explicit loaded-record filter coverage, responsive list,
shared Operational Workspace Modal, real account history and contextual handoffs to account/users/
billing, customer care and consulting. No prices, contracts or backend commercial states changed.

Passed: seven classification/localization tests, four browser flow groups (pagination/retry,
detail/history/handoffs, mobile layout, stale search and revoked-access clearing), TypeScript,
production build and the shared 76 regressions. Browser fixture issues resolved included accessible
searchbox/numbered-list selectors, StrictMode effect replay and the client's session recheck on 403.

Files are under `PlatformAdmin/CommercialOperations`, with integration in `PlatformAdminPage`,
optional search context in consulting/customer care, and focused tests. The canonical frontend
document records the limits: web leads and persistent sales stages, notes, responsible operators
and next-action dates require a follow-on backend contract. The interface states this scope.
