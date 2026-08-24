# Indice ERP → SaaS Multi-Tenant

> **Historical proposal — superseded.** This folder does not describe the current product or code.
> The approved tenant and billing model is
> [`../docs/INDICE_PREMIUM_MULTITENANT_BILLING_ARCHITECTURE.md`](../docs/INDICE_PREMIUM_MULTITENANT_BILLING_ARCHITECTURE.md),
> and current engineering rules live in [`../AGENTS.md`](../AGENTS.md). Keep these files only as
> design history; do not implement their `accounts`-above-`companies` model or repeat their old code
> audit findings without a new audit.

Architecture plan for turning Indice ERP into a multi-tenant SaaS ERP (Stripe billing, one owner
with multiple companies/business units, per-plan seat limits, paid add-on modules).

Plan arquitectónico para convertir Indice ERP en un SaaS ERP multi-tenant (facturación con Stripe,
un dueño con varias empresas/unidades de negocio, límites de usuarios por plan, módulos add-on de
pago).

- 🇪🇸 **[Leer en español →](es/README.md)**
- 🇬🇧 **[Read in English →](en/README.md)**

Both versions cover the same 10 documents: vision & glossary, current-state audit, data model,
backend architecture, frontend architecture, Stripe billing integration, security recommendations,
module-by-module review, and the migration roadmap.

> No code, configuration, or database was changed to produce this documentation — it is a proposal
> to validate and implement in phases.
