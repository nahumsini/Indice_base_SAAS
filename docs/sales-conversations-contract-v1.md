# Sales Conversations — official shared WhatsApp inbox

Status: local implementation verified with synthetic fixtures; real Meta activation incomplete and disabled. Owner: Sales/CRM. Decision: user attachment
“PROMPT MAESTRO…”, 2026-10-22. Base da7e8bf36edc978799768a53b9dddfcccf4ea36a;
work branch codex/whatsapp-shared-inbox-20261022 in an isolated worktree. Existing uncommitted
Mailing/Email/Ideas Board work is retained as the baseline; it is not part of this feature.

## Authority and rollout boundary

One company owns one operational WhatsApp number. Connection history is retained, provider phone
IDs cannot belong to two tenants in this environment, jobs/messages bind immutable connection IDs.
No automatic number replacement, CRM creation, bulk campaign, automation, billing or external read
marking. Human-only direct Cloud API adapter; existing assisted Whatsapping remains manual.
UI, ingress, worker and actual outbound flags are separate and off by default. No production or
functional database migration, shared-service restart, push/merge, real OAuth, number connection,
provider upload, message or billing action is authorized by this implementation task.

## Increment plan and permission matrix

A: owner contracts and current API inventory. B: additive schema, closed native tab permissions,
explicit connection grants, signed durable inbox and two-tenant tests. C: immutable timeline,
atomic assignment, notes, outbox and UNKNOWN crash policy. D: owner CRM/Tasks ports, private bounded
media, current-access notifications/reconciliation, disabled real onboarding. E: fixture browser,
concurrency/fault tests, native regressions and operational runbook. Evidence is recorded only after
execution. Future surfaces must not appear functional merely because a fixture renders them.

Native crm.conversations is distinct from crm.contacts; crm.conversations_manage gates configuration.
The migration explicitly denies both for existing memberships/invitations (user decision replaces
the historical default-enable rule for this private channel). Session, active company/membership,
CRM entitlement, tab and organizational scope must all pass. Public demo and delegated consultation
cannot read/operate this inbox. Management does not imply message reading. Channel capabilities
are additional restrictions, not another RBAC: READ_OWN, TAKE, READ_ALL, REPLY, TRANSFER, RESOLVE,
NOTE, LINK, TASK. READ_ALL is explicitly granted; a role name never confers it. Taking includes
eligible unassigned chats; replies require current ownership. Admins delegate only capabilities
and scope they hold. First channel grant (or recovery when all grants are inactive) is an explicit, audited self-bootstrap by its scoped administrator with
both native tabs; never seeded by migration or connection creation.

Scope uses the native authenticated company membership's work-profile assignment. Connection
routing scope is fixed at configuration, and a grant captures the current assignment; a subsequent
assignment change invalidates that grant until explicitly renewed. A unit/business actor cannot
read a corporate/unassigned connection or another unit's history. Missing or inconsistent authority
fails closed. Transfer changes chat membership only, not CRM seller, unit, task or opportunity stage.

## Persistence and failure semantics

Tenant-qualified keys/FKs, bounded queries and aggregate locks apply throughout. Commands bind a
UUID key and canonical fingerprint to actor membership; replay returns the original receipt and
changed-content replay conflicts. Claims also compare expected version and NULL assignee, one
winner. Notes use a separate table/endpoint and never enter provider transport payloads.

Provider HMAC verifies original bounded bytes before parsing. Routing verifies configured app,
WABA and phone ID; unknown numbers cannot create companies/connections. Durable inbox commits
before acknowledgement. Leases/fencing protect worker control mutations, while immutable external
attempt evidence is accepted even after a lease or author permission changes. SUBMITTING expiry,
ambiguous API response or uncertain network outcome become UNKNOWN and cannot automatically send
again. API acceptance is not delivery/read. Status evidence is append-only, may precede acceptance,
and never regresses read/delivered facts. Only inbound customer timestamps open/reset 24h window;
queue and dispatch revalidate it. No approved template means free text outside the window is blocked.
Opening a chat changes internal read state only, never a Meta read receipt.

No destructive retention job or historical import is authorized. Raw inbox, encrypted credentials,
media and backups require an owner retention decision before pilot. No claim of antivirus scanning,
instant presign revocation, universal historical import, exactly-once external transport, provider
free pricing or horizontal session scalability. One backend replica remains required.

