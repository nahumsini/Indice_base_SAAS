# Marketing workspace production readiness — 2026-10-27

Status: SUPERSEDED BEFORE ACTIVATION by the
[OAuth catalog correction](2026-10-27-oauth-catalog-release.md). The readiness below
applies only to source `8393d85a`; it cannot authorize a later candidate.
Historical Stripe TEST-key revocation
remains HIGH and unresolved; an applicable exact-candidate authorization is
required before activation. Human product acceptance remains UNKNOWN.

## Source and behavior

Application source: `8393d85ab05302d829bb9f7f921cf0fddbc44346` on
`codex/next-work-20261025`. The [source boundary decision](../decisions/2026-10-27-marketing-workspace-production-release.md)
captures all 71 changed primary-local paths, including work from outside this chat.
Documentation-only readiness commits do not change the tested runtime source.
The earlier paused Mailing candidate was never activated; its correction is included.

Changes cover Marketing navigation, Whatsapping campaign preparation and work,
template management, contact correction, individual messages, manual reply
outcomes and the authorized Sales opportunity projection/creation/return/stage
filters. The included Correo/Mailing correction restores bounded CID images in
Sent, formatted delivery previews and quota-wait explanations. The learning
catalogue and browser regression describe the current flow.

Tenant/account/owner authorization, exclusions, manual confirmation, optimistic
versions, recipient deduplication, safe HTML/images, attachment ownership and
sending limits remain enforced. No campaign was restarted and no real email or
WhatsApp message was sent by release verification. Local synthetic phone data is
excluded from production. Payroll, dependencies, routes, permissions and schema
are unchanged; Flyway stays V365. App Test remains unchanged.

## Verification

[Exact-source CI](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/40559257778)
passed on 2026-10-27, including isolated actual-MinIO attachment checks, container
builds, runtime smoke and actual Nginx traffic controls.

- Canonical protected-environment preflight: 4,239 backend tests, zero failures or
  errors, three established skips; clean compilation, migration uniqueness and
  startup pass against a disposable `indice_test_db`, never functional/production.
- Frontend CI regressions: 1,332 passes, zero failures/skips. TypeScript, production
  build and generated learning-catalogue validation pass. The existing large-chunk
  build advisory remains. The focused 59-check Whatsapping/Sales set also passes.
- MCP/deployment preflight: 188 passes, zero failures/skips. Final-image HTTP,
  OAuth and proxy-trust checks pass 20 tests; both actual Nginx configurations and
  deployment recovery regressions pass separately.
- The exact-source synthetic browser flow passes templates, 27-contact selection,
  save failure/retry, popup rejection, automatic draft activation, explicit message
  preparation, manual confirmation, next contact, conflict retention, exclusion,
  resume, mobile focus/dirty exit and dark mode. External requests are blocked.
- Source tree, application delta and new Git history have no actual new secrets.
  Twenty unchanged source-scanner false positives match previously reviewed file
  hashes. Every final OCI blob/runtime identity is verified; all four image scans
  have zero secret findings and retain CycloneDX inventories.

## Immutable images and applicability

| Component | Image ID |
| --- | --- |
| backend | `sha256:ab3e929af76b0a8c0c33f6e2eff0b2a767f148117dd42da5c2d0ca91f44b77b8` |
| web | `sha256:3a6b9eec8a2a88ec2752ec48856c966edf0381b28fff8e63dc84258668cdf83f` |
| backend recovery | `sha256:bc6953a7785b1ad830235fd1cab47da6674bd2311f7ae963b3268f0e36bda3f6` |
| mcp | `sha256:071fb61e5586584c636290fdc3b1918ca140559ee51d7edb6957b5e992a1af11` |

JAR bytes and every frontend asset match the built images. Entry comparison with
the deployed backend restricts all 41 changes to the reviewed Email/Mailing/
Whatsapping classes, the Sales opportunity projection and learning resource.
Recovery/MCP image bytes are unchanged and were reverified/rescanned.

Web/MCP scans have no HIGH/CRITICAL findings. Backend/recovery retain the scanner
findings [CVE-2026-47884](https://spring.io/security/cve-2026-47884/) and
[CVE-2026-47890](https://spring.io/security/cve-2026-47890/). Applicability assessment
finds the required XSLT/implicit wildcard view-rendering and SSE view-fragment
conditions absent: two fresh MVC exposure regressions pass, the affected configuration
and dependencies are unchanged, and source inspection confirms the absent features.
This is a deployment-specific applicability assessment, not a Spring patch or
platform-wide security certification.

## Backup, configuration, recovery and capacity

The accepted backup is **`production-20261027T185229Z`**: SQL, all objects,
configuration and all five declared protected files. Its off-host copy passes
manifest, individual protected-file hashes and compressed-stream verification.

Preparation found obsolete host references and an initial snapshot that silently
omitted their protected files. That snapshot was rejected. Final deployment
references use the exact current mounted files, whose hashes match the verified
off-host material and active container. Credentials and effective runtime values
are unchanged; 104 common settings and effective JVM options match production.
Backup preparation now fails on any missing declared protected file. The canonical
deployment checklist records this requirement. No data or old backups were deleted.

Disconnected restoration of the accepted backup passes with both the candidate
and exact previous backend. All original raw rows/columns, Flyway history and
objects are compared and preserved. The application is SELECT-only, database
events and workers/providers are disabled, and the private network has no external
access. Protected files are read and hash-checked from the backup itself rather
than from live host paths. Restoration, off-host evidence and activation guards
are tied to the same backup identifier and five-file inventory.

The restore proof completed at **2026-10-27T18:57:06.155419+00:00**. Final canonical
production dry run and protected-state comparison pass without changing live
containers. Capacity review records **89,728,163,840 bytes** available and uses the
canonical **10,240 MiB** minimum without an override. Exact previous images are
retained for recovery; no schema repair is required.

## Activation boundary

Earlier closed Stripe TEST-key exceptions are not reused. The historical finding
remains HIGH, unresolved and owned by the release owner for revocation. Activation
is pending an applicable authorization for this exact source. Post-activation
public smoke, authenticated continuity, protected-state comparison and five-minute
observation remain required. Raw operational evidence and protected data stay
outside the repository.
