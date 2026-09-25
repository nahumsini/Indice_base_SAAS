# POS Square and Mercado Pago implementation report

Date: 2026-09-23. Local implementation includes terminal-payment migrations through V284;
validation is recorded below.
No deployment or live certification.

## Result

Companies can choose Square or Mercado Pago through the cash-register workspace and authorize
their own merchant. Mercado Pago Point initially targets Mexico/MXN. Server-discovered terminals
must be configured and READY before explicit assignment. One register has one provider/terminal.
Provider country and currency restrictions still apply to Square; its existing two-decimal
transport does not enable JPY payments.

The backend reserves the immutable POS draft and original shift before provider submission.
Authoritative provider evidence controls payment approval, cancellation, and refund state.
Recovery retains the original request key, blocks conflicting checkout/register/shift mutations,
and creates or reconstructs one receipt without collecting payment again. Historical approval
cannot finalize a sale without fresh authenticated approval evidence.

Mercado Pago records known pre-submission rejections durably. An explicit request-close action
either returns an existing attempt for recovery or records an immutable closure preventing a
delayed original-key submission. A generic 404 or lost response never releases a payment hold.

Production Mercado Pago charging now requires the global live release gate plus a per-company
`PILOT` or `ACTIVE` state managed by `PLATFORM_ROOT`. `DISABLED` and `SUSPENDED` block new charges;
recovery data remains available. Each new attempt requires a current provider terminal proof. The
default freshness window is 60 seconds, concurrent refresh uses a durable 90-second lease, and a
missing terminal or changed store/POS/PDV/register/version fails closed.
Dispatch repeats activation, merchant, lease, terminal-binding and proof-freshness checks immediately
before the first provider order request. Activation writes require an 8-to-500-character reason and
the current optimistic version.

Mercado Pago refund submission remains separately gated. Verified pre-cut refunds reduce the CARD
settlement through the Treasury owner while preserving gross sale history. Verified post-close
refunds now create one review adjustment. A corporate Treasury owner approves it with a reason and
posts an idempotent pending- or available-balance debit according to settlement state. Treasury
failure persists a retryable `FAILED` state; missing/conflicting links move to
`RECONCILIATION_REQUIRED`. The flow never repeats the provider refund or rewrites the closed cash
record. Payout/fee mismatches, chargebacks, and bank-side exceptions still require reconciliation.
Refund submission now uses a crash-recoverable lease, bounded same-key submission attempts, bounded
provider rechecks, requester scope, explicit rejected/not-submitted/uncertain/review/dead-letter
states, and scheduled recovery. Operator recheck uses authenticated provider evidence. A
missing-order payment older than 20 hours moves to an auditable merchant-review state; a supplied
order ID must pass the full existing ownership verifier before the hold can change.

Square now has its own independently gated refund lifecycle. It persists the exact request key,
payload, actor, scope, merchant, and environment before `POST /v2/refunds`; crash recovery reuses
that request and never substitutes a key. Only authenticated `COMPLETED` refund evidence matching
the original Square payment, location, currency, and amount reaches the shared pre-cut or post-cut
accounting owners. PENDING and unknown outcomes retain the reservation; REJECTED/FAILED remain
non-money terminal results; bounded exhaustion creates durable review work. Signed refund webhooks
only wake an existing request and cannot supply financial authority. Every POST verifies the
database-canonical stored JSON hash and its immutable key/payment/reason/money fields. When a
response is lost before its provider ID is stored, authorized recovery may retry only that exact
body/key after a company-credential payment read still matches the exact pre-request refunded
baseline. Any changed total, including an equal-amount refund, fails closed; there is no
amount/reason or `refund_ids` heuristic attachment. A lost manual-replay outcome returns to
reconciliation without an automatic POST; another explicit audited review must pass all gates.
The provider-neutral return refresh checks refund state rather than the original payment.

Square payment submission now stores the canonical provider body in the same compare-and-set that
claims the first POST. Crash recovery searches authenticated provider state first, then permits one
stale-lease winner to resend that exact body/key only inside the short configured payment timeout.
Expired attempts move to reconciliation instead of receiving a new key. Browser recovery is scoped
by a key/hash-only session record; linked receipts remain recoverable after partial/full refunds,
while refund states without a ticket keep the sale blocked.

## Security and compatibility

Protected operations retain session authentication, company/unit/business ownership, entitlement,
POS tab permissions, and browser CSRF checks. Mercado Pago tokens use company/environment/seller
bound authenticated encryption. Provider HTTP is outside short financial transactions.

The adopted Mercado Pago signature exception verifies its documented signed manifest, discards
the unsigned body, persists a deduplicated wakeup, and fetches financial evidence with the original
merchant credential. Square retains raw-body signing and also requires merchant-authenticated
checkout/payment evidence. Exact provider routes do not rely on an attached browser session.

