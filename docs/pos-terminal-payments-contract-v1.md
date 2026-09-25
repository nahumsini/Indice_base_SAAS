# POS terminal payments contract v1

Status: adopted owner contract for the authorized Square/Mercado Pago implementation.
Decision date: 2026-09-18; implementation reviewed through 2026-09-23. Canonical backend and
public release standards adopt the protocol exception below. This contract does not certify a
deployed or live merchant integration.

## Ownership and boundaries

Indice owns the POS sale, authoritative totals, original shift, inventory, ticket, and the durable
attempt. Square and Mercado Pago own the terminal charge. Treasury owns account balances and
settlements. Provider acceptance of a request does not establish payment or refund completion.

Each company connects its own merchant through the existing authenticated company workspace.
Mercado Pago Point initially supports Mexico/MXN. Square continues its existing integration and
must only be activated for provider-supported seller countries/currencies. A Mexico company must
not be represented as eligible for Square merely because both connection cards exist.
The existing Square transport assumes two-decimal minor units; JPY charges fail closed until
currency-exponent support is implemented and certified. Linking a JP location does not enable JPY.

One register has one provider/terminal assignment; one terminal belongs to one company connection
and one register. Assignment is explicit and cannot silently steal a terminal from another
register. Changing providers requires resolving pending attempts and unassigning first.

All browser mutations use existing session authentication, entitlement/module enforcement,
backend tab permissions, authenticated company, unit/business ownership, and `X-CSRF-Token`.
Sale/payment reads require `pos.sale`; configuration/refund administration requires an allowed
administrative role and `pos.cortes`. Read-only setup summaries allow either tab. Cashiers see
their own attempts; administrators remain limited by company and authorized financial scope.
Historical attempt reads use the original shift scope rather than a register's later assignment.

Implementation remains Spring Boot/JdbcTemplate/Flyway and the active React POS runtime. New and
modified production Java files in this change remain below 50 physical lines; cohesive owners
replace affected large services without changing existing routes/DTO compatibility. New Java
tests follow the same cap. Existing unrelated code is outside the refactor scope.

## Company connection and terminal readiness

Mercado Pago OAuth uses PKCE S256, cryptographically generated, hashed, single-use state bound to
company and actor, a configured callback, and short expiry. Callback GET redirects to a frontend
completion flow without changing credentials. The authenticated CSRF-protected completion POST
exchanges the code and verifies merchant profile, Mexico/MLM, environment, and required scopes.
Company authorization is not proof of provider KYC approval or permission to charge a real card.

AES-GCM protects access/refresh tokens with associated data bound to company, environment, seller,
and token purpose. There is no default Mercado Pago encryption key. Secrets remain external;
production uses secret files. Rotation uses coordinated refresh leases/version checks. A lost
refresh response requires reconnecting rather than guessing the rotated credential.
Square OAuth completion serializes on the company before it reads or replaces a connection, and a
reconnect increments the token version and clears any refresh lease. A stale refresh success or
failure therefore cannot overwrite newer OAuth credentials. A different Square merchant cannot
replace the original while payments/refunds are unresolved or while an approved payment remains
inside the supported 90-day refund window.

Terminal discovery is a CSRF-protected POST; local terminal GET is read-only. Configuration claims
the terminal as CONFIGURING in a short transaction, performs the provider PDV update outside the
transaction, and verifies PDV before READY. A configuring or unready terminal cannot be charged.

Production charge admission has two independent controls. The deployment-wide
`APP_POS_MERCADO_PAGO_LIVE_ACTIVATION_APPROVED` gate must be true, and the production connection
for that company must be in `PILOT` or `ACTIVE`. `DISABLED` is the default; `SUSPENDED` pauses new
charges while preserving the connection and historical recovery data. Only `PLATFORM_ROOT` may
read or change the company state through
`/api/v1/platform-admin/companies/{companyId}/mercado-pago/activation`; mutations require CSRF,
an 8-to-500-character reason, the current `expectedVersion`, and create a platform audit event.
Stale versions fail with conflict instead of overwriting a newer suspension. Moving to `PILOT` or
`ACTIVE` requires the original connected production merchant with verified MX/MLM identity and
live mode. `PILOT` and `ACTIVE` currently have the same technical charge-admission behavior; the
different state records the operator's rollout stage rather than enforcing a smaller cohort inside
one company. Sandbox charge admission remains independent of this production release gate.

