# Production release preparation — 2026-10-19

Current status: DEPLOYED / VERIFIED. This document preserves the historical preparation
checkpoint; final activation, exact revisions and the successful ten-minute observation
are recorded in [the activation report](2026-10-19-production-activation.md).
Stripe revocation remains unresolved under the owner's single-release deferral.

## Owner deployment confirmation — 2026-10-19 07:44 UTC

The owner explicitly reconfirmed production deployment ("confimro el despliegue").
No further deployment permission is needed. This confirms the target/action; it
does not state that the historical credential was revoked or replace the release
security requirements.

A fresh read-only Stripe authentication check returned HTTP 200 for the single
historical TEST credential: revocation remains FAIL. Only the status was emitted;
no credential was printed. The exact candidate worktree remains clean at
`5dac3bf0bcb8239407fc60b57e6c4ffa0304a8e0`.

Read-only target checks confirmed the same three production web/backend/MCP image
IDs recorded below, all running, public HTTPS HTTP 200 and 17 GiB disk available.
No activation, live migration, container replacement or environment mutation was
performed during this confirmation check.

Recovery review reaffirmed that the old backend alone is not an approved fallback:
the release runbook requires preserving invitation/access checks, single-use
password resets and session revocation, notification source authorization and
mail/outbox history. `DEPLOY_BACKEND_RECOVERY_IMAGE` must identify an immutable
replacement rehearsed on V331 before activation. The prior candidate restore
proves migration/startup only; compatible recovery certification remains open.
The verifier incident review and current authenticated acceptance also remain
open. The existing October 6 exceptions are not extended by this confirmation.

## Authority and exact candidate

The owner explicitly requested production at `https://app.indiceapp.com`. The
original working tree remains on `codex/continuacion-20261016`; it was not reset,
stashed or cleaned. Its current source was captured in an isolated worktree.

- Release branch: `release/production-20261019`, pushed to origin.
- Application/test commit: `5dac3bf0bcb8239407fc60b57e6c4ffa0304a8e0`.
- Candidate source: `/tmp/indice-production-candidate-20261019`.
- Protected local evidence: `/tmp/indice-production-evidence-20261019`.
- Protected remote preparation: `/root/indice-production-release-20261019`.
- Source archive SHA-256: `62a6d622d4a95adb4bfa84ab18f287db339255bacd547de2bc7ea498e244da39`.
- CI: https://github.com/nahumsini/Indice_base_SAAS/actions/runs/39215026185

The candidate matches all tracked source files of the original working tree as
checked during preparation. This handoff is evidence written after the source
snapshot, not an application change included in that artifact.

## Built artifacts

All three are built from the exact application source above. The first backend
image and the initial MCP image were superseded by OS refreshes; retain them
only as preparation evidence, not as approved fallbacks.

| Artifact | Immutable image identifier |
| --- | --- |
| `indice-erp-backend:5dac3bf0bcb8-osrefresh` | `sha256:b85dc588a0525bd110c3d2f834e8a37fa5c3e413e03dbbbdcec6655c820166ba` |
| `indice-erp-web:5dac3bf0bcb8` | `sha256:ba4ab13948e9c2d21589294c5b7475661f679917c37047023d69f46ca16a96f0` |
| `indice-erp-mcp:5dac3bf0bcb8-osrefresh` | `sha256:fa66f65b6f3ad25ffb3292ee14c9f73f8df478cbe48137766ab69357ba23cb58` |

## Changes required by integration checks

- Updated synthetic MVC fixtures to mock the global learning response advice;
  its own regression coverage remains enabled.
- Updated frontend test loaders for existing image/component imports and current
  platform-administration loading behavior.
- Completed the learning catalogue for the current Sales, Email, Sales Board and
  Maintenance tabs: 83 chapters across 15 modules, with both locales. The new
  chapters add no execution tools, grants or authorization changes.
- Updated catalogue assertions to cover the current tab identities rather than
  stale historical counts. The Sales guide explicitly checks that its four new
  tabs expose no additional AI actions.
- Removed one trailing blank line reported by `git diff --check`.

Original local work was preserved. Integration corrections were copied back only
when the corresponding original files still matched the captured version.

## Completed checks

