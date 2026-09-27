# Sales / POS ownership and retry contract

Status: implemented sales safeguards and bounded original-tender POS returns;
**not a complete sale-to-return lifecycle certification**.

## Ownership

- `sales_records` is the commercial summary read by Sales, Cartera and reporting.
  `source_type` is server-owned: `SALES` for CRM creation and `POS` for POS checkout.
  Folio prefixes and client metadata are not authority.
- POS creates its summary, ticket, lines, captured payments, inventory movements and
  expected shift cash in one transaction. The customer's validated contact ID is
  retained on new summaries.
- A POS summary is read-only through generic Sales update/delete. This includes totals,
  lines, dates, scope, notes, commissions and operational status fields submitted through
  that generic route. Owning domain services retain their explicit contracts.
- The database permits at most one ticket per commercial sale and requires the linked
  company to match. Nullable historical links are retained, not manufactured or deleted.
- Existing commercial-summary read permissions are preserved. A Sales summary does not
  grant permission to operate POS. POS routes retain capability, module/tab, session,
  scope and CSRF enforcement.
- Cartera's production candidate list comes from its backend owner. The browser must not
  merge already-paid or cancelled sales back into an authoritative candidate response.
- POS `completed` / `captured` are displayed as POS execution/registration, not relabeled
  as an unrelated CRM approval or proof that a credit installment was collected.

## Checkout retries

- First-party checkout sends `Idempotency-Key` with 16–100 ASCII letters, digits, hyphens
  or underscores. The browser retains the key through uncertain failures, including remounts
  within its tab session. Only a digest and random key are persisted, not payment/customer data.
- `pos_checkout_requests` binds company + key to actor + request digest. Its receipt and
  checkout effects commit in the same transaction. A duplicate key serializes on its database
  record; a different payload/actor is rejected. Failed checkout rolls the receipt back too.
- Replay returns the saved receipt only after rechecking current ticket scope, even when the
  original shift has closed. A new checkout locks and requires an open shift.
- `GET /api/v1/pos/sales/checkout/{requestKey}` recovers a committed receipt for its original
  actor and current tenant/scope. An absent receipt is not evidence that an in-flight request
  will never commit; never automatically issue a new key on that basis.
- If the cart changed after an uncertain result, the UI retrieves the earlier committed ticket
  without charging or clearing the changed cart. It does not manufacture a success on failure.
- Headerless legacy clients remain compatible but do **not** gain automatic deduplication.
  External integrations must adopt durable request identities before being certified.
- Square retains its separate checkout provider-intent/finalization contract. The refund
  contract below is independent; retrying checkout never initiates a refund.

## Original-tender returns (approved 2026-09-17)

Product decision: return money through the original payment method, never automatically
convert it to customer credit. The first supported operation is a **full POS ticket return**,
with the original shift open, stock received in restockable condition, and the sale neither
posted to accounting nor in a closed accounting period. Admin authority is required in
addition to POS capability, `pos.sale`, company/object scope and session CSRF.

- Backend snapshots each original payment's amount, currency and method; the browser
  cannot choose the destination method or refund amount. Mixed CASH/TRANSFER retains
  the original split. CREDIT/WALLET and mixed card payments fail closed.
- CASH requires explicit operator confirmation that the money was handed back. TRANSFER
  requires a refund reference for each original transfer. This records operator evidence;
  it does **not** execute or independently verify a bank transfer or inspect a recipient account.
- CARD requires the company's approved Square intent linked to this exact ticket, with
  matching amount/currency and an original provider payment ID. It uses a persisted provider
  idempotency key and the original `payment_id`, never a replacement destination.
- Square network calls occur outside database transactions, after the PROCESSING identity
  commits. PENDING is not success. Known refunds are queried by ID; uncertain requests retain
  the same key. FAILED/REJECTED never become cash refunds or new automatic provider attempts.
  The operator can query pending status again; there is no unattended refund reconciler yet.
- Verified provider completion is committed before final inventory/cash effects, so a local
  inventory failure can be retried without issuing another refund. A completed provider refund
  whose local finalization fails remains visibly pending and blocks the original shift.
- Finalization atomically claims the return, restores original quantities to the original
  warehouse at historical cost (weighted with current stock), voids original POS payments,
  cancels the ticket/commercial summary and records inventory `returned` / movement `reversed`.
  History is retained. Cash is reduced only by the original CASH portion; card/transfer returns
  do not become cash withdrawals. Cash cuts show net sales and a separate refund total, not a
  second refund subtraction.
- Preparation/cancellation has no stock or cash effect. Parent records retain reason, creator,
  initiation, completion and cancellation actors/times; payment records retain evidence and
  provider identity. Completed returns cannot be cancelled or recreated for the same ticket.
- Checkout, returns, cash withdrawals, shift closure and accounting posting/period closure
  serialize through the company lock before their reads/shift locks. This deliberately trades
  some company-level write throughput for consistency; load testing remains a release concern.
- Pending returns block cash cuts, withdrawals and accounting readiness. A shift with tickets,
  cash movements or inventory receipts cannot be cancelled to bypass its normal cash cut.

