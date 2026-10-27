# MCP discovery publication proposal

Date: 2026-10-27.

Status: PROPOSED; NO OWNER AUTHORIZATION RECORDED; NOT ACTIVATED.

The reviewable runtime source is `12593ec9ee7f5d9c1430446d928d83f855f38ca9`.
Its [technical evidence](../validation/2026-10-27-mcp-paginated-discovery.md#exact-source-publication-preparation)
records exact-source CI, 175 MCP regressions, the corrected 20-minute continuous
probe, the protected full preflight, exact-image scans, off-host backup, disconnected
restoration and the release-specific recovery rehearsal.

The proposed operation replaces only the production MCP container with immutable
image `sha256:fb5dcc2cddb5b3db390d87e09827671676783ddec018d4fb29ddb2c44c9d9a55`.
Backend/web JavaScript and Java sources, owner APIs, schemas and dependencies are
unchanged relative to the active application. Their images and running container
IDs, storage and App Test stay unchanged. The original MCP image/configuration is
retained for compatible recovery. This component scope does not authorize a
backend/web/schema deployment or any unrelated local work.

Two owner decisions remain necessary before activation:

1. A fresh bounded deferral of the historical Stripe TEST-key revocation. The
   [previous decision](2026-10-27-oauth-marketing-stripe-deferral.md#closed-deployment-window)
   closed and says it “cannot be reused”. The finding remains HIGH and unresolved.
2. A source-specific replacement of normal real-client App Test acceptance timing:
   [the MCP contract](../indice-mcp-operating-system-v1.md#71-conversation-continuity-and-bounded-recovery)
   normally requires that acceptance before promotion. This proposal asks to perform
   a bounded real ChatGPT import/read review in production after technical smoke.
   App Test and real-client evidence are currently UNKNOWN, not PASS. Synthetic
   SDK tests do not establish actual ChatGPT acceptance or voice support.

If explicitly authorized, the window starts at that recorded reply, covers one
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

Until explicit owner authority is recorded, production remains unchanged and the
private activation guard must reject this operation. If authorized activation
fails, recover the retained compatible MCP; keep it stopped if protection or
compatibility cannot be established. Preserve the other services and all data.
