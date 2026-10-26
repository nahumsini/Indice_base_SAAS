# Email / Mailing images production release — 2026-10-26

Status: TECHNICALLY READY, NOT ACTIVATED. Exact-source CI, protected preflight,
artifact scans, off-host backup verification, isolated restoration and the final
production dry run pass. The historical Stripe TEST-key revocation is unresolved;
a new bounded exception is pending. Human product acceptance remains UNKNOWN.

## Source and behavior

Application source: `be64336798c7d188960d118cceef14a309883084`, published on
`codex/next-work-20261025` and `main`. The [source boundary decision](../decisions/2026-10-26-mailing-images-production-release.md)
records the captured 29-path correction and subsequent concurrent Whatsapping work
that remains local, outside this tested application candidate.

The reader now resolves validated, bounded PNG/JPEG CID resources when opening the
corresponding related MIME body. Its size allowance uses decoded bytes. Read-only
inspection established that the affected server Sent copies still contain the
image; no campaign resend is needed to recover that display. Test/final Mailing
previews now receive formatted HTML through the existing authorized review API.
Quota waits are distinguished from failures and explain automatic continuation.
Earlier local corrections clarify sender/content readiness and compact the delivery
modal. Owner contracts and learning lessons describe the resulting behavior.

Tenant/account ownership, attachment boundaries, sanitization, remote-image blocking,
explicit send confirmation, exclusions, snapshots, rate limits, five-minute quota
retry and accepted-recipient deduplication remain enforced. No real email was sent
by the agent and no campaign was restarted or edited in production. External inbox
arrival and recipient rendering are not certified by SMTP acceptance.

Schema remains V365. There are no dependency, route, permission or payroll changes.
Entry-by-entry JAR comparison limits backend changes to the six reviewed Email/Mailing
class families and the generated learning catalogue; all other entries match the
previous deployed backend. App Test and protected operational settings are preserved.

## Verification

[Exact-candidate CI](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/40417406519)
passes, including image builds, isolated actual-MinIO attachment tests, runtime
smoke and both real Nginx proxy configurations.

- Backend: 4,232 tests, zero failures/errors, three established skips. The complete
  canonical preflight uses the protected production environment and an isolated,
  disposable MySQL test database. Compilation, migration uniqueness and startup pass.
- Frontend: 1,299 CI regression passes, zero failures/skips; TypeScript, production
  build and generated learning catalogue validation pass. The existing large-chunk
  build advisory remains.
- MCP/deployment source tests: 188 passes, zero failures/skips. Final-container
  HTTP/OAuth/proxy checks and deployment recovery tests also pass.
- The [focused correction evidence](2026-10-26-mailing-inline-images-quota.md)
  includes MIME round-trip, large encoded/small decoded image, duplicate/missing CID,
  unsafe/oversized image, related-body isolation, campaign persistence, preview and
  quota recovery coverage. Three synthetic native-browser flows pass composition,
  delivery and workspace behavior, including mobile/dark mode and permissions.
- Current actual source secrets: zero; the application-delta secret scan is empty.
  Existing scanner false positives were compared with previously reviewed files.
  Every exported OCI blob and runtime identity is verified. All four images have
  fresh vulnerability/secret scans and CycloneDX inventories; image secret findings
  are zero. Exact unchanged recovery/MCP exports were reverified and rescanned.

## Immutable artifacts and applicability

| Component | Image ID |
| --- | --- |
| backend | `sha256:4fbb9e385d20c544004e80aa4bf574ace2a737f4147806237ae7ccb2571d5bb1` |
| web | `sha256:8b76d4ee7613cf48ae7901c65f6d87ace6fa02d5e5ae2798611b328ec03b419c` |
| backend-recovery | `sha256:bc6953a7785b1ad830235fd1cab47da6674bd2311f7ae963b3268f0e36bda3f6` |
| mcp | `sha256:071fb61e5586584c636290fdc3b1918ca140559ee51d7edb6957b5e992a1af11` |

Web/MCP scans contain no HIGH/CRITICAL findings. Backend/recovery retain the
previously reviewed `CVE-2026-47884` and `CVE-2026-47890` scanner findings with absent
exposure conditions: no XSLT/wildcard MVC rendering or SSE view fragments. Two fresh
MVC exposure regressions pass; dependencies and MVC configuration are unchanged.
The class changes are restricted to the reviewed Email/Mailing correction. This is
an applicability review, not a Spring patch or platform-wide security certification.
See the [prior applicability record](2026-10-26-sales-mailing-release.md#immutable-artifacts-and-scan-applicability).

## Backup, recovery and capacity

Fresh backup `production-20261026T232125Z` contains SQL, all objects and protected
configuration. Its off-host copy passes every manifest/protected-file hash and
compressed-stream check. A prior object archive was only a transfer seed; the
final transferred bytes match the fresh backup manifest.

Disconnected restoration passes with both the candidate and the exact previous
backend. Every original raw row/column, Flyway history and all objects are compared
and preserved. The application is SELECT-only, database events/providers/workers
are disabled, and the private network has no external access. The restore proof
was recorded at **2026-10-26T23:28:38.669881+00:00**. Recovery retains the exact prior
application images; no schema repair is involved. The final canonical deployment
dry run and protected-state comparison pass without changing live services.

An initial backup attempt stopped on insufficient capacity. Unused Docker build
cache and inactive, re-downloadable dependencies were retired after mount/process
checks. Image/container inventories, source, business data and backups were retained.
The final capacity review records **5593014272 bytes** available and enforces the
reviewed 5 GiB floor permitted by `deployment/README.md`; the canonical 10 GiB
default remains unchanged. Additional host capacity remains an operational follow-up.

## Authorization

The [previous Stripe TEST-key exception](../decisions/2026-10-26-sales-mailing-stripe-deferral.md)
is closed and cannot be reused. Historical revocation remains HIGH and unresolved.
Activation is pending a new, exact-candidate authorization. All technical gates
above passed before requesting that exception. Post-activation checks and a
five-minute observation remain required. Protected raw evidence is not committed.
