# Sales Mailing / Funneling production release — 2026-10-26

Status: DEPLOYED to production. Activation, authenticated MCP continuity and
five-minute observation passed; the bounded authorization is closed. Exact-source
CI, protected preflight, artifact scans, complete off-host backup verification,
isolated restoration and the final activation dry run pass.
Human product acceptance remains UNKNOWN. App Test is unchanged.

## Source and behavior

Application source: `2e18cf7523ffecf48193577fd1d1868616b9656b` on
`codex/next-work-20261025` and `main`. The [source decision](../decisions/2026-10-26-sales-mailing-production-release.md)
records the primary-folder scope and all 15 original modified/untracked paths,
including work from other conversations. The application commit covers 21 paths.
Later test/documentation commits do not change the runtime source.

Mailing separates writing and template selection, retains drafts across those
views, handles image/file/template loading independently, and prevents blank editor
clicks from opening the image picker. Custom variables can remain in a saved draft
but must be completed before review, test delivery or launch. Resolving variables
preserves inline images and the supported recipient-name token. Review loading can
be retried. Funneling updates campaign cards and their direct content navigation,
while preserving the owner guard, selection, persistence and duplicate behavior.
Six-language copy and the bilingual learning catalogue describe the resulting flow.

No Java application, dependency, route, permission or migration changes are included.
An entry-by-entry JAR comparison proves that only
`BOOT-INF/classes/ai/learning-catalog-v1.json` changes in the backend. Schema stays
V365. Payroll, billing, provider configuration and existing access remain unchanged.

## Verification

[Exact-candidate CI](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/40389532980)
passes, including image builds, actual isolated MinIO attachment checks, runtime
smoke and both real Nginx proxy configurations.

- Full frontend regression block: 1,285 passes, zero failures/skips. TypeScript,
  production build and generated learning catalogue validation pass. The existing
  large-chunk build advisory remains.
- Browser fixtures cover blank writing, template selection/application, unresolved
  variable guards and draft save, inline image insertion, variable completion,
  save/reopen, failed-review retry, mobile and dark mode. The existing complete
  Mailing editor browser regression also passes. All business APIs are synthetic;
  no real mail is sent.
- Full canonical preflight with the protected production environment and a disposable
  isolated MySQL database: 4,223 backend tests, zero failures/errors, three established
  skips. MCP/deployment source tests: 188 passes, zero failures/skips. Migration
  uniqueness and Flyway startup pass.
- Actual final-container HTTP/OAuth/proxy and deployment recovery tests pass.
- Current real source secrets: zero. The application-delta secret scan is empty.
  Every exported OCI blob and runtime identity is verified; all four final images
  have fresh full vulnerability/secret scans and CycloneDX inventories. Exact
  unchanged recovery/MCP exports were reused and fully reverified/rescanned.

Preparation corrected a stale Funneling test expectation for existing CRM provider
navigation and added affected tests to CI. It updated the required learning lessons
and added an executable browser regression. A missing account-home environment in
one private verification process and a private restoration-runner restart were
resolved without changing application code. Final passed runs supersede these
failed preparation attempts; no production activation had occurred.

## Immutable artifacts and scan applicability

| Component | Image ID |
| --- | --- |
| backend | `sha256:bc6953a7785b1ad830235fd1cab47da6674bd2311f7ae963b3268f0e36bda3f6` |
| web | `sha256:6ca489bc9c556facd9f95f8247f86c7db60cba1835975892cd9805473df72182` |
| backend-recovery | `sha256:1ac7001b12a618fe94c17a8a30addc374fda22630515c9c47b41cdc7fb7bbb4c` |
| mcp | `sha256:071fb61e5586584c636290fdc3b1918ca140559ee51d7edb6957b5e992a1af11` |

The web and MCP scans have no HIGH/CRITICAL findings. Backend and recovery retain
[CVE-2026-47884](https://spring.io/security/cve-2026-47884/) and
[CVE-2026-47890](https://spring.io/security/cve-2026-47890/) as scanner findings with
absent exposure conditions: no XSLT/wildcard MVC rendering or SSE view fragments.
Two fresh MVC exposure regressions pass, and every application class matches the
previously reviewed deployed backend. This is an applicability review, not a Spring
patch or a platform-wide security certification. Image secret findings are zero.

## Backup, recovery and capacity

Fresh backup `production-20261026T201316Z` contains SQL, all objects and protected configuration.
The complete off-host copy passes manifest, protected-file and compressed-stream
verification. The object archive is fresh; an older verified off-host archive was
used only as a transfer seed and the final bytes were checked against the new manifest.

Isolated restoration passed at **2026-10-26T20:19:28Z**.
Both the candidate and the exact prior backend boot on the restored V365 data; all
original raw rows/columns, Flyway history and objects remain unchanged. The final
canonical production dry run and protected-state comparison also pass.
Workers/providers and database events are disabled; the application is SELECT only
and the private network has no external access. Recovery uses the exact prior
containers, with no schema repair or recovery-image rewrite.

The first backup attempt stopped on capacity. Unused build cache and an inactive,
re-downloadable Trivy database cache were retired after mount/process checks. No
business data, backup, scan report, active image or recovery image was deleted.
The final review records **7087800320 bytes** available. The
canonical 10 GiB default is unchanged; the successful dry run enforces the reviewed
5 GiB floor allowed by `deployment/README.md`. Additional host capacity remains an
operational follow-up.

## Authorization and activation

The [previous Stripe TEST-key exception](../decisions/2026-10-26-payroll-workspace-stripe-deferral.md)
closed and cannot be reused. Historical TEST-key revocation remains HIGH and
unresolved. The owner now separately answered “Autorizar excepción puntual” for
this exact candidate under the [bounded decision](../decisions/2026-10-26-sales-mailing-stripe-deferral.md).
All technical gates passed before authorization; only that historical blocker is deferred.
Post-activation smoke, protected-state checks, authenticated MCP continuity and the
five-minute observation passed. Raw protected evidence is not committed.

## Production closeout

Activation of the exact prepared application revision began at **2026-10-26T20:29:05Z**.
Initial activation verification completed at **2026-10-26T20:30:30Z**.
The observation ran from **2026-10-26T20:30:30.722Z** to **2026-10-26T20:35:31.648Z**:
six samples over at least five minutes, with HTTP 200 for public web, API, private
MCP readiness and object storage. All four containers stayed running with zero
restarts, and no new backend ERROR/FATAL/out-of-memory entries were observed.
Public web/API checks from the off-host workstation also passed.

An authenticated, read-only MCP snapshot succeeded after activation with the same
tenant scope and currency as before. No real mail, payment or payroll action was
used as a test. Final protected-state verification passed at **2026-10-26T20:35:43.564960+00:00**:
schema V365, prices, subscriptions, existing access, runtime settings and App Test
were preserved. The active images match the immutable artifact table above, and
the exact prior application containers remain available for recovery. Final host
free space was **7080747008 bytes**; additional capacity remains a follow-up.

The exception closed at **2026-10-26T20:35:43.567845+00:00** and cannot be reused. Historical Stripe
TEST-key revocation remains HIGH and unresolved. Human product acceptance remains
UNKNOWN; technical checks do not claim end-user acceptance or real mail delivery.
All captured primary-workspace changes are published on the working branch and
`main`; documentation-only closeout commits preserve the deployed runtime source.
