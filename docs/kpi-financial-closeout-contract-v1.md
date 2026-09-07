# KPI and financial flow closeout

Status: approved scope and product decisions, 2026-09-06.
Scope: Dashboard, Human Resources, Processes and Tasks, Sales, POS, Inventory,
Expenses, Funds, Receivables, and KPIs. Production, Material Warehouse, and other
complementary modules are outside this release.

## Preservation and ownership

Keep the existing application structure, navigation, operational workflows, draft
Expenses/MCP behavior, permissions, records, identifiers, and document history.
Each module remains the owner of its operations. KPIs reads explicit owner
contracts; the local tabs, executive dashboard, matrices, and reports must agree
when they describe the same metric, scope, and period.

Changes are corrective and incremental. Data migrations are forward-only and
must be rehearsed against an isolated restored copy as well as an empty database.
An inconsistent local Flyway history is not permission to rewrite migration
history, reset the database, or alter an applied migration.

## Currency boundaries

- Transactions, payments, accounts, fund statements, and documents retain their
  native ISO currency and amounts. An account movement requires the same currency
  as its account. Changing display preference never changes stored operations.
- Monetary analytics aggregate each native currency separately, retain that
  breakdown, and convert only the analytical presentation using identified rates.
  Missing rates produce partial/unavailable results, never an assumed 1:1 rate.
- Counts and averages use the same included population as their numerator.
- Accounting has a stable functional currency and preserves native amounts and
  dated conversion evidence. A display preference must never revalue posted
  entries or closed periods. Unsupported historical conversion is explicit.
- Company fiscal country, transaction tax jurisdiction, functional currency,
  display currency, and interface language are independent attributes.

## Funds, expenses, and budgets

- INTERNAL_COMPANY funds belong in company financial indicators.
- EXTERNAL_MANAGED funds and their validated receipts belong to the external
  owner's statement. They never become company expenses, budget consumption,
  company revenue, or company liquidity. External operational visibility remains.
- Funding an internal fund transfers custody; it does not create an expense or
  change the authorized budget. No Sales-to-Funds link is introduced.
- Authorized internal receipts create one paid Expense with payment evidence
  linked to the existing fund withdrawal, without another Treasury withdrawal.
- Budget availability is `planned - committed - actual`. Issued and settled fund
  amounts remain separate operational disclosures, not additional consumption.
  This explicitly replaces the previous budget formula that subtracted
  `(pettyCashIssued - pettyCashSettled)` from availability.
- Actual expense includes APPROVED, PARTIALLY_PAID, PAID, and CLOSED. Captured
  totals may include drafts when explicitly labelled. Draft workflows are kept.
- Payments in a period are selected by payment date; expense recognition uses
  expense date. Outstanding balances identify whether they are current or as-of.
- The Expenses operational list's `this_month` view includes current overdue balances
  from expenses dated before the first day of the month, including previous years.
  Search, unit, business, provider and status filters still apply. Settled, zero-balance,
  closed, cancelled and rejected records cannot be carried as overdue debt. Partial
  payments carry only the remaining balance. Historical period filters retain their
  expense-date meaning; this view is not an as-of historical balance calculation.
- Carryover is identified as prior balance in desktop and mobile rows. The period-total
  KPI queries only expenses originally dated in that period; open and overdue balances
  include the carryover once, with a separate prior-balance disclosure. All monetary
  KPI queries still use the central backend currency engine. Original dates, currencies,
  amounts, payments, accounting recognition and source records are unchanged. An empty
  selection is described as empty, never as proof that all obligations are settled.
  Partial payments refresh the monetary aggregates even when selected IDs do not change.
- Expense, due and payment dates are calendar dates, parsed and serialized without UTC
  day shifts. Audit timestamps retain their instant semantics. This affects presentation
  and round trips only; no stored dates are rewritten during rollout.

## Sales, collections, and reporting

- Cancelled, rejected, and voided sales do not contribute to valid sales totals.
- A sale, its collection, a credit installment, and a POS settlement are distinct
  facts linked by stable identifiers. Replaying a request cannot duplicate them.
- Confirmed Sales and Receivables collections use the Treasury owner contract,
  validating company, scope, account status, ownership, and native currency.
  Existing rows are not treated as new cash receipts during rollout.
- POS preserves unit-cost evidence and a compatible commercial-source contract.
- Accounting synchronization is idempotent; source cancellation or modification
  must be compensated or explicitly block readiness. Balanced entries alone do
  not establish complete source coverage or reconciliation.
- Existing matrices use attributable sales, cost, inventory, process, and people
  evidence. Missing evidence is unavailable/unclassified, not an invented score.

## Financial presentation and country labels

Keep the existing four financial statements and supporting analytics. Present
generic statements based on the configured IFRS for SMEs framework, with an
explicit version, periods, currencies, comparatives, and preparation notes.
Do not claim full IFRS compliance or local tax-filing certification merely from
the report layout. Income taxes, indirect taxes, and withholding remain distinct.