## Official-source verification — 2026-10-22

- https://whatsappbusiness.com/policy/ (updated 2026-09-23): each customer message resets the 24h
  service window; outside it approved templates only; opt-in/opt-out must be respected.
- https://www.postman.com/meta/whatsapp-business-platform/collection/wlk6lh4/whatsapp-cloud-api
  and /folder/o48mro7/messages: base messaging/management permissions, portfolio permission only
  when needed; server messages endpoint and WAMID-correlated webhook status. Older examples do
  not establish the current Graph version or token lifetime for SaaS onboarding.
- https://github.com/fbsamples/business-messaging-sample-tech-provider-app: official reference
  distinguishes Embedded Signup, Tech Provider configuration, business verification and App Review.
- https://whatsappbusiness.com/developers/developer-hub/,
  https://whatsappbusiness.com/partners/become-a-partner/ and
  https://whatsappbusiness.com/resources/faq/ reviewed; pricing is provider policy, not Indice billing.
- https://whatsappbusiness.com/products/platform-pricing/: provider category/market pricing exists;
  no tariff, subsidy or universal free-service promise is implemented.
- Meta technical pages for webhook verification, Tech Provider setup, App Review, Embedded Signup,
  third-party onboarding and Business App coexistence returned 429. Detailed eligibility, current
  Graph/signup versions, token lifecycle, coexistence and onboarding activation remain unverified;
  configuration/real activation must remain disabled until the pilot checklist has evidence.

## Runtime and owner map

| Surface | Owner / contract |
| --- | --- |
| `/sales/conversations`, `/sales/whatsapp-settings` | Active Sales runtime; separate lazy workspaces, no seven-collection CRM preload |
| `/api/v1/sales/conversations` | Session + CSRF for mutations; list, timeline/change cursor, stable keyset history, explicit commands, separate messages/notes |
| `/{conversation}/crm`, links/create-contact/create-opportunity | SalesConversationOwnerBridge → SalesConversationCrmContract → native SalesService/authoritative flows |
| `/{conversation}/tasks` | ProcessTaskSalesContract → native Tasks with explicit assignee/date and current assignment/receiver permissions |
| `/{conversation}/attachments` | Private staged upload/finalize + reauthorized proxy; native storage/quota owner ports |
| `/api/v1/sales/whatsapp/connections` | Scoped manager setup, candidates, grants, session-bound onboarding, local suspend/disconnect, audited dead-inbox redrive and metrics |
| `/api/public/sales/whatsapp/webhook` | Explicit public alternate trust: bounded raw HMAC, configured app/WABA/phone route, durable encrypted inbox before acknowledgement |

V348 adds connections, members, conversations, messages, notes, append-only events/statuses,
command receipts, inbox, outbox/attempt evidence, reads and sanitized rejection hashes. V349 adds
native task origins. V350 adds private attachment state, notification intents and explicit customer
opt-out. V351 adds session-bound onboarding, portfolio metadata, prior-owner/status/correlation audit
and connection-owned command receipts. Tenant-qualified relationships and SQL are mandatory.
`operational_slot` unique per company and `(app_id,phone_number_id)` unique across tenants enforce
one v1 number; replacement/reparenting is rejected. Original number snapshots are rechecked before
send. Old signed receipts stay bound to their original connection even after local disconnect.

Unassigned history is visible only with READ_OWN+TAKE, even for a READ_ALL supervisor. READ_ALL
applies to assigned history in the permitted connection scope. Channel revocation, native tab loss,
HR/Config Center baja and work-profile scope changes deny access immediately and reconcile ownership,
queues and generic notifications. Admin without a channel read grant has configuration only.

Private files: one JPEG/PNG≤4 MiB or PDF≤8 MiB, caption≤1,000 chars. Signature/container/dimension,
active-PDF, metadata and SHA-256 checks are format controls, **not antivirus**. Staging is copied to an
immutable private key before ready; inbound commits require the current lease/fence. Reads recheck
current access and hashes. Provider URLs are server-only HTTPS allowlisted origins without redirects;
byte and total-time limits apply. Storage cannot expand/purchase capacity through this owner port;
reservation and commit both fail closed on insufficient/missing existing quota. Only expired staging
is cleaned. Ready/sent files and business records are retained pending an approved policy.