Every new payment reservation requires a provider-backed terminal proof. A previous proof may be
used only within `APP_POS_MERCADO_PAGO_TERMINAL_VERIFICATION_MAX_AGE_SECONDS` (60 seconds by
default, configurable from 10 to 3,600 seconds). Otherwise one worker claims a durable 90-second
verification lease, reads the merchant's current terminal feed, and atomically updates the complete
feed. A missing terminal becomes `UNAVAILABLE`; provider failure leaves the terminal unavailable or
stale and payment admission fails closed. Readiness requires the same company connection, terminal,
register assignment, version, store, POS and PDV operating mode before and again under the payment
reservation lock. A binding or version change invalidates the proof and requires a retry.
After token/profile validation and immediately before the first order POST, dispatch rechecks its
lease, company activation, original merchant identity, terminal binding and current proof freshness.

## Submission and recovery

Under the company/register lock, the backend locates the original key or unresolved register
attempt, validates matching payload identity, assignment, original open shift, products, orders,
customer, discounts, tax, total, and full-card MXN eligibility. It persists the immutable checkout
snapshot, actor/scope, merchant/environment, terminal, provider request, reference, and request key
before HTTP submission. Money uses BigDecimal and explicit two-decimal MXN validation.

Mercado Pago admission arbitration uses a durable company/request-key row, serialized with the
register reservation even when a key is submitted against another register. Known configuration
or pure preflight rejection commits an immutable REJECTED decision before the response says
PAYMENT_NOT_SUBMITTED. Unknown exceptions and intent/provider submission failures remain unknown.
Terminal preflight reads existing settlement policy and eligible accounts without provisioning
Treasury or compatibility rules. Normal checkout keeps its established provisioning behavior.

An explicit CSRF-protected request-close action may record REQUEST_CLOSED only when a locked
tenant/key check proves no intent exists. The immutable decision prevents a late original-key
submission from charging. Existing or scope-hidden intents cannot be closed by inferring absence;
they retain provider recovery. A generic GET 404 remains insufficient evidence to clear a hold.

The provider request uses the persisted body and original idempotency key. A lost response remains
UNCERTAIN; elapsed time, a local timeout, missing ID, or a GET-by-request 404 cannot establish that
the provider did not charge. Never create a replacement key to recover an unresolved attempt.
Mercado Pago's missing-ID replay is bounded conservatively to 20 hours; later recovery needs
merchant review. The attempt then enters `RECONCILIATION_REQUIRED` and continues to hold the
register. An authorized, CSRF-protected review may supply a provider order ID, but the backend must
fetch that order with the original merchant credential and verify full ownership before changing
financial state. There is no blind mark-success or manual release. A documentation example about
24-hour conflicts is not an indefinite dedupe guarantee. Square recovery first performs an
authenticated merchant checkout search. When that search finds no match, only one worker that wins
the stale 90-second compare-and-set lease may replay the exact body and idempotency key persisted
before the first POST. Automatic replay is limited to the configured payment timeout, clamped from
90 to 3,600 seconds; expiry moves the attempt to manual reconciliation. Recovery never generates a
replacement key or body. Square documents same-key idempotent retries but does not publish a
retention duration, so provider certification must validate the chosen timeout before activation.

The frontend retains only the request key, intent ID, and a hashed draft identity in session
storage scoped by company/register/shift. It keeps all tenders blocked while delivery is unknown.
Receipt recovery consumes the verified result once and preserves a different current cart. A
linked receipt remains recoverable after a later partial or full refund and releases the browser
hold after receipt consumption; a partial refund without a ticket remains blocking.

Authoritative Mercado Pago order GET must match seller, environment, Point type, MX country,
external reference, terminal, known order/payment IDs, and the original single-payment amount.
Approval requires processed/accredited payment evidence, exact paid amount, zero tips, and no
unresolved refund evidence. The `action_required/check_on_terminal` fallback uses authenticated
Payment GET with numeric reference, seller, exact MXN amount, accredited status, explicit zero
refunded amount, and explicit live/test evidence. Missing evidence leaves recovery blocked.

Square completed checkout requires merchant-authenticated checkout/payment evidence matching
the original amount/currency, terminal/reference, location, and payment association. Notification
financial fields do not authorize finalization.

Finalization locks the register and original attempt, verifies the original open shift and frozen
sale, and invokes the POS owner's checkout contract. Ticket, inventory, source orders, payment,
and attempt link commit together. Approved payment remains approved if sale completion fails;
recovery may complete that sale but cannot charge again. An existing link reconstructs the
persisted receipt, rather than substituting whichever cart happens to be open.
Finalization requires this recovery's fresh APPROVED evidence; retaining a historical local
approval through an uncertain provider response never establishes fresh approval.