Both OAuth callback GETs now only redirect. Credential completion is an authenticated,
actor/company-bound, single-use, CSRF-protected POST. Square's existing payment API shapes remain
compatible; its OAuth completion rollout requires matching frontend and backend artifacts. Mercado
Pago OAuth state consumption is row-locked and destructive, and a bounded scheduled cleanup uses
the indexed expiry path rather than retaining abandoned verifier ciphertext indefinitely.
Square first-connect completion is serialized on the company row; reconnect invalidates old refresh
leases/version writes and merchant replacement is blocked through unresolved and 90-day refundable
history. Credential persistence updates only the authenticated tenant/environment row; a new global
merchant collision fails closed instead of overwriting another company. Payment route tab
classification strips matrix parameters before enforcing `pos.sale`. Provider identifiers are
case-sensitive, capacity-validated, and URI-template encoded.

Existing cash, transfer, credit, discount, tax, inventory, ticket, restaurant, preticket, and
Treasury workflows retain their owner contracts and regression coverage. Affected services were
split into cohesive owners to meet the requested limit of fewer than 50 physical Java lines.

## Files changed

- Backend: `src/main/java/com/indice/erp/pos/mercadopago`, `pos/terminal`,
  `finance/terminalrefunds`, `platformadmin`, and affected Square, checkout, cash-register, shift,
  closing, settlement, restaurant, and self-service owners.
- Frontend: active POS cash-register setup and sale/recovery components, the Platform Root company
  activation control, Finance refund-adjustment queue, API services, and runtime regressions.
- Schema: forward-only `V277__pos_mercado_pago_point.sql`,
  `V278__pos_mercado_pago_live_controls.sql`, and
  `V279__pos_mercado_pago_refund_recovery.sql`, plus Square `V280` hardening and
  `V281__pos_square_refund_lifecycle.sql`, and Mercado Pago OAuth retention index
  `V282__mercado_pago_oauth_state_retention.sql`, and Square OAuth retention index
  `V283__square_oauth_state_retention_index.sql`, plus
  `V284__square_provider_identifier_capacity.sql`; no applied migration was edited.
- Configuration: disabled provider enablement/live/refund defaults, including the independent
  Square refund flag and bounded recovery settings, in application properties.
- Documentation: adopted owner contract, activation/recovery runbook, canonical security/backend
  references, repository webhook exception, and deployment/rollback guidance.

## Validation

The V277 baseline closeout on 2026-09-18 recorded a clean backend suite of 2,718 tests across 535
suites, a 329-test focused rerun, 54 Square tests, 55 POS frontend tests, TypeScript, production
frontend build, clean backend packaging, and isolated MySQL startup through V277. Its local backend
artifact SHA-256 was `78d1667650763bc36472767ee78a936cabd7fb7b346c624e0c1b52bbfad3a3ba`.
That artifact predates V278 and is not a V278 release candidate.

V278 incremental evidence on 2026-09-22 includes 20 company-activation tests, 36
terminal-verification backend tests, the 55-test POS UI suite, focused refund tests, and frontend
TypeScript validation. A disposable MySQL 8 schema applied all migrations through V278; three
startup/schema tests passed. Two real-database post-close refund tests proved single posting/replay
safety and Treasury failure rollback with a durable retryable state. Functional and production
databases were not used. All new V278 production and test Java files remained at or below 49
physical lines, and the reported focused commands had no failures.

Final local closeout on 2026-09-23 passed all 2,896 backend tests across 649 Surefire reports with
zero failures, errors, or skips. The terminal-payment-focused rerun passed 430 tests across 190
reports. Maven packaging with tests skipped after that clean suite also passed. The isolated MySQL
test schema validated Flyway through V284; functional and production databases were not used.
The packaged backend artifact SHA-256 is
`68bd846a924ff82464a54543e361ac35e074ef38aa9104873cab9a57adc880ef`.

Frontend TypeScript validation and the production build passed. Runtime/regression suites passed
88 POS tests, 48 Finance tests, 98 Platform Admin tests, and 40 localization tests. Final
`git diff --check` was clean. All changed or new production Java files and all new Java tests were
at or below 49 physical lines. No target deployment or live-provider smoke test was performed.

## Activation inputs and remaining limits

Provide application ownership (Nahum or another owner), secure provider application/webhook/token
protection secrets, exact registered HTTPS endpoints, merchant/test accounts, and Point terminal
model/firmware plus an authorized physical pilot. Do not send credentials through chat.

Finance must confirm collection destination, settlement accounts, fees/payout timing, post-close
refund posting/retry policy, and reconciliation ownership before refund activation. Real provider
captures must certify Point signature case/timestamp handling, action-required payment evidence,
cancellation, refund request format, physical device behavior, and Square same-key idempotency over
the approved retry interval because Square publishes no retention duration. These outcomes remain
UNKNOWN locally.

Mercado Pago integration, production live activation, and refunds default to false. Local tests
do not establish production readiness. Deployment, real charges/refunds, external merchant/device
changes, and production smoke checks: N/A. Follow the
[activation/recovery runbook](pos-terminal-payments-runbook.md) and
[owner contract](pos-terminal-payments-contract-v1.md) before rollout.

Pause new charges while preserving recovery for unresolved attempts. An older backend cannot
enforce Mercado Pago holds; resolve attempts before rollback to a version without this flow.
Applied migrations and financial/audit records must remain intact.
