# 6. Stripe integration

## 6.1 Product model in Stripe

One **Stripe Customer** per `accounts` row (`accounts.stripe_customer_id`), never per `companies`
— the owner pays once for their whole account, no matter how many companies they have (decision
already justified in
[03 §3.2](03-multitenant-data-model.md#32-design-decision-entitlements-at-the-account-level)).

For each `plans.code` (starter/growth/scale...):

- One **Stripe Product**.
- One recurring **Stripe Price** (monthly and, optionally, a discounted annual Price) for the
  base charge covering `included_seats` users — `plans.stripe_price_id`.
- One additional **Stripe Price**, either *per-unit* or *metered*, for seat overage
  (`plans.seat_overage_price_cents`) — added as a separate *subscription item* when
  `seat_quantity > included_seats`.

For each module sellable as an add-on (`modules.slug` with a tier above the contracted plan's): a
dedicated **Stripe Price**, added as an extra *subscription item* when the owner purchases it
(`subscription_addons.stripe_subscription_item_id`).

A single **Stripe Subscription** per Account, with multiple *subscription items*: plan base +
seat overage (if applicable) + N module add-ons.

## 6.2 Signup flow (checkout)

1. Owner signs up → `users` + `accounts` (owner_user_id) + a first `companies` row are created in
   the same transaction (onboarding flow, analogous to the first-run `company_business_profiles`
   flow that already exists today).
2. Frontend calls `POST /api/v1/billing/checkout-session` with the chosen `planId`.
3. Backend:
   - If `accounts.stripe_customer_id` is null, creates the Customer in Stripe first.
   - Creates a `stripe.checkout.Session` in `subscription` mode, `line_items` = [plan's base
     price], `client_reference_id = accountId`, `success_url`/`cancel_url` pointing back to
     `Plan.tsx`.
4. Frontend redirects to the session's `url` (Stripe-hosted checkout — no custom card form is
   built).
5. Stripe redirects back after payment. The actual subscription state **is not confirmed by the
   redirect** (don't trust success query params) — it's confirmed exclusively by the
   `checkout.session.completed` / `customer.subscription.created` webhook (6.4). On return, the
   frontend simply does a short poll of `GET /api/v1/billing/subscription` until it sees
   `status: active`, or shows "processing your payment...".

## 6.3 Management flow (Customer Portal)

`POST /api/v1/billing/portal-session` creates a `stripe.billingPortal.Session` for the active
account's `stripe_customer_id`, and the frontend redirects there to: change card, view invoice
history, cancel. Configure in the Stripe Dashboard which actions the portal allows (recommended:
allow payment-method change and cancellation, but **don't** let the customer freely change plans
from the portal — plan changes should go through `Plan.tsx` so seats/entitlements can be validated
against our own business rules before applying a downgrade).

## 6.4 Webhooks to handle

Single endpoint `POST /api/v1/billing/webhook`, signature-verified (`STRIPE_WEBHOOK_SECRET`),
every event is first stored in `stripe_events` (idempotent by `stripe_event_id`) and then
processed:

| Event | Action |
|---|---|
| `checkout.session.completed` | Links `stripe_customer_id`/`stripe_subscription_id` to the corresponding `accounts`/`subscriptions` row (via `client_reference_id`). |
| `customer.subscription.created` | Creates/updates a `subscriptions` row (`plan_id` resolved via `stripe_price_id`), recomputes `account_module_entitlements` (modules from the plan's tier). |
| `customer.subscription.updated` | Updates `status`, `seat_quantity`, `current_period_start/end`, `cancel_at_period_end`; if the plan changed, recomputes entitlements (add the new tier's modules, **don't** remove ones coming from an independent add-on). |
| `customer.subscription.deleted` | `status = canceled`; entitlements with `source='plan'` are disabled (`enabled=0`) once `current_period_end` arrives; `source='addon'` ones too, unless a grace period is decided. |
| `customer.subscription.trial_will_end` | (optional) triggers a "your trial ends in 3 days" notification/email. |
| `invoice.paid` | Inserts/updates a row in `account_invoices` (if the optional cache was implemented), `status='paid'`. |
| `invoice.payment_failed` | Marks `subscriptions.status='past_due'`; the frontend must show a "update your payment method" banner across the whole shell (not just in Billing) so access isn't lost silently. |
| `customer.subscription_item.created/deleted` | Syncs `subscription_addons` when modules are added/removed via `POST/DELETE /api/v1/billing/addons/*`, or if edited directly from the Stripe Dashboard (manual support). |

## 6.5 Charging for extra users (seats) — two strategies

**Strategy A — Block + manual upgrade (recommended for the MVP):**
The backend never allows going past `seat_quantity` (see
[04 §4.4](04-backend-architecture.md#44-seat-enforcement)). To increase seats, the owner goes to
`Plan.tsx` and either upgrades their plan or purchases "extra seats" as just another *add-on*
(same mechanism as a module: a `subscription_addons` row with a special `module_slug` like
`__extra_seats__`, quantity = additional seats). Simple, predictable, easy to bill and to explain
to the customer.

**Strategy B — Automatic metered overage (v2, higher complexity):**
Going over `included_seats` is allowed without blocking, and usage is reported to Stripe daily/on
invite (`stripe.subscriptionItems.createUsageRecord`) against a `metered`-type price, charging the
prorated overage on the next invoice. Better UX (never blocks the owner mid-operation), but
requires a usage-reconciliation job and more care around refunds if the owner removes users
mid-period. **Do not implement in the first phase** — leave `subscriptions.seat_quantity` designed
so migrating from A to B later doesn't require a schema break (it already allows it:
`seat_quantity` is simply "what's currently being billed").

## 6.6 Environment variables / Docker

Add to `deployment/env/.env.example` and to the `backend`/`web` variables in
`deployment/compose/docker-compose.yml`:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CHECKOUT_SUCCESS_URL=${WEB_PUBLIC_URL}/home-panel/plan?checkout=success
STRIPE_CHECKOUT_CANCEL_URL=${WEB_PUBLIC_URL}/home-panel/plan?checkout=cancel
STRIPE_PORTAL_RETURN_URL=${WEB_PUBLIC_URL}/home-panel/billing
```

For local development, use the **Stripe CLI**
(`stripe listen --forward-to localhost:8082/api/v1/billing/webhook`) to forward webhooks — no new
service is needed in `compose.yaml`, it's a developer tool, not project infrastructure.

No change to the database engine is required (still MySQL 8 in Docker); Stripe is entirely an
external service accessed via API/SDK.

## 6.7 What NOT to build

- **Don't** store raw card numbers, CVVs, or payment data in the database — Stripe
  Checkout/Portal are already PCI-compliant; rebuilding that by hand is pure risk with no
  benefit.
- **Don't** build a custom billing/tax engine — use Stripe Tax if VAT/regional taxes are needed,
  instead of computing them in the backend.
- **Don't** implement Strategy B (metered overage) in the MVP — see 6.5.
