# Payroll incident report from Attendance Control

Product decision: 2026-10-24. Owner: Human Resources / Control.

The former daily attendance-report entry opens **Payroll incidents**. This is an Operational
Workspace Modal using the native aqua Indice frame, shared filters, table header/canvas,
sorting, resizing and attached pagination. Phones show readable collaborator/day cards.
The attendance control page, calendar correction workflow and payroll calculations retain
their existing behavior.

## Selection and presentation

- Weekly presets use Monday–Sunday. Half-month presets use days 1–15 or 16–month end.
  Monthly presets use the entire calendar month. Users can enter an inclusive custom range.
- Preset dates remain visible and editable. Editing either date switches to custom selection.
- Unit, business and collaborator filters narrow the authorized team. Querying is explicit.
- A team summary links to each collaborator's daily detail: date, effective status, recorded
  entry/exit, late minutes, correction marker, incomplete-record indicator and retained notes.
- Attendance includes on-time and late days; the late metric is a subset. Status-specific
  counts remain distinct. Missing schedules, pending shifts and rest days are not absences.
- Days before hire or after the retained last-working/termination date are shown as outside
  employment. Former collaborators whose employment overlaps the range remain reportable.
- Current organization membership scopes the report; it does not reconstruct historical
  organization transfers. Existing schedule-window and correction projections are reused.
- Changed filters, failed requests, authorization changes and pending queries disable print.
  Cancelled or stale requests cannot overwrite a newer report. Report data is not persisted
  in browser storage.

## API and source authority

`GET /api/v1/hr/attendance/incidents?from=YYYY-MM-DD&to=YYYY-MM-DD`
accepts optional `unitId`, `businessId`, `employeeId` filters, never tenant/actor authority.
Explicit DTOs are in `AttendanceIncidentReportContracts`.

Session authentication and native `HrAccessService` Control management permission are
required. The query scopes HR roster rows to the authenticated company and native
operational unit/business scope, requires an HR work profile, and intersects employment
dates with the requested range. Optional filters only narrow this roster. Every daily-source
read rechecks employee scope and includes the same company key. No photo URLs, biometric
data or kiosk configuration are read into this output.

The use case uses a read-only repeatable-read transaction, existing daily records and
effective schedule windows. It performs no attendance corrections, payroll recalculations,
deductions, run creation or other business mutation. No schema migration is introduced.
Reports are limited to 93 inclusive calendar days, 200 collaborators and 10,000 employee-day
cells. Oversized requests fail rather than return partial totals.

## Print contract

The active owner adapter is `HumanResources/Control/utils/incidentReportPrint.ts`. It builds
one `StandardDocumentDefinition` for the sandboxed in-modal paper preview and the shared
`printStandardDocumentHtml` generator. It follows the adopted quotation-style web standard
(section 0): white paper, neutral text/rules/tables, with only the real company logo retaining
color. Format v2.1; A4 portrait first, measured density and landscape fallback when required.
Category: operational-report. Modifiers: internal, confidential, employee-facing.

Summary view prints all collaborators in the queried report, including every daily row.
Individual detail prints only the selected collaborator. Each collaborator has a titled table
and compact organizational/status-count metadata. There is no forced page break per person;
table headings repeat and normal rows avoid splitting. Long notes are retained without a
fixed-height clipping container, and overnight exits retain their actual exit date.

The company print-identity hook provides the current issuer name and safe logo URL; unavailable
logos fall back to company text, never invented branding. Preview/print wait for issuer loading.
The report remounts on authorization changes so identity cannot carry across companies/actors.
Business text is escaped. The common footer retains confidentiality, company, issue date and
format version. The filename includes company, report type and inclusive period. The primary
action is localized **Print / Save PDF**, alongside **Print view / Back to report**. This attendance
review document does not calculate pay or deductions.

Legacy daily generator files remain for compatibility; the Control entry now uses the period
report. No public sharing route or external delivery is added.

## Validation

Focused backend coverage includes authorization, actor/tenant binding, scope denial,
bounded periods/teams, final-status corrections, future/rest/unscheduled days, employment
boundaries, overnight punches, missing exits and valid zero totals. Frontend runtime tests
cover calendar presets, inclusive bounds, supported languages, overnight presentation,
escaped print text, safe issuer logos, retained long notes, neutral styling, optional table
metadata, preview/print parity and all-team/individual print selection. Native local verification covers
query, summary, detail, changed-filter print blocking and responsive presentation.
