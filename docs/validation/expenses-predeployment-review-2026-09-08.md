# Expenses predeployment review — 2026-09-08

Status: source review and local verification complete; release gates below remain pending.
No commit, merge, image publication, production migration,
or application deployment was performed during this review. The working branch is
`fix/expenses-fund-account-bulk-import`; fetched `origin/main` and HEAD both point to
`7730c4991a83b6014024539e6854fc00257ce518`.

## Scope and integrity review

The pending release includes fund provenance/account classification, atomic expense import/edit,
day/month/year capture, searchable account selectors, and period grouping of authorized internal
fund expenses. Grouping is a display operation over existing receipts, separated by fund and native
currency. Monetary aggregates remain backend-owned. It does not create consolidated expense records
or rewrite original financial amounts, dates, payment evidence or currencies.

`V265__expense_import_batches.sql` only adds durable import retry evidence with company/request
uniqueness and company/user foreign keys. Both remote databases are currently at successful V264,
the new table is absent, and their foreign-key parents use compatible signed BIGINT/InnoDB columns.
The migration has already passed local Flyway startup; its contents were not modified in this review.
Application rollback may retain this additive table; never reverse an applied Flyway migration.

## Compatibility issue found and corrected

Read-only production inspection found historical funds referencing ordinary BANK, CASH and
CREDIT_CARD accounts. The initial fallback query inferred a fund from any referenced payment account.
An initial check of accounts shared by multiple funds identified four affected expense candidates;
the complete check, including accounts linked to only one fund, identified **46 nondeleted expenses**
without settlement relationships (43 BANK, two CASH, one CREDIT_CARD). None had a PETTY_CASH audit
marker. Attributing these records by payment account alone could hide or group ordinary expenses and
incorrectly lock their accounting classification.

The corrected lookup prioritizes same-company settlement evidence. Its legacy fallback requires
an actual PETTY_CASH account linked to exactly one fund. It does not choose the first fund when the
account is ambiguous. Ordinary accounts remain valid for imports when active, company-owned and in
the expense currency, even if historical funds reference them. Real custody accounts remain excluded
from bulk import; PETTY_CASH audit markers continue to protect unresolved historical receipts.

The corrected SQL ran successfully against both remote databases in read-only transactions. It
resolved 26 production expense records to internal funds and left 317 ordinary/unresolved records;
APPTEST returned two internal-fund and 15 ordinary/unresolved records. Neither database had ambiguous
PETTY_CASH custody accounts. These are nondeleted-record counts, not financial balance assertions.

Five additional database regression cases cover ordinary BANK/CASH/CREDIT_CARD accounts shared by
internal and external funds, import/classification with preserved balances, ambiguous custody
accounts, and authoritative settlement provenance despite a shared legacy bank account. They run
only on the isolated test schema at port 3308, never the functional or production databases.

## Remote baseline

- Production and APPTEST backend/web containers still run commit 7730c4991a83, with no backend restarts
  at inspection. MCP and object-storage services were left unchanged.
- VPS free space was approximately 49.5 GiB, above the deployment script's 10 GiB minimum.
- Read-only baseline counts, including retained/deleted records: production 360 expenses, 198 payment
  records, 23 funds and 46 journal entries; APPTEST 19 expenses, 14 payments, six funds and no journals.
- Catalog-price and subscription-query fingerprints were captured for subsequent release comparison.
  No billing catalog, subscription, financial record, environment secret or object was changed.
- A separate temporary Ed25519 deployment key was generated locally. Only its public authorization
  line is handed to the operator; it disables forwarding/PTY and expires on 2026-09-09 at 21:51:53 UTC.
  Server OpenSSH 9.9 supports this expiry mechanism. The new key has not yet been installed/tested.

## Verification

- Final full backend run: **1,844 tests in 383 suites; zero failures, errors or skips**. This includes
  Expenses, Funds, financial reporting, tenant/authorization checks and migration uniqueness. All
  database integration tests used the isolated `indice_closeout_v2_test_db` on port 3308.
- Focused provenance/import suite: 14 tests passed after the compatibility correction.
- All frontend regression files: **425 passed, zero failed**. `npm run test:expenses` separately
  passed 33 cases; its package script now includes bulk-import and fund-grouping regressions so
  the existing CI entry point runs these cases.
- TypeScript (`npm run typecheck`) and Vite production build passed after the final source changes.
- Sequential backend packaging (`./mvnw -q -DskipTests package`, after the successful full suite)
  passed. Local candidate JAR SHA-256:
  `579e61805696fcd48213be680a5f9732ffb06c7f41e540c3cab9758527e9693f`.
  This is a reviewed local artifact, not an immutable published release or evidence of main/CI status.
- Prior Chrome evidence for the unchanged grouping UI: 14 flow checks passed using real components
  with synthetic/intercepted data, including mobile layout, expansion, native currency, paging,
  filter behavior and retry. This is not authenticated production UAT.
- `git diff --check`, shell syntax checks and Compose validation using the example environment
  passed. No real-environment full preflight or exact-commit CI run was claimed.
- One intermediate full backend run had one error in
  `StorageQuotaIntegrationTest.reservesCommitsAndReleasesWithoutDoubleCounting`: the mocked object
  store reported an uploaded object missing. The isolated five-test suite then passed and the full
  1,844-test rerun passed without storage-code changes or skipped tests. Root cause is not confirmed;
  retain this as an intermittent-test concern and explicitly exercise attachment upload/read during
  APPTEST acceptance. The initial pre-correction full backend run had also passed all 1,839 tests.

Session logs: `/tmp/indice-expenses-release-full-tests-confirmation.log`,
`/tmp/indice-expenses-release-full-tests-final.log` (intermediate failure),
`/tmp/indice-expenses-release-storage-recheck.log`, `/tmp/indice-expenses-release-origin-tests.log`,
`/tmp/indice-expenses-release-frontend-tests.log`, `/tmp/indice-expenses-release-expenses-ci-tests.log`,
`/tmp/indice-expenses-release-typecheck.log`, `/tmp/indice-expenses-release-build.log`.

## Remaining release gates

1. Commit/review the scoped changes and publish immutable backend/web artifacts for that exact
   commit. Exclude the unrelated `elcorazondelcaribe-local/` worktree content and all private material.
2. Run the canonical preflight against the real environment for the intended host-network topology.
   Shell/Compose-template validation alone is not a production approval.
3. Capture fresh database and object-storage backups and verify an isolated restore. Retain the
   currently active images and containers for application rollback. The previous September 7 backup
   is historical evidence, not a substitute for a fresh backup.
4. Dry-run deployment, then deploy APPTEST with its own database/ports. Verify Flyway V265, public
   smoke checks, authenticated import/retry/account-classification flows, fund summaries/details,
   and attachment upload/download.
5. Only after APPTEST passes, deploy production with the same artifacts, preserve all data volumes,
   and repeat public checks plus financial/billing baseline comparisons. Do not seed, recalculate,
   delete or rewrite historical business data as part of deployment.

Relevant contracts: `deployment/README.md`, `docs/indice-public-release-security-gate.md`, frontend
and backend operating systems, and the Expenses petty-cash domain contract. Production financial
UAT and a fully approved release gate remain pending; passing local tests does not replace them.
