# Users access correction — production release preparation

Date: 2026-10-27 (America/Toronto). Status: TECHNICALLY PREPARED; production not activated.

Source candidate: `89a5afa6c914a243211ab957283597ca4c02baf2` on
`codex/fix-users-module-access-20261028`. The owner requested deployment so they can assign modules
to distributors. [The local review](2026-10-28-users-module-access.md) distinguishes confirmed
shared-flow defects from the unconfirmed original production response. The publication follows
[the canonical release gate](../indice-public-release-security-gate.md),
[deployment/rollback instructions](../../deployment/README.md) and the
[bounded proposal](../decisions/2026-10-27-users-access-production-release.md).

## Boundary

Frontend and four Users backend owner classes change, with their tests, adopted contracts and
the synchronized bilingual Users learning chapter (version 3) and generated catalogue.
No dependencies, Flyway resources, routes, pricing, provider configuration or MCP source are changed
by this correction. The currently deployed MCP source `6302037f` retains its exact image, and
App Test remains on its own version. Production MinIO data and image are retained. Existing user,
module/tab, membership, company entitlements, subscription and price state must be preserved.
No production access mutation or invitation is part of verification.

The canonical host-network activation may replace/restart supporting containers using the same
immutable MCP/MinIO images and configuration. Recovery must retain the original compatible backend
and web, verified against the same fresh backup. This is not an MCP release or provider activation.

## Evidence collected during preparation

- The branch was pushed; exact-source CI run:
  [40629691490](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/40629691490).
  Completed successfully for the exact candidate; branch and main both include this source.
- The exact current source and release delta secret scan found no actual new secret. Twenty
  reviewed fixture/documentation findings match prior bytes; the Backend OS finding's unchanged
  context was verified even though the document gained the Users contract paragraph.
- Production initial health was HTTP 200 with zero backend/web restarts. Preparation uses private
  release directories, bounded processes and a disposable loopback MySQL database, never the
  functional/production database for tests. No business values or credentials enter this record.
- A first preparatory unit was stopped during MCP tests to supply the standard root HOME required
  by the Maven wrapper. It is not counted as a complete PASS. The full corrected repetition is
  the only acceptable protected preflight evidence.

The initial CI run [40628337943](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/40628337943)
failed the generated learning catalogue check after the Users owner changed. Its successful backend,
TypeScript and build steps did not make that candidate ready. The Users bilingual chapter was
updated to explain independent eligibility states, preserved assignments, unknown catalogue retry
and recoverable save failures; its version is now 3. The catalogue and coverage were regenerated.
All 35 learning regressions and the generator consistency check passed locally. The final candidate
requires its own complete CI, preflight, immutable images and recovery evidence; no incomplete first
run is relabeled as an exact-candidate PASS.

## Final technical preparation — 2026-10-28T04:20:07.614469+00:00

| Gate | Evidence | Result |
| --- | --- | --- |
| Exact-source CI | [40629691490](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/40629691490), source `89a5afa6c914a243211ab957283597ca4c02baf2` | PASS |
| Protected canonical production preflight | 4,260 Java tests, zero failures/errors; three explicit opt-in omissions described below | PASS |
| MCP/deployment TAP checks in preflight | 196 tests passed; zero failures/skips | PASS |
| Frontend | TypeScript, build, full CI regression matrix; 22 Users and 35 learning checks included | PASS |
| Affected browser flow | The [Users review](2026-10-28-users-module-access.md) records create/edit, retained/unknown modules, tab errors, company roles, eight locales, mobile/dark mode and race coverage | PASS (synthetic intercepted APIs) |
| Artifact scope | Extracted JAR and all frontend files match the verified builds; base layers and runtime defaults retained | PASS |
| Secret scans | No actual current-source/delta secret; 20 reviewed fixture/documentation findings; no image secrets | PASS; historical TEST revocation remains unresolved |
| Image analysis | Exact OCI root/platform/config and every blob SHA256 verified; fresh full scans and CycloneDX SBOMs for backend, web, recovery backend and unchanged MCP | PASS with two non-applicable Spring notices below |
| Backup/off-host | Fresh `production-20261028T041409Z`; SQL, objects, environment and protected files verified by manifest and compressed-stream checks on both hosts | PASS |
| Disconnected candidate/recovery | Network none, events disabled, application SELECT-only; full original rows/columns, objects, history V365, billing and access compare identically | PASS |
| Runtime/proxy/configuration | Exact immutable image tests, both Nginx configurations, protected real environment and recovery regressions | PASS |
| Canonical dry run/capacity | Host-network dry run; protected runtime/App Test unchanged; 92,252,848,128 free bytes, above the 10 GiB floor | PASS |
| Production activation/observation | No activation authority or attempt yet | PENDING |
| Human original-incident acceptance | Original failing HTTP response unavailable; no production user/access write in this review | UNKNOWN |

The three preflight omissions are the explicit V289 schema-upgrade rehearsal (N/A for this unchanged
V365 release) and two opt-in actual-MinIO attachment cases. CI separately passed its actual-MinIO
attachment step and server-runtime smoke. No relevant Users test was skipped and no skipped case
is counted as passed. Existing Vite large-chunk warnings remain outside this focused correction.

Immutable image identities:

| Component | Image ID |
| --- | --- |
| Backend | `sha256:e8c2cd093d19c3aebbc9a49139ccac2807c75608034fab5cad358b92ba9d74bc` |
| Web | `sha256:ea5861ba318262ef8ed341da6fcedb6cd2d85ba862113a04c8ba8d6cfa0647db` |
| Compatible previous backend | `sha256:2cb8872f88de748bdc9ce6199ed39f6433f7c78665ac104be786d176cd89263e` |
| Unchanged MCP | `sha256:a962dea27500a53977decd5486a5ba1c02ac90cf2dc1fff50eb1807cae1220b8` |

Only the four Users owner classes/their nested types and the regenerated bilingual learning JSON
differ in the backend JAR. No migration or dependency differs. Exact current MCP and MinIO versions
are retained; App Test is not activated. Existing business/provider configuration and protected
files must continue to match the captured baseline at activation.

To avoid retransferring identical large layers, the final OCI archives combine fresh daemon
manifest/config/new blobs with content-addressed blobs from the byte-identical deployed base.
Every final blob, root digest, platform/config identity and source label was verified before the
full image scans; this is transport reuse, not reused scan results. An abandoned partial full
transfer was never used as scan or readiness evidence.

Fresh scans retain the two previously reviewed Spring notices, with scanner severity preserved.
The official [XsltView advisory](https://spring.io/security/cve-2026-47884/) and
[SSE view-fragment advisory](https://spring.io/security/cve-2026-47890/) were rechecked on
2026-10-28 UTC. The required rendering paths are absent: two fresh MVC runtime exposure tests
passed and application source contains no XSLT/SSE view-fragment renderer. This establishes
non-applicability for this unchanged MVC configuration; it does not mean Spring 6.2.19 was patched
or waive an exploitable finding.

## Authority still pending

Historical Stripe TEST-key revocation remains HIGH and unresolved. The previous exception is
closed. The [release proposal](../decisions/2026-10-27-users-access-production-release.md) requires
fresh explicit owner acceptance for these exact source/images before one production activation.
No provider, entitlement, user or permission mutation is authorized by technical readiness.
