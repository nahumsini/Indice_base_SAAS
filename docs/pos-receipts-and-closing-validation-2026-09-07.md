# POS receipt and closing validation — 2026-09-07

Status: implemented and validated locally; not deployed to APPTEST or production by this change.
Branch: `fix/pos-receipt-and-closing-tickets`.

## Result

The paid merchandise receipt searches existing eligible products in the transaction currency, including physical products/packages that require explicit inventory activation. Activation happens only for the selected product in the receipt transaction. Product IDs, packaging, prior balances, reservations, cost history, sale visibility and unrelated configuration remain intact. Services and untracked internal operational items are not silently converted into stock products.

The active backend shift selects its own register synchronously. Its code, name and warehouse cannot be borrowed from the first register returned by the catalog. The backend also rejects a register whose warehouse or organizational scope differs from its open shift, and locks the shift while receiving merchandise to serialize with closing.

Confirmed receipts open an 80 mm ticket using persisted lines, amounts, currency, provider and operation identity. The same ticket is available from the shift receipt history. Closing opens a ticket retrieved from the saved cash closing; Cash Closings also offers an individual 80 mm reprint. Blocked printing and failed post-close reads can be retried without resubmitting the operation. Printing remains the browser dialog, including its Save as PDF option.

The existing shared HTML engine now detects readiness from the opener, because replacing the initial document of a reserved print window can discard its previous load listener. The print call is guarded against duplicate execution. Existing print generators continue to use this same engine.

## Verification

| Check | Result |
| --- | --- |
| Frontend regression: `node --experimental-strip-types --test react/tests/*.test.mjs` | 409 passed, zero failures/skips |
| Frontend TypeScript and Vite build | Passed |
| Backend POS regression: `./mvnw '-Dtest=com.indice.erp.pos.**' test` | 217 passed across 47 suites, zero failures/skips |
| Backend package | Passed |
| Database isolation | Only `indice_closeout_v2_test_db` on localhost:3308 for database tests; transactions rolled back |
| Real React components in Chrome with synthetic API responses | Passed: correct register on initial render; explicit activation; double-click receipt and close; automatic print; reprint; receipt history; blocked-popup recovery; failed post-close read retries GET only |
| Real backend + isolated MySQL | Passed: existing product activation, quantity/reservation preservation, weighted cost at existing database precision, one payout on replay, native-currency rejection, company isolation, same warehouse validation, receipt followed by one persisted closing |
| Ticket visual review | Desktop and 390 px mobile; thermal content stays inside preview width |
| Local service health after restart | Frontend 5174, backend 8082, frontend API proxy, mailbox 8025: HTTP 200 |
| Schema/Flyway | No migration files changed; local startup at V264, pending 0, failed 0 |

The initial inventory assertion expected four decimals, while the existing inventory balance column stores two; the assertion was corrected to the existing persisted precision, with no schema or monetary behavior change. Browser checks also exposed and verified the print-window readiness correction. A prior presentation-only regression forbade receipt history; it now permits the authorized read-only ticket history while continuing to prohibit reversal in the operational modal.

A separate smoke attempt with the documented demo credentials reached HTTP 401 after obtaining CSRF; no password or MFA settings were changed to obtain access. Therefore authenticated UAT in the user's existing local company is not claimed. Component flow tests and the isolated real backend tests are the verified evidence above.

## Files and behavior preserved

- Receipt API/controller/DTO/service/repository: additive eligibility and consent fields, tenant-scoped lookup, native currency filtering, transactional activation, saved ticket metadata, and shift locking. Existing routes, CSRF/permissions, tax calculation, idempotency, payouts and reversals remain in their owners.
- `useSaleRegisterContext.ts`, `useSaleShift.ts`, `posShiftMappers.ts`, `Sale.tsx`, `CloseShiftModal.tsx`: consistent shift context and post-close ticket flow. The existing close action label and its translations are retained. Null counts remain unknown rather than becoming zero; a stored zero difference is preserved.
- `PaidInventoryReceiptModal.tsx`, `OperationTicketPreview.tsx`, `ShiftClosingTicketModal.tsx`, `posOperationTickets.ts`, `CorteDetailModal.tsx`: receipt and closing print/reprint presentation.
- `documentHtmlPrintEngine.ts`: reliable readiness and one print call for reserved windows.
- Regression tests, the receipt owner contract, and the print inventory document describe and verify the change.

No production records, bulk product flags, stock balances, credentials, migrations or unrelated worktree files were edited. The local backend was restarted with its original environment, read in native null-delimited form; its authentication and email policy were preserved exactly. The previous executable remains available for local rollback.

## Remaining checks

- Physical printer/paper configuration: not available to this session; browser dialog and document output were verified.
- APPTEST and production rollout: pending; no release tag or deployment was performed for this feature.
- Authenticated UAT with the user's current local credentials: pending; no access bypass or credential reset.
