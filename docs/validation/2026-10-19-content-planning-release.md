# Content planning production release — 2026-10-19

This unactivated preparation is superseded by the
[2026-10-20 integrated workspace release](2026-10-20-workspace-production-preparation.md),
which includes the calendar and requires a V339-compatible recovery image.

Status: TECHNICAL PREPARATION PASSED; NOT ACTIVATED. Source is pushed, target
validation and recovery are complete. The historical Stripe TEST-key release
decision remains outstanding. Production is healthy on `aaa23d66`; no activation
command was run.

## Source and scope

Owner requested pushing the current branch and deploying production.
`codex/continuacion-20261016` is pushed through application revision
`c92bcae6d4d8ade5d50a1aa52932fdb5e830f769`. The merge retains the production
attendance correction and exchange-cache fix. All application source from the
local workspace is included; the unrelated generated `output/visualizations`
prototype stays local. No force push or main-branch rewrite was performed.

Changes since production are the Funneling ideas board, campaign content guide,
content generation and content calendar (month/week/agenda, suggested plan review
and AI prompt export), plus the inventory business-date correction found by CI.
The calendar is a reference planner: it does not publish ads, emails or social posts.
The reviewed Sales learning chapter and generated catalogue describe the new views.

Preserved: attendance photo/GPS and location policies; tenant/session/CSRF and
object ownership; CRM/POS financial authority; provider configuration, billing
catalogue and subscription versions; email encryption keys; APPTEST runtime.

## Artifacts and recovery

| Artifact | Immutable image | Image ID |
| --- | --- | --- |
| Backend | `indice-erp-backend:c92bcae6d4d8` | `sha256:60b6887ed4e602edf501a3806f32864cd35d348f01d49d023d98975ec5ca1b5d` |
| Web | `indice-erp-web:c92bcae6d4d8` | `sha256:9ea24f5e837705ae95330ab09859ebce93d0f8ef1d3a253a28545aa4ebe0726f` |
| Recovery backend | `indice-erp-backend:6199eb2a763e-recovery` | `sha256:b21068f0a8a5aa46e3b4983c5feee4dace51e98d1f4f410e3591179594ad9211` |

Recovery branch `release/calendar-recovery-20261019` /
`6199eb2a763e0ed3cb58b74d73c53a4ce2bdb60f` retains the previous attendance
application with the exact V332–V334 migrations and the business-date fix. It
starts against V334 without repairing history or ignoring future migrations.
New planning data remains stored while the prior UI does not expose the new tools.
The original V331 backend alone failed validation on V334 and is not the fallback.

Protected preparation: `/root/indice-calendar-release-20261019`.
Candidate source: its `source` directory; environment: `production.env`, derived
from the active attendance environment with only backend/web image references changed.
MCP/MinIO image references and secret files remain unchanged.

Backup: `/root/indice-calendar-release-20261019/backups/production-20261020T031914Z`.
SQL, MinIO, environment and schema/billing snapshots have verified SHA-256 manifests.
Both final backends passed isolated restore/startup on V334, using a disconnected
Docker namespace, disabled outbound workers and a SELECT-only application account.
All original business columns/rows and billing snapshots matched their hashes;
existing migration checksums were retained. Extracted disposable copies were removed
only after verifying original archives and absence of container mounts.

## Verification

- 83 focused Funneling unit checks, 35 learning checks and 44 business-date integration
  checks passed. Six browser flows passed, including the content calendar at desktop,
  390px, 320px and landscape sizes, dark mode, save/reload, uncertain retry and conflict.
- Current frontend production dependency audit: zero reported vulnerabilities.
- Source secret scan: 20 reviewed noncredential findings (existing test fixtures,
  storage identifiers and variable references); no real credential in current source.
- Backend/web/recovery image scans: zero secrets. The backend images retain two
  unpatched conditional Spring MVC findings, CVE-2026-47884 and CVE-2026-47890.
  Existing XSLT/wildcard-view regression and absence of Spring SSE rendering apply
  to both exact sources. SBOMs and unsuppressed scans are retained privately.
- Production configuration dry run passed with the exact recovery image; no
  production containers or database records were changed.
- Primary CI: https://github.com/nahumsini/Indice_base_SAAS/actions/runs/39364582715
- Recovery CI: https://github.com/nahumsini/Indice_base_SAAS/actions/runs/39364585067
- Both exact-source GitHub CI runs completed successfully, including the complete
  backend suite (candidate: 3,739 tests, zero failures/errors, one skipped), frontend
  typecheck/build/regressions, MCP checks, image builds and runtime smoke tests.
- Target preflight completed at 2026-10-20 04:17:38 UTC with the verified checkpoint
  resume described below: 16 deployment/recovery checks, 158 MCP checks, TypeScript,
  frontend build and 3,739 backend tests (zero failures/errors, one skipped).
  `preflight-complete.json` binds the unchanged source/environment to the original
  and resumed logs. The disposable database was removed; the bounded service exited
  successfully and the production health monitor completed without stopping it.
