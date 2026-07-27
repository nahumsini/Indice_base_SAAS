# 2. Current-state audit

This is a snapshot based on direct code reading (`src/main/java/com/indice/erp`), all Flyway
migrations (`B1` through `V19`), and the frontend (`react/src`). Goal: separate "already works as a
multi-tenant foundation" from "must be built from scratch" and from "is a risk that must be closed
regardless".

## 2.1 The real stack (not what the README says)

- Spring Boot 3.5.13, Java 21.
- **No JPA/Hibernate.** All data access is `JdbcTemplate` + raw SQL text + hand-written
  `RowMapper`s, with no repository layer or entity classes. Confirmed in `pom.xml`
  (`spring-boot-starter-jdbc`, not `spring-boot-starter-data-jpa`).
- **No Spring Security.** Only `spring-security-crypto` for `BCryptPasswordEncoder`. All
  authentication is custom, built on `HttpSession` (`auth/SessionAuthService.java`).
- Session stored in the Tomcat container's memory (no Redis, no Spring Session) — doesn't scale
  horizontally without sticky sessions.
- Single shared MySQL 8 schema (`indice_db`), Flyway with `baseline-on-migrate=true`.
- File storage via MinIO, isolated by *key prefix* (`hr/face/enrollments/{companyId}/...`), not by
  bucket.

## 2.2 What ALREADY works as a multi-tenant foundation (reuse, don't reinvent)

- **`companies → units → businesses`** already models exactly "one business with several
  units/branches". This is the most valuable piece of the current system for the user's stated
  goal.
- **`user_companies`** (`B1__spring_backend_baseline.sql:44-57`) is already a many-to-many
  `user_id` ↔ `company_id` table, with `role`/`status`/`visibility`, and **no uniqueness
  constraint** on `(user_id, company_id)` — meaning the data already allows a user to belong to
  several companies. What's missing is for the app to take advantage of it (see 2.3).
- Most HR tables (employees, attendance, payroll, assets, kiosks, face recognition) already carry
  `company_id` consistently and with good local practices: `UNIQUE (company_id, employee_number)`
  and `UNIQUE (company_id, email)` on `hr_employees` (added in `V16`), scoped by `company_id` in
  ~80-370 places per service.
- `hr_attendance_locations`, `hr_kiosk_devices`, and `hr_assets` already have optional
  `unit_id`/`business_id` columns — i.e. HR already thinks in 3 levels
  (company → unit/business → resource), which is the granularity a multi-business ERP needs.
- The frontend already has a reusable Context + `localStorage` pattern (`FavoritesContext`,
  `LanguageContext`) that's a direct template for the future `CurrentCompanyContext`.
- Mature multi-language support already exists (`react/src/app/locales`), useful for billing copy.
- The `/api/v1/modules` response and the `BackendDashboardModule` frontend type **already carry
  `plan` and `locked` fields** (`react/src/app/api/dashboard.ts:4-15`) — the contract already
  anticipated plan-based gating, it just was never wired to anything real.

## 2.3 What exists but is "half-built" (a product limitation, not a data one)

- **Login collapses to a single company per session.** `SessionAuthService.authenticateAndStoreSession`
  queries `user_companies` and picks **just one** row via `ORDER BY ... LIMIT 1` by role priority
  (`SessionAuthService.java:84-111`), storing it as a fixed `SESSION_COMPANY_ID` for the entire
  session. **No endpoint exists to switch the active company.** The frontend mirrors this:
  `AuthSessionResponse` carries a singular `company: { id }`, not a list
  (`react/src/app/api/auth.ts:4-13`).
- **`/api/v1/modules` completely ignores plan/tier.** `OrganizationService.listModules(userId, companyId)`
  receives `companyId` but never uses it in the `WHERE` clause
  (`dashboard/OrganizationService.java:36-66`) — it returns the full catalog of active modules to
  any authenticated user, regardless of company or plan. `modules.tier`
  (`free/basic/pro/enterprise`, seeded in `B1__spring_backend_baseline.sql:144-152`) is purely
  decorative today: only used client-side to visually group modules into carousels
  (`react/src/app/config/moduleCatalog.ts`), never to block real access to routes.
