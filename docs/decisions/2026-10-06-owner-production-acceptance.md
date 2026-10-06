# Owner-directed production acceptance — 2026-10-06

Status: one-release sequencing replacement authorized by the product/release owner;
production activation remains conditional on technical gates.

## Explicit instruction and narrow replacement

After notification that APPTEST was deployed and its ten-minute canary passed, the owner explicitly
requested promotion to production because they want to perform their review in that environment.
This is a new instruction, not a claim that authenticated APPTEST UAT happened.

For this same integrated administrator/Lupita release only, replace the requirement to complete
the human administrator review and real ChatGPT/OAuth acceptance in APPTEST **before** production
promotion with owner-assisted review in production **after** verified deployment and operational
smoke. The latest explicit owner instruction takes precedence under AGENTS.md. The normal order
remains unchanged for every subsequent release.

This narrowly replaces the sequencing/location rule in the public gate's human-UAT requirement,
deployment/MCP APPTEST runbook, MCP operating system sections 7–8, and the earlier protection and
Stripe-continuation decisions. It does not weaken authentication, tenant/object/module/tab scope,
CSRF, consent, confirmation, idempotency, financial integrity or fail-closed controls.

## Residual risk and expiry

- Manual authenticated evidence remains `UNKNOWN`, not `PASS`: administrator login/MFA and
  representative-role/business-flow review; real ChatGPT OAuth/PKCE, refresh, revocation, confirmed
  synthetic action/replay, file handling, and 20–30-minute continuity in the actual intended mode.
- Residual operational risk: HIGH, because privileged workflow or real-client interoperability
  failures may first appear in production despite the passing automated coverage and APPTEST canary.
- Acceptance status: `ACCEPTED` for this sequencing/location change only, by the product/release
  owner who explicitly requested testing in production. It is not acceptance of a known bypass,
  cross-tenant disclosure, payment-integrity defect, data-loss risk or exploitable vulnerability.
- Review owner: product/release owner, using their own session without sharing credentials/tokens.
- Due/expiry: before another release, business/provider enablement, or 2026-10-07 00:00 UTC
  (2026-10-06 20:00 America/Toronto), whichever occurs first. This does not extend the separate
  historical Stripe-secret deferral or silently authorize subsequent releases.

## Technical conditions that remain blocking

Use only the exact protected application artifacts from `e73c35ce1415d98a8dac7ddb39a7859eb546f18a`
already verified in APPTEST. Documentation-only changes do not rebuild or alter those artifacts.
Retain current exact-source CI, protected production preflight, immutable-image SCA/secret scans
and SBOMs, fresh verified production database/object backup and isolated restore, original migration
checksums, V299-compatible recovery, normal disk-capacity guard, production dry run, public smoke,
cross-environment checks, unchanged prices/subscription-version counts and observed canary.

No known security or integrity failure is waived. Do not test the database with an integration suite,
stress the public endpoint, copy APPTEST configuration into production, create privileged accounts,
use real customer financial mutations as test fixtures, or log credentials/business payloads.
The existing disabled provider/financial activation gates remain disabled. Stripe keys, catalog,
prices, subscriptions and billing authority are not changed by this release.

The operator must not label a production deployment as completed human acceptance. Notify the
owner with the production administrator link and record any subsequent review separately. On an
operational or authorization regression, contain the affected route/operation and use the rehearsed
schema-compatible recovery; do not revert Flyway, remove business data or bypass permissions.
