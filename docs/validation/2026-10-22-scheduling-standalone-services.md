# Scheduling — independent services and explicit booking terms

Date: 2026-10-22. Scope: the user's approved extension allowing direct service creation for
consultations, demos and individual presentations as well as optional Inventory selection.

## Behavior changed

- The existing three-step service wizard offers Choose from Inventory / Create in Scheduling.
  Direct creation needs a name, accepts a description and requires no Inventory product/access.
  Switching origin preserves each origin's draft, including a catalogue selection.
- Charge condition is explicit and independent of origin: `NO_CHARGE` / `TO_BE_AGREED`.
  The editor, complete review, service directory, booking selection/review and private reservation
  detail show the condition. Missing historical data is never presented as free.
- An independent service can later link to an active company Inventory service using the same
  service ID, retaining its booking copy, settings, staff associations and existing reservations.
- Migration V346 adds constrained service condition and reservation snapshot columns. Backend
  booking creation determines the snapshot; booking request bodies acquire no charge authority.
  Old service callers omitting the property default safely on creation and preserve it on edit.
- The configuration learning chapter is version 6; the bilingual learning catalogue is regenerated.

## Behavior preserved

The compact team directory, approved staff wizard, shared modal engine, stable footer, discard
guard, final-only save, pending/retry handling, optimistic version and existing routes remain.
Company/administrator/CSRF guards, Inventory type/availability/uniqueness, collaborator/service
hours, duration/buffer snapshots, reservation lifecycle, public kiosk trust and idempotency remain.
Inventory products, stock and prices are not created or changed. Sales remains the commercial
price/payment owner. Group presentations with capacity continue to use Events.

## Files in this extension

- Frontend: Scheduling `ServiceEditor`, `AgendaConfigurationModal`, `BookingForm`,
  `ReservationReview`, `schedulingApi`, new `translations/serviceTermsCopy.ts` and learning curriculum.
- Backend: `SchedulingDtos`, `SchedulingConfigurationService`, `SchedulingBookingService`,
  `SchedulingRepository`, `SchedulingController`, `SchedulingPublicAdapter`; migration V346.
- Regression: `SchedulingIntegrationTest`, service wizard unit/browser tests.
- Documentation: Scheduling owner contract, modal inventory, this report and generated learning
  catalogue/coverage. Earlier uncommitted Scheduling improvements and other owners' Mail/Minutes
  changes are retained.

## Verification

- Backend compilation, 35 Scheduling integration tests and 2 migration uniqueness tests: **37 pass**.
  Flyway successfully created a fresh isolated `indice_test_db` through V346 using disposable
  `indice-mysql-tests` on 127.0.0.1:13307. Tests never used a functional or production database.
  Coverage includes independent/free creation, auth/CSRF, invalid enum, safe default, old-caller
  preservation, private/public catalogues, unchanged service identity on linking, tenant scope and
  preservation of an earlier reservation's terms after changing the service condition.
- Scheduling module/setup/staff/service regressions: **33 pass**.
- Learning first-entry/locale/progress regressions: **24 pass**.
- Focused Chrome/Playwright service browser flow: **pass**, using only in-memory preview APIs.
  Includes free direct creation with Inventory locked/empty, source switching, later linking,
  catalogue paging/search/errors, inactive/duplicate protection, Back/discard, validation,
  pending/save retry, versioned edits, public mobile choose/review/submission with no client charge
  property, desktop/mobile/landscape/320×360, French and dark mode.
- TypeScript validation, production frontend build and generated learning catalogue check: **pass**.
  Build retains the existing warning for chunks above 600 kB. Initial unit invocation from the
  repository root used the wrong working directory; rerun from `react/` passed all 33 tests.
  The broad Scheduling browser suite was not used as evidence; this change uses its focused suite.
- Visual review: independent wizard review and public mobile review inspected. Evidence under
  `artifacts/scheduling-service-wizard/service-independent-*.jpg` (synthetic data only).

## Local runtime and release scope

The local target remains frontend 127.0.0.1:5175 and backend 127.0.0.1:8083 with functional MySQL
`indice_modules_local` on 13317. A protected local dump was created outside the repository before
V346. The backend restarted successfully with `local,minio`; Flyway reports current V346,
pending 0, failed 0. Read-only checks confirmed authenticated services/catalogue/readiness responses
and frontend HTTP 200. The disposable test container was stopped after testing. Functional records
were not created or modified for verification.

Production deployment: N/A. No commit, push or remote deployment is part of this change.
Schema rollback: retain forward-only V346; the additive defaulted columns are compatible with the
previous application version. Do not edit applied migrations or drop booking history.
Actual collection, price synchronization and financial documents: N/A. They remain Sales work.
