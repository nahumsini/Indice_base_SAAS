# Sales Mailing — draft pilot

Status: local pilot, 2026-10-17. Owner: Sales (`crm`). Runtime:
`react/src/app/BasicModules/Sales/Mailing`, backend `sales.mailing`.

## Authorized first increment

Mailing prepares durable email campaign drafts. It does not send, schedule, connect a sender,
verify marketing consent, or claim delivery. Whatsapping remains its separate initial workspace.
The existing transaction-email services are unchanged. No new public endpoint is introduced.

`/sales/mailing` requires the explicit `crm.mailing` tab assignment and CRM access. Existing
`crm.contacts` assignments do not automatically grant Mailing. Root/superadmin retain their native
access rules. Campaign listing requires Mailing; detail and audience selection also require
`crm.contacts`, because they disclose contact information. Editing additionally requires a current
company administrator and mutation entitlement. Browser writes require CSRF. No platform role is
provisioned by this feature. Local synthetic administrators are assigned the new tab explicitly.

## Frontend flow

Use the existing Sales shell, coral title bar, shared filters/table/pagination and recoverable
workspace-memory contract. The list contains one row per campaign with name, subject, draft state,
unique valid-address count and localized update time. Remote search is debounced; list pagination
and sorting are server-owned. New and edit use the **Modal Wizard Índice**, because details,
audience, content and final review are dependent stages. Saving an incomplete draft is allowed
from any step after entering its name. Unsaved close replaces the same modal with confirmation;
no nested dialog is introduced. Templates are explicit, local choices; the initial template is a
plain-text welcome. Preview replaces `{{name}}` with a sample selected contact. Text is rendered as
text, never executable HTML. No tracking or remote image is inserted.

Filters, sorting and list position use `useWorkspaceNavigationMemory`; content and recipients are
business state persisted by the backend, never stored in browser navigation memory. Editing keeps
values across Back/Continue. Leaving without saving requires confirmation. Saving closes the
editor and refreshes persisted data. A stale edit remains open with its content and an instruction
to reload; it never silently overwrites another editor.

## Data and endpoints

V313 adds campaign drafts, recipient selections and content-free save audit entries. Campaign IDs
are client-generated UUIDs, so retrying creation cannot create another record. Each save uses an
optimistic version, a tenant lock and one transaction including recipients and audit. Stale retries
return 409, including a lost successful response, and never duplicate or overwrite a campaign.
Tenant/contact ownership and active contact status are validated before mutation. UUID collisions
cannot expose another company's campaign. All read and write queries carry company scope.

- `GET /api/v1/mailing/campaigns`: paginated list, search, whitelisted sort, current edit capability.
- `GET /api/v1/mailing/campaigns/{id}`: tenant-owned draft and selected contacts.
- `GET /api/v1/mailing/contacts`: paginated active Sales contact directory for selection.
- `PUT /api/v1/mailing/campaigns/{id}`: create version 0 or update the expected current version.

The pilot supports up to 500 selected contacts per campaign and 20,000 body characters. The email
count excludes inactive/deleted contacts, malformed addresses and case-insensitive duplicates.
This count is **not** marketing eligibility, consent proof, deliverability, or a send promise. Drafts
may contain selected contacts without valid addresses so operators can review and correct them.
There is no delete, send, schedule, open-rate, delivery-state or provider-webhook API in this slice.

## Next increments and acceptance

Before sending: approved tenant sender/provider configuration, separate send authority, consent and
suppression ownership, unsubscribe trust mechanism, queue/outbox and retry identity, per-recipient
outcomes, signed/deduplicated provider events, limits and explicit launch review. Do not reuse the
platform authentication sender as a tenant bulk sender implicitly.

Acceptance covers persist/reopen/reload, selected audience, plain-text preview, dirty close,
permission denial, CSRF, cross-company IDs/contacts, stale edits, duplicate-address counts and
atomic rejection. Run migration uniqueness and Flyway startup on `indice_test_db`, focused backend
integration tests, TypeScript/build and the real local browser flow. Functional databases must not
be used for automated integration tests.

## Local verification — 2026-10-17

- Clean Maven run: MailingIntegrationTest (5) and MigrationVersionUniquenessTest (2) passed.
  Flyway applied V313 successfully on the isolated `indice_test_db`; the local application then
  upgraded its own functional database without touching the older local databases.
