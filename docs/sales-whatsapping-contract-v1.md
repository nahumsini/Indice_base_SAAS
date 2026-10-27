# Sales Whatsapping — assisted campaigns

Status: implemented locally, 2026-10-19; verification is recorded below after execution.
Owner: Sales. Runtime: `react/src/app/BasicModules/Sales/Whatsapping`, backend `sales.whatsapping`.

## Product decision and boundaries

The user approved campaigns whose messages are prepared by Índice and sent individually by the
salesperson in WhatsApp Web or the phone application. This replaces the initial placeholder.
The browser account is neither discovered nor controlled by Índice. The user reviews the sending
account and presses Send in WhatsApp. There is no WhatsApp session extraction, unofficial automation,
Meta API transport, automatic bulk delivery, delivery/read receipt, or inbound conversation sync.

Sales owns campaigns, contact selection, named lists, templates, material links, ordered follow-ups,
manual outcomes, exclusions and history. Email/Mailing permissions, SMTP workers and suppression
records are separate and unchanged. This is not an extension of the private Email account boundary.
The existing Sales contacts directory remains authoritative; Whatsapping reads a tenant-scoped
projection of its active contacts and never creates or alters contact records implicitly.

## User journey and visual contract

Use the Sales coral title bar, shared filter bar, sortable/resizable campaign table, common
pagination, shared modal engine, dark mode and the eight runtime locales. Filters and sorting use
`useWorkspaceNavigationMemory` under `crm/whatsapping`; messages and recipients live in MySQL.

- Campaign-list title bar: Templates and New campaign. The contact-list and Refresh entries
  are removed by the 2026-10-26 owner decision; there is no empty Actions menu. Failed list/date
  reads expose a contextual Retry action. Returning from a campaign or saving refreshes the list
  through the existing lifecycle. Contact selection and saved-list data retain their owner contract.
- Campaign wizard: Details → Contacts → Message → Review. Draft save is permitted before activation.
- Contact selection: explicit page/all-matching selection, at most 500 contacts, search and named lists.
- Templates and lists: an operational workspace with same-frame standard-form editing and dirty-close
  confirmation. Templates can be archived; existing campaign content is a copy and is unchanged.
- Working view: contact queue plus prepared message, manual confirmation, reply/skip/exclude results,
  notes, next action and activity history. Pause/resume retain progress. The campaign URL can be opened
  from an in-app notification. Opening a URL alone never sends or changes progress.
- Public HTTPS resource links may be inserted into the message with `{{link}}`. PDF/photos are attached
  manually in WhatsApp. This release does not upload files or publish private ERP attachments.

## Data and authority

Migration V331 introduces company-owned campaigns, recipients, templates, lists, phone exclusions
and append-only operational events. Tables use tenant-qualified aggregate keys. Contact ownership
is validated before membership writes. Existing migrations are not modified.

All endpoints under `/api/v1/sales/whatsapping` require a session, CRM entitlement and `crm.contacts`,
matching the existing Whatsapping navigation permission. Public demo sessions are denied. Browser
mutations require CSRF; services revalidate current membership/tab and mutation entitlement.
A contact-enabled salesperson may create a campaign; its creator is the responsible salesperson.
Only that owner or a current company administrator may edit/work it. Other authorized colleagues
may consult it. No company/user/role authority is accepted from request bodies.

Draft edits, templates and lists use optimistic versions. Activation freezes the audience and
sequence, preventing historical changes. Company locks serialize complete mutations; recipient
versions reject stale/repeated actions so a retry cannot advance the sequence twice. The interface
retains failed input and explains conflicts rather than automatically repeating an action.

## Message preparation and lifecycle

A campaign has one to five ordered steps. The first has zero delay; subsequent steps allow 0–365
days after the previous manually confirmed send. Dates are stored in UTC and displayed in the user's
local time. Clearing a manually scheduled date explicitly makes a waiting contact available now; notes remain intact. `PREPARE` revalidates the current contact, normalized telephone, exclusions, duplicates,
remaining variables, due time, permissions, version and active campaign before returning a `wa.me`
URL. The phone is parsed with the existing libphonenumber dependency and an explicit campaign region
for national numbers; extensions and invalid numbers are rejected.

Supported English variables: `name`, `clientCompany`, `seller`, `company`, `offer`, `link`. Missing
values remain visible placeholders and prevent preparation. Unknown/malformed tokens are rejected.
Rendered messages are limited to 4,000 characters and URL encoded. URLs cannot contain credentials or unsafe schemes.

Campaign states: DRAFT → ACTIVE ↔ PAUSED → COMPLETED; ARCHIVED stops further work.
Recipient states:

