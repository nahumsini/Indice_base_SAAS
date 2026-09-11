# Petty Cash: multiple managed assets

## Delivered behavior

Create fund → Owner → Managed assets accepts up to 50 rows, each with required type/name
and optional reference. Add/remove remains in the same modal. Back preserves rows; review
shows each asset. Existing funds can add, edit or clear rows. API persists the complete list
and projects the first row into legacy scalar fields. Statement preview and PDF read the
historical collection; new cuts capture the current list. PDF title spacing also follows its
wrapped height to prevent overlap in the longer external-fund heading.

Money, budget consumption, permissions, tenant boundaries, currencies and previous statement
snapshots are preserved. No new endpoint, accounting transaction or independent asset catalog.

## Changed areas

- `PettyCashFundsWorkspace.tsx`, new `ManagedAssetsEditor.tsx` and `utils/managedAssets.ts`.
- Petty Cash types and service adapter; reconciliation snapshot creation, statement detail and PDF.
- Petty Cash DTOs, mapper, validator, repository SQL/bindings and monthly statement scheduler.
- New typed `PettyCashManagedAsset` / `PettyCashManagedAssets` validation helper and V274 migration.
- Existing shared Finance error translations; frontend/backend canonical docs, modal inventory
  and `docs/petty-cash-managed-assets-contract-v1.md`.
- Focused wizard/API/PDF and database regression coverage; existing constructor fixtures and
  SQL placeholder expectations updated for the additive field.

Other uncommitted changes from this session were preserved.

## Verification

- 97 backend tests passed: `PettyCash*Test`, `FundExpenseCloseoutIntegrationTest`,
  `MigrationVersionUniquenessTest`. Latest reports include the focused rerun of the SQL contract
  after updating its expected parameter counts from the previous schema.
- Five new rollback-only integration cases cover save/reload/edit/clear, service and scheduled
  snapshots, legacy compatibility, tenant isolation, invalid collections and empty history.
- Database tests used only `127.0.0.1:13319/indice_budget_test_db`; Flyway applied V274 successfully.
- 40 frontend tests passed via `npm run test:petty-cash-ui`, including the real modal event
  handlers, transport adapter and PDF generation. TypeScript and Vite production build passed.
- Maven compilation/package and `git diff --check` passed.
- Rendered every page of synthetic PDFs with 3 and 50 assets (2 and 4 pages). Names/references,
  wrapped text, continuation tables, title spacing and page footers were visually inspected.
- Local preview was backed up before migration. V274 applied successfully to the preview;
  the previous JAR was retained. API runs on `127.0.0.1:8082`, frontend remains on port 5174.
- Through 5174: local demo login HTTP 200, Petty Cash HTTP 200 with array fields on every fund
  and statement, then logout HTTP 200. This check did not create financial test data.

## Failures resolved and remaining limits

The first database invocation was blocked by sandbox socket access; the authorized rerun used
only the isolated test database. Two old SQL contract expectations required the added parameter
count; both passed after updating them. A PDF QA fixture initially lacked its required status;
completing the fixture allowed rendering. Existing Vite bundle-size warnings remain.

An interactive browser was unavailable (`agent.browsers.list()` returned an empty list), so
modal verification used actual component handlers rather than a live browser session. Production
deployment: N/A. Production migration/rollback validation: N/A; this task updated local preview.
