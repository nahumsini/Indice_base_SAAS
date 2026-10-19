# Agenda and Meeting Control — UI/UX refinement

Local frontend implementation, 2026-10-19. No deployment or release approval.

## Result

- Scheduling navigation: Agenda/reservations → Events → Clients → Indicators. Route IDs and
  independent permissions are preserved. Meeting Control keeps Meetings → Agreements → Indicators.
- Events has Cards/Table views, shared search/period/status/host filters, pagination, column resizing
  and deterministic ascending/descending sorting. Status sorting uses the visible localized labels.
  Cards show date, host, capacity and publication state; secondary actions use the row Actions menu.
- Both calendars preview three activities per day and expose every remaining loaded activity in the
  selected-day list. Meeting Control adds day/week/month, Today and period arrows; custom ranges keep
  their length. Scheduling also displays its date range and distinguishes it from preset periods.
- Meetings has contextual copy and progressive filters; agreements consolidates follow-up selection
  in its filter card and highlights overdue open commitments. Indicators retain owner calculations,
  with subtle status colors and retry actions. Both owner control primitives show focus on native
  WebKit date fields through focus-within, preserving the module tone.

## Files and responsibilities

All application work remains under `react/src/app/ComplementaryModules/`:

- `Scheduling/tabs/EventsTab.tsx` owns query, scoped view/filter state and existing event modals.
  New `components/EventsResults.tsx` renders cards/table/pagination using shared primitives;
  new `utils/eventWorkspace.ts` validates restored preferences and filters/sorts the loaded records.
- `Scheduling/components/ReservationsCalendar.tsx`, `tabs/ReservationsTab.tsx`,
  `tabs/IndicatorsTab.tsx` and `utils/schedulingNavigation.ts` implement the calendar, visual context
  and tab-order refinements. New `translations/schedulingExperienceCopy.ts` covers eight locales.
- New `MinutesControl/components/MeetingCalendar.tsx` extracts calendar presentation and day detail
  from `tabs/MeetingsTab.tsx`, keeping planning and detail mutations in the owner tab.
  `components/MeetingList.tsx` owns shared presentation of meeting/agreement filters and tables.
  `tabs/AgreementsTab.tsx`, `tabs/IndicatorsTab.tsx` and `utils/dateScope.ts` complete the refinement.
  New `translations/meetingWorkspaceCopy.ts` covers eight locales.
- Owner contracts and the canonical frontend scheduling tab-order description are updated.
  Existing scheduling, meeting and complementary-navigation regression suites are retained/extended.

No new state, calendar, table, modal or authorization engine. State remains in React and the existing
company/user-scoped `useWorkspaceNavigationMemory`; transient dialogs remain transient. Extracted
components contain presentation only, reducing the owner tabs' rendering responsibilities.

## Behavior preserved

APIs, backend, schema, calculations, tenant/object authorization, tab scopes, CSRF, public-page
branding, existing CRM ownership, internal reminders and persistence semantics are unchanged.
Existing booking review, reassignment/pause/resume/archive, event participants/cancellation, planning,
series, delegated minutes, agreement follow-up and linked tasks retain their owner workflows.
Existing local work was preserved; the pre-existing `MinutesControl.tsx` route-alias changes are not
part of this implementation. No functional database records or real messages were created by tests.

Exportability: existing export/print behavior preserved; new export formats are N/A. Modal redesign:
N/A; the existing form, wizard, workspace and confirmation frames are reused, not replaced.

## Validation

- 31 focused regression checks: scheduling, meetings and complementary navigation.
- TypeScript and production build pass. Build retains the application-wide warning for chunks over
  600 kB; no compilation errors.
- Chrome and WebKit browser flows pass. Fixtures use synthetic data and intercept API traffic; outside origins are blocked.
  They exercise native create/edit/retry/CSRF flows, permission restrictions, eight locales,
  cards/table filtering and sorting, custom publication settings, planning/series, agreements,
  mobile layouts and dark mode. A dense-day case verifies all 31 meetings remain accessible.
- Initial validation caught an outdated notification-test dependency and a WebKit native-date focus
  mismatch; both were corrected. Isolated browser fixtures disable hot reload and close their HTTP
  connections during teardown to avoid interference from concurrent local work.
- Visual artifacts: `/tmp/indice-coordination/` (Chrome) and
  `/tmp/indice-webkit/indice-coordination/` (WebKit).
- Backend/database/migration tests: N/A; no backend or schema changes.

## Limits

Events filters and totals apply to the existing authorized load of up to 500 events; this limit is
shown in the interface. Calendar truncation warnings remain. These changes do not add external
calendar synchronization or alter invitation/message delivery. Changes are local and uncommitted.
