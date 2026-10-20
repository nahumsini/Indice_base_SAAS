# Personal workspace / main production preparation — 2026-10-20

Status: TECHNICAL PREPARATION PASSED; subsequently ACTIVATED AND VERIFIED.
The [activation report](2026-10-20-workspace-production-activation.md) records the
fresh authorized backup, published artifacts and completed five-minute observation.
The historical Stripe TEST-key revocation remains pending under the now-completed
[release decision](../decisions/2026-10-20-workspace-release-stripe-deferral.md).

The owner requested publishing local work to the working branch and main, then
deploying production. SSH access works with the existing protected deploy key;
no replacement key was generated and no private key was disclosed.

## Source and scope

Application revision: `04f127a9a96e125b6a5b41b46386215ffb44d337`.
Both `codex/continuacion-20261016` and `main` contain this integration through
ordinary pushes. No branch was force-pushed.

The release combines the private ideas workspace (Mi pizarra, Tablero Índice,
Mis proyectos, optional appearance controls and saved board snapshots), the
previously prepared Sales content planning/calendar work and main's regional
trial payment implementation. The reviewed learning catalogue now has 86 chapters
across 16 modules. Main's Billing-owned account notice and its single-workspace
restrictions remain present.

Regional public entry/payment flags remain off under the existing configuration.
No price publication, provider charge, subscription change or tenant entitlement
grant is part of this operation. The new complementary ideas module is a pilot;
its registration does not grant companies access automatically.

The [integration decision](../decisions/2026-10-20-workspace-main-integration.md)
maps main's unpublished regional SQL to V337–V339 without changing any applied
production migration. Production starts at V331; this release adds V332–V339.
The unrelated generated `output/visualizations/funneling-unificado.html` prototype
remains local, as in the previous preparation.

## Validation

- 105 focused backend tests passed with no failures/errors against an isolated
  synthetic database; empty-schema Flyway startup reached V339.
- TypeScript, frontend build, 12 personal/system/appearance model tests,
  36 Sales board/calendar regressions, 35 learning regressions and 10 regional
  trial/account-notice UI tests passed.
- Native browser regressions passed for personal board actions/minimap,
  system-board/project snapshots, appearance, existing Sales board, content
  calendar and trial notice. Coverage includes 390px, 320px, landscape and dark
  mode, save/reload, lost-response retry, conflict handling and consultation.
- Candidate [CI 39463424472](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/39463424472)
  and recovery [CI 39463540742](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/39463540742)
  both passed their complete workflows.
- The real-target preflight completed at 2026-10-20 17:25 UTC against exact
  revision 04f127a9 and an unchanged production-derived environment:
  3,791 backend tests, zero failures/errors, one skipped; 16 deployment/recovery
  checks, 158 MCP checks, TypeScript and frontend build.
- Test execution used a 3 GiB no-swap / 150% CPU systemd budget and a disposable
  1 GiB MySQL container. Production health monitoring remained successful.
- Production npm dependency audit: zero reported vulnerabilities. Clean-source
  secret scan: 20 byte-unchanged noncredential fixture/identifier/variable
  matches. New commit history scan: zero secret findings across seven commits.

## Protected operational evidence

Preparation directory: `/root/indice-workspace-release-20261020`.
Its `source` checkout is the exact application revision; `production.env` was
copied from the active attendance environment, changing only backend/web image
references. The private runtime guard binds provider-secret fingerprints,
environment, mounts, applied schema history and unchanged APPTEST images.

Local focused evidence:
`/tmp/indice-workspace-release-20261020/evidence`.
Target logs, manifests, image scans/SBOMs and database/object backups remain
protected on the VPS, not committed to this repository.

The initial bounded web build was stopped while Node pressed against its
2,500 MiB container limit. Production remained healthy. A first retry also exhausted the bounded builder
without affecting production. The successful retry bounds the V8 heap at
2,048 MiB, matching the passed preflight frontend build, with a 3 GiB no-swap
builder limit for native compiler overhead and a monitored 1.25 GiB host reserve. The temporary
Dockerfile differs only by this build-step memory setting; application source
and final runtime stages remain unchanged. Both original and retry logs and
Dockerfile hashes are retained.

Only this release's reproducible target/node_modules/build cache may be removed.
Test reports are archived; original backups, immutable images, rollback images
and live data are retained.

## Historical release finding