| Check | Result |
| --- | --- |
| Full local backend suite, isolated MySQL | PASS: 3,696 discovered; 3,695 passed, one opt-in skip; no failures/errors |
| Full frontend regression suite | PASS: 1,232 |
| MCP suite/build | PASS: 158 |
| TypeScript and production frontend build | PASS; existing bundle-size advisory remains |
| Deployment recovery command regression | PASS locally: 16 |
| Generated learning catalogue consistency | PASS: 83 chapters / 15 modules |
| Frontend and MCP production dependency audits | PASS: no reported vulnerabilities |
| Current source secret scan | Reviewed noncredential fixtures/variable references; no real source credential found |
| Historical secret scan | FAIL: historical Stripe TEST credential still authenticated at the last check |
| Immutable backend/web/MCP builds | Built from exact candidate; backend/MCP OS refresh scans completed |
| Production configuration dry run | PASS with final refreshed images and pinned current MinIO; no containers changed; compatible recovery still requires separate certification |
| Backup and private restore | PASS; details below |
| Actual production-environment preflight | PASS: target configuration, 16 recovery checks, MCP, TypeScript/build, 3,696 backend tests with one opt-in skip |
| Exact-source CI | PASS: workflow 39215026185, all checks including images and proxy-control smoke |

The skipped backend test is
`ReleasedSchemaUpgradeIntegrationTest.releasedV289UpgradesWithoutRewritingHistoryLeadsOrExistingFlowPositions`,
an opt-in historical upgrade fixture. A separate private restoration of the
actual production baseline V299 to V331 was executed for this release.

Earlier full-test failures were obsolete test/catalogue expectations and missing
MVC fixture advice mocks. They were corrected before the successful full suite.
The first VPS recovery-fixture run failed because `/tmp` is mounted `noexec`.
The passing rerun uses a private executable `TMPDIR`; production deployment
behavior was not weakened. Initial Docker bridge DNS resolution failed; builds use the VPS
host-network build topology without changing production networking.

The real-target preflight used `DEPLOY_TOPOLOGY=host-network` and the protected
production environment file, with its own disposable MySQL on loopback port 9347.
`SKIP_DOCKER_BUILD=true` avoided redundant mutable `release-check` builds because
the immutable candidate images were built and scanned separately. It did not
waive image construction. The temporary test container was removed on exit.

## Backup and migration evidence

Exact protected backup:
`/root/indice-production-release-20261019/backups/production-20261019T071011Z`.

Database and MinIO gzip archives and SHA-256 manifests were verified. The restore
ran in a disconnected Docker network namespace with no published ports. Flyway
alone used private-clone migration authority; the application used SELECT-only
credentials, and external email/payment workers were disabled.

Both the initial candidate and the final OS-refreshed backend successfully
started against separately restored copies of the database and upgraded
V299 to V331. All existing Flyway versions/checksums were retained. Hashes of
original business columns/rows and the billing catalogue/subscription-version
snapshot matched. The comparison explicitly excludes only the reviewed V302/V309
module metadata edits and newly inserted module/permission rows; it does not claim
those catalogue changes are absent. Object archive comparison passed.

An OS-refresh rerun initially reused the prior extracted MinIO working copy.
Its startup had already cleaned `.minio.sys/tmp` entries, so strict tar comparison
correctly failed. The rerun restores into a separate fresh directory instead of
ignoring that difference. The fresh rerun passed, including MCP health/readiness
(200) and anonymous denial (401). The original backup archives remain unchanged.
After success, only the two extracted temporary object copies were removed;
all original archives, manifests and validation evidence were retained.

This is a backup/migration/data-retention rehearsal, not authenticated functional
UAT or certification of a compatible rollback image. A fresh backup is required
near the actual activation if production has continued changing.

## Dependency findings

The initial backend image reused a cached OS-update layer and contains
`libexpat 2.8.5-r0` with CVE-2026-77214. The cold rebuild
`indice-erp-backend:5dac3bf0bcb8-osrefresh` removes this finding; the fresh scan
contains only the two conditional Spring findings below and no secrets.
Alpine documents its fix in 2.9.0-r0:
https://security.alpinelinux.org/vuln/CVE-2026-77214

The scanner also reports Spring MVC 6.2.19 findings CVE-2026-47884 and
CVE-2026-47890. These library findings are not described as patched. Current
application evidence supports absence of their documented triggering features:

- CVE-2026-47884: the passing `MvcViewExposureRegressionTest` verifies no XSLT
  views/resolvers and no implicit view rendering through wildcard handlers.
  Primary advisory: https://spring.io/security/cve-2026-47884/