- Existing Sales UI (34) and workflow (30) regressions passed. TypeScript and Vite build passed;
  Vite retains its existing warning about chunks above 600 kB.
- Real Chrome flow: created “Horizonte — Bienvenida de prueba”, selected all 20 synthetic contacts,
  applied the welcome template, reviewed name substitution, saved, reloaded and reopened the draft.
  Unsaved edits prompted confirmation; discarding them retained the saved campaign.
- No email was sent, no sender/provider was connected and no campaign was scheduled. Existing
  Sales operations and Whatsapping behavior were preserved. An initial test attempt was invalidated
  by concurrent compiler output; the subsequent clean, sequential backend run passed.

## Template management — 2026-10-17

The Mailing title bar adds **Templates**, alongside Refresh and New campaign: three direct
eligible actions, with the existing primary campaign action preserved. The button opens an
**Operational Workspace Modal** for a paginated, sortable template catalog, search, active/archive
filter and selected-record preview. New/edit replace the same frame with a **Standard Form Modal**;
archive and unsaved-close confirmations replace that frame as **Confirmation Modals**. No nested
modal or additional modal engine is used. All copy follows the eight existing runtime locales.

V314 adds tenant-owned templates and content-free audit history. A template has name, subject,
preview text and plain-text body, an ACTIVE/ARCHIVED status and an optimistic version. Management
uses `crm.mailing`, current administrator authority, active CRM entitlement and CSRF. Reading the
template catalog requires Mailing but does not require customer-directory access. All endpoints
are protected under `/api/v1/mailing/templates`; no sending or public surface is introduced.

- GET `/templates`: paginated search/status/sort and current management capability.
- GET `/templates/{id}`: tenant-owned template detail, including archived content.
- PUT `/templates/{id}`: create with version 0 or edit the expected version.
- POST `/templates/{id}/status`: archive/restore with the expected version.

Mutations lock the company, recheck mutation entitlement and save content/status plus audit in one
transaction. Client-generated UUIDs prevent duplicate records on creation retries; stale saves and
status transitions return 409. There is no hard delete. Archive removes a template from new-campaign
selection; restoration makes it available again. Neither operation changes saved campaign content.

The campaign content step searches active saved templates, previews one, and offers an explicit
**Apply template** action with replacement disclosure. Applying rereads the template and checks its
active status, then copies subject, preview text and body into the draft. Sender, audience and
other draft fields are preserved. The initial welcome text remains a separate built-in option.
Large catalogs are searchable; the picker discloses its 100-result limit rather than hiding matches.
`{{name}}` is displayed with a sample customer in preview; content is never executed as HTML.

Template verification: the clean isolated Maven run passed 8 Mailing integration tests plus 2
migration-uniqueness tests. V314 started successfully on both the isolated test database and the
local application database. Sales UI (34), Sales workflow (30), TypeScript and production build
passed; the existing large-chunk warning remains. Real Chrome verification created and previewed
“Bienvenida Horizonte — Demo”, archived/restored it, reopened the catalog and explicitly applied
its saved content inside the campaign editor. The campaign's 20 selected contacts were retained;
the trial application was discarded, preserving its original persisted content. No email was sent.

## Joint Email remodeling and sender selection — 2026-10-17

The [Email/Mailing integration contract](email-mailing-integration-contract-v1.md) extends this
pilot with private account configuration and connection checks owned by Email, an optional sender
reference on the campaign, and save/configure/return navigation. It supersedes the earlier statement
that no sender can be connected; campaign dispatch and scheduling remain outside this increment.
Templates, recipients, optimistic concurrency, draft permissions and transaction-email behavior
remain unchanged. The title bar now shows Email accounts, Templates and New campaign, with Refresh
in the shared Actions menu. The template workspace preview becomes a responsive side panel and
modal cancel/back actions use the shared left footer position.


## Approved delivery extension — 2026-10-17

The user authorized completing SMTP/IMAP and Sales Mailing together. The latest section of
[email-mailing-integration-contract-v1.md](email-mailing-integration-contract-v1.md) supersedes this
initial contract's draft-only restriction. Draft routes, ownership, template behavior and scope stay
compatible; non-DRAFT campaigns are immutable to draft editing. Delivery adds native mailing_send
authorization, verified sender review, explicit consent evidence, recipient snapshots, scheduling,
provider outcomes, suppression and a capability-only public unsubscribe page.

