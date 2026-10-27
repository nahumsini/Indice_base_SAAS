# MCP discovery publication decision

Date: 2026-10-27.

Status: DEPLOYED MCP-ONLY; TECHNICAL OBSERVATION PASS; AUTHORIZATION CLOSED;
SUBSEQUENT REAL-CLIENT IMPORT FAILED.

The [subsequent read-only follow-up](../validation/2026-10-27-mcp-catalog-compaction.md)
supersedes the pending-consent state recorded below. The owner completed consent;
authenticated initialization succeeded, but two ChatGPT discovery attempts each
stopped after fifteen successful pages and imported no tools. This is not PASS
client acceptance and does not reopen the closed deployment authorization.

Owner authorization recorded at **2026-10-27T23:19:37Z**: “Autorizar publicación y
revisión en producción”, in reply to the source-specific question covering only
MCP `12593ec9`, the pending historical Stripe TEST revocation and bounded real
ChatGPT verification after publication. The window expires no later than
**2026-10-28T01:19:37Z**, and closes earlier when this single attempt and its
bounded observation/review finish. This is fresh authority, not reuse of a
previous closed exception.

The reviewable runtime source is `12593ec9ee7f5d9c1430446d928d83f855f38ca9`.
Its [technical evidence](../validation/2026-10-27-mcp-paginated-discovery.md#exact-source-publication-preparation)
records exact-source CI, 175 MCP regressions, the corrected 20-minute continuous
probe, the protected full preflight, exact-image scans, off-host backup, disconnected
restoration and the release-specific recovery rehearsal.

The authorized operation replaces only the production MCP container with immutable
image `sha256:fb5dcc2cddb5b3db390d87e09827671676783ddec018d4fb29ddb2c44c9d9a55`.
Backend/web JavaScript and Java sources, owner APIs, schemas and dependencies are
unchanged relative to the active application. Their images and running container
IDs, storage and App Test stay unchanged. The original MCP image/configuration is
retained for compatible recovery. This component scope does not authorize a
backend/web/schema deployment or any unrelated local work.

Activation passed at **2026-10-27T23:20:29.519447+00:00**. Six production health
samples spanning 300.953 seconds passed with zero restarts or new detected errors;
poststate, canonical application/MCP smoke, protected configuration, original
Flyway history, billing and access checks passed. Backend/web/storage and App Test
containers stayed unchanged. The original MCP is stopped and retained for recovery.

The window closed at **2026-10-27T23:26:03.018527+00:00**; the private authority
is explicitly disabled and cannot be reused. The bounded real-client review
reached the application's company/scope consent page through ChatGPT's existing
connection renewal. The owner must complete that consent themselves. Tool import
and a real authenticated ChatGPT read remain UNKNOWN, not PASS. Historical Stripe
TEST-key revocation remains HIGH and unresolved. Subsequent read-only diagnosis
does not reopen this deployment window or authorize another activation.

The owner explicitly authorized these two bounded decisions:

1. A fresh bounded deferral of the historical Stripe TEST-key revocation. The
   [previous decision](2026-10-27-oauth-marketing-stripe-deferral.md#closed-deployment-window)
   closed and says it “cannot be reused”. The finding remains HIGH and unresolved.
2. A source-specific replacement of normal real-client App Test acceptance timing:
   [the MCP contract](../indice-mcp-operating-system-v1.md#71-conversation-continuity-and-bounded-recovery)
   normally requires that acceptance before promotion. This decision permits
   a bounded real ChatGPT import/read review in production after technical smoke.
   App Test and real-client evidence are currently UNKNOWN, not PASS. Synthetic
   SDK tests do not establish actual ChatGPT acceptance or voice support.

The window starts at that recorded authorization, covers one
activation, five-minute service observation and at most 30 minutes of real-client
read-only verification, and expires no later than two hours afterward. It closes
with that attempt and cannot be reused for another source or later activation.
Documentation-only readiness/authority commits do not change the runtime source.

All other release gates remain mandatory. This proposal cannot waive an actively
exploitable vulnerability, authentication bypass, tenant or financial integrity,
backup/recovery or monitoring requirement. It does not revoke the historical key,
enable providers, alter prices/access or authorize real messages, charges or other
business mutations. Fresh OAuth scope consent belongs to the owner; release
approval does not approve that consent on their behalf.

Production remains unchanged until the private activation guard independently
verifies this exact authority and all technical evidence. If authorized activation
fails, recover the retained compatible MCP; keep it stopped if protection or
compatibility cannot be established. Preserve the other services and all data.