The historical Stripe TEST-key revocation is unresolved: this preparation's
read-only authentication check returned HTTP 200. No credential was displayed.
The previous attendance exception expired. The owner's new explicit authorization
is recorded separately for this exact version; this preparation record grants no exception.

Human production UI acceptance follows activation. Real outbound mail/social
publication/payment execution: N/A for this deployment smoke.


## Final artifacts and restore rehearsal

| Component | Immutable image | Image ID |
| --- | --- | --- |
| Backend | `indice-erp-backend:04f127a9a96e` | `sha256:af48f416c07699ee69179764614c3cad859363ad58aade6be2942041e8a8a1d3` |
| Web | `indice-erp-web:04f127a9a96e` | `sha256:f4c0d9d892810ae73819501d6f410bdd70f995aff7d294c2d9950fc96fd6df98` |
| Recovery backend | `indice-erp-backend:720ed2d06466-recovery` | `sha256:f07abaaf63e98585b147d2a70ae711d19dd3244edb75fd443d9c0c7d292da845` |

Recovery branch `release/workspace-recovery-20261020`, revision
`720ed2d0646614a98ac699c99fee683b087b3b3f`, preserves the previous application
behavior with the exact additional migrations through V339. It keeps new workspace
and planning records stored while the previous UI does not expose those tools.
The original V331 backend and previous V334 recovery image are not compatible fallbacks
once this release's migrations have run.

Fresh backup:
`/root/indice-workspace-release-20261020/backups/production-20261020T171115Z`.
SQL, object data, environment and schema/billing snapshots passed SHA-256 and archive
integrity checks. The private restore uses production's original database default
charset/collation, a disconnected Docker network namespace, disabled outbound
workers and a SELECT-only application account with separate clone-only Flyway authority.

Candidate and recovery both started successfully on the migrated V339 clone.
Every original business column/row hash and billing snapshot remained identical;
all previously applied migration checksums were preserved without repair. The one
new `ideas_board` module registry row was checked separately as a complementary
pilot, with zero company entitlement grants. Shared protected routes denied anonymous
access in both runtimes; new workspace routes denied it in the candidate. Private
MCP health/readiness returned 200 and unauthenticated protocol access returned 401.

Disposable containers and the unmounted extracted object copy were removed after
validation. Original backup archives, compatible immutable images and test reports
remain available. Canonical real-environment deployment dry run, backup re-verification
and the before-activation preservation guard all passed. At the end of preparation,
available disk space was 12 GiB and APPTEST/production remained unchanged and healthy.
Subsequent activation and observation are recorded in the linked activation report.

## Final image vulnerability review

All three image scans reported zero secrets. Web has zero high/critical findings.
Backend and recovery retain Spring MVC 6.2.19 findings CVE-2026-47884 and
CVE-2026-47890; the dependency is not patched by this release. The scanner reports
both as CRITICAL, and those unsuppressed results and SBOMs are retained.

The [Spring XSLT advisory](https://spring.io/security/cve-2026-47884/) requires
XSLT rendering with an implicit wildcard view. Both exact-source CI suites passed
`MvcViewExposureRegressionTest`, which verifies those runtime conditions are absent.
The [Spring SSE advisory](https://spring.io/security/cve-2026-47890/) concerns view
fragments streamed over SSE. Neither source uses Spring SSE/view-fragment rendering.
New controllers return ordinary JSON DTOs. The scoped non-applicability review is
bound to both revisions in `scans/applicability-reviewed.json`; this is not a blanket
waiver or a claim that the dependency has been fixed.

## Prepared activation and rollback

The protected `activate-final.sh` verifies exact-source CI/preflight, image findings,
restore results, real-environment dry run, backup integrity and unchanged runtime.
It requires a release decision explicitly bound to 04f127a9. The owner has now
provided that decision; completed activation results are recorded separately.

After an authorized activation only, use the retained V339-compatible recovery
backend together with the prior web/MCP/MinIO containers. The canonical helper
preserves the schema and live object data:

```sh
CONFIRM_ROLLBACK=true HOST_BACKEND_PORT=8083 HOST_WEB_PORT=8080 \
HOST_MINIO_API_PORT=9000 MCP_ENABLED=true HOST_MCP_PORT=3011 \
ROLLBACK_HEALTH_WAIT_SECONDS=60 \
bash /root/indice-workspace-release-20261020/source/deployment/scripts/rollback-host-network.sh
```

Repeat public health, MCP authorization, retained-image and provider-preservation
checks after recovery. This command has not been run against production.
