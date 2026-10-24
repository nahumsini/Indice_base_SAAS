# Afternoon local-workspace production release — 2026-10-24

The owner requests a final commit containing all current primary-workspace changes,
publication of that branch and `main`, production activation and a fresh branch for
ongoing work. The cut is isolated from subsequent edits. The explicitly retained
production-only target preference governs this attempt; App Test remains unchanged.

The cut contains the read-only HR payroll incident report, contained module scroll
and navigation, shared print refinements and individual-mail template field completion.
No Flyway migration is added; V360 and its complete published lineage remain unchanged.
The exact currently running backend/web/MCP images are retained for recovery.

All technical release gates remain required: exact-candidate CI, focused flow and
authorization regressions, real protected preflight, dependency/image/secret scans,
backup and off-host verification, isolated restoration, compatible recovery, dry run,
public and authenticated checks and five-minute production observation. Prices,
subscription references, existing permissions, provider flags and secrets are preserved.
No real mail is sent by validation.

The earlier Stripe TEST-key deferral is closed. This decision does not renew it;
any remaining historical-key revocation requires a separately scoped owner decision
after this candidate's concrete release preparation is reviewable.
