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

- Title bar: New campaign, Templates and Contact lists; Refresh is in Actions.
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
