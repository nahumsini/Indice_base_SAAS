# Public customer entry MX/CA contract v1

Status: approved product policy; entry and regional payment increment implemented locally,
provider/end-to-end certification pending, public release disabled.
Decision date: 2026-10-08. Owners: Billing (entry/account/access), Platform Leads (commercial
interest), Auth (email proof/session/credentials), Catalog (published products/prices).

This domain extension is adopted by the Frontend and Backend Operating Systems and Premium
Billing Architecture. It does not weaken the Public Release Security Gate or deployment runbook.

## Product policy

New Mexico and Canada customers submit a consented lead, verify their email and create a native
company/owner account. They start a 15-day demo of all released basic ERP products without a
card. Diagnosis is free support, not an activation gate. New demos include 10 people. Country
is explicitly selected and normalized server-side; IP, locale, UTM and plan interest are not
billing authority. Existing clients keep their contracted offer, currency, seats and policies.

The owner approved automatic charging of the chosen plan at the original demo deadline with a
valid method and separate advance payment consent. No method/paid activation means operational
block at expiry, without erasing the account or records. Trial acceptance does not authorize a
charge; recording a prospect as won does not prove payment.

Agenda (`scheduling`) and Meeting Control (`control_minutas`) are intended to become basic
products. Their separate delivery must certify functional contracts, native permissions,
released registry/capabilities and publication. This entry does not silently grant pilots,
rewrite the immutable active catalog, move their source folders or invent a paid package.

## Implemented increment and explicit limitations

Implemented: `/start`, consented lead capture, native OTP verification, native tenant/owner
provisioning, linked commercial trial, original deadline, 10-seat state and exclusive expiry.
Native trial product grants and module/tab access are reused. No Stripe customer, subscription,
price, payment or courtesy entitlement is fabricated.

The regional payment increment below adds an owned catalog draft, authenticated quotes,
separate payment receipts, hosted method collection and signed-inbox conversion handling.
It has not been certified against the real provider. Reminders, regional additional-person
blocks, regional storage billing and operator reconciliation tooling are not implemented.
Native portal/invoice recovery is reused; cancellation, failed charge and authentication
must still pass provider TEST plus real APPTEST acceptance.
The native primary Dashboard now exposes the owner-only demo deadline/countdown and plan/payment
entry. Native expired-trial recovery explains preserved data and routes to `/billing`; it does not
change the deadline, entitlement or verified-payment gate. These in-app notices are not outbound
reminders. Non-owner/delegated/historical/converted accounts keep their existing flows.
Legacy USD selection/preview/update, ordinary activation and collection activation reject
this cohort before creating a checkout. A card added elsewhere cannot lift its deadline.

`APP_BILLING_SIGNUP_PUBLIC_TRIAL_ENABLED=false` by default, additionally requiring native
provisioning and email verification enabled. Turning entry off stops new activation; it never
removes expiry protection for already-created demos. **Do not enable public commercial intake
with this partial payment implementation.** Preview/testing is not launch approval.

## Data and transaction ownership

V305 adds `billing_trial_entries`; V306 makes the active deadline explicitly non-null in its
check constraint, forward-only after isolated validation. Only hashed continuation/session/idempotency values are
stored there; contact identity stays in the owned lead and native signup intent. References
are 32 random bytes represented as 64 hexadecimal characters, retained in browser memory.
Continuation has a fixed 24-hour expiry. The native OTP owner retains its existing expiry,
attempt, cooldown and email-send limits. Verify/resend must target the stored lead's email.

Persisted entry lifecycle:

`LEAD_CAPTURED` → email proof → native intent `TRIAL_VERIFIED` → `ACTIVE`

The verified marker is not a financial state. A complete activation transaction locks the
entry, validates email/consent/password, pins the released basic access selection, creates
native company/user/membership/ownership/seat/module/tab/trial grants and binds lead + intent
+ company + immutable window. It records trial-term version `NO_CARD_15D_NO_CHARGE_V1` and
acceptance time, then updates the corresponding lead through its owner. Native welcome email
is after commit. An existing email/account race requires review; no blind account linking.
Closed leads (`WON`/`LOST`) cannot be reopened by this technical flow.

Repeated interest with the same browser/key requires the same payload and returns the same
continuation. Repeated activation returns the same company window, never another demo. Native
unique keys, entry locks and bounded conflict retries prevent duplicate mutations. Network
failure is not success. No activation is claimed when provisioning reports review/unavailable.

At `now >= trial_ends_at`, operational reads and writes are denied through native lifecycle,
module and subscription guards, independent of cron or legacy lifecycle flags. Auth and native
billing recovery remain available. V308 adds `CONVERTED`; only the trusted payment transition
below removes the new-cohort deadline guard. It does not remove ordinary paid-subscription
access, cancellation, failed-payment or lifecycle rules.

