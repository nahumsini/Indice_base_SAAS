# Afternoon local-workspace production release — 2026-10-24

Status: SUPERSEDED before activation by the [Files correction cut](../decisions/2026-10-24-files-preview-production-release.md). No production activation occurred for this candidate. The readiness evidence below remains historical evidence for its exact immutable artifacts.

## Scope and source

The primary workspace's complete captured set of 76 changed/untracked paths is
integrated into `release/local-update-20261024`. Release preparation also updates
reviewed learning content and CI coverage and fixes an iframe-body null access
found by the native incident-report browser regression. Source candidate:
`a5064dfc5ada1498c72dee3cd84c5e3d1d7702f6`.

Production is the sole target under the
[sequencing decision](../decisions/2026-10-24-afternoon-local-release.md).
App Test is held unchanged. No Flyway migration is added; V360 and its complete
installed lineage remain unchanged. Runtime images replace the backend JAR and
web distribution over the previously reviewed immutable runtime bases. MCP uses
the exact previously active image. Artifact provenance compares every delivered
JAR/web byte, runtime base layers and defaults, and the exported OCI digest chain.

## Behavior

- HR's incident report provides a bounded, read-only payroll review for a selected
  period, employee, unit or business. The backend enforces authenticated company,
  operational scope and management permission. Preview and printing support a
  team report or a single employee without exposing another employee's document.
- The module workspace contains its own scrolling and shared print identity,
  logo fallback and table metadata are retained across the affected modules.
- Individual-mail composition exposes pending template fields, applies entered
  values safely to subject and formatted body, preserves inline images, and
  focuses incomplete fields before review. The source template, recipients and
  attachments remain intact. The same composed message goes to all recipients;
  this does not add per-recipient campaign personalization.
- The shared print preview tolerates an iframe whose document body is not ready.

API routes and existing shapes, tenant/permission boundaries, billing totals,
prices, subscription references, existing access and provider settings are
preserved. No validation sends real mail, enables a payment provider or modifies
business records. Backend additions are read-only; schema changes are N/A.

## Verification

Exact-candidate [CI](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/40123858702) passed at 2026-10-24T19:31:15Z. Application code on `main` and the release branch matches the candidate; documentation-only commits do not alter runtime inputs; `codex/next-work-20261024-afternoon` is published and the primary checkout is clean. Byte checks prove all 76 captured local paths are present in the integration commit. Completed engineering evidence includes:

- Frontend TypeScript and production build, the complete 1,130-test exact-candidate CI frontend regression block with zero failures/skips, 37 focused regressions and native email/incident
  browser flows. The exact-candidate CI independently repeats the suites.
- Native email coverage: real file chooser, inline image and undo/caret behavior,
  save/reload, template image preservation, pending-field completion including
  escaping and split formatted tokens, review and mobile/dark presentation.
- Native incident coverage: query, summaries/details, isolated escaped print
  document, failed/stale requests disabling print, 1440/390/320 px and dark mode.
- Full protected production preflight on the exact source with a disposable,
  resource-bounded MySQL database: 4,079 tests, zero failures/errors, three established skips; 16 focused incident-report cases and two MVC exposure cases pass. The complete MCP/deployment TAP block passes 188 cases. Functional/production databases are not test
  targets. The initial validation environment lacked root HOME; the corrected
  service repeats the entire canonical check. No application gate is bypassed.
- Full frontend/MCP dependency audits return zero vulnerabilities. Source scan
  findings are byte-equivalent reviewed fixtures/script references; no current
  actual secret is present. The complete committed delta has zero findings.

Image security evidence includes full CycloneDX inventories and secret scans
for candidate backend/web, unchanged MCP and exact recovery backend. Two Spring
MVC advisories remain in the dependency inventory. Official applicability
conditions concern XSLT implicit view resolution and SSE view fragments; neither
feature is used and the two MVC exposure regressions must pass. This is evidence
of non-applicability, not a claim that Spring is patched:
[Spring CVE-2026-47884](https://spring.io/security/cve-2026-47884/),
[Spring CVE-2026-47890](https://spring.io/security/cve-2026-47890/).

## Recovery and operation

The fresh production backup of SQL, object storage and protected configuration passed its manifest and compressed-stream checks. Its off-host copy passed every file/protected-file hash and compressed-stream check. A disconnected private restore passed candidate and exact-prior recovery startup, anonymous boundaries, complete original row/column raw-value comparisons, billing references and the entire original Flyway history. The private application authority was SELECT only and database events/providers/workers were disabled. The same protected production deployment command passed dry run without changing active containers. Activation and five-minute observation remain pending. Original immutable images and data are preserved.
Two preparation guards stopped safely before activation: a generated-directory Git check rejected an out-of-tree build-context path, then the backup refused insufficient capacity. The cleanup check was scoped correctly and reproducible builder cache was retired; all application tests and artifacts remained unchanged. The first restore boundary probe omitted the incident endpoint's required `from`/`to` parameters, so framework binding returned 400 before controller execution. The complete request is the documented anonymous 401 case, also covered in the focused MVC regression. Only that probe input was corrected; the full repeated restore passed with the same immutable application images and a strict 401 assertion. Only reproducible Docker build cache and unmounted, untracked generated test/
build copies may be retired after artifact-byte verification. Database/MinIO
volumes and business backups are never deleted to obtain capacity.

Human product acceptance is UNKNOWN until owner review. Synthetic engineering
fixtures do not certify the owner's original 463 KB PDF or actual recipients'
delivery. This release is not a security certification.

The historical Stripe TEST-key revocation remains HIGH and unresolved. Its prior exception is closed; no new exception or activation is claimed by this readiness record. See the [previous closed decision](../decisions/2026-10-24-production-local-stripe-deferral.md).

## Immutable runtime identities

| Component | Image ID |
| --- | --- |
| backend | `sha256:bfcf3ed30984e0feb251cff7539cd1adfb79204b2d0603accb3df75f975b6b11` |
| web | `sha256:0e221a1ab7a9cbb2e6d17a5d6192dd148a72ac732904829b2afd21bee479280b` |
| mcp | `sha256:071fb61e5586584c636290fdc3b1918ca140559ee51d7edb6957b5e992a1af11` |
| backend-recovery | `sha256:af414e60dcf6a78076d5b591761f90c5edf3337d2e2b8c32b3d9c0a0e8aa28f9` |

## Capacity and limits

The operator reviewed `df` and `docker system df`, retained all business data/backups/recovery images, and retired only reproducible build cache and unmounted generated copies. At the final dry run, 8.47 GiB was free. This attempt uses the documented per-run 8 GiB floor; the repository default remains 10 GiB. Additional host capacity remains an operational follow-up. No database/MinIO business volume was deleted.

Schema/new migration, new payment/provider activation and new commercial prices: N/A. Manual product acceptance remains UNKNOWN.

Changed-file review: [complete source comparison](https://github.com/nahumsini/Indice_base_SAAS/compare/4abd0f1284f34e3dba6a745c4f0dd07c0394fcaf...a5064dfc5ada1498c72dee3cd84c5e3d1d7702f6). Owner contracts and frontend/backend canonical documentation are included in the source cut. Protected raw backups, credentials and operational evidence are not committed.
