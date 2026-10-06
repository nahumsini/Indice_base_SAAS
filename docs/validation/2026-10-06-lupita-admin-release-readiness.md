# Integrated administrator/Lupita release readiness — 2026-10-06

Status: prepared, **activation blocked**. No new APPTEST or production release was activated.
The owner authorized merging, updating main and APPTEST-before-production, with Stripe pending.
This authorization does not remove canonical release gates.

Historical checkpoint: the subsequently authorized MCP protection and actual staged activation
are tracked separately in the [protected APPTEST release record](2026-10-06-mcp-protected-apptest-release.md).
The findings and target state below describe this checkpoint, not the later runtime.

## Source and immutable artifacts

Merged application source: `d89c09d39f4567c4c4c4b91e2534d7324a0d094c`, pushed to main.
[Exact source CI passed](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/37501829787).
This evidence document is a subsequent documentation-only change, not another built artifact.

V299-compatible recovery source: `0f24ab6a78fab7d9ba1eace790837617f171fcd1`,
branch `codex/recovery-lupita-v299-20261006`.
[Exact recovery CI passed](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/37503051976).
It preserves the previous assistant catalog while carrying the current native domain owners
and byte-identical V294–V299. Recovery is not a branch to merge back into main.

| Image tag | Image ID |
| --- | --- |
| `indice-erp-backend:d89c09d39f45` | `sha256:21ae38d6f997bd838ea30f219e2ce09309c3911964bf02702b618eeaf9755f16` |
| `indice-erp-web:d89c09d39f45` | `sha256:7623942ce3c0ffc080f383d90e8e4170e91ca80eb710dd921a0f02a82ed6f8c0` |
| `indice-erp-mcp:d89c09d39f45` | `sha256:4831862beeac429fe4ef4d9edf70153732c4ad516793671baf8f5c4eb2ec748a` |
| `indice-erp-backend:0f24ab6a78fa` | `sha256:0e05ce3bc1eb9b0e2e87fd224685402e083afd9840d4e1b6982f6eb1662f3803` |

Backend/web use the documented prebuilt Dockerfiles and verified previous immutable runtime
bases; MCP uses its repository Dockerfile. All images are amd64 and loaded on the target.
The generated image-transfer archive SHA256 is
`9f2a6785f06b11a4c2ca69918b2701be3dc7f03e0be813029efcb1afdad751af`.
Recovery packaged-JAR SHA256 is
`afc9b90e362a571e478b3ea3f70bbaaef1947d88dc290223dc5e36cf48237484`, verified
identical inside the image and in the tested recovery worktree.
Candidate packaged-JAR SHA256 inside its image is
`84afaec655292dc091e27c30a6ed666eb08e7a4345ea0861f26a94b779a1c0a8`.

## Verification performed

- Protected real configurations were captured separately from each target's own running
  backend/MinIO/MCP and durable configuration. Secret-file byte hashes were verified without
  printing values; URLs, ports, encryption authority and business/provider flags were preserved.
- Both APPTEST and production host-network preflights passed on the merged source with
  `SKIP_DOCKER_BUILD=true`; immutable images were built separately through the documented path.
  Each preflight ran MCP 145 tests, React TypeScript/build and backend 3,190 tests
  (zero failures/errors, one opt-in upgrade skip). Prior focused frontend regressions are recorded
  in [the integration decision](../decisions/2026-10-06-lupita-admin-integration.md).
- Recovery full backend suite/package passed: 3,084 tests, zero failures/errors, one opt-in skip.
  The explicit fresh isolated V293→V299 upgrade/checksum/dependency rehearsal passed separately.
- Additional temporary test-only native-owner probes passed against recovery source: four tests
  covering superseded draft lines, retained snapshots, received stock, and Point return
  uncertain/rejected/confirmed recovery with exactly-once financial reversal. Provider ports were
  mocked; no merchant, terminal or LIVE acceptance is claimed. The packaged JAR was unchanged.
  The initial receipt-negative probe incorrectly shared its outer test transaction; the final
  probe uses a nested savepoint and passes. No application fix was made to conceal a failure.
