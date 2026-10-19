# Production activation continuation — 2026-10-19

Status: DEPLOYED / VERIFIED. Activation, post-deployment verification and the
ten-minute canary passed. This continuation supersedes the current-status
statements in the earlier preparation report; its historical evidence remains intact.

## Authorized scope and exact revisions

The owner confirmed `app.indiceapp.com` and then instructed "ignora stripe y continua".
The narrow historical TEST-key replacement decision is
[recorded separately](../decisions/2026-10-19-production-stripe-deferral.md).
No new payment/provider activation, catalogue publication or external email send is authorized.

- Primary source: `3df8e17dd380dc845317dde534e4b58151196043`, branch `release/production-20261019`.
- Compatible recovery: `0c2f6a150dbbec015d8225fc2fd0b7acc3fcd484`, branch `release/recovery-20261019`.
- Frontend/MCP source remains byte-identical to `5dac3bf0bcb8`; retain those scanned immutable images.
- Both branches are pushed. The original dirty workspace is preserved.

## Acceptance found and corrected a cold-cache defect

Real HTTP acceptance uses the immutable backend, a disconnected network namespace,
an isolated synthetic database, mandatory MFA and an in-memory SMTP sink. It does
not use real accounts, send external mail or alter production data.

Initial failures were recorded, not suppressed:

1. Correo returned 403 for a default-disabled module. The synthetic fixture now explicitly
   activates a pilot and grants its test companies access; production assignment stays unchanged.
2. The 15-second HTTP fixture timeout expired while disconnected FX providers timed out.
   The fixture now allows 60 seconds and uses a one-second provider timeout in isolation only.
3. Sales Board returned HTTP 500 with no daily exchange snapshot. A new MySQL regression
   reproduced the error in both refresh entrypoints: the cache insert inherited its caller's
   read-only transaction. The refresh now owns a separate transaction; the reporting caller
   remains read-only, and its rollback does not erase the shared cache. Calculations, source
   validation, tenant scope and schema are unchanged. Both regression cases pass after the fix.
4. Learning reads now carry the actor header required by their existing contract.

Only the last defect changed application code. Both primary and recovery contain the fix.
Focused exchange-rate and Sales Board regressions passed. The final local backend suite
passed 3,697 tests with one opt-in historical skip and no failures/errors. Recovery passed
its 14 focused tests after the same fix. Real immutable-backend HTTP acceptance passed:
mandatory MFA, invalid OTP, authenticated module reads, limited-role denial, CSRF denial,
tenant/actor isolation, persisted preferences and session revocation. No external mail was sent. The updated exact-source CI completed successfully at 13:21 UTC:
https://github.com/nahumsini/Indice_base_SAAS/actions/runs/39256633382.

## Recovery and backup

The previous primary/recovery pair (`5dac3bf0bcb8` / `492e5a56`) completed a disconnected
restore of actual V299 data, upgrade to V331, primary startup, recovery restart with the old
MCP and protected endpoint denial. Original migration history, business rows/columns and
billing catalogue/subscription versions remained unchanged under the documented comparison.
The final pair adds only the shared cache fix and its test; migrations are identical.
The final `3df8e17dd380` / `0c2f6a150dbb` pair was then independently rehearsed on the
fresh `production-20261019T125018Z` backup: both runtimes and MCP health/readiness passed,
anonymous access was denied, retained business data and billing matched, and prior Flyway
checksums remained intact. All rehearsal containers and extracted object copies were removed.

Recovery retains V331 authentication, invitation/access, notifications, email encryption,
outbox guards, messaging ownership and financial owners. It restores earlier Postventa and
Sales Board ordering and disables the newer Whatsapping controllers. It is a bounded feature
fallback, not a claim that retained shared-code defects disappear. Never run the old V299
backend on V331 or erase data to roll back.

The rehearsal used backup `production-20261019T125018Z`. A further protected
SQL/MinIO/environment backup, `production-20261019T131341Z`, was completed immediately
before the activation window under the same release backup directory. All five SHA-256 entries and both gzip archives passed verification.
Only the unmounted extracted rehearsal object copy was removed; original archives remain.

## Confidential diagnostics follow-up

The preparation report describes the earlier broad-inspect diagnostic mistake. Its helper
was corrected to select only needed fields and suppress raw command errors. Artifact/source
scans contain no real credentials; no raw diagnostic was committed or published. The private
operator transcript remains confidential. External dissemination has not been established;
credential exposure/rotation assessment remains an owner operations follow-up, not a claim
of resolution. Do not reproduce values or rotate unrelated applications blindly. The Stripe
exception does not extend to other credentials.

