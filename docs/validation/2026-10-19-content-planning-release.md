# Content planning production release — 2026-10-19

Status: NOT ACTIVATED. Application source is pushed; production activation is blocked
by loss of VPS access during the target preflight and an outstanding release decision.
The last verified production runtime was `aaa23d66`; no activation command was run.

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
  backend suite, frontend typecheck/build/regressions, MCP checks, image builds and
  runtime smoke tests.
- Target preflight: frontend, MCP and recovery wrapper checks passed; the last
  observed backend suite was running without failures. Completion is UNKNOWN
  because the VPS stopped responding before the result could be retrieved.

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
establishment still succeeded. The cause is not established; resource pressure from
the temporary validation workload is a hypothesis, not a confirmed diagnosis.

The new application was not activated. A narrowly scoped attempt to terminate only
the release directory's Surefire test JVM could not connect and therefore did not
execute. No production container was stopped, recreated or deliberately restarted.
Provider console access was requested from the owner to inspect/recover the host.
Before continuing, verify host health, inspect the actual preflight result and temporary
workload, preserve evidence, then rerun missing checks with explicit resource limits.
The current backups and compatible recovery image remain the planned release fallback.

## Outstanding release decision

Historical Stripe TEST-key revocation remains FAIL: the read-only authentication
check still returned HTTP 200. No credential was printed or copied into source.
The prior attendance exception explicitly expired. A new, specific owner replacement
decision or verified revocation is required under the canonical public release gate
before activation. This preparation record grants no exception.

Real social publication/payment/email send acceptance: N/A, not part of this change.
Human production UI acceptance follows activation; no agent-created real business
record, attendance event, email or payment is claimed.
