# Control de juntas — complementary pilot contract

Status: local implementation; not released or deployed. Owner: `meetings`.
The existing registry identity `control_minutas` and route `minutes-control` remain
compatible; this change replaces its dormant mock entry with a tenant-owned workspace.

## Product and ownership

Juntas → minutas y decisiones → acuerdos → seguimiento. This is not the Root
corporate development register, a public booking page, or the Processes task owner.
No corporate entries are copied, no invitations/email are sent, and no public access,
external calendars, attachments or automatic Processes tasks are introduced. The approved
2026-10-07 extension below adds finite meeting series and internal notification automation.
Identity: 📝 Control de juntas, corporate blue; native ERP shell, title/filter bars,
calendar presentation and one-frame modal engine. Tabs: meetings, session, agreements, indicators. Session inherits the meetings scope.
The former mock templates/follow-ups are not supported production contracts.

Company administrators can operate all company records. Other assigned users see
meetings they own or participate in. Only coordinator/administrator edits planning
or lifecycle. The explicitly assigned minutes owner may also record minutes and decisions,
but acquires no planning, lifecycle, tab, module or administrator authority.
Agreements are visible through that meeting membership, or to their
assignee; an assignee can complete their own agreement but cannot reassign/cancel it.
Coordinators, minutes owners, participants and assignees must be active members of the authenticated company;
assignees must also belong to the meeting. Removing a participant with an open
assigned agreement is rejected. Member lookup exposes IDs/names only, bounded to 500.
Records never inherit authority from client company/role fields.

`/api/v1/meetings` requires native module entitlement, assignment, tab permission,
session authentication and CSRF on mutations. Reads and writes enforce tenant and
object scope. Agreements tab gets a minimal meeting-choice projection, not minutes.
Indicators cannot disclose meeting text. Public demo sessions are rejected.
All mutations recheck active entitlement inside their transaction.

## Lifecycle and integrity

- Meeting: PLANNED → IN_PROGRESS → COMPLETED; PLANNED/IN_PROGRESS → CANCELLED.
- Planning edits only while PLANNED. Minutes/decisions can be edited until closure.
- Completion requires nonempty minutes; cancellation requires a reason.
- Agreement: OPEN → DONE (resolution required), or OPEN → CANCELLED (reason required).
- Cancellation retains minutes, agreements and audit. No hard-delete business endpoints.
- Meeting and agreement creates use company/actor-scoped request keys and payload hashes;
  identical retry returns the original record, changed payload with same key conflicts.
- Every edit/status operation uses an expected version; stale edits return 409.
- Use-case transactions and company lock serialize membership/record mutations; append-only
  audit stores action, actor, timestamp and reason, not credential or full payload snapshots.
- Times are UTC instants plus validated IANA timezone per meeting; due dates are dates.
  Metrics use the explicitly supplied valid timezone to determine today's due cutoff.
- List ranges are bounded to 366 days, calendar to 43 days/1,000 rows with visible
  truncation warning. Lists are paginated. Strings and participant counts are bounded.

## Approved planning and series extension — 2026-10-07

The product owner approved implementation of the modal analysis in local. This is not a
production release or an authorization change. A new planning request includes purpose,
expected result, coordinator, minutes owner, active participants, agenda, duration and
optional internal reminders. Existing create/edit payloads remain compatible: absent
planning fields retain existing values, with the default minutes role following the
coordinator on legacy reassignment. Explicit independent delegation must be retained or
replaced, not silently removed. Existing records do not require a data rewrite.

- The 2026-10-22 user refinement adopts **Modal Wizard Índice** for both new Single meeting
  and Flow/series: Purpose → Team → Date and agenda → Review. Back retains the complete draft.
  Review shows backend-calculated dates, timezone, responsibilities, meeting type, duration and
  overlap counts. Existing single-occurrence editing retains its form; future-series editing
  retains its existing guarded three-stage workflow.
- Reusable flows copy only planning settings, not dates, minutes, decisions, agreements,
  recurrence authority or access grants. Maximum 100 active flows/company. Creator or
  company administrator can list/archive flows; archive retains existing meetings.