- CVE-2026-47890: inspection of the exact source finds no `SseEmitter`,
  `ServerSentEvent`, `FragmentsRendering`, or Spring event-stream rendering.
  MCP's separate Node transport does not render Spring view fragments.
  Primary advisory: https://spring.io/security/cve-2026-47890/

The Spring advisories describe medium/low severities and feature-specific
preconditions; the scanner labels these packages critical. Preserve both facts
and re-evaluate applicability whenever view/SSE behavior changes. Do not suppress
new unrelated scanner findings or infer a general security certification.

The initial MCP image also contained zlib CVE-2026-85091 (medium). Its cold
rebuild, `indice-erp-mcp:5dac3bf0bcb8-osrefresh`, reports zero vulnerabilities and
zero secret findings. The web image also reports zero for both categories.
SBOMs and raw findings are retained only in protected release evidence.

## Configuration preserved at the initial preparation checkpoint

Production and APPTEST continue running their existing `e73c35ce1415` application
images. Final checks confirmed identical production backend/MCP/web image IDs, runtime
environment hash and all five existing provider secret-file hashes; HTTP returned
200. Production remains at V299 with zero failed migrations; no live migration, container replacement,
financial operation, campaign send or real account mutation was performed.

Production's existing Stripe LIVE and Mercado Pago settings and mounted secret
sources were retained. The candidate also pins the exact currently running MinIO
image ID, avoiding an incidental upgrade through its mutable historical tag. The historical Stripe TEST key is not used in current
production or APPTEST container environments/mounted secrets. A new separate
mail-account encryption key was generated only in protected candidate server
configuration after confirming production has no `email_accounts` table. It is
not active, not committed, not copied from local email credentials, and must be
preserved during subsequent releases. Keep the prepared server key backup.

## Verifier diagnostic incident

The final preparation verifier initially requested full `docker inspect` output
for every container while checking temporary-restore mounts. Node's child-process
buffer overflowed (`ENOBUFS`) and its uncaught error included Docker configuration
in the operator tool transcript, potentially including sensitive environment
values. This was an execution mistake. No raw diagnostic was intentionally copied
to this report, committed, or published to GitHub; do not reproduce its values.

The verifier now requests only `{{json .Mounts}}`, uses a bounded larger buffer and
catches failures without printing command stdout/stderr. Its rerun passed: live
images/environment/provider-secret hashes were unchanged, production remained at
V299, HTTP returned 200, and only the temporary restored object copies were
removed. Original SQL/object archives remain intact; 17 GiB was available after
cleanup.

Treat the operator transcript as confidential. Exposure scope is UNKNOWN until
reviewed by the owner; any credentials actually exposed need a coordinated
rotation decision for their affected services. Do not blindly rotate another
application's database credentials or record this incident as resolved merely
because the verifier was corrected. This review is separate from the historical
Stripe TEST revocation.

## Remaining work at the initial preparation checkpoint

These entries are historical. See the current continuation linked at the top for
completed recovery, the owner's Stripe replacement decision and activation status.

1. **Owner dependency:** revoke the historical TEST credential from
   `payroll/panel_root/stripe_config.php`, commit `b82c7b67ea27`. The owner replied
   “La revocaré y te aviso”. No confirmation has arrived. The last read-only
   authentication returned HTTP 200; verify rejection after confirmation without
   printing or committing the credential. Historical October 6 exceptions expired.
2. Review the verifier diagnostic incident above and coordinate any required
   credential remediation without exposing values or disrupting unrelated services.
3. Prepare and rehearse schema-compatible recovery retaining corrected auth,
   invitation, notification and email boundaries; do not blindly restore the old
   backend on V331. The successful candidate restore does not satisfy this item.
4. Complete current target-like authenticated acceptance and all remaining public
   release gates; the previous release's production-UAT exception does not apply.
5. Revalidate capacity/configuration, refresh the backup, then activate, smoke-test
   and observe the production canary only after blockers are closed.

Canonical release policy:
`docs/indice-public-release-security-gate.md` states “A blocking FAIL or UNKNOWN
prevents release” and does not permit accepting an exposed secret. Deployment
and recovery follow `deployment/README.md`. No new approval is being requested;
production deployment is already authorized, but activation remains gated.
