# Integrated release activation — 2026-10-22

Status: DEPLOYED_VERIFIED. Ordered activation and observation completed at
2026-10-22T18:01:36Z. Historical Stripe TEST-key revocation remains unresolved.

## Release and scope

Application revision: `8c451b5612d07c1e4dfe291d72439838d68a5380`.
The integrated work was published to `main` before deployment. Subsequent main
and continuation-branch commits contain tests, the owner decision and release
evidence; application sources, dependencies, migrations and deployment scripts
remain byte-identical to this immutable application candidate.

The release activates the reviewed Agenda team/service/request/public-page
flows, Inventory-linked and standalone services, Meetings planning/room/day
consultation, rich Mail/Sales editing and bilingual learning coverage described
in the [preparation report](2026-10-22-integrated-release-preparation.md).
The previous work branch was closed after integration; ongoing work uses
`codex/continuacion-20261022`, synchronized with `main`.

The owner explicitly instructed "despleiga ignorando stripe". The
[bounded replacement decision](../decisions/2026-10-22-integrated-release-stripe-deferral.md)
applied only to this candidate's ordered APPTEST → App activation and observation.
It did not waive other gates or authorize provider activation. Its window is now closed.

## Actual activation

All times are UTC. Each observation consists of six samples spanning more than
five minutes, with web/API/storage/MCP HTTP 200 and zero restarts or backend errors.

| Target | Activation started | Runtime verified | Observation completed | Schema |
| --- | --- | --- | --- | --- |
| `https://apptest.indiceapp.com` | 17:44:28 | 17:48:57 | 17:53:58 | V331 → V346 |
| `https://app.indiceapp.com` | 17:54:21 | 17:56:17 | 18:01:18 | V339 → V346 |

Production activation began only after APPTEST's observation passed. APPTEST's
older MCP was first updated while preserving its V331 backend/web, so the full
upgrade retains a patched MCP in its recovery set. Both environments now run
the same immutable application images:

| Image tag | Image ID |
| --- | --- |
| `indice-erp-backend:8c451b5612d0` | `sha256:5a6d0507ac8f43eb4384bf3571d8aacfdfac5459bcfd582407c85891f6dc6e71` |
| `indice-erp-web:8c451b5612d0` | `sha256:b410abf866bb6d63705d1884e7c04fa4808e8b7b83ffa5a00bf2cbdd1f8bbbc1` |
| `indice-erp-mcp:8c451b5612d0` | `sha256:43710b055a5b78ec24389b809a5c8b0be2fb2d369d08d4be22bfdde01d04d4ab` |

## Verification and preserved behavior

- Exact-candidate CI and the previously completed real-environment preflights,
  isolated restored-data upgrade/recovery rehearsals, scans and browser/module
  regressions remain the application evidence linked in the preparation report.
  This activation did not introduce application changes or repeat mutation tests
  against functional databases.
- Fresh independent SQL/object/configuration backups were taken before activation:
  `apptest-20261022T174311Z` and `production-20261022T174313Z`. Archive integrity
  and SHA-256 manifests passed before activation and again at final verification.
  Earlier backups remain retained. Protected files and business data stay outside Git.
- Refreshed canonical host-network dry runs passed for both real environments.
  Both activations used `up-host-network.sh` with the rehearsed V346-compatible
  backend recovery image. Applied Flyway history/checksums remain unchanged;
  there are no failed migrations.
- Runtime guards passed for exact image IDs, each target's protected environment,
  secret-file hashes, mounts, ports, historical migration checksums, billing
  catalogue/subscription versions, entitlements, module roles and tab permissions.
  Each activation preserved the opposite environment's container identities,
  images and configuration. Unrelated infrastructure/database identities remain intact.
- Public health/storage, CSRF-session routing and synthetic-invalid-login smoke
  passed. Selected protected module routes reject anonymous access with 401.
  Public MCP rejects anonymous access, advertises aligned OAuth/PKCE metadata
  and retains its support route.
- Authenticated MCP context reads passed before/after each activation, preserving
  company, membership, user, role and unit/business scope. No business mutation
  was performed through the connectors.
- Fresh Chrome login-page checks passed on both public URLs: HTTP 200, visible
  password input, no uncaught JavaScript errors or failed static assets. Screenshots
  were inspected; no login form was submitted by those browser checks.
- Both full startup/runtime log checks and both observation windows reported zero
  backend errors. All eight application/storage containers remain running with
  zero restarts. Final production guard also proved APPTEST's deployed identities
  and configuration remained unchanged during production activation.
- Provider settings, mail encryption, MFA/session/CSRF policy, tenant boundaries,
  existing prices/access and object-storage volumes were preserved. No live charge,
  real email send, provider activation, price publication or permission grant was
  part of this release verification. Live end-user acceptance of every module
  was not performed during this activation; the synthetic flow evidence is linked above.

## Operational corrections and recovery

A refreshed production object backup initially stopped at the capacity check;
the 10 GiB deployment floor was retained. Only this release's ignored dependency
and build directories were removed after retaining its backend test reports.
Fresh backups and dry runs then passed without deleting prior backups, runtime
images, databases or object volumes.

The authorization file initially referenced the earlier local snapshot and was
rejected before service replacement. It was corrected to the exact validated
candidate. After APPTEST's canonical activation and runtime guard passed, a
separate follow-up smoke invocation stopped because its protected environment
path was omitted. That invocation was corrected and rerun successfully before
observation; application activation was not repeated. These were operational
harness corrections, not application changes. Failed logs remain protected.

Compatible recovery containers are retained stopped for both targets. Recovery
keeps the V346-capable backend and patched MCP, and can restore the prior web.
The incompatible pre-upgrade backends remain stopped for forensics and must not
be started on V346. This can recover presentation/integration regressions; defects
shared by the candidate backend require a forward fix. Schema rollback: N/A.
No Flyway repair, reverse migration, data restoration or volume deletion was run.

## Evidence and remaining risks

Protected operational evidence is under `/root/indice-release-20261022` on the VPS
and `/private/tmp/indice-release-20261022` on the workstation. It includes the
sanitized completion/manifest JSON, independent backup manifests, activation and
smoke logs, runtime guards, browser evidence, connector-continuity booleans and
both six-sample observation records. The release authorization is closed and
disabled after final verification; it cannot authorize a later activation.

Historical Stripe TEST-key revocation remains HIGH and unresolved. Its last
credential-safe provider check at 2026-10-22T13:45:51Z returned 200; no revocation
or additional provider operation is claimed. The owner remains responsible for
revocation. This completed exception does not authorize a future release.
The prior reviewed Spring rendering findings and existing frontend chunk advisory
remain as recorded in the preparation report; this activation does not claim
they were patched or that the application is security-certified.

Files changed for this activation: this report, the preparation record's follow-up
link, the bounded owner decision and its canonical security-gate reference.
Application files changed during activation: N/A.
