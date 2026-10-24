# Files preview and complete local-workspace release — 2026-10-24

Status: DEPLOYED to production; final verification passed at
**2026-10-24T23:18:54.118712+00:00**. Technical preparation completed at
2026-10-24T20:19:58Z. The owner separately authorized the bounded historical
Stripe TEST-key deferral; its window is now closed and cannot be reused.

## Source and behavior

Application candidate: `43394a0445a4929a83111440f7d0b621e017051d`.
The release branch and `main` contain the complete earlier 76-path primary-local
cut plus the nine captured Files correction paths. The primary checkout is clean
on published continuation branch `codex/next-work-20261024-files`. Later changes
are outside this captured cut and must be preserved. The [source decision](../decisions/2026-10-24-files-preview-production-release.md)
supersedes the unactivated afternoon candidate; all its earlier HR incident-report,
email template-field/inline-image, workspace scrolling and shared-print work is
retained. See the [earlier behavior and evidence](2026-10-24-afternoon-local-release.md).

Files now shows private image thumbnails in grid and list views, visible Home,
Up and breadcrumb navigation above filters, and a direct Move action. The move
dialog identifies the destination, supports the owner's main level and preserves
the selected destination and mutation identity through a failed-save retry.
Read-only shares have no Move action. Existing routes, actor/CSRF, tenant and
permission checks, transactional moves and content APIs remain authoritative.

Thumbnails reuse the authenticated, same-origin, no-store content endpoint.
Only passive PNG/JPEG/GIF/WebP files up to 10 MiB load automatically, lazily.
Large, opaque, unavailable and trashed images retain the existing icon fallback;
existing explicit preview/download remains available. There is no public URL,
derived storage copy, new cache or new backend/schema change for Files.

Production is the sole target; App Test remains unchanged. No migration is added;
the entire V360 lineage remains unchanged. Prices, subscription references,
permissions and protected provider settings are preserved. No engineering check
sends real mail or changes business records.

## Verification

Exact-candidate [CI](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/40127640423)
passed at 2026-10-24T20:19:58Z, including real isolated MinIO attachment checks.
Required engineering checks pass:

- Locked-dependency TypeScript and production build; complete frontend block:
  1,134 tests, zero failures/skips; Files includes 14 focused cases and six-locale
  parity. Learning-content generation remains current.
- Native Chrome Files flow: private thumbnail success/failure, large/SVG files
  without automatic reads, list/grid, Home/Up/history, nested/root moves, retry,
  actor/CSRF, read-only shares, 1440/390/320 px and dark presentation. Desktop and
  narrow screenshots were inspected. Fixtures are synthetic; real mutations: zero.
- Full canonical protected preflight repeated on the exact source with isolated
  MySQL: 4,079 backend tests, zero failures/errors and three established skips;
  16 focused incident cases and two MVC exposure cases pass. The complete
  MCP/deployment block passes 188 tests. No functional/production database is
  used for application tests.
- Actual proxy/MCP containers, anonymous boundaries, recovery/storage scripts,
  frontend/MCP dependency audits and source-secret review pass. Audits report zero
  vulnerabilities; current real source secrets and complete delta findings: zero.
