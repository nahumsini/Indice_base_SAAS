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
calendar presentation and one-frame modal engine. Tabs: meetings, agreements, indicators.
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

- Junta única is a grouped **Standard Form Modal**. Flow/series is a three-stage
  **Modal Wizard Índice**: purpose/people → schedule → review. Back retains the draft.
  Review shows backend-calculated dates, timezone, responsibilities and overlap counts.
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

Off by default. Selecting 15/30/60/1440 minutes enables upcoming-meeting reminders,
missing-minutes notices after the session, and overdue-agreement notices by the meeting
timezone. Pausing a series suppresses its internal signals. Cancelled source meetings
do not send reminders; retained agreements remain actionable in their tab.

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

No invented score, percentage, money or unit comparison. This complementary pilot uses
one compact overview; the two operational tabs are the record-detail destinations.
No empty chart or organizational view is created to fill a template. Counts can overlap
and are not additive. No implicit comparison to an unavailable previous period.

## Registration and release

V302 registers the existing module as assignable pilot and creates its owned tables.
It creates no entitlements, assignments or billing prices. Synthetic native-local demo
activation follows the existing local bootstrap only. Production activation, commercial
prices, release security review and deployment remain separate approvals.