- PENDING: not yet prepared.
- PREPARED: Índice prepared the WhatsApp handoff; this does not assert a sent message or an opened app.
- WAITING: a later step or manually scheduled follow-up is due at `next_action_at`.
- DONE: all steps were marked sent by the salesperson; no server delivery assertion.
- REPLIED: reply manually recorded; remaining steps stop.
- SKIPPED: this campaign stops for the contact.
- BLOCKED: the company must not contact this normalized phone through Whatsapping campaigns.

SENT is accepted only after PREPARE by the same actor. It records a manual confirmation and either
schedules the next step or finishes the recipient. Replies, notes and exclusion remain available
after final confirmation. No status change causes WhatsApp to send. Drafts may retain invalid or
duplicate phones for review; they cannot be prepared. A blocked phone is excluded across campaigns.

## Reminders

`WhatsappingReminderSource` extends the existing notification owner contract. The existing dispatcher
creates a durable, deduplicated `sales_whatsapping_reminder` for the campaign owner when a WAITING
recipient becomes due. Visibility is revalidated against tenant, current contact access, owner,
active campaign and current due state. Pausing, finishing or rescheduling out of the due period hides
the obsolete signal. Personal notification preferences apply. No email or WhatsApp is sent by this job.

## Verification

Verified on 2026-10-19:

- 16 backend integration tests passed: durable drafts/templates/lists, individual handoff, explicit
  confirmation, stale-version rejection, deferred sequences, notification deduplication/visibility,
  pause/resume, exclusions, tenant boundaries, owner/tab authorization, CSRF and schedule clearing.
- Two migration uniqueness tests passed. Flyway initialized an isolated `indice_test_db` on port
  13332 through V331. The existing shared test database had an unrelated historical checksum mismatch;
  no repair or migration edit was performed. A separate source snapshot also avoided concurrent builds
  deleting shared `target` classes. The functional database was not used for integration tests.
- Real components passed the browser flow with synthetic API data in Chromium and WebKit: template
  application, selection of 27 contacts across pages, draft retry, blocked-popup handling, URL encoding,
  manual confirmation, conflict input retention, exclusions, resume, 390px layout and dark mode.
  External requests were blocked; no WhatsApp message was sent.
- TypeScript and production build passed. The build retains existing chunk-size warnings.
- 37 Sales frontend standard, navigation and notification-destination regressions passed.

Reproducible entries: `WhatsappingIntegrationTest`, `MigrationVersionUniquenessTest`,
`npm run test:whatsapping-browser`, `npm run typecheck`, `npm run build`, and the existing
Sales/navigation/notification regression suites. Browser testing accepts `INDICE_PLAYWRIGHT_MODULE`,
`INDICE_CHROME_PATH`, `INDICE_BROWSER=webkit`, and optional `INDICE_WEBKIT_PATH`.

## Local activation and files

V331 was applied successfully to the existing functional local database, after a private logical
backup. Only Whatsapping classes, the tab classifier and the two notification integration classes
were overlaid onto the currently running backend; its other classes and configuration were retained.
Backend 8083 and frontend 5175 are available. An independent synthetic login verified campaign,
contact, template and list reads (ten existing contacts); it made no business changes and was closed.
The backend restart expired existing browser sessions, so users must sign in again.

Changed implementation groups:

- `react/src/app/BasicModules/Sales/Whatsapping/*`: campaign index, wizard, contact picker, working
  view, template/list management, localized copy, API/model and presentation helpers.
- `react/src/app/BasicModules/Sales/Ventas.tsx` and its eight translation files: activate the route
  and replace the pending-feature description.
- `src/main/java/com/indice/erp/sales/whatsapping/*` and migration V331: contracts, controller,
  service, repository, validation and reminders.
- `TabPermissionRouteClassifier`, `NotificationAccessService`, `NotificationPreferenceCatalog`
  and frontend `basicNotificationCatalog`: use the existing permission/notification owners.
- Browser fixture/runner, `WhatsappingIntegrationTest` and the package test command; the canonical
  frontend/backend documents reference this contract. Pre-existing unrelated work remains intact.

Remaining limits: sending and reply confirmation are manual; account selection, attachments and
actual delivery remain in WhatsApp. There is no transport integration or delivery/read webhook.
No production deployment was performed. Actual third-party sending was intentionally not exercised.

## UI alignment — 2026-10-19

UI alignment, 2026-10-19: the campaign index, wizard, template/list library and contact workspace
use the Sales title/action hierarchy, shared filters and table engine, native tab artwork and
coral accents. The shared modal frame owns a single footer; contextual step descriptions,
white form controls and message previews clarify campaign preparation. The working view separates
campaign progress, message preparation, contact outcome and follow-up. On phones, the contact queue
is collapsible; changing contact retains the existing unsaved-notes confirmation and returns focus
to the contact heading. Template availability is distinct from campaign execution status.
All eight locales retain translated copy. APIs, permissions, persistence, recipient eligibility
and manual WhatsApp sending semantics are unchanged. No migration or backend restart is required.

