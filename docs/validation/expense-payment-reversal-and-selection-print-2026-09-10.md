# Expense payment reversal and selection printing

## Behavior and use

1. Open an ordinary expense with Edit. Under State control, choose **Deshacer último pago**,
   review its amount and the resulting balance, enter a reason, then confirm inline. The modal
   remains open and retains other draft edits. Save changes continues to save those separate edits.
2. The last registered effective payment is reversed, rather than assigning an arbitrary status.
   Earlier installments survive. The visible result is pending, overdue or partial according to
   the remaining payments and due date. No payment means no last-payment date/account projection.
3. The payment keeps its original evidence and amount/date/actor. It gains reversal time, actor and
   reason, and stays visible in the dossier. Repeated same-date/amount payments do not acquire
   evidence uploaded for an earlier reversed payment. A repeat reversal cannot restore money twice.
4. Treasury compensates the matching original movement, including an inactive original account.
   Paid capture or settlement without an account reopens debt without creating a bank deposit.
   Consumption, native currency, original expense date and budget impact are preserved.
5. Header **Acciones → Imprimir selección** opens the preview. It starts with selected rows when
   present, or all filtered results otherwise; the user can choose either scope. **Descargar PDF**
   and **Imprimir** use the same document definition. Current sort, selection across pages, visible
   data columns and active filters are preserved. Fund groups expand once into their source records.
   Native currencies have separate totals. The print flow uses quotation-style preview/actions and
   the shared jsPDF/AutoTable primitives; it does not change the quotation document.

## Boundaries and files

- Backend owner: `ExpensePaymentReversalService`, typed reversal request and controller, Treasury's
  single-payment reversal method, payment-history DTO/repository and fresh keys for keyless payments.
- Migration: **V273**, adding nullable reversal audit metadata to payment history. Forward only;
  applied by Flyway on the isolated test database and subsequently on the local preview database
  during the runtime correction below. No existing migration was edited.
- Projections: payment KPIs, accounting source discovery, subledger reconciliation and provider
  payable-kiosk payment lists exclude reversed payments. Expense correction retains historical currency.
- UI: `ExpenseFormModal` (**standard-form**) and its inline `ExpensePaymentReversalSection`;
  `ExpenseTablePrintModal` (**operational-workspace**) and module-owned report builder/copy.
  Header/table selection, API adapter and dossier history connect the two flows. No nested modal.
- Shared print additions are optional presentation properties: numeric alignment, row font size,
  row/summary continuity, issuer metadata suppression and continuation headers. Other documents retain
  their defaults. The report uses company text identity, A4 portrait/landscape, 9 pt table text,
  repeating headers, native totals and owned page numbers/footer.
- Frontend/backend canonical documents, modal inventory and print inventory record this decision.

Closed, audited, fund-owned, purchase-order and terminal expenses remain protected. An expense or
payment already posted to the accounting ledger needs the accounting adjustment workflow. Inconsistent
history or an unidentifiable bank debit fails atomically. No source expense is deleted by this action.

## Verification

- **125 distinct backend tests passed** across expense correction/service/controller, the new reversal
  controller, deletion, budget obligations, fund closeout, financial reports, monetary KPI repository
  and migration uniqueness. Coverage includes five native currencies, inactive original banks,
  no-bank correction, partial-payment preservation, repayment, stale versions, company/unit/payment
  ownership, posted-entry and source protections, Treasury mismatch rollback and concurrent retries.
- **143 frontend tests passed**: Expenses (84), Expenses UI (36), document printing (6), finance bulk
  actions and workspace memory (17). New interaction tests cover reason/confirmation, duplicate click,
  failure/retry, active-payment ordering, preserved evidence, selection/filter print scope, hidden
  columns, reference labels, mixed currencies, 125 rows, long text and blocked print feedback.
- TypeScript and Vite build passed. Backend compilation passed. `git diff --check` passed.
- Three-row and 125-row Spanish PDF fixtures generated and inspected through Poppler-rendered pages.
  The short fixture is one A4 landscape page. Long output retains complete rows, repeats company/table
  headers and keeps the native-currency summary together. Temporary fixtures remain outside the repo.
- The default `indice_test_db` had pre-existing Flyway history/checksum mismatches. No repair was run.
  Final integration tests used only `indice_budget_test_db` at loopback port **13319**. The restricted
  environment initially blocked that connection; the authorized rerun completed successfully.
- A new test fixture's integer/Long mismatch and an older UI assertion expecting four header actions
  were corrected; subsequent checks passed. Vite retains its existing large-chunk notices.

## Remaining validation limits

No browser was connected, so interactive desktop/mobile browser validation and physical printing
remain pending. Component event regressions and generated-PDF inspection are complete. The shared
PDF engine produces untagged PDFs with Helvetica; CJK PDF glyph coverage is not certified. The HTML
preview uses semantic tables and localized labels for all eight supported locales. No production
deployment or production-data mutation was performed. The local preview runtime update is recorded below.

## Local preview 404 correction

The user's reversal attempt returned HTTP 404 because the backend on port **8082** was still running
the older budget-obligations JAR started at 02:44. Vite on **5174** had already loaded the new frontend.
The old JAR did not contain `ExpensePaymentReversalController`. A request with no session and nonexistent
IDs reproduced the same 404, confirming that this was a missing route in the running application.

At 20:22, the current backend was packaged successfully and only the local backend process was
restarted, reusing the existing local service configuration. The preview database on **13320** was
backed up first. An existing invalid billing view prevented a conventional dump; the complete base
tables and all three view definitions were then backed up separately. No view repair was performed.
Flyway successfully applied the pending **V270–V273** migrations, advancing the preview schema from
269 to 273. The previous JAR and database backup remain available outside the repository.

The same unauthenticated reversal request now returns **401 Unauthorized** through both **8082** and
the frontend proxy on **5174**, confirming route availability and authentication protection. No real
expense payment was reversed as part of this check. Browser sessions may require login after the
restart; the authenticated browser confirmation remains for the user to retry.
