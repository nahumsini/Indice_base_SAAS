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

### Photos and documents (approved extension, 2026-10-18)

Messages accept up to five attachments per message, each at most 8 MiB: JPEG, PNG, WebP,
PDF, Word (DOC/DOCX) and Excel (XLS/XLSX). MIME and extension must match; empty files,
HEIC, SVG, HTML and macro-enabled Office extensions are rejected. The server verifies actual
size, MIME and image/PDF/OLE signatures; modern Office containers require the expected XML
entries and reject VBA payloads, malformed ZIPs and excessive entries/decompressed size.
This is bounded format verification, not a general antivirus scan. Documents appear as file cards,
never HTML. Private authorized download links last 60 seconds and are never logged or persisted.

Existing conversation uploads retain `POST /conversations/{id}/attachments` and all participant,
tenant and channel checks. The authenticated ERP additionally exposes `POST /attachments` for
first-message staging. It permits only an operational MEMBER actor under existing session/CSRF
checks; platform/distributor actors and support-only accounts are denied. No kiosk route or
subscription recovery allowlist was added. `Context.initialAttachments` advertises ERP availability;
the existing kiosk context defaults false. Restricted accounts retain initial text followed by
authorized attachments in their support conversation.

First-message staging belongs to the authenticated company, sender and actor scope. It has no
conversation and is unreadable until the create/send transaction validates the audience, binds it
to that conversation and commits the message/outbox. `Create.attachmentIds` is additive; text is
optional with attachments. The creation fingerprint includes nonempty attachment IDs, preserving
old request fingerprints when absent. Other senders/companies cannot take or read pending files.
The first-message audience is still validated by the messaging owner before any message mutation.

Uploads reserve quota through `CompanyStorageMeter`; immutable sent keys and existing request
identities remain authoritative. Expired unbound intents can renew under the same attachment ID
and request key, using a new staging object/reservation. Renewal locks the row, deletes/releases
the old staging key and clears its cleanup marker. Bound attachments can never renew. The browser
first retries a completed PUT's original message/create request, even after expiration, to recover
a lost commit acknowledgement. Only an expired conflict renews staging and retries with the same
IDs and message/create key. Failed PUTs and drafts retain per-file status and specific errors.

Cleanup still processes at most 50 expired staging records per pass with a one-minute margin,
removes only temporary/uncommitted objects and releases unused quota. Unbound first-message
drafts follow the same cleanup. Sent attachments/history are retained. Existing limits of 30 upload
intents per sender per minute, immutable object verification, no-store download responses,
internal-note isolation, revoked-member checks and channel ownership remain in force.

V326 widens attachment MIME metadata; V327 makes only staging conversation ownership nullable
and adds a sender/company-scoped draft upload key. Apply both migrations before application
rollout. Rollback retains these additive schema changes and private records; do not drop attachment
data or rewrite applied migrations. Storage failures continue to allow text-only messages.

## Care workflow

### Messages modal presentation

Messages is an **Operational Workspace Modal** implemented with `IndiceModalFrame` through
the module-owned `MessagingModal`. It uses the shared canonical blue shell and workspace width. The repeated summary footer is omitted;
on phones the conversation header becomes the single visible blue bar, retaining the accessible modal title.
Desktop keeps a compact searchable inbox on the left and the selected conversation on the right.
Inbox previews use only messages visible to the actor; internal care notes never leak into member previews.
Participants, refresh and personal task capture live in the conversation actions popover. The attachment
menu offers photos/documents, removable previews, per-file status, desktop paste/drop and actionable errors.
Each pane scrolls internally; the conversation header and composer remain visible. On mobile,
the inbox and conversation replace each other with an explicit Back action, preserving the inbox
query, filter and loaded rows. The shared shell follows the visual viewport when the keyboard
reduces available space; message input uses at least 16px text and touch actions are at least 44px.
Unsent drafts require an inline discard decision before navigation or closing. Sending blocks
navigation/close. Creation shares the compact phone header; send errors stay beside its fixed footer.
Directory loading and retry are explicit, and the Search keyboard action never submits a group.
Document opening reserves its viewer tab during the tap, then requests the existing private link;
failed/abandoned pending tabs close without discarding the chat draft. A blocked window gets a direct,
short-lived link on the file card, refreshed after expiry. Native downloads carry the original UTF-8
filename in the signed Content-Disposition override; original three-argument storage callers remain
unchanged. No file URL or draft is persisted in browser storage.
Existing request identities, retries, authorization and portal ownership remain
unchanged. The presentation keeps ownership unchanged; the additive attachment contract and schema are specified above.

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