## Contact audiences and campaign history — 2026-10-18

Approved scope: make the existing Sales contact directory usable for campaign audiences, reusable
lists and read-only contact campaign history. This does not authorize a campaign launch, change
SMTP quotas, grant consent, or add automated email sequences.

- Sales remains owner of contact identity. `/api/v1/mailing/audience` projects active,
  non-deleted contacts from the authenticated company: person, company, email, salesperson and
  sending eligibility. Search includes person, company and email. Exact source, salesperson, tag
  and eligibility filters compose with server pagination and sorting. Source/tag/owner choices
  come from that same tenant directory. The legacy `/contacts` API remains compatible.
- `GET /audience/selection` selects all matching results, independent of pagination. More than
  500 results fails explicitly; the client merges by contact ID, preserving previous selections
  and refusing a union larger than 500. No silent truncation occurs.
- `POST /audience/preview` accepts at most 500 owned contact IDs. It resolves current identities,
  email validity, normalized-email duplicates, recorded consent and suppressions. Missing consent
  is separate from excluded recipients. This read-only POST uses session/CSRF protection and
  never registers consent. Launch still rechecks its existing authoritative review.
- `GET /audience/options`, `/audience/lists`, `/audience/lists/{id}` and
  `/contacts/{id}/history` require both `crm.mailing` and `crm.contacts` plus CRM module access.
  New list `PUT` and archive `POST` additionally require the existing Mailing manager role,
  mutation entitlement and CSRF. They do not require or grant `crm.mailing_send`.
- V329 adds company-owned saved lists, membership and audit events. Lists store explicit contact
  membership, not dynamic filter rules. Updates use optimistic versions; stable client UUIDs
  prevent duplicate creation on retry. Archive is soft, retains membership/audit and does not
  alter campaign recipients. On reuse, inactive/deleted members are omitted with a visible count;
  other exclusions remain visible in recipient review. Membership changes are transactional.
- `{{name}}` now resolves to the trimmed contact person, falling back to company name. Review
  digests include the resolved name so a changed name invalidates stale launch confirmation.
  Already-launched campaigns retain their original immutable names and email snapshots.
- Contact history is a paginated read-only projection of draft participation and actual delivery
  snapshots. It distinguishes draft, excluded-at-launch, pending, SMTP accepted, failed and unknown;
  it never claims inbox delivery, opening or engagement. History follows contact ID, not a join on
  the contact's currently edited email address. No message body or credentials are exposed.

UI classification: retain the existing four-step **Modal Wizard Índice** (details, recipients,
content, review). The recipient stage uses the shared filter bar, progressive filters, canonical
sortable/resizable table and pagination. Saved-list editing and archive confirmation are inline
sections inside that existing frame, not stacked dialogs. The existing contact **Standard Form
Modal** gains a lazy, permission-gated history disclosure. New copy supports all eight product
locales. Recipient selection and message content are never stored in browser workspace memory.

Verification for this extension: 27 distinct backend regressions (7 audience, 8 existing draft/template,
10 delivery and 2 migration checks) passed using only `indice_test_db`; Flyway applied V329 there.
57 focused frontend regressions, TypeScript and production build passed. The existing >600 kB
bundle advisory remains. An isolated browser flow with synthetic contacts exercised cross-page
selection, sort directions, failed list save/retry, list reuse, personalized preview, draft save,
contact history, 390 px layout and dark-mode contrast; it rejects every send/test/launch request.
Local 8083 was restarted with only the validated Mailing classes and V329, preserving its prior
runtime for rollback and the ongoing unrelated work. Read-only authenticated checks resolved the
10 active local contacts, filters, lists, preview and history. No real campaign was launched and no
real email, consent or contact was created or changed by verification. The public HTTPS unsubscribe
gate and existing SMTP quotas continue to apply to actual campaign execution.


## Campaign operating workspace — 2026-10-19

Approved scope: surface the existing campaign engine as an operational Sales workspace. The tab
remains Mailing at `/sales/mailing`; the view title is localized “Email campaigns”. No automatic
multi-email sequences, new transport, delivery guarantees or open/click tracking are introduced.

