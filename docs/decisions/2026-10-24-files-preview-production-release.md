# Files thumbnails and navigation: production release cut

Date: 2026-10-24.

The owner extends the pending afternoon release with private image thumbnails, visible folder
navigation and a clear way to move files between folders or back to the main level. The unactivated
`a5064dfc` application cut is superseded by the resulting source, retaining all its earlier local
work. The existing production-only target preference continues; App Test remains unchanged.

This correction is frontend-only and reuses the existing Files owner contract, permission levels,
content endpoint and transactional move operation. It adds no schema, provider, billing or access
change. The exact previously prepared backend/MCP artifacts may be retained only with verified
unchanged source/runtime inputs and compiled payloads; the new web artifact must match the full
new distribution. All required technical gates remain in force, including exact-candidate CI,
protected preflight, scans, backup/off-host verification, restore, recovery, dry run and canary.

The earlier afternoon readiness record did not activate production. No historical Stripe TEST
exception is renewed by this source decision. The previous authorization remains closed; any
remaining historical-key revocation needs the separately scoped owner decision for this final
reviewable candidate. Human product acceptance remains UNKNOWN until owner review.
