# Identity and evidence security boundary v1

Status: approved corrective extension for the five findings reviewed on 2026-10-23.
Owner: HR for employment data, user administration for access, Finance for financial evidence,
Billing Storage for quota, deployment for proxy logging.

## HR employment and global identity

- `users` and `user_profiles` describe the global account. HR never updates them for an existing
  account. The account's login/recovery address cannot be changed through employment writes.
- `user_work_profiles.work_first_name`, `work_last_name`, `work_email` and `work_phone` belong to
  one company and employment. `hr_users` preserves its existing response columns using these
  tenant-owned values. Existing employment contacts are snapshotted by V349.
- New HR accounts receive only `user` authority. Existing accounts can receive an HR profile only
  when they already have an active membership in that company. Otherwise use the native invitation
  acceptance flow. A duplicate profile must use the scoped update action.
- HR rejects a requested role change, including aliases and nested user payloads. Native user
  administration retains role delegation, protected-account and self-change rules. Employment
  deactivation/termination still revokes company access; editing employment cannot reactivate
  access disabled by user administration.
- No account email-change endpoint is introduced. Any future login-address change must use an
  owner-verified identity flow, rather than an employer's HR authority.

## Financial evidence

- Expenses, budget lines and petty-cash receipt attachments issue browser URLs for a temporary,
  server-generated object only. V350 persists company, owner, expected size/type and expiry in
  `finance_attachment_uploads`; an arbitrary client-provided path is not upload authority.
- Registration locks that authorization, copies the uploaded bytes to a new private `sealed/`
  object, validates the copy's actual size/type, computes SHA-256 over that copy and registers its
  key and digest in the owner transaction. No browser PUT URL is issued for the final key.
- Retrying one upload returns the same sealed object. Failed owner transactions delete the final
  copy and preserve the temporary reservation for retry. Existing accounting, payment evidence
  fields, native permissions and download authorization remain owned by their existing services.
- The native Storage Meter moves the reservation to the final object. An abandoned upload releases
  its reservation. Temporary objects remain eligible for cleanup until their browser write URL has
  expired; deleting them early alone would allow a still-valid URL to recreate an orphan.
- Financial kiosk descriptors explicitly declare `ownerSealsOnRegister`. Engine verifies the
  owner's final object against the same file intent and adopts that final key; it does not
  recommit a staging reservation already moved by Finance. Other kiosk policies are unchanged.
- Existing attachments remain readable and are not assigned an invented historical digest.
  Already-issued legacy URLs cannot be remotely revoked by a source-code change; their actual
  maximum TTL must expire before declaring the old write capabilities closed. Unregistered legacy
  uploads must request a new authorization after activation.

## Attendance photos

- All native attendance photo upload entry points require the actual positive `size_bytes`, with
  a 5 MiB limit. Session, public kiosk and employee-center clients send the captured file size.
- The company Storage Meter reserves quota before issuing an exact-length URL. New photo intake
  initializes the company's native storage ledger, including previously unmetered companies.
- Associating a photo checks the authenticated tenant/user prefix, actual stored size/type and
  reservation. Its commit participates in the attendance transaction. Expired pending reservations
  use the existing quota cleanup and release mechanism. URL TTL is shorter than reservation TTL.
- Historical attendance references remain readable. This change does not guess historical sizes
  or delete old untracked objects; any retrospective inventory must be scoped and reviewed.

## Recovery-token logs

Both shipped web proxies redact `/reset-password/` and `/api/v1/auth/password-reset/` token paths.
Their access format continues to exclude query strings, referrers and cookies. Nginx's raw error
request logging is disabled only for recovery routes; ordinary operational diagnostics and backend
correlation remain available. This does not attest to an external ingress proxy or retained logs
that have not been inspected in the target environment.

## Activation and verification

Use the canonical deployment and rollback workflow. Run V349/V350 only after verifying the target
migration lineage. This branch follows the local Agenda lineage through V348; the separate,
unmerged WhatsApp worktree also uses V348–V351 with different migrations. Do not combine those
migration directories, rename applied migrations, repair Flyway history or launch either branch
against the other's database. Consolidating those lineages is a separate release decision.

Backend checks use only the verified tmpfs MySQL launched by
`deployment/tests/run-security-findings-isolated.py`. Regression coverage includes two-company
identity isolation, role aliases, recovery recipient preservation, immutable copies, transaction
rollback, native quota cleanup and kiosk owner adoption. Nginx log tests run both real proxy
configurations in disposable containers with synthetic tokens and no published ports.

An application rollback retains the additive schema and evidence. Returning to the old vulnerable
writer reopens the findings; an emergency rollback must also restrict HR writes and financial
uploads at the operational boundary until the corrected writer is restored.
