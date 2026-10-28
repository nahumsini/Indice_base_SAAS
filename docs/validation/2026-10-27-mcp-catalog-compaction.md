# MCP real-client follow-up and catalog encoding — 2026-10-27

Status: TECHNICAL PUBLICATION PREPARATION PASS; NOT DEPLOYED;
REAL CHATGPT IMPORT FAILED ON `12593ec9`, UNKNOWN FOR `02881da5`.

## Actual client evidence

After the owner personally reviewed and completed OAuth consent, ChatGPT renewed
its existing Indice connection. Authenticated initialization/capability validation
succeeded. Its first discovery attempt returned fifteen successful `tools/list`
pages from 23:43:58.673Z through 23:44:20.180Z. The refreshed Settings page removed
the authentication warning and offered Update tools. One normal Update tools
attempt then returned fifteen successful pages from 23:46:56.503Z through
23:47:20.007Z. Neither attempt requested the remaining four pages. All discovery
responses were HTTP 200; the process stayed ready with zero restarts. The intended
plugin still showed no available tools and Settings reported that the application
could not be updated. No business tool call occurred.

This establishes failed real-client import despite accepted authentication.
Pagination alone did not resolve the reported problem. The internal OpenAI failure
reason is unavailable. Fifteen pages, 480 descriptors and roughly 10 MiB of
cumulative metadata are observations, not proof of a documented platform limit.
No credential, grant or consent was changed by the agent. No retry loop, duplicate
connection or additional production deployment was performed.

The `12593ec9` one-attempt deployment authority remains closed; Stripe TEST-key
revocation remains HIGH and unresolved. This read-only follow-up does not reopen it.

## Local correction and preserved behavior

