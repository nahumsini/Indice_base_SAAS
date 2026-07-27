# 4. Backend architecture (Spring Boot)

Base: `src/main/java/com/indice/erp`. Everything described here is additive on top of the current
pattern (`JdbcTemplate` + `HttpSession`) — **migrating to JPA/Hibernate is not recommended** just
for this; the risk/effort of rewriting every existing service isn't justified by the actual problem
(lack of centralized tenant context and plan enforcement), which is solved with targeted pieces.

## 4.1 Per-request tenant context

Today there's no global filter/interceptor at all (confirmed by grep: zero
`@ControllerAdvice`, `OncePerRequestFilter`, `HandlerInterceptor` in the whole tree). Every
controller calls `sessionAuthService.currentUser(session)` by hand.

**Proposal**: a `HandlerInterceptor` (`TenantContextInterceptor`) that runs before every
`/api/v1/**` controller (except public routes: login, health, public kiosk, Stripe webhook):

1. Reads the session, resolves `userId`.
2. Resolves the **active** `companyId` (see 4.2 — no longer fixed for the session's lifetime, it
   changes with "switch company").
3. Resolves `accountId` = that company's `companies.account_id`.
4. Populates a `TenantContext` (an `@RequestScope` bean, or a `ThreadLocal` cleared in a `finally`
   inside the interceptor itself) with `{ userId, companyId, accountId, role }`.
5. If there's no valid session → uniform 401 (replaces the 90+ repeated manual checks today).

Existing services **don't change their signature** immediately (they keep receiving `companyId`
as an explicit parameter, same as today) — the interceptor only centralizes the *resolution* and
the 401, so a new endpoint can't "forget" the check. Migrating services one by one to read from
`TenantContext` instead of receiving `companyId` as a parameter is a later cleanup, not a blocker.

## 4.2 Switching the active company without re-login

Change to `SessionAuthService`:

- `authenticateAndStoreSession` stops doing `ORDER BY ... LIMIT 1`. It only stores
  `SESSION_USER_ID`. The active `companyId` is stored separately in
  `SESSION_ACTIVE_COMPANY_ID`, initialized to the user's first company (same role-priority
  criterion as today, but now it's only the *default*, not the only possible value).
- New endpoint `POST /api/v1/auth/switch-company` with body `{ companyId }`:
  1. Verifies a row exists in `user_companies` for `(userId, companyId)` with `status='active'`.
  2. If so, updates `SESSION_ACTIVE_COMPANY_ID` in the session.
  3. Responds with the same shape as `GET /api/v1/auth/me`, already reflecting the new active
     company.
- `GET /api/v1/auth/me` changes shape: besides `user` and `company` (the active one, to not break
  existing consumers at once), it adds `account: { id, name }` and
  `companies: [{ id, name, role, status }]` — the full list of companies the user has access to,
  so the frontend can render the switcher without a separate call.

This closes the gap identified in the audit (2.3): `user_companies` already allows multiple
memberships today, but nothing in the app exposed that.

## 4.3 Per-module entitlement enforcement

Today `/api/v1/modules` ignores `companyId` in its query (`OrganizationService.listModules`,
`dashboard/OrganizationService.java:36-66`) and no other endpoint validates whether the
company/account is entitled to the module it's calling — today **any authenticated user can hit
any module's API**, regardless of plan.

**Two enforcement layers:**

1. **Listing (`GET /api/v1/modules`)**: switches to joining against
   `account_module_entitlements` + `company_module_settings` (exact rule in
   [03-multitenant-data-model.md §3.3](03-multitenant-data-model.md)) and marking each module with
   a real `locked: true/false`, instead of always `false`.
2. **Access to each module's API**: a method annotation `@RequiresModule("human_resources")` +
   a `HandlerInterceptor`/aspect that, using `TenantContext` (4.1), verifies the entitlement
   before executing the controller. If not entitled → `403` with a payload the frontend can use to
   show "this module isn't in your plan" instead of a generic error.

This closes the biggest gap identified in the audit: today a module's `tier` is decorative. With
this it becomes real.

## 4.4 Seat enforcement

Before creating a new `user_companies` row (invitation acceptance, or a direct user addition from
Config Center), the backend must:

1. Compute the seats used by the corresponding `account_id` (query in
   [03 §3.4](03-multitenant-data-model.md#34-seat-calculation-no-new-table)).
2. Compare it against `subscriptions.seat_quantity`.
3. If the limit was already reached:
   - **Recommended MVP**: block with `409` + message "user limit reached", the frontend offers a
     plan upgrade or an extra-seat purchase (redirects to Stripe Checkout, see 06).
   - **V2** (optional, more implementation friction): allow the addition and report the overage
     to Stripe as *metered usage* for the current period, charging it prorated on the next
     invoice. Documented in [06-stripe-billing-integration.md](06-stripe-billing-integration.md)
     as an alternative, not part of the MVP.

## 4.5 Stripe integration — backend pieces

New dependency: `stripe-java` in `pom.xml`. New package `com.indice.erp.billing`:

- `BillingApiController` (`/api/v1/billing/**`):
  - `GET /plans` — public list of active plans (to render `Plan.tsx`).
  - `GET /subscription` — current status of the active account (plan, seats used/included,
    entitled modules, next billing date, `cancel_at_period_end`).
  - `POST /checkout-session` — creates a `stripe.checkout.Session` (mode `subscription`) for
    signup/plan change, returns a `url` to redirect to. Includes
    `client_reference_id = accountId`.
  - `POST /portal-session` — creates a `stripe.billingPortal.Session` so the owner can manage
    their card, view invoices, cancel — delegates all payment UI to Stripe (avoids handling cards
    in our own database and PCI scope).
  - `POST /addons/{moduleSlug}` — adds an add-on module to the active subscription
    (`stripe.subscriptionItems.create`).
  - `DELETE /addons/{moduleSlug}` — cancels an add-on.
- `StripeWebhookController` (`POST /api/v1/billing/webhook`, **without a session, outside the
  `TenantContextInterceptor`**, validates the `Stripe-Signature` header against
  `STRIPE_WEBHOOK_SECRET` over the *raw body* — Spring must expose the raw body for this
  endpoint, not the default deserialized `@RequestBody`).
- `BillingService` — business logic: create/update `subscriptions`, recompute
  `account_module_entitlements` whenever the plan or add-ons change, and log every incoming event
  into `stripe_events` **before** processing it, checking `stripe_event_id` for idempotency
  (Stripe can retry the same webhook).

Details on which events to handle and the Stripe→schema mapping are in
[06-stripe-billing-integration.md](06-stripe-billing-integration.md).

## 4.6 Session scalability

Tomcat's in-memory session is acceptable for a single backend instance. If the SaaS deployment
needs to run more than one instance (needed for real availability of a paid product), the session
must move to a shared store. Options:

- **Spring Session JDBC** on top of the same MySQL (`spring-session-jdbc`) — low-effort change,
  no new infrastructure in Docker.
- **Spring Session Data Redis** — requires adding a `redis` service to `docker-compose.yml`,
  faster session reads under high concurrency.

**Recommendation**: start with Spring Session JDBC (zero new infrastructure) and move to Redis
only if session volume justifies it. See the corresponding phase in
[07-migration-roadmap.md](07-migration-roadmap.md).

## 4.7 Is it worth adopting Spring Security now?

The system works fine without it today, but multi-tenant SaaS **increases the auth surface**
(company switching, entitlements, public webhooks that must *not* go through session auth, public
kiosk routes that must remain public). Recommendation: introduce
`spring-boot-starter-security` with a minimal `SecurityFilterChain` that:

- Wraps the current custom session in a purpose-built `AuthenticationFilter` (not forcing an
  immediate migration to `UserDetailsService`/OAuth — that would be a much larger rewrite with no
  immediate benefit).
- Explicitly declares public routes (`/api/v1/auth/login`, `/api/v1/health`,
  `/api/v1/billing/webhook`, `/kiosk/**`) vs. protected ones in a single place instead of 90+
  manual checks.
- Leaves `@RequiresModule` (4.3) as a `@PreAuthorize`-friendly annotation once adopted.

This is a hygiene improvement worth doing in the same window as the tenant-context refactor (same
kind of change, same risk, better to do once) — detailed as a roadmap phase, not strictly
blocking for launching billing.

## 4.8 Summary of new/changed endpoints

| Endpoint | Change |
|---|---|
| `GET /api/v1/auth/me` | Shape change: adds `account`, `companies[]` |
| `POST /api/v1/auth/switch-company` | **New** |
| `GET /api/v1/modules` | Logic change: real `locked` based on entitlement |
| `GET /api/v1/billing/plans` | **New** |
| `GET /api/v1/billing/subscription` | **New** |
| `POST /api/v1/billing/checkout-session` | **New** |
| `POST /api/v1/billing/portal-session` | **New** |
| `POST /api/v1/billing/addons/{moduleSlug}` | **New** |
| `DELETE /api/v1/billing/addons/{moduleSlug}` | **New** |
| `POST /api/v1/billing/webhook` | **New**, no session auth |
| `POST /api/v1/config-center/users/invite` | Change: validates seats before inviting (409 if exceeded) |
| All `/api/v1/{module}/**` | Gain a `@RequiresModule` check |