WAITING, UNCERTAIN, RECONCILIATION_REQUIRED, APPROVED without ticket, and PARTIALLY_REFUNDED without
ticket block unrelated checkout, shift closing, provider reassignment, and register changes.
DECLINED, CANCELLED, and EXPIRED permit a new attempt only after authoritative confirmation. A
fully verified refund with no ticket establishes zero net payment and releases the attempt;
partial/unconfirmed refunds do not. APPROVED must not be downgraded by transient failures or old
notifications.

## Adopted Mercado Pago webhook exception

Mercado Pago Point documents an HMAC-SHA256 signature over a manifest composed from query
`data.id`, header `x-request-id`, and the `ts` value from `x-signature`:

```text
id:{data.id};request-id:{x-request-id};ts:{ts};
```

The raw JSON body is not covered by that signature. Therefore Mercado Pago Point is an explicit,
narrow replacement for the repository raw-body webhook rule for this provider alone:

1. Use the configured secret, exact documented identifiers, constant-time comparison, bounded
   identifiers/body, timestamp freshness, and a bounded peer rate limit.
2. Discard the unsigned body; do not persist payment/card details or trust its status/company.
3. Persist/deduplicate the verified wakeup before acknowledging. The durable inbox, retry state,
   leases, and dead-letter record remain auditable.
4. Locate an existing company intent by its unique environment/provider order ID. Do not infer a
   company from unsigned body fields. An event arriving before order linking retries later.
5. Fetch order/payment state with the original company merchant credential and independently
   validate ownership and amounts before a financial mutation.

Only POST to the exact Mercado Pago/Square webhook routes and GET to their exact OAuth callback
routes are sessionless provider routes. An unrelated attached browser session cannot replace or
prevent provider verification. Other endpoints retain normal session security. Callback GET has
no durable credential mutation. Stripe and Square retain their raw-body signature requirements.

The Point implementation preserves order ID case and accepts 10-digit seconds/13-digit
milliseconds timestamps for freshness while signing the original `ts` text. Official examples
and other product SDKs differ. Authentic sanitized Point captures must certify this contract
before live activation; no silent fallback weakens signature verification.

## Refunds and accounting

Refund submission is separately gated and requires current authoritative verification, original
merchant/environment, allowed administrative scope, supported card evidence, a stable refund key,
positive two-decimal amount within confirmed remaining balance, and the supported 90-day window.
Same-key claims and a unique unresolved request prevent duplicate/concurrent over-reservation.
Uncertain requests remain unresolved; do not silently issue a new refund key.

Refund requests persist the requesting actor/scope, database-canonical immutable provider JSON,
its SHA-256, submission and recovery attempts, next-attempt time, safe error code,
provider-check time, and a durable 90-second work lease. Before every provider POST, the backend
recomputes that hash and verifies the stored key, payment, reason, amount, and currency. An expired
`SUBMITTING` lease may replay only that verified original body and key. Deterministic
provider rejection becomes `REJECTED`; proven local pre-submission failure becomes
`NOT_SUBMITTED`; ambiguous transport/provider outcomes remain `UNCERTAIN`. Bounded exhaustion
becomes `RECONCILIATION_REQUIRED` or `DEAD_LETTER`, both of which continue to reserve the original
intent. For a request with a known provider ID, an authorized recheck performs authenticated
provider reads and never sends another refund. The missing-ID exception below remains bounded.

Square refund submission uses only `POST /v2/refunds` with the persisted key/body. Recovery and
signed refund notifications use only an authenticated `GET /v2/refunds/{id}` for an existing local
request; notification financial fields are never authority. Only Square `COMPLETED` evidence that
matches the original merchant payment, location, currency, and exact refund amount can create a
reversal. `PENDING` remains unresolved; authenticated `REJECTED` or `FAILED` is terminal without a
money mutation and permits a reviewed new request. Evidence mismatch enters reconciliation.
A first-attempt payment mismatch before HTTP delivery is auditable `NOT_SUBMITTED`. If a crashed
worker leaves delivery uncertain without a provider refund ID, there is no heuristic attachment by
amount, reason, or the payment's `refund_ids`. An optimistic, authorized review may retry only the
exact stored body and idempotency key after the stored-request checks above and an authenticated
payment read match the original ID, completed status, location, amount, currency, and exact
pre-request refunded-money baseline. Square's Payment object does not supply merchant identity;
merchant authority comes from the company-scoped credential plus the persisted merchant guard.
Any changed refunded total, including baseline plus the requested amount, is ambiguous and blocks
the POST for manual reconciliation. This prevents a separate equal-amount refund from being used as
proof that the local request succeeded.

