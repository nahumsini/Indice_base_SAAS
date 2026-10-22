# Email and Sales Mailing integration

Status: local pilot, 2026-10-17. This increment implements the joint UI remodeling,
private account configuration, connection verification and the durable campaign handoff.
The individual-mail increment below adds IMAP synchronization and explicit SMTP sending.
The completion extension at the end of this contract now governs campaign dispatch.

## Ownership and access

- Email (`correo`, route `/email`) owns private accounts, credentials and transport settings.
  Runtime: `react/src/app/ComplementaryModules/Email`; backend: `email.accounts`.
- Sales (`crm`, route `/sales/mailing`) owns contacts, templates, campaigns and selected sender IDs.
  It consumes `EmailAccountService.senders/requireSender`, an explicit owner projection.
- `correo.mail` and `correo.accounts` are separate native tab assignments. Account endpoints
  require the current authenticated company, Email entitlement, module assignment, Accounts tab,
  active account ownership and CSRF for writes. Public demo sessions cannot access account APIs.
- Accounts remain private even to another company administrator or superadmin. No mailbox-sharing
  or delegated-send grant is introduced. Opting an account into Mailing only exposes its sender
  projection to its owner with CRM/Mailing access; it does not authorize campaign dispatch.
- GET `/api/v1/mailing/senders` returns only ID, label, email, display name and SMTP check status.
  It never returns hosts, usernames, ciphertext, passwords or mailbox contents. Campaign writes
  validate the selected account's company, owner, active state and explicit Mailing opt-in.

## Joint frontend contract

Both modules use the Frontend Operating System shell, title bars, state components and modal frame.
Email retains blue; Sales retains coral. Email no longer has the extra standalone favorites wrapper.
There is one compact module header, route-backed tabs and shared internal navigation. Mail preview
uses list/detail on desktop and list then detail on mobile. Content is rendered as text.

- Email has Buzón and Cuentas conectadas. Accounts use at most three direct title actions, a bounded
  owner account catalog (20 active accounts maximum), separate SMTP/receiving health and an action
  menu for editing/disconnection. A successful check means authenticated connection only, not
  sender-domain authorization, deliverability, synchronization or successful delivery.
- Account setup is a Standard Form Modal. Sending is SMTP/TLS 465 or SMTP/STARTTLS 587; receiving is
  optional IMAP/TLS 993 or POP3/TLS 995. No plaintext transport is offered. Password inputs are
  blank on edit and preserve the stored secret when left blank. Secrets never enter browser
  navigation memory. OAuth provider authorization is not available in this increment.
- Mailing title actions are New campaign, Templates and Email accounts; Refresh is in Actions.
  The campaign wizard includes an optional sender selector. Drafts can still be saved without a
  sender. Selecting an account fills sender name/reply-to, which remain editable draft fields.
- Save and configure account first saves the entire draft, then navigates to
  `/email/accounts?campaign=<uuid>`. The explicit Return to Mailing action reopens that persisted
  campaign through its authorized API. Only the UUID travels in the URL; content and audiences
  remain in the database. Failed saves stay in the editor. Returning never sends a message.
- Templates remain an Operational Workspace Modal; selection shows a preview beside the table on
  wide screens and below it on narrow screens. Editing and confirmations replace the same frame.
- Cancel/Back is on the left; progression/save on the right. Dirty-close confirmations replace
  the same modal; there are no nested dialogs. English, Spanish, French, Portuguese, Korean and
  Chinese dictionaries cover all eight runtime locales. Folder/query memory is company/user scoped.

## Persistence and connection security

V315 adds owner-scoped `email_accounts`, content-free `email_account_audit` and a nullable composite
tenant foreign key from `sales_mailing_campaigns.sender_account_id`. V313 and V314 remain unchanged.
Existing draft routes/shapes remain compatible with an additional optional sender reference.

Account creates use UUID plus expected version 0; edits and disconnects use optimistic versions and
a transaction including audit. Mutation entitlement is rechecked within the transaction. Changing
settings invalidates both connection checks. Disconnect deactivates the account, removes stored
credentials and leaves campaign drafts and audit records intact; future selection is denied.

Credentials are encrypted with AES-256-GCM, random nonces and company/account/channel authenticated
context. `MAIL_ACCOUNTS_ENCRYPTION_KEY` must be a base64-encoded 32-byte key supplied outside the
repository. An absent key disables configuration and testing. Keep the key with the environment's
secret backup; do not regenerate it on restart or change it without a re-encryption procedure.
The platform authentication email provider and its secrets are unrelated and unchanged.

Connection tests authenticate but never send or read a message. They use certificate and hostname
validation, TLS 1.2/1.3, eight-second socket timeouts, standard mail ports, no socket fallback or
proxy, and a DNS resolution checked for public addresses. The socket pins the validated address,
so subsequent DNS changes cannot redirect the connection to an internal service. Local, private,
reserved and transition addresses are rejected. Account tests have a database-backed 30-second
cooldown. Network work occurs outside database transactions; the result is applied only if account
version, ownership and current access still match. Errors never return provider diagnostics or
credential-bearing validation values. No public endpoint is added.

## API surface

- GET `/api/v1/email/accounts`: owner's active accounts and configuration availability.
- PUT `/api/v1/email/accounts/{uuid}`: save configuration with expected version.
- POST `/api/v1/email/accounts/{uuid}/test`: expected version and `SMTP` or `RECEIVE` channel.
- POST `/api/v1/email/accounts/{uuid}/disconnect`: expected version, deactivate and erase secrets.
- GET `/api/v1/mailing/senders`: safe owner projection for the Mailing tab.

## Earlier remaining increments (superseded below for SMTP/IMAP)

1. OAuth provider application registration and authorization where required by the provider.
2. Durable campaign outbox, recipient/content snapshots, explicit send permission and launch review,
   idempotency, limits, scheduling, pause/cancel and per-recipient outcomes. An uncertain SMTP result
   must not be blindly retried. Recipient eligibility, suppression and authenticated unsubscribe must precede
   marketing dispatch; connection verification alone is insufficient.
3. Attachment upload/download through the canonical private object-storage flow, server-side Sent
   APPEND reconciliation, full mailbox history synchronization and POP3 import remain separate
   increments. The individual SMTP/IMAP contract below is now the active runtime.

## Release and rollback

This work does not activate Email globally, deploy or send mail. Local synthetic memberships may
receive the new tab assignments for review. Production keeps existing lifecycle/entitlement gates.
The encryption key is server-only and must not be placed in a `VITE_*` variable.
Rollback the application to its prior version without reverting V315: its new tables and nullable
column are additive. Preserve the key and database backup. Disable the Email entitlement to suspend
new account operations; no automatic send worker is installed by this increment.

## Verification

Automated database checks run only on `indice_test_db`. Focused coverage includes credential
encryption/context binding, secret-free responses, current owner/tenant isolation, CSRF, tab and
entitlement denial, stale edits/probe races, independent SMTP/receiving states, test cooldown,
Mailing opt-in, sender persistence and credential removal on disconnect. Existing Mailing/template
regressions, migration uniqueness, TypeScript and frontend production build remain required.
Actual provider authentication needs a real configured account; synthetic tests do not certify
any provider connection or message delivery.

### Local acceptance evidence — 2026-10-17

- Isolated backend: 9 account integration tests, 2 transport/credential security tests, 8 existing
  Mailing/template integration tests and 2 migration-uniqueness tests passed (21 total). Flyway V315
  started on `indice_test_db` and the local functional application; no other database was used.
- Frontend: 5 Email/Mailing structural regressions, 34 Sales UI regressions and 30 Sales workflow
  regressions passed (69 total). TypeScript and the production build passed; the pre-existing
  warning about bundles above 600 kB remains.
- Real local Chrome: saved the clearly fictitious “Horizonte — prueba sin conexión” account, reopened
  it with a blank password field, exercised dirty-close protection and observed a failed connection
  for the reserved `.invalid` host. No real provider credentials or email recipient was used.