Company phone exclusions are shared through the existing Whatsapping owner port. Inbound customer
messages establish the permitted reply context; opt-out blocks enqueue and dispatch. No campaign
list/local template proves consent or Meta approval. Explicit OPT_OUT also prevents manual assisted
campaigns through their existing exclusion contract. No new campaign/automation/AI access is added.

Notifications are transactional durable intents, current-access scoped, generic and publish-once;
dismissing/reading/resolving does not resurrect an old notice. Polling is visible-tab ~3s with backoff
up to30s, immediate bounded cursor catch-up, and auth/tenant cache reset. Older history does not
advance the receipt cursor. Drafts/files stay in memory and survive conflict/network errors; retry
keeps intent identity after a lost acknowledgement. Deliberate repeat of an UNKNOWN message warns
of possible duplication. No localStorage body/token cache is introduced.

Onboarding state is 256-bit random, stored as a hash, bound to session+company+membership+connection,
expires in10min and is claimed once before code exchange. Backend asset verification is an explicit
port tested with fixtures. `WhatsAppDisabledOnboardingGateway` remains the only production bean;
real signup integration and its activation are **incomplete** pending official verification and
subsequent authorization. Setting a flag or saving a token cannot mark a real number connected.
Reconnect may not replace its verified number/WABA/app and never restores revoked channel grants.
Local disconnect is distinct from provider-side revocation; history and started-attempt evidence stay.

## Acceptance evidence — local only, 2026-10-22

Migrations V348–V351 ran only in the verified tmpfs MySQL container on127.0.0.1:13319,
`indice_test_db`, through the guarded launcher. No persistent APPTEST/functional/production database,
service, number, real message, real file upload, remote branch, PR or billing setting changed.

- Backend:208 tests across21 selected suites passed (42 new integration flows,3 protection/file-policy,
  1 local HTTP boundary test,2 migration uniqueness, and native Whatsapping/Messaging/SellerWorkspace/
  flows/Tasks/storage/notifications/tab regression suites). Includes Spring/Flyway startup, two tenants,
  signed multi-entry routing, DB-failure rollback, duplicate100x,50 claims (one winner/49 conflicts),
  two dispatch workers, early/out-of-order receipts, expired SUBMITTING/late WAMID, UNKNOWN no retry,
  explicit/idempotent CRM/Tasks, private files/fences/quota, native HR deletion/termination and Config Center baja paths and session-bound
  fixture onboarding. Full repository backend suite was not run; selected native suites are the scope
  of this evidence.
- Frontend: TypeScript and production Vite build passed;95 selected model/native regressions passed.
  Native-component browser fixture passed conflict/network draft preservation, same-key lost-ack
  retry, separate private note, evidence-only receipts, old-message polling, UNKNOWN duplicate warning,
  owner CRM/Tasks forms, private upload, member grants, guarded navigation, tenant clear, mobile/dark
  and rejected external/unmocked traffic. Runtime locales: es-MX/es-CO/en-US/en-CA/fr-CA/pt-BR/ko-CA/zh-CA.
- Configuration:5 read-only tests and inert environment example validation passed. Full deployment
  preflight and real Meta integration tests were not run because those operations are outside this
  task's authorization. Existing build emits the large-chunk warning; no dependency or bundle rewrite.

Operational steps, limitations, backup/restore/rollback and the exact next authorized increment:
[WhatsApp runbook](../deployment/whatsapp-conversations.md). This is not production certification.


## Concurrent local integration blocker

At handoff, the original `codex/continuacion-20261022` worktree had concurrent Scheduling changes,
including `V348__scheduling_multiple_public_agendas.sql`. This isolated branch reserved and tested
`V348__sales_conversations_foundation.sql` before that appeared. Numbering is unique **within this
branch**, not across the combined future integration. Do not apply both V348 files, rename an applied
migration, edit its checksum, or run Flyway repair. Before any integration/persistent migration, the
release owner must establish which version (if either) has entered a persistent schema and approve
the forward-only integration strategy. Both source files remain untouched. Concurrent Scheduling
changes were not merged or tested with this feature. The feature patch is relative to the captured
starting dirty baseline; it excludes those later Scheduling changes.
