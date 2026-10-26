# Complete local payroll/workspace release — 2026-10-26

Status: AUTHORIZED for production; activation has not started. Readiness was verified
at 2026-10-26T18:23Z. The historical Stripe TEST-key revocation remains unresolved;
earlier closed exceptions are not reused. The owner separately authorized the exact-candidate exception recorded below. Human product acceptance remains UNKNOWN.

## Source and behavior

Application source: `30f3552f9d697c331869c80bdaed1d1aeb4026f7`. The primary local checkout, including work from
other conversations, is published on `codex/next-work-20261025` and `main`.
All 74 initially changed/untracked paths are retained along with the existing
Mexico payroll/5S commit. Other worktrees are outside the earlier explicitly chosen
primary-folder scope. The runtime delta from production `43394a04` spans 207 paths.
See the [source decision](../decisions/2026-10-26-payroll-workspace-production-release.md).
Documentation-only readiness/closeout commits do not alter this runtime source.

Changes cover Canada/Mexico payroll profiles, employee editing and payroll review,
Ideas Board/5S/project presentation, Funneling prompts, guides and regression coverage.
Fiscal profiles are edited within the employee wizard and saved atomically under
tenant, scope, permission, CSRF, version and retry controls. Unsupported fiscal cases
retain approval holds. Operational payroll and excluded employees retain separate
behavior; approved payroll snapshots are not automatically recalculated.

The [Canada](../payroll/canada-payroll-profile-contract-v1.md) and
[Mexico](../payroll/mexico-payroll-profile-contract-v1.md) contracts define the actual
ordinary-pay coverage and remaining cases. This is not certification of all payroll
law, all state/provincial levies, CFDI/PAC, T4/RL-1 or remittance filing. No production
employee amounts, payroll approvals, mail or provider actions are used as test data.

## Verification and preparation corrections

[Exact-source CI](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/40372360809)
passed, including actual isolated MinIO attachment tests and all image builds.
Required technical evidence passes:

- Complete frontend regression block: 1,284 tests, no failures/skips. TypeScript,
  production Vite build, six-locale learning content and typography checks pass.
  Mexico/Canada browser fixtures cover visibility, validation, unified save, retry,
  draft preservation, read-only access and responsive layouts. The existing large
  bundle advisory remains; it is not a build failure.
- Full canonical preflight repeated with the protected production configuration and
  an isolated disposable MySQL database: 4,223 backend tests, zero failures/errors,
  three established skips. Migration uniqueness and Flyway startup pass.
- MCP/deployment source tests: 188 passes. Actual container HTTP/OAuth/proxy tests,
  both Nginx configurations and host-network recovery regressions pass. Web runtime
  tests were repeated after the dependency patch below.
- Current real source secrets: zero; complete application-delta secret findings:
  zero. Every exported OCI blob and runtime image identity was verified. Full
  vulnerability/secret scans and CycloneDX inventories are retained for all four
  final images; image secret findings are zero.

The initial candidate failed CI on stale payroll fixtures and duplicate generic
fiscal-warning counts. The final source fixes the count while retaining a block for
legacy/null snapshots, updates the atomic employee controller mock, and uses reviewed
2026 profiles in the mixed-country integration flow instead of unsupported year 2099.
The flow proves that a manual fiscal earning blocks approval, then approves the reviewed
ordinary calculation after removing that adjustment. Learning chapters were brought
back to the required three-step structure; missing 5S guidance and relevant CI cases
were added. Final focused regressions and the full suite pass; failures were not skipped.

## Final images and dependency findings

| Component | Immutable image ID |
| --- | --- |
| backend | `sha256:1ac7001b12a618fe94c17a8a30addc374fda22630515c9c47b41cdc7fb7bbb4c` |
| web | `sha256:afdc58bab96cb46ef37ad127e3daa90d61fbc927d623fa3a7db650d9d395b3c4` |
| mcp | `sha256:071fb61e5586584c636290fdc3b1918ca140559ee51d7edb6957b5e992a1af11` |
| backend-recovery | `sha256:1f9a23b0f453294a92cce6a0a6adb0fa517b0a2a4fdf9015c4be175196d781cc` |