- Created a separate “Horizonte — flujo de correo (prueba)” draft with 20 synthetic contacts,
  selected the saved account, saved before leaving for Email, reloaded and returned to the same
  persisted content and audience. The original welcome campaign and template were preserved.
- Verified the responsive template preview, account form at 391 CSS pixels with no document
  horizontal overflow, dark mode and corrected cancel-button contrast. Restored normal viewport
  and light mode. The isolated mailbox preview retained archive/restore, compose, dirty confirmation
  and draft behavior. The standalone browser CLI was updated; these flows were exercised through
  the browser-control tool rather than that CLI.
- Local frontend remains on 5175 and backend on 8083. Deployment, export changes and actual mail
  delivery: N/A. No commit, push, production activation or campaign send was performed.

Changed areas: Email runtime components/API/copy; Sales Mailing sender picker/editor/title actions
and template layout; native tab catalog/routing and module appearance; `email.accounts` owner API,
credential protection and transport probe; additive V315; focused tests and canonical contracts.
Shared modal/table engines, unrelated business flows and platform transaction-email services were
preserved. Remaining product increments are listed above and are not represented as functional.


## Individual mailbox increment — 2026-10-17

Scope selected by the user: private domain account with SMTP/IMAP. This increment adds real
individual mail; it does not implement OAuth, POP3 import, attachment transfer or campaign dispatch.
Existing account setup, Sales sender projections, templates and campaign persistence are preserved.

### Data, API and permission boundary

V316 adds private account-scoped mailbox leases, folder/UID cursors, cached messages, durable
plain-text drafts and an individual-send ledger. Folder identity includes account configuration
version; changing a server cannot reuse another server's cached UID namespace. UIDVALIDITY changes
retain historical rows but remove them from the active folder projection. No mail record is hard
removed. Discarding an individual draft makes it inactive. Account disconnection preserves history
but revokes access to its mail and credentials. No mailbox sharing is added.

`/api/v1/email/mailboxes` exposes an owner's safe account projection. Under `/{account}`:

- GET workspace, GET messages (folder/query/offset, 25 per page), GET message detail;
- POST sync (optional folder ID, older-page flag), POST message open and message action;
- PUT draft UUID with message/account versions;
- POST draft send with the reviewed versions and POST draft discard.

All entry points require session, Email entitlement/module assignment, `correo.mail`, current
company and account ownership. Every mutation requires CSRF. Settings still require
`correo.accounts`. The controller never accepts company/user authority. Services repeat current
access checks, and the account query enforces private ownership even for administrators. SQL lives
in the mailbox repository and every query is company/account scoped after authorization.

### Receiving and UI

The live mailbox uses the canonical blue shell, title bar, internal navigation and master/detail
layout. Mobile moves from list to detail. Account and folder filters may be remembered through the
existing company/user-scoped workspace memory; message bodies, recipients and credentials never
enter navigation/browser storage. Loading, error, empty, busy and last-sync states are explicit.
The isolated fictional preview is still separate from the live workspace.

The first sync discovers up to 100 selectable folders and fetches the newest 50 headers in the
selected folder (Inbox by default). Subsequent requests advance through UID windows of at most
1,000 IDs and persist at most 50 headers, including deleted-UID gaps. Older history is fetched in
bounded pages on request. A sync also reconciles the 50 most recent cached UIDs' presence/read/star
flags. This is a bounded mailbox cache, not an exhaustive offline replica. Search covers the
synchronized sender/subject headers. Folder operations use the provider's special-use metadata;
all discovered folders remain selectable by their actual names.

Opening a message retrieves bounded plain text and marks it read on the provider. HTML is converted
to text on the backend; scripts, remote images and attachment contents are never rendered. The text
limit is 100,000 characters, MIME nesting/parts are bounded and truncation/attachment notices are
visible. Attachment download/upload is deferred to the private ObjectStorageService workflow;
normal file bodies are not stored in MySQL. Read/unread and star changes are provider operations.
Move uses IMAP MOVE only when supported, closes folders without expunging other messages, and
requires synchronization of the destination folder. The UI does not fabricate a successful move.

Manual refresh is available. While the mailbox remains open, visible and idle after its initial
sync, it polls about once a minute. There is no unattended synchronization worker in this increment.

### Draft and individual-send semantics

A Standard Form Modal handles To, Cc, Bcc, subject and plain-text body. Drafts persist in MySQL,
with optimistic editing and a 100-active-draft account limit. Recipients must be unique valid email
addresses, at most 20 combined. Subject/body limits are 240/20,000 characters. Reply and reply-all
use the received Reply-To and exclude the account address; Bcc is never inherited into a reply.
Thread headers are derived by the backend from an authorized source message. Forward creates a
new draft without adopting the source's thread authority.

Review saves the draft first and replaces the same modal with the exact account, recipients,
subject and content. Only the explicit Send action submits it. The backend validates both saved
message and account versions, derives From from the private account, and commits a SUBMITTING
intent and a unique per-draft ledger entry before network I/O. Each account is limited to 30
individual attempts per hour. A repeated request returns the recorded result and never invokes
SMTP again. No whole campaign or platform transaction-email provider is involved.

A successful SMTP submission becomes ACCEPTED, not DELIVERED. Its durable local sent copy is shown
under Sent. If the provider independently stores a matching Sent copy, synchronization can associate
it by the generated Message-ID. This increment does not append a new Sent copy to the IMAP server.
A failure before submission is FAILED; an error after submission starts is UNKNOWN, conservatively
including rejected submissions whose final acceptance could not be proven. Neither is automatically
retried. FAILED can be copied explicitly into a new draft. UNKNOWN/SUBMITTING cannot be edited or
sent again; the UI instructs the user to verify the provider result. A stale SUBMITTING intent is
projected as UNKNOWN after three minutes, including process interruption. It remains in the ledger.

After a browser response failure, the composer offers a status lookup for the same draft. It cannot
blindly issue another send. After a provider acceptance followed by a database failure, the durable
SUBMITTING intent prevents retry and eventually appears uncertain. Final transport truth is saved
even if permissions are revoked while an already-authorized send is in flight; subsequent user
reads still require current authorization. A shared two-minute database lease prevents overlapping
account transport operations and configuration edits. Provider operations run outside transactions.

SMTP/IMAP reuse the same pinned-public-destination, TLS certificate/hostname, timeout and redaction
policy as account probes. Bcc is included in the SMTP envelope and removed from transmitted headers.
No raw provider exception, message content or credential is logged by the new services/DTOs.

### Local acceptance and remaining external verification

Automated tests use only `indice_test_db`; transport tests use a synthetic loopback SMTP server or
an injected IMAP store, with production destination/TLS policy unchanged. A real-provider pilot
requires the user's domain account settings entered in Connected accounts. Test transport success
is not evidence of delivery from that domain. No real email is sent as part of development QA.

Deployment is N/A. V316 is additive; rollback keeps V315/V316 and the existing encryption key.
Do not start the new backend against a schema lacking V316. Disabling the Email entitlement prevents
new mailbox use. The application has no automatic sending worker to drain a queue on restart.

Verification for this increment: 37 focused backend tests passed (10 mailbox integration, 6 MIME/
SMTP/IMAP transport, 9 account integration, 2 credential/destination security, 8 existing Mailing,
2 migration uniqueness). The IMAP regression also rejects an old cached message ID after
UIDVALIDITY changes, before opening or mutating the newly assigned remote UID. The loopback SMTP
fixture verified actual envelope/data exchange, hidden Bcc headers, stable Message-ID/thread
headers and lost-acknowledgement uncertainty. Provider authentication/delivery is still unverified.

Frontend: 73 regressions passed (4 mailbox flow, 5 Email/Mailing architecture, 34 Sales UI and
30 Sales workflow); TypeScript and production build passed. The existing bundle-size warning
above 600 kB remains. No new dependency or shared modal/table engine was introduced.

