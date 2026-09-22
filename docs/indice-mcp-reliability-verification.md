# MCP reliability verification — 2026-09-22

Status: implemented locally; not deployed or certified in ChatGPT/voice.
This evidence note does not replace the canonical
[MCP Operating System](indice-mcp-operating-system-v1.md) or the
[APPTEST release gate](../deployment/MCP_APPTEST_RUNBOOK.md).

## Changes and preserved behavior

- Bounded retries for explicit delegated reads; successful response bodies share the attempt
  deadline. Authentication error bodies are discarded without retrying the authorization.
- HTTP 503 for capability-service failure, rather than a successful empty catalog; HTTP 401/403
  remain distinct. Both HTTP and tool-level OAuth recovery metadata are supplied.
- Per-request diagnostic IDs, latency, catalog fingerprints, safe outcomes and cancellation.
- Reduced repeated backend authorization lookups within a single capability evaluation only.
- Private liveness/readiness endpoints and deployment probes; documented compatible rollback.
- Lupita instructions require actual tool evidence and prohibit inventing success or replaying an
  uncertain write with a new key.

The stateless HTTP transport, tenant and membership boundaries, live permission checks, consent,
four existing two-step actions, money ownership, idempotency and data minimization are preserved.
No new mutation tool, background agent, shared credential, permission TTL cache or voice runtime
was introduced. Existing operational-reference work in the working tree was preserved.
Database/schema changes: N/A. Production data changes: N/A.

## Verification

| Check | Result |
| --- | --- |
| MCP `npm test` (TypeScript compilation plus tests) | 52 passed |
| Backend `Ai*Test,!AiOAuthUserInfoRepositoryIntegrationTest,SalesReferenceRepositoryTest` | 116 passed; Java compilation successful |
| Frontend integrations, auth session and user-access regressions | 38 passed (7 + 15 + 16) |
| Frontend typecheck and Vite build | Passed |
| Bash syntax and `git diff --check` | Passed |
| APPTEST Compose interpolation, synthetic required values and `config --quiet` | Passed; no containers started |
| Initial synthetic HTTP continuity | Passed: 1200 seconds, 236 rounds, 2553 backend attempts |
| Additional continuity after OAuth/error-body hardening | Passed: 600 seconds, 118 rounds, 1275 backend attempts |
| Docker image execution | Not run: local Docker engine unavailable |
| Real APPTEST OAuth/PKCE, refresh, confirmed write and ChatGPT text/voice | Pending |

The HTTP tests use a real SDK client and loopback listener with a simulated ERP. The OAuth recovery
test additionally uses a synthetic HTTP OAuth issuer: it verifies discovery, two refreshes and
subsequent tool calls in the same client, not actual ChatGPT behavior. Backend tests mock repositories;
no functional, production or shared database was used.

Both prolonged runs exited successfully, including their final revocation/isolation assertions.
Attempt counts include intentionally injected failures and their bounded retries; they are not a
production throughput benchmark. The final 52-test compilation/regression run also covers the
latest diagnostic classification adjustment. Neither prolonged run certifies real OAuth or voice.

Coverage includes temporary and sustained failures, network loss, header/body timeouts,
authentication/permission denial, catalog validation, two-tenant isolation, permission revocation,
caller cancellation, malformed/oversized JSON, correlation redaction and non-replayed mutations.
Java tests verify memo cleanup on exception, concurrent isolation and refresh rejection for expired,
used, wrong-client, wrong-resource or scope-expanding grants.

## Changed areas

- Adapter: `integrations/indice-mcp/src/{httpApp,backendTransport,toolPolicy,toolErrors}.ts`,
  `server.ts`, `indiceClient.ts`, tool registration, assistant instructions and bounded configuration.
- Backend: `AiToolAuthorizationService`, `AiToolCapabilityService` and focused authorization/OAuth tests.
- Operations: MCP README/env, Compose, host-network probes, deployment README and APPTEST runbook.
- Regression: HTTP continuity, SDK OAuth recovery, backend recovery, configuration and prolonged runner.

## Remaining release risks

Readiness verifies the backend health response, not MySQL, user permissions or the OAuth issuer.
Retries improve transient read failures but cannot guarantee uninterrupted service or repair a client
that stops exposing tools. Actual latency improvements need APPTEST measurements. The public-route
rate-limit debt and the remaining canonical release checklist are not closed by this change.
The original reported production incident remains unattributed without correlated incident logs.

Deploy the coordinated backend/MCP/web revision to APPTEST, complete the 20–30 minute real-client
checklist and preserve previous immutable images/configuration before considering production.
Do not promise voice support until the exact intended client/mode has been checked.
