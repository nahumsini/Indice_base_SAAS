# Scheduling — unified agenda and modal setup

Date: 2026-10-07. Scope: the requested local Scheduling navigation and shared Sales Clients UI.
Status: local pilot, not an APPTEST/production deployment.

## Behavior changed

- One visible **Agenda y reservas** tab, with Calendar/Table views sharing period, collaborator,
  status and operating context. Clients, Events and Indicators remain sibling tabs.
- Services, Team/availability and Public agenda are buttons on the unified title bar. The former
  Configuration tab and its unused component were retired; backend configuration scope is kept.
- Services and Team open native operational-workspace list modals. Create/edit replaces the list
  with the existing standard-form modal; save/cancel returns to the list. Only one dialog is open.
  Agenda staff options refresh after setup mutations; filters and selected view are not reset.
- Empty setup uses the shared responsive empty-state component, not a wide table whose empty
  message would be offscreen on a phone.
- Public agenda retains appearance/publication/live preview and the saved public URL, copy/open
  actions and personalized consultant links previously available in Page/links. Unsaved aliases
  never become authoritative share links.
- Clients now reuses the actual Sales Contactos component, SalesCrmProvider and data boundary,
  with the same master records, forms, fiscal/relationship details, actions, APIs and Sales-scoped
  operating memory. No duplicate Scheduling client UI/store/editor was created.
- Old reservation bookmarks redirect to `/scheduling/calendar`, preserving period/status and
  explicit view, with Table as the default. Configuration bookmarks return to title-bar setup;
  remembered aliases also resolve. KPI drilldowns now target the unified table directly.

## Behavior deliberately preserved

- Calendar, reservations and configuration remain independent backend permission scopes. A
  calendar-only operator can read but not capture/manage; a reservations-only operator still
  sees the unified agenda; configuration-only administrators can configure without unauthorized
  calendar reads. The module shell receives the matching already-authorized scope.
- Scheduling clients access remains administrator-only. The embedded Sales workspace additionally
  requires an unlocked native `crm` module and `crm.contacts` permission. Missing Sales access
  shows an explicit message and mounts no Sales provider, instead of granting access.
- Sales component/provider/commands were not modified. Backend Sales guards still enforce module,
  tab, company and narrower object authority. The earlier read-only Scheduling clients endpoint
  stays compatible but is not used as a write bypass.
- Reservation status/assignment/pause/resume/archive, event configuration/cancellation, manual
  public review, Kiosk Engine CSRF/idempotency, persisted appearance, metrics and eight locales.
- No schema, API, backend code, entitlements, email, Stripe, production, APPTEST, commit or push changes.
  Unrelated existing working-tree changes and both local databases remain intact.

## Files changed

- Scheduling.tsx and utils/schedulingNavigation.ts: unified visible tabs, capabilities and aliases.
- ReservationsTab/IndicatorsTab/SchedulingGuide: modal entry points and canonical drilldown/journey.
- AgendaConfigurationModal, ConfigurationTable: native list/form replacement and empty state.
- PublicAgendaModal/PageEditor/PublicAgendaLinks: preserved publication/appearance/sharing workspace.
- ClientsTab: composition of the existing Sales owner workspace with access checks.
- Scheduling workspace translations; frontend module/browser tests and synthetic fixture.
- Scheduling contract and canonical frontend/backend contract notes; this report.
- Retired file: Scheduling/tabs/ConfigurationTab.tsx. No business records were deleted.

## Verification

| Check | Result |
| --- | --- |
| `npm run test:scheduling --prefix react` | PASS: 8 tests; native registration, union without permission expansion, legacy filters, shared-client access, dates/appearance/eight locales |
| `npm run test:sales-ui --prefix react` | PASS: 34 tests; Sales behavior unchanged |
| `npm run test:scheduling-browser --prefix react` with local Chrome | PASS: public/manual-review retry, Calendar/Table, setup create/edit, one dialog, shared Sales client edit/reload through owner API, missing Sales access without reads, independent calendar/reservations roles, reservation lifecycle, personalized links, KPI drilldown, eight locales, mobile/dark |
| Real local ERP 5175/8083 read-only smoke | PASS: native login, four tabs, three loaded modals, embedded Sales client actions, legacy URLs/filters and mobile; no API mocks or business writes |
| `npm run typecheck --prefix react` | PASS |
| `npm run build --prefix react` | PASS; existing large-chunk advisory remains |
| `git diff --check` | PASS |
| Backend/schema/database integration tests | N/A: no backend/schema changes; no tests ran against the functional database |

An extra direct Node test invocation from the repository root failed because this existing suite
resolves paths relative to `react`. The documented npm script rerun passed all 8 tests. No product
failure remains from that invocation.

## Handoff and remaining risks

Local: `http://127.0.0.1:5175/scheduling/calendar`, company Empresa Demo Spring and its existing
synthetic local login. This real ERP persists user operations; its setup starts empty and unpublished.
Original local 5174 and production were not deployed or migrated by this task.

Clients access without Sales entitlement would require a separately approved owner permission
contract; this change does not introduce one. Existing Sales provider partial-data/sync behavior,
including its current contact command semantics, is deliberately inherited rather than rewritten.
External notifications, verified participant self-service and calendar providers remain out of scope.