- Recurrence is DAILY/WEEKLY/MONTHLY, interval 1–12, at most 52 occurrences within 366
  days. Confirmation atomically materializes all reviewed dates; there is no indefinite
  series, rolling generation or silent renewal. Each occurrence has independent lifecycle
  and evidence. Whole-plan retries are company/actor/payload bound, including concurrent
  retries with maximum-length request keys.
- Wall-clock time uses a validated IANA timezone. Monthly recurrence clamps to the last
  day in shorter months and returns to the original day afterward. Nonexistent DST times
  are rejected; ambiguous recurring times use the earlier offset with review notice.
  The UI uses the current device timezone and displays it; it does not claim a custom
  timezone picker. UTC instants remain authoritative.
- Overlap checks count existing noncancelled meeting occupancy for selected people in
  the authenticated company. They disclose no other meeting text. They do not check
  video providers, external calendars or physical-room occupancy. New planning may
  acknowledge overlaps explicitly; bulk future edits reject overlaps.
- “Only this meeting” preserves other occurrences. “This and future planned meetings”
  reviews existing affected dates, shifts their dates/time while retaining cadence,
  requires current meeting/series versions, and leaves earlier or started sessions
  untouched. All affected native participant/agreement guards remain active. A failure
  rolls back the entire edit, including changes made to earlier rows in the same use case.
- **Operational Workspace Modal** hosts flows and paginated series (25/page). Archive,
  pause/resume reminders and cancel-future use one-frame **Confirmation Modals**, not
  stacked dialogs. Series controls require series coordinator/company administrator;
  occurrence ownership remains enforced independently.
- Pause/resume changes only internal reminders, never meeting status. Cancel-future
  requires a reason and cancels only future PLANNED occurrences, retaining past sessions,
  sessions in progress, minutes, decisions, agreements and audit. Open agreements remain
  available for human follow-up even when their source meeting is cancelled.
- Completion, decisions, minutes and agreement fulfilment require explicit human actions.
  No notification creates evidence, completes an agreement or closes a meeting.

### Native internal reminders

Upcoming-meeting and missing-minutes reminders are off by default. Selecting 15/30/60/1440
minutes enables them; pausing a series or cancelling its source meeting suppresses those signals.
The approved operational extension makes overdue agreements independent: each open agreement
defaults to follow-up enabled and retains it after meeting cancellation or reminder pause.
Its coordinator/administrator can disable follow-up explicitly without closing the agreement.

`meetings` owns durable signal receipts and uses `AppNotificationService` as the explicit
notification-owner contract. Each record dispatch has its own transaction and tenant
lock, current entitlement/membership/module/tab checks and durable recipient/event
deduplication. A batch processes at most 100 candidates, advances a cursor, retries on
later cycles and isolates record failures. Default checking interval and initial delay
are 60000 ms (`app.meetings.reminder-delay-ms`, `app.meetings.reminder-initial-delay-ms`).
Delivery is best effort, not an exact-time SLA; multiple batches or outages can delay
notices, and an upcoming notice is not sent after its start time has passed.

Notifications copy no titles, minutes, participants, decisions or agreement text into the
global inbox. Their generic event labels are localized by the module's owner copy; deep
links reopen scoped records and recheck access. No browser business drafts are persisted.
No email, calendar invitation, video call, WhatsApp delivery or automatic task is implied.
V303 adds owned flow, series, planning metadata, signal receipt and workflow audit storage;
it does not grant entitlements or copy the corporate Root register.

## Approved operational extension — 2026-10-08 (implemented 2026-10-09)

- Agreement navigation retains the originating meeting ID and queries that meeting across all due
  dates. General views include all open and all overdue commitments, independently of the current
  month. Period-based KPI drilldowns still use their original explicit date population.
- Agreement creation has server-side search and pagination, with a separately resolved selected
  meeting. Older records remain selectable beyond the former first 100 choices. Only existing
  coordinator/administrator authority can create/edit; the selector never exposes minutes.
