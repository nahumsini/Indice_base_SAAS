# APPTEST refresh — 2026-10-19

Status: DEPLOYED / VERIFIED. Activation, post-deployment verification and the
five-minute observation passed.

## Scope and source

The owner requested bringing APPTEST up to date immediately after the verified production
release. This refresh uses the same immutable application artifacts, without importing
production data, copying its credentials or changing application behavior.

- Target: `https://apptest.indiceapp.com`.
- Application source: `3df8e17dd380dc845317dde534e4b58151196043`.
- Backend image: `indice-erp-backend:3df8e17dd380`.
- Web image: `indice-erp-web:5dac3bf0bcb8`.
- MCP image: `indice-erp-mcp:5dac3bf0bcb8-osrefresh`.
- Compatible backend recovery: `indice-erp-backend:0c2f6a150dbb-recovery`.
- Immutable image IDs, exact-source CI and prior artifact scans are recorded in the
  [production activation report](2026-10-19-production-activation.md). No new image build
  or code change is part of this refresh.

## Environment ownership

APPTEST uses its existing `indice_apptest` database on loopback port 8336 and its own
MinIO volume. Backend/web/MinIO/MCP continue to use 8182/8180/8900/3010 respectively.
The dedicated protected environment is
`/root/indice-apptest-release-20261019/apptest.env`; the exact-source checkout is
`/root/indice-apptest-release-20261019/preflight-source`.

The environment was derived from APPTEST's own running containers and durable configuration.
Existing authentication, provider settings and test-mode billing are preserved. The old
schema had no email-account table or mail encryption key. A separate APPTEST encryption
key was created for the new owner and backed up under the protected release `secrets/`
directory. Retain it for future email-account decryption; never substitute production's key.

Production container IDs, images and environment fingerprints were captured before work
for a strict post-activation comparison. The original local dirty workspace is preserved.

## Backup and isolated upgrade/recovery rehearsal

Protected backup: `backups/apptest-20261019T162710Z` under the APPTEST release directory.
The database, object archive, environment, schema and billing snapshot passed all five
SHA-256 checks; both compressed archives passed integrity verification.

A disconnected private restore reproduced V299, migrated to V331 and started the final
backend followed by the compatible recovery backend. Both passed health, MCP readiness
and anonymous authorization checks. Historical migration checksums, retained original
business rows/columns and billing catalogue/subscription versions matched. Reviewed module
catalogue changes and newly introduced rows were explicitly excluded from the retained-row
comparison, as in the prior production rehearsal.

The private app had SELECT-only database authority; Flyway alone had separate authority
inside the disconnected clone. External email and provider operations were disabled there.
All private rehearsal containers were removed. The backup archives remain protected.

Never start the original V299 backend on the upgraded V331 database. The compatible recovery
retains current security, mail and financial owners; shared-code defects still require a
forward fix. Do not undo migrations or erase volumes for rollback.

## Validation and activation evidence

- Host-network dry run: PASS, with APPTEST-specific container names, ports, Nginx path and
  the immutable compatible recovery image; no running service was changed by the dry run.
- Authenticated APPTEST connector baseline: PASS, context read only. Private identity
  values were not written to the report.
- Full preflight with APPTEST configuration: PASS. Backend: 3,698 tests discovered,
  3,697 passed, one historical opt-in skip, zero failures/errors. MCP: 158 passed.
  Deployment recovery commands: 16 passed. TypeScript and frontend build passed,
  retaining the existing large-bundle advisory. The disposable `indice_test_db` on
  loopback port 9348 was removed after tests; the functional APPTEST database was
  never used for integration tests.
- Activation started at **2026-10-19 16:40:57 UTC**; public verification completed
  at **16:42:23 UTC**. All intended services are running the immutable images.
- Public web, API/storage health, CSRF/login routing and MCP/OAuth discovery: PASS.
- Schema V331 with zero failed migrations and unchanged historical checksums: PASS.
- Billing catalogue/subscription snapshot and protected runtime settings: unchanged.
- Production container IDs, images and complete environment fingerprints: unchanged.
- Existing authenticated APPTEST connector: same user, company, membership, role and
  operational scope; the sales read also returned the expected response shape. No
  identity values or sales amounts are recorded in this evidence.
- Chrome loaded the new APPTEST login page. No credentials or recovery message were submitted.
- Startup logs: zero ERROR/FATAL/OutOfMemory lines. MinIO image and data mount preserved;
  the MySQL service was not restarted. Private test/restore containers and the extracted
  rehearsal object copy were removed; original backup archives remain protected.
- Five-minute observation: PASS, all six samples through **2026-10-19 16:47:52 UTC**.
  Web/API/storage/MCP returned HTTP 200 throughout; all four services remained running
  with zero restarts and no new backend ERROR/FATAL/OutOfMemory lines. No rollback was needed.

The protected `release-manifest.json` records `DEPLOYED_AND_OBSERVED`; the sanitized
verification archive is retained on the server and in
`/tmp/indice-apptest-evidence-20261019`. The manifest, observation, invariant checks,
preflight summary and authenticated-connector metadata contain no credentials or
business values. Post-activation documentation commits do not change the deployed
application revision.

An initial preflight launcher tried to clone the production source archive as a Git repository.
That archive does not contain Git metadata. The launcher was corrected to clone the existing
preflight repository, fetch a small Git bundle and check out the exact application commit.
This failed preparation attempt performed no application activation or functional data change.

## Verification limits

This refresh reuses the artifact and source validation already recorded for production,
including its documented residual findings. It does not certify real mail delivery, physical
payment terminals or a new human walkthrough of every role and device. No real email or
payment is sent as part of the deployment checks. New production promotion is N/A.
