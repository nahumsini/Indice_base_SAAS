# Saved-card billing flow verification — 2026-09-08

Scope: complete and verify the existing Stripe-hosted saved-card subscription flow locally.
No live Stripe API calls, charges, outbound notifications, deployment, commit or push are part of
this verification. The functional backend on port 8082 was stopped at the user's request and
remains stopped. The functional database was not used for tests or migrated during this task.

## Implemented behavior

- Current signup/activation creates a hosted Stripe Checkout subscription session, always collects
  a card, preserves the selected Price IDs and quantities, and applies only the intended trial.
- Existing subscribers manage cards using Stripe Customer Portal. A missing or expired card does
  not turn this into another subscription activation.
- The owner-only `GET /api/v1/billing/subscription/payment-method` resolves the company from the
  session. Delegated and public-demo access is rejected before reading provider data. Responses
  carry `Cache-Control: no-store` in addition to the application's existing security headers.
- The lookup verifies subscription/customer/payment-method identity and test/live mode, honours
  subscription-default precedence, and reports `SAVED`, `NO_CARD`, `EXPIRED`, or `UNAVAILABLE`.
  An unsupported legacy/non-card default, ambiguous company association, provider failure, or
  missing permission returns `UNAVAILABLE`; it is not presented as a verified missing card.
- Only card brand, last four digits, and check time are returned. Expiration is compared in memory;
  the endpoint persists no payment metadata and does not expose expiration, card IDs, PAN or CVV.
- Billing shows the independent result in all eight supported locales. Lookup failure does not
  block plan or invoice loading. Refresh checks again; hidden/delegated views discard card data.
  Existing authorized administrator cancel/resume controls are preserved separately from owner-only
  card management.
- Webhook recovery now requires an invoice marked `paid`. Previously, a successful payment-attempt
  event with an invoice still `open` could restore commercial access. Invoice snapshots and audit
  remain recorded, while unsettled attempts leave the restriction in place.
- The existing stricter payment-request settlement, seven-day enforcement, extension, pricing
  versioning, tenant ownership, trial/courtesy protections, and independent holds remain intact.

`SAVED` means Stripe returned an attached default card whose expiration month has not passed.
It does not promise that a bank will approve a later charge. Adding/replacing a card is distinct
from paying an overdue invoice and does not itself settle a payment request.

## Verification

Database tests use a new isolated MySQL schema, `indice_card_flow_20260908_215757`, with a dedicated
test-only database user. Real provider boundaries are replaced by Stripe SDK transports/gateway
fixtures; no test card numbers or live credentials enter application persistence.

Focused backend suites cover SDK Checkout requests, stored-company portal identity, owner and demo
authorization, card priority/expiry/mode/ownership, tenant isolation, and the combined renewal →
failure → read-only → unsettled attempt → paid recovery sequence. The broader regression covers
signup/provisioning, catalog price protection, webhook processing and payment-request enforcement.

Frontend verification covers the actual management hook and portal redirect, all status/locale
combinations, response races and masked-card visibility. A headless browser renders the real
payment section in 120 combinations: eight locales × five states × widths 320, 390 and 1440.
The browser checks overflow, readable buttons, masked data, owner/delegation behavior, and that
an existing subscriber without a card opens the portal. It makes zero API requests.

Results: 242 backend tests across 28 unique classes passed, with no failures, errors or skipped
tests. Flyway applied 207 migrations to the fresh schema through V266, and migration uniqueness
passed. All 36 registered frontend billing regressions, TypeScript validation, the production
frontend build, and 120 browser combinations passed. The build retains its existing large-chunk
warning. `git diff --check` passed.

The first focused run exposed test-harness issues: the repository's Mockito maker does not support
static mocks, and the global security filter strengthens the no-store header. Checkout tests now
use an isolated Stripe SDK transport restored in `finally`; header assertions accept the stronger
header. Both were rerun successfully without changing the mocking framework or weakening headers.
The isolated schema and its dedicated user were removed after verification; local customer data
and the stopped functional backend were untouched.

## Production requirements still requiring direct verification

- Deploy/restart the approved backend and apply the existing V265/V266 migrations through the
  normal backup and rollback process. No new schema migration was introduced by this follow-up.
- Install matching Stripe account/mode credentials through protected server files. The restricted
  key needs Payment Methods read access in addition to the existing billing permissions; no new
  secret type is required.
- Configure the default Customer Portal for card updates and invoices. Keep product/quantity
  changes inside Indice. Verify the HTTPS return URL and the effective default card after a portal
  change, including subscriptions with their own payment-method override.
- Exercise the real provider flow in Stripe sandbox: trial and immediate activation, replacement,
  bank authentication, declined renewal, successful retry, and signed webhook delivery/recovery.
  Local simulated-provider tests do not certify these account settings or live payment outcomes.
- Follow `INDICE_STRIPE_LIVE_GO_LIVE_RUNBOOK.md` for LIVE activation. Confirm worker execution,
  notification delivery and webhook payload retention. Existing signed webhook payloads can
  contain masked card metadata even though no direct card-entry data is stored by Indice.

Primary provider references: [saved payment methods](https://docs.stripe.com/payments/checkout/save-during-payment),
[default payment-method priority](https://docs.stripe.com/api/subscriptions/object),
[Customer Portal configuration](https://docs.stripe.com/customer-management/configure-portal),
and [integration security](https://docs.stripe.com/security/guide).