Manual local Chrome QA saved a synthetic individual draft with To/Cc/Bcc, reloaded and reopened
it, edited it, exercised dirty-close/back, reviewed its persisted content without sending and
verified that closing review refreshes the saved version in the list. The separate synthetic
campaign/template data was preserved. A 391 CSS-pixel viewport had no document horizontal
overflow; the editor was reviewed in dark mode. Viewport and light mode were restored. The
functional backend on 8083 applied V316 successfully; frontend remains on 5175. No real account
credentials were entered, no real recipient was contacted, and no commit/push/deployment occurred.

Changed files for this increment: `email/mailbox/*`, shared `EmailConnectionFactory` plus the
existing account probe/service lease integration; V316; live Email mailbox/API/composer/detail/
copy/model and module wiring; focused Java/TypeScript regressions; this contract and both
canonical operating-system references. Account encryption, tenant/owner isolation, Sales Mailing
sender selection and draft/template behavior remain intact. Production activation: N/A.


## SMTP/IMAP completion extension — 2026-10-17

Approved scope: the user requested all five remaining steps together. This section supersedes the
older draft-only, text-only, local-Sent-only and browser-open-only statements above. OAuth and POP3
import are outside this SMTP/IMAP increment. Real-domain acceptance still requires the user's
configured credentials and an explicitly authorized test recipient; automated fixtures do not
prove external delivery.

### Account, Sent and background synchronization

The existing account editor and independent SMTP/IMAP authentication tests are retained. Passwords
remain server-encrypted and blank on edit. Account credentials are never shared with Sales.

Mailbox preferences are versioned, owner-scoped and CSRF protected. Background reception is opt-in;
the server discovers folders and synchronizes Inbox even when no browser is open. A successful cycle
is due again after 60 seconds. Failure delays increase up to an hour, with safe status in the
workspace/preferences. Restart preserves the database cursor, next attempt and lease. Each cycle
reloads active membership and checks current Email access. Qualified Spring schedulers isolate mail
network waits from the application's default scheduler. Batches contain at most ten accounts.
`app.mail-accounts.worker-enabled=false` disables the worker. Socket lifetime is bounded to 60 seconds
in addition to eight-second read/write/connect timeouts; account leases expire after ten minutes.

SMTP acceptance creates a pending server-copy operation. After a short delay, the worker finds the
server's special-use Sent folder, or the exact folder chosen in preferences. It searches for the
stable Message-ID before APPEND. A durable COPYING marker precedes APPEND. Interrupted or ambiguous
APPEND is only searched on a later explicit check; it is never automatically appended twice.
COPIED, PENDING, UNKNOWN, FAILED and UNAVAILABLE remain distinct from SMTP ACCEPTED. A provider
that asynchronously stores Sent mail after our search can still create a duplicate; Message-ID
reconciliation merges our local projection. SMTP-only accounts cannot have an IMAP server copy.

### Attachments and safe formatted reading

V317 adds mailbox preferences, sanitized HTML, independent Sent-copy state and private attachment
metadata. Draft uploads use the existing CompanyStorageMeter/ObjectStorageService flow: generated
company/account/message staging key, five-minute presign, exact size/type verification, immutable
private destination, validation and transactional quota/metadata registration. The browser cannot
reuse the upload URL to overwrite a registered file. Register/remove increments the message version,
so an earlier send review is invalidated. Attachment bytes remain in object storage, never MySQL. Discarding
mail or removing an attachment preserves retained metadata; no business history is hard-deleted.

Limits: five outgoing attachments, 5 MiB each and 10 MiB combined. Allowed: passive PDF, PNG, JPEG,
UTF-8 TXT. Extension, MIME and content must agree. PDFBox examines the reachable document graph and
rejects encrypted PDFs, active actions/scripts/forms and embedded files. Office documents, archives,
executables and other unsupported formats remain blocked. Incoming attachment downloads enforce
the same bounded file policy and recheck the current account version after provider reads. Downloads
are authorized backend streams with no-store, nosniff and attachment disposition.

HTML is reconstructed on the backend from escaped text and a narrow formatting-tag allowlist.
Source attributes, URLs, styles, images, frames and scripts are discarded. The UI adds an iframe
sandbox and a deny-by-default CSP. Plain-text view remains available. The individual composer remains
a text editor with attachments; editing converts any draft HTML to the reviewed plain text. Rich
HTML authoring and remote image loading are not introduced.

### Sales campaign delivery ownership and recipient selection

V318 extends campaign statuses to DRAFT, SCHEDULED, RUNNING, PAUSED, COMPLETED and CANCELLED. It adds
consent/suppression and evidence history, durable run configuration and one delivery per normalized
email address. Existing campaigns stay DRAFT. Existing V313–V316 migrations are unchanged.

New native `crm.mailing_send` permission plus current administrator role, CRM/Mailing/Contacts access
and mutation entitlement is required to record consent, test, launch, schedule or control a campaign.
The private sender owner must also retain Email/Mail access and explicitly opt that account into
Mailing. No new permission is automatically granted to existing production memberships.

Review is computed by the backend: current account version and verified SMTP status, normalized
recipient addresses, duplicate/invalid/suppression exclusions, campaign version and an audience
digest. Launch rechecks all of these under the company lock. Only selected eligible recipients enter
the snapshot; names and addresses are frozen. Content is locked against draft edits after launch.
`{{name}}` is personalized from the frozen recipient name. A contact footer and unsubscribe link are
included per recipient. The preview distinguishes eligible and excluded recipients explicitly.