- OPEN agreements can change title, active assignee, due date and follow-up preference with current
  version and a reason. Coordinator/administrator owns edits. The assignee may append progress
  notes or complete their own agreement. The detail exposes a scoped audit capped at 100 with
  truncation disclosure; stale versions remain conflicts, not last-write-wins updates.
- Completed minutes remain immutable. Coordinator, administrator or delegated minutes owner can
  append a versioned addendum, recorded as an independent audit entry. Printing reuses the shared
  grayscale browser document engine, retains original minutes/decisions plus available addenda,
  and discloses the history bound. It is an operational copy, not a legal-signature service.
- Contextual series follow-up includes original OPEN agreements from earlier occurrences of the
  same company/series. It enforces visibility on each agreement and on the selected meeting.
  No agreement, deadline or responsibility is cloned or silently changed.
- A human action can create one linked native Processes task from an OPEN agreement. It requires
  both agreement coordination authority and native `processes` / `processes.calendar` access,
  including owner assignment/unit/business checks. `ProcessTaskMeetingContract` delegates to the
  existing task owner. A tenant-unique durable link makes retries return the same task. Task and
  agreement completion remain separate explicit validations; changing one never implies the other.
  Task details are projected only when the reader also has task object access.
- Agenda/Consulting confirmed occupancy and HR approved unavailable dates are checked during
  preview and again under the shared resource mutex before writes. Such conflicts cannot be
  overridden with the meeting-overlap acknowledgement. Cross-owner checks return booleans only.
  The existing acknowledgement policy for overlaps among company meetings remains intact.
- Calendar downloads export the selected occurrence as a UTC `.ics` file; they neither create an
  external meeting nor send invitations. Original lifecycle, recurrence bounds and native permissions
  remain in force. Operational copy supports all eight configured locales.

New private routes under `/api/v1/meetings`: `GET /agreement-meetings/search`,
`GET/PUT /agreements/{id}`, `POST /agreements/{id}/notes`, `POST /agreements/{id}/task`,
and `POST /{id}/addenda`. All retain session/module/tab/object checks and CSRF for mutations.
The agreements list accepts `meetingId` and `includePrevious`; invalid/unauthorized context fails
closed. V307 adds follow-up state and the task link; it grants no commercial or user access.
The module remains a pilot until release/acceptance gates close. Calendar sync, verified external
invitations, attachments and automatic task generation remain outside this delivery.

## Indicators

Eight independent operational counts, backend-calculated from the same from/to scope.
Meeting counts use start time; agreement counts use due date in selected timezone.
Source: `meeting_records` / `meeting_agreements`, same ownership predicates as lists.

| Count | Formula / decision | Reference / action |
|---|---|---|
| Planned | PLANNED starts in period / preparation | Inspect PLANNED meetings |
| In progress | IN_PROGRESS starts in period / ongoing work | Inspect IN_PROGRESS |
| Completed | COMPLETED starts in period / retained outcomes | Inspect COMPLETED |
| Cancelled | CANCELLED starts in period / lost sessions | Inspect CANCELLED |
| Awaiting closure | PLANNED/IN_PROGRESS with end before now / missing closure | Target 0; inspect pending meetings |
| Missing minutes | noncancelled meetings ended, empty minutes / missing evidence | Target 0; inspect meetings |
| Open agreements | OPEN due in period / workload | Inspect OPEN agreements |
| Overdue agreements | OPEN due in period and due date < today / intervention | Target 0; inspect OPEN agreements |

The original overview has no composite score, money or unit comparison. The explicitly approved
2026-10-23 agreement punctuality measure below is a separate, meeting-scoped projection. This complementary pilot uses
one compact overview; the two operational tabs are the record-detail destinations.
No empty chart or organizational view is created to fill a template. Counts can overlap
and are not additive. No implicit comparison to an unavailable previous period.

## Registration and release

V302 registers the existing module as assignable pilot and creates its owned tables.
It creates no entitlements, assignments or billing prices. Synthetic native-local demo
activation follows the existing local bootstrap only. Production activation, commercial
prices, release security review and deployment remain separate approvals.

## Local verification and handoff — 2026-10-09

