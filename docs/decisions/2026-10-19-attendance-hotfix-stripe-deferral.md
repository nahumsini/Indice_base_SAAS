# Attendance hotfix: explicit historical Stripe TEST deferral

Date: 2026-10-19 (America/Toronto).

After reviewing the tested attendance correction and prepared production release,
the owner explicitly authorized: "Sí, publicar este parche y mantener Stripe pendiente".
This is a new, narrowly scoped replacement decision for application revision
`aaa23d66ac735b271605ee5632f2b16dae4c4b55` on `app.indiceapp.com`.
It does not reuse or reopen the expired authorization for the earlier deployment.

Only the historical Stripe TEST-key revocation blocker is deferred for this
attendance hotfix activation and observation window. The finding remains HIGH and
unresolved; no revocation is claimed. All other release gates remain applicable.
The prior source/runtime absence evidence is retained through the unchanged
protected configuration guard and new zero-secret source/artifact scans.

Preserve all provider settings, credentials, catalog prices, subscription versions,
tenant boundaries, photo/GPS requirements and server-owned attendance policy.
No billing activation, payment, provider-key rotation or unrelated feature release
is authorized by this decision. Database schema stays at V331.

This exception expires when this hotfix activation and its observation finish.
Actual deployment, verification, recovery and remaining user acceptance must be
recorded separately. This authorization record alone is not evidence of activation.

Activation and the five-minute observation completed successfully at
**2026-10-19 20:49:42 UTC**, as recorded in the
[activation report](../validation/2026-10-19-attendance-activation.md).
This exception window is now closed and cannot authorize a later release.
The historical key revocation remains pending, and real attendance acceptance
still awaits the owner's retry. Neither is represented as resolved by deployment.