## Public endpoint inventory

Owner prefix: `/api/v1/billing/signup/trial-entry`.

| Method / suffix | Purpose | Trust boundary |
| --- | --- | --- |
| GET `/config` | Availability only; no tenant data/prices | Read-only public configuration |
| POST `/interest` | Consented commercial lead/continuation | Session CSRF, network limit, 64-hex Idempotency-Key, validation |
| POST `/email-verification/start` | Deliver native OTP to stored lead | Same protections + unexpired browser-bound entry |
| POST `/email-verification/verify` | Validate OTP | Same entry + email-bound native challenge/attempt limit |
| POST `/email-verification/resend` | Retry delivery | Same entry/email + native cooldown/send limit |
| POST `/account` | Create verified demo | Same entry + valid email proof + trial consent + native provisioning |

Every POST consumes the durable shared limit of 10 requests per network per 10 minutes, after
CSRF validation and before business execution. Rotation of browser/email does not reset it.
The controller uses the servlet's remote address, not caller-supplied forwarding headers.
Deployment must prove the trusted edge overwrites forwarding headers and the backend is not
publicly reachable; forwarded-header framework configuration alone is not sufficient evidence.

Audit preserves safe policy/action/outcome and internal binding IDs. Never log request bodies,
raw credentials, OTP, continuation/session capabilities or unnecessary contact identity.
Account authority is derived from server-owned lead/email/provisioning data. A public user
never receives platform-administrator or distributor privileges through signup.

## Regional automatic conversion owner contract

Implemented locally; provider certification and public enablement remain separate:

1. Publish/verify a versioned regional offer through Catalog's audited owner workflow. CAD for
   Canada, MXN for Mexico, server-derived totals/discounts/capacity and approved inclusion rules.
   Marketing amounts do not constitute provider price verification. Preserve historic USD
   contracts; never rewrite an existing published version or enable a fake Price ID fallback.
2. An authenticated native owner chooses a quoted plan/interval and explicitly accepts automatic
   payment terms. Persist the actor/company, immutable selected quote/catalog version, currency,
   amount/tax disclosure, original first-charge time, renewal interval and consent text/version.
   An unchecked checkbox must fail closed; contact/trial consent must not be reused.
3. Collect the method using the existing Stripe integration, without raw card data in Índice.
   Reuse the existing-company activation owner path rather than creating a second signup tenant.
   Provider billing must preserve the original absolute trial deadline, not add 15 days or round
   remaining days upward. Late setup needs a separately covered supported provider path; it may
   not shorten/extend the promised trial or trigger an undisclosed immediate charge.
4. Verify signed raw-body webhooks and deduplicate durable receipts; validate company/customer,
   subscription/intent, provider account/mode, market/currency, original cutoff and consent.
   A success URL, stored card, unbound invoice or manual lead change cannot activate paid access.
   Paid conversion must join the native entitlement/lifecycle/capacity transaction.
5. Cover cancellation, failed charge, required authentication, duplicate/out-of-order delivery,
   provider outage, original-cutoff races and reactivation after expiry. No financial failure is
   rendered as a paid account. Preserve approved existing collection rules for historical clients.