The browser regression additionally covers mobile queue disclosure, focus after selection and
retaining notes when a contact change is cancelled. Visual QA includes the campaign table,
template library, wizard and review, contact workspace, phone layout and dark mode. Chromium and
WebKit passed with synthetic contacts and external requests blocked. TypeScript and the 37 existing
Sales/navigation/notification regressions passed. The production build passed with the existing
large-chunk warnings. UI changes are confined to `Whatsapping.tsx`,
`CampaignEditor.tsx`, `CampaignWork.tsx`, `LibraryModal.tsx`, `WhatsappingUi.tsx`, `whatsappingCopy.ts`,
the browser regression and this contract.

## Deployment and rollback

Additive tables; no Meta credentials, public endpoint or new network service is required. Deploy
backend migration/classes before the frontend route. Local runtime activation preserves the existing
running classpath and its configuration; the previous runtime remains available for rollback.
Rolling back the UI to its initial placeholder leaves campaign records intact. Never drop V331 tables
or alter Flyway history to roll back. Public release remains subject to the repository security gate.

## Official conversation exclusion owner port (2026-10-22)

WhatsAppSuppressionContract is the explicit owner boundary used by
[official Sales Conversations](sales-conversations-contract-v1.md) to read and record company phone
exclusions. A customer opt-out blocks new official sends and the existing assisted campaigns.
Campaign routes, wa.me preparation and historical manual SENT/REPLIED declarations retain their
existing meanings; none becomes a provider receipt or approved Meta template.

## Compact assisted workspace — 2026-10-26

The working view uses a compact campaign summary, visible draft editing and localized draft/pause
guidance. The message shows the review → open WhatsApp → manually confirm sequence; PREPARED
explicitly explains that opening does not send. Previous/next navigate the current filtered queue
without wrapping and preserve the existing dirty-note confirmation. A selected contact outside the
filters is identified with an explicit first-result action rather than silently discarding edits.
The contact position and touch-sized navigation appear above the message on phones. No backend,
permissions, payloads, sending handlers or persistence rules change.

Verification: 35 Sales frontend standard/navigation regressions, TypeScript and production build
passed. Synthetic browser checks covered draft activation, PREPARE without sending, manual-send
gating, saved notes, cancelled dirty-note navigation, filtered queue boundaries, 320/390px layouts
and dark mode. Refresh lives in Actions (including read-only views), retaining dirty confirmation.
The local frontend remains on 5175; no backend restart or real message was needed.

## Contact workspace sections — 2026-10-26

Mensaje, Seguimiento and Historial use the shared coral workspace navigation. The current contact
and previous/next controls remain outside all sections. Sections stay mounted while hidden, and
changing section does not reset notes or next-action date or save implicitly. A pending-follow-up
indicator remains visible in every section with a direct return to Seguimiento. History shows the
selected contact's event count and explicit empty state. Existing dirty-contact/exit confirmation,
save failure handling, manual sending, authorization and backend contracts remain unchanged.

Verified with the isolated synthetic browser fixture at 320px and 390px and in dark mode:
section switching retained unsaved notes, the return shortcut restored the note, changing contact
still requested dirty confirmation, cancellation retained the input and explicit save cleared the
pending indicator. The history empty state remained scoped to the current contact. All 35 Sales
frontend/navigation regressions, TypeScript, build and whitespace checks passed. Build retains
existing chunk-size warnings. No real messages or business records were changed.

## Assisted contact attention shortcuts — 2026-10-26

Shared coral view navigation exposes Pending, Follow-ups for today and Finished with campaign-wide
counts independent of the selected filter/search. The shortcuts and existing status selector share
one state and combine with search. Today includes WAITING contacts overdue or scheduled before
the next local midnight (including dates later today), excluding tomorrow and terminal contacts.
It is a viewing filter only: preparation remains blocked until the exact due instant. The existing
DUE selector retains its exact-time semantics. Switching a filter preserves the current contact
and unsaved notes, with the existing outside-filter notice and explicit dirty-guarded selection.

Verified at 320/390px and in dark mode with synthetic PENDING, overdue WAITING, later-today
WAITING, tomorrow WAITING and DONE contacts: counts 4/2/1, today results 2, combined search 1,
finished plus nonmatching search 0 and finished after clearing search 1. Counts stayed stable
while selection and search changed. All 35 Sales frontend/navigation regressions, typecheck,
production build and diff checks passed (existing chunk-size warnings). No messages were sent.

## Action blocking guidance — 2026-10-26