- Database suites used disposable `indice_test_db` instances on loopback 3334/3335, not either
  release database or the functional local database.
- Fresh APPTEST V293 and production V289 database/object backups passed gzip and SHA256 checks.
  Each was restored into an unexposed, disconnected private MySQL/MinIO namespace. Candidate
  upgraded each copy to V299; compatible recovery then started against that same upgraded copy.
  Original Flyway checksums, every original row/column and commercial prices/subscription-version
  counts were unchanged. Decimal presentation was normalized; authorized additive flow-position
  backfill was excluded from the original-row set, not erased.
- Private restored application access was SELECT-only, with separate private Flyway migration
  credentials. This prevents recurring jobs/outboxes changing copied customer records. These
  health/retention drills are not authenticated functional UAT; expected denied scheduled writes
  remain in protected clone logs. Locked private DEFINER accounts preserve restored view/trigger
  semantics. No production account, job, record or provider configuration was changed.
- Both host-network deployment dry runs passed using distinct runtime paths and the compatible
  recovery image, without replacing a container. Remaining free space after temporary-copy
  cleanup was approximately 10.77 GiB; the normal 10 GiB threshold was not lowered.

## Security and remaining gates

Fresh Trivy JSON scans and CycloneDX SBOMs are retained for all four exact images. Web and MCP
reported zero findings. Each backend reported only CVE-2026-47884 in Spring MVC 6.2.19. The
dependency is not patched. Current full-suite MVC exposure regressions pass, and the
[primary Spring advisory](https://spring.io/security/cve-2026-47884/) still requires XSLT plus
implicit wildcard view rendering, absent here. The bounded application applicability review
is recorded in [dependency triage](../decisions/2026-10-06-admin-release-dependency-triage.md);
the scan finding was not suppressed.

The deferred historical TEST Stripe credential was checked again in memory against running
backends, mounted secrets and both proposed configurations: not consumed. The
[narrow owner deferral](../decisions/2026-10-06-admin-release-stripe-deferral.md) remains unresolved
and expires 2026-10-07 UTC. No Stripe, provider refund/LIVE activation, prices or subscriptions
were enabled or changed.

**FAIL — public MCP traffic protection:** the incoming `httpApp.ts` reads/parses up to 14 MB
before validating delegated authority; its large-body exception checks bearer syntax and the
named intake tool, not token validity. Nginx bounds this route to 14 MB but contains no dedicated
request/concurrency policy. Read-only inspection of the actual Apache vhost and ModSecurity
configuration found no applicable request-rate policy. `trust proxy=false` remains intact.
The canonical [MCP operations rule](../indice-mcp-operating-system-v1.md#7-operations-and-public-release)
requires rate limiting. The historical bounded-debt note and the Stripe deferral do not waive
this gate. No public stress test was attempted. Resolve and regression-test the policy before
activating the newly merged public MCP; deployment authorization is not an implicit new traffic
policy decision.

**UNKNOWN — real authenticated acceptance:** login/MFA, representative permissions, real ChatGPT
OAuth/PKCE, refresh/revocation, synthetic confirmed action/replay, file handling and 20–30 minute
continuity have not been performed for this merged catalog. An owner-assisted review was requested.
Post-activation smoke/canary is also pending because activation has not occurred.

## Operational handoff

Protected evidence/configuration/backups/scan/probe scripts remain under the release operator's
private `indice-lupita-release-d89c09d39f45` directory. Only verified temporary restored object
copies and the duplicate generated image-transfer archive were removed; original volumes,
checked backups, image tags and local transfer copy remain available for recovery.
Disposable isolated local test containers and temporary worktree probe overlays are removed
after verification; the probe source/results are retained with private release evidence.

Observed target state at closeout: APPTEST backend/web/MCP remain `9e346a9bee10`, schema V293;
production remains its prior `60ac5a458667` backend, schema V289. Both backend containers are
running with zero restarts. This report does not claim APPTEST deployment, production promotion,
security certification, merchant/hardware acceptance or completed human UAT.
