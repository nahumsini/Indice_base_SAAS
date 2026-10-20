# Workspace production activation — 2026-10-20

Status: ACTIVATED AND VERIFIED. Five-minute production observation: PASS.

The owner explicitly authorized production revision
`04f127a9a96e125b6a5b41b46386215ffb44d337` while leaving the historical Stripe
TEST-key revocation pending, under the
[bounded release decision](../decisions/2026-10-20-workspace-release-stripe-deferral.md).
The working branch and main contain the approved application and its documentation.
SSH used the existing protected deploy key; no replacement/private key was exposed.

## Published behavior

Production now includes the personal ideas workspace (Mi pizarra, Tablero Índice,
Mis proyectos, saved snapshots and appearance controls), Sales content planning
and calendar, and the integrated main code described in the
[preparation report](2026-10-20-workspace-production-preparation.md).
The learning catalogue includes the new workspace chapters.

The new complementary module remains a pilot without automatic company grants.
Regional trial entry/payment flags retain the existing disabled values. No provider
activation, price publication, real payment, social publication or outbound mail
was performed as part of this release verification. Existing tenant/session/CSRF,
attendance photo/GPS policies and provider configuration remain preserved.

New, uncommitted pizarra/appearance-toolbar edits appeared in the shared local
worktree after the application snapshot was approved. They were left intact and
are not part of application revision 04f127a9 or these published images. The existing
generated visualization prototype also remains local.

## Active artifacts and operational paths

| Component | Immutable image | Image ID |
| --- | --- | --- |
| Backend | `indice-erp-backend:04f127a9a96e` | `sha256:af48f416c07699ee69179764614c3cad859363ad58aade6be2942041e8a8a1d3` |
| Web | `indice-erp-web:04f127a9a96e` | `sha256:f4c0d9d892810ae73819501d6f410bdd70f995aff7d294c2d9950fc96fd6df98` |
| Retained recovery backend | `indice-erp-backend:720ed2d06466-recovery` | `sha256:f07abaaf63e98585b147d2a70ae711d19dd3244edb75fd443d9c0c7d292da845` |

MCP remains `indice-erp-mcp:5dac3bf0bcb8-osrefresh`; MinIO is unchanged.
Active protected environment: `/root/indice-workspace-release-20261020/production.env`.
Exact application checkout: `/root/indice-workspace-release-20261020/source`.
Full operational evidence: `/root/indice-workspace-release-20261020`.

A fresh SQL/object/environment backup was created after authorization at
`backups/production-20261020T200858Z` under that release directory.
Both candidate and recovery were rehearsed again against that disconnected clone:
V339 startup, original business column/row hashes, old migration checksums, billing
snapshots, no pilot grants and anonymous-denial boundaries all passed. Temporary
restore containers and extracted objects were removed; the original backups remain.

Activation started at **2026-10-20 16:11:53 EDT (20:11:53 UTC)**. The canonical
host-network deployment and public verification completed at
**16:13:21 EDT (20:13:21 UTC)**. The five-minute observation completed at
**2026-10-20 16:18:22 EDT (20:18:22 UTC)**: six successful samples with HTTP 200
for web/API/storage/MCP, zero service restarts and no new backend errors.
Production billing catalogue/subscription-version snapshots remained identical
to the fresh pre-activation snapshot; no company grant was created for the pilot.

## Verification

The exact-source preparation remains applicable: 3,791 backend tests, zero
failures/errors, one skipped, frontend typecheck/build and focused browser flows,
158 MCP checks, 16 deployment/recovery checks, source/image scans and both CI runs.
The application source was not changed after those checks; later commits contain
only release documentation. The scoped Spring MVC dependency findings remain
unpatched, with the non-applicability evidence retained in the preparation report.

The production guard verified exact image IDs, unchanged settings/mounts/secret
fingerprints, unchanged APPTEST runtime, V339 with no failed migrations and all
previous V331 migration checksums preserved. Public HTML matches the built image.
Security headers remain present and protected owner routes return 401 anonymously.

Canonical smoke checks passed for web/API/storage, CSRF session establishment,
synthetic invalid login denial, protected Mercado Pago setup/callback routing,
and the public MCP/OAuth metadata boundary. These did not execute a real payment.

## Recovery and remaining limits

The `-rollback` backend is the tested V339-compatible 720ed2d06466 image, with the
previous web/MCP/MinIO retained stopped. Do not restart the original V331 backend
against the upgraded schema. The canonical recovery command preserves current
business data and forward-only migrations:

```sh
CONFIRM_ROLLBACK=true HOST_BACKEND_PORT=8083 HOST_WEB_PORT=8080 \
HOST_MINIO_API_PORT=9000 MCP_ENABLED=true HOST_MCP_PORT=3011 \
ROLLBACK_HEALTH_WAIT_SECONDS=60 \
bash /root/indice-workspace-release-20261020/source/deployment/scripts/rollback-host-network.sh
```

No rollback was required. Human production UI acceptance for the new views has not
been asserted by these HTTP/runtime checks. Historical Stripe TEST-key revocation
remains unresolved, owned by the release owner; publication is not evidence of
revocation. No other release gate was waived.
