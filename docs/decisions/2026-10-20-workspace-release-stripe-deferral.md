# Workspace release: explicit historical Stripe TEST deferral

Date: 2026-10-20 (America/Toronto).

After reviewing the prepared revision, tests, backup and recovery, the owner
explicitly authorized: "Sí, publicar esta versión y mantener Stripe pendiente".
This decision applies only to application revision
`04f127a9a96e125b6a5b41b46386215ffb44d337` on `app.indiceapp.com`.

Under the repository's instruction precedence, this is a new, narrow replacement
of the historical Stripe TEST-key revocation blocker for this activation and its
observation window. It does not reopen earlier exceptions. The historical finding
remains HIGH and unresolved; no revocation is claimed. Responsibility for revocation
remains with the release owner. All other release gates remain applicable.

Preserve provider settings and secrets, existing prices/subscription versions,
tenant/session/CSRF boundaries, attendance policies and APPTEST. This decision
does not authorize billing/provider activation, charges, price publication or
automatic company grants for the new pilot module. Regional entry/payment flags
retain their existing default-off values.

The exact candidate and compatible V339 recovery backend are recorded in the
[preparation report](../validation/2026-10-20-workspace-production-preparation.md).
This exception expires when this release attempt and its five-minute observation
finish. It cannot authorize a later release. Actual activation, verification and
the unresolved revocation must be recorded separately; this decision alone is not
evidence of deployment.