## Verification limits

Prior owner UI reviews and the final deployment instruction are retained as product acceptance
context. Automated target-like HTTP tests and prior frontend flows do not constitute a new
human walkthrough of every production role/device. Record only checks actually performed;
physical terminal/payment execution and real outbound mail are outside this deployment smoke.

## Final immutable images and dry run

| Component | Image / ID |
| --- | --- |
| Backend | `indice-erp-backend:3df8e17dd380` / `sha256:bcd9387df7fd26309e95fdae6ff3ccd249181da081d1267ba6625640a36352d8` |
| Compatible recovery | `indice-erp-backend:0c2f6a150dbb-recovery` / `sha256:6a2a34a8bf34f0eae6a018f767c411046ec53ab65f9da1f8ba6eea180e343e63` |
| Web | `indice-erp-web:5dac3bf0bcb8` / `sha256:ba4ab13948e9c2d21589294c5b7475661f679917c37047023d69f46ca16a96f0` |
| MCP | `indice-erp-mcp:5dac3bf0bcb8-osrefresh` / `sha256:fa66f65b6f3ad25ffb3292ee14c9f73f8df478cbe48137766ab69357ba23cb58` |

Both final backend scans contain zero secrets and only the same two conditional Spring MVC
findings analyzed in the preparation report. They are unpatched dependency findings whose
triggering XSLT/wildcard view and Spring SSE rendering features are absent from this source.
Web/MCP remain the previously scanned unchanged artifacts. Final image SBOMs are retained.
The real-target dry run passed with the exact final recovery argument and no container changes.

## Durable configuration and recovery entrypoint

Use the production-specific protected environment at
`/root/indice-production-release-20261019/production.env` and checkout
`/root/indice-production-release-20261019/source-3df8e17dd380` for subsequent operations.
Do not substitute the APPTEST environment or the historical pre-email configuration.
The new mail-account encryption key and its protected server backup must be retained.

The retained `indice-erp-backend-1-rollback` must be the compatible `0c2f6a150dbb`
image, together with the previous web/MCP/MinIO containers. Follow `deployment/README.md`
and the mail/financial owner recovery procedures, including controlling queued external work;
never start the uniquely retained `-pre-upgrade` V299 backend against V331. A defect in
shared retained owners requires containment and a forward fix rather than assuming the
bounded fallback reverses it. Database and object volumes are never deleted for rollback.

## Activation and observation

Activation started at **2026-10-19 13:21:29 UTC** after successful exact-source CI and
an unchanged-runtime/schema/provider guard. Activation and public verification completed
at **13:22:55 UTC**. All four services run the intended images with zero restarts.

Post-activation checks passed:

- Schema V331, zero failed migrations and unchanged historical migration checksums.
- Billing prices and subscription catalogue-version counts unchanged from the fresh backup.
- Existing protected authentication/payment configuration and five provider secret sources preserved.
- New mail-account encryption key matches its protected backup.
- Public anonymous requests to protected owners return 401.
- Public frontend index matches the immutable web image; CSP, HSTS and nosniff are present.
- Public web, backend, storage, CSRF/login routing, MCP/OAuth discovery and support smoke passed.
- APPTEST image IDs and complete runtime-environment fingerprints unchanged.
- The existing authenticated Lupita connector still resolves the same user, company, membership,
  role and operational scope; no mutation or private field values were retained in evidence.
- Chrome loads the new login page; the password-recovery modal opens and closes correctly.
  No real login credentials were submitted and no recovery message was requested.
- Startup log review found zero ERROR/FATAL/OutOfMemory lines.

The production observer completed all eleven samples over ten minutes, ending at
**2026-10-19 13:33:13 UTC**: web/API/storage/MCP returned HTTP 200, all four services
remained running with zero restarts, and no new backend ERROR/FATAL/OutOfMemory lines
were detected. No rollback was needed.

The protected remote `release-manifest.json`, `production-canary.json` and
`production-canary.log` record the final result and are also retained in the protected
local evidence directory. The manifest status is `DEPLOYED_AND_OBSERVED` and identifies
the exact application source, immutable images, compatible recovery and backup above.
Documentation committed after activation does not change the deployed application revision.

The historical Stripe TEST-key finding remains unresolved under the owner's one-release
deferral. Its authorization window is now closed and cannot be reused for another release.
The confidential diagnostic assessment described above remains open. Neither follow-up
is represented as resolved by successful runtime observation.