The manual claim requires an administrator with `pos.cortes`, CSRF, an 8-to-500-character reason,
the current optimistic version, and a free 90-second lease. It is audited and cannot create or edit
a key/body. If its response is lost, scheduled recovery returns the request to reconciliation and
does not POST it automatically. A later explicit review may make the same exact-key attempt only if
all immutable and exact-baseline checks still pass. This relies on Square's documented same-key
idempotency, whose retention duration is not published; live certification must establish the
operational retry window before refunds are enabled.

Only processed refunds with unique REF identifiers bound to the original PAY transaction count
as verified money. Provider response acceptance or a refunded order with processing refund rows
does not establish reversal completion. Verified state, immutable reversal evidence, confirmation,
and audit apply in one short transaction, serialized against register/original-shift closing.

For a completed ticket before cut, captured card gross remains historical sales evidence, while
the CARD amount transferred by the existing Treasury owner is gross minus verified refunds.
Refunds without a ticket do not reduce another sale. Refunds cannot exceed the original captured
amount or mix company/shift/currency/scope.

After cut, verified provider evidence preserves the closed sale and cash closing and creates one
tenant-scoped refund adjustment. It starts in `PENDING_REVIEW` only when the original captured CARD
payment, cash closing, CARD settlement and destination account agree; missing or conflicting links
start in `RECONCILIATION_REQUIRED`. A corporate Treasury owner must approve the adjustment with an
8-to-500-character reason before posting it. Optimistic versions and immutable events record each
transition.

Posting uses the existing Treasury owner with the unique key `POS_REFUND_ADJUSTMENT:{adjustmentId}`.
It locks and reloads the tenant settlement before choosing the balance and checking all previously
posted pending adjustments. For a still-pending settlement it debits pending funds and reduces the
amount expected when that settlement is confirmed. For a `SETTLED` or
`RECONCILIATION_REQUIRED` settlement it debits available funds. A Treasury failure rolls back the
movement, persists `FAILED`, and permits a retry against the same adjustment and current version;
replay of `POSTED` does not create another movement. Missing links, invalid settlement state, or
insufficient pending amount transition to `RECONCILIATION_REQUIRED` rather than guessing an account.

This local accounting action never sends another provider refund: the provider refund was already
verified before admission. It does not rewrite the original ticket, captured payment, sale totals,
shift, or cash closing. Fees, payout mismatches, chargebacks, bank-side exceptions, and late external
refunds still require Finance reconciliation. The refund flag remains false until the responsible
owners approve and certify these procedures. No POS code writes Treasury balance columns directly.

## Release evidence

Follow [the terminal runbook](pos-terminal-payments-runbook.md), the canonical public security
gate, and deployment/rollback instructions. Unit/UI tests and isolated-database Flyway startup are
implementation evidence; they do not replace real merchant/terminal certification. Live activation
and refund flags default false, independently of whether company OAuth has been completed. V278 is
forward-only and adds company activation history, terminal verification/lease data, and immutable
post-close refund adjustments/events. V279 adds refund recovery leases/states, actor attribution,
and the payment merchant-review state. Do not edit or reverse either migration after application.
V280 adds Square activation, OAuth hardening, payment recovery metadata, and provider evidence
constraints. V281 adds Square refund requests/audit, provider-specific Square links on shared
reversal and adjustment records, and crash-safe Square refund recovery. V282 adds the Mercado Pago
OAuth-state expiry index used by bounded deletion of expired single-use states. V283 adds the
equivalent Square OAuth-state expiry index. V284 widens persisted Square opaque identifiers to
their supported capacities and makes them binary-collated/case-sensitive; provider IDs are also
validated before storage and URI-template encoded before transport. The independent
`app.pos.square.refunds.enabled` flag defaults false; bounded submission/recovery settings do not
weaken the unresolved-request hold when attempts are exhausted.

Primary provider contracts: [Point orders](https://www.mercadopago.com.mx/developers/en/reference/in-person-payments/point/orders/create-order/post),
[Point notifications](https://www.mercadopago.com.mx/developers/en/docs/mp-point/notifications),
[Point refunds](https://www.mercadopago.com.mx/developers/en/reference/in-person-payments/point/orders/refund-order/post),
[Square payment evidence](https://developer.squareup.com/reference/square/payments/get-payment),
[Square refund retrieval](https://developer.squareup.com/docs/refunds-api/retrieve-refunds),
[Square idempotency](https://developer.squareup.com/docs/build-basics/common-api-patterns/idempotency),
and [Square international availability](https://developer.squareup.com/docs/international-development).
