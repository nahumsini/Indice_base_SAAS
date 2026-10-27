# MCP paginated discovery and request disposal — 2026-10-27

Status: DEPLOYED MCP-ONLY; TECHNICAL CHECKS PASS; REAL CHATGPT ACCEPTANCE UNKNOWN.

## Evidence and limits

The owner reported `Authentication succeeded, action discovery failed` after a new
authorization. The matching production flow at 21:13 UTC completed consent, token
exchange and UserInfo with HTTP 200, then MCP initialization and `tools/list` with
HTTP 200 and 608 authorized tools. No subsequent tool call was observed in that
flow. This differs from the earlier 20:59 UTC update attempts, whose credentials
were rejected before discovery and whose renewal returned HTTP 400.

The actual full catalog is 13,186,308 JSON bytes. The SDK accepts it over HTTP, but
that does not certify ChatGPT action import. The exact internal OpenAI rejection
reason is unavailable. Large single-response discovery is a confirmed transport
weakness and a candidate contributor, not a proven explanation of every earlier
connection failure. No undocumented OpenAI size or tool-count limit is assumed.

## Change and preserved behavior

HTTP discovery follows the standard MCP `tools/list` cursor protocol, returning
up to 32 currently authorized tools per page. It serializes only that page's
descriptors. `get_my_business_context` is included in the first page when allowed.
Every page obtains and validates the current backend capability manifest before
parsing a cursor. A cursor selects only an offset in the current authorized-name
catalog; it cannot select a tenant, actor, grant, permission or arbitrary tool.
Changed catalogs reject stale continuations and require a fresh first page.

All 608 operations remain reachable by following `nextCursor`. Inputs, complete
output schemas, descriptions, safety annotations and OAuth security metadata are
identical to actual registration. Invocation, owner authorization, confirmation,
idempotency, rate limits, file intake and all business calculations are unchanged.
The stdio development transport is unchanged. A schema-reference compaction
prototype remained outside the repository and is not part of this implementation.

Changed runtime files are `integrations/indice-mcp/src/httpApp.ts` and
`integrations/indice-mcp/src/toolDiscovery.ts`. The change also adds
`integrations/indice-mcp/src/test/toolDiscovery.test.ts` and updates the canonical
MCP contract and operational runbook. Backend Java, frontend, database migration,
dependencies, provider activation and billing changes: N/A.

The extended synthetic continuity run additionally exhausted its 4 GiB Node heap
after about 14 minutes. An isolated heap diagnostic traced completed SDK request
graphs to per-request abort-reason stack frames retained by Node's persistent
signals. Server construction alone stayed flat. A regression using 35 completed
HTTP requests fails before correction with 141 MiB of retained growth and passes
after correction. HTTP cancellation now uses one data-free AbortError created
outside request scope and releases the cleanup callback. Abort controllers,
capability validation, cancellation, timeouts and authority remain per-request.
`httpRequestCleanup.test.ts` guards heap growth under explicit garbage collection;
the existing continuity runner now reports synthetic heap usage alongside counts.
The prolonged corrected run subsequently completed successfully, as recorded below.

## Verification

- Before implementation, the new actual-catalog HTTP regression fails because
  one response includes the complete catalog. After implementation, the same
  regression traverses all 608 descriptors in 19 pages with no omission or
  duplicate and compares every descriptor against actual SDK registration.
- The largest decoded SDK page is 1,335,938 JSON bytes, below the reviewed 4 MiB
  page budget. That budget is a repository guard, not a claimed OpenAI limit.
- Three focused tests pass, including a real HTTP business-context read after
  discovery, malformed cursors, changed and different capability catalogs,
  revocation between pages and credential/cursor-free diagnostics.
- The complete MCP suite passes: 175 tests, zero failures or skips, with successful
  TypeScript compilation. Fixtures are local and synthetic; no production database
  is used by tests and no real message or business mutation is performed.

The first CI attempt subsequently exposed an `ECONNRESET` in the full-catalog
fixture after synchronous client-side schema compilation outlasted its idle HTTP
socket. A disconnected one-CPU container reproduced the reset on page 12. The
same three tests pass using fresh connections for the metadata fixture. Only that
test's HTTP client now requests `Connection: close`; production timeouts, ordinary
keep-alive regression coverage, SDK schema validation and all assertions are
unchanged. Exact-source CI and the protected release preflight must pass again
before publication; the earlier CI failure is not treated as a successful gate.

After the disposal correction the complete 175-test suite passed in 87.9 seconds.
A separate 30-request diagnostic remained at approximately 30 MiB after garbage
collection, including a 15-second idle period; the uncorrected run rose from 58 to
160 MiB. These are synthetic regression measurements, not production memory or
real ChatGPT acceptance evidence.

## Remaining release boundary

Production now runs the approved MCP runtime source `12593ec9`; backend and web
retain their previously approved application images. Real ChatGPT import of all
pages and an authenticated business read remain UNKNOWN until tested through the
intended client. The owner must review any fresh OAuth consent themselves.

