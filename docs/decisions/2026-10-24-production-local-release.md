# Production-only local workspace release — 2026-10-24

The owner explicitly requested publication of all current primary-workspace changes,
including work from other conversations, to a branch and `main`, followed by production
only. This replaces the usual App Test-first activation order for this release attempt.
App Test must retain its running containers, images, protected settings and database.

The source snapshot is isolated from subsequent development. Other local worktrees were
compared with their previously integrated snapshots; their remaining patches are already
integrated, including the renamed WhatsApp migrations V356–V359.

All other release gates remain mandatory: exact-candidate green CI, current dependency
and image scans, protected real configuration preflight, database/object backup and
off-host verification, isolated restoration with candidate and compatible recovery,
dry run, protected-route checks and production observation. V360 is additive; recovery
must preserve the prior application while recognizing that unchanged migration resource.

The release preparation updates MCP transitive dependencies to body-parser 2.4.0 and
fast-uri 3.1.9, addressing GHSA-27r3-jxmh-p828 and the four fast-uri advisories reported
by npm audit. Existing tools, authorization, provider flags and transport remain unchanged.

This decision does not renew a closed Stripe TEST-key deferral. Any remaining historical
key revocation requires a separately scoped owner decision before activation.
