# Scheduling — native local ERP integration

Date: 2026-10-07 (work started 2026-10-06). Scope: make the existing Scheduling pilot available
alongside the other modules in a real local ERP. Not an APPTEST or production release.

## Outcome and behavior changed

- Full ERP: `http://127.0.0.1:5175/dashboard`; Scheduling: `/scheduling/calendar`.
- Existing native registration classifies `scheduling` as `complementary`, lifecycle `pilot`,
  access model `tabs`. No alternate module framework or fallback access was added.
- Fresh persistent MySQL on loopback 13317, database `indice_modules_local`, container
  `indice-mysql-modules-local`, volume `indice-modules-local-data`; backend on loopback 8083.
- Native Flyway applied 241 migrations through V301, with no pending or failed migration.
- Existing local demo bootstrap granted Scheduling to Empresa Demo Spring through company
  entitlement and user module assignment. Dashboard returns 12 accessible native modules;
  Scheduling is complementary and unlocked. Activation source is `local_demo_bootstrap`.
- This is not the separate in-memory preview on 5197. Configuration and business mutations in
  the new ERP use Spring/JdbcTemplate and persistent storage; no preview API mocks are used.

## Deliberately preserved

- Original frontend 5174, backend 8082 and `indice-mysql-fresh` database were not restarted or
  modified. Their incompatible historical Flyway lineage was inspected read-only; no repair,
  checksum rewrite, reset, data transfer or applied-migration edit was performed.
- The new local contains synthetic demo data, not the original local's companies or reservations.
- Session, CSRF, tenant, entitlement, module and tab authorization remain enforced. A catalog
  request without the required CSRF header was rejected; the normal authenticated frontend
  and a request with the current session CSRF header succeeded.
- No automatic public page publication, scheduling service/staff setup or reservation creation.
  Public Scheduling adapter is enabled only on this local backend; publication remains explicit.
- Production, APPTEST, Stripe, provider credentials, email delivery, commits, merges and pushes: N/A.
- Earlier working-tree changes were retained.

## Files changed in this integration task

- `react/tests/scheduling-module-regression.test.mjs`: native complementary catalog mapping,
  authorized-catalog-only visibility, App route and migration registration regression.
- `docs/local-development.md`: parallel real-ERP startup/restart, persistence and safety guidance.
- This validation report. Existing Scheduling implementation and registration were reused unchanged.

## Verification

| Check | Result |
| --- | --- |
| Native local startup, compilation and Flyway through V301 | PASS |
| Read-only registry/entitlement verification in the new functional local | PASS |
| `npm run test:scheduling --prefix react` | PASS: 5 tests |
| `npm run typecheck --prefix react` | PASS |
| `npm run build --prefix react` | PASS; existing large-chunk advisory remains |
| ModuleAccessService, ConfigCenterTabPermissionCatalog, MigrationVersionUniqueness unit tests | PASS: 8 tests; no functional database used by JUnit |
| Real Chrome UI login, native dashboard card and Scheduling navigation | PASS |
| Six native tabs, Configure agenda and protected configuration/client APIs | PASS; no Scheduling API or JavaScript errors |
| Public appearance editor, desktop and mobile viewport | PASS |

The browser smoke used the actual `/login`, App/router, Vite proxy and Spring session. It did not
intercept API responses or create business records. The isolated Scheduling database/regression
coverage from the preceding change is documented separately in
[workspace evolution](2026-10-06-scheduling-workspace-evolution.md), not presented as a rerun here.

## Handoff and remaining risks

- Login: company **Empresa Demo Spring**, synthetic email `demo@example.com`, password `demo123`.
- Navigate Dashboard → Módulos complementarios → Agenda y eventos. Configure services, team,
  weekly availability and public appearance from the native module.
- Restart instructions: [parallel ERP](../local-development.md#erp-paralelo-con-historial-limpio).
- This remains a local pilot. Other environments/companies require explicit entitlement,
  authorized rollout and normal release gates; no blanket module grants were added to migrations.
- Original-local data transfer and migration-lineage reconciliation remain separate tasks.
- Rollback: stop this parallel frontend/backend/container without deleting its persistent volume;
  leave the original stack and forward-only schema history intact. Nothing was deleted.