Stripe's official references support explicit agreement for future/off-session payment and a
timestamp trial end; actual compatibility must be certified with the pinned API/SDK:
[saved-method agreement](https://docs.stripe.com/payments/save-during-payment?locale=en-GB&mobile-ui=payment-element&platform=ios),
[subscription trial end](https://docs.stripe.com/api/subscriptions/create),
[hosted setup collection](https://docs.stripe.com/api/checkout/sessions/create).
This technical contract does not replace legal/tax review required by the release gate.

Mexico's separately priced implementation service is not included in the new payment consent.
Its mandatory/optional timing and collection policy remain to be decided explicitly. Canada has
no mandatory implementation or included monthly consulting under its approved acquisition offer.

### Native catalog, quote and provider sequence

- V307 adds nullable `market_code` and `included_seats` metadata. Existing global products
  stay unclassified and retain five-person USD semantics. No migration seeds or publishes prices.
- Root's CSRF-protected `POST /api/v1/platform-admin/catalog/regional-draft` invokes the
  native draft/clone/audit owner, adding missing CA/MX Controla, Escala Sales, Escala POS and
  Corporativo packages with ten people. Retries preserve operator edits. Monthly/annual
  amounts start from the approved offer table, not browser input. Synchronization and
  publication remain the existing reviewed workflow, including account/mode/price verification.
- Native recurring prices now support one currency per product with monthly and annual rates.
  Legacy public selection/price reads exclude regional products and keep USD. Regional quotes
  require published, verified CAD/MXN references and released capabilities; no USD or env fallback.
- V308 stores company/owner/intent, original cutoff, first-payment timing, versioned terms,
  quote hash, catalog/product/Price, currency, base amount, interval, ten seats and account/mode.
  Contact/trial consent is never reused. Taxes are exclusive; implementation is excluded.
- `GET /api/v1/billing/subscription/trial-payment?interval=MONTH|YEAR` returns the current
  company's owner workspace. `POST` requires native session CSRF, a 64-hex Idempotency-Key,
  exact current quote/version and explicit automatic-payment consent. Company and actor are
  server context, never request authority. Managed/distributor/platform review contexts cannot pay.
- Native existing-company activation freezes the intent and receipt transactionally, without
  creating a second tenant or granting paid access. A bounded hosted Stripe `mode=setup` session
  collects the method and billing address. Native customer binding is reused and cannot be
  overwritten by another provider customer. Browser redirects must use the exact HTTPS Stripe host.
- Signature-verified durable `checkout.session.completed` processing performs provider reads
  outside the financial transaction. Customer/method, account/mode, business country and quote
  must match. The subsequent subscription uses the original absolute `trial_end`, rounded up
  only to the next provider second (less than one second); it never adds another trial.
- First setup attempted after the cutoff cannot turn an earlier AFTER_TRIAL mandate into an
  immediate charge. An owner must review an IMMEDIATE quote and accept a separate mandate.
  The original trial remains expired. V309 records the subscription attempt before network I/O;
  uncertain retries stop after 23 hours for reconciliation, before provider key retention can expire.
- Setup/subscription/zero invoice do not convert. A full positive signed paid invoice must match
  the bound subscription/customer, account mode, CAD/MXN, frozen Price, quantity and base line,
  non-truncated lines and first-charge period/time. Out-of-band payments do not count. The native
  webhook transaction binds the paid receipt, transitions ACTIVE to CONVERTED, applies native
  activation/capacity and refreshes lifecycle/entitlements. Duplicate receipts are inert.
- Out-of-order subscription/invoice events for an unpaid regional customer remain retryable
  until their verified binding/projection exists; they are not silently processed as orphan invoices.

### Availability and explicit outstanding limits

`APP_BILLING_SIGNUP_REGIONAL_PAYMENTS_ENABLED=false` is independent of public entry and web
navigation. Owner readiness requires Stripe and its durable processor enabled plus available
verified regional offers. Public `paidActivationReady` additionally requires both markets and
both intervals available; it is availability, not legal approval or a guarantee of payment.
Turning intake/payment creation off does not cancel prior mandates, ignore signed inbox work,
remove persistent expiry or erase receipts. Cancellation belongs to native billing/Stripe controls.

Regional extra people and storage remain unavailable through the old USD add-on resolver.
Their approved block quantities/prices and further consent must be implemented before advertising
them as purchasable. This increment certifies neither reminders nor provider outage repair.
An expired/uncertain provider attempt stays blocked for reconciliation; do not reset the trial,
invent success, delete evidence, rotate an idempotency key blindly or perform a speculative charge.

Marketing uses an independent `INDICE_PUBLIC_TRIAL_ENTRY_ENABLED=false` switch. Enabled main
CTAs route MX/CA and optional plan interest to native ERP `/start`; only allowlisted anonymous
UTM values cross. No credentials/contact identity appear in URLs and no second PHP lead is sent.
Disabled navigation retains the signed legacy intake and Canadian form. The web switch must
not precede backend/catalog readiness and real-session acceptance.

## Rollout, compatibility and coordination

Keep legacy `/signup`, courtesy, manual diagnosis, signed PHP lead intake, existing sessions,
subscriptions and immutable historical prices intact. Marketing work belongs to its separate
repo; no automatic deployment of existing dirty marketing files is authorized by this increment.

Before public enablement: close regional conversion, legal/security gates, exposed-credential
rotation evidence, full CI on the exact merged SHA, other agent's basic modules, isolated Flyway
and APPTEST real-session end-to-end acceptance. Then follow `deployment/README.md`, approved
window, catalog verification, backups and production smoke/rollback checks. Neither a Git push
nor an application deployment publishes a paid catalog.

Application rollback preserves V305/V306 and captured records. After any real activation,
do not roll back to code that ignores this cohort's persistent deadline. Stop intake and use a
compatible known-good revision or forward fix; do not delete entries or repair applied checksums.
V307–V309 are also forward-only: keep receipt and attempt evidence across application rollback.
The exact rollout and remaining blockers are tracked in the
[coordination decision](decisions/2026-10-08-customer-entry-mx-ca.md).
