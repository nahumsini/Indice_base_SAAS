# Integrated release: bounded historical Stripe TEST deferral

Date: 2026-10-23. Owner approval recorded at 17:47 UTC.

After reviewing the technically prepared candidate, the release owner answered
**"Autorizar excepción puntual"** to the explicit question requesting an exception
for revision `3eddc38be95337075bbbeb92d2b3fe3772d098d2`, first in App Test and
then in production, while historical Stripe TEST-key revocation remains pending.

Under repository instruction precedence, this replacement decision supersedes
only that historical TEST-key revocation blocker for this ordered activation and
its observation windows. The finding remains **HIGH and unresolved**. No key
revocation is claimed; the release owner retains responsibility for revocation.
All other release gates remain applicable.

Scope: the exact immutable application candidate above on
`apptest.indiceapp.com`, followed by `app.indiceapp.com` only after App Test's
verification and five-minute observation pass. Subsequent documentation-only
commits do not change the application artifact. This authorization expires when
the ordered attempt and observation finish, and in all cases no later than
**2026-10-23T20:00:00Z**. It cannot authorize another release or be reused.

Preserve each environment's provider settings, protected files, billing catalogue,
prices, existing permissions, tenant boundaries, database and object storage.
No provider activation, live charge, real email send, price publication or
permission expansion is authorized. The deployment includes the reviewed
forward-only V347–V353 migrations from V346; never reverse or repair their history.
The separate WhatsApp worktree remains outside this release.

The [preparation report](../validation/2026-10-23-integrated-release-preparation.md)
records the successful CI, tests, artifact provenance, restored-data rehearsals,
scans and compatible recovery constraints. This decision alone does not establish
that either environment was deployed. Record actual activation and observation
separately, then disable the operational authorization.

Ordered activation and observation completed successfully on 2026-10-23 at
18:20:23 UTC; final verification passed at 18:20:33 UTC. The operational
authorization was disabled at **18:20:43 UTC**. This exception window is closed
and cannot be reused. Historical Stripe TEST-key revocation remains unresolved.
See the [activation report](../validation/2026-10-23-integrated-release-activation.md).