Visible localized action reasons explain draft/pause/read-only/closed states, in-flight requests,
invalid/inactive/duplicate/excluded contacts, missing message data, scheduled dates, unsaved dates,
manual preparation before sent confirmation, terminal outcomes and unchanged follow-up saves.
Reasons are associated to disabled operational buttons via aria-describedby and remain readable
on touch screens; no tooltip is required. Navigation boundaries and pending-save state are explained.
Existing disabled predicates, permissions, exact-time eligibility, payloads and send handlers remain
unchanged. Guidance never removes phone exclusions or edits frozen campaigns.

Verified with synthetic DRAFT/ACTIVE/PAUSED/read-only/invalid-phone/future-date scenarios:
visible next-action guidance, manual-confirmation gate, disabled unchanged save and pending-note
retention across sections. Visual QA passed at 320/390px and in dark mode. All original disabled
predicates were compared and retained. 35 Sales frontend/navigation regressions, typecheck, build
and diff checks passed; build retains existing chunk warnings. No real messages were sent.

## Campaign list operational summary — 2026-10-26

The existing desktop table now exposes finished/pending counts alongside progress and the earliest
nextActionAt among nonterminal recipients. Phones use compact campaign cards with the same data,
state, owner and existing work action; shared filtering and pagination are unchanged. Dates use
local time and preserve paused context; completed/archived campaigns have no next operational
follow-up. The existing detail read supplies dates for the visible page with at most two concurrent
requests, cancellation and no persistent cache. Errors are distinct from no scheduled date and
point to the existing Refresh action. No new endpoint, backend restart or sending action is added.

Mobile cards retain the last-updated timestamp and expose the existing backend sort options through
a native filter select. Desktop resizing/sorting and common pagination remain available. Synthetic
visual checks covered 320/390px, dark mode and desktop, search retention, terminal/no-date states
and a failed date lookup that shows a retry instruction rather than claiming no follow-up.

Final verification: 35 Sales frontend/navigation regressions, TypeScript, production build and
diff checks passed. The build retains existing chunk-size warnings. No real messages were sent,
no business records were modified and neither backend nor frontend processes were restarted.

## Direct campaign follow-up entry — 2026-10-26

Each campaign card and desktop row includes Follow-ups due with the existing campaign-wide due
count. It opens the same campaign via the optional whitelisted recipients=DUE query hint, selects
the first WAITING recipient due at the current instant and opens Seguimiento. With no matches it
shows the empty queue rather than an unrelated contact; users retain the status selector. Normal
work entry and Back remove the hint. This viewing hint grants no authority and never sends or
updates records. Contact notes, manual outcomes, permissions and dirty-exit handling are unchanged.

Verified with synthetic campaigns: direct entry selected DUE and Seguimiento, a future-only campaign
showed zero matches, Back removed the hint and normal work entry restored PENDING/Mensaje.
Visual QA passed at 320/390px and in dark mode. The 35 Sales frontend/navigation regressions,
TypeScript, build and diff checks passed (existing chunk-size warnings). No real messages were sent.

## Contact completeness at campaign preparation — 2026-10-26

Contact selection only adds READY contacts from the normalized, suppression-aware contacts
projection with a phone and name; clientCompany is required only when referenced by the message.
Individual/page/all/list selection respects this gate. Existing draft selections remain visible
and removable; save rechecks the complete selection and rejects incomplete/excluded/duplicate
phones without silently deleting contacts. Link/offer variables require their campaign values
before review/save. No unused optional contact fields become mandatory. Bulk validation pages
the existing contact projection rather than using raw selection eligibility. Server PREPARE
authority remains unchanged; no activation or send is implied and no backend contract changes.

Verification: 39 regressions passed (including four new contact-gate tests for required fields,
optional company data, duplicate phones, list pagination and bulk limit), TypeScript/build/diff
checks passed with existing chunk warnings. Synthetic UI checks confirmed disabled incomplete
contacts, bulk selection of eligible contacts only, rejection of a previously incomplete draft,
missing link detection with zero saves and successful save after correcting the message. Mobile
320/390px and dark mode were reviewed. No real business records or sending actions were used.

## Contact correction without leaving the campaign — 2026-10-26

The picker lists each missing required field (phone, valid regional phone, name, conditional company)
next to contact identity, including on narrow screens. Exclusion/inactivity/duplicate explanations
remain distinct from missing fields. The correction link uses the existing /sales/contacts q/page
contract in a separate noopener tab; the user chooses Edit in the filtered native directory. The
original wizard stays mounted with its draft and selected IDs. Return guidance asks the user to
save the contact, return and Refresh; selection is not silently changed. The correction link grants
no additional permissions and never removes exclusions, saves a contact or sends a message itself.