HTTP discovery now encodes repeated schema subtrees as standard local
`definitions`/`$ref` references, following the
[JSON Schema reference contract](https://json-schema.org/understanding-json-schema/structuring).
Registered validators and complete input/output constraints are unchanged. Existing
reference bases, anchors, definitions and nested dialects are left untouched.
Enum/const/default/example objects are data and are never rewritten.

Pages hold up to 64 authorized tools. All 608 named operations, annotations, OAuth
metadata, current per-request authorization, cursor validation, invocation and
confirmation behavior remain available. Stdio, backend, frontend, schema and
dependencies are unchanged. A page still fits the 4 MiB repository guard, and the
current entire catalog must fit 8 MiB and ten HTTP discovery round trips. These
are conservative local regression budgets, not claims about OpenAI limits.

## Verification

The strengthened full-catalog HTTP regression failed before the correction because
the aggregate metadata exceeded its budget. After the correction it traverses all
608 tools in ten pages: **7,847,028 total JSON bytes**, largest page **1,293,286**
bytes. It independently resolves every generated reference and deep-compares the
complete descriptors with actual SDK registration, then performs a synthetic
business-context read. SDK parsing and output validation run through the actual
HTTP transport.

Three focused schema regressions additionally pass: independent SDK/AJV acceptance
and rejection of nested required fields, positive money/precision/currency limits,
confirmation patterns and extra-property constraints; preserved existing reference
scopes; and untouched schema-shaped literal data. No registered schema is mutated.

Complete MCP regression: **178 tests PASS**, zero failures/skips, with TypeScript
compilation; 96.449 seconds. Frontend/backend/schema changes and their local build
requirements: N/A. [Exact-source CI](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/40605337463)
passed on `02881da5b576c20fb6924fc19ef8d612ef42ee26`, including the complete isolated
backend/frontend regressions, actual MinIO, image builds and actual Nginx tests.
Branch and main contain that runtime source.

The 1,200-second synthetic continuity probe also passed: 236 rounds, 2,553 backend
attempts and maximum sampled heap 68 MiB (final 67 MiB). It exercises synthetic
HTTP turns, transient failures, reconnection, changing permissions and revocation;
it does not establish real OAuth, ChatGPT import or voice acceptance.

The first protected VPS preflight failed when its disposable MySQL exceeded the
768 MiB memory limit assigned for that attempt. Its log was retained and the full
canonical preflight was repeated with the previously proven 1,152 MiB database
budget and a separate 3 GiB process cap. No test used production or the functional
database, and production services stayed healthy. This failed attempt is not PASS.
The complete clean repetition subsequently passed: **4,243 Java tests**, zero
failures/errors, three established skips, and **195 MCP/deployment tests**, zero
failures/skips; frontend TypeScript/build also passed.

## Exact component publication preparation

Immutable image: `indice-erp-mcp:02881da5b576-secure`,
`sha256:32e0f0377438f3630009531ee82a1866ed565d78cd21b288ae5b50c5c9c210e1`.
Its complete compiled-file inventory was compared with the exact source. Base
runtime/dependency layers and defaults are preserved. The 20-minute probe's four
runtime hashes match the image. Backend, web, database, storage and dependencies
are unchanged; compatible MCP recovery is the current `12593ec9` image
`sha256:fb5dcc2cddb5b3db390d87e09827671676783ddec018d4fb29ddb2c44c9d9a55`.

- Exact-image regressions: **27 PASS**, zero failures/skips; both isolated complete
  Nginx configurations also pass. Full catalog, authorization, OAuth recovery,
  traffic controls, proxy trust, request disposal and schema constraints are covered.
- Source/delta scans: zero actual current secrets; twenty byte-identical previously
  reviewed fixtures/placeholders. Every exported OCI blob and linux/amd64 inventory
  was verified before scanning. MCP, MCP recovery and web have zero HIGH/CRITICAL
  or secret findings. The unchanged backend's two Spring findings retain their
  separately checked nonapplicable deployment conditions and fresh exposure tests.
  This is applicability evidence, not a Spring patch or security certification.
- Backup `production-20261028T003837Z`: complete SQL, object archive, configuration
  and five protected files copied off-host; hashes and compressed streams verified.
  Disconnected candidate/recovery startup and restoration passed with SELECT-only
  application authority and jobs/providers/events disabled. All original raw rows,
  columns, V365 history, objects, billing/subscriptions and access are unchanged.
- Actual MCP-only create/failure/recovery rehearsal and canonical host-network dry
  run passed. Final preservation checks revalidated the original eight production/
  App Test containers, settings and mounts. The activation guard requires a running
  exact-image container as well as readiness; the compatible original is retained.

## Production activation and actual ChatGPT review

The owner explicitly authorized this exact component and bounded exception under
the [publication decision](../decisions/2026-10-28-mcp-compaction-publication.md).
The MCP-only activation completed at **2026-10-28T01:11:35.114855+00:00** with the
prepared immutable image. The prior `12593ec9` container is retained stopped with
its complete original configuration for compatible recovery. All other seven
production/App Test containers, settings and mounts remain unchanged. Five
protected files, V365 history, billing/subscriptions and access are preserved;
public HTML/security headers, public MCP/OAuth smoke and full service smoke pass.

One normal **Actualizar herramientas** action used the existing personally approved
OAuth grant. ChatGPT authenticated successfully and performed two complete
ten-page traversals: twenty `tools/list` responses returned HTTP 200 between
**01:12:34.739Z and 01:13:20.457Z**. The server catalog contains all 608 tools.
Nevertheless, the client showed **“No se ha podido actualizar la aplicación.
Inténtalo de nuevo”**, and its actual application dialog showed **“No hay
herramientas disponibles para esta aplicación.”**

Actual ChatGPT import is **FAIL**. The real `get_my_business_context` read was
**NOT RUN**, because no tool was imported; no `tools/call`, new agent-granted
consent or business mutation occurred. Successful OAuth and all-page HTTP transport
do not establish platform-side import acceptance. The internal rejection reason
remains UNKNOWN; the earlier fifteen-page cutoff alone did not explain the failure.
No duplicate connection, repeated manual import loop or second activation occurred.
App Test real-client acceptance remains UNKNOWN. Historical Stripe TEST-key
revocation remains HIGH and unresolved.

Five-minute service observation **PASS**: six samples from **01:11:55.232Z** to
**01:16:56.247Z**, all web/API/MCP/storage HTTP 200, zero restarts and new service
errors. Final protected-state verification passed again. Sanitized activation,
client and closeout proofs are preserved off-host with checked hashes. No rollback
was executed: the active service is healthy, while the previous version also
failed client import and is not an established remedy for that failure.

The bounded authority closed at **2026-10-28T01:17:23.017347+00:00** and cannot be
reused. Branch and main include the exact runtime and these separate outcome
records. Healthy publication does not change actual client import FAIL into PASS.
