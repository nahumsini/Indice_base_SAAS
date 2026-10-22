# Integrated release: historical Stripe TEST deferral

Date: 2026-10-22 (America/Toronto).

The release owner explicitly instructed: "despleiga ignorando stripe", after
confirming that historical Stripe TEST-key revocation remains pending and
reviewing the integrated main, completed validation and prepared release.

This decision applies only to application revision
`8c451b5612d07c1e4dfe291d72439838d68a5380`, first on
`apptest.indiceapp.com`, then on `app.indiceapp.com` after APPTEST's technical
verification and five-minute observation pass. Repository main `75e7ca4c` has
identical application sources, dependencies, migrations and deployment scripts;
its subsequent changes contain tests and release evidence only.

Under repository instruction precedence, this explicit replacement decision
supersedes only the historical Stripe TEST-key revocation blocker for this
ordered activation and its observation windows. The finding remains HIGH and
unresolved. No revocation is claimed; the release owner retains responsibility
for revocation. This decision does not authorize another release or waive any
other release gate. It expires when this release attempt and observation finish,
and in all cases no later than 2026-10-22T22:00:00Z.

Preserve each environment's provider settings and secrets, billing catalogue and
prices, tenant/user/CSRF boundaries, existing module access, database and object
storage. No provider activation, live charge, real email send, price publication
or permission expansion is authorized. The reviewed candidate's forward-only
migrations are authorized as part of the previously requested application
deployment: APPTEST V331 to V346, then App V339 to V346. Never reverse or repair
migration history.

The [preparation report](../validation/2026-10-22-integrated-release-preparation.md)
records tests, immutable images, backups, restored-data rehearsals and compatible
recovery limitations. Record actual activation, observation and residual risks
separately. This decision alone is not evidence of deployment.
