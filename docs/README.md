# Indice Documentation Map

This index separates governing standards from implementation history. A document being newer does
not automatically make it authoritative; its declared status and the hierarchy in `../AGENTS.md`
control how it is used.

## Canonical Repository Standards

- [Frontend Operating System](indice-frontend-operating-system-v2.md) — frontend architecture,
  design system, interaction patterns, localization, accessibility, and frontend verification.
- [Backend Operating System](indice-backend-operating-system-v1.md) — backend packages, security,
  tenant scope, API contracts, persistence, transactions, files, tests, and execution discipline.
- [Public Release Security Gate](indice-public-release-security-gate.md) — evidence required before
  an internet-facing or paid production release.
- [Premium Multi-Tenant And Billing Architecture](INDICE_PREMIUM_MULTITENANT_BILLING_ARCHITECTURE.md)
  — approved company tenant model, commercial catalog, entitlements, seats, Stripe, lifecycle, and
  phased rollout.
- [Kiosk Standard Engine v2](kiosk-standard-engine-v2.md) — canonical architecture and security for
  kiosk/public operational channels.
- [Deployment Runbook](../deployment/README.md) — environment, preflight, production deployment,
  smoke tests, and rollback.

## Canonical Specialized Contracts

These extend the general standards only in their named domain:

- [KPI Tab Standard](KPI_TAB_STANDARD.md) — basic-module KPI internal views based
  on Human Resources: shared filters, owning module color, equal 24 px bar spacing,
  per-module adaptation template and verification checklist.
- [KPI Executive Decision Contract](KPI_EXECUTIVE_DECISION_CONTRACT.md)
- [Module Access Registry](complementary-module-access-registry-standard-2026-08-02.md)
- [User Module/Tab Scope Standard](users-module-tab-scope-standard-2026-08-02.md)
- [Learning Mode](learning-mode-frontend-engine-v2.md)
- [Production Demo Data Runbook](production-demo-data-runbook.md)
- Finance domain contracts under
  `../react/src/app/BasicModules/Expenses/domain/`

Drafts explicitly marked `Draft` or `Not Yet Authoritative` remain proposals until approved.

## Release And Billing Runbooks

Use the phase/runbook that matches the enabled production capability:

- `INDICE_PREMIUM_MULTITENANT_PHASE_*_RUNBOOK.md`
- `INDICE_PREMIUM_MULTITENANT_PHASES_5_7_RUNBOOK.md`
- [Stripe Staging And Courtesy Runbook](INDICE_STRIPE_STAGING_AND_COURTESY_RUNBOOK.md)
- [Stripe LIVE Go-Live Runbook](INDICE_STRIPE_LIVE_GO_LIVE_RUNBOOK.md)
- [Signup Email Verification Tests](INDICE_SIGNUP_EMAIL_VERIFICATION_REQUIRED_TESTS.md)

Passing a phase runbook does not replace the complete Public Release Security Gate.

## Historical And Supporting Material

The following are useful evidence or context but do not govern new work by themselves:

- dated folders such as `March/`, `April/`, `May/`, and `July/`;
- `*-closeout-*`, implementation summaries, inventories, and migration reports;
- `../react/figmaDoc/` and pasted design prompts;
- `../saas-multitenant/`, which is a superseded proposal with a different tenant model.

Historical claims such as “not implemented”, “mock only”, or “no interceptor exists” must be
verified against current code, migrations, and tests before being repeated.

## Updating A Decision

When the product owner changes an approved rule:

1. identify the canonical document that owns the decision;
2. update it in the same change as the implementation when authorized;
3. record compatibility, migration, rollout, and verification impact;
4. mark the replaced proposal or section as superseded instead of leaving two active rules;
5. keep private contributor context out of repository documentation.

- [Expenses KPI workspace contract](./expenses-kpi-workspace-contract.md) — green internal views, measurement scope and source integrity.
- [Gastos KPI analysis and local validation](./indice-expenses-kpi-analysis-2026-09-15.md).
- [Petty Cash KPI workspace contract](./petty-cash-kpi-workspace-contract.md) — internal views, custody ownership and operational measurements.
- [Petty Cash KPI analysis and local validation](./indice-petty-cash-kpi-analysis-2026-09-15.md).
- [Receivables KPI workspace contract](./receivables-kpi-workspace-contract.md) — current debt, instalment ageing, collections and read-only analytics.
- [Receivables KPI analysis and local validation](./indice-receivables-kpi-analysis-2026-09-15.md).
- [Main integration and validation (2026-09-15)](./indice-main-integration-2026-09-15.md).
