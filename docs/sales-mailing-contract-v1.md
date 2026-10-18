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
