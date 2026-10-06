# Protected administrator/Lupita production release — 2026-10-06

Status: production activated at approximately 20:45 UTC; operational smoke passed,
ten-minute canary passed; authenticated owner acceptance pending.
Operator: repository release agent. Product/release owner: requester.

## Authority and acceptance status

After the [protected APPTEST deployment and successful ten-minute canary](2026-10-06-mcp-protected-apptest-release.md),
the owner explicitly requested promotion because they want to test in production. The
[bounded sequencing decision](../decisions/2026-10-06-owner-production-acceptance.md) was committed
and pushed as `35fae4d4` before activation. Only manual acceptance location/timing changes.

Authenticated administrator/role review and real ChatGPT/OAuth/PKCE, refresh, revocation, confirmed
synthetic action/replay, file handling and 20–30-minute continuity remain UNKNOWN. The owner's
sequencing risk is ACCEPTED for this one release, not a claim that those flows passed. All technical,
security, integrity, recovery and monitoring gates remain blocking. The normal APPTEST-first human
acceptance order remains in force for future releases.

Stripe remains unchanged under its [existing narrow deferral](../decisions/2026-10-06-admin-release-stripe-deferral.md),
which is not extended. Both decisions expire no later than 2026-10-07 00:00 UTC
(2026-10-06 20:00 America/Toronto). No production billing authority, provider enablement or financial
test mutation is authorized by this promotion.

## Source, changes and provenance

Deploy only the exact protected application source `e73c35ce1415d98a8dac7ddb39a7859eb546f18a`,
which integrates administrator/commercial analytics and the uploaded Lupita owner extensions.
[Exact-source CI passed](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/37523571761).
Later commits change decisions/operating documentation only, not the deployed application.

