# Expenses column preferences — 2026-09-23

Status: local change; not deployed. Approved UI classification: existing `ColumnsModal` system utility.

## Behavior

The Expenses Columns action now preserves the applied visibility and order for the authenticated
company and user in the existing workspace-state API (`expenses` / `expenses-columns`). This entry
has no expiry. The separate navigation/filter entries retain their existing 90-day expiry.
A scoped browser cache supports restoration if the network is unavailable. Legacy browser-only
choices are claimed once, migrated without resetting a real customization, and reconciled against
known column identifiers. New optional columns remain hidden in an existing custom layout.

Apply waits for the server; failed requests leave the draft open with a localized retry message.
Duplicate submissions are blocked. Restoring server preferences cannot replace a more recent
Apply or cross an authentication scope change. Migration and explicit saves are serialized.
The modal keeps draft visibility, ordering and search while its parent refreshes. Dragging uses
column identities and functional updates so queued hover events cannot move an unrelated column
through stale positional indexes. Cancel discards
the draft; Restore defaults takes effect only after Apply.

The table previously rendered factory order despite accepting drag order in the modal. Headers,
ordinary expense cells and fund group cells now use the same saved order, including money columns
placed apart from one another. Selection and actions retain their fixed table positions.

## Preserved

Expense records, calculations, dates, payments, filters, routes, API response shapes, tenant/CSRF
checks and permission rules are unchanged. The existing shared columns modal is reused. Other
modules retain their own persistence; shared modal draft/save handling receives regression checks.
Width resizing is outside this button's visibility/order configuration and is not changed here.
No schema migration or deployment configuration change is needed (N/A).

## Files

- `react/src/app/BasicModules/Expenses/hooks/useExpenseColumns.ts`: scoped restoration, migration,
  confirmed saving and race guards.
- `react/src/app/components/rh/ColumnasConfigModal.tsx`: stable drafts, awaited save, localized errors.
- `react/src/app/BasicModules/Expenses/components/table/ColumnConfigurationModal.tsx` and
  `react/src/app/BasicModules/Expenses/Expenses/Expenses.tsx`: propagate asynchronous Apply.
- `react/src/app/BasicModules/Expenses/constants/expenseTableConfig.ts`,
  `components/table/ExpenseTableHeaderRow.tsx`, `components/table/ExpenseAmountCells.tsx`,
  `Expenses/components/EditableExpenseRow.tsx`, `Expenses/components/ExpenseFundGroupRow.tsx` and
  `Expenses/components/ExpenseTable.tsx` under the Expenses root: render the selected order.
- `src/main/java/com/indice/erp/workspace/UserWorkspaceStateService.java`: no expiry for the specific
  Expenses columns entry, preserving the existing tenant/user boundary and navigation retention.
- `docs/indice-frontend-operating-system-v2.md`: document the durable preference contract.
- `react/tests/expenses-columns-memory.test.mjs`, `react/tests/expenses-fund-grouping-regression.test.mjs`,
  `react/tests/expenses-filter-browser.mjs`, `react/package.json` and
  `src/test/java/com/indice/erp/workspace/UserWorkspaceStateServiceTest.java`: regression coverage.

## Verification

- New regression cases reproduced the old persistence/draft failures before changes.
- Node regression suite: 223 passed (Expenses, payable capture, budgets, Finance workspace memory,
  and shared-modal consumers in HR, Sales and Receivables).
- Column lifecycle tests cover logout cache cleanup, user isolation, delayed restore, failed
  save/retry, legacy migration/remount, invalid saved columns, unavailable browser storage,
  background modal refresh, cancel/reopen, duplicate Apply, rapid drag events, company isolation and
  a save finishing after an authentication change.
- Server: `./mvnw -Dtest=UserWorkspaceStateServiceTest test` — 4 passed; backend/test compilation passed.
  Uses mocked JdbcTemplate, not a functional or production database.
- TypeScript and Vite build passed. Existing bundle-size advisory remains.
- Headless Chrome with the full Expenses page in React StrictMode: passed with 1,200 synthetic
  expenses, 200 rows per page and zero runtime errors. The final run included two filter/sort
  cycles plus column selection, native drag, background refresh with an open draft, failed-save
  retry, tab remount, clearing filters, clearing browser storage/reloading from the server,
  Restore/Cancel and Restore/Apply. Month rollover and mobile filter checks also passed.
  The fixture intercepted all API traffic; 199 monetary requests, 139 cancelled.
- `git diff --check` passed. No remaining test failures. The pre-existing bundle-size advisory and
  Java/Mockito deprecation notices do not fail compilation or tests.

## Limits

The changes are local and require a backend/frontend release before they affect app.indiceapp.com.
Automated requests use synthetic records; this is not validation against the user's production data.
Saving requires a successful server response; offline changes stay in the modal for retry.
