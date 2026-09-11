# Petty Cash fund classification stages

## Delivered behavior

- Fund creation is a short wizard: type, configuration and review for internal funds; external
  funds add the owner/statement identity step. New funds start at zero. Permanent funding and
  spending-method lists were removed from the current create/edit flow.
- Every entry chooses its origin in the operation modal. Internal and external funds can receive
  money from an eligible company Payment Account. External funds can additionally receive named
  **Medios externos**. An entry increases the fund once; a captured exit decreases it once;
  receipt approval never moves the balance a second time.
- Internal receipts create the company Expense and budget impact. External receipts are validated
  for the administered statement and stay outside company Expenses, accounting and budget.
- An existing fund can schedule a prospective internal/external type change inside its edit modal.
  The operation requires the target configuration, effective date, reason and current version;
  it preserves fund ID, currency, custody and exact balance. Only one change can be pending and it
  can be cancelled from the same modal.
- Activation seals the prior classification stage and opens the new one with the carried balance.
  Statements retain immutable type/configuration snapshots, so historical receipts never change
  accounting treatment. An empty statement at the boundary is reused to avoid overlapping dates.
  Operational statement states, including `PARTIALLY_SETTLED`, `SETTLED` and `SHORTAGE`, are sealed
  correctly when they contain the prior stage's activity.
- Company-owned cash subtracts external-fund balances held in company custody accounts. An internal
  account transfer to an external fund reduces owned cash; an external-media deposit increases
  custody and administered balance equally and leaves owned cash unchanged.
- Closing a positive balance now requires the destination for that closing operation. Either fund
  type can return to an eligible company account; external funds can return to a named external
  destination. The statement detail and PDF show the selected origin/destination.
- Existing legacy source/method values are retained by ordinary edits for compatibility, but new
  funds and new classification stages store them empty. Multiple managed assets remain available
  in create/edit and are snapshotted per statement.

The executable rules and release boundary are recorded in
`docs/petty-cash-fund-classification-stages-v1.md` and the Petty Cash domain contract.

## Persistence and API

- V275 adds the fund and statement stage identity, immutable statement configuration JSON and the
  tenant-scoped type-change audit table. It is forward-only and does not rewrite existing IDs,
  balances, movements, receipts or statements.
- Protected Finance read/write endpoints list, schedule and cancel type changes. Existing auth,
  company/scope checks, CSRF rules, row locks and transaction boundaries apply.
- Closing accepts an explicit company destination or external destination name. Legacy source
  fields remain a compatibility fallback for older clients.

## Verification

- **60 focused backend tests passed** across type transitions, origins, closing destinations,
  multiple assets, service behavior, SQL contracts and migration-version uniqueness.
- **110 broader Finance regression tests passed** across expense correction/reversal/deletion,
  budget integration, fund expense closeout, statement close resolution, financial reporting,
  Treasury-facing monetary KPIs and tenant/currency boundaries.
- The five type-transition integration scenarios cover both directions, preservation of earlier
  accounting, later-stage treatment, pending receipt/stale-version guards, cancellation audit,
  custody preservation and the empty-statement boundary.
- Closing regressions cover explicit internal-account and named external destinations, preference
  over legacy defaults, tenant isolation and currency/account validation before mutation.
- Database tests used only `127.0.0.1:13319/indice_budget_test_db`. Flyway applied V275 there and
  the migration uniqueness checks passed.
- **46 Petty Cash frontend regressions passed**, including all eight locale variants of the wizard,
  change-type edit flow, per-entry origins, closing destinations and statement PDF output.
- TypeScript typecheck, Vite production build, Maven compilation and `git diff --check` passed.
  Vite retains its existing large-chunk warning.

## Local preview correction and release boundary

The first manual create attempt reached the older `indice-managed-assets.jar` runtime and returned
HTTP 400 because that V274 backend still required the permanent external source removed from the new
wizard. The modal preserved its in-memory draft but its message incorrectly claimed local persistence.
The error copy now asks the user to review and retry, generic HTTP 400 responses explain that form data
needs attention, the review calls the account **Fund custody**, and its footer labels the amount as the
fund limit so it cannot be mistaken for the zero opening balance.

Before updating the local preview, all tables and the three view definitions were backed up outside
the repository with restricted permissions. The current JAR was packaged and installed on local port
8082, while the prior JAR was retained. Flyway applied V275 to the dedicated preview database on port
13320 in 117 ms. Health returned HTTP 200; an authenticated read-only check through frontend port 5174
returned HTTP 200 for login, workspace and the new type-change history route. It saw two existing funds
and performed no financial mutation. Restarting the backend invalidated the previous in-memory browser
session, so the open browser must sign in again before retrying its preserved draft.

No production deployment or production-data mutation was performed. Interactive browser and physical
printer validation remain separate from the completed component/API/PDF tests. Production promotion
must run the normal backup and Flyway checks in `deployment/README.md`, deploy a V275-aware application
image and retain a V275-aware rollback image once a same-month type transition is used.