- All four exported OCI image chains are verified; full CycloneDX inventories and
  secret scans are retained. Secrets: zero. Web and MCP have no HIGH/CRITICAL
  findings. Backend and recovery retain two reviewed Spring MVC advisories whose
  XSLT/SSE-view-fragment applicability conditions are absent, backed by the two
  MVC regressions. This does not claim Spring is patched:
  [CVE-2026-47884](https://spring.io/security/cve-2026-47884/),
  [CVE-2026-47890](https://spring.io/security/cve-2026-47890/).

## Artifacts and recovery

The prepared backend from `a5064dfc` is retained after checking every unchanged
source/runtime input and every compiled archive entry against the fresh exact-source
build. Entry bytes and paths match; whole-ZIP hash differences are timestamps only.
The web image contains the complete new distribution. Runtime base layers/defaults
and delivered JAR/web bytes are verified. MCP and the previous recovery image are
unchanged. No claim is made that the reused backend was rebuilt with a new label.

| Component | Immutable image ID |
| --- | --- |
| backend | `sha256:bfcf3ed30984e0feb251cff7539cd1adfb79204b2d0603accb3df75f975b6b11` |
| web | `sha256:ee47a4caae057ae605bde3ca4b844b55d909f74ba167cae33f7aad3e40cceed7` |
| MCP | `sha256:071fb61e5586584c636290fdc3b1918ca140559ee51d7edb6957b5e992a1af11` |
| backend recovery | `sha256:af414e60dcf6a78076d5b591761f90c5edf3337d2e2b8c32b3d9c0a0e8aa28f9` |

Fresh backup `production-20261024T201611Z` includes SQL, all objects and protected
configuration. Its manifest, compressed streams, protected hashes and full
off-host copy pass. Disconnected, SELECT-only restoration passes both candidate
and exact previous recovery startup; complete original raw rows/columns,
objects, billing references and original Flyway history match. Workers, providers
and database events are disabled in the isolated clone. No production records
are changed. Canonical production dry run passes without replacing containers.
Activation includes strict source/artifact/evidence guards, public probes, protected
runtime comparison and a five-minute, six-sample observation before closure.

## Capacity, preparation failures and remaining limits

The fresh-backup capacity guard stopped safely before activation. The operator
reviewed `df` and Docker accounting and retired only reproducible build/test copies,
unreferenced test/build material and public Maven/npm download caches. Local/private
Maven artifacts/settings, business data, backups and recovery images are preserved.
This attempt alone uses a reviewed 7 GiB floor (`DEPLOY_MIN_FREE_MB=7168`); the
canonical default remains 10 GiB. After private-restore cleanup, 7,833,059,328 bytes
are free. More host capacity remains an operational follow-up. No database/MinIO
business volume is deleted. Earlier environment/probe preparation corrections
are described in the superseded report; the complete exact-source preflight and
restore are repeated successfully here, with no application gate bypass.

Human product acceptance is UNKNOWN until owner review. Synthetic engineering
fixtures do not certify the owner's original PDF or recipients' delivery. The
historical Stripe TEST-key revocation remains HIGH and unresolved. The prior
[authorization](../decisions/2026-10-24-production-local-stripe-deferral.md) was not
reused; the separately authorized [current decision](../decisions/2026-10-24-files-preview-stripe-deferral.md)
now records this activation and its closed window.
New schema, payment/provider activation, commercial pricing and access expansion:
N/A. Protected raw evidence and credentials are not committed.


## Activation and closure

The owner separately answered “Autorizar excepción puntual” for exact application
source `43394a0445a4929a83111440f7d0b621e017051d`, production only. The private bounded record was
created at **2026-10-24T23:11:46.593683+00:00** and had a maximum expiry of
**2026-10-25T01:11:46.593683+00:00**. Activation started at **2026-10-24T23:12:00Z**;
public probes and protected runtime verification passed at
**2026-10-24T23:13:25Z**. The six-sample observation ran from
**2026-10-24T23:13:25.848Z** to **2026-10-24T23:18:26.831Z**, exceeding five minutes, with
web/API/storage/MCP healthy and zero backend errors or container restarts.
Authenticated MCP reads retain the same business scope and currency.

The final comparison again passed for exact image identities, V360's complete
unchanged lineage, protected configuration, prices, subscription references,
existing access and unchanged App Test. Previous immutable application images
remain stopped and available for recovery. Available host capacity at closeout:
**7,783,198,720 bytes**, above this attempt's reviewed 7 GiB floor. Increasing
host capacity remains an operational follow-up; canonical defaults are unchanged.

Final verification completed at **2026-10-24T23:18:54.118712+00:00**. The scoped authorization
closed at **2026-10-24T23:18:54.121340+00:00**, with `authorized=false` and `canBeReused=false`.
The historical Stripe TEST-key finding remains HIGH and unresolved. Human product
acceptance remains UNKNOWN until owner review. Documentation-only readiness and
closeout commits change no runtime inputs and authorize no subsequent activation.
