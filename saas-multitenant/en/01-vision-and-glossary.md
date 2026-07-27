# 1. Vision and glossary

## Vision in one page

Indice ERP moves from being "a single company's system" to being **the platform for a business
owner (or owners)**.

An owner signs up once, pays a monthly/annual Stripe membership, and from that same login can have
**one or several companies/business units** — they could be branches of the same trade (e.g., 3
restaurants) or entirely different businesses (e.g., a restaurant + a laundromat + a real-estate
business), all under a single account, a single invoice, a single control panel.

The membership (plan) defines:

- **How many users** (seats) the owner can have in total, across all of their
  companies/businesses combined. Going over that number costs extra (per-additional-seat billing).
- **Which modules** of the ERP are available (HR, Expenses, CRM, POS, Inventory, etc.). Modules
  not included in the plan can be purchased separately as *add-ons*.

Once a module is purchased at the account level, it's available to **all** companies/businesses
under that account — it isn't paid for again per business. (See
[03-multitenant-data-model.md](03-multitenant-data-model.md#design-decision-entitlements-at-the-account-level)
for the rationale behind this decision and its alternative.)

## Why this isn't a rewrite

The hardest piece of a multi-tenant SaaS — "a company can have several internal business units" —
**already exists** in Indice ERP today (`companies → units → businesses`, see
[02-current-state-audit.md](02-current-state-audit.md)). What's missing is a layer above
`companies` (the account/owner) and everything related to billing. It's an extension of the
current model, not a replacement.

## Glossary (vocabulary every other document uses)

| Term | Definition | Table / concept today |
|---|---|---|
| **Account** (Owner) | The billing entity. A business owner = one Account. Has a Stripe Customer, a Subscription, and one or more `users` with owner/admin role. **Doesn't exist today** — the main new piece. | New table `accounts` |
| **Owner** | The `user` who created the Account and is responsible for payment. Can invite other users. | New: `accounts.owner_user_id` |
| **Company** | A company or business unit within an Account. E.g. "El Sazón Restaurant", "Quick Laundromat". Already exists as today's tenant root; in the new model it hangs off an Account. | `companies` (existing) |
| **Unit** (Organizational unit) | An internal grouping within a Company (e.g., a division, a region). Optional. | `units` (existing) |
| **Business** (Branch / point of business) | A physical/operational point within a Company, optionally within a Unit (e.g., a branch). Already where HR ties attendance, kiosks, assets. | `businesses` (existing) |
| **Tenant** | Generic term for data isolation. In this system, strong isolation happens at the **Account** level (billing/seats) and also at the **Company** level (operational data: employees, sales, etc. is not shared between companies even if they belong to the same Account). | New explicit concept |
| **Plan** | A commercial membership tier (e.g., "Starter", "Growth", "Scale"). Defines included seats, base price, and which module tier it includes. | New table `plans` |
| **Seat** | An active user counted against the plan's limit, counted at the Account level (across all its companies), not per company. | Derived calculation, no new table |
| **Subscription** | The link between an Account and a Plan, reflected in Stripe (`stripe_subscription_id`). Has a status (`trialing`, `active`, `past_due`, `canceled`...). | New table `subscriptions` |
| **Entitlement** | An Account's right to use a specific module, either because it's included in its Plan or because it was purchased as an add-on. | New table `account_module_entitlements` |
| **Add-on** | A module purchased separately, outside the Plan's base tier (e.g., "Starter" plan + "Inventory" module paid separately). | New table `subscription_addons` |
| **Module** | An ERP feature (HR, CRM, POS, etc.), listed in the global catalog. Already exists. | `modules` (existing, `tier` already seeded) |
| **Module tier** | Commercial classification of a module (`free`/`basic`/`pro`/`enterprise`). Already exists in the `modules.tier` column but is purely decorative today (not used to grant/revoke access). | `modules.tier` (existing, no functional use) |

## Hierarchy relationship (text)

```
Account (owner, billing, plan, seats, purchased modules)
 └── Company (business #1)                └── Company (business #2, same owner)
      ├── Unit (optional)                      ├── Unit
      │    └── Business (branch)                │    └── Business
      └── Business (direct branch)              └── Business
```

A `user` can belong to several `Company` records within the same `Account` (or, in theory, to
companies of different Accounts if invited as an external collaborator — a case already supported
by the current `user_companies` model with no changes).
