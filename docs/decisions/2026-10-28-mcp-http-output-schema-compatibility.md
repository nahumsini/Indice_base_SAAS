# Compact HTTP output contracts for MCP discovery

Date: 2026-10-28. Status: implemented locally; production acceptance pending.

## Evidence and scope

The owner's request is to repair the MCP connection without removing operations or
reducing security controls. Production `02881da5` successfully authenticated and
returned the complete 608-tool catalog, but ChatGPT rejected its import. Its
one-attempt deployment authority is closed and is not reused here.

An owner-private Sites fixture was created only for diagnosis. It contains public
schema metadata and a fictitious context; it has no ERP URL, credentials, database,
private files or business records. Every business action returns an error without
side effects. Its private audience is unchanged. It is a test fixture, not a new
ERP interface or replacement production host.

Actual ChatGPT comparison:

- One context tool with its original detailed output schema: imported.
- All 608 tools with detailed compacted output schemas: update failed.
- The same 608 names, input schemas and annotations without output-schema trees:
  imported, showing **172 reads and 436 writes**.
- Restoring the detailed output schemas under the same fixture runtime and access
  boundary made the update fail again. Only the selected fixture catalog mode
  changed in that control.

The rejection is associated with the aggregate detailed output metadata. The
vendor's internal reason and exact threshold are UNKNOWN; this is not proof of a
published byte, tool-count, depth or keyword limit. All original schemas also pass
the installed JSON Schema validator. Do not call a valid schema malformed merely
because this client rejects the aggregate catalog.

Synthetic ChatGPT reads with the initial fixture metadata displayed “No se ha
podido cargar esta respuesta.” They are not counted as successful reads. That
fixture initially advertised `noauth` on an owner-private OAuth Site. Explicit
OAuth metadata in a subsequent fixture did not establish a successful read;
the fixture is reduced back to one context tool using Sites-managed authentication
without custom security declarations. This does not change the production
authentication policy. Catalog import and actual execution remain separate checks.

## Decision

For HTTP `tools/list`, publish `outputSchema: {"type":"object"}` when a tool has
an output schema. Preserve the full input contract, name, title, description,
annotations, OAuth metadata and authorized pagination. This keeps an explicit
object output contract without transmitting the rejected detailed aggregate.

The complete output schema remains registered in the same SDK tool and is
validated by the SDK before returning every successful call. Stdio still exposes
the complete schema. No tool result, field or `structuredContent` is removed or
reformatted. Invalid owner results must still fail. Domain authorization,
tenant scope, current capabilities, preview/confirmation and idempotency are
unchanged. No new endpoint, scope, generic dispatcher or authority cache is added.

Tradeoff: HTTP clients can validate only the object envelope from discovery; full
field validation remains on the server. Do not claim that the published HTTP
schema still describes every result field. The canonical MCP operating system and
runbook adopt this narrow metadata projection in the same change.

## Verification and release boundary

Require a complete-catalog comparison against actual registration except this
documented output projection, retained SDK output rejection, unchanged valid
results, reauthorization/revocation and cursor-negative regressions. Measure actual
HTTP bytes, including framing and compatibility extensions: less than 256 KiB per
page, 1 MiB aggregate and ten pages for the current 608 tools. These are repository
regression budgets, not OpenAI limits.

The [validation record](../validation/2026-10-28-mcp-http-catalog-compatibility.md)
records the exact local checks and real-client limitations. New production
activation, its technical release gates and actual authenticated ERP read remain
pending; a synthetic Site read cannot certify production OAuth or ERP access.

Rollback restores the prior immutable MCP component and its compatible
configuration. There are no database migrations or backend/frontend changes.
