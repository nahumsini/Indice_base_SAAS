# Agenda workspace evolution — local validation

Date: 2026-10-06. Scope: calendar and reservation operations, configuration shortcuts,
Sales-owned master-client consultation, and public appearance. Status: validated local pilot;
not an APPTEST/production release approval.

## Behavior changed

- Calendar/Table views in Calendar and Reservations; day/week/month navigation and explicit
  period, collaborator and status filters. Calendar includes company reservations and events;
  ordinary operators remain restricted to their own staff. Browser timezone is displayed.
- Calendar reads are bounded and expose totals/truncation. Reservation tables retain pagination,
  resizing and scoped workspace memory. Selection stays inside the visible period.
- Configure agenda in the title bar opens the native service/team/availability workspace.
- Versioned, reasoned reservation reassignment for administrators, pause/resume for authorized
  operators, and soft removal with historical evidence preserved. Active removal cancels the
  reservation; historical attendance is not rewritten. Table can include removed records.
- Clients tab consults the same nondeleted Sales master contacts through a narrow owner contract.
  This slice is read-only and administrator-only: no duplicate client table, automatic email
  association, CRM mutation, or Sales entitlement grant. Existing Sales remains the editor.
- Public agenda opens one operational-workspace modal for alias, title, description, publication,
  business name, safe action/header colors, button label and cards/compact layout, with live preview.
  Selected colors affect the real public page. Text contrast is derived from color luminance.

## Deliberately preserved

- Session/module/entitlement/tab checks, tenant ownership, CSRF and public Kiosk Engine trust.
- Public requests still require manual review; publication/configuration creates no entitlement
  or adapter activation. Anonymous visitors never see reservations or private contact lists.
- Service duration/buffer snapshots, optimistic versions, event capacity, shared resource mutex,
  Consulting occupancy and private/public idempotency semantics.
- No Stripe, subscription prices, email delivery, webinar streaming, calendar-provider sync,
  public attendee self-service, or functional/production data changes.
- Earlier unrelated working-tree changes were preserved; no commit, merge, push or deployment.

## Files and ownership

- Frontend owner: `react/src/app/ComplementaryModules/Scheduling/`, including ReservationsTab,
  ClientsTab, ReservationsCalendar/Table, ReservationManagement, PageEditor/PublicAgendaModal,
  public page, localized workspace copy, calendar/appearance utilities and explicit API contracts.
- Presentation-only shared primitive: `react/src/app/components/frontend-os/IndiceCalendarSurface.tsx`.
  It owns date-cell rendering only, not availability, reservation state or persistence.
- Backend owner: `src/main/java/com/indice/erp/scheduling/`; new management/clients controllers,
  management use-case service, scoped calendar reads, DTOs, paused identity and appearance.
- Sales bridge: `src/main/java/com/indice/erp/sales/SalesClientDirectoryService.java` (read-only).
- Native permissions: frontend tab catalog, backend route classifier and configuration tab catalog.
- Migration: V301, forward-only pause/archive/audit/appearance extension. V300 was not modified.
- Contracts: Scheduling module contract and the canonical frontend/backend operating systems.
- Tests/preview: scheduling integration/unit tests, permission tests, frontend regression/browser
  runner and isolated in-memory preview. No production mock or database write in preview.

## Verification

| Check | Result |
| --- | --- |
| MySQL 8 disposable database, loopback 13307, `indice_test_db`; Flyway startup V301 and migration uniqueness | PASS |
| Focused backend: SchedulingIntegration/AccessService/SlotPolicy, route classifier, tab catalog, migration uniqueness | PASS: 40 tests |
| Backend regression with ModuleAccessService | PASS: 44 tests; 19 real-database scheduling integration cases |
| Frontend Scheduling, users access, Kiosk, workbar and module Learning Mode suites | PASS: 83 tests |
| `npm run typecheck` | PASS |
| `npm run build` | PASS; existing large-chunk advisory remains |
| Scheduling Chrome browser regression | PASS: real public router, consultant selection, slots, consent/manual review, retry/CSRF, configuration, calendar filters/periods, client consultation, reassignment/pause/resume/archive, customized public CTA, eight locales, role hiding, mobile/dark |
| Live preview smoke on 5197 | PASS: private calendar/public editor desktop and mobile, dark calendar, no JavaScript/API errors or viewport overflow |
| Preview/browser syntax and `git diff --check` | PASS |

Regression coverage includes pause releasing confirmed occupancy, failed resume rollback when
occupied, successful resume after release, target reassignment conflicts/tenant/admin/version
checks, inactive former staff recovery, reasoned audit, soft archive visibility and preserved
attendance metrics, paused webinar deduplication/event cancellation, old page-client appearance
preservation, invalid color rejection, bounded private calendar reads, CSRF, master-client tenant
scope/escaped search, and no client creation from booking requests.

### Findings resolved during verification

- TypeScript identified missing canonical search tone and table resizing handler in Clients;
  both were supplied, without replacing the shared table engine.
- The tab count fixture was updated from 61 to 62 for the new explicit clients scope.
- Read-only calendar transactions initially inherited repository locking reads. Current reads now
  request `FOR UPDATE` only in writable transactions; mutation stale-snapshot protections remain.
- A synthetic master-client test fixture needed its required contact code; owner schema unchanged.
- Chrome initially sampled the themed CTA during a CSS color transition (OKLab serialization).
  The regression now waits for the transition to finish before asserting the final public color.

## Local handoff and release risks

- Preview: `http://127.0.0.1:5197/scheduling/calendar` and `/book/piloto`.
- Start: `cd react` then `node tests/scheduling-preview.mjs`. The preview runs only on loopback,
  has synthetic in-memory APIs and a visible warning; no backend proxy, email or production access.
  Preview edits disappear on process restart. Local functional ERP/backend were not restarted.
- Production activation and deployment: N/A in this task. Require migration/adapter/entitlement
  readiness, native release gates, APPTEST acceptance and an authorized production rollout.
- Master-client editing, reminders, recurring/exception availability, public verified management
  and provider integrations remain outside this slice. Notifications are explicitly manual.
- Rollback: existing Scheduling adapter/module kill switches fail closed; preserve forward-only
  schema and business history. No functional/production database was migrated.
