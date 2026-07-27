# 7. Migration roadmap

Phases ordered from lowest to highest risk. Each phase leaves the system in a deployable,
functional state — it isn't necessary to finish everything before getting value.

## Phase 0 — Prior hygiene (no SaaS yet)

Closes risks that already exist today, regardless of whether the SaaS work happens or not. Doing
this first avoids building billing on top of cross-tenant data leaks.

- Remove the `OR company_id IS NULL` fallback in
  `OrganizationService`/`HrAttendanceService` (backend, see
  [02 §2.4](02-current-state-audit.md)).
- Migrations: `units.company_id`/`businesses.company_id` to `NOT NULL`, unique
  `(user_id, company_id)` on `user_companies`, real FKs on `hr_employees.unit_id`/`business_id`
  ([03 §3.5](03-multitenant-data-model.md)).
- Unify the role vocabulary between `SessionAuthService` and `ConfigCenterService`.
- **Done criteria**: integration tests confirming a company-A user can never read/write company-B
  data, not even via rows with a null `company_id`.

## Phase 1 — `accounts` and multi-company context (no billing yet)

- Migrations `V20`-`V22`: `accounts` table, `companies.account_id` column + backfill.
- Backend: `TenantContextInterceptor`, `switch-company` endpoint, new `GET /auth/me` shape
  (`account`, `companies[]`).
- Frontend: `CurrentCompanyContext`, company/business switcher, "add another company to my
  account" flow.
- **Done criteria**: an owner can have 2 companies under the same account and switch between them
  in the UI without logging in again. Still no plan/module/seat restriction (everything stays
  open, as today).

## Phase 2 — Plan catalog and Stripe Customer signup (no enforcement yet)

- Migration `V23`: `plans`, `subscriptions`, `subscription_addons` (manually seed 2-3 plans).
- Backend: `BillingApiController` (`plans`, `checkout-session`, `subscription`), Stripe Customer
  creation on first checkout.
- Frontend: `Plan.tsx` wired to real data, working checkout button.
- **Done criteria**: a real Stripe checkout (test mode) can be completed and its state seen
  reflected in `GET /billing/subscription`. Still doesn't block anything — it's "observation
  mode" before applying restrictions to real customers.

## Phase 3 — Entitlement and seat enforcement

- Migration `V24`: `account_module_entitlements`, `company_module_settings`.
- Backend: recompute entitlements in the webhooks (`customer.subscription.*`), `@RequiresModule`
  on module controllers, invitation blocking once seats are reached
  ([04 §4.3-4.4](04-backend-architecture.md)).
- Frontend: real `locked` in the router (`ModuleLockedPage`), seat gate in `Users.tsx`.
- **Done criteria**: a company without the "Inventory" module purchased cannot navigate to
  `/inventory` (redirected) nor call its API (403). An owner at their seat limit cannot invite
  more users without upgrading.
- **Risk to watch**: this is the first phase that can *block* existing users — before activating
  it in production, run a report of "which modules each company uses today" and make sure the
  default plan assigned to them (or a grace period) covers it, to avoid breaking existing paying
  customers' access on switch-over day.

## Phase 4 — Module add-ons and Customer Portal

- Migrations `V25`-`V26`: `stripe_events`, `account_invoices` (optional).
- Backend: full `StripeWebhookController` (idempotency via `stripe_events`), add-on endpoints,
  `portal-session`.
- Frontend: real `Billing.tsx` (delegates to Stripe Portal), add-on purchase/cancellation in
  `Plan.tsx`.
- **Done criteria**: an owner can purchase an add-on module without leaving the normal flow, see
  their real invoices, and change their card without support intervening.

## Phase 5 — Hardening

- Adopt `spring-boot-starter-security` to centralize auth (optional but recommended, see
  [04 §4.7](04-backend-architecture.md#47-is-it-worth-adopting-spring-security-now)).
- Spring Session JDBC (or Redis) if the deployment moves to more than one backend instance.
- `past_due` banner across the whole shell (not just Billing) on `invoice.payment_failed`.
- Support tool for "merging accounts" (the backfill edge case mentioned in
  [03 §3.3](03-multitenant-data-model.md), owners whose companies are today separate accounts and
  want them unified).
- Review whether some form of `unit`/`business`-level role (not just `company`-level) turned out
  to be necessary in practice ([03 §3.6](03-multitenant-data-model.md)) — build only if there's
  real demand, not speculatively.

## What can be parallelized

- Phase 1 backend and frontend can move forward in parallel once the `GET /auth/me` shape is
  agreed on.
- Seeding `plans` (Phase 2) and designing prices in the Stripe Dashboard can happen while Phase 1
  is still underway — they don't depend on each other.
- The visual design of `Plan.tsx`/`Billing.tsx` (Phases 2 and 4) can start against mock data using
  the new API contract before the backend is ready, following the same contract described in
  [05](05-frontend-architecture.md) and [06](06-stripe-billing-integration.md).

## What NOT to parallelize

- Phase 3 (enforcement) shouldn't start until Phase 0 is closed — applying plan restrictions on
  top of known tenant leaks just adds urgency without solving the actual problem.
- The Stripe webhook (Phase 4) shouldn't be activated in production until Phase 2 has validated,
  in test mode, that the `stripe_price_id → plans.id` mapping is correct — a badly mapped webhook
  can leave an entire account without its modules overnight.
