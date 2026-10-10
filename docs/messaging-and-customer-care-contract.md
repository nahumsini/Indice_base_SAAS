# Messaging and customer care

Status: implementation contract approved by the product owner in this task.

## Ownership and scope

Messaging is a core authenticated workspace capability. The approved 2026-10-10 extension supports individual
and group conversations between active company memberships and customer care with Indice or the assigned
distributor. Employee PIN sessions in Multikiosk are included through the approved alternate
boundary described below. Provider kiosks and external email delivery are outside this
release. Existing distributor system tickets remain available and retain their contracts.

`messaging` owns conversations, participants, messages, read cursors, care workflow and durable
notification delivery. Platform Administration hosts the care queue; the distributor portal hosts
its portfolio queue. These queues never grant access to employee direct messages.

## Authority

The ERP actor comes from SessionAuthService; company members must have an active, matching membership.
Managed-company impersonation and public demo sessions cannot send messages. Platform care requires
SYSTEM_TICKETS_MANAGE and the existing platform MFA boundary. Distributor care requires
DistributorPortfolioAccessPolicy and a current portfolio relationship on every request.
Support is available without a consultant. A previous distributor loses access after reassignment.
Support-only recovery is also available during subscription/collection restrictions. Exact messaging
recovery routes retain authentication, membership and CSRF checks; backend access excludes direct
and distributor conversations, directory and associated unread counts for restricted companies.
Transferring a case to Indice exposes its public history to platform support and revokes distributor
access; internal notes remain restricted to their authoring care channel.

Direct and group chat are company scoped and participant scoped. Customer requests are visible to their
requester and the authorized care channel. Administrators do not implicitly read employee chats.
Browser mutations require CSRF. Text is rendered as text, with size and send-rate limits.

## Team conversations, read receipts and personal tasks (2026-10-10)

The shared ERP/PIN workspace opens team composition first. Direct chats require a colleague and
initial message, without subject or topic. Existing direct pairs and histories are retained; their
display name is the other participant's current name. Care retains subject/topic and its existing
workflow. `GROUP` creation requires a name (1–80 characters), initial message and 2–49 distinct,
active colleagues in the same company, plus the authenticated creator (3–50 total). Memberships
are validated by the owner; client company or sender fields are never authority. The initial
roster is fixed for this version: changing the audience requires a new group. No participant can
silently add someone to private history. Inactive members cannot read, and a group with a revoked
member blocks new sends, matching the existing direct-chat revocation policy. History is retained.

`Detail.participants` carries bounded, server-derived membership/name/activity/read-cursor data
only for authorized team conversations, including empty incremental polls. Care does not expose
staff read activity. ✓ means the server committed the message; ✓✓ means every other participant's
read cursor covers it. Partial group reading displays “Read by n of total.” Neither icon claims
push delivery, device delivery or online presence. The visible thread at its latest messages
advances the read cursor; hidden tabs, older-history browsing and the task capture pane do not.
Send acknowledgements alone cannot advance reads past the fetched history cursor.

The small **Add task** action opens an inline form in the same workspace (no nested modal) with
title and optional date. It creates a personal follow-up assigned to the authenticated collaborator,
without copying the private conversation into task content or assigning other group members.
`ProcessTaskMessagingContract` owns task permissions, organizational scope, creation and reading.
ERP requires the Processes entitlement/module and `processes.calendar` permission. PIN additionally
requires the active composed native My tasks tool and its `process-tasks.task.create@1` capability;
the task owner uses the same native self-capture operation as its workspace. Every attempt rechecks
authority. No task is created by merely opening a chat or receiving a message.

`GET /task-context` reports availability; `POST /conversations/{id}/tasks` accepts only title,
optional ISO due date and UUID request key. These exist under both messaging trust boundaries.
Company/member-scoped retry receipts bind the conversation and normalized content to one task;
creation and receipt commit together. Identical retries return that task, and changed-content
retries conflict. Drafts and request identities stay in memory. Capture retains the message draft,
protects unsaved navigation and blocks concurrent submission. Success identifies the task folio.
The creator can find the resulting record in My tasks; no group membership grants task access.

V312 extends the conversation kind check and adds company-owned `messaging_task_requests`;
existing messages, attachments, participant tables and read cursors remain authoritative.
The migration is additive to the approved data model and must precede application rollout.
Rollback keeps the schema and records; older application versions do not support `GROUP` and
must not serve the new team-chat surface after groups have been created. Roll back application
traffic only to a version that understands `GROUP`, or disable messaging entry while restoring.

## Persistence and delivery

Messages are acknowledged only after commit. A UUID supplied by the client is unique per sender
and conversation, and a retry must carry identical content. Conversation creation is also
idempotent. Direct pairs have a unique canonical membership key. Conversation row locks serialize
sends and read cursors; workflow changes require the current version. History uses bounded cursor
pagination, while queues use bounded server-side filters and pagination.

Notifications for company participants are inserted into a durable outbox in the send transaction.
The scheduled dispatcher retries independently, uses an idempotent notification event key, and
never logs message bodies. Operator queues are durable database queries and do not depend on a
notification worker. The browser polls incrementally, backs off after errors, and refreshes on
focus. It clears conversation state when identity/company changes.

### Photographs (approved extension, 2026-10-05)

Existing conversations support up to five JPEG, PNG or WebP photographs per message, each at most
8 MiB. Text is optional when photographs are attached. Opening a new conversation still requires
its initial text; photographs can then be sent in that conversation. Other document formats are
not accepted. The composer shows removable previews, guards unsent photo drafts, preserves failed
uploads for retry and displays sent photographs inline with an enlarge/reduce control.