Fiscal labels use the company's fiscal country as a default and retain the
transaction's identified tax: MX (IVA/ISR), CA (GST/HST/PST/QST and income tax),
US (sales/use and income tax), CO (IVA/renta), BR (identified indirect taxes,
including dated CBS/IBS transition, and IRPJ/CSLL). Unknown historic tax detail
remains unclassified; never infer a tax from the display currency.

## Acceptance evidence

Each affected flow must connect operation, persistence, financial movement,
module KPI, central KPI/matrix, and applicable financial statement. Exercise
partial payments, returns/cancellations, repeated requests, period boundaries,
multiple native currencies, missing rates, and tenant/organizational permissions.
Compare retained records, relationships, documents, and native balances before
and after the migration rehearsal. Document any remaining limitation honestly.

## Explicit opening balances, adjustments, and cash control

An authorized corporate accounting user can preview a balanced opening or
adjustment with native currency, accounts, organization, reference, and reason.
Publishing requires the matching server preview fingerprint and an idempotency
key. Posted evidence is immutable, and closed periods reject new entries. The
workflow never updates inventory, payment accounts, Expenses, or receivables.
Opening entries use balance-sheet accounts; each native currency and assignment
must balance independently. Corrections require a documented compensating entry.

Company cash reconciles owned Treasury accounts (available plus pending), plus
cash retained after the latest POS closing. External custody is excluded. Open
POS shifts block company cash readiness until their closing. Shared accounts are
controlled at company scope. Historical cash and inventory reports explicitly
require their historical cuts; accounts payable and credit principal are
reconstructed by effective date. Generic preparation notes identify tax
recoverability, period-end currency remeasurement, and interest accrual reviews.

Foreign-currency inventory cost uses weighted acquisition-date evidence from
supported paid receipts and stock movements. The sales-date rate is not a
substitute for missing acquisition evidence. Unsupported opening/transfer cost
history is a blocking finding. Returns preserve original inventory cost and
recognize the cash leg at the refund-date rate, with a realized FX difference.

## Persisted automated reports

The existing automated-report tab uses opt-in saved rules and immutable generated
snapshots. Rules support manual, daily, weekly, and monthly execution using the
company time zone and completed periods. Each rule belongs to its creator and
company. Creation, execution, and reading a snapshot enforce the applicable KPI
or accounting tab and organization scope. Scheduled execution revalidates the
creator's active membership, module entitlement, tab, and scope; failures pause
the rule for review. Generated results retain their original period and currency.

Delivery is inside the authenticated application. No email, external recipient,
or outbound delivery is enabled by this closeout. A generated report retains its
quality findings; saving a snapshot does not certify or repair its underlying data.

## Commercial stock and total ownership

Ventas derives its line subtotals, discounts, tax, and total with BigDecimal.
Inventory supplies cost snapshots; client-entered costs do not become accounting
evidence. Stock consumption is validated across repeated product lines before
mutation, confirmations are idempotent, and cancellation returns original stock
once. A sale with stock history preserves its lines, currency, organization, and
history; correction uses cancellation. Services have zero inventory consumption
and do not require a warehouse. Physical items with unresolved stock retain a
pending sale and unavailable cost, preserving the commercial document.

A month can close only after its last day in the company timezone. Electronic
collections with a Treasury pending balance block final cash readiness until the
settlement owner confirms them. Corporate credit instruments with ambiguous
nonzero balances require documented debt/cash classification; credit availability
is never assumed to be cash.

## Stable native identities and peripheral consumers

Payment accounts with balances or financial references preserve their currency,
type, and organization. They can be renamed or deactivated, but not removed from
the operational history. Empty, unused accounts retain normal setup/removal.
Products with stock or inventory history preserve their currency and product
kind; historical products are deactivated rather than deleted. Monetary owners
lock the product/account when performing the corresponding operation.

Legacy Sales KPI routes and the existing delegated AI read routes use the same
organizational authority and valid-sales population. Pipeline value is based on
eligible linked quotes in their native currencies. Delegated business snapshots
carry financial readiness and partial-conversion flags. An exactly zero native
net after a complete return does not require an exchange rate.

HR asset control values are operational valuations, not automatic capitalization
entries. Payroll recognition uses approved immutable payroll lines. Tasks affect
completion and operational matrices; creating or completing one does not invent
revenue or expenses. Any financial recognition still requires its owner document.


Sales local cards use `SALES_COLLECTED` (real direct Treasury, captured POS cash/
electronic and linked Receivables payments) and `SALES_RECEIVABLE_BALANCE`, with
Sales IDs and Sales organizational authority. Approval is not collection evidence,
and a POS credit portion is collected only when its Receivables payment exists.
Native gross margin uses verified backend cost snapshots and the net sales basis;
missing or incompatible cost currency yields unavailable margin. Partial monetary
cards retain labelled native ISO totals and do not calculate a mixed-currency
average from an incomplete numerator.

Protected company consultation retains the real actor and the target company;
its membership ID may be null because consultation creates no client membership.
Monetary `query` and `batch` POST endpoints are explicit read contracts and remain
available during read-only consultation, with their existing tenant, entitlement,
tab and organizational checks. Accounting synchronization, posting, payments and
report generation remain prohibited in that consultation.
