# 8. Security — findings and recommendations for the SaaS version

This document combines two things: (a) the concrete risks already found while auditing the
current code ([02-current-state-audit.md](02-current-state-audit.md)), and (b) the security
practices that become **mandatory** when moving from "one company with its own installation" to
"multi-tenant SaaS charging strangers by credit card". Each item includes a recommendation
adapted to this stack (Spring Boot + JdbcTemplate + MySQL + React), not a generic one.

## 8.1 Findings already present in the code — close before or during Phase 0/1

These aren't hypothetical: they were confirmed by reading the actual code.

| # | Finding | Where | Risk | Recommendation |
|---|---|---|---|---|
| 1 | Cross-tenant leak via `company_id IS NULL` | `OrganizationService.listUnits`/`listBusinesses` (`dashboard/OrganizationService.java:73,92`), `HrAttendanceService.validateOperationalScope` (`hr/HrAttendanceService.java:3546,3562`) | A row with a null `company_id` (allowed by the schema) becomes visible to **every** company. In a SaaS that charges for data isolation, this is a confidentiality incident, not a minor bug. | Remove the `OR company_id IS NULL` from the queries; migrate `units.company_id`/`businesses.company_id` to `NOT NULL` (see [03 §3.5](03-multitenant-data-model.md)). Add an integration test that fails if any tenant-data read query can return rows from another `company_id`. |
| 2 | Zero centralized authentication enforcement | Grep confirms: no `@ControllerAdvice`, filter, or interceptor anywhere in `src/main/java`. Every controller manually calls `sessionAuthService.currentUser(session)` (90+ places). | Any new endpoint (including the ones added for billing) can end up with no auth from a simple oversight. | Introduce the `TenantContextInterceptor` (see [04 §4.1](04-backend-architecture.md)) as the single gate; consider `spring-boot-starter-security` so missing auth becomes an explicit configuration error, not a silent per-endpoint oversight. |
| 3 | Inconsistent role vocabulary | Priority order in `SessionAuthService.java:90-101` vs. `ConfigCenterService.normalizeRole` (`ConfigCenterService.java:1267-1274`) | Two different definitions of "who is admin" can diverge and grant privileges they shouldn't, especially once an "Account owner" role is built on top. | Unify into a single shared role enum before building any new permission logic on top of it. |
| 4 | Inconsistent CSRF handling | `AuthApiController.loginJson` doesn't apply the `SESSION_LOGIN_CSRF` that the form-based flow does | JSON login is left without explicit CSRF protection (partially mitigated by `SameSite=lax`, but that alone isn't sufficient defense). | Apply the same CSRF mechanism (or migrate to a double-submit-cookie scheme) to **all** state-mutating endpoints, including the new billing ones (`checkout-session`, `switch-company`, `addons`). |
| 5 | `businesses.company_id` redundant with no consistency constraint | `businesses.company_id` and `businesses.unit_id → units.company_id` can diverge, nothing prevents it | A `business` could, due to an application bug, point to a `unit` from a different company. | Add service-level validation (something similar already exists in `validateOperationalScope`) and consider a `CHECK`/trigger confirming `businesses.company_id = (SELECT company_id FROM units WHERE id = businesses.unit_id)` when `unit_id` is not null. |
| 6 | `hr_employees.unit_id`/`business_id` with no real FK | Just indexed columns, no FKs (`B1`, `V5`) | A bug can write a `unit_id` from another company without the database rejecting it. | Add the real FKs (already proposed in [03 §3.5](03-multitenant-data-model.md)). |
| 7 | Session only in Tomcat memory | `application.properties`, no Spring Session | Doesn't scale past one instance without sticky sessions; also, a backend restart logs out every active user — poor experience for a paid SaaS. | Spring Session JDBC (minimal effort, see [04 §4.6](04-backend-architecture.md)) before running more than one instance in production. |

## 8.2 New practices the SaaS/multi-tenant model requires

### Tenant isolation as an invariant, not a convention

Today isolation depends on every developer remembering to write `WHERE company_id = ?` in every
new query (confirmed: no shared layer guarantees it). At the scale of more paying customers, a
single endpoint that forgets it is a security incident affecting real customers, not a test
environment.

**Recommendation**: besides the `TenantContextInterceptor` (04), add an automated "tenant sweep"
test that, for every table with `company_id`/`account_id`, inserts data for two different tenants
and verifies a tenant-A user can never read or mutate it via the public API, iterating over every
controller. Run it in CI, not just manually.

### Secrets management (Stripe and others)