- **Config Center already has Plan and Billing screens — both are mock.** `Plan.tsx` is static
  comparison cards (Inicio/Controla/Escala) with no logic; `Billing.tsx` has saved cards and
  invoices **hardcoded in the component**, with not a single call to `apiClient`. They're the
  natural place to wire up Stripe (see [05](05-frontend-architecture.md) and
  [06](06-stripe-billing-integration.md)), not something to redesign from scratch.
- **Inconsistent roles.** The login role-priority ordering
  (`root/superadmin/owner/dueno/admin/manager/approver/contributor/viewer/user`,
  `SessionAuthService.java:90-101`) doesn't match the normalized set used in Config Center
  (`superadmin/admin/user`, `ConfigCenterService.normalizeRole`, `ConfigCenterService.java:1267-1274`).
  These need to be unified before building an "Account owner" role on top.

## 2.4 Existing security risks (close these regardless of the SaaS work)

- **Cross-tenant data leak via rows with `company_id IS NULL`.** `OrganizationService.listUnits`/`listBusinesses`
  (`dashboard/OrganizationService.java:73,92`) and `HrAttendanceService.validateOperationalScope`
  (`hr/HrAttendanceService.java:3546,3562`) use `WHERE (company_id = ? OR company_id IS NULL)` —
  any `units`/`businesses` row with a null `company_id` (allowed by the schema, it's nullable)
  becomes visible to **every** company. Must be fixed before charging for data isolation.
- **No centralized authentication enforcement.** There is no filter, interceptor, or
  `@ControllerAdvice` anywhere — every controller manually calls
  `sessionAuthService.currentUser(session)` and returns 401 by hand (repeated in 90+ places). Any
  new endpoint that forgets that line is left open with no auth. This is separate from the SaaS
  work, but the multi-tenant refactor is the natural opportunity to centralize it (a single
  interceptor, see [04](04-backend-architecture.md)).
- **`businesses.company_id` is redundant with `businesses.unit_id → units.company_id`** with no
  constraint guaranteeing they match — a `business` could, in theory, point to a `unit` belonging
  to a different `company`.
- **`hr_employees.unit_id`/`business_id` have no real FK**, they're just indexed columns — an
  application bug could write a `unit_id` from another company without the database preventing it.
- CSRF: the JSON login flow (`AuthApiController.loginJson`) doesn't apply the
  `SESSION_LOGIN_CSRF` that the form-based flow does — worth reviewing, though not blocking for
  the SaaS work.

## 2.5 What doesn't exist at all (build from scratch)

Explicitly confirmed via grep across all 19 migrations and the whole `react/src` tree: **zero**
traces of `stripe`, `subscription`, a functional `plan_id`, `seat`, `billing_account`, `invoice`,
`payment_method`. The only hints are two already-declared, unconsumed type fields:
`ConfigCenterEmpresa.plan_id?: number | null` (`react/src/app/api/configCenter.ts:111`) and
`BackendDashboardModule.plan?: string` (`react/src/app/api/dashboard.ts:9`).

This means: **there's no table, column, endpoint, or component to "migrate"** in this area — it's
clean ground. The full design is in [03-multitenant-data-model.md](03-multitenant-data-model.md)
and [06-stripe-billing-integration.md](06-stripe-billing-integration.md).

## 2.6 Summary table: gap by layer

| Layer | Already works | Half-built (wire up) | Doesn't exist (build) |
|---|---|---|---|
| Database | `companies/units/businesses`, `user_companies` M:N, `company_id` scoping in HR | `hr_employee_number_sequences` (PK per company, doesn't support multi-unit numbering if needed) | `accounts`, `plans`, `subscriptions`, `subscription_addons`, `account_module_entitlements`, `company_module_settings`, `stripe_events` |
| Backend | `company_id` pattern per service, storage with per-tenant prefix | single-company login, inconsistent roles | request tenant context, company-switch endpoint, per-module entitlement enforcement, Stripe integration (checkout/portal/webhooks) |
| Frontend | Context+localStorage (Favorites/Language) as a template, `plan`/`locked` types already in the contract | `moduleCatalog.ts` (add real route blocking, not just a visual badge) | company switcher, `CurrentCompanyContext`, real `Plan.tsx`/`Billing.tsx` with Stripe.js |
| Infra/Docker | MySQL in compose, MinIO, face-verification service | — | `STRIPE_*` variables in compose/env, (optional) Redis for Spring Session |
