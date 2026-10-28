# MCP HTTP catalog compatibility — 2026-10-28

Status: local correction verified; isolated real-client import PASS; actual
production acceptance pending. Branch: `codex/fix-mcp-catalog-validation-20261028`.

## Reproduced failure and controlled comparison

Production `02881da5` remains unchanged. Its previous real-client failure and
closed deployment authority are recorded in
[the prior outcome](2026-10-27-mcp-catalog-compaction.md#production-activation-and-actual-chatgpt-review).
No new production or App Test activation, consent, business write, database test
fixture, account revocation or provider activation occurred in this investigation.

The complete registered 608-tool catalog was captured using the SDK in-memory
transport and unused reader stubs. All 1,216 input/output JSON Schemas validate;
all names satisfy the name-character/length check. The detailed output schemas
account for 7,100,239 compacted bytes. This identifies metadata weight, not an
official platform limit or a malformed schema.

A separate owner-private Site contains only that public metadata and a fictitious
context. It has no ERP endpoint, credentials, database or private files. Business
tool calls always fail without side effects. Actual ChatGPT results:

| Fixture | Observed result |
| --- | --- |
| One original context tool with detailed output schema | Imported: one read |
| Complete 608-tool catalog with detailed output schemas | Update failed |
| Same 608 names/inputs/annotations without output-schema trees | Imported: 172 reads + 436 writes |
| Restore full output schemas in the same runtime/access configuration | Update failed again |
| Compact `outputSchema: {"type":"object"}` envelope | Update completed without error |

The first full/input-only fixtures used the same metadata except output trees; a
subsequent full control retained the input-only fixture's platform access boundary
and diagnostic code and reproduced rejection. The internal platform rejection
reason and exact threshold remain UNKNOWN. The narrow correction is supported by
this comparison, not by inventing a vendor tool-count or size limit.

The actual ChatGPT read after the first successful import displayed “No se ha
podido cargar esta respuesta.” It is UNKNOWN, not PASS. A visible tool count or
successful import does not certify actual execution or production access.
The compact-envelope read also displayed that error. Explicit authentication
metadata in this separate Sites fixture did not establish successful execution;
the final control returns to one synthetic context tool and Sites-managed
authentication. Do not attribute this fixture's client/rendering/authentication
limitations to the production server without an actual production trace.

The final one-tool control using Sites-managed authentication imported **one
read** without an update error. Its fresh ChatGPT conversation also displayed
“No se ha podido cargar esta respuesta.” Invocation remains UNKNOWN: no successful
tool result or matching invocation trace was captured. This separates the observed
catalog import fix from the unresolved synthetic execution acceptance. Production
OAuth and an actual ERP read still require validation after an authorized release.

## Local correction and preservation

[The compatibility decision](../decisions/2026-10-28-mcp-http-output-schema-compatibility.md)
adopts a compact HTTP output envelope. Full SDK output schemas remain registered,
validated and exposed in stdio. Inputs, names, annotations, OAuth metadata,
current capability checks, cursors and every owner handler are preserved. Tool
results retain the same structured/text content. No dependency, business API,
backend, frontend or database migration changes are included.

HTTP consumers now validate the generic object envelope, not the detailed output
fields. The complete authoritative validation still occurs on the server. This
tradeoff is explicit; the change is not described as preserving detailed output
metadata on HTTP.

## Verification

- Before implementation, the strengthened complete-catalog regression failed on
  the actual problem's metadata budget. That intentional red result is retained.
- Final `npm test` in `integrations/indice-mcp`: **179 PASS, zero failures/skips**,
  including TypeScript build, 92.451 seconds, Node 22.22.2.
- Complete SDK discovery: **608 tools, ten pages**, 757,125 parsed catalog bytes.
  The independent HTTP capture includes SSE/JSON-RPC framing and extensions:
  **800,940 bytes total**, largest response **117,444 bytes**.
- Complete input constraints, annotations and OAuth metadata match actual
  registration. Every original output schema remains present over stdio.
- A malformed owner result is rejected by the registered SDK output validator.
  Valid HTTP results remain identical; malformed backend results still fail after
  discovery. Reauthorization, revoked grants, changed catalogs and invalid cursors
  retain their negative coverage in the complete suite.
- `git diff --check`: PASS. Frontend/backend build and migration tests: N/A for
  this local MCP-only source change. Production release preflight/scans/backups/
  recovery, actual-image/proxy checks and human/client acceptance: pending for a
  future exact-source publication, not implied by these local checks.

Sanitized audit/comparison and test logs are retained in
`/private/tmp/indice-mcp-schema-audit-20261028/`. The disposable diagnostic Site's
source is separate from the ERP repository. No secret-bearing Site tool responses
or credentials are copied into this record or the source tree.

## Exact-source production preparation

The owner requested production publication for testing. Runtime source
`6302037f940ed960aa14c2d0bc366a58b1cff4d5` is on the working branch and main.
At **2026-10-28T02:49:59.333676+00:00**, technical preparation passed; activation
and actual production ChatGPT acceptance remain pending under the
[bounded publication proposal](../decisions/2026-10-28-mcp-compact-output-publication.md).

Immutable MCP image: `indice-erp-mcp:6302037f940e-secure`,
`sha256:a962dea27500a53977decd5486a5ba1c02ac90cf2dc1fff50eb1807cae1220b8`.
All compiled files match the exact source. Only `httpApp` and discovery-test
JavaScript/source maps differ from the retained MCP; base runtime/dependency
layers and defaults are unchanged. Recovery is current `02881da5`,
`sha256:32e0f0377438f3630009531ee82a1866ed565d78cd21b288ae5b50c5c9c210e1`.
Backend, web, storage, schema V365 and App Test remain unchanged.

- [Exact-source CI](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/40618893952):
  PASS, including isolated backend/frontend tests, actual MinIO, images and Nginx.
- Complete protected production preflight: PASS; **4,243 Java cases**, zero
  failures/errors and three established skips; **196 MCP/deployment TAP cases**,
  zero failures; frontend typecheck/build passed. Tests used disposable MySQL.
  The first attempt failed before backend execution because its transient service
  lacked standard `HOME`. That log remains FAIL. The complete repetition supplied
  the standard root home and passed; no skipped phase is relabeled as a full pass.
- Synthetic continuity: **1,200 seconds, 238 rounds, 2,571 backend attempts**,
  maximum sampled heap **56 MiB**. Runtime hashes match the immutable image.
  This does not establish real OAuth, ChatGPT import/read or voice acceptance.
- Exact-image regressions: **28 PASS**, zero failures/skips. Both complete Nginx
  configurations pass their isolated traffic regressions. The actual MCP-only
  create/failure/recovery rehearsal and canonical host-network dry run pass.
- Source/delta scans: zero actual current secrets; twenty byte-identical reviewed
  fixtures/placeholders. Verified OCI exports and current scans/SBOMs show zero
  HIGH/CRITICAL or secret findings for MCP, its recovery image and web. The
  unchanged backend retains two separately reviewed Spring findings; absence of
  applicable exposure and the two MVC regressions were rechecked. This is
  applicability evidence, not a Spring patch or security certification.
- Backup **`production-20261028T024427Z`** includes complete SQL, objects,
  configuration and five required protected files. Off-host hashes, protected
  files and compressed streams passed. Candidate/recovery startup against the
  disconnected restore passed with SELECT-only application authority, providers/
  jobs/events disabled. All original raw columns/rows, V365 lineage, objects,
  billing/subscriptions and access are preserved.
- The original eight production/App Test containers and protected configuration
  remain unchanged. Capacity and final configuration checks passed. Technical
  preparation does not activate a service or reopen the previous closed authority.

Sanitized release proofs and protected off-host backups are retained separately
under `/private/tmp/indice-mcp-envelope-release-20261028/`. The historical Stripe
TEST-key revocation is still HIGH and unresolved. A fresh bounded owner decision
is required before activation; the previous one-attempt exception is closed.

## Official documentation consulted

OpenAI's [troubleshooting guidance](https://developers.openai.com/plugins/deploy/troubleshooting)
separates server, schema and client failures. Its
[MCP server guidance](https://developers.openai.com/plugins/build/mcp-server)
requires meaningful schemas, safety annotations and server-side authorization;
[connection testing](https://developers.openai.com/plugins/deploy/connect-chatgpt)
requires a real client check after metadata changes. The pinned SDK's `ToolSchema`
permits an object output schema; `McpServer.validateToolOutput` independently
enforces the complete registered schema when executing tools. Synthetic tests and
these references do not establish an undocumented platform limit.
