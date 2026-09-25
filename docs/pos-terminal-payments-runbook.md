# POS terminal payment activation and recovery

Status: implementation runbook; live certification is pending. No real payment, deployment,
merchant change, or physical-terminal test is authorized by a local code/test run.

## Operator inputs

Provide through secure configuration, never chat or committed files:

- Mercado Pago application ID and application-secret file, webhook-secret file, and a strong
  token-protection-secret file; named owner of the developer application (confirm Nahum or other).
- Registered HTTPS OAuth callback and notification endpoint for this deployment.
- If activating Square, its application credentials, exact registered callback/webhook URLs,
  supported merchant/location, and a dedicated strong `APP_POS_SQUARE_TOKEN_PROTECTION_SECRET`.
  The existing local development fallback is not acceptable for production. Preserve the key
  protecting existing credentials; use an approved rotation procedure when changing it.
- Mexico merchant/test accounts with verified profile/environment and appropriate OAuth scopes.
- Point terminal model/firmware and server-discovered terminal/store/POS identifiers. Confirm an
  authorized physical device pilot and whether the terminal supports the documented PDV flow.
- Finance-approved collection destination: Mercado Pago balance or bank receiving later payouts;
  settlement accounts, fees, payout timing, post-close refund/reversal policy, and reconciliation
  owner. Record that approval before enabling refunds; code completion does not provide it.

## Disabled defaults and rollout

`APP_POS_MERCADO_PAGO_ENABLED=false`, environment `sandbox`,
`APP_POS_MERCADO_PAGO_LIVE_ACTIVATION_APPROVED=false`, and
`APP_POS_MERCADO_PAGO_REFUNDS_ENABLED=false` are independent defaults.
Square refunds independently default to `APP_POS_SQUARE_REFUNDS_ENABLED=false`. Their bounded
workers use `APP_POS_SQUARE_REFUND_SUBMISSION_MAX_ATTEMPTS` (3),
`APP_POS_SQUARE_REFUND_RECOVERY_MAX_ATTEMPTS` (20), and
`APP_POS_SQUARE_REFUND_RECOVERY_DELAY_SECONDS` (300). The scheduler polls on
`APP_POS_SQUARE_REFUND_RECOVERY_JOB_DELAY_MS` (30,000); exhaustion creates retained review work
and never releases an unresolved request.
Square payment crash replay uses `APP_POS_SQUARE_PAYMENT_TIMEOUT_SECONDS` (300 by default, clamped
to 90 through 3,600 seconds). Within that window, an authenticated checkout search must run first;
one stale-lease winner may then resend only the exact body and key stored before the original POST.
After the window, the attempt remains held for manual reconciliation.
Configuration is mapped in application.properties. Production application/webhook/encryption
secrets use mounted secret files; there is no built-in Mercado Pago token encryption key.
Use `APP_POS_MERCADO_PAGO_REDIRECT_URL` to register the exact HTTPS callback. Terminal verification
expires after `APP_POS_MERCADO_PAGO_TERMINAL_VERIFICATION_MAX_AGE_SECONDS` (60 by default; accepted
range 10 to 3,600); do not increase it without physical-terminal evidence and a reviewed reason.

1. Run focused POS/provider/security tests, frontend POS runtime regressions, TypeScript/build,
   migration uniqueness, and full Spring/Flyway startup against an isolated test database.
2. Follow deployment/README.md for clean packaging, target configuration, health checks, backup,
   compatible rollback, and the canonical public release security gate. Never point test execution
   at functional or production schemas. V277 through V284 are forward-only after application.
3. Enable only sandbox integration with external test credentials. Company administration opens
   POS cash registers, chooses Connect Mercado Pago, authorizes its own merchant, syncs terminals,
   configures PDV, and explicitly assigns a READY terminal to a register. Square remains available
   only for supported merchant countries and uses its existing setup flow.
   JPY payments remain blocked until the Square amount encoder supports currency exponents.
   Do not change a provider environment or replace a merchant while unresolved financial attempts
   exist. Same-merchant credential refresh remains allowed; Square rejects pending replacement.
4. Certify provider behavior below using sanitized evidence and an authorized physical-terminal
   pilot. Do not pass UNKNOWN results or virtual-terminal success as physical certification.