The [direct recipient selection decision of 2026-10-19](sales-mailing-contract-v1.md#direct-recipient-selection--2026-10-19)
supersedes the original manual consent gate. A valid active contact is READY unless unsubscribed or
duplicated; no manual consent record is required for review, launch or worker dispatch. Optional launch
`contactIds` restricts the snapshot to the selected eligible members of this campaign; an explicit empty
selection is rejected. Omitted/null selection preserves the older client's all-eligible behavior.
Unknown, foreign, unselected-from-campaign or excluded IDs fail before any run is persisted.

Historical consent records and the compatibility endpoint remain intact; selection never fabricates
consent evidence. A recorded unsubscribe cannot be cleared by that endpoint. Suppression is checked
again immediately before authorizing each submission. Pause/cancel prevent pending submissions;
a submission already authorized may finish.

Sales calls `CampaignEmailGateway`, the Email owner's narrow sender/outcome/send port. The owner
creates a stable individual outbox identity for each campaign recipient or test command and commits
SMTP intent before transport. It retains the existing account-wide 30 submissions/hour limit. The
campaign worker never retries uncertain SMTP results. A restart consults the Email ledger before
reconciling an interrupted campaign delivery. Rate-limit/preflight failures wait only when the Email
ledger proves no submission began. Delivery states are PENDING, SUBMITTING, ACCEPTED, FAILED, UNKNOWN,
SUPPRESSED and CANCELLED. ACCEPTED is provider acceptance, not proof of inbox delivery/opening.

The user can send a test with explicit recipient review, launch now, schedule up to one year ahead,
pause/resume/cancel, and inspect every recipient result. Dates use an explicit browser time zone
and UTC API instants. Test command retries use the same identity. Campaign launches are idempotent.
`app.mailing.worker-enabled=false` stops campaign processing; queued runs remain durable.

### Public unsubscribe trust boundary

`/mailing/unsubscribe#<capability>` is a minimal public page without private ERP navigation or
session requirements. Merely visiting it does not change data. Confirmation POSTs only the capability
to `/api/public/mailing/unsubscribe`; it accepts no company/user/role/email authority. The recipient
UUID and purpose-separated HMAC-SHA256 bind the capability to one frozen delivery and its company's
suppression entry. The signature uses the existing protected mail environment key with a distinct message domain;
credentials and key bytes never leave the server. Rotating that key
invalidates old links and therefore needs an explicit rotation plan alongside credential migration.

Tokens stay in the fragment/memory, are absent from HTTP access URLs and are not logged. A durable
hashed network bucket bounds requests to 60 per ten minutes. Invalid/replayed capabilities get a
non-disclosing response; valid repeats are idempotent and produce a single unsubscribe audit event.
Browser-session CSRF authority is not used on this capability-only endpoint. No login or account
permission is needed to unsubscribe. The route must remain reachable even if the company later
loses subscription access. No GET endpoint mutates suppression.

Campaign launch requires a configured public HTTPS application URL; localhost is deliberately
insufficient for recipient unsubscribe links. Individual emails and explicit test emails remain
available on localhost. Provider sender-domain setup/deliverability and DNS are not certified by
an SMTP connection check. No tracking pixels, opening metrics or guaranteed-delivery claims exist.

### Frontend structure and operational handoff

Email adds MailPreferences, MailAttachments and SafeMailView within its existing runtime owner.
Mailing adds CampaignDelivery and CampaignDeliveryTable in the existing Sales owner. Both use the
shared modal/table engines, localized copy for all eight regional locales and in-memory form state.
Confirmation replaces the same frame. Account preferences sit in the title-bar action menu;
Mailing rows expose Envío y resultados. Campaign launch is a separate explicit review after draft
persistence. Existing templates and save/configure/return navigation remain intact.

New protected routes extend `/api/v1/email/mailboxes/{account}` (preferences, Sent copy, attachment
presign/register/remove/download) and `/api/v1/mailing` (consents; campaign review/results/test/launch/
control). The only new public route is the capability-only unsubscribe endpoint described above.
No export workflow changes are made (N/A). No production release, commit or push is implied.

Rollback must first stop both mail workers and block campaign writes, preserve the encryption key,
database and private objects, and resolve in-flight SMTP/APPEND uncertainty from the retained ledger.
Keep V317/V318 applied. An older draft-only application must not edit launched campaigns; retain the
new non-DRAFT write guard or suspend Mailing access until the current application is restored.
Never remove outbox/consent/audit rows or automatically replay uncertain sends during rollback.


### Completion acceptance evidence — 2026-10-17

- Backend: 55 focused tests passed against `indice_test_db`: mailbox 16, mail transport 9,
  account integration 9, transport security 2, campaign delivery 9, existing Mailing/templates 8,
  migration uniqueness 2. Compilation and Flyway V317/V318 startup passed. Real SMTP/IMAP transport
  is replaced by controlled test doubles in these tests; they do not certify a real provider.
- Frontend: TypeScript and production build passed. Email/Mailing flow/standard tests 9, Sales UI
  regressions 34 and Sales workflow regressions 30 passed (73 total). The existing bundle-size
  warning above 600 kB remains. `git diff --check` passed.
- Local Chrome: saved mailbox preferences, uploaded an 80-byte synthetic TXT through the complete
  private storage registration flow, downloaded it and verified exact byte equality. The attachment
  persisted in the saved draft and appeared in the explicit send review. No send was confirmed.
- Local Chrome: opened campaign delivery review for 20 synthetic contacts, recorded clearly labelled
  synthetic consent evidence for one fixture, and verified 1 eligible / 19 excluded after persistence.
  The unverified fictitious sender and missing public HTTPS URL kept dispatch disabled. Tested the
  review at 391 CSS pixels, including dark mode, then restored normal viewport and light mode.
- Local native `crm.mailing_send` was assigned only to demo membership 17 in company 2. No production
  assignment, real contact consent, campaign launch, external email, commit, push or deployment occurred.
- Resolved validation failures: an IDE/Maven race corrupted generated classes in the main `target`;
  running the same sources with isolated build output passed all backend checks. Upload QA found
  that an existing SSH listener owned IPv4 port 9000 while Docker MinIO owned the IPv6 listener.
  Local storage was repointed to Docker through IPv6 and the existing Vite `/storage` proxy. The SSH
  connection was left intact. Browser file selection used the native macOS picker; extension file
  access permissions were not changed.

Local runtime configuration for this pilot:

- Frontend `127.0.0.1:5175`, backend `127.0.0.1:8083`, functional MySQL `127.0.0.1:13327` /
  `indice_operations_local`. Automated database tests remain isolated in `indice_test_db`.
- Backend `APP_STORAGE_MINIO_ENDPOINT=http://[::1]:9000`,
  `MINIO_PUBLIC_ENDPOINT=http://127.0.0.1:5175/storage` for `make backend`;
  frontend `VITE_STORAGE_URL=http://[::1]:9000`, `VITE_STORAGE_SIGNED_HOST=[::1]:9000` and
  `VITE_BACKEND_URL=http://127.0.0.1:8083`. These are local process settings, not deployment defaults.
- The running backend uses `/tmp/indice-mail-runtime-20261017`, which links the repository sources
  and keeps generated `target` output separate from the IDE. Preserve the existing mail encryption
  key when restarting. Never use an environment dump as restart documentation.

Remaining external acceptance: configure the owner's real domain account inside Email Accounts,
verify SMTP/IMAP, receive/open/reply, explicitly send to an authorized test recipient and verify the
provider's Sent copy. The user has not supplied that account or recipient. Campaign dispatch also
needs the application's reachable public HTTPS unsubscribe page; localhost does not meet this gate.
SPF/DKIM/DMARC and provider sending policies still require provider/domain validation. The current
limit is 30 submissions/hour/account. OAuth, POP3 mailbox import and full historical mailbox import
are outside this SMTP/IMAP increment. Deployment and exports: N/A.


## Connection-test diagnostics — 2026-10-18

Connection-test failures now expose an allowlisted category alongside the unchanged account fields
in the existing `POST /api/v1/email/accounts/{id}/test` response. `failureCode` is null on success;
known categories distinguish authentication rejection, DNS, timeout, connection failure, TLS and
rejected destinations. Unknown provider errors retain a generic explanation. No raw exception,
provider diagnostic, username or credential is returned or logged. A content-free log contains
only the failure category. The category is transient; persisted SMTP/receiving status and audit
semantics remain unchanged.

The UI localizes each category in all eight runtime locales and identifies SMTP versus IMAP/POP3.
Existing endpoints, HTTP success shape/status, permissions, CSRF, ownership, encryption, 30-second
account cooldown, optimistic probe checks and destination/certificate verification are preserved.
No credentials are changed and no messages are sent or read by connection tests. Schema changes:
N/A. Unknown/old-server responses keep the existing generic message.

Files changed: Email account contracts/controller/service/probe and destination exception;
`MailConnectionFailure`; Email API/workspace, `connectionDiagnostics` and locale dictionaries;
focused backend/frontend tests and this contract. Unrelated local work is preserved. Production
deployment and commit/push: N/A. Local runtime rollback keeps the previous immutable artifact;
no database rollback is needed.

Acceptance evidence: 40 focused backend tests passed (`EmailAccountIntegrationTest`,
`EmailTransportSecurityTest`, `MailConnectionFailureTest`, `MailboxIntegrationTest`,
`MailTransportTest`) against the isolated test database. An initial mock-reset error in the new
integration test was corrected before the passing rerun. Frontend connection diagnostics, account/
Mailing regression and mailbox flow tests passed (12/12); TypeScript and production build passed
with the existing large-chunk advisory. `git diff --check` passed. The local backend was restarted
with only the validated Email account classes overlaid on the existing runtime, preserving other
local modules and configuration; no migration or credential change was introduced.

Live local validation: the first real UI probe reported DNS failure. Inspection found a transposed
letter in both saved server names; these were corrected through the account editor without changing
passwords. Subsequent real SMTP and IMAP probes both reached the provider and reported
`AUTHENTICATION_FAILED`. Java TLS validation succeeded on ports 465 and 993, and the SMTP server
advertised LOGIN and PLAIN. Remaining dependency: the account owner must verify/re-enter the current
mailbox credentials or resolve provider account policy before connection can be marked functional.
No message delivery, inbox import or provider credential change was performed by this validation.

## Email operational UI refinement — 2026-10-18

This is a presentation-only increment under the Frontend Operating System. The account catalog
separates SMTP and receiving into labeled panels with the actual host, port, status and last-check
time. Editing is directly visible; disconnection stays in Actions. Open mailbox respects the
existing Mail tab permission. Mailing opt-in is distinct from connection verification. Progress,
success and error feedback are visible; the existing 30-second check interval is explained.

The live mailbox uses shared workspace navigation vertically on desktop and horizontally on phones,
retaining account, query and server-folder controls. Message rows improve subject readability,
unread, starred and attachment indicators. Counts explicitly refer to the loaded page. Reply,
reply-all and forward precede the body. On phones, selecting a message gives space to the reader;
Back restores the list and filters. Copy covers all eight runtime locales and dates use that locale.

Modal classification: `AccountEditor` remains a **Standard Form Modal**, because identity, SMTP,
receiving and Mailing opt-in form one coherent configuration without dependent progression. Dirty
close remains a **Confirmation Modal** in the same frame. `IndiceModalFrame`, the blue header/footer,
visible Cancel, validation, neutral body and 44px controls are preserved. HR and Frontend Operating
System sections 18, 21–24 and 26 govern grouping and master/detail. No modal-width deviation exists.

Folder structure remains `react/src/app/ComplementaryModules/Email`:

- Modified `CorreoEmpresarial.tsx`: permission-aware mailbox navigation callback.
- Modified `EmailAccountsWorkspace.tsx`: account panels, feedback and direct editing.
- Modified `AccountEditor.tsx`: grouped fields, required markers and responsive form styling.
- Modified `LiveMailboxWorkspace.tsx`: responsive mailbox, folder navigation and reader composition.
- Modified `MailMessageDetail.tsx`: action placement, localized dates and reading guidance.
- Created `MailMessageList.tsx`: stateless row presentation; remote operations remain in the owner.
- Created `emailExperienceCopy.ts`: presentation copy through the existing language context.
- Created `react/tests/email-experience-flow.test.mjs`; updated diagnostic test rendering.
- Created isolated visual fixture `react/tests/browser/email-workspace.{html,tsx}` and
  `react/tests/email-workspace-preview.mjs`. Every fixture API request terminates in its synthetic
  server, without a backend proxy or provider access.

State and exportability: existing editor drafts, authorization revision, workspace memory, abort
handling, optimistic versions and owner callbacks are preserved. The extracted list accepts data
and callbacks without persistence, reducing rendering complexity inside the Email owner. No new
state library, shared business abstraction or UI engine is introduced.

Preserved: backend, APIs, payloads, routes, permission enforcement, save/test/sync/send handlers,
TLS and encrypted credentials, empty-password preservation, private ownership, attachments, HTML
sandbox/CSP and uncertain-send recovery. Earlier diagnostic work remains intact. Schema/database
tests, deployment, backend restart, exports and commit/push: N/A for this UI increment. Unrelated
local work remains untouched.

Verification: 16 focused tests passed, covering diagnostics, Email/Mailing contracts, mailbox
flows and the new UI flows: failed-save input retention, blank stored passwords, transport choices,
message selection and reply callbacks. The initial diagnostic test renderer needed the new copy
hook; the corrected suite passed. TypeScript passed. Chrome checks used synthetic data: desktop
accounts, form and list/reader; dark mailbox; 390px iframe viewport for account cards, modal controls
and mobile list-to-reader navigation. Review caught and corrected compressed account names and
action/folder-label overflow. No real account was changed and no email was sent during UI checks.
Remaining inconsistencies in the changed account form: none observed. Physical mobile keyboards
and real delivery were outside this visual acceptance.

Final production build passed (14.73 seconds), retaining the existing warning about chunks above
600 kB; `git diff --check` passed. The live local Accounts page displayed the new panels and retained
its saved configuration. Only the isolated fixture process/tab was stopped; the application remains
available on port 5175.

### Attachment upload correction — 2026-10-18

A failed local upload reached registration as `image/png` but contained a valid JPEG.
The existing content policy correctly rejected the mismatch. Inspection confirmed the same
bytes pass the unchanged server policy when declared as JPEG; storage connectivity and file
size were not the cause.

Email now recognizes PNG/JPEG signatures for files with an allowed image extension and normalizes
only the outgoing filename/MIME. It does not change the source file or transcode its bytes. The
backend continues to verify complete content, dimensions, ownership, versions, quota and immutable
storage before registration. PDF/TXT MIME is populated from the allowed extension when the browser
omits it; backend content checks remain authoritative. Other format families and limits are unchanged.

`mailAttachmentUpload.ts`, `attachmentCopy.ts` and `MailAttachments.tsx` own normalization,
localized safe diagnostics, upload stages and in-memory retry state. No signed URL, file contents
or failure payload enters navigation/browser storage. Retry reuses the same staged upload and
checks for an already committed attachment after a lost registration response, preventing a
second attachment. Expired transfers require reselecting the file. The compose draft and explicit
send review retain their existing owner and persistence semantics. This is a correction within
the existing Standard Form Modal, with no API, schema, credential or permission changes.

Validation: 22 focused frontend regressions passed, including the mislabeled image, preflight
rejections, normalized private PUT/register sequence, interrupted transfer and ambiguous registration
reconciliation. TypeScript and production build passed (existing bundle-size warning remains).
The actual failed file was inspected read-only against the existing Java content policy; no business
record was mutated and no message was sent for verification. The isolated browser fixture can reproduce
compose/attachment uploads with synthetic in-memory data; it has no backend/provider proxy.

Browser QA opened the synthetic compose form, but the native file picker/control did not
complete reliably during this turn. A full new browser upload remains unverified; this does not
replace the successful component-flow regressions and read-only Java validation above.

### Inbox organization and SMTP outcome correction — 2026-10-18

The Email owner now exposes the account's IMAP folders directly in its blue workspace navigation.
The list supports All, Unread and Starred filters before server pagination. Search also matches
recipient addresses, within the selected account/folder and the synchronized cache; it does not
claim full provider search or cross-account CRM ownership. The reader exposes star/archive/trash
shortcuts and moving to any discovered folder. Server Sent messages display recipients in the list.
Entering a remote folder initiates synchronization; periodic refresh pauses while reading or
composing. The workspace retains its account/folder/search/filter through existing scoped memory.

Provider special-use attributes remain authoritative for Inbox, Sent, Archive, Junk and Trash;
custom names are preserved. Spam/No deseado is a view of the provider's Junk folder, not a new spam
engine or a promise to train provider filtering. Drafts and the uncertain/failed sending queue are
explicitly labeled as local Índice state. Accepted SMTP mail and its separate IMAP Sent copy retain
independent truth. This increment does not add folder deletion/rename, shared mailboxes, OAuth,
POP3 ingestion, server-wide body search or unrestricted attachment formats.

New owner mutation: `POST /api/v1/email/mailboxes/{account}/folders` with
`{name, accountVersion}`. Requires session + CSRF, Email entitlement/module/mail tab, active private
account ownership, current account version and the existing account operation lease. Names contain
1–80 Unicode letters/numbers/spaces/underscores/hyphens; nested path/control input is rejected.
Creation uses the provider's personal namespace and upserts only after confirmed provider success.
An existing message-holding folder with the same name is idempotent, preserving its special-use
kind. The existing 100-folder bound applies. No new schema or hard deletion is introduced. Remote
creation and local recording cannot be one transaction; rediscovery/repeating the same name repairs
an interrupted registration. Folder moves retain the existing IMAP MOVE requirement and history.

`GET .../messages` adds optional `filter=ALL|UNREAD|STARRED`, defaulting to ALL for existing clients.
The Sent query no longer keeps a remote accepted message in Sent after it was moved elsewhere.
Search escapes SQL LIKE wildcards and remains tenant/account/version/folder scoped. Payloads,
individual-send idempotency, account encryption, private attachment policy and Sales Mailing's
owner gateway remain compatible.

SMTP now distinguishes explicit sender/recipient/content/size/temporary rejection from a missing
acknowledgement or partial delivery. Only allowlisted codes reach storage/UI; no SMTP response text,
addresses, credentials or exception causes leave the transport. Definitive failures remain FAILED
and require a new reviewed draft; UNKNOWN is never retried automatically. Historical UNKNOWN rows
cannot be retrospectively classified because their original cause was not retained. Connection
probes retain their short limits; actual submission read/write timeouts allow up to 60 seconds,
within the existing absolute socket deadline. This improves tolerance, not a claim that the old
local incident was a timeout: its request completed in under eight seconds.

References for protocol classification: [Angus SMTP exceptions](https://eclipse-ee4j.github.io/angus-mail/docs/api/org.eclipse.angus.mail/org/eclipse/angus/mail/smtp/SMTPSendFailedException.html)
and [SMTP timeout guidance, RFC 5321](https://www.rfc-editor.org/rfc/rfc5321.html#section-4.5.3.2).

Implementation: `MailSendRejection`, `JakartaMailboxTransport`, `MailDraftService`,
`MailboxRepository`, `MailboxService`, `MailboxController`, `MailboxContracts`, `MailboxTransport`;
frontend `LiveMailboxWorkspace`, `MailMessageDetail`, `MailMessageList`, `mailboxApi`,
`MailFolderDialog` and `mailWorkspaceCopy`. The new form uses the existing Standard Form Modal;
navigation, buttons and state feedback use the Frontend Operating System primitives. Copy covers
the existing six languages/eight locale variants. No additional framework or business owner exists.

Validation for this increment: 54 backend tests passed (SMTP/IMAP transport, mailbox isolation,
folder creation, account diagnostics and Sales Mailing delivery); 25 frontend tests passed including
new folder-form failure/double-submit handling, recipient error rendering, custom-folder move and
workspace filter/sync routing. TypeScript and production build passed; the existing >600 kB chunk
warning remains. `git diff --check` passed. An initial UI test mock did not supply the new copy hook;
updating the mock restored the regression and the final suite passes.

Chrome's isolated fixture rendered the new folder navigation and the Unread filter changed 12
messages to 3. Further native UI checks were interrupted by another active Chrome window; a direct
dedicated browser binding also timed out. Reader/move/create behavior has component regression
coverage; a complete live-browser delivery is still pending explicit authorization for a single
self-addressed test message. No real email has been sent or retried by this implementation task.

The local backend was restarted on 8083 with only the validated mailbox package overlaid onto a
copy of the previous runtime. Other module classes/resources, database, credentials and environment
were retained; the previous artifact remains available for rollback. Health and class hashes passed.
The frontend remains served on 5175. All database tests used the isolated `indice_test_db` on 13328,
which was stopped afterwards. Schema migration, production deployment, commit and push: N/A.

Authorized live verification, 2026-10-18: the user subsequently approved exactly one self-addressed
message. The normal local session/CSRF-protected mailbox API submitted the approved subject/body
once, without extracting stored provider credentials. Result: SMTP `ACCEPTED`, IMAP Sent copy
`COPIED`, and one matching message in INBOX with the exact approved body. Read-only correlation
confirmed the same Message-ID and exactly one durable send attempt. A subsequent Sent-folder sync
reconciled the provider copy into the original accepted row; the Sent view contains one matching
message without duplication. The earlier uncertain attempt was never resent or reclassified.
Temporary API sessions were logged out. This closes the pending self-send verification above;
external-domain delivery, provider spam placement and full browser interaction are not established
by this self-addressed test. No application code changed for the live verification.

### Compact mailbox reading workspace — 2026-10-18

The approved presentation refinement prioritizes reading and daily customer correspondence.
The account selector, search, refresh and Compose now share a sticky workspace toolbar; the blue
Indice title bar retains configuration. Desktop uses a narrower folder rail and compact message
rows, preserving sender/recipient identity, subject, date, unread, starred and attachment signals.
Received rows no longer repeat the same status label. Outgoing failure/uncertainty remains visible.
No message bodies are fetched merely to manufacture list snippets.

Provider folders use localized special-use labels. A presentation-only helper removes a leading
`INBOX.` or `INBOX/` from custom labels and disambiguates matching labels with the original name.
It never changes folder IDs, names or kinds, merges folders, or guesses spam authority from a name.
For example, a custom `INBOX.Junk` remains separate from a provider-designated Junk folder named
`INBOX.spam`. Original names remain available in folder details, the current-folder title and move
menu tooltips. Local drafts and sending status have a separate “En Índice” navigation group.

The reader keeps one anchored action bar: reply, star, archive, trash, folder move, and a secondary
menu for reply-all, forward and unread. Draft editing/deletion, failed-message copy and uncertain
send restrictions retain their existing handlers. Full addressing, CC/BCC, provider folder and exact
timestamp are disclosed from Message details. Opening another message resets its reading viewport.
The formatted document has improved typography and borderless layout tables; the text alternative
and protected-view explanation remain available. The HTML document deliberately keeps a white
reading canvas inside the light/dark workspace. Existing backend sanitization, empty iframe sandbox,
no-referrer policy and deny-by-default CSP remain intact; remote images and active content remain
blocked. No backend, API, permission, credential, persistence or sending semantics changed.

Files: `LiveMailboxWorkspace.tsx`, `MailMessageDetail.tsx`, `MailMessageList.tsx`,
`SafeMailView.tsx`, `mailFolderPresentation.ts`, `mailWorkspaceCopy.ts`,
`react/tests/email-experience-flow.test.mjs` and the isolated `email-workspace-preview.mjs` fixture.
The helper is local to Email; navigation, buttons and menus reuse existing shared primitives.
New copy covers the six existing language families and their locale variants.

Verification: 27 focused Email frontend tests pass, including real callback routing for reply,
reply-all, forward and folder moves, uncertain-send restrictions, folder identity preservation,
and the sandboxed HTML/text alternative. Chrome's isolated fixture verified opening, selecting,
moving a synthetic message into Clients and back, reply recipient/subject prefill, address-details
expansion, desktop, narrow-screen navigation/reading and dark mode. Browser error log was empty.
The fixture has no provider/backend proxy; no real mail was sent, moved or removed for this change.
TypeScript and production build passed; the existing bundle-size warning remains. The live local
Email tab was inspected read-only and displayed the updated controls; its route returned HTTP 200.
`git diff --check` passed. Backend/database tests, schema migration, runtime restart, deployment and
push: N/A.

### Folder rail and focused reading — 2026-10-18

The approved daily-use refinement adds a desktop folder toggle. The compact rail retains every
folder's icon, accessible name and hover title, with a distinct selected marker. Its boolean layout
preference uses the existing company/user-scoped `email/mail` workspace-memory contract; account and
filter changes retain it. Mobile uses the existing Sheet component with complete labels, focus
containment, an explicit close button and focus return. Selecting a folder closes the drawer;
creating one hands off to the existing folder form. Drawer visibility is transient.

Folder navigation has a neutral sidebar with a blue selected marker; message filters have an
underline; organizing actions have a separate neutral toolbar. Compose remains the primary action.
The existing title bar is compact and names its configuration menu explicitly. On phones the
account selector occupies its own row so the selected mailbox remains readable.

“Ampliar lectura” temporarily hides both folder rail and message list. The list stays mounted;
returning restores its scroll position and the same selected message without an additional list
or open request. The reader is centered for readable line length. “Volver al buzón” and Escape
return to the prior rail layout; dialogs and menus retain ownership of Escape. Neither expanded
reading, message selection nor message content is persisted. Provider folder identity, sync,
SMTP delivery, permissions, draft recovery and safe HTML boundaries remain unchanged.

Files for this increment: `LiveMailboxWorkspace.tsx`, `MailFolderRail.tsx`, `mailWorkspace.css`,
`MailMessageDetail.tsx`, `mailWorkspaceCopy.ts`, optional presentation props in
`IndiceWorkspaceNavigation.tsx`, and focused regressions in `email-experience-flow.test.mjs` /
`system-tools-navigation.test.mjs`. Existing navigation variants retain their defaults.

Validation: all 48 focused Email, shared-navigation and workspace-memory regressions passed,
including scope isolation, restored-layout normalization, list/selection retention and no extra
requests when changing layout. TypeScript, production build and `git diff --check` passed; the
existing >600 kB bundle warning remains. Chrome's isolated synthetic fixture verified compact and
expanded rails, expanded reading, menu/Escape precedence, list return position, light/dark styling,
and the 390px mobile drawer including folder selection and the new-folder form handoff. Browser
error log was empty; intermittent automation timeouts recovered through the existing tab binding.
No real mail was sent or moved. Backend/database/schema/deployment/push: N/A for this increment.

### Restrained mailbox color accents — 2026-10-18

The user-requested visual refinement adds soft blue workspace surfaces and selected/unread rows,
lavender reading actions, and small aqua/lavender folder icons and correspondent avatars. A stable
address-derived tint stays with each correspondent without storing or exposing an additional
identifier. Blue remains the selected-state and primary-action color. Amber remains associated
with starred mail and the provider's spam folder; delivery status is never inferred from an avatar
or folder color. Text, accessible labels, icons and unread indicators retain their meanings.
The sender context gains a soft blue surface while the document canvas stays white. Light/dark
styles retain the existing folder, drawer, focus, selection and expanded-reader behavior.

Affected frontend files: `LiveMailboxWorkspace.tsx`, `MailFolderRail.tsx`, `MailMessageList.tsx`,
`MailMessageDetail.tsx` and `mailWorkspace.css`; the Frontend Operating System records the narrow
supporting-accent decision. API, provider operations, safe HTML, sending, permissions, routes and
workspace-memory semantics are unchanged. Backend/schema/deployment: N/A.

Validation: 37 existing Email/navigation regressions, TypeScript, production build and
`git diff --check` passed. Chrome's isolated fixture was reviewed in light/dark themes, compact and
expanded rails, and a 390px mobile drawer. No browser errors were recorded and no real message was
sent, moved or removed. Aqua initial contrast was raised to 5.49:1 on the selected-row background;
blue and lavender initials also exceed 4.5:1. The existing >600 kB build warning remains. No new
test suite was introduced for this presentation-only refinement.

### Canonical title and filter composition — 2026-10-18

The user's request to align the live Mailbox with the Frontend Operating System supersedes the
earlier compact title and combined account/search/action toolbar. The shared `IndiceTitleBar`
now retains its standard title, icon, descriptive subtitle and responsive spacing. Compose is
the primary action; Refresh and Preferences are direct secondary actions. When Accounts access
is available, it occupies the shared neutral Actions overflow as the fourth eligible action.
With only three eligible actions there is no overflow. Existing Accounts permission remains
authoritative; the empty-account state retains its existing connection action.

A separate `IndiceFilterBar` uses shared search/select/disclosure primitives. Search is first,
followed by mailbox account and All/Unread/Starred. There are no invented unit/business, date or
advanced filters. Inline search clearing preserves the status filter; Clear filters resets query,
status and paging while retaining the account, folder and collapsed-rail preference. Account
changes reset the folder to Inbox and clear query/status; unknown account IDs are ignored.
Remote search is debounced by 300 ms, cancels superseded requests, and returns to the first page.
The workspace row names the current folder and the number of messages on this page, without
claiming a global total. The existing 25-item API paging contract remains unchanged.

The folder rail, message list and reader keep their distinct soft-color surfaces. The empty reader
reuses `IndiceViewState` without a second nested card. Phone filters hide while reading a message
and reappear when returning to the list. Accounts was reviewed and already uses the shared
title/subtitle/action anatomy; its provider configuration flow is unchanged.

Implementation handoff:

- Folder structure stays under `react/src/app/ComplementaryModules/Email/`; shared presentation
  remains in `react/src/app/components/frontend-os/` and tests in `react/tests/`.
- New `MailWorkspaceFilters.tsx` owns controlled filter presentation only. Extracting this cohesive
  block replaces duplicated inline filter/action markup and keeps the mailbox owner focused on
  scope, requests and message operations; it adds no new state or fetching layer.
- Modified `LiveMailboxWorkspace.tsx` composes the title, filters and workspace, owns filter-change
  callbacks and continues to use `useWorkspaceNavigationMemory` for company/user-scoped state.
  `MailMessageDetail.tsx` adjusts only empty-state presentation. `mailWorkspaceCopy.ts` supplies
  the new labels and subtitle for all six existing language families.
- `react/tests/email-experience-flow.test.mjs` covers the controlled filters, debounce, reset,
  paging, account scope, layout preference, Compose routing and permission-sensitive overflow.
  The two documentation files record this approved composition.
- Exportability: the new presentation component depends only on Email copy/types and existing
  shared controls. It can move with its Email owner without transferring domain authority into
  shared UI or adding routes, global state or backend dependencies.
- Preserved: SMTP/IMAP, API payloads, routes, provider folder identities, permissions, safe HTML,
  draft/send workflows, account ownership, workspace-memory scope, mobile folder drawer and
  expanded-reader/list-position behavior. New modals, backend/schema work and deployment: N/A.

Verification: 39 focused Email/navigation regressions, TypeScript and production build passed.
Chrome's isolated fixture verified no-read/starred/search filters, inline and full clearing,
Compose opening with the selected account, collapsing folders, expanded reading, and light/dark
styles. At 390 px, the shared filters and folder drawer work with no horizontal overflow; opening
a message hides filters and returning restores them. No browser errors were recorded. The fixture
uses synthetic mail without a provider/backend proxy; no real email was sent, moved or deleted.
The existing production-build warning for chunks over 600 kB remains.

### Sales contact audience extension — 2026-10-18

The [Mailing contact audience contract](sales-mailing-contract-v1.md#contact-audiences-and-campaign-history--2026-10-18)
adds filtered contact selection, static saved lists, eligibility preview and contact campaign
history. Sales owns those records and endpoints. Email account privacy, SMTP verification,
credentials, the owner gateway, recipient send ledger, quota, suppression and explicit launch/test
confirmation remain unchanged. New campaigns personalize `{{name}}` from contact person with a
company-name fallback; launched snapshots remain immutable. No real email is sent by audience or
list operations.


### Daily mailbox and composer — 2026-10-21

The approved first stage improves daily mailbox organization, drafting and attachments. It does
not introduce conversation grouping, a shared team inbox or automatic CRM follow-ups. Existing
Email and Sales owners, routes, entitlements, CSRF, private-account access and send quotas remain
in force. No real send is part of this implementation's validation.

- **Organization:** selection applies only to received remote messages on the current 25-item
  page. Read/unread, archive and move reuse the existing versioned per-message endpoint serially.
  Successful rows update immediately; failures remain selected and are reported as unconfirmed.
  A new account/folder/filter/page clears selection. There is no automatic retry of an uncertain
  provider mutation and no bulk permanent deletion. Unmount/account changes stop further work.
- **Layout:** comfortable/compact density and list width (260–440 px) join the existing scoped
  workspace navigation preferences. They do not persist message bodies or selected messages.
  The standard title bar, filters, colored folder rail, mobile drawer and expanded reader remain.
  Explicit refresh preserves the open reader, updating its version/flags when present in the list.
- **Counts and freshness:** `Folder.unreadCount` is additive and counts unread **synchronized**
  messages across that folder's cached pages, scoped by company, account, account version,
  folder, UID validity and remote presence. It is not a claim about unsynchronized remote mail.
  While reading, a visible page checks the current list every 60 seconds and offers an update
  when a newer synchronized message appears. Receiving new server mail in that state relies on
  the existing opt-in background synchronization preference or an explicit refresh.
- **Drafting:** complete recipient addresses become removable chips; CC/BCC may be collapsed
  without clearing their values. Drafts autosave after 1.5 seconds of inactivity. Stable IDs and
  optimistic versions serialize autosaves, manual saves and attachment registration. Text typed
  during a save remains dirty until its own save completes. A failed autosave pauses retries and
  leaves the input visible. A manual retry first reconciles a lost save response against the stored
  draft/version; a conflicting editor is never silently overwritten. Closing with unsaved changes retains the existing discard decision.
  Review and explicit send remain separate; a lost send response requires a status check and
  never triggers an automatic resend. New composition never inherits the open message's audience.
- **Formatting:** the Email-owned editor supports selected-text bold, italic, bullets and removal
  of formatting, plain-text paste and the existing HTML/text draft alternatives. The backend's
  `SafeMailHtml` remains authoritative, including in transport; preview remains sandboxed.
- **Signature:** migration V342 adds `email_mailboxes.signature_text` (up to 2,000 characters).
  The existing owner-checked, CSRF-protected, versioned preferences API adds `signature`.
  Omission preserves the value for older clients; an empty string clears it. Insert signature is
  explicit and uses the current account's private preference, without altering recipient scope.
- **Sales library:** the composer consumes Sales' existing read contracts `/api/v1/mailing/contacts`,
  `/api/v1/mailing/templates` and `/api/v1/mailing/templates/{id}`. Contacts require both
  `crm.contacts` and `crm.mailing`; templates require `crm.mailing`. Existing backend guards remain
  authoritative. Search is debounced/cancelled and limited to 25 results. Template details are
  loaded on selection (list responses omit the body), appended to the draft, and fill only an
  empty subject. Placeholder variables remain visible for review, not implicitly personalized.
  This grants no access to another user's mailbox and creates no CRM record or campaign.
- **Attachments:** add DOCX/XLSX/PPTX to PDF, PNG/JPG and UTF-8 TXT. Preserve five files, 5 MB each,
  10 MB total and private storage. Server validation bounds ZIP expansion and XML parsing,
  verifies OOXML content type/main part, and blocks macros, embedded packages, external data
  relationships, path traversal and active content. Hyperlinks are permitted; documents are not
  executed or rendered. Legacy DOC/XLS/PPT, macro-enabled formats and general archives remain
  unsupported. This is format validation, not antivirus certification. Incoming attachment
  downloads use the same policy.
- **Send status:** the accepted state explicitly means acceptance by the sending server, not
  confirmed recipient delivery. Failed/unknown items remain in “Envíos por revisar”. Credentials,
  SMTP configuration and the immutable send ledger are unchanged.

Implementation remains in the Email frontend owner and mailbox backend package. New UI helpers
are `MailBulkActions`, `MailComposerLibrary`, `MailRecipients`, `MailRichEditor`, `mailBulk` and
six-language `mailDailyCopy`; no new shared state, modal framework or rich-text dependency is added.
Regression coverage includes autosave races/failures, explicit send and uncertain-result recovery,
bulk partial results/scope changes, private signatures, unread counts, OOXML validation and the
isolated desktop/mobile browser fixture. Database validation uses only `indice_test_db`.

Verification for this stage: 38 focused frontend regressions and 41 backend/migration tests pass,
as do TypeScript and the production frontend build. Chrome and WebKit exercised bulk read state,
reader-preserving refresh, density/width, account signature, Sales contact/template insertion,
formatting, autosave, a synthetic attachment and mobile review at 390 px, without browser errors
or real sends. V342 applied successfully in the isolated Flyway startup and is present in the
functional local schema; `/api/v1/health` and the local mailbox route respond successfully.
The build retains its existing large-chunk advisory. An initial test database startup failed
because Docker's disk was full; rerunning on an isolated tmpfs test database passed, and 1.26 GB
of unused build cache was reclaimed without changing functional volumes. No deployment or push
was part of this stage; unrelated concurrent workspace changes were preserved.


## Professional composition and operational KPIs — 2026-10-22

This approved increment supersedes the earlier limited-format/signature/contacts descriptions.
Existing private-account ownership, tenancy, entitlements, optimistic versions, CSRF, send review,
SMTP idempotency, uncertain-outcome handling, limits and quotas remain authoritative.

- **Recipients:** reusable Sales audience read endpoints provide name/email autocomplete and
  selection by source, salesperson, tag and saved list. Both `crm.contacts` and `crm.mailing`
  remain required; only eligible addresses are offered. The individual draft accepts at most
  20 unique addresses across To/CC/BCC. Filtering never automatically adds or sends to contacts.
- **Editor:** shared `components/mail-editor` provides seven fonts, bounded sizes, bold/italic/
  underline, text/highlight colors, alignment, lists, safe links, embedded PNG/JPEG, undo/redo and
  plain-text paste. Native editing preserves browser undo; its deprecated command API is isolated
  to this adapter and requires future browser compatibility monitoring. It introduces no library
  or second modal engine. HTML is bounded to 500,000 characters; plain draft text stays at 20,000.
- **Safe formatting:** frontend and backend whitelist passive tags/styles. Remote image loading,
  tracking pixels, scripts, credentials in links and active content are excluded. Up to three
  PNG/JPEG images of 100 KiB decoded each are validated by the server and transported as related
  MIME CID parts. Original editor uploads are resized locally; attachments retain their own quota.
  Preview remains a white sandboxed document with no scripts or same-origin privileges.
- **Templates:** Email reuses Sales templates with optional `bodyHtml`, detail-on-selection,
  append/replace preview and unresolved-variable review guard. Inserting after an untouched
  automatic signature positions the template above it. Mailbox Preferences exposes the existing
  Sales TemplateManager; permissions still govern read/create/edit/archive/restore. Template bodies
  never appear in list responses. Sales campaign persistence and delivery retain the same format.
- **Signature:** V345 adds optional `signatureHtml`, `signatureNew` and `signatureReply` to the
  existing private-account preferences contract. Each is versioned and scoped by user/company/account.
  Legacy omission preserves values; edited legacy plain text clears obsolete HTML. New automatic
  settings default off. Saved drafts never receive a duplicate automatic signature.
- **PDF correction:** a passive OpenAction page destination is permitted; action dictionaries,
  JavaScript, forms, password protection and embedded files remain rejected. Distinct localized
  reasons identify password, form, active content, complexity or damaged content. Existing safe
  Office/PNG/JPEG/TXT limits and registration reconciliation are unchanged. Format validation is
  not antivirus certification. The reported original PDF was not provided; generated safe and
  unsafe samples cover policy behavior.
- **Layout:** canonical title and filters remain shared, with Compose primary, Refresh/Preferences
  secondary, Accounts and Expand/Restore in Actions. Expanded mailbox retains search, selection,
  reader and draft. Expanded composition and phone full-height composition preserve editable input.
  Editor toolbar scrolls horizontally; modal body scrolls independently of its title/actions.
- **KPIs:** new protected `GET /api/v1/email/mailboxes/{account}/counts?query=...` returns typed
  `{unread,starred,drafts,review}` aggregate counts. The private-account read boundary and module/tab
  authorization apply. Query is limited to 180 characters and uses literal escaped matching of
  subject, sender, To and CC. Counts ignore current folder/status/page but honor account/search.
  Unread/Starred require current account version, folder UID validity, remote presence and Inbox;
  Drafts use DRAFT; review uses SUBMITTING/UNKNOWN/FAILED. Cards navigate/reset page and selection;
  pressing the active card returns to Inbox/All. Loading/error never displays stale counts.
  These are cached operational counts, not remote-unseen totals, recipient reads or revenue KPIs.

V345 is additive and forward-only. Local rollout backs up the functional database, preserves the
running service configuration and overlays only compiled Email/Mailing classes and V345. Previous
runtime and source copies are retained. Production activation and real sending are outside this
validation. External rendering in Outlook/Gmail and final provider attachment limits still need
provider-specific acceptance before a production release.