- `GET /api/v1/mailing/workspace` is a protected, read-only CRM/Mailing projection using the same
  session, entitlement and tab boundary as the existing campaign listing. Contact access controls
  detail/list-management entry points and draft editing. Existing campaign endpoints remain compatible.
- Search and sender-account filters apply before aggregation; status is a facet over that scope.
  Summary counts cover all matching campaigns, not just the displayed page. `ATTENTION` means a
  failed/unconfirmed recipient or a recorded run error; it may overlap a completed campaign.
- Draft recipient numbers count selected contact IDs, without claiming validity or consent.
  Launched campaigns use immutable delivery rows. Processed counts include accepted, failed,
  unknown, suppressed and cancelled rows; pending/submitting remain outstanding. Acceptance is
  explicitly not proof of inbox delivery. Tenant scoping applies to each aggregated source.
- Sender options use Email's existing private-owner projection only. Accounts owned by others are
  not disclosed; a campaign's previously stored commercial sender name remains visible. No secrets,
  credential fields or mailbox contents enter the workspace projection.
- Search, status, sender, sort and pagination use existing company/user-scoped navigation memory.
  Running/scheduled campaigns refresh every 15 seconds while the page is visible and no editor is open.
- The title bar exposes recipient lists, templates and new campaign, with secondary administration
  in the final Actions overflow. The shared filter bar, status navigator, table, sorting, resizing,
  pagination, empty/retry states, dark mode and localized copy follow the Frontend OS.
- Row actions are state-aware: continue a draft, review a send, view progress or view results.
  A launched campaign never presents draft editing. The final wizard step adds Save and review send,
  passing the persisted campaign to the existing review modal. This action does not launch or test.
- Recipient lists also open as a standalone shared operational workspace. Loading a list there
  replaces the working selection; inside a campaign it retains the existing explicit merge behavior.
  Save, version checks, archive confirmation and campaign-independent list membership are preserved.
- Existing verified SMTP, consent, suppression, public HTTPS unsubscribe, recipient limit, quota,
  launch confirmation, scheduling and ambiguity rules continue to be enforced by the existing engine.

No schema migration is needed for this projection.

Verification: 31 distinct backend tests passed (6 workspace projection/access, 8 existing
campaign/template, 7 audience, 10 delivery) against `indice_test_db` with workers disabled and
mock transport for delivery. The 57 relevant frontend regressions, TypeScript and production build
passed. Both isolated browser flows passed: campaign workspace (facets, sorting, filter restoration,
draft-to-review handoff, standalone lists, immutable completed-campaign results, empty/error retry,
responsive and dark views) and the existing audience flow (selection, retries, reuse, personalization,
history). Browser traffic is mocked and rejects send/launch/control requests. Screenshots were
reviewed at desktop and mobile widths. No real messages were sent.

Local handoff: only the validated Mailing controller and workspace projection classes were added
to a copy of the currently running 8083 artifact. All unrelated runtime classes and resources were
preserved, and the previous artifact remains available for rollback. Authenticated read-only smoke
checks passed for the workspace, draft facet, cross-page summary and compatible legacy listing.
Public HTTPS unsubscribe remains unconfigured locally; campaign launch therefore remains blocked
by the existing engine. The production build retains its existing large-chunk warnings. Schema and
production deployment changes: N/A.

Files for this workspace change: `Mailing.tsx`, `workspaceApi.ts`, `workspaceCopy.ts`,
`components/CampaignWorkspaceTable.tsx`, `components/AudienceWorkspace.tsx`, and targeted extensions
to `CampaignEditor.tsx`, `RecipientPicker.tsx` and `AudienceLists.tsx`; backend
`MailingWorkspaceService.java` and `MailingController.java`; `MailingWorkspaceIntegrationTest.java`
and the `mailing-workspace` browser fixture/runner; this contract and the canonical frontend adoption.
Existing draft persistence, account privacy, send permissions, consent, quotas and delivery behavior
are preserved.

## Campaign editor refinement — 2026-10-19

Classification: retain the **Modal Wizard Índice** for the dependent details, audience, content and
review steps. The shared Sales frame, module-colored header/footer, stepper, validation and summary
remain the presentation foundation. No alternative modal engine, API or schema is introduced.

