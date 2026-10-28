# MCP compact catalog publication — bounded decision

Date: 2026-10-28 (UTC).

Status: ACTIVATED; TECHNICAL OBSERVATION PASS; ACTUAL CHATGPT IMPORT FAIL;
AUTHORITY CLOSED.

The owner answered **“Autorizar excepción puntual y publicación”** to the exact
`02881da5` production-only MCP proposal. Authority was recorded at
**2026-10-28T01:11:15+00:00**, expiring no later than
**2026-10-28T02:11:15+00:00**, and closes earlier with the single attempt and
bounded review. It explicitly accepts the still-pending historical Stripe TEST-key
revocation and replaces only the timing of real-client acceptance: technical smoke
first, then actual ChatGPT import and one read in production. App Test keeps its
current version. This is fresh authority, not reuse of the closed `12593ec9` window.
No new OAuth consent or business mutation is authorized.

The one MCP-only activation passed at **2026-10-28T01:11:35.114855+00:00**.
Public/service smoke, exact-image readiness, protected-state preservation and six
healthy samples spanning five minutes passed. The previous MCP container remains
available stopped with its original configuration; no rollback or second
activation was executed. Backend/web/storage/schema and App Test are unchanged.

Actual ChatGPT authentication succeeded and one manual update caused two complete
ten-page traversals (twenty HTTP 200 catalog responses). However, the client
rejected the update and displayed no available tools. Actual import is **FAIL**;
the real read is **NOT RUN**, because no tool was imported. Its internal rejection
reason remains UNKNOWN. The active component is healthy and preserves all tool
contracts; the preceding version also failed import, so reverting is not an
established client-side remedy. Recovery remains retained, not claimed as exercised
against this new client failure. See the [actual evidence](../validation/2026-10-27-mcp-catalog-compaction.md#production-activation-and-actual-chatgpt-review).

This exception closed at **2026-10-28T01:17:23.017347+00:00** after the one
activation, observation and bounded review. It cannot be reused. Stripe TEST-key
revocation remains HIGH and unresolved; technical publication does not certify
the connection or replace actual client acceptance.

The owner requested “despliegalo” for runtime source
`02881da5b576c20fb6924fc19ef8d612ef42ee26`. The
[reviewable change and real-client diagnosis](../validation/2026-10-27-mcp-catalog-compaction.md)
record that authentication now succeeds, but actual ChatGPT import of the prior
`12593ec9` catalog failed twice after fifteen successful pages. The new component
encodes identical validation contracts in 7,847,028 JSON bytes across ten pages,
retaining all 608 named tools. Local TypeScript and 178 regressions passed.
Actual acceptance of this new encoding in ChatGPT remains UNKNOWN.

The requested operation replaces only the production MCP container. Backend,
web, storage, database schema and App Test keep their current images/configuration
and running container IDs. The currently active `12593ec9` MCP image and original
container configuration must remain available for recovery. Documentation-only
readiness/authority commits do not change the runtime source or authorize another
activation.

Prepared immutable MCP image:
`sha256:32e0f0377438f3630009531ee82a1866ed565d78cd21b288ae5b50c5c9c210e1`
(`indice-erp-mcp:02881da5b576-secure`). Compatible recovery is the currently active
MCP image `sha256:fb5dcc2cddb5b3db390d87e09827671676783ddec018d4fb29ddb2c44c9d9a55`.

All technical preparation passed: exact-source CI; protected complete preflight
(4,243 Java cases, zero failures/errors, three established skips; 195 MCP/deployment
cases); 27 exact-image runtime tests and both Nginx configurations; current source,
delta and exact-image scans/SBOMs; 1,200-second synthetic continuity with matching
runtime hashes; backup `production-20261028T003837Z` verified off-host; disconnected
candidate/recovery restoration preserving V365, all original raw rows/columns,
objects, billing and access; actual MCP-only create/failure/recovery rehearsal;
final protected configuration, capacity and preservation checks. The failed first
disposable-database attempt is retained separately and is not counted as PASS.
The MCP artifact has no HIGH/CRITICAL or secret scan findings; the unchanged
backend's two Spring findings retain their separately verified nonapplicable
deployment conditions. This is applicability evidence, not a security certification.

Before activation, exact-source CI, protected full preflight, component provenance,
actual-image/proxy regressions, current scans/SBOMs, continuous probe, off-host
backup, disconnected restore/recovery, capacity and preservation checks must pass.
Tests use isolated databases and synthetic data; they never use production as a
test fixture or claim actual ChatGPT acceptance.

The previous publication exception was not reused. The fresh explicit owner
decision above covered only this component/source's bounded Stripe TEST-key
deferral and the timing replacement for actual ChatGPT import/read acceptance in
production after technical smoke instead of first changing App Test. This does
not mark existing real-client FAIL/UNKNOWN evidence as PASS.

If authorized, record the actual reply, UTC start/expiry and immutable image digest
before activation. The window covers one MCP-only production activation, a
five-minute technical observation and at most thirty minutes of real-client
read-only review; it expires no later than two hours after recorded authority and
closes earlier with that attempt/review. It cannot cover another source, another
activation, scope expansion, fresh consent on the owner's behalf, provider
enablement, business mutations, messages, charges or changes to prices/access.

All other security, authorization, tenant, integrity, backup/recovery and monitoring
gates remain mandatory. On failed activation, recover the retained compatible MCP
with its original configuration; retain a protected stopped service if compatible
protection cannot be established. Preserve every other service and all data.