The JAR and web files match the protected-preflight build. Runtime base layers and
defaults are preserved. MCP is the exact currently running image with unchanged
source/dependencies. The compatible backend recovery keeps every original archive
entry and adds only the five forward migration resources, without repair or bypass.

A fresh scan found [CVE-2026-92392](https://curl.se/docs/CVE-2026-92392.html) in the
prepared web image. It was superseded by `indice-erp-web:30f3552f9d69-curl823`, using
`apk add --no-cache --upgrade curl=8.23.0-r0 libcurl=8.23.0-r0`. Resolved dependency
updates are musl 1.2.6-r3 and c-ares 1.34.9-r0. HTML, Nginx binary/configuration and
runtime defaults remain byte-identical; both real proxy configurations pass again.
Final web and MCP images have no HIGH/CRITICAL scan findings.

Backend and backend recovery retain two scanner findings whose exposure conditions
are absent: [XsltView/wildcard rendering](https://spring.io/security/cve-2026-47884/)
and [SSE view fragments](https://spring.io/security/cve-2026-47890/). Source inspection
and two MVC exposure regressions support that applicability review; Spring is not
represented as patched. The retained prior web rollback still contains the old curl
tool, but Nginx does not link libcurl and its entrypoint scripts do not call curl;
it exposes no curl HTTP/2-upload path. That bounded recovery applicability review
does not claim the old tool was patched or authorize arbitrary curl use.

## Backup, recovery and capacity

Fresh backup `production-20261026T180636Z` includes SQL, all objects and protected
configuration. All manifest hashes, compressed streams, protected-file hashes and
the complete off-host copy pass. The disconnected restore applies V361–V365 and
starts both the candidate and compatible recovery. Original Flyway history and all
original raw rows/columns remain unchanged; only newly inserted versioned reference
rows are excluded using captured original IDs. Complete objects are extracted and
byte-compared. Billing and existing access remain unchanged. Workers/providers and
DB events are disabled in the clone; application authority is SELECT only.

The canonical dry run passes with the final images and explicit compatible backend
recovery. Production and App Test still run their prior versions. Activation will
retain compatible rollback, verify public/anonymous boundaries and protected state,
and observe six health samples over at least five minutes before closing authorization.

The backup initially stopped on capacity. Only generated build/test copies, the
single disposable test image and inactive build cache were retired. No business data,
backup, active image or recovery image was deleted. After cleanup/restoration,
5,752,053,760 bytes are free. Following the operator review allowed by
`deployment/README.md`, this attempt uses a 5 GiB floor; the canonical 10 GiB default
is unchanged. Additional host capacity remains an operational follow-up. A transient
SSH timeout while collecting evidence was resolved through the existing authenticated
connection; public health remained HTTP 200 and the evidence was retrieved intact.

## Remaining gate and limits

The historical Stripe TEST-key finding remains HIGH, unresolved, owned by the release
owner. The [previous window](../decisions/2026-10-24-files-preview-stripe-deferral.md)
is explicitly closed and cannot be reused. The owner has now provided the separate scoped decision below; production activation
and its observation are still pending. App Test changes,
provider activation, pricing changes, access expansion and real payroll/mail actions:
N/A. Raw protected evidence, backups and credentials are not committed.

## Owner authorization

The owner separately answered “Autorizar excepción puntual” for application source
`30f3552f9d697c331869c80bdaed1d1aeb4026f7`, production only. The
[bounded decision](../decisions/2026-10-26-payroll-workspace-stripe-deferral.md) was
recorded at **2026-10-26T18:27:33.687639+00:00** and expires immediately after this one attempt,
no later than **2026-10-26T20:27:33.687639+00:00**. The historical TEST-key revocation remains
HIGH and unresolved. No earlier exception is reused.