5. Only after approval, set production configuration and set the global live gate true. A
   `PLATFORM_ROOT` then opens the target company account and moves its production Mercado Pago
   connection from `DISABLED` to `PILOT`. Confirm the returned `liveChargeAllowed=true`; use
   `ACTIVE` only after the pilot evidence is accepted. `PILOT` and `ACTIVE` both permit charges;
   the state labels the audited rollout stage and does not impose an internal pilot cohort.
   `SUSPENDED` pauses new charges without deleting credentials or stopping recovery. The route is
   `GET/PUT /api/v1/platform-admin/companies/{companyId}/mercado-pago/activation`; PUT requires the
   session CSRF token and a state/reason body. Refunds remain independently disabled until Finance
   procedures pass.
6. When Finance approves refunds, enable the global refund flag and certify both pre-cut settlement
   and the post-close adjustment queue. A corporate Treasury owner reviews the queue in Finance,
   supplies an approval reason of 8 to 500 characters, and posts the same adjustment. Posting never
   repeats the provider refund. The owner API is
   `GET /api/v1/finance/terminal-refund-adjustments` with optional `state`, plus CSRF-protected
   `POST /{id}/approve` and `POST /{id}/post` actions using the current optimistic version.
   Enable each provider's refund flag separately. Square must pass authenticated completed-refund
   certification before setting `APP_POS_SQUARE_REFUNDS_ENABLED=true`.

## Required provider certification

Record PASS/FAIL/UNKNOWN, environment, terminal model/firmware, timestamps, provider reference,
Indice attempt/ticket identifiers, expected/observed outcome, and reviewer. Exclude tokens,
signatures, full URLs, card data, raw provider bodies, and unnecessary customer details.

| Scenario | Required evidence |
| --- | --- |
| OAuth isolation/rotation | Correct company/actor, wrong state/actor/replay denied, live/test identity, concurrent first-connect serialization, rotated refresh, stale refresh rejection, and reconnect on lost refresh response |
| Terminal readiness | Discovered owned terminal; PDV confirmed; fresh proof within the configured age; stale, missing and provider-unavailable states fail closed; concurrent verification uses one lease; store/POS/mode/register/version changes invalidate the proof |
| Company live activation | Global gate plus the selected company's PILOT/ACTIVE state; Platform Root and CSRF enforcement; wrong merchant/environment denied; DISABLED/SUSPENDED block new charges while recovery remains available |
| Approved sale | Exact server total/currency/merchant/terminal; one charge, one ticket, correct inventory/source-order/Treasury behavior |
| Decline/cancel/expiry | Authenticated provider evidence; no local timeout assumption; no blind new-key retry |
| Lost create response | Exact original key/body recovery; provider-owned matching order; no duplicate charge; late unknown-ID requires merchant review |
| Receipt recovery | Approved payment remains paid after inventory/receipt fault; recovery creates/reconstructs one receipt on the original shift |
| Webhook protocol | Authentic Point case/timestamp signing manifest; invalid/replayed/out-of-order/body-substituted events; durable acknowledgement and retry/dead letter |
| Attached browser session | Webhook remains signature protected with no session or an unrelated expired/delegated/billing-locked cookie |
| action_required | Numeric reference and authenticated payment seller/status/refund/live-mode proof; missing fields remain blocked |
| Cancellation conflicts | Created-order baseline and device cancellation; resolve API/documentation differences before broadening cancelable states |
| Full/partial refunds | Empty JSON versus literal empty request compatibility; processed REF/PAY evidence; concurrent/same-key retries; full/partial tips/card/90-day behavior |
| Cut/refund race | Verified pre-cut net CARD amount once; post-close evidence creates one review item; owner approval/reason; pending or available Treasury debit; settlement confirmation subtracts posted pending adjustments; retry/replay creates no duplicate movement |
| Square regression | Existing request/response/routes, merchant-authenticated checkout/payment evidence, lost-ID recovery, notification replay |
| Square refunds | Canonical stored JSON/hash and immutable-field checks; exact same-key POST retry only at the exact pre-request refunded baseline; changed/equal-amount external refund fails closed; authenticated refund GET; PENDING/REJECTED/FAILED handling; unknown notification ignored; bounded recovery and post-cut accounting |

