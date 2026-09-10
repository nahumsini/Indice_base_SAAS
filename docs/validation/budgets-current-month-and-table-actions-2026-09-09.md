# Budget Control: current month and table actions

Status: implemented and verified locally. No production deployment.

## Behavior

- Period includes **This month / Este mes**. It uses the scheduled date of each
  budget line, includes both month boundaries, and retains Next month as the
  initial default. The existing workspace memory restores the period and filters.
- Multiple selection spans table pages and is pruned when filters exclude rows.
  Desktop and mobile selection use the existing shared table behavior.
- Shared Finance bulk modals support deleting unused lines, changing unit,
  business, provider, and accounting account. Targets are searchable. Payment
  accounts remain owned by the linked expense payment; the action explains this
  restriction instead of writing a non-existent budget payment field.
- Filtered and selected totals appear above pagination: planned, committed,
  actual, and available. The existing monetary API calculates them from explicit
  IDs. Native currencies remain separate. Failed totals show an error and retry,
  rather than displaying zero or stale amounts as a successful result.
- The Spanish health filter is labeled **Salud presupuestal**, distinguishing it
  from the budget lifecycle status filter.

## Ownership and preservation

The new `BudgetLineBulkActionService` owns one transaction for the complete batch.
It validates tenant, operating scope, active references, versions and lifecycle
before writing. It retains an audit record and increments versions. Deletion is
soft deletion with a reason. Lines with financial execution or linked funds cannot
be deleted or moved between units/businesses. Closed and archived lines cannot be
changed through this flow. Single-row table deletion uses the same owner.

Provider/accounting classification preserves original dates, amounts, currencies,
execution evidence and unrelated custom fields. It does not rewrite linked
expenses, payments or fund records. An explicit monetary selection includes visible
draft/closed lines; unfiltered central budget planning keeps its active-only rule.

## Files

- Frontend: `react/src/app/BasicModules/Expenses/Budgets/`, budget filters,
  translations, DTO adapter and budget service; additive retry support in
  `BasicModules/shared/kpiMonetaryApi.ts`.
- Backend: budget bulk DTO/controller/service and scoped repository locking;
  explicit budget selections in `BasicModuleKpiCurrencyRepository`.
- Tests: `BudgetLineBulkActionIntegrationTest`,
  `BudgetLineBulkActionsControllerTest`, `budgets-workspace-regression.test.mjs`,
  and the existing Expenses UI contract regression.
- Canonical references: Frontend Operating System and Finance bulk actions /
  workspace memory contract updated in the same change.
- New schema migrations: N/A.

## Verification

Automated database tests used the disposable MySQL database
`indice_budget_test_db` on loopback port 13319, not the functional database.

- 60 backend tests passed: `BudgetLineBulkActionIntegrationTest` (14),
  `BudgetLineBulkActionsControllerTest` (2), `BudgetLineServiceTest` (8),
  `BudgetLineControllerTest` (6), `BasicModuleKpiCurrencyRepositoryTest` (6),
  `FinanceBulkActionsIntegrationTest` (20), `KpiMonetaryFlowIntegrationTest` (3),
  and `KpiMonetaryScopeIntegrationTest` (1).
- 98 frontend tests passed: `test:budgets` (6), `test:expenses-ui` (24),
  `test:finance-bulk` (17), and `test:expenses` (51).
- TypeScript, Vite production build, backend compilation/package, and
  `git diff --check` passed. The build retains the existing large-chunk warning.
- Browser discovery returned no available browser. Component interaction tests
  and API flow verification passed; manual visual verification remains pending.

The local API flow also passed through the Vite proxy: demo password + local-mail
MFA, budget creation, a linked paid expense, atomic bulk classification, CSRF
rejection, stale-version rejection, bulk soft deletion of disposable lines, and
filtered/selected monetary aggregation. The demo month has MXN 5,000 planned,
1,250 actual and 3,750 available. Selecting the materials line yields MXN 2,000
planned, 1,250 actual and 750 available. A next-month line is retained to check
period isolation. These fixtures exist only in the isolated local preview.

## Local runtime and historical compatibility

- Frontend: `http://localhost:5174/expenses/budgets`.
- Backend: loopback port 8082; local mail inbox: `http://localhost:8025`.
- Preview MySQL: container/volume `indice-budget-preview-20260909`, loopback port
  13320, database `indice_budget_preview_20260909`, dedicated database user.
- The original local `indice_db` was backed up before preparing the preview and
  remains unchanged. The runtime uses its isolated copy because the prior port
  3307 was shared by Docker and an SSH forward.
- The old local history recorded `training_program_progress` as V206, while the
  current tree contains the identical migration as V208. Its checksum 983707971
  matched exactly. Only the disposable copy's history entry was reconciled to
  V208 after saving the original history; no repository migration was edited.
  Flyway then applied the missing existing migrations, including V206/V207,
  and started successfully at V268. This is local compatibility work, not a new
  migration required by the Budget Control changes.
- Private local backup/runtime evidence is under `/tmp/indice-budget-local/runtime/`.
  Runtime credentials, sessions, database dump and OTP values are not committed.

Initial local startup attempts failed on the conflicting database port and then
on the historical V206/V208 mismatch; each restored the previous service. The
isolated final runtime, frontend and API proxy all returned HTTP 200, and the
authenticated API verification above ran against that final runtime.

## Remaining limits

Manual visual inspection is pending because no browser was available. Production
release, production data changes, and remote access changes: N/A for this task.