The operational extension is implemented on `codex/agenda-juntas-operacion`. The shared
[coordination verification record](scheduling-module-contract-v1.md#local-verification-and-handoff--2026-10-09)
lists changed areas, test commands/results, database isolation, preserved behavior and release limits.
Meeting integration coverage passed 29 cases within the 76-test coordination run. Browser coverage
also passed agreement edit/reassignment, progress history, task retry/link presentation, closed-minute
addenda, series follow-up, calendar export, delegated access and mobile/dark presentation.

Original minutes/decisions, native task ownership and independent completion remain intact. Browser
printing is an operational copy bounded by the disclosed 100-entry audit history. Attachments,
external invitations and provider calendar synchronization remain deferred. Production deployment
and live entitlement changes: N/A; this delivery does not promote the pilot to released status.


## Operational presentation refinement — 2026-10-19

Daily navigation remains Juntas → Acuerdos → Indicadores: planning, commitments, then analysis.
Each tab has its own operational subtitle, shared blue title bar and white filter card. Juntas
keeps search, date range and status visible; coordinator and needs-attention filters use the
shared More filters disclosure. Restored active secondary values remain visible and editable.

Acuerdos consolidates all-open, all-overdue and period selection in its filter card. All-open and
all-overdue omit unused date inputs and the redundant open-status selector; a conflicting explicit
status remains visible for correction. Meeting-specific scope and previous-series commitments
retain their independent behavior. Due dates visibly identify open overdue agreements using the
same device timezone supplied to the API. No alert completes or changes a record.

Calendar supports Day/Week/Month, Today, previous/next and explicit custom ranges. A cell previews
up to three meetings; its remaining count opens the complete loaded day list with time, owner,
participants and status. The existing bounded-calendar warning remains authoritative. Meeting
names in the table open the same detail workflow as View. Ascending/descending server sorting,
resizing, planning/series, delegated minutes, agreements, reminders, evidence and task links keep
their existing owner contracts. These are presentation changes; no new endpoints or migrations.


## Real employees and live meeting execution — 2026-10-21

The meeting directory now consumes the HR-owned `HrSchedulingDirectoryService.meetingMembers`
projection. It returns names and user identities only, preferring HR profile names and retaining
active administrative/legacy company accounts. Known inactive or terminated employees are excluded
from new assignments and rechecked on planning/agreement writes. Existing participant/history
records remain readable. Editing shows departed saved participants for explicit removal; an open
agreement still requires reassignment before removing its assignee. Directory limit/disclosure
remains 500; HR payroll, contact and employment detail never enters the meeting DTO.

`POST /api/v1/meetings/availability` is an authenticated, CSRF-protected meeting-tab operation.
It validates company participants/coordinator, duration, timezone and optional authorized meeting
exclusion. It returns only availability and up to eight alternatives over seven local dates,
with quarter-hour starts from 08:00 through 18:00 and the requested duration. Suggestions do not
reserve time or guarantee a future save. Confirmed Agenda/Consulting/Maintenance occupancy,
approved HR absences and existing company meeting overlaps are checked. Scheduling supplies its
own boolean projection of active configured staff weekly windows, unavailable dates and the break
after a session. Split windows preserve breaks. People with no active Agenda staff configuration
receive no invented office hours restriction. Each request snapshots configured windows and
memoizes HR date checks locally; there is no shared personal-data cache. Saving still locks the
validated shared resources and rechecks hard appointment/HR/hour conflicts. Existing explicit
meeting-overlap acknowledgement policy is preserved.

V343 adds the owned `meeting_attendance` table. GET/PUT `/{id}/attendance` use the meeting tab,
session company/object scope and CSRF for writes. Initial attendance is UNMARKED, including the
coordinator; invitation never implies presence. Only the coordinator, company administrator or
explicit delegated minutes writer can mark PRESENT, ABSENT or UNMARKED while IN_PROGRESS. A
partial update changes only listed invitees, rejects duplicates/foreign identities, increments
the meeting version and appends an audit event in one transaction. Closed/cancelled records are
read-only. Attendance never grants/revokes module permissions or meeting visibility. Stale writes
return 409 and require an explicit refresh. Unsaved attendance has a native discard confirmation;
keeping editing retains the draft. Other modifying actions pause until attendance is saved.

The existing blue workspace shows purpose, actual attendance, agenda, minutes, decisions and
meeting-specific agreements. Creating an agreement from it fixes the meeting context, asks what
will be done, assignee and due date, and returns to that same meeting on save/cancel. Agreement
counts (open, overdue, done) are separate server queries over the entire authorized meeting set,
not the current date filter or ten displayed rows. Preview is capped at ten, with disclosed total
and access to the full agreement tab. No agreement query/panel appears without that tab permission.
The native Processes task link remains an explicit, authorized idempotent action in agreement
detail; no task or notification is fabricated by the new workspace.

Agreement creation now accepts optional `followupEnabled`; omitted preserves the historical true
default, explicit false is persisted. Existing per-user/company notification preferences and
recipient permission checks remain authoritative. New UI copy explains internal notifications;
no email, external invitation or provider synchronization is triggered. The coordinator remains
the default minutes writer, with optional visible delegation. Editors and multi-request planning
ignore completion from replaced authorization/company contexts. Native modal headers/footers
remain visible within small viewports; body scroll and existing horizontal navigation stay local.

Concluding previews decisions, actual attendance (including unmarked people), and authorized
agreement status. It preserves original minutes/attendance and does not complete open agreements.
The same meeting reopens after planning/minutes/status save. History is collapsible. Print/calendar
exports retain their existing contract (printed invitees are not relabeled as actual attendees).

Local activation uses a private database backup and only this module's verified classes plus its
HR/Scheduling projections. The existing independently requested V342 Email signature preference
is an additive schema dependency; this delivery activates no Email feature classes. No live
entitlement, billing, external delivery or production release state is changed.


## Weighted team decisions — 2026-10-21

The user selected different voting weight by function. Inside each meeting, Decisiones y
votaciones adds a proposal → team/rules review → open → personal votes → explicit close flow.
It uses the existing blue module/modal engine, eight locales, phone body scrolling and pinned
footer; it creates no new navigation tab or access authority. The UI initially offers editable
function examples (3/2/1/0 points) while assigning every eligible person Integrante/Member (1).
The coordinator explicitly assigns functions and reviews totals before opening. A previous
ballot in that meeting can prefill its functions, assignments and rules, with fresh eligibility
and required review. New participants receive no implicit elevated weight. Ineligible people
must have a zero-point function; removing a function requires explicit reassignment.

This is an operational, transparent roll-call vote, not a secret ballot, legal quorum,
corporate-governance or signature system. Function names do not change HR/account roles or
permissions. The current meeting participants plus coordinator comprise the exact roster,
including zero-point observers. Functions, participant name snapshots, points and rules freeze
when opened. Changing them requires cancelling with a reason and opening another ballot.

Both approval and participation rules operate on the entire frozen positive weight W:
MAJORITY = floor(W/2)+1, TWO_THIRDS = ceil(2W/3), ALL = W. Abstentions add participation only;
missing votes stay missing. Closing first checks participation, then approval, then an equal
nonzero yes/no tally. Outcomes are NO_QUORUM, APPROVED, TIED or NOT_APPROVED. OPEN remains PENDING
even when enough yes points exist. CANCELLED retains votes, reason and history. The defaults
are majority approval and majority participation; users can select each rule independently.

API owner: /api/v1/meetings/{meetingId}/ballots (GET paginated, POST open), /team (GET current
people and optional prior setup), /{id} (GET snapshot/voters/history), /{id}/vote (PUT own vote),
and /{id}/close (POST CLOSE/CANCEL). Existing authenticated company, native entitlement/module,
meetings-tab, object visibility and CSRF guards remain authoritative. The coordinator or company
administrator manages ballots while IN_PROGRESS; a delegated minutes writer gains no management
power. Every positive voter must be currently employment-eligible and have active company/module/
meetings-tab access. New votes and management writes recheck access. Revocation blocks new votes,
while recorded evidence and frozen denominators remain unchanged. An administrator cannot vote
on another user's behalf or vote unless listed with positive weight. Only session actor determines
the voter; client user/weight fields never determine authority or tally.

V344 owns four tenant-qualified tables: meeting_ballots, meeting_ballot_roles,
meeting_ballot_voters and append-only meeting_ballot_audit. Opening is company/actor/meeting/
payload-bound idempotent with the existing request receipt mechanism. Ballot global versions
protect close/cancel review; per-person vote versions permit independent simultaneous voters.
An exact retry of the last own choice acknowledges it without duplicate counting/audit, including
after closure. Stale changes/closing return 409. All changes, tally capture, receipts and audit
share the existing transaction/company lock. There is no deletion or editable closed result.

Limits: 100 ballots/meeting, 10/page (pages 1–10), 12 named functions, integer 0–1000 points/function,
101 people (100 participants plus coordinator), 240-character subject, 3000-character context,
2000-character close/cancel reason, and latest 100 audit entries with disclosure. Maximum total
weight is 101000. Names/subjects/reasons are protected in DTO diagnostics. Voting roles never
grants module access, and cross-company object IDs return scoped not-found/forbidden responses.

A meeting cannot conclude while a ballot remains OPEN. Cancelling a meeting cancels its open
ballots atomically, keeping their votes and cancellation reason. Closed/cancelled weighted results
are a structured projection in MeetingDetail.votingResults and printed minutes; original minutes,
decisions, attendance, agreements and tasks remain separate evidence. An approved result can
explicitly prefill a new agreement title. Assignee, date and Save remain required, with the existing
agreements-tab permission. No automatic agreement, task, attendance mark or completion occurs.
Manual Actualizar refreshes counts; no live push, ballot notifications, email or external delivery
are claimed. Existing internal reminders retain their own contract.

Acceptance: disposable MySQL tests cover frozen weighted totals, thresholds, quorum/abstention,
retry/change/concurrent votes, stale closing, revoked/HR eligibility, tenant/tab/CSRF boundaries,
forged voter/weight inputs, meeting completion guard and cancellation. Frontend tests cover draft
validation, actor-safe API payloads, all eight locales, print and guidance. Native browser review
uses fictitious records at desktop, 390×844 and 390×640, including discard retention, change vote,
close and explicit agreement capture. Typecheck and build are required before scoped local install.
Local activation backs up the database privately, applies only V344 and overlays verified meetings
classes on the existing runtime. Rollback retains V344 schema/data and its result readers; do not
remove or rewrite an applied migration or erase ballot evidence.


## Selected-day planning workspace — 2026-10-22

The approved refinement replaces the ambiguous date/count empty card with an explicit daily agenda.
The shared blue title, filters, calendar/table navigation, native modals, API, permissions and
meeting lifecycle remain unchanged. No backend or schema change is needed.

- One compact header groups visible period, Day/Week/Month, Today and previous/next. Timezone context
  stays visible below the workspace. Month/week reuse IndiceCalendarSurface with opt-in compact
  density; day mode uses its existing single-day presentation. Other calendar owners are unchanged.
- The subsequent user decision replaces the persistent daily panel with a day consultation modal.
  Month/week/day use the complete available width with local horizontal scrolling only where needed.
  Selecting a date or the remaining-count action opens **Juntas del día** in the shared blue Standard
  Form Modal: one coherent, read-only single-column list, without parallel configuration or bulk
  work. This classification keeps the native compact width, bounded body scroll and pinned actions;
  it is not an Operational Workspace merely to obtain more width. No custom modal engine is added.
- “Juntas del día” identifies the selected date and count. Cards show time, title, coordinator,
  participant count and status, ordered by start time/id, and open the existing detail. Preview retains
  three cards plus the remaining-count action; the modal shows all loaded rows. The parent owns one
  dialog state: detail/planning replaces the day list and closing returns to that day, without stacked
  dialogs. Loading/error, filtered scope and the existing truncation warning remain explicit.
- Empty filtered days say no matches and offer Clear filters while preserving period. Unfiltered
  empty days explain that no meetings exist in the authorized scope. Schedule meeting opens the
  existing planning modal with that local date; future days default to editable 09:00, today uses
  the current rounded future-time default where possible. Past days remain consultable without
  the date-specific scheduling shortcut. Global New meeting retains its existing default.
- All eight locales are complete. Save, availability, participant validation and discard protection
  remain owned by the native planning flow. Synthetic UI acceptance creates no real meetings.

Rollback restores the changed frontend files. Validation covers empty/filtered/five-meeting days,
selected-date prefill, calendar overflow, scope navigation and desktop/phone layouts.


## New meeting creation wizard refinement — 2026-10-22

The user explicitly replaces the long Single meeting creation form with four dependent steps.
Purpose captures mode/title/objective/result/type. Team selects active members, coordinator and
optional independent minutes writer. Date and agenda contains time/duration, native availability,
internal reminders, agenda/place and optional recurrence for Flow/series. Review uses the existing
server preview and shared summary before an explicit Schedule action. Single meeting never bypasses
review, exposes recurrence, or accidentally saves a reusable flow. Flow/series retains optional
flow reuse, repeat controls and save-flow selection.

Continue validates only the visible stage; active people and purpose are rechecked before preview
and submission. Back retains values; edits invalidate preview/overlap acknowledgment as before.
Pending preview/submission blocks duplicate actions and dismissal synchronously. Failed saves
retain input and reuse the existing payload-bound idempotency key for unchanged retries.
Authorization revision checks and native availability/lifecycle/CSRF/tenant rules stay authoritative.
The shared frame, compact stepper, validation, summary and module blue are reused. Body scrolls
inside the modal, header/footer stay visible, and the footer identifies the step on phones. New
labels cover all eight locales. Editing/version semantics, API and database are unchanged.


## Dedicated meeting room — 2026-10-22

The user explicitly adds a route-backed **Sala de junta** between Juntas and Acuerdos.
`/minutes-control/session?meeting={id}` reuses `control_minutas.meetings` through the native
tab-scope catalog. This is a derivative presentation tab, not a new permission or an agreement
grant. Existing meetings/agreements/indicators routes and independent backend scopes remain.
The prior statement that voting creates no new tab described that delivery; the new room groups
meeting execution, including the unchanged voting owner, without changing voting authority.

The calendar/detail offers Enter meeting room. Without an ID the room shows an authorized,
paginated native meeting search with dates/status. An explicit inaccessible or malformed ID
shows an error; it never falls back to a different meeting. No private content enters workspace
memory or browser storage. The meeting ID remains navigational context only.

One shared blue title bar identifies the meeting, its original timezone, status and coordinator.
The room has native section navigation for agenda, minutes, attendance, authorized agreements and
weighted votes. Agenda/context stays alongside the writing area on wide screens and is reachable
from section navigation on phones. Minutes and decisions are editable inline by the coordinator,
company administrator or delegated writer only while active, using the existing versioned PUT.
Save is explicit and remains in the sticky title. No realtime coediting or autosave is claimed.

Failed writes retain drafts. A 409 keeps the draft, blocks blind retries and offers Copy draft
and explicit reload/discard before reviewing server data. Duplicate saves are synchronously
blocked. Authorization changes hide/discard the old mounted workspace and ignore stale completion.
Native router blocking covers tab/module navigation, meeting changes and browser Back/Forward;
beforeunload covers reload/close. Discard is the native Confirmation Modal. While a native editor
or request is open, navigation is blocked without stacking confirmations. Minutes and attendance
are saved separately: other mutations pause while either is dirty, avoiding silent version rebasing.

Attendance, agreement creation/detail/edit/progress/task linking, voting, lifecycle review, closed
minute addenda and printing reuse existing owners, APIs and modal frames. Agreement reads/actions
are mounted only with independent agreement access. New agreement context stays fixed to the current
meeting; saving returns to the current room section. Start/complete/cancel remain explicit, with
existing minutes/open-ballot closure rules. No backend change, migration, external message or real
record mutation is required for synthetic UI verification.


## Agreement delegation and punctuality — 2026-10-23

The approved user flow is Junta → Acuerdo → linked native Processes task. The blue detail remains
an **Operational Workspace Modal**, simplified to preparation, agenda, participants and a scoped
agreement/result summary. Its single footer primary opens the existing room (Open / Continue /
View minutes by lifecycle). Secondary planning/printing/calendar actions live in More options;
cancellation is separated. The room owns live editing, attendance, voting and lifecycle actions.
Creation retains its existing wizard. Delegation and fulfilment validation are **Standard Form
Modals** replacing the detail, with native unsaved guards and no stacked active overlays.

`POST /api/v1/meetings/agreements/{id}/task-delegation` reviews participant assignee, commitment date,
reason for any reassignment/rescheduling, and expected agreement version. One transaction validates
native meeting authority and Processes assignment/unit/business scope, records the agreement change,
creates the native task and durable link, and audits. Exact payload retries return the same task;
changed retries conflict. The existing `/task` contract remains compatible. Missing task entitlement,
revoked membership, invalid participant, stale version or failed task creation roll back the complete
use case. Linked task access is rechecked; this does not add a new task authorization system.

Tasks and agreements remain independently validated. The detail exposes View task using the native
agenda search and Validate agreement fulfilment with a result/evidence note. Task status alone never
fulfils an agreement; meeting closure also leaves open agreements intact. Subsequent linked task edits
remain Processes-owned and do not silently change the meeting commitment.

V351 records immutable `original_due_date`, `deadline_basis`, server-confirmed `fulfilled_at`, delegation
retry fingerprint and append-only assignee/deadline revisions. New agreements have CREATED baselines.
Existing rows adopt their current deadline as ADOPTED reference; earlier original deadlines cannot be
reconstructed safely. Existing completion audit instants are retained when available, but ADOPTED
records remain explicitly unscored. V352 keeps the additive original date nullable so an older binary
can still insert agreements during rollback; such records remain explicitly unscored. New owner
writes always supply the original date. No historical deadline, attendance or completion is invented.

`GET /{meetingId}/agreement-performance` and `GET /agreements/{id}/evidence` require current agreements
tab and meeting/object visibility, tenant-scoped queries, and no broader minute exposure. Performance
is computed by the Meetings backend for the selected meeting, across all its agreements whether linked
to tasks or not. Its fixed evaluation boundary is the meeting's IANA timezone, calculated at response
instant. An original date is ended only when earlier than the local current date; today and future
original deadlines are not in the denominator, including work completed early. The score is:

`on-time confirmed agreements / evaluable agreements with ended original deadlines × 100`.

Round HALF_UP to a whole percent. No eligible agreements means null/Pending evaluation, not zero.
Among eligible agreements: DONE with fulfilment local date <= original date is on time; DONE later
is late; OPEN is overdue. Cancelled agreements are excluded with retained cancellation reason.
ADOPTED or missing completion evidence is separately counted as historicalUnknown and excluded.
Upcoming deadlines, cancelled records and historical uncertainty are always disclosed. Reprogramming
does not reset the original baseline or erase a missed commitment. This measures agreement punctuality,
not employee performance or the substantive quality of the meeting.

Delegated MCP tools share this owner contract. Reads: `list_meetings`, `get_meeting`,
`get_meeting_agreements`, `get_meeting_agreement_performance`. Confirmed actions:
`save_meeting_minutes`, `create_meeting_agreement`, `delegate_meeting_agreement_task`, each with a
preview companion. Explicit new consent: meetings.read/manage and meeting_agreements.read/manage;
delegation additionally requires tasks.create and tasks.delegate plus current native task permissions.
No new scopes are silently granted to old connections. Tools revalidate current tenant/tab/object and
use stored five-minute connection-bound immutable confirmations, transactionally consumed with
idempotent executions. A stale version requires a new review, never a blind overwrite. The existing
bounded minute/decision text contract is retained; structured per-topic sheets remain a separate
future evolution. Tools cannot infer attendance, votes, fulfilment or meeting closure.