The immutable backend/web/MCP tags and image IDs are the same as the
[APPTEST artifact record](2026-10-06-mcp-protected-apptest-release.md#exact-immutable-artifacts):
`indice-erp-backend:e73c35ce1415`, `indice-erp-web:e73c35ce1415` and
`indice-erp-mcp:e73c35ce1415`; V299-compatible recovery is `indice-erp-backend:0f24ab6a78fa`.
The backend is the previously verified byte-identical Java component, explicitly reused, not
recompiled. MCP/proxy images were rebuilt for the protection change. Retained scans/SBOMs and
source/transfer/JAR hashes apply to the identical artifact bytes.

Behavior delivered: the integrated administrator navigation/commercial analytics and approved
Lupita owner catalog, plus dedicated MCP traffic/body-receipt protection and the patched SDK 1.x.
Behavior preserved: tenant/object/module/tab scope, consent, five connections per user/company,
confirmation/idempotency/backend authority, original migration checksums, existing business records,
commercial prices/subscription versions, provider flags and secret/encryption bytes. Flyway advances
from the observed production V289 baseline to the approved V299 lineage; no migration is edited or
reversed. Additional application/schema changes in this promotion: N/A.

Repository files changed for promotion: the bounded acceptance decision and narrow references in
the canonical public gate/MCP operating system, deployment README/MCP runbook and earlier protection/
Stripe decisions; this validation record and the historical APPTEST handoff reference. No application
source, dependency lock, route, permission, migration, catalog or secret is modified in this turn.

## Preparation and verification

- PASS: APPTEST deployment/public smoke and 21-sample ten-minute canary, zero restarts/backend errors.
- PASS: actual protected production preflight from the identical application source: MCP 153 tests,
  TypeScript/build, backend 3,190 tests with zero failures/errors and one opt-in skip, and 16 recovery
  regressions. Tests ran only on disposable `indice_test_db`, never a functional/production database.
- PASS: real isolated Nginx regressions for both complete configurations and actual immutable
  web/MCP images; 14 packaged-image HTTP/OAuth regressions, network disabled. These are synthetic,
  not human or real ChatGPT acceptance.
- PASS: exact-source CI and retained four-image vulnerability/secret scans/SBOMs. Web/MCP have zero
  findings; all four images have zero detected secrets. The unchanged conditional Spring finding is
  retained, not hidden/patched, under the [applicability triage](../decisions/2026-10-06-admin-release-dependency-triage.md).
- PASS: fresh comparison of production's running backend/MCP image IDs and environment hash against
  the tested protected snapshot; mounted secret-file bytes match. New image identities match retained
  scan identities. No APPTEST environment was copied into production.
- PASS: the deferred historical credential is unused by both running backends/mounted secrets,
  proposed configurations and durable production configuration. No Stripe action was performed.
- PASS: fresh production V289 database/object backup at 20:39:59 UTC, gzip/SHA256 verified:
  `backups/production-20261006T203959Z` in the protected release directory. Database and object
  archives contain approximately 28 MB and 961 MB respectively; no customer payload is printed.
- PASS: production recovery and final activation dry runs with the compatible immutable backend,
  separate protected runtime paths and the unchanged 10 GiB capacity threshold.
- PASS: fresh production backup restored in disconnected private MySQL/MinIO, with no public
  ports. Candidate upgraded the V289 copy to V299; compatible recovery started on that same
  upgraded copy. All original rows/columns, published migration checksums and commercial
  prices/subscription-version counts were unchanged. Private application authority was SELECT-only;
  this is a retention/recovery drill, not authenticated functional UAT.
- PASS: production activation wrapper exited zero. Backend/web/MCP run the exact protected tags
  above; backend/web/MCP/MinIO are stable with zero restarts. Schema is V299 with no failed
  migration or opportunity lacking its flow; original published checksums match the backup.
  Persisted catalog prices and subscription-version counts match the pre-activation snapshot.
- PASS: public web/backend/MinIO/CSRF/synthetic-login smoke and public MCP/OAuth metadata.
  Administrator/analytics APIs remain anonymous `401`. Served `/platform-admin` HTML matches the
  active immutable image byte-for-byte and the active Nginx configuration validates. Backend
  startup ERROR count is zero. APPTEST remains on its exact protected tags, zero restarts, health `200`.
- PASS: all eight initial JavaScript/CSS assets referenced by the public index are served by HTTPS
  and are byte-identical to their files in the active immutable production image.
- PASS: ten-minute production canary, 20:45:53–20:55:56 UTC, 21 samples. Public health/private
  readiness remained available, anonymous analytics remained `401`, all monitored containers had
  zero restarts and backend ERROR count stayed zero. This does not certify authenticated UAT.
- PASS: complete post-deployment checks repeated after the canary; published checksums, catalog
  prices and subscription-version counts still match the pre-activation snapshot. The deferred
  historical credential remains unused by the deployed backends and protected configurations.

## Capacity cleanup and recovery safeguards

Only regenerable build cache was retired from the VPS default builder: one inventory-verified,
unused/unshared cache-mount ID older than a day (327.7 MB), then old unused/unshared cache selected
by `until=24h` and `shared!=true` (2.001 GB). This is build-cache cleanup, not `docker system prune`,
image/volume/container deletion or backup retention work. Active containers, immutable release/
rollback images, business volumes and existing verified backups remain intact. Removed cache can
be regenerated by compiling. Capacity rose from about 10.42 to 12.33 GiB before the new backup;
the normal 10 GiB activation threshold was not lowered.

All 39 actually retired cache records were checked back against the retained inventory: each was
unused, unshared and older than a day. After successful rehearsal and another backup hash check,
only the disconnected temporary `restored-objects` copy was removed; it can be recreated from the
retained verified object archive. Original live storage and the verified backup are intact. Private
clone containers/test storage were decommissioned by the rehearsal's exact-target cleanup.
Post-activation free space was approximately 11.45 GiB; no capacity override was used.

An initial filter missing its required value was rejected without mutation; other overly narrow
selectors returned zero reclaimed bytes. Actual-version CLI/source inspection then supplied the
correct bounded selector. These zero-result/rejected attempts are retained, not reported as cleanup.
The filter semantics were checked against [Docker's primary prune documentation](https://docs.docker.com/reference/cli/docker/buildx/prune/)
and [the installed CLI version's implementation](https://github.com/docker/buildx/blob/v0.37.1/commands/prune.go).

Protected evidence/configurations/backups reside in the operator's private
`indice-mcp-protected-release-e73c35ce1415` directory. Original MinIO/MySQL data must remain mounted.
After V299, the original pre-upgrade production backend must not start. Use the rehearsed
V299-compatible recovery and protected proxy preparation, not a blind historical-container swap.
Rollback must preserve the current database, financial/audit records, attachments, tenant authority
and dedicated MCP traffic policy. Never run Flyway repair or remove business data to recover.

## Remaining checks and risks

Human acceptance stays pending
under the bounded owner-directed sequencing decision even if all operational checks pass.
Live merchant/device acceptance: N/A for this deployment; it is not newly certified or enabled.
Other failures: N/A beyond the documented cache-selector attempts and earlier APPTEST preparation
incidents. Production deployment is not completed human UAT or a security certification.
