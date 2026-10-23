# Official Sales WhatsApp — preparation and pilot runbook

Status: local implementation verified with synthetic fixtures; real activation blocked pending the
Meta adapter verification below. This file does not authorize a deployment, migration on a persistent
database, external credential change, provider upload, number connection or message. Follow
[deployment/README.md](README.md) and the [release security gate](../docs/indice-public-release-security-gate.md)
when those actions are separately authorized.

## Configuration and transport boundary

The backend properties are `app.sales-conversations.*`, mapped explicitly in application.properties
from `SALES_CONVERSATIONS_*`. All five switches default false:

| Switch | Effect |
| --- | --- |
| ENABLED | Authorized Sales inbox and mutations |
| INGRESS_ENABLED | Public HMAC webhook and inbound media transport |
| WORKER_ENABLED | Scheduled inbox, dispatch, reconciliation, media and notification processing |
| OUTBOUND_ENABLED | Server-side provider sends; requires a healthy verified connection |
| ONBOARDING_ENABLED | Session-bound onboarding logic; real gateway is currently unavailable |

Frontend navigation uses `VITE_SALES_CONVERSATIONS_ENABLED`, false by default. Frontend flags are
UX only. Do not enable real onboarding: `WhatsAppDisabledOnboardingGateway.configured()` returns
false, regardless of the environment switch. The fixture gateway is test-only. No token-entry form,
Facebook SDK, guessed Graph version or real signup URL is supplied as a substitute.

Server-only configuration: APP_ID, APP_SECRET, VERIFY_TOKEN, GRAPH_VERSION, ENCRYPTION_KEY,
KEY_VERSION and PREVIOUS_KEYS under the SALES_CONVERSATIONS prefix. Encryption is AES-256-GCM;
keys are Base64-encoded 32-byte random keys, independent of Email. App secret and webhook verify
secret must differ. Graph version is deliberately blank until verified against current official docs.
Do not place credentials in command arguments, repository files, browser storage, URLs or logs.
Use the protected deployment secret mechanism. Previous keys use `version:base64key` comma-separated
entries and decrypt only; new writes use the active version. Keep old keys available for encrypted
inbox/history/backups until an approved rotation/retention operation has re-encrypted or expired them.
Removing an old key prematurely makes its payloads unreadable. No destructive key rotation runs here.

Read-only validation, without DB/Flyway/network:

```sh
python3 deployment/scripts/check-whatsapp-conversations-config.py deployment/env/.env.example
python3 deployment/tests/test-whatsapp-conversations-config.py
```

The main preflight calls this validator, but the rest of preflight can run Flyway/tests/builds. Do
not run full preflight against an unverified destination. Compose mappings are prepared with safe
false defaults; no service was restarted by this change. Retain the single backend replica required
by the native servlet session architecture. Leases do not solve distributed browser sessions.

## Isolated local verification

Use a disposable mysql:8.4 container named `indice-whatsapp-isolated-test`, tmpfs `/var/lib/mysql`,
bound only to 127.0.0.1:13319, database `indice_test_db`, synthetic test-only user/password matching
the launcher. Do not reuse a functional database. `run-sales-conversations-isolated.py` verifies
image, running state, tmpfs, absence of a data volume, exact host binding and SELECT DATABASE()
before **every** Maven/Flyway-capable launch. It refuses any other destination. The container used
for this work was removed after verification; recreate only that disposable destination to rerun.

```sh
python3 deployment/tests/run-sales-conversations-isolated.py -q -Dtest=SalesConversationsIntegrationTest,WhatsAppSafetyRulesTest,WhatsAppHttpIOTest,MigrationVersionUniquenessTest test
cd react
npm run typecheck
npm run build
npm run test:sales-conversations
npm run test:sales-conversations-browser
```

Browser tests need Playwright and Chromium (or INDICE_PLAYWRIGHT_MODULE/INDICE_CHROME_PATH).
They start Vite on an ephemeral local port, render actual components and native modals with a memory
router, mock all owner APIs, reject unmocked `/api` and external requests, then stop their own server.
They never need a functional backend or Meta. Evidence goes to `/tmp/indice-sales-conversations-review`.
In-memory fixture uploads use a synthetic local PUT route, not object storage or Meta.

## Pilot prerequisites — still pending

1. Owner chooses the company and its **one** number, organizational scope and designated supervisors.
   An external customer's pilot needs the correct third-party/Tech Provider route; it is not an own-asset
   setup merely because there is one pilot company. No cross-unit access is assumed.
2. Recheck the official technical pages listed in the domain contract. During research on 2026-10-22,
   Tech Provider/App Review/Embedded Signup/coexistence pages returned 429. Confirm current Graph and
   signup versions, Facebook Login for Business configuration, app/business verification, Advanced
   Access, minimum permissions, token type/lifecycle, WABA subscription, number registration and
   permitted asset verification/code exchange **without secrets in URLs**. Do not enable the disabled
   gateway until its real adapter and tests have that evidence.
3. Determine whether existing Business App coexistence is eligible and desired. Default is no import,
   no coexistence and no number replacement. Do not ask the customer to delete an existing account.
4. Approve retention/location/access for message bodies, encrypted raw inbox, media, audit events and
   backups, plus legal/operational recovery requirements. No historical purge is implemented. Ready
   but unbound files and crash-created orphan final objects need an approved retention/reconciliation
   policy; staging-only cleanup does not delete them.
5. Confirm provider billing owner and current Meta terms/prices. This feature adds no Indice charge,
   tariff, credit arrangement, BSP subscription, purchase or subsidy. Infrastructure/storage capacity
   still exists. Quota exhaustion blocks a channel upload; this channel never buys storage blocks.