The current CampaignWork contact exposes the same field-specific correction block independently
of campaign status, so a draft-state warning no longer hides contact data problems. Verification:
41 tests passed, including issue mapping and encoded correction URLs; typecheck/build/diff checks
passed with existing chunk warnings. At 320/390px the synthetic wizard retained its edited campaign
name and selected contact after opening the real native Contacts route with a synthetic search in
a new tab and refreshing the picker. The destination showed the expected filtered empty directory;
no real record was edited. Current-contact correction was also reviewed in dark mode. No sends.

## Automatic check after contact correction — 2026-10-26

Explicit correction links arm a one-shot focus/visibility return check; unrelated focus does not
reload. The picker refreshes its existing page and reports the contact's READY or specific missing
fields without touching selected IDs or the parent campaign. The work view re-reads the campaign
and preserves unsaved note/date inputs even if the returned recipient version changes. Checks are
read-only, deduplicated, scoped to the mounted view, with explicit failure and no auto-retry/send.

Synthetic return-flow QA: the embedded viewer uses an explicit F8 browser-return signal because
background computer-use focus does not consistently emit native tab focus. An in-memory external
contact correction then changed INVALID/no phone to READY, refreshed the picker without pressing
Refresh and retained the edited campaign name and selected ID. A separate work-view correction
returned a new recipient version and retained an unsaved note while showing READY. No real contact
was edited. The hook regression covers unarmed focus, hidden visibility, one-shot deduplication,
latest callbacks and listener cleanup. No WhatsApp handoff or send was exercised.

Final verification: 42 regressions, TypeScript, production build and diff checks passed; existing
chunk-size warnings remain. Frontend 5175 stayed running. No real records were modified and no
messages were sent. A failed picker check retains its target so manual Refresh can report recovery.

## Per-contact prepared message — 2026-10-26

The message editor begins with the rendered campaign message and allows an override only for the
current recipient/step. PREPARE accepts optional messageOverride (nonblank, max 4000, no unresolved
tokens); all existing tenant/owner, due-time, exclusion, eligibility and version gates run first.
The exact prepared override uses existing prepared_text persistence and the wa.me URL; there is no
schema change or automatic send. Recipient baseMessage is an additive rendered campaign projection
for restore; old clients omitting the override remain compatible. Re-preparation replaces only the
current prepared text. Unprepared edits are local and participate in dirty-exit protection; a changed
text disables SENT until PREPARE succeeds again. Campaign steps and other recipients never change.

## Streamlined contact workspace — 2026-10-26

Navigation and manual outcomes precede all three contact sections. The first explicit operation in
a draft uses the existing authorized/versioned ACTIVE transition before the recipient mutation;
merely entering the workspace never mutates or sends. Activation errors preserve local message,
notes and selection. Pause/resume, completed/archive locks and manual WhatsApp confirmation remain.
Saltar contacto retains SKIP semantics (final); it does not promise a scheduled follow-up.

## Advance after manual outcomes — 2026-10-26

Successful SENT, REPLIED and SKIP move to the next nonterminal contact in the visible queue,
wrapping once and excluding the current contact. With no remaining candidate the current result
stays visible. Errors never navigate. Notes use the existing outcome mutation; unsaved message
overrides on REPLIED/SKIP remain in a per-contact/step in-memory draft while this workspace is
mounted. Returning to that contact restores its text; exit remains guarded. Draft text is not
server persistence and is not retained across an explicit discard/reload. No real messages were
sent in verification. 42 frontend regressions, TypeScript, build and synthetic three-outcome
mobile flow checks passed. Backend and permissions are unchanged.

## Campaign wizard clarity — 2026-10-26

Create/edit remains a native **Modal Wizard Índice**: Details → Contacts → Message → Review.
Details contains name and objective only; the header keeps the action identity rather than
changing into the typed campaign name. The owner removes Product or service from the form and
personalization controls. Existing offer data and its API field remain compatible; an old
template with an empty offer tells the user to replace that token in the message.

Phone region belongs to Contacts, with help explaining its use for national numbers. Saved-list
and template selectors appear only when there are usable choices. Contact-correction guidance
appears only when the current page contains contacts requiring review; eligibility and correction
behavior are unchanged. Optional links and editing previews use native disclosures in Message,
and the link opens when its token is used. Review shows full messages and campaign context.

The shared frame, stepper, validation and footer remain authoritative. Cancel stays left;
Back/progression/save stay right. Partial Save draft remains available before Review; the final
action is Create campaign or Save changes and validates all stages before saving. Failures retain
the draft and permit explicit retry. Saving does not send or activate a campaign. No backend,
schema, permission or transport changes are introduced by this presentation refinement.

Synthetic review entries: `tests/browser/whatsapping-campaign-wizard.html` and its mobile wrapper.
The fixture blocks real API traffic and supports `scenario=legacy` and `scenario=legacy-empty`.

