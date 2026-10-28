# Users access correction — production publication proposal

Date: 2026-10-27 (America/Toronto). Status: TECHNICALLY PREPARED; NOT AUTHORIZED FOR ACTIVATION.

The owner requested deploying the reviewed Users/access correction so they can assign modules
to distributors. Candidate source is `89a5afa6c914a243211ab957283597ca4c02baf2`.
The requested behavior and local regression evidence are in the
[Users review](../validation/2026-10-28-users-module-access.md). Deployment preparation does not
itself assign, remove, enable or purchase a module, change a user or grant OAuth access.

Only frontend/backend application bytes change. The currently active MCP source `6302037f`
and MinIO image must retain their exact versions; App Test retains its current version and
configuration. The canonical host-network operation may restart unchanged supporting containers;
this is not an MCP upgrade. Schema remains V365 with no new/applied migration edits. Current
settings, protected files, membership/module/tab grants, billing and prices must be preserved.
Candidate and recovery images, fresh off-host backup, disconnected restoration, exact-source CI,
protected canonical preflight, scans, isolated proxy/runtime checks, deployment rehearsal and
capacity evidence are required before activation.

Historical Stripe TEST-key revocation remains **HIGH / unresolved**, owned by the release owner.
This preparation does not use that key, revoke it, activate a provider or alter provider authority.
The [previous MCP authority](2026-10-28-mcp-compact-output-publication.md) is closed and explicitly
cannot be reused. A generic publication request does not renew that closed risk acceptance.
A fresh explicit owner decision is required to defer only this finding for this exact source/image
set and single production publication. Other gates and exploitable findings cannot be waived.

The proposed exception also makes the timing/location of human product acceptance explicit:
production-only activation after all technical checks, then bounded read-only review. Human
acceptance remains UNKNOWN until the owner tests the flow. Synthetic tests, anonymous rejections
and a healthy backend do not prove the original distributor incident is resolved.

If the owner explicitly authorizes the prepared candidate, record the exact reply, immutable image
digests, UTC start and expiry before activation. Proposed authority covers one canonical production
activation, compatible recovery if needed, five minutes of technical observation and a bounded
read-only Users review, expiring no later than two hours after the reply and closing earlier at the
end of that attempt/observation. Historical revocation's deferral expires with that window; it is
not resolution of the finding or permission for another candidate, activation, provider action,
new consent or business mutation. The owner may subsequently assign modules through the normal
server-authorized UI; no production access write is part of this deployment verification.

## Concrete prepared candidate

Technical preparation passed at **2026-10-28T04:20:07.614469+00:00**. CI run
[40629691490](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/40629691490)
passed; branch and main contain `89a5afa6c914a243211ab957283597ca4c02baf2`. Full preflight, image scans/SBOMs,
fresh off-host backup, disconnected candidate/recovery, protected configuration/runtime checks
and canonical dry run passed. [The preparation report](../validation/2026-10-27-users-access-production-release.md)
records totals, omissions, exact scope and limits.

- Backend: `sha256:e8c2cd093d19c3aebbc9a49139ccac2807c75608034fab5cad358b92ba9d74bc`.
- Web: `sha256:ea5861ba318262ef8ed341da6fcedb6cd2d85ba862113a04c8ba8d6cfa0647db`.
- Compatible previous backend: `sha256:2cb8872f88de748bdc9ce6199ed39f6433f7c78665ac104be786d176cd89263e`.
- Unchanged MCP: `sha256:a962dea27500a53977decd5486a5ba1c02ac90cf2dc1fff50eb1807cae1220b8`.

Historical revocation is still pending. No production activation has occurred. The fresh owner
question must name source `89a5afa6` and this production-only publication; prior closed answers
are not authority for this candidate.