- The header names the editing action and current step, with one short instruction per step.
- Details group the internal campaign name separately from the sender account, displayed name and
  reply-to address. Field helpers explain what customers see. The account uses the shared select,
  and a compact SMTP status badge distinguishes verified, failed and untested connections.
  Loading, empty, unavailable-account and retry states retain the draft's captured identity.
- Controls use the Sales coral focus, neutral surfaces and consistent sizing. Sender identity fields
  share a row on desktop and stack on phones. Dark-mode contrast and short-viewport scrolling follow
  the existing modal system. New copy covers all eight supported locales.
- Continue is the final primary action before review. Saving an incomplete draft remains available
  after naming it. A nonempty malformed reply-to is now caught when continuing from Details as well
  as when saving. Errors identify and focus the affected field.
- Back/Continue retain the captured values. Declining an unsaved-close confirmation also retains
  the current audience search, because the wizard remains mounted inside the same hidden frame.
- Saving awaits the existing owner API and blocks duplicate submissions, close and conflicting edits.
  A recoverable failure retains the draft for retry; a version conflict locks editing. Configuring a
  sender still saves before navigation. Final Save and review send still opens the existing review
  flow only after persistence; it does not send, test or schedule mail.
- Final review uses the shared compact summary and a separate message preview. Plain-text rendering,
  contact personalization, recipient selection, private account ownership and send gates are unchanged.

Files: `components/CampaignEditor.tsx`, `components/CampaignEditorField.tsx`,
`components/CampaignSenderPicker.tsx`, presentation-only adjustments in `CampaignTemplatePicker.tsx`,
`editorCopy.ts`, the `mailing-editor` browser fixture/runner and this contract. The existing audience
browser fixture now stubs template listing explicitly instead of depending on beating its debounce.

Verification: focused editor browser checks cover field validation/focus, account failure/retry and
unavailability, identity retention, cancel recovery, draft saving, review/configuration handoffs,
pending-save locks, failure/retry, stale-version locking, read-only access and phone/dark/short views.
The existing audience and campaign-workspace browser regressions pass with mocked APIs. No real
emails or campaign mutations are used by these checks. TypeScript, production build and the 57
relevant frontend regressions pass. Screenshots were inspected in desktop, phone and dark layouts.
The build retains the pre-existing large-chunk warning. Backend/schema/deployment changes: N/A.


## Direct recipient selection — 2026-10-19

The user's explicit product decision removes the mandatory manual consent-registration step and makes
the delivery-review checkboxes control the campaign audience. This section supersedes older consent
prerequisites in the draft-pilot, audience and operating-workspace notes above and in the original
Email/Mailing delivery extension. It does not replace tenant, authorization, integrity or public-release
invariants.

- Delivery review selects all currently eligible recipients initially. **Seleccionar todos** toggles
  the entire campaign audience across pages, with an indeterminate state for a partial selection.
  Invalid, duplicate and unsubscribed contacts remain visible but cannot be selected for sending.
- The confirmation shows selected, unselected and excluded counts. The browser submits the exact
  `contactIds`; an explicit empty selection never falls back to sending everybody. The server verifies
  every selected ID against this campaign's current, company-scoped, eligible audience under its
  existing lock/version/digest checks before persisting any run. Replaying a launch returns the same
  immutable snapshot and cannot expand it.
- `Launch.contactIds` is additive and optional for existing clients: omitted/null uses all eligible
  campaign recipients. The current frontend always supplies its explicit selection. The existing
  preview field `consentRequired` remains for response compatibility and is zero under the new policy.
- READY means a valid, active contact whose normalized address is not suppressed or duplicated. Neither
  review, selection nor launch creates consent rows or evidence. Historical consent data and its owner
  endpoint remain for compatibility/audit, but are no longer prerequisites for dispatch. Unsubscribing
  creates a SUPPRESSED row when none exists (system recorder `0`, no consent evidence, null event actor),
  and preserves any existing historical evidence. The company lock prevents duplicate unsubscribe events.
- Unsubscribe suppression remains authoritative before launch and immediately before SMTP dispatch.
  The public HTTPS unsubscribe URL, footer, verified private sender, native send permission, CSRF,
  current tenant access, explicit final send confirmation, per-account quota, durable outbox and
  uncertain-delivery protections remain unchanged. No schema migration or contact-data backfill.
- API changes are limited to Mailing contracts, audience projection, recipient eligibility and launch
  selection. The Email transport, credentials, account configuration and other modules are unchanged.