`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are extremely high-impact credentials (they allow
moving money and viewing every customer's payment data). Today the project already handles
secrets as plain environment variables in `deployment/env/.env.example` (an acceptable pattern for
local MinIO/MySQL).

**Recommendation for production**: don't commit real `.env` files (already avoided via
`.env.example`), inject `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` from the hosting provider's
secret manager (not hardcoded in `docker-compose.yml`), and use Stripe **restricted** API keys
(scoped to only `checkout`, `billing_portal`, `subscriptions`, `customers` — never a full-access
key) for the backend.

### Webhook signature verification — mandatory, not optional

The `POST /api/v1/billing/webhook` endpoint (see [06 §6.4](06-stripe-billing-integration.md))
receives public requests by design (Stripe doesn't send a session cookie). If the signature isn't
verified (`Stripe-Signature` against `STRIPE_WEBHOOK_SECRET`, over the *raw body*, before
deserializing), anyone can send a fake webhook and grant themselves free entitlements/modules.

**Recommendation**: this endpoint must be explicitly excluded from the `TenantContextInterceptor`
but **must** have its own mandatory signature check — never "public with no verification at all".
Store every event in `stripe_events` with its verified signature before processing it (already
covered in the data design), and reject (`400`) any request whose signature doesn't validate,
without processing the payload.

### PCI-DSS scope — actively avoid it

It was already decided in [06 §6.7](06-stripe-billing-integration.md) not to build a custom card
form. This isn't just a product decision: **it's the main security lever of the entire billing
design** — it keeps the application out of PCI-DSS scope (audits, card-data encryption, etc.).
Reinforce as a hard rule: no card PAN, CVV, or expiration date should ever touch the Indice ERP
backend or database in any flow, present or future — everything goes through Stripe
Checkout/Portal/Elements with tokens (`payment_method_id`), never raw data.

### Rate limiting and brute-force protection on login

There's currently no evidence of rate limiting on `POST /api/v1/auth/login` (nor lockout after
failed attempts). Acceptable as a low residual risk when the system has few internal users from a
single company; **stops being acceptable** once login is the entry point for paying customers
whose accounts can chain to their employees' payroll/HR data.

**Recommendation**: add an attempt limit per IP+email (e.g. a 5-attempts/15-min bucket) before
public launch, and consider CAPTCHA or progressive backoff if abuse is detected. This also
applies to `POST /api/v1/auth/switch-company` and to invitation acceptance (single-use tokens with
a short expiry — `user_invitations.expires_at` already exists, confirm it's validated server-side
at acceptance time, not just at link generation).

### RBAC and the new "Account owner" role

With `accounts` (03), a new privilege level appears: the account owner can view/manage billing and
create/delete entire companies — greater power than a plain `admin` of a single company.
**Recommendation**: explicitly model `accounts.owner_user_id` as the only one who can: change
plans, cancel the subscription, and delete an entire company from the account. An individual
company's `admin` (today's `user_companies.role`) shouldn't automatically inherit those powers
just by being an admin of one of the companies — clearly separate "operational admin of one
business" from "owner of the paying account".

### Multi-tenant auditing and traceability

With multiple paying customers, "who changed what and when" stops being just internal hygiene and
becomes a support/dispute requirement (e.g. a customer disputes a seat-overage charge they claim
they never authorized). The system already has a per-table audit pattern (`created_by`,
`updated_by`, `hr_employee_record_activity` as an example of a dedicated log in HR).

**Recommendation**: extend that same pattern to billing events — every plan change, add-on
purchase, and seat change should be logged with `actor_user_id` + timestamp + before/after values
(the `stripe_events` table already covers the "what Stripe sent" side; a symmetric log for "what
action a user took inside Indice that triggered that Stripe call" is still missing).

### Storage isolation (MinIO) per tenant

Today MinIO isolation is only via key prefix (`hr/face/enrollments/{companyId}/...`, see
[02 §2.2](02-current-state-audit.md)) — it works because the backend never generates a signed URL
outside the requesting tenant's prefix, but that's a **code** invariant, not an infrastructure
one. With more paying tenants, the cost of a bug generating a presigned URL with the wrong prefix
(e.g. a copy-pasted `companyId` from another request in a log or a batch job) goes up: it would
mean access to another company's attendance photos/biometrics.

**Recommendation**: centralize object-key construction in a single helper (`TenantStorageKeys`)
that takes the tenant from `TenantContext` (4.1) instead of each call site building the string by
hand; that way a scoping bug gets fixed in one place, not in N call sites.

### Data retention and deletion on cancellation (offboarding)

A paid SaaS needs a clear policy for when an owner cancels their account: is their data deleted
immediately, or retained for a grace period in case they resubscribe? Today the system has no
retention/purge mechanism at all — every existing `ON DELETE CASCADE` deletes immediately if a
`company` is removed.

**Recommendation**: don't delete data immediately on subscription cancellation — mark
`accounts.status = 'canceled'` and block access (via the same entitlement enforcement from
[04 §4.3](04-backend-architecture.md)), retaining the data for a defined period (e.g. 30-90 days)
before a final purge, and document this period in the terms of service. This also gives room to
export the customer's data before final deletion (good practice and, depending on jurisdiction, a
possible legal requirement).

### Dependencies and new attack surface

Adding `stripe-java` (backend) and Stripe.js (frontend, if Elements is used for anything beyond
hosted Checkout/Portal) are new external dependencies with access to payment data.
**Recommendation**: pin exact versions (not open ranges) in `pom.xml`/`package.json`, and fold
them into whatever dependency-update process should already exist for the rest of the project
(Spring Boot, MySQL connector, etc.) — don't treat them as an exception.

## 8.3 Checklist before charging real cards (Stripe live mode)

- [ ] Findings 1-7 from section 8.1 closed and covered by a regression test.
- [ ] `TenantContextInterceptor` + tenant-sweep test in CI.
- [ ] Stripe webhook with mandatory signature verification, no exceptions.
- [ ] Restricted Stripe keys (not the master key) on the backend.
- [ ] `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` outside of committed files, injected by the
      hosting provider's secret manager.
- [ ] Rate limiting on login, switch-company, and invitation acceptance.
- [ ] Account-owner role explicitly separated from Company-admin.
- [ ] Billing event log with actor + before/after.
- [ ] Documented retention/deletion policy for cancellations.
- [ ] `deployment/compose/docker-compose.yml` and `.env.example` updated with `STRIPE_*`
      variables (see [06 §6.6](06-stripe-billing-integration.md)), with no real values committed.