Local verification: the real wizard completed all four stages with synthetic contacts, showed
missing-link guidance, retained review data after an injected save failure, and saved the same
draft on explicit retry. Back/Continue retained edited message text; the empty legacy-offer case
exposed an editable-message correction, and dirty exit used the same-frame confirmation. The
390×640 light and 320×640 dark phone reviews kept the header, controls and footer within the viewport. All 42 existing
Sales/navigation/contact-gate regressions passed. No business records or real messages were used.

## Template library standard — 2026-10-26

The template library remains an **Operational Workspace Modal**. Shared search and availability
filters precede the canonical resizable Name/Status/Actions table and local pagination. Search
includes name and message, resets the page, and combines with Available/Archived/All. The preview
renders English variables with clearly identified example values; stored template text is never
rewritten by previewing. Compact view/edit actions are labelled and have tooltips.

Desktop shows list and selected-message preview together. Phones use the same frame for list or
preview with Back, retaining search, status, page and selected record. Create/edit replaces the
visible surface with a **Standard Form Modal**, stable action title, name/message, readable
personalization buttons and the existing availability state. Product/offer is not offered as a
new personalization button; existing template tokens remain compatible. Cancel/dirty discard,
optimistic versions, explicit save retries and company authorization retain their existing owner.
The hidden library remains mounted through editing and confirmation to preserve presentation state.

Template mode reads only its template owner endpoint; it does not depend on the contact-list
endpoint. Failed reads expose Retry without claiming an empty successful library. Save failures
retain all edited fields; success returns to the saved library with the filters intact.

Synthetic review entries: `tests/browser/whatsapping-template-library.html` and its mobile wrapper.
The fixture blocks real APIs and supports `empty`, `failRead`, `failSave` and `theme=dark`.

Local verification used the real library/form with synthetic records: search narrowed 12 templates
to one; editing retained message and availability after an injected save failure; explicit retry
returned to the filtered library with the archived result and restored row focus. A failed read
recovered through Retry without a contact-list read. At 320×640 in dark mode, preview opened in
the same frame, focused its heading and returned to the selected row with the search retained.
Desktop list/preview and the native header/footer were reviewed. The 42 existing Sales/navigation/
contact-gate regressions passed. No real templates, contacts or sends were used for verification.

## Commercial contact outcomes — 2026-10-26

The working bar exposes Contactado (existing explicit SENT confirmation), positive reply, negative
reply and Create opportunity. Contactado still requires this actor to prepare the current message
and preserves subsequent ordered follow-ups. REPLY_POSITIVE and REPLY_NEGATIVE retain the existing
terminal REPLIED state and append distinct audited actions; legacy REPLIED remains readable. An
additive replyOutcome projection reads tenant/campaign-scoped reply events independently of the
last-100 activity limit. A negative reply does not suppress the phone. All authorization, tenant,
version, pause and terminal checks remain server enforced. No migration is required.

Create opportunity composes Sales' existing CreateOpportunityModal and opportunity owner API. The
contact stays locked to the campaign contact; the campaign name and notes are copied, source is
WhatsApp, and only active Sales-context owners are selectable. Nothing is created on opening or
cancel. A successful opportunity save is followed by the existing campaign result operation and
auto-advance. If that second operation fails, the opportunity already exists: duplicate creation
is disabled for that contact in this mounted workspace and the result can be retried separately.
These are two owner operations, not a cross-owner transaction. Form failure keeps input and does
not advance. Dirty-close confirmation and the original work-view drafts remain intact.

Verification: 19 isolated backend integration tests and 42 frontend regressions passed, plus
TypeScript/build and synthetic mobile checks at 390/320px and dark mode. Synthetic checks covered
positive/negative advance, native opportunity prefill, cancel preserving message, create+advance,
save failure retaining the edited form, and dirty cancellation. No real messages or opportunities
were created during verification. Local 5175/8083 retained; only Whatsapping runtime classes updated.

## Campaign result table and Sales opportunity presence — 2026-10-26

The list remains one row per campaign. Contacted counts distinct recipient IDs with an explicit
SENT event; positive/negative counts distinct IDs with their corresponding audited result. These
are independent measures, not disjoint totals. Repeated sends to the same recipient count once.
The result selector filters campaigns with at least one matching result before pagination. Its
quantities count campaigns under the current search/status/owner filters and ignore the result
selector itself; table cells count contacts. Result ordering is server-owned.

Sales owns the read-only SalesOpportunityPresenceReadService projection. It accepts the already
revalidated actor and at most 200 campaign IDs and joins the tenant-scoped Whatsapping audience to
non-deleted Sales opportunities of the same company and contact. Only crm.leads readers receive
counts. The projection reveals only distinct-contact counts, no opportunity details or monetary
fields; no access is represented as null and shown as Sin acceso a Oportunidades, never zero.
Contactos con oportunidad includes pre-existing and closed non-deleted opportunities; it does not
claim they originated in this campaign. Multiple opportunities for one contact count once. This
read does not create, link, alter or backfill any business record and needs no migration.

