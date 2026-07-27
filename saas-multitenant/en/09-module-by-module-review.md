# 9. Module-by-module review

All 20 catalog modules were reviewed (`react/src/app/config/moduleCatalog.ts`, which mirrors the
`modules` table seeded in `B1__spring_backend_baseline.sql:144-152`). Main finding: **only two
modules have a real backend today** (Config Center and Human Resources); the other 18 are
single-file React components with local state/sample data, with no call to `apiClient` at all
(confirmed by grepping `apiClient|fetch(` across `BasicModules`, `ComplementaryModules`, and
`AIModules` — zero hits outside Dashboard and HumanResources).

This reframes the review: it isn't "adapt 20 existing modules to multi-tenant", it's "the 2 real
modules must be airtight, and the remaining 18 must be built **from day one** following the
multi-tenant pattern, so they don't repeat the debt HR/Config Center carry today" (inconsistent
roles, missing FKs, etc. — see [02](02-current-state-audit.md) and
[08](08-security-recommendations.md)).

## 9.1 The "recipe" every new module must follow

Before building the backend for any of the 18 pending modules, each one must:

1. **Table(s) with `company_id NOT NULL`** from the first migration (not nullable — the
   `units`/`businesses` schema mistake shouldn't be repeated, see
   [03 §3.5](03-multitenant-data-model.md)).
2. **Real FKs**, not loose columns, for any reference to `unit_id`/`business_id`/`employee_id`/etc.
3. **Resolve the tenant from `TenantContext`** ([04 §4.1](04-backend-architecture.md)), not
   reinvent "get companyId from the session" in every new controller.
4. **Annotate its endpoints with `@RequiresModule("<slug>")`**
   ([04 §4.3](04-backend-architecture.md)) from day one — so the module is born already respecting
   plans/entitlements, instead of bolting it on later as a patch.
5. **Get a real row in `modules`** with the correct `tier` and be covered by at least one `plans`
   entry (see [03](03-multitenant-data-model.md)) before leaving beta — several modules are
   currently seeded as `tier = 'enterprise'` without that meaning anything functionally; once
   enforcement is live, a misclassified module will accidentally become inaccessible to every
   plan.
