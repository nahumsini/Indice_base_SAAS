# Scheduling — coral ERP identity

Date: 2026-10-07. Scope: local UI/UX only; not a release approval.

## Behavior changed

- Complementary-module card, shell, tab identities, title bars, primary actions, calendar selection,
  table accents, learning companion and native modal headers/footers adopt Sales coral `#FF6B5E`.
  Primary light-coral actions use graphite `#222831`; private identity emojis are decorative and
  action buttons retain Lucide icons.
- Title bars remain shared `IndiceTitleBar` surfaces. The full-access agenda exposes Team,
  Public agenda and New request; Services and Refresh are in the native Actions menu. The
  permission-filtered action list exposes all actions directly when there are three or fewer.
- Shared white filter cards are labeled Filters in all eight locales. From/To stay adjacent,
  followed by Status and Collaborator; controls are exactly 44px high, 12px radius and coral focus.
  Existing status/staff filters now use `IndiceFilterSelect`; no unsupported search was invented.
  Local overrides fix the runtime's 14px `rounded-xl` token and select-trigger 36px size without
  changing those shared components for other modules. Native date/time controls honor dark mode.
- Clear restores factory filters and pagination, retaining Calendar/Table presentation. The
  table-only archived-record filter uses native progressive disclosure and reveals a restored
  active value. Timezone remains visible as data context below the card.
- Shared `IndiceCalendarSurface` accepts an optional presentation tone, retaining blue as its
  default. Scheduling opts into coral; no calendar engine or business rules were introduced.
- A destructive footer action uses the existing modal engine's semantic destructive marker.

## Behavior deliberately preserved

Routes and compatibility redirects; session, entitlement, tenant/object ownership and independent
backend tab scopes; owner query parameters; booking duration/availability/collision handling;
confirmation, reassignment, pause/resume and soft archive; idempotent retry and CSRF; metric
calculations; workspace/filter memory; shared Sales client records, forms and authorization.

Public saved/default business appearance, color validation and contrast remain independent of
the private coral identity. The public booking workflow keeps its product-blue navigation default
and manual-confirmation copy. Contact drafts are still in memory only. No public page was published.

Modal classification is unchanged: Services/Team lists and Public agenda are operational
workspaces; service/staff/event editors are standard forms; internal capture is a wizard;
discard and consequential reservation commands retain their confirmations. Editors replace
the list frame instead of stacking dialogs. No modal engine or authorization framework was added.

## Files changed in this UI slice

- `react/src/app/config/moduleCatalog.ts`
- `react/src/app/components/frontend-os/IndiceCalendarSurface.tsx`
- `react/src/app/ComplementaryModules/Scheduling/Scheduling.tsx`, `PublicBookingPage.tsx`
- Scheduling `utils/schedulingIdentity.ts`, `translations/schedulingCopy.ts`
- Scheduling `tabs/ReservationsTab.tsx`, `EventsTab.tsx`, `IndicatorsTab.tsx`
- Scheduling `components/SchedulingPrimitives.tsx`, `ReservationsCalendar.tsx`,
  `ReservationsTable.tsx`, `ConfigurationTable.tsx`, `SchedulingGuide.tsx`
- Scheduling `components/AgendaConfigurationModal.tsx`, `PublicAgendaModal.tsx`,
  `InternalBookingModal.tsx`, `ReservationReview.tsx`, `BookingForm.tsx`
- Scheduling `components/ServiceEditor.tsx`, `StaffEditor.tsx`, `PageEditor.tsx`,
  `EventEditor.tsx`, `EventCancellation.tsx`
- `react/tests/scheduling-module-regression.test.mjs`, `react/tests/scheduling-browser.mjs`
- `docs/indice-frontend-operating-system-v2.md`, `docs/scheduling-module-contract-v1.md`, this report

Existing unrelated dirty work was preserved. No backend, API, migration, Sales owner, global
product header or global theme changes were made in this slice.

## Verification

- `npm run test:scheduling --prefix react`: PASS, 9 tests.
- `npm run test:sales-ui --prefix react`: PASS, 34 tests.
- Isolated Chrome `npm run test:scheduling-browser --prefix react`: PASS. Synthetic API fixtures
  exercise the real components/router: coral/graphite CTA, title hierarchy/emoji, 44px/12px fields,
  coral keyboard focus, clearing and archive disclosure, modal header/footer identity, wizard and
  single-frame discard, service/team editing, saved public/personalized links, shared Sales client
  editing, reassignment/pause/resume/archive, KPI drilldown, eight locales, independent scopes
  including configuration-only administrators, mobile/dark and public customized-color retention.
- Native ERP at `127.0.0.1:5175` / backend `8083`: PASS with synthetic demo login, real APIs and
  no Scheduling business mutations. Checked agenda, Events/Indicators, configuration modals,
  exact filter dimensions, desktop 1440px, mobile 390px and dark mode; no Scheduling API failures
  or browser exceptions. Reviewed settled-animation screenshots under `/tmp/indice-scheduling-coral-final-*`.
- `npm run typecheck --prefix react`: PASS.
- `npm run build --prefix react`: PASS; existing large-chunk advisory only.
- `git diff --check`: PASS.
- Backend compilation/tests: N/A. Database tests, migrations and migration uniqueness: N/A.
- Deployment/rollback: N/A; no commit, push, APPTEST or production deployment requested or performed.

## Failures encountered and resolved

The first new browser assertion exposed the old View scope title and nonstandard runtime radius;
localized titles and Scheduling-only dimensions were corrected. A later added discard check
targeted the equally named close icon instead of the confirmation footer; its selector now targets
the footer explicitly, without changing the discard handlers. One retry overlapped the failed
test's cleanup and found fixture port 5196 busy; retrying after cleanup passed. Native preview
ports were not stopped. Early modal screenshots caught enter animations; final screenshots wait
for finite animations and verify opacity 1.

## Remaining risks

The pilot remains local and has no seeded services or bookings; native empty states are expected.
No production data or provider integrations were tested. This change does not complete external
calendar sync, holiday exceptions, email delivery or commercial-release approval. The production
build retains the existing advisory for large chunks; no bundle refactor is included.
