# MCP HTTP traffic protection — 2026-10-06

Status: implementation authorized by the owner; APPTEST/production activation remains staged.

## Scope and decision

The owner authorized closing the dedicated MCP traffic-protection release gate before continuing
APPTEST and, only after successful acceptance, production. Stripe remains covered solely by its
[existing temporary deferral](2026-10-06-admin-release-stripe-deferral.md); this decision does not
rotate secrets, activate providers, change catalog prices or waive any other release gate.

Apply bounded capacity at both the exact Nginx MCP route and the Node HTTP adapter. Validate the
current backend capability manifest before reading a body or allowing a large file intake. The
fixed policy and rationale are normative in the [MCP operating system](../indice-mcp-operating-system-v1.md#7-operations-and-public-release).

Keep the five active OAuth/manual connections per user and company, tenant/object/module/tab
authorization, scopes, tool catalog, previews, confirmations, idempotency and backend write authority
unchanged. Quotas are capacity controls, not authority or a capability cache. Private readiness,
OAuth metadata and all non-MCP routes retain their existing behavior.

## Verification and promotion

The refreshed npm audit found HIGH `GHSA-6qxp-vccf-f47h`/`CVE-2026-104850`, newly added to the
advisory database on 2026-10-06. Pin the SDK to the minimum corrected 1.x release, `1.31.0`, and
regenerate its lockfile. The [upstream advisory](https://github.com/advisories/GHSA-6qxp-vccf-f47h)
concerns OAuth clients sending stored credentials to an untrusted server-selected issuer; it
explicitly excludes SDK servers. The runtime is a delegated server. SDK test clients use synthetic
bearers or an isolated, in-memory OAuth provider; its credentials are now explicitly issuer-bound
and a regression proves that a different issuer receives no token request. Updating removes the dependency
finding without introducing client credential storage or replacing backend OAuth authority.
Do not migrate to SDK v2 or enable unrelated optional middleware in this change.

Required evidence: focused HTTP quota/authorization/body/cancellation tests; the complete MCP suite;
real Nginx regressions against both complete configurations in disposable, network-isolated containers;
host-network recovery tests; CI; actual protected-target preflight; immutable artifact scans; fresh
verified backups and V299-compatible recovery; APPTEST smoke/canary; and real authenticated acceptance.

Anonymous malformed bodies now return `401` before parsing instead of `400`/`413`; malformed bodies
with validated authorization still return `400`/`413` and never reach a tool. Pre-body errors have a
null RPC ID. Capacity rejection uses `429`, `Retry-After: 1`, no-store and no expired-token challenge.

This change adds no Java, frontend application, schema or billing behavior. The previously verified
V299 backend/recovery may be reused only with explicit byte-identical component provenance; do not
describe a reused artifact as a newly compiled artifact. The MCP and web proxy must be rebuilt from
the approved protection source. Record actual deployed image IDs, source commits and acceptance in
the release report. Retain proxy protection during rollback, or leave MCP disabled if compatibility
cannot be established.

Synthetic tests do not certify a real ChatGPT OAuth/PKCE/refresh/revocation session or 20–30-minute
continuity. Production remains blocked until those APPTEST checks and the representative administrator
UI/business-flow review have evidence. No credentials, token hashes or customer payloads belong in
logs, this decision or the report.