Verification covers no-consent dispatch with a mocked transport, exact subsets, replay, empty/foreign/
invalid/duplicate/suppressed selection rejection, current unsubscribe enforcement, CSRF and native
send permission. Browser fixtures exercise cross-page bulk selection, confirmation/payload parity,
failed-launch retry, pending request protection, refreshed exclusions, public-URL gating, read-only
access, keyboard, mobile and dark mode. All browser addresses and transports are synthetic.
No real campaign launch or external email is part of this verification. Local functional launch still
requires a real public HTTPS unsubscribe address; the new selection policy does not fabricate one.


Validated locally: 35 focused backend integration cases on `indice_test_db` (including 14 delivery
cases), 57 frontend regressions, TypeScript and the production build, plus three isolated browser
flows (delivery selection, contact audiences and campaign workspace). The original unsubscribe test
exposed the missing-row assumption; it now passes without a prior consent row. No unresolved test
failures remain. The build still reports its existing chunk-size warning.

The local backend was updated with only the validated Mailing contracts/repository/service/audience
classes, retaining the prior runtime for rollback and all existing resources/migrations. Authenticated
read-only checks and the real browser review show 10 READY contacts and zero consent requirements.
Public HTTPS is still unconfigured, so production campaign submission was not exercised. Schema and
production deployment: N/A.

Files in this change: `CampaignDelivery.tsx`, `CampaignDeliveryTable.tsx`, `RecipientPicker.tsx`,
`deliveryApi.ts`, `deliveryCopy.ts`, `audienceCopy.ts`, `workspaceCopy.ts`; backend
`MailingDeliveryContracts`, `MailingDeliveryRepository`, `MailingDeliveryService`,
`MailingAudienceService`; delivery/audience integration coverage, the new `mailing-delivery` browser
fixture and flow, and updated audience/workspace fixtures. The frontend/backend canonical documents
and Email/Mailing owner contract adopt this product decision.


## Shared rich templates and Email consumption — 2026-10-22

Sales remains the owner of templates, audiences and campaign execution. Email's composer and
Preferences consume those same APIs; no parallel template store is introduced. V345 adds optional
`bodyHtml` to template/campaign details and writes, bounded at 500,000 characters. Lists omit the
body. The Email-owned sanitizer validates passive styles and embedded images; old clients that
leave plain text unchanged preserve HTML, while changing plain text without HTML clears it.
The shared editor/preview is presentation only and adds no permission authority.

Campaign copies retain formatting through saved template, campaign, explicit review and private
Email transport. `{{name}}`, preview text and unsubscribe/footer text are escaped before HTML
insertion. Launch validates expanded HTML for each selected recipient before creating delivery
work, including the footer/unsubscribe space, so oversized personalization cannot queue a
permanent retry. Plain text, immutable delivery ledger, owner-selected account, recipient scope,
suppression checks, send/schedule confirmation and idempotency remain unchanged.

## Reusable template files — 2026-10-22

