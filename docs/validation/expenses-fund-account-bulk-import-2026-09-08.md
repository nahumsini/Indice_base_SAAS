# Expenses: fund provenance, account classification and bulk capture

Status: implemented and verified locally on `fix/expenses-fund-account-bulk-import`.
Production deployment and merge into `main`: pending; no production records were modified.

## Findings and changes

- The accounting cell inherited the full expense draft-only edit restriction. It now offers a
  separate version-checked account-only action for ordinary published expenses without posted
  journal entries. Paid amounts, payment evidence, dates, currency and workflow status remain intact.
- Fund identity was absent from the frontend expense adapter. List/detail now carry server-resolved
  fund provenance from settlement relationships or a unique, same-company `PETTY_CASH` custody
  account. Shared ordinary bank/cash/card accounts do not establish fund origin. Internal fund accounts are
  locked and show the fund name. Legacy external managed fund expenses are excluded without deletion.
- Bulk capture previously sent one concurrent request per row and could close after partial success,
  losing the unsaved capture. Creation now uses one atomic request, at most 200 rows, with durable
  company/actor/payload-bound retry evidence. Automatic folios serialize per company. A bad row rolls
  back the batch. This closes the observed failure paths; the exact production request failure was
  not established from production logs.
- Bulk editing is atomic, checks each expense version, preserves existing taxes and native currencies,
  and keeps protected source records out of the operation.
- Entry dates display day/month/year and accept ISO, compact dates and Excel serial dates without a
  timezone-induced day shift. Payment/accounting columns use searchable selectors; payment accounts
  are active, company-owned, in the row's currency, and exclude fund custody accounts.
- Imported expenses remain pending. Selecting a payment account preselects a later payment; import
  itself does not withdraw money. New batches use the preferred currency captured when opening the
  modal, and editing preserves each existing expense's native currency.

## Data and accounting boundaries

`V265__expense_import_batches.sql` creates one company-owned retry-evidence table. It does not alter,
backfill or delete existing expense/fund/payment records. Flyway startup and migration uniqueness
passed on the isolated test schema; local application startup moved from V264 to V265 successfully.
The previous backend can ignore the additive table if a local rollback is needed; never undo an
applied versioned migration.

Posted journal sources remain protected and require a dedicated accounting adjustment. This change
does not rewrite or reverse posted journal entries. Classification and financial synchronization
share the company lock to prevent a posting/reclassification race. The classification audit is
server-owned and survives ordinary draft updates.

## Validation

- 138 backend tests in 24 suites passed, including Expenses, Funds, accounting/reporting and migration
  uniqueness. Executed with `TEST_DATASOURCE_URL` pointing only to
  `127.0.0.1:3308/indice_closeout_v2_test_db`; a clean, sequential Maven package completed.
- 57 frontend tests passed: bulk import, expense workflows/carryover, Expenses UI and Petty Cash UI.
- TypeScript validation and Vite production build passed.
- Chrome with synthetic data: 35-row paste, account search/selection, native-currency filtering,
  failed-save capture retention, stable request key on retry, double-click protection, ordinary paid
  account selection, locked fund label, invalid edit date remaining visible, and mobile table layout.
- Local backend and frontend proxy `/api/v1/health` both returned HTTP 200 with `status: ok`.
  Frontend login and local mail inbox returned HTTP 200. Existing authentication and mail settings
  were preserved during the local backend restart.
- Intermediate failures: MySQL collation compatibility was corrected; test fixture expectations were
  corrected; an overlapping compilation invalidated compiled test classes, resolved with the clean,
  sequential Maven run. No outstanding test/build failures remained in the validated package.

Browser evidence for this local session: `/tmp/indice-expenses-qa/import-retained.png`,
`/tmp/indice-expenses-qa/edit-accounts.png`, `/tmp/indice-expenses-qa/mobile.png`.

## Files and handoff

Implementation is scoped to Expenses frontend components/adapters/services, Expense backend DTOs,
repositories/services/controllers, the source-posting lock in Financial Reporting, V265, related
tests, and the canonical backend/frontend and fund-domain contracts. Unrelated local work is untouched.

Release/rollback execution: N/A for this local correction; use `deployment/README.md` before release.
Production UAT: pending deployment. No production financial writes were used for testing.