`POST /conversations/{id}/attachments` reserves storage through `CompanyStorageMeter` and returns
a short-lived upload URL. The pending record belongs to the authenticated sender, actor channel,
company and authorized conversation. Caller-selected object keys are never accepted. Upload intents
are idempotent, bounded to 30 per sender per minute and expire after at most 15 minutes.

Sending includes `attachmentIds`. The locked send transaction copies staging objects to immutable
keys, verifies their actual size, content type and JPEG/PNG/WebP signature, commits quota and binds
the photographs to the message. Failed registration rolls back message/outbox/metadata; copied
objects are cleaned on rollback. Retries of an acknowledged or lost response return the same
message only if text, visibility and attachment identities match. Reusing the staging PUT URL
cannot alter the committed photograph. This validates signatures, not a general antivirus scan.

`GET /conversations/{id}/attachments/{attachmentId}` rechecks conversation and message visibility
and returns a 60-second signed download URL with a no-store API response. Storage buckets remain
private. Pending uploads cannot be read through this endpoint. Root cannot view employee photos;
customer members cannot read internal photos; internal distributor photos remain unavailable to
platform support after transfer. Previously issued download links expire within 60 seconds of
revocation; previously downloaded bytes cannot be recalled. Never persist or log signed URLs.

The cleanup job processes at most 50 expired staging records per pass, after a one-minute expiry
margin. It removes only temporary/uncommitted objects, releases unused reservations and marks
cleanup complete. Sent photos and business records are retained. Failures remain eligible for
retry. Configuration: `app.messaging.photo-cleanup-delay-ms` and
`app.messaging.photo-cleanup-initial-delay-ms`, both default 60000.

Support-only recovery permits exactly the attachment upload/read routes; all participant, tenant,
channel, subscription-recovery and CSRF checks still apply. Storage failures do not block text-only
messages. Local verification requires a private MinIO bucket, not public image URLs.

## Care workflow

### Messages modal presentation

Messages is an **Operational Workspace Modal** implemented with `IndiceModalFrame` through
the module-owned `MessagingModal`. It uses the canonical blue header/footer and workspace width.
Desktop keeps the searchable inbox on the left and the selected conversation on the right.
Each pane scrolls internally; the conversation header and composer remain visible. On mobile,
the inbox and conversation replace each other with an explicit Back action, preserving the inbox
query, filter and loaded rows. The shared shell follows the visual viewport when the keyboard
reduces available space; message input uses at least 16px text and touch actions are at least 44px.
Unsent drafts require an inline discard decision before navigation or closing. Sending blocks
navigation/close. Existing request identities, retries, authorization and portal ownership remain
unchanged. This presentation change does not alter the API or database schema.

OPEN means waiting for care; WAITING_CUSTOMER means care has replied; RESOLVED means closed by care.
A customer reply reopens the case. Assignment, priority, resolution and transfer are audited.
No hard deletion or editing of sent messages. Retention changes require a separate product decision.
Pending-age indicators are elapsed time, not a promise of business-hour SLA. No automatic response
time or 24-hour staffing is promised. Initial response and resolution durations are measured from
stored timestamps. Support schedules remain an operational configuration decision.

## Verification and release

### Employee Multikiosk (approved extension, 2026-10-09)

`/api/v2/multi-kiosks/public/{publicToken}/messaging` uses the existing browser-bound
`X-Multi-Kiosk-Session-Token`. Every request resolves an active company, parent definition,
unexpired/unrevoked employee session, active membership and active personal PIN. Provider identities
are rejected. An ERP cookie, administrator role or client-supplied membership never selects the actor.
`MessagingAccess.memberActor` maps this verified identity to MEMBER and reuses all owner policies.

This personal core surface exposes context, directory, unread, conversations, send, read and photo
upload/download only. It does not expose operator queues, assignment, transfer, audit or internal notes.
Existing employee conversations and cursors are shared with the ERP; there is no second chat store.
Mutations require the browser session's CSRF token. Send/create/upload reuse the owner's validation,
rate limits, immutable photo verification, idempotency, transactions and notification outbox.
Read receipts and polling do not extend kiosk inactivity. All responses are private/no-store.
The kiosk still requires operational company access; it does not expand ERP support-only recovery.

The kiosk embeds the owner `MessagingWorkspace` as a full navigation destination, through a scoped
transport context. Desktop uses list/detail panes; mobile replaces list with detail and adapts to the
visual keyboard viewport. Team conversations are the initial compose choice; own support remains a
separate choice. Hidden conversation panes do not poll or advance read cursors. Navigation guards
protect drafts and sends; logout, expiry and identity changes unmount all personal state and photo
previews. No messages, drafts, attachments or signed URLs are persisted in browser storage.
Delivery remains incremental polling (thread 3s with error backoff, inbox/unread 15s), not push/SSE.

Required: tenant/participant isolation, revoked access, internal-note isolation, CSRF, duplicate
sends/creation, concurrent assignment, recovery from missed polling, database persistence,
notification retry, migration uniqueness/startup, frontend typecheck/build and flow regressions.
Database tests run exclusively against indice_test_db. Apply additive migrations before rollout.
Application rollback preserves the new tables and existing tickets. Follow deployment/README.md
for backup, rollout and recovery. Passing local checks is not production acceptance; release
requires the authenticated customer/distributor/operator smoke flow in the target environment.