The [Email/Mailing attachment extension](email-mailing-integration-contract-v1.md#persistent-templates-and-reusable-attachments--2026-10-22)
controls the current company-shared upload, template persistence and campaign snapshot contract.
V347 preserves verified files independently of later template edits/archive and adds optional
`attachmentIds` to template/campaign writes and attachment metadata to detail/review responses.
Omission preserves the set; an empty list removes it. Files are validated within current company,
permissions and the 10 MiB aggregate/five-file budget before a save mutates content. Delivery
reviews display the snapshot, and test/worker transport resolve only its immutable objects.
A physical file is counted once in company storage, regardless of recipient count. Detached
verified files remain retained and counted; deletion requires a separate retention decision.

Template saves with an optional stable `requestId` can be reconciled after a lost response without
creating duplicate templates, versions or audit records. Stale/different payloads still fail closed.
The editor adopts the saved server version, retains input on errors and locks saves while file or
inline-image preparation is active. No sending, scheduling, customer access or account authority
is granted by saving/uploading a template.


## 2026-10-26 — Mailing compatibility tune-up with current Email composition

Campaign editor keeps the four-step Sales wizard and shared rich editor. Preparing inline images now locks save, navigation and close independently from reusable-file transfers. Campaigns can complete shared-template placeholders through the Email-owned variable fields/resolver, preserving HTML, inline images and attachments without editing the template. `{{name}}` remains a per-recipient delivery token. Missing custom values can remain in a saved draft but block review-for-send, test and launch in the current UI until completed. Subject/preview/body bounds remain enforced; server permissions, snapshots, SMTP outcomes, consent, unsubscribe and worker contracts are unchanged. Failed review loading exposes Refresh without discarding draft/selection. Validation uses a disposable indice_test_db, mocked SMTP transport and a synthetic browser fixture; no real mail is sent.


## 2026-10-26 — Direct message typing in the Mailing editor

The rich message uses a non-label container. The editor already carries its accessible textbox name; wrapping it in a label incorrectly associated blank-surface clicks with its hidden inline-image input. Only Insert image invokes that picker. Blank drafting, template application, formatting and separate reusable attachments retain their existing handlers. A regression prevents enclosing the rich editor in a label again.


## 2026-10-26 — Explicit write/template choice in campaign content

The Content step starts with native coral IndiceWorkspaceNavigation views: Write from scratch (default) and Use a template. The subject/message remain editable in either view. Template controls are shown only on request and stay mounted so switching does not reset the preview/search or draft. Changing views never clears text or attachments; only the existing explicit Apply template replaces content. Localized helper copy explains this distinction. Applying a template locks owner navigation/save/close until completion, independently of inline image/file activity. Choice is transient UI state, not a new campaign field or persistence writer.


## 2026-10-26 — Recoverable delivery readiness

The delivery workspace distinguishes a missing sender from a selected account whose
SMTP verification is pending. Its account action uses the existing permission-gated
Email account route and campaign UUID handoff; Email continues to own verification,
credentials and transport. Missing-sender recovery reopens the persisted draft
through its authorized API. Leaving with delivery-only changes uses the existing
same-frame discard confirmation; no audience or footer is silently persisted.

The compact workspace shows sender/contact/postal details beside a bounded recipient
table on desktop and before it on phones. The footer explains the current blocking
prerequisite. Refresh re-reads sender verification and recipient eligibility while
preserving the current selection and footer. Pagination, column resizing, all-page
selection, suppression, verified SMTP, send permission, public HTTPS, required footer
and explicit final confirmation remain intact. This correction changes no backend,
API, schema or production configuration and does not send a campaign.


## 2026-10-26 — Content readiness before test and campaign delivery

Incomplete campaign drafts remain saveable. Progressing from Content to review or
saving for delivery review requires a nonblank subject and message; the editor
focuses the missing field and preserves the draft. The campaign name is separate
from the email subject. Delivery review blocks test and launch when its subject or
message is blank, explains the missing field and offers the existing authorized
persisted-draft handoff. Contact/postal details remain required for campaign launch,
not for a test email. The backend remains authoritative: its review combines preview
and message text, so the UI also translates a server `mailing_content_required`
response into a localized content correction with draft recovery. Known review,
SMTP, public-URL and invalid-recipient codes have safe localized messages; unknown
errors retain the generic fallback. Raw backend/provider messages are not displayed.
No send is triggered by recovery, refresh, saving or content validation.

## 2026-10-26 — Formatted delivery review and normal quota waits

The protected delivery review adds optional `bodyHtml`, produced through the same
Email-owned formatter used for campaign transport. Test and final launch previews
use the existing sandboxed `MailFormattedPreview`, with plain-text fallback for
older responses. Embedded images and formatting are visible before the explicit
send confirmation. Recipient personalization, review/version validation, immutable
snapshots, file references and transport authorization remain authoritative.

Workspace rows add `waitingForQuota`. An active RUNNING/SCHEDULED campaign whose last
error is `email_send_rate_limited` shows a localized normal-wait explanation rather
than being classified as requiring attention solely for that reason. Failed or
uncertain recipients and other run errors still require attention, including when
they coexist with a quota wait. Summary counts and the attention filter use the same
rule. Canonical campaign statuses are unchanged.

The existing limit remains 30 sends per rolling hour per account, shared with other
sends from that account. The worker's existing five-minute retry continues pending
deliveries when capacity becomes available; this correction neither increases the
limit nor restarts/replays accepted deliveries. No production campaign is changed by
this local correction. See
[validation evidence](validation/2026-10-26-mailing-inline-images-quota.md).