## Recovery procedures

- For WAITING/UNCERTAIN, keep the original attempt/key and use the POS recovery action. Inspect the
  original merchant dashboard/terminal if the provider order ID is absent or replay window passed.
  Never clear a hold based on a 404, local timer, socket failure, or an operator's guess.
  If no submission can be found, use the explicit request-close action: it either returns the
  existing intent or commits a closure that prevents late submission under the original key.
- For a Square payment with a lost create response, use the request-key recovery action. The backend
  searches authenticated provider state before a single stale-lease exact-body/key replay inside
  the configured short window. Do not widen that window without provider certification; after
  expiry, reconcile the retained attempt manually.
- For a Square refund in `RECONCILIATION_REQUIRED` or `DEAD_LETTER` without a provider refund ID,
  use the authorized recheck with the current version and an 8-to-500-character audit reason. The
  backend verifies the database-canonical stored JSON/hash and immutable request fields, uses the
  company-scoped merchant credential, and reads the original payment. It retries the exact stored
  body/key only when payment ID, completed status, location, amount, currency, and refunded money
  still match the exact pre-request baseline. Any changed total, including exactly one requested
  amount, is ambiguous because it may be an external refund and must remain in reconciliation.
  There is no `refund_ids` amount/reason discovery or heuristic attachment. If the response is lost,
  the worker returns it to reconciliation and never posts automatically; another explicit audited
  review may retry the same body/key only if every gate still passes. Never enter, edit, or generate
  a replacement key/body. Square idempotency retention is unpublished and must be certified before
  enabling production refunds.
- For APPROVED without ticket, recover sale completion on the original open shift. Investigate
  the recorded failure (stock/source order/scope); do not collect payment again or move registers.
- For partial or processing refunds, retain the attempt and reconcile verified provider evidence.
  A fully confirmed refund without ticket releases the sale attempt without altering another cart.
- For a post-close `PENDING_REVIEW` adjustment, Finance verifies the ticket, captured CARD payment,
  provider refund, closing, settlement, destination account and amount. A corporate Treasury owner
  records the approval reason, then posts it. A pending settlement receives a pending-balance debit;
  a settled/reconciliation-required settlement receives an available-balance debit.
- For `FAILED`, correct the reported Treasury/account condition, reload the current version and post
  the same adjustment again. Never issue another provider refund. For `RECONCILIATION_REQUIRED`,
  resolve missing/mismatched links, settlement-state exceptions, insufficient pending amount,
  fees/payouts, chargebacks or bank-side differences under the Finance owner procedure.
- For connection refresh uncertainty, reconnect the original merchant/environment securely. Do
  not substitute a different merchant to recover a historical attempt.

## Monitoring and rollback

Review pending/uncertain attempts, approved-without-ticket age, durable inbox FAILED/DEAD_LETTER,
expired credential and terminal-verification leases, stale/unavailable assigned terminals,
per-company live activation changes, unresolved refund requests, and refund adjustments in
`PENDING_REVIEW`, `FAILED`, or `RECONCILIATION_REQUIRED`. Safe audit identifiers are company,
intent, adjustment, event code/status, original shift and ticket. Do not paste raw credentials,
signatures, provider responses, or card evidence into support logs.

The signed wakeup inbox is retried with bounded backoff and dead-letter retention. Independently
scheduled merchant-authenticated reconciliation covers missing notifications for known attempts.
Order visibility and provider idempotency windows are finite; escalate stale missing-ID attempts.

When pausing rollout, disable new-charge live activation first and keep required configured
recovery/webhook processing available for existing financial attempts. Disabling the whole
integration stops scheduled recovery, so resolve outstanding financial attempts before doing so.
Never drop payment/refund/audit tables or roll back applied V277/V278/V279/V280/V281/V282/V283/V284
migrations. Preserve the previous compatible artifact/configuration under deployment/README.md.
The backend from before Mercado Pago cannot enforce its unresolved-attempt guards. Do not roll
back to that backend while Mercado Pago financial attempts remain unresolved; pause new charges,
retain recovery, and resolve the attempts first. Deploy matching frontend/backend artifacts for
the nonmutating Square OAuth callback and protected completion flow.
