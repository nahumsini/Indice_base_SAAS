# Creative workspace release: historical Stripe TEST deferral

Date: 2026-10-20 (America/Toronto).

The release owner explicitly authorized: "Sí, publicar esta versión y mantener
Stripe pendiente", after reviewing the prepared candidate, tests, backup,
restoration and immutable images. This decision applies only to revision
`23d5b954a2b9a5d14a74d8c0fc06ac3323f233c5` on `app.indiceapp.com`.

Under repository instruction precedence, this narrowly replaces the historical
Stripe TEST-key revocation blocker for this activation and its five-minute
observation. The historical finding remains HIGH and unresolved; no revocation
is claimed. The release owner retains responsibility for revocation. Its due
action remains outstanding; this decision does not extend acceptance to any
later release. All other release gates remain applicable.

Preserve provider settings and secrets, billing and prices, tenant/user/CSRF
boundaries, all five complementary-module access configurations, and APPTEST.
No provider activation, charge, permission expansion, or database migration is
authorized by this decision. Application changes are the reviewed candidate.

This exception expires when this release attempt and its observation finish.
Actual activation and residual risks must be recorded separately; this decision
alone is not evidence of deployment.

Activation and observation completed successfully at **2026-10-20 23:38:37 EDT**
(2026-10-21T03:38:37.592Z), recorded in the
[activation report](../validation/2026-10-20-creative-production-activation.md).
This exception window is closed. Historical Stripe TEST-key revocation remains
unresolved and no later release is authorized.
