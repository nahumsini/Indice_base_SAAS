# Indice ERP → SaaS Multi-Tenant — Architecture Plan

This directory documents how to turn Indice ERP (Spring Boot + React + MySQL/Docker) into a
**multi-tenant SaaS ERP**, where a single owner ("Account") can manage **several distinct
companies or business units from one login**, pay a **Stripe membership** that includes N users
and a set of modules, and buy **extra users or additional modules** as add-ons.

> **Scope of this work**: these are planning/architecture documents. No code, configuration, or
> database was modified. Everything described here is a proposal to validate and implement in
> phases.

## How to read this

Read in order — each document assumes the previous one:

1. **[01-vision-and-glossary.md](01-vision-and-glossary.md)** — What we're building, in one page,
   and the exact vocabulary (Account, Company, Unit, Business, Plan, Seat, Entitlement, Add-on)
   the rest of the documents use without re-explaining.
2. **[02-current-state-audit.md](02-current-state-audit.md)** — An honest snapshot of where the
   system stands today: what already works as a multi-tenant foundation, what's half-built, and
   what is a security risk that must be closed regardless of the SaaS work.
3. **[03-multitenant-data-model.md](03-multitenant-data-model.md)** — The new data model:
   `accounts` sitting above `companies`, `plans`/`subscriptions`/`entitlements` tables, and the
   Flyway migration plan (`V20+`) to get there without losing current data.
4. **[04-backend-architecture.md](04-backend-architecture.md)** — Spring Boot changes: per-request
   tenant context, switching the active company without re-login, per-module entitlement
   enforcement, Stripe integration (checkout, portal, webhooks), session scaling.
5. **[05-frontend-architecture.md](05-frontend-architecture.md)** — React changes: company/business
   switcher, real blocking of modules that aren't purchased, and how to move `Plan.tsx`/`Billing.tsx`
   from mockups to real Stripe data.
6. **[06-stripe-billing-integration.md](06-stripe-billing-integration.md)** — Stripe-specific
   design: products/prices, seat-based billing with overage, add-on module purchases, webhook
   events and their idempotent handling.
7. **[07-migration-roadmap.md](07-migration-roadmap.md)** — Phased execution plan, from lowest to
   highest risk, with "done" criteria per phase and what can be parallelized between
   backend/frontend.
8. **[08-security-recommendations.md](08-security-recommendations.md)** — Security risks found in
   the current code plus the ones that specifically apply to a paid multi-tenant SaaS (tenant
   isolation, secrets handling, webhooks, sessions, PCI, RBAC, auditing), with the suggested
   fix/adaptation for each.
9. **[09-module-by-module-review.md](09-module-by-module-review.md)** — A review of all 20
   catalog modules (HR, Expenses, CRM, POS, Inventory, etc.): which ones already have a real
   backend, which are frontend-only mockups, and what each needs to work correctly under the
   multi-tenant/SaaS model.

## Executive summary (30 seconds)

- Today the system is **de facto single-tenant**: `companies` is the tenant root, login collapses
  to a single company per session, `/api/v1/modules` ignores `company_id` and returns the full
  catalog to anyone, and there is no plan/subscription/Stripe table at all. See
  [02-current-state-audit.md](02-current-state-audit.md).
- The `companies → units → businesses` hierarchy **already exists and already works** to model
  "several business units belonging to the same owner" — it's the most reusable piece of the
  entire system. What's missing is a layer **above** `companies`: an `accounts` entity (the
  owner/billing entity) that one or more `companies` hang off of, and that's where the Stripe
  subscription, seat limit, and purchased modules live.
- `user_companies` is already a many-to-many user↔company table with no uniqueness constraint, so
  "one login, several companies" is **already technically possible in the data** — what's missing
  is the app (login, session, frontend) no longer forcing "a single company per session".
- Everything about billing (plans, seats, Stripe, per-module entitlements) is built **from
  scratch**: there isn't a single related column today. Config Center already has the `Plan.tsx`
  and `Billing.tsx` screens, but they are 100% mock — no backend, no Stripe.