`POST /api/v1/pos/returns` prepares; `POST /{id}/confirm` confirms original-tender evidence;
`POST /{id}/cancel` cancels a preparation or a terminal provider rejection, never an uncertain
provider request. Scoped GET routes recover active returns and receipts. Frontend reports
success only from backend COMPLETED, with localized status and original method labels.

Remaining explicit boundaries: partial returns, closed cash cuts, already posted accounting
reversals, credit/Cartera and wallet reversals, damaged/non-restockable goods, automated bank
refunds, and end-to-end Square sandbox certification. These are rejected, not simulated.
No new sales-concentrator or channel-manager module is introduced here.

## Migration and release

`V277` is forward-only and additive. It backfills origin using linked tickets or legacy POS
metadata, not sale-number prefixes. It deliberately fails on duplicate or cross-tenant
historical links rather than deleting/correcting financial history automatically.
`V278` adds return/payment/inventory evidence; `V279` adds initiation/cancellation audit fields.
All are additive, forward-only migrations. Once real provider refunds exist, an old application
version without this recovery flow is not a safe operational rollback: pause new refunds and
preserve/reconcile pending provider requests before enabling another financial workflow.

Run these read-only preflight queries against the intended database before deployment:

```sql
SELECT sales_record_id, COUNT(*) AS ticket_count
FROM pos_tickets WHERE sales_record_id IS NOT NULL
GROUP BY sales_record_id HAVING COUNT(*) > 1;

SELECT ticket.id, ticket.company_id, ticket.sales_record_id
FROM pos_tickets ticket JOIN sales_records sale ON sale.id = ticket.sales_record_id
WHERE ticket.company_id <> sale.company_id;
```

Both must return no rows. Follow `deployment/README.md`, take the documented backup,
apply schema before the new backend, then deploy the frontend. On application rollback,
retain additive schema and records; never edit an applied migration. Rollback to old code
also removes these ownership/retry guarantees and must not be treated as a certified closeout.

Verification: isolated `indice_test_db` integration tests in
`PosSalesIntegrityIntegrationTest`, `PosReturnAccountingIntegrationTest`, mocked
`SquareRefundServiceTest` / `SquareRefundGatewayTest`, existing Sales/POS/finance regression
suites, and `react/tests/pos-sales-integrity-regression.test.mjs`. No real provider refund or
functional/production database mutation is part of these tests.

## Verification and handoff (2026-09-17)

- Final selected backend run: **84 tests, 0 failures, 0 errors**, including return state,
  cash/transfer evidence, provider rejection/retry, inventory rollback/historical cost/currency,
  accounting eligibility, tenant scope, controller access, POS checkout, Cartera and migration
  uniqueness. Flyway started successfully on isolated `indice_test_db` through V279.
- Frontend selected POS/Sales/Cartera regressions: **110 passed**. TypeScript and production
  build passed. Build still warns about bundles larger than 600 kB; this is not a refund-flow
  validation failure and was not expanded into unrelated bundle work.
- Real provider refunds, Square sandbox end-to-end certification, manual browser walkthrough,
  load testing and deployment: **not performed**. No application restart, production data edit,
  commit or push is included. Functional database migrations remain a release step.
- Preserved: existing checkout payloads, source ownership protections, organization scope,
  payment amounts/currencies, historical cash cuts and journal entries. Existing unrelated KPI
  work in this branch was not changed by this refund implementation.

Primary changed files for this stage:

| Area | Files |
| --- | --- |
| Return transaction and recovery | `src/main/java/com/indice/erp/pos/returns/PosReturnService.java`, `PosReturnRepository.java`, `PosReturnCoordinator.java`, `PosReturnController.java`, `PosReturnDtos.java`, `PosReturnInventoryService.java` |
| Payment provider | `pos/square/SquareRefundService.java`, `SquareTerminalGateway.java`, `SquareHttpTerminalGateway.java` under the Java package above |
| Cash/shift coordination | `pos/shift/ShiftService.java`, `ShiftRepository.java`, `pos/cashmovement/CashMovementService.java`, `pos/cashclosing/CashClosingService.java`, `CashClosingRepository.java`, checkout company-lock order |
| Accounting boundary | `finance/reporting/PosReturnAccountingGuard.java`, `AccountingSourceRepository.java`, `AccountingSourceDiscoveryService.java`, `FinancialReportingService.java` |
| UI | `react/src/app/BasicModules/PointOfSale/Sale/components/ReturnModal.tsx`, `returnCopy.ts`, `Sale/services/posReturnsApi.ts`, `Sale.tsx`; Sales adapter/types/status styles and localized returned/reversed labels |
| Schema/access | `V278__pos_original_tender_returns.sql`, `V279__pos_return_transition_audit.sql`, `TabPermissionRouteClassifier.java` |
| Regression coverage | `PosSalesIntegrityIntegrationTest`, `PosReturnAccountingIntegrationTest`, `PosReturnControllerTest`, `PosReturnCoordinatorTest`, Square refund tests, cash/tab regressions, `react/tests/pos-sales-integrity-regression.test.mjs` |

Provider contract reference: [Square linked-payment refunds](https://developer.squareup.com/docs/payments-api/refund-payments).