Desktop row actions follow Frontend OS 15.7: the neutral IndiceTableActionGroup, 36px square icon
buttons, 116px actions column for two actions, localized labels/tooltips and visible keyboard
focus. Phone controls are 44px. The open action precedes due-follow-up access; the latter is
disabled with a reason when no follow-up is due. Mobile cards show the same result measures and
owner-native actions. Existing drafts, campaign work actions, message handoff, routes and recipient
selection semantics are unchanged.

Verification: 21 isolated integration tests and 42 frontend regressions, TypeScript/build, diff
checks and synthetic desktop/phone/dark-mode QA passed. Tests cover distinct counts, result
filtering before pagination, non-distorted selector quantities, ordering, opportunity permissions,
company isolation, soft deletion, and multiple opportunities per contact. No real messages or
records were created for testing. Local 5175/8083 retained; previous runtime backed up.


## Campaign count contact navigation — 2026-10-26

The four result counts in each desktop row and mobile card open that campaign with CONTACTED,
POSITIVE, NEGATIVE or OPPORTUNITY selected through the existing recipients query parameter.
Zero counts are disabled; opportunity counts remain unavailable without crm.leads read access.
The workspace selector exposes the same groups and counts, including historical terminal contacts.

Detail adds resultContacts with distinct contact IDs computed from the full tenant/campaign-scoped
SENT, REPLY_POSITIVE and REPLY_NEGATIVE history, independently of the recent activity cap. Sales
owns the authorized opportunity contact-ID projection with the same same-company, non-deleted
and distinct-contact semantics as the table count. Unauthorized opportunity IDs are null. These
lists contain no opportunity fields, amounts or new persisted links. There is no schema change.

Selecting a group while working changes only the view: current selection and unsaved message,
notes and follow-up date remain. Existing dirty navigation confirmation protects changing contact
or leaving. Invalid views fall back to Pending; absent/unauthorized projections never infer matches
from recent events. Back aborts pending detail loads and refreshes the list on route change, avoiding
a stale refresh reopening the campaign. Read navigation never activates a campaign or sends.

Verification: 22 isolated backend integration tests and 46 frontend regressions passed, plus
TypeScript, production build and diff checks. Synthetic desktop and 390/320px dark-mode checks
covered all four result links, correct contact selection, one-click return to the table, retained
message/note drafts on filter changes and canceled dirty navigation. The backend test includes
more than 100 later activities, another campaign, opportunity permission revocation and company
isolation. Local 5175/8083 retained with a backed-up runtime overlay; no real messages or business
records were created for verification.


## Existing opportunity access per contact — 2026-10-26

The Sales-owned campaign projection now supplies minimal authorized opportunity references
(contact ID, opportunity ID, assigned flow, commercial code and name). Detail adds opportunities;
null means no crm.leads access and an empty list means an authorized absence. Tenant and audience
joins, soft deletion, existing/closed opportunity inclusion and distinct contact counts retain the
previous contract. No amounts, opportunity notes or other private detail fields are projected.
There is no migration or new cross-owner write.

The contact queue and selected contact show opportunity presence. An existing record replaces
Create opportunity with Open opportunity; multiple records use the native dropdown to choose one.
Links open the existing /sales/leads?opportunity=...&flow=... owner detail in another tab. This keeps
the campaign mounted and leaves selection, personalized message, notes and dates untouched.
Unknown/unauthorized presence never enables creation as if there were no existing opportunity.
Before opening a new create form, a read rechecks presence and updates only the opportunity
projection, preserving recipient versions and unsaved inputs. This is a workflow duplicate guard,
not a new Sales-wide one-opportunity-per-contact invariant; Sales can retain multiple opportunities.
A confirmed creation returns its reference immediately to the mounted workspace, including when
the subsequent campaign-result operation must be retried. The native form, manual outcomes and
advance behavior remain authoritative.

Verification: 22 isolated backend integration tests and 50 frontend regressions passed. Tests cover
multiple references, company and campaign isolation, soft deletion, permission revocation, native
flow URLs and cache behavior. TypeScript, production build and diff checks passed. Synthetic UI QA
covered one/multiple opportunity actions, the another-tab URL, retained message/note drafts,
pre-create detection of a newly added opportunity, and native creation/advance/revisit without a
duplicate create action. Desktop, 390px and 320px dark-mode layouts were checked. Only memory and
isolated database fixtures were used; no real messages or business records were created. Local
5175/8083 remain active with the prior runtime preserved.


## Return from opportunity review — 2026-10-27

