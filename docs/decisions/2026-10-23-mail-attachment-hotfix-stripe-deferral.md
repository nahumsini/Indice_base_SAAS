# Mail attachment hotfix: bounded historical Stripe TEST deferral

Date: 2026-10-23. Owner approval received at 20:20 UTC.

After the attachment fix passed full CI, real-MinIO regressions, fresh backups and
isolated restored-data rehearsals, the release owner answered **"Autorizar excepción
puntual"** to the explicit request for revision
`fb01d39fe23381ada960de92863d875f3f14c806`, App Test first and production after verification.

This replacement decision supersedes only the historical Stripe TEST-key revocation
blocker for that exact immutable backend candidate and its ordered observation.
The finding remains **HIGH and unresolved**; the owner retains responsibility for
revocation. All other release gates remain applicable. No current key revocation
is claimed. The earlier integrated-release exception remains closed.

Scope: `apptest.indiceapp.com`, then `app.indiceapp.com` only after App Test verification
and five-minute observation pass. Web and MCP retain their deployed `3eddc38be953`
images. Subsequent documentation-only commits do not change the approved artifact.
The separately requested template modal refinement is outside this immutable hotfix.
Authorization expires when this ordered attempt and observation finish, and in all
cases no later than **2026-10-23T22:00:00Z**. It cannot authorize another release.

Preserve each environment's provider flags, protected files, tenant boundaries,
permissions, billing catalogue/prices, database and object storage. No provider
activation, live charge, real email send or access expansion is authorized.
There are no migrations: retain V353 and its complete history unchanged. Compatible
recovery retains the secure previously deployed `3eddc38be953` backend, web and MCP.

The [preparation report](../validation/2026-10-23-mail-attachment-upload-hotfix.md)
records exact image/JAR provenance, passing CI, scans, backups and recovery evidence.
This decision alone is not evidence of activation. Record actual activation,
observation and authorization closure after verification.
