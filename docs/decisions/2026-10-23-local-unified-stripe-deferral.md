# Local unified release: bounded historical Stripe TEST deferral

Date: 2026-10-23.

The owner's latest explicit instruction authorizes publishing all local work and
deploying production while leaving Stripe pending: “al final todos los cambios
locales los subes en la rama y despliegas en producción dejando pendiente lo de Stripe”.
This is a new replacement decision; earlier closed release exceptions are not reused.

Scope is application source `76780da79ff63c0a1ea0c7ac7f99c49d4e26744d`, the exact
security-patched artifacts in the [release report](../validation/2026-10-23-local-unified-release.md),
App Test first, then production only after successful verification and five-minute
observation. Subsequent documentation-only commits do not change these artifacts.
The exception ends when this ordered attempt and observation finish and in all cases
no later than **2026-10-24T06:00:00Z**. It cannot authorize another release.

Only the historical Stripe TEST-key revocation blocker is deferred. The finding
remains **HIGH and unresolved**, with revocation still the owner's responsibility.
No current revocation is claimed. All other release, tenant, identity, authorization,
data-integrity, backup/restore, capacity, monitoring and recovery gates still apply.
The runtime dependency findings discovered during preparation were patched and retested;
this decision does not waive them or cover another secret or incident.

Preserve each environment's protected configuration, prices, subscription references,
existing access and storage. The six additive migrations V354–V359 preserve published
history and add explicit-deny conversation permissions, not history grants. The new
WhatsApp feature, UI, ingress, worker, outbound and real onboarding remain disabled;
source integration is not provider activation. No real provider send, catalogue
publication, live charge or access expansion is authorized by this deployment.

Recovery retains the prior application's exact classes/resources with only the six
unchanged migration resources added, plus patched OS dependencies. The original V353-only
backend must not be restarted against V359. Use the verified compatible recovery image
through the canonical host-network wrapper; never repair or reverse Flyway history.

The owner requests production publication following engineering validation. Automated
browser/contract checks and authenticated connection continuity are recorded separately
from human product acceptance, which remains UNKNOWN until the owner reviews the result.
This changes acceptance timing only; it does not waive a known security or integrity defect.

The ordered activation and observations passed on 2026-10-23. App Test was verified at
22:03:16Z and observed through 22:08:17.822Z; production was verified at 22:16:29Z and
observed through 22:21:29.945Z. Final joint verification passed at 22:21:37.857026Z.
Authorization closed at **2026-10-23T22:21:37.886116Z** and its private operational record
now has `authorized=false`. This exception window is closed and cannot be reused.
The historical Stripe TEST-key finding remains HIGH and unresolved. Human product
acceptance remains UNKNOWN; all WhatsApp provider and publication switches remain off.
See the [activation closeout](../validation/2026-10-23-local-unified-release.md#activación-y-cierre).
