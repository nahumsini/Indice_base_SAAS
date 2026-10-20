# Attendance hotfix production activation — 2026-10-19

Status: DEPLOYED / VERIFIED. Post-activation checks and five-minute observation PASS.
Real attendance acceptance is pending the owner's retry after refresh.

## Scope and authorization

The owner authorized application revision `aaa23d66ac735b271605ee5632f2b16dae4c4b55`
for `app.indiceapp.com`: "Sí, publicar este parche y mantener Stripe pendiente".
The [bounded Stripe deferral](../decisions/2026-10-19-attendance-hotfix-stripe-deferral.md)
keeps that historical finding unresolved. All other release checks remain applicable.

The personal Multikiosk attendance path now applies the linked employee's effective
server-owned schedule/worksite policy. The owner's open schedule was incorrectly
subject to company-radius enforcement. Explicit schedule and contractual sites stay
restrictive. A separate radius-selection defect is corrected, and known location
failures expose fixed recovery messages. Photo/GPS, tenancy, actor authority,
check-in/check-out persistence and projection are preserved. No schema or attendance
configuration changed; APPTEST was not deployed in this operation.

See the [investigation and regression evidence](2026-10-19-attendance-investigation.md)
for affected files, reproduced failures, and limits. No real attendance event was
submitted by the agent; no customer notification or outbound email was sent.

## Verification and activation

- Exact-source CI [39317963496](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/39317963496) PASS.
- Real-target preflight: 3,714 backend tests, zero failures/errors, one existing optional skip;
  focused backend, frontend, learning, TypeScript/build and recovery checks passed.
- Source/backend/web secret scans: zero findings. Web HIGH/CRITICAL findings: zero.
  Two unchanged conditional Spring MVC findings remain triaged, not patched; their
  XSLT/Spring SSE rendering preconditions are absent. The owner regression passes.
- Fresh SQL/object/environment backup, archive integrity, checksums and exact-target dry run PASS.
- Activation began at **20:41:56 UTC**. Public verification completed at **20:44:41 UTC**.
- Exact application images, runtime configuration/mounts, provider secret-source hashes,
  V331 migration history, zero failed migrations and APPTEST fingerprints match expectations.
- Previous production containers remain stopped as `-rollback` with their exact images.
- Anonymous protected routes return 401; public frontend matches the immutable image.
  CSP, HSTS, nosniff, storage, API, CSRF/login routing and MCP/OAuth boundary checks PASS.

The first supplemental guard queried `/api/v1/hr/attendance`, which has no GET
handler, and received 404. This was a probe error after the deployment wrapper had
already succeeded, not an application failure. The guard was corrected to the
existing `/api/v1/hr/attendance/me/dashboard` handler and returned 401 as required.
The initial result was retained. Verification resumed without deploying again or
weakening the assertion; no application/source change was needed.

## Active operational entrypoints and recovery

These production paths supersede the older integrated-release operational paths:

- Protected environment: `/root/indice-attendance-release-20261019/production.env`.
- Clean application checkout: `/root/indice-attendance-release-20261019/source` at `aaa23d66`.
- Evidence/authorization: `/root/indice-attendance-release-20261019`.
- Backup: `/root/indice-attendance-release-20261019/backups/production-20261019T201920Z`.
- Backend: `indice-erp-backend:aaa23d66ac73`,
  `sha256:20b5d655820781a6fb1e7ad9d7a73ecdca883caa3a20064537e26c45faaa5c42`.
- Web: `indice-erp-web:aaa23d66ac73`,
  `sha256:c123b5c9a7287d3fe90c0b28f46580096fe44bac4407a4ea3de9d5c171961648`.
- MCP unchanged: `indice-erp-mcp:5dac3bf0bcb8-osrefresh`.

The new environment differs only in backend/web image references. Retain the
existing encryption keys, provider settings, secret files and mounted volumes.
APPTEST continues to use its own previously verified environment and runtime.

Recovery uses the stopped `indice-erp-*-1-rollback` set: backend `3df8e17dd380`,
web `5dac3bf0bcb8`, and the previous identical MCP/MinIO images. This prior backend
is compatible with unchanged V331. Follow `deployment/README.md` with the production
environment and ports (backend 8083, web 8080, MCP 3011, MinIO 9000/9001). Do not
start the older pre-upgrade V299 backend, reverse migrations, or delete business data.

## Observation and outstanding acceptance

All six observation samples from **20:44:42 through 20:49:42 UTC** passed:
web/API/storage/MCP returned 200, all four services stayed running with zero
restarts, and no new backend ERROR/FATAL/OutOfMemory lines were detected. The
startup log check was also clean. The final image/configuration/schema/recovery
and APPTEST-isolation guard passed again after observation. No rollback was needed.
Protected `release-manifest.json` records `DEPLOYED_AND_OBSERVED`; the manifest,
canary and smoke evidence are retained with the release.

The owner was asked to refresh the Multikiosk and retry attendance with a fresh
photo and location. That confirmation remains pending; runtime health does not
certify the physical user flow or every customer's configuration. The historical
Stripe TEST-key revocation remains pending, and this hotfix exception window has
ended. Documentation commits do not change the application revision deployed above.

Closeout documentation: relative-link validation and `git diff --check` PASS.
There are no further application changes after the verified revision; no new
application tests are claimed for this documentation-only closeout.