- Final backup manifest verification, production configuration dry run and runtime
  preservation guard passed after the tests. Public API health is HTTP 200; available
  disk space is 14 GiB. APPTEST, production image/configuration and schema V331 remain
  unchanged. Actual activation and its five-minute observation are still pending.

## Failures investigated before activation

The first target preflight stopped below the 10 GiB free-space threshold. Only
reproducible Docker build caches and unmounted extracted test copies were removed;
all immutable images, rollback containers, original backups and live data remain.
The threshold was preserved and the dry run passed after capacity was recovered.

The first private restore used a different database default charset from production,
causing V334 foreign-key validation to fail in that disposable clone. Production's
actual default and parent key are both utf8mb3_general_ci. The final rehearsal
captures and uses that exact charset/collation. No applied migration was edited,
no live schema was changed and no Flyway repair was used.

Initial CI used JVM dates that could be tomorrow in the company timezone. Synthetic
sale/inventory/commission dates now use the existing business-timezone resolver.
Maintenance part consumption also used the order schedule timezone rather than
the Inventory owner's business day; that production defect was corrected and
covered with an order in Pacific/Kiritimati and company in Etc/GMT+12. Monetary,
stock, currency, idempotency and reversal checks remain in their existing owner.

## VPS connectivity incident during preparation

At approximately 2026-10-20 03:46 UTC, new SSH connections stopped completing banner
exchange, public HTTPS stopped completing TLS, and HTTP stopped returning a response.
The independent connected MCP client also reported connection failure. TCP connection
establishment still succeeded. After access recovered, the host reported a load
average above 400 and almost
all 4 GiB of swap in use. The temporary Surefire JVM exited 137. These observations
are consistent with resource exhaustion; no kernel OOM record was obtained.

The new application was not activated. A narrowly scoped attempt to terminate only
the release directory's Surefire test JVM could not connect and therefore did not
execute. No production container was stopped, recreated or deliberately restarted.
SSH and HTTPS recovered without a deliberate production restart. Backend and web
retained zero restarts and the original image; API health returned 200. No matching
Surefire JVM remained when the narrow stop command could finally execute.

The initial preflight also exposed four attendance fixture assertions caused by a
local JVM day differing from the isolated MySQL UTC day. The rerun uses UTC for its
test JVM, matching CI and application containers, without changing host, customer
or production settings. Assertions and application source remain unchanged.

The rerun is isolated by a transient systemd service with 3 GiB memory maximum,
2.5 GiB memory high, zero swap, 150% CPU quota and 384 tasks maximum. Maven uses
512 MiB heap; forked Java tests use 1 GiB heap, 384 MiB metaspace and eight cached
Spring contexts. Node heap is bounded to 2 GiB; its initial 1 GiB budget was insufficient for
TypeScript, and that isolated attempt stopped without affecting production. Core
dumps are disabled for the bounded validation process. The disposable MySQL remains in
its separate 1 GiB container. A temporary monitor stops only this validation unit
if production health fails or available host memory stays below 1.5 GiB for two
consecutive samples. Original logs remain protected for investigation.
The protected rerun completed all 16 deployment/recovery checks, 158 MCP checks,
TypeScript and the production frontend build. Its backend launch then stopped before
running tests because the transient service lacked the normal user home environment.
The service now explicitly uses `User=root`; a direct probe verified the standard
login environment. Only the remaining canonical `./mvnw clean test` step was resumed,
with a fresh isolated database and the same resource limits. Before and after this
step, the checkpoint verifier checked the exact source revision, clean worktree,
unchanged protected-environment hash and successful preceding commands. Original
failure logs are preserved; the combined result identifies this checkpoint resume.
The current backups and compatible recovery image remain the planned release fallback.

## Outstanding release decision

Historical Stripe TEST-key revocation remains FAIL: the read-only authentication
check still returned HTTP 200 at 2026-10-20 04:04:54 UTC. No credential was
printed or copied into source.
The prior attendance exception explicitly expired. A new, specific owner replacement
decision or verified revocation is required under the canonical public release gate
before activation. This preparation record grants no exception.

Real social publication/payment/email send acceptance: N/A, not part of this change.
Human production UI acceptance follows activation; no agent-created real business
record, attendance event, email or payment is claimed.

## Prepared rollback command

After activation only, the retained backend is the tested V334-compatible recovery
image, with the previous web, MCP and MinIO images. The repository helper preserves
the current schema and live object data:

```sh
CONFIRM_ROLLBACK=true HOST_BACKEND_PORT=8083 HOST_WEB_PORT=8080 \
HOST_MINIO_API_PORT=9000 MCP_ENABLED=true HOST_MCP_PORT=3011 \
ROLLBACK_HEALTH_WAIT_SECONDS=60 \
bash /root/indice-calendar-release-20261019/source/deployment/scripts/rollback-host-network.sh
```

Repeat public health, MCP authorization, retained-image and unchanged-provider checks
after recovery. This prepared command has not been run against production.