6. Review the exact additive V348–V351 artifacts and their interaction with pre-existing V347, backup,
   restore, permissions, secrets, rollback and isolated acceptance evidence. Persistent migration,
   deployment and each real OAuth/number/upload/send step require subsequent authorization.
7. With that authorization, implement/verify the real gateway against approved test assets first.
   Backend exchange/verification must establish asset ownership, grants, subscription and number
   health; the browser submits only a one-use code and state, never a token as authority.
8. Grant native `crm.conversations`, `crm.conversations_manage` plus native Users administration to
   the scoped admin as appropriate. Admin then explicitly bootstraps their own channel capabilities,
   and grants selected company memberships within their ceiling. Connection setup never grants
   history to all Contact users. If all channel members were revoked, the same explicit scoped-admin
   self-bootstrap can recover access; it is audited. Reconnect never automatically restores grants.
9. Enable ingest/worker/UI/outbound in controlled steps, test opt-out, scope/baja, UNKNOWN handling,
   signed receipt correlation and rollback on the specifically authorized number. Do not describe
   fixture results as real onboarding, live delivery or production certification.

## Failures and recovery

| Observation | Safe action |
| --- | --- |
| Invalid signature or oversized body | Reject; inspect aggregate counter and edge limits. Never log payload/signature/secrets. GET challenge does not authenticate POST. |
| DB failure during ingress | No successful acknowledgement; provider can retry. All events in the envelope roll back together. |
| Unknown app/WABA/phone | Hash-only rejection ledger; verify registered assets. Never create tenant/connection from a webhook. |
| Inbox retries/dead | Correct cause, then scoped-admin CSRF `POST /api/v1/sales/whatsapp/connections/{id}/control` with UUID requestKey, current version, `action: REDRIVE`, exact dead inboxId. One audited redrive; dedupe remains. No direct SQL reset routine. |
| Access changed, employee baja | Reads fail immediately; reconciler releases assignment/cancels QUEUED/CLAIMED. Eligible TAKE reconciles first. Retain authors/history. |
| Lost response, timeout or expired SUBMITTING | UNKNOWN, never automatic retry. Keep original attempt evidence; late WAMID/receipts reconcile even after lease/access changes. |
| UNKNOWN with no WAMID | No text/time matching or invented provider status lookup. Authorized human reviews evidence; deliberately repeating is a new request key with duplicate warning and a new audited intention. |
| Confirmed provider 401/403 | RECONNECT_REQUIRED with sanitized cause. Reconnect only through authorized verified assets, same original number/WABA/app. |
| Network ambiguity | DEGRADED; outbound stops until verified reconnection. Receipt processing and history continue. |
| Media unavailable | Bounded retries, then REJECTED with visible message revision. Preserve raw event, metadata and conversation. No bypass of MIME/hash/quota. |
| Suspend locally | CSRF control `SUSPEND` with expected version; cancel unstarted work, preserve grants/history, require verified reconnection. |
| Disconnect from Indice | CSRF control `DISCONNECT`; clear stored credential and explicit grants, release chats/cancel unstarted jobs, keep evidence and late webhook routing. This does **not** revoke at Meta; provider revocation/unsubscription is a separate authorized operation. |

No redrive/resend exists for an UNKNOWN outbox. Fencing protects control changes, not permission to
throw away external evidence. API acceptance does not claim sent/delivered/read. Internal read is
separate and never sends Meta read receipts. Free text outside each customer's last-message+24h
window is blocked both on enqueue and dispatch; approved templates have no send UI/endpoint in v1.

## Monitoring, backup and rollback

Scoped managers can read `GET .../connections/{id}/operations`: inbox backlog/dead/retry/lag,
outbox backlog/lag/UNKNOWN, rejected media, access changes and notification backlog. Counts carry
no phone/body/provider-ID labels and cannot span another scope/company. Invalid-signature totals
are per-process counters in sanitized `whatsapp_ingress` operational logs; they are not assigned to a
tenant before signature/routing. Single-instance ingress limit is 600 requests/minute plus 512 KiB per
request; size/timing limits and trusted edge limits must be reviewed for the pilot. This is not a
claim of distributed rate limiting. Review persisted sanitized connection reason/last verified signal.

Back up DB rows, private immutable objects and protected keys together, with approved access and
location. Exercise restore in an isolated destination: verify tenant bounds, constraints, old key
availability, object hashes and receipt replay. After restore, outbound remains OFF. A restored
SUBMITTING attempt can already have sent externally; recover as UNKNOWN, never re-POST it.

Rollback disables OUTBOUND first, keeps receipt ingress/processing for started calls when possible,
and hides UI/feature as needed. Turning off dispatch must not prevent storing the evidence of calls
already in flight. Keep tables, migrations, ciphertext, history and immutable files. Never drop new
tables, run Flyway repair, edit applied migrations or delete sent media to roll back. Restore/number
replacement/provider revocation require a separately reviewed operation. No such operation ran here.

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

## Manual local preview

`npm --prefix react run preview:sales-conversations` opens a loopback-only preview server on
http://127.0.0.1:5185/sales/conversations using the real inbox/settings components and synthetic,
in-memory owner APIs. It has no API/storage proxy, rejects those routes, limits fixture PUT size
and restricts browser connections to its own origin. The visible preview banner distinguishes this
from a connected tenant. Navigation includes Conversations/settings, a theme toggle and an explicit
reset; reloading resets the synthetic state. No database, migration or Meta credential is needed.
This preview does not change the functional application running on5175 or solve the integration blocker.
