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
   must not be blindly retried. Consent, suppression and authenticated unsubscribe must precede
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

### Sales campaign delivery ownership and consent

V318 extends campaign statuses to DRAFT, SCHEDULED, RUNNING, PAUSED, COMPLETED and CANCELLED. It adds
consent/suppression and evidence history, durable run configuration and one delivery per normalized
email address. Existing campaigns stay DRAFT. Existing V313–V316 migrations are unchanged.

New native `crm.mailing_send` permission plus current administrator role, CRM/Mailing/Contacts access
and mutation entitlement is required to record consent, test, launch, schedule or control a campaign.
The private sender owner must also retain Email/Mail access and explicitly opt that account into
Mailing. No new permission is automatically granted to existing production memberships.

Review is computed by the backend: current account version and verified SMTP status, normalized
recipient addresses, duplicate/invalid/consent/suppression exclusions, campaign version and an audience
digest. Launch rechecks all of these under the company lock. Only consented recipients enter the
snapshot; names and addresses are frozen. Content is locked against draft edits after launch.
`{{name}}` is personalized from the frozen recipient name. A contact footer and unsubscribe link are
included per recipient. The preview distinguishes eligible and excluded recipients explicitly.

Consent is an explicit operator record of verified permission, with evidence and the actual date;
it is not inferred from selecting a contact or creating a campaign. A recorded unsubscribe cannot
be cleared by the consent action. Suppression is checked again immediately before authorizing each
submission. Pause/cancel prevent pending submissions; a submission already authorized may finish.

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