The prior production-only Stripe TEST deferral was not reused. The owner granted
fresh source-specific authority under the linked decision. Historical key
revocation remains HIGH and pending; no real-client acceptance is implied.

## Exact-source publication preparation

Runtime source: `12593ec9ee7f5d9c1430446d928d83f855f38ca9`. The working branch
`codex/fix-mcp-discovery-20261027` and main were fast-forwarded to this source;
subsequent readiness/authority documentation does not alter its runtime bytes.
[Exact-source CI](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/40593264095)
passed all stages, including isolated database, frontend, actual MinIO, immutable
image builds and actual Nginx traffic-control regressions.

- Protected production preflight: PASS; 4,243 backend tests, zero failures/errors,
  three established skips; 192 MCP/deployment tests, zero failures/skips. Frontend
  TypeScript/build and the complete frontend regressions also passed in CI.
- Corrected continuous probe: PASS, 1,200 seconds, 236 rounds and 2,553 synthetic
  backend attempts. Sampled heap stayed at or below 66 MiB. Its runtime JavaScript
  hashes match the candidate image. OAuth/voice in ChatGPT are not certified by it.
- Exact candidate-image runtime: 24 tests PASS, covering traffic, continuity,
  trust boundaries, OAuth recovery, all 608 paginated descriptors and request
  disposal. Both isolated Nginx configurations passed.
- MCP artifact: `indice-erp-mcp:12593ec9ee7f-secure`, image
  `sha256:fb5dcc2cddb5b3db390d87e09827671676783ddec018d4fb29ddb2c44c9d9a55`.
  Compiled bytes were compared; base runtime/dependency layers and defaults are
  unchanged. Compatible MCP recovery is the original image
  `sha256:071fb61e5586584c636290fdc3b1918ca140559ee51d7edb6957b5e992a1af11`.
- Source/delta scans: zero actual current secrets; 20 byte-identical previously
  reviewed false positives. Candidate MCP, MCP recovery and web have zero
  HIGH/CRITICAL findings. The unchanged backend retains the two previously
  reviewed Spring findings; source inspection and fresh MVC exposure regressions
  confirm their documented deployment conditions are absent. This is applicability
  evidence, not a Spring patch or an application security certification.
- Backup `production-20261027T223026Z`: SQL, complete object archive, configuration
  and five protected files copied off-host; all hashes/compressed streams verified.
  Disconnected candidate/recovery restoration passed on V365, with all original
  rows/columns, migration history, objects, billing and access preserved.
- MCP-only operation and failure/recovery rehearsal: PASS, including actual
  container creation. Docker's `OomKillDisable=null`/`false` encodings were reviewed
  as the same enabled OOM-killer default; all other host settings stay strict.
  Canonical host-network dry run also passed with the final immutable MCP tag.

Production MCP-only activation passed at **2026-10-27T23:20:29.519447+00:00**.
Backend, web, storage and App Test retain
all original running container IDs and effective settings. No schema, provider,
price, subscription or access change is part of this operation. Historical Stripe
TEST-key revocation remains HIGH and unresolved. Normal real-client App Test
acceptance and actual ChatGPT import/read remain UNKNOWN. The
[bounded publication decision](../decisions/2026-10-27-mcp-discovery-publication-proposal.md)
records the new explicit owner authority and its one-attempt boundary.

## Production activation and client review

Only `indice-erp-mcp-1` was replaced. Its original container is stopped and retained
as `indice-erp-mcp-1-rollback-discovery-12593ec9ee7f`, with the original compatible
image and configuration. All other seven production/App Test service container
IDs, configurations and mounts remain unchanged. Five protected file hashes,
complete Flyway history (V365), billing/subscriptions and existing module-access
baselines are unchanged. Public web/security headers, anonymous authorization
boundaries, OAuth/OIDC discovery, MCP readiness and canonical application/MCP
smokes passed. No schema or provider mutation occurred.

Six production health samples spanning **300.953 seconds** passed: web/API/MCP/
storage HTTP 200, zero container restarts and zero new detected backend errors.
MCP stayed running without a fatal/OOM diagnostic. Final preservation checks were
repeated successfully after observation. The one-attempt authority closed at
**2026-10-27T23:26:03.018527+00:00** and was explicitly disabled in the private
activation guard. The original recovery container and off-host backup remain.

The first activation command was rejected before any service mutation because the
host Python parser requires `+00:00` rather than `Z` for the same UTC expiry.
The private authority encoding was normalized without extending its window; the
single actual activation then passed. No failed service activation or production
rollback occurred.

Chrome's existing Indice connection requires renewed authentication. Its normal
reconnection flow now reaches the application's rendered OAuth permission review
for the currently selected company. This is progress through the real client,
but does not establish tool import or an authenticated read. The owner was handed
the company/scope review; the agent did not grant OAuth consent, create a grant,
run a business tool or change the selected company. Actual ChatGPT import/read
remain UNKNOWN pending that human step. No raw OAuth URL, state, code, credential
or business payload is retained in release evidence.
