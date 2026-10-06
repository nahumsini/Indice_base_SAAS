# Protected administrator/Lupita APPTEST release — 2026-10-06

Status: source promoted to main; APPTEST activated at approximately 20:23 UTC, ten-minute canary passed,
authenticated acceptance pending. Production remains unchanged.
This record continues, rather than rewrites, the earlier
[blocked readiness report](2026-10-06-lupita-admin-release-readiness.md).

## Authority and source

The owner authorized the dedicated MCP protection and the staged APPTEST-before-production
continuation. The owner also agreed to review the administrator with their own session and test
real ChatGPT/OAuth after notification. That agreement is not completed authenticated acceptance.
Stripe remains subject only to its [bounded deferral](../decisions/2026-10-06-admin-release-stripe-deferral.md),
which expires on 2026-10-07 UTC; no other release gate is waived.

Application integration: `d89c09d39f4567c4c4c4b91e2534d7324a0d094c`.
Protection source: `e73c35ce1415d98a8dac7ddb39a7859eb546f18a`, pushed to main.
[Exact protection-source CI passed](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/37523571761).
Documentation-only closeout changes are not newly built application artifacts.

## Behavior changed and preserved

Changed: dedicated aggregate/per-grant MCP capacity, bounded body/header receipt, current delegated
authorization before JSON parsing, and the minimum patched SDK 1.x dependency. Anonymous malformed
uploads now receive authorization rejection before parsing; capacity returns `429` with a retry hint,
not an OAuth-expiration challenge. Only the authorized exact file-intake tool receives the larger limit.
The [decision](../decisions/2026-10-06-mcp-traffic-protection.md) and
[canonical operations policy](../indice-mcp-operating-system-v1.md#7-operations-and-public-release)
record the exact bounds and rationale.

Preserved: five active connections per user and company, scopes, tool catalog, tenant/object/module/tab
authorization, backend write authority, preview/confirmation/idempotency, translations, public routes,
non-MCP APIs, health/metadata behavior, commercial prices and subscription-version counts. No Java,
frontend application, schema, provider configuration, secrets or billing authority changed in the
protection patch. The already approved integration adds V294–V299; migrations remain forward-only.

Files changed by the protection commit: HTTP adapter/server and new traffic guard; focused HTTP/file/
continuity/OAuth fixture tests; MCP package and lockfile; both Nginx configurations; real isolated proxy
regression; CI/preflight; MCP operating system, APPTEST runbook and protection decision. This closeout
changes only validation documentation. Additional schema changes: N/A.

## Exact immutable artifacts

| Component/tag | Image ID |
| --- | --- |
| `indice-erp-backend:e73c35ce1415` | `sha256:21ae38d6f997bd838ea30f219e2ce09309c3911964bf02702b618eeaf9755f16` |
| `indice-erp-web:e73c35ce1415` | `sha256:414247e11ce733062cf4cadeed6c9a02d0a7772a6e7257e0c749c708309ad97e` |
| `indice-erp-mcp:e73c35ce1415` | `sha256:16a9d7d21b05a7fac0af6d342654df0aa62a5793c0166f02bba368af7a5e2edf` |
| Recovery `indice-erp-backend:0f24ab6a78fa` | `sha256:0e05ce3bc1eb9b0e2e87fd224685402e083afd9840d4e1b6982f6eb1662f3803` |

The backend is explicitly **reused**, not newly compiled: `src` tree
`5689c9b2f131cc7f87ae0b75e2b6de7e2a889280` and `pom.xml` blob
`61910119ce064249e619f955d9ec0235b74a35ac` are identical to the verified integration.
Its packaged-JAR SHA256 remains
`84afaec655292dc091e27c30a6ed666eb08e7a4345ea0861f26a94b779a1c0a8`.
Recovery source `0f24ab6a78fab7d9ba1eace790837617f171fcd1` retains its previously tested JAR
`afc9b90e362a571e478b3ea3f70bbaaef1947d88dc290223dc5e36cf48237484`.

MCP was rebuilt with its repository Dockerfile. Web contains the exact protection-source Nginx
configuration and native typechecked/built frontend, packaged into the current patched official
unprivileged Nginx runtime. Frontend application tree
`379bb8aa8ffa244dcb8a27a737e3e31886e33cf1` is identical to the integration. Actual target build
flags were checked for parity; no target business flag was invented. The standard Docker build
also passed on CI, but the deployed local web packaging path is not claimed to be that CI image.
Transfer archive SHA256: `e09c016390de50809ddbcd5985e18981432a6f3525aa391c4fd5f73b9df62b0e`.
Exact source archive SHA256: `1153270cd076bf7af996ace819525dbf5729f89faebea3842317b20be0de313f`.
Both were verified on the VPS before extraction/loading.

## Verification and operational evidence

- PASS: full MCP suite, 153 tests; production npm audit, zero findings; staged secret scan, zero leaks.
- PASS: two real Nginx regression tests against both complete configurations and the actual new
  web/MCP images, in disposable internal networks with no published ports or external traffic.
- PASS: 14 packaged-image HTTP/OAuth tests, network disabled; synthetic backend only.
- PASS: 16 host-network recovery regressions; APPTEST activation and recovery dry runs, and a
  production configuration/image/path/storage dry run without changing a production container.
- PASS: actual protected APPTEST and production preflights, each including TypeScript/build and
  3,190 backend tests, zero failures/errors and one opt-in skip. Tests used the isolated
  `indice_test_db` on loopback 3334,
  never the functional local database or either deployed database.
- PASS: separately captured target configurations, distinct proxy runtime paths, identical secret-file
  bytes and unchanged encryption authority/URLs/ports/provider flags. No production configuration
  was copied into APPTEST. The deferred historical credential is not consumed by either runtime,
  their mounted secrets, proposed configurations or the durable production configuration.
- PASS: four exact-image Trivy vulnerability/secret scans and retained CycloneDX SBOMs. Web/MCP
  have zero findings and all four images have zero detected secrets. Both backend images retain
  only the already reviewed Spring MVC finding; the dependency is not patched or suppressed.
  Current MVC exposure regressions pass and the bounded
  [applicability triage](../decisions/2026-10-06-admin-release-dependency-triage.md) remains applicable.
- PASS: the fresh 20:06 UTC APPTEST V293 database/object backup restored without public ports or
  network egress. Candidate upgraded it to V299; compatible recovery started against the same
  upgraded copy. All original rows/columns, published checksums and prices/subscription-version
  counts were unchanged. Application authority was SELECT-only to avoid copied recurring-job writes.
  This drill is not authenticated functional UAT. The final 20:20 UTC backup was also captured,
  hash/gzip verified and successfully rehearsed with both candidate and compatible recovery.
- PASS: APPTEST activation wrapper exited zero. Backend/web/MCP run the exact new tags above,
  all four application/storage containers have zero restarts, schema is V299 with no failed
  migration or opportunity lacking its flow. Published migration checksums and commercial
  prices/subscription-version counts match the immediate pre-activation snapshot.
- PASS: public web/backend/MinIO/CSRF/synthetic-login smoke; public OAuth metadata and anonymous
  MCP boundary; anonymous administrator/analytics APIs return `401`. Served `/platform-admin`
  HTML is byte-identical to the active immutable web image and active Nginx configuration validates.
  Production remains on `60ac5a458667`, with public health `200` and no deployment mutation.
- PASS: ten-minute APPTEST canary, 20:23:37–20:33:40 UTC, 21 samples. Public health and private
  readiness passed throughout; anonymous analytics remained `401`; all four monitored containers
  had zero restarts and the backend emitted zero ERROR entries during the observation window.
  This is operational stability evidence, not authenticated functional acceptance.

The first post-activation check was mistakenly started before the deployment wrapper had finished;
it failed a precondition without emitting application
output. It is not recorded as PASS. After wrapper completion, the complete check passed without
an application/configuration change; both logs remain available.

Protected scripts, configurations, logs, SBOMs and backups are retained under the operator's
private `indice-mcp-protected-release-e73c35ce1415` directory. The final APPTEST backup is
`backups/apptest-20261006T202006Z`. Old backups, business volumes and rollback images remain intact.
For an authorized recovery, use the retained protected `rollback-release.sh` preparation and its
reviewed target environment; its dry run passed. It selects the V299-compatible backend and
recreates the previous web/MCP catalog with the new protected proxy configuration. Do not blindly
swap the historical containers: their old proxy mount lacks this policy, and a pre-upgrade backend
must never start on V299. Do not reverse migrations, restore over live data or disable authorization.
After both preflights passed, the disposable local test MySQL was stopped and automatically
removed with only its synthetic test database. Temporary protected environment/secret-file copies
from this preparation and the earlier administrator preparation were removed from the workstation;
their authoritative protected host originals remain unchanged and available for recovery.

## Failures, recovery and remaining risks

The workstation Docker VM has approximately 4 GiB RAM. An initial amd64 web build exhausted it:
the build failed, the disposable test MySQL disappeared, and the functional local MySQL restarted
once. No volume was removed. Functional local health recovered. The first subsequent preflight
failed on connection errors, not application assertions. A new isolated test instance capped at
768 MiB and native web packaging resolved the resource problem; the full APPTEST preflight was
rerun successfully. Failed evidence is retained, not represented as PASS.

An initial VPS dry run was correctly blocked by the normal 10 GiB free-space guard. Only this
preparation's verified duplicate transfer/source archives and disposable scanner cache were removed;
local transfer copies, extracted source, loaded images, scans, backups and volumes were retained.
The guard was not lowered. The post-activation observation showed approximately 10.42 GiB free.
Space remains tight: a fresh production object backup may push it below the 10 GiB guard.
Recheck capacity before any production backup/deploy; do not delete business volumes, existing
recovery sets or verified backups, and do not treat the dry-run PASS as a storage waiver.

UNKNOWN: authenticated administrator/representative-role UI review,
real ChatGPT OAuth/PKCE, refresh, revocation, synthetic confirmed action/replay, file handling,
and 20–30-minute continuity. Mock SDK tests do not certify these flows. Live merchant/hardware
acceptance: N/A for this deployment, not newly certified. Production promotion remains blocked
until actual APPTEST acceptance and all fresh production-specific gates pass.