6. **Explicitly decide its scoping level**: does the data live at the `company` level, or does it
   need to go down to `unit`/`business` (e.g. physical inventory, a branch's POS)? See the
   "Suggested scoping" column in the table below — most operational modules (POS, Inventory,
   Maintenance, Vehicles) should be born with `business_id`, not just `company_id`, because their
   data is inherently about one branch/physical location, not the whole company.

## 9.2 Modules with a real backend today

### Config Center (`config_center` → `/home-panel`)

Backend: the full `configcenter` package. Already covered in detail in
[02 §2.3](02-current-state-audit.md) and in [05](05-frontend-architecture.md) (Plan and Billing
sections). Module-specific pending items for SaaS:

- `Plan.tsx`/`Billing.tsx`: move from mock to real (05 §5.4-5.5).
- `Users.tsx`: multi-company invitation + seat gating (05 §5.6).
- `BusinessStructure.tsx`: already correctly models units/businesses within a company; with
  `accounts`, it gains the entry point for "add another company to my account" (05 §5.2).
- Roles: unify vocabulary before building the Account-owner role (08 §8.2).

### Human Resources (`human_resources` → `/human-resources`)

Backend: the `hr` package (the largest and most mature part of the system — employees,
attendance, payroll, assets, kiosks, face recognition). It's by far the module best prepared for
multi-tenancy: it already uses `company_id` consistently and already thinks in 3 levels
(`company → unit/business → resource`) across several tables (`hr_attendance_locations`,
`hr_kiosk_devices`, `hr_assets`). Module-specific pending items:

- Close findings 1, 5, and 6 from [08 §8.1](08-security-recommendations.md) (the
  `company_id IS NULL` leak, `businesses.company_id` consistency, `unit_id`/`business_id` FKs on
  `hr_employees`).
- `hr_employee_number_sequences` is keyed only by `company_id` (as its PK), so it doesn't support
  independent numbering per business unit — evaluate whether an owner with several companies under
  one account needs shared numbering across them (today, since each company is a separately
  isolated tenant with its own sequence, it's already correctly isolated; no change needed unless
  the product requires otherwise).
- `hr_kiosk_devices.public_access_token` is a public per-device token — with more tenants, confirm
  the `/kiosk/:deviceToken` route (public, no auth loader) resolves `company_id`/`business_id`
  **only** from the token, never from an additional client-controllable parameter.

## 9.3 Modules with no backend (18) — inventory and suggested priority

All of them share the same state: a single React component with local data, no real persistence.
The "Suggested scoping" column is the recommendation for what level the data should live at once
the backend is built, following the `account → company → unit → business` hierarchy from
[01](01-vision-and-glossary.md).

| Module (slug) | Route | Category | Frontend component | Suggested scoping | Note |
|---|---|---|---|---|---|
| `expenses` | `/expenses` | Basic | `Gastos.tsx` | `company_id` (+ optional `business_id`) | High-priority candidate — usually one of the first modules an owner expects to use right away. |
| `petty_cash` | `/petty-cash` | Basic | `CajaChica.tsx` | `business_id` mandatory | Petty cash is physically tied to one branch, not the whole company — born with `business_id NOT NULL`. |
| `pos` | `/point-of-sale` | Basic | `PuntoDeVenta.tsx` | `business_id` mandatory | A point of sale is a specific branch; also the module most likely to need high throughput/low latency (transactions) — worth designing with that in mind from the start. |
| `processes` | `/processes-tasks` | Basic | `ProcessesTasks.tsx` | `company_id` (assignable to a `unit`/`business`) | Tasks/workflows can cross units within a company — keep `company_id` as the anchor with optional per-task `unit_id`/`business_id`. |
| `crm` / `sales` | `/sales` | Basic | `Ventas.tsx` | `company_id` (+ optional `business_id`) | Two backend slugs (`crm`, `sales`) point to the same screen — decide whether they're one commercial module or resolve the duplication before billing them as separate plan line items. |
| `kpis` | `/kpis` | Basic | `Kpis.tsx` | `company_id` | If it ends up being an aggregation of other modules (sales, expenses, HR), it doesn't need its own data table — just aggregation endpoints with the same `@RequiresModule`. |
| `maintenance` | `/maintenance` | Complementary | `Mantenimiento.tsx` | `business_id` mandatory | Maintenance reports belong to a physical asset/location — same criterion as `hr_assets`, reuse its optional `unit_id` pattern. |
| `inventory` | `/inventory` | Complementary | `Inventarios.tsx` | `business_id` mandatory | Physical stock lives at a specific branch/warehouse; if an owner has several companies, inventory must **not** be visible across them even though they share `account_id` (respect isolation at the `company` level, not just `account`). |
| `control_minutas` | `/minutes-control` | Complementary | `ControlMinutas.tsx` | `company_id` | Meeting minutes, typically company-wide. |
| `cleaning` | `/cleaning` | Complementary | `Limpieza.tsx` | `business_id` mandatory | Same as maintenance — operations of one physical location. |
| `lavanderia` | `/laundry` | Complementary | `Lavanderia.tsx` | `business_id` mandatory | A trade-specific module (laundry) — one of the best illustrations of the user's "different businesses under the same owner" use case; must stay isolated by `company_id`/`business_id` with no leaks toward the same owner's other trades. |
| `transportacion` | `/transportation` | Complementary | `Transportacion.tsx` | `company_id` (+ optional `business_id`) | Routes/fleets can serve several branches of one company. |
| `vehiculos_maquinaria` | `/vehicles-machinery` | Complementary | `VehiculosMaquinaria.tsx` | `company_id`, similar to `hr_assets` | Good candidate to directly reuse the `hr_assets`/`hr_asset_assignments` pattern (asset + responsible party + status history) instead of designing a new one from scratch. |
| `inmuebles` | `/properties` | Complementary | `Inmuebles.tsx` | `company_id` (+ optional `unit_id`) | Could be modeled as an extension of `businesses` (each property could already *be* a `business`) instead of a brand-new entity — evaluate before building. |
| `formularios` | `/forms` | Complementary | `Formularios.tsx` | `company_id` | Generic form builder — make sure responses (`form_responses`) also carry `company_id`, not just `form_id` (same risk pattern as the "tables with no direct `company_id`" flagged in [03 §3.2](03-multitenant-data-model.md) of the original schema analysis). |
| `facturacion` | `/invoicing` | Complementary | `Facturacion.tsx` | `company_id` | High regulatory risk (tax invoicing) — evaluate country-specific legal requirements separately before building; probably the module with the strongest case for a high `tier` (`pro`/`enterprise`). |
| `correo` / `correo_electronico` | `/email` | Complementary | `CorreoElectronico.tsx` | `company_id` | Two slugs for the same screen, same issue as `crm`/`sales` — resolve the catalog duplication before selling this as a plan line item. If it's an email client/integration, carefully review that third-party credentials (email OAuth) are stored per `company_id`, never shared across tenants. |
| `clima_laboral` | `/work-climate` | Complementary | `ClimaLaboral.tsx` | `company_id` | Workplace-climate surveys — sensitive employee data; apply the same privacy care HR already has (`hr_employee_records` has soft delete via `deleted_at` — a good pattern to reuse here). |
| `agente_ventas` | `/sales-agent` | AI | `AgenteVentas.tsx` | `company_id` | If it consumes an external LLM, third-party credentials/API keys should be resolved per `account_id` or `company_id` depending on how the AI add-on is billed — define alongside the `subscription_addons` design (06). |
| `indice_analitica` | `/analytics` | AI | `Analitica.tsx` | `company_id` (aggregate read) | Likely just reads from other modules — doesn't need its own tables if implemented as aggregation; automatically inherits the tenant isolation of the modules it queries. |
| `capacitacion` | `/training` | AI | `Capacitacion.tsx` | `company_id` | Training content could be shared at the `account` level (same content across all of an owner's companies) instead of duplicated per company — a product decision to make before building the schema. |
| `coach` | `/coach` | AI | `Coach.tsx` | `company_id` or per-user | If it's a personal conversational assistant, evaluate whether history should be isolated by the active `company_id` or follow the user across companies — directly affects the `CurrentCompanyContext` design (05 §5.1). |

## 9.4 Duplicates to resolve in the catalog before billing per module

Two pairs of distinct slugs point to the same frontend screen:

- `crm` and `sales` → both render `Ventas.tsx`.
- `correo` and `correo_electronico` → both render `CorreoElectronico.tsx`.

This is harmless today because no module has plan enforcement. **As soon as
`account_module_entitlements` is activated** (Phase 3, [07](07-migration-roadmap.md)), a decision
is needed: are they the same commercial product with two legacy slugs (clean up the catalog, keep
one), or are they two genuinely different features that happen to share a screen today (split the
frontend)? Resolve this **before** deciding which `plans`/`tier` includes them, to avoid
confusingly selling "two modules" that are actually one.

## 9.5 Suggested build priority summary

Suggested, to be validated with the business — not a product commitment, just a technical read of
which modules already have most of their data pattern solved elsewhere in the system and therefore
cost less to build well:

1. **High reuse of existing patterns**: `vehiculos_maquinaria` (reuses `hr_assets`), `inmuebles`
   (reuses `businesses`), `kpis`/`indice_analitica` (aggregation, no own tables).
2. **High expected demand, new but simple pattern**: `expenses`, `petty_cash`, `pos`.
3. **New pattern with more regulatory/technical surface**: `facturacion`, `correo_electronico`
   (third-party integration), `agente_ventas`/`coach` (external LLM integration).