An explicit Open opportunity link arms a one-shot, visible focus/visibility return read through the
existing campaign GET. Ordinary focus does not fetch. Duplicate browser events coalesce; a busy
work action, open creation modal or pending confirmation defers the return until available.
Unmount or an authenticated workspace remount aborts the pending read and rejects late results.
A failed read retains the last projection, selection and all mounted inputs, with a localized Retry
that performs the same safe read without requiring another opportunity tab.

A successful return refreshes only the opportunity owner references/presence counts and the
campaign audience's contact identity/eligibility. Recipient message, step, notes, next-action date,
state and version baselines remain unchanged, so effects do not replace any mounted message,
note/date draft or per-step message cache. The current contact, section, search and filters stay
selected. Normal explicit Refresh and mutations retain their existing version/dirty semantics.
The authoritative opportunity projection supersedes locally confirmed creation references, so
edited names/flows, removed opportunities and permission loss cannot be hidden by stale cache.
Null access remains distinct from an authorized empty list. No endpoint, backend, permission,
schema, automatic sending or cross-owner mutation is added.

Verification: 58 frontend regressions, TypeScript, production build and diff checks passed.
Deterministic lifecycle tests cover unarmed/duplicate focus, hidden and busy deferral, current
callback state, retry/rearm and abort on unmount. Projection tests cover preserved operational
baselines, updated names/flows, distinct counts, deletion, permission loss and rejected wrong-scope
or incomplete responses. Synthetic browser QA at 390px, 320px dark mode and desktop confirmed
updated contact name/phone and opportunity flow URL, unchanged selected contact, unsaved message,
note and date; failure/retry keeps drafts even when the message continues to be edited. An ordinary
focus performs no further read, and a removed opportunity changes to Sin oportunidad. No real
messages or business records were changed; the existing 5175/8083 processes were retained.


## Opportunity name and current stage — 2026-10-27

The Sales-owned opportunity reference adds a nullable stage projection (key, label and factory
label flag). Reads join only the current assigned flow's tenant-qualified position and stage.
Retained positions in another flow cannot override it. A legacy opportunity without a position
may resolve its existing stage key against that same assigned flow, with the established Sales
collation compatibility. Unresolved stages remain null; this read does not initialize flows,
backfill positions or change any campaign/opportunity record. Existing tenant, crm.leads, audience
and soft-deletion checks continue to gate the whole reference projection.

Each contact queue row and the selected-contact summary show every linked opportunity's name and
stage. The compact summary reuses Sales stage translations for factory stages and preserves
custom-flow labels exactly. Missing metadata displays Stage unavailable instead of guessing a
stage. Multiple opportunities remain separate, with wrapping names/stages and native neutral
pills in phone/dark layouts. Existing Open/Create actions, counts, selection, manual outcomes,
message/note/date drafts and the automatic return read remain unchanged. A return read updates
name and stage together without replacing draft baselines. No new modal, endpoint or migration.

Verification: 23 isolated backend integration tests and 61 frontend regressions passed, plus
TypeScript, production build and diff checks. Coverage includes authoritative assigned positions,
retained old-flow positions, custom and factory labels, legacy fallback, unknown stages, tenant
isolation and permission loss. Synthetic desktop/390px/320px dark-mode QA covered multiple and
long labels and accessible queue text. A return changed Proposal to Negotiation while preserving
the personalized message, unsaved note/date and selected contact. No real messages or business
records were changed for verification. Local 5175/8083 retained; runtime classes were updated with
the previous application preserved for rollback.


## Opportunity stage contact filter — 2026-10-27

The campaign work filter bar adds an independent Opportunity stage selector through the native
Sales filter controls. Its quantities count distinct audience contacts under the current search
and contact view, excluding the selected stage itself. Several opportunities in the same stage
count a contact once; one contact can belong to several stages. Stages with the same displayed
business name group across flows, using the existing factory translations and preserving custom
stage labels. An authorized absence is separate from an existing opportunity with unavailable
stage metadata. Without the authorized opportunity projection the stage selector is hidden and
never infers absence.

The stage catalog comes from the whole authorized audience, so options remain visible with zero
matches when search or contact view narrows the queue. An owner return updates stage membership
and quantities; only a stage that no longer exists in the catalog is cleared. The selected contact,
section, search, message cache, unsaved personalized message, notes and next-action date retain
their existing dirty and navigation semantics. The current edited contact can remain outside the
matching queue with the established warning. The filter stacks on phones; long selected names
truncate within the native trigger while the dropdown shows their full text and count.

Verification: 68 frontend regressions, TypeScript, production build and diff checks passed.
Synthetic browser QA covered desktop, 390px and 320px dark mode, multiple opportunities per
contact, combined search/view/stage counts, long stage names, dirty navigation cancellation and
an opportunity return changing stage and quantities while retaining message/note/date drafts.
No backend/API/schema/permission change, real message or business-record mutation was required.
The existing 5175/8083 processes remain active without a restart or deployment.
