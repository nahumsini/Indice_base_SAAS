# Indice Financial Reporting Engine Contract v1.0

Status: approved implementation contract for the Estados financieros workspace

Owner: Finance. KPIs consumes the reporting facade and does not own accounting records.

## 1. Purpose

Indice produces decision-support financial statements from an auditable double-entry ledger. The
engine is standards-aligned; it does not claim that software, by itself, certifies an entity's
compliance with IFRS or replaces the professional judgements, disclosures, estimates, and external
assurance required for a complete set of financial statements.

The default profile is IFRS for SMEs. The profile and its effective date are stored per company so
that the presentation can evolve without rewriting posted history. Full IFRS profiles distinguish
the IAS 1 presentation from IFRS 18, whose mandatory effective date is 1 January 2027 unless early
adopted.

Supported profile identifiers:

- `IFRS_SMES_2015`
- `IFRS_SMES_2025`
- `FULL_IFRS_IAS1`
- `FULL_IFRS_18`

## 2. Accounting invariants

- Every posted journal entry belongs to exactly one company and accounting period.
- Posted entries are immutable. Corrections use a linked reversal and a replacement entry.
- Total functional-currency debits equal total functional-currency credits before posting.
- Money uses `DECIMAL(19,4)` in storage and `BigDecimal` in Java with explicit rounding.
- Source events are idempotent through a company-scoped source key and fingerprint.
- The authenticated company and actor come from the server session, never from request payloads.
- Reports read only `POSTED` entries and always scope the ledger and source modules by company.
- A closed period rejects new operational postings. Reopening is explicit and audited.
- Unit and business dimensions are retained on lines when the source provides them.

## 3. Operational source contracts

The first release synchronizes existing source records through an explicit, audited command. A
safe `GET` never posts records.

| Source owner | Eligible event | Journal effect |
| --- | --- | --- |
| Sales | non-voided sale | cash or receivable / revenue and tax payable |
| Sales | complete product cost evidence | cost of sales / inventory |
| Finance expenses | approved or later expense | expense / accounts payable |
| Finance expenses | recorded payment | accounts payable / cash |
| Finance receivables | recorded collection | cash / accounts receivable |
| Payroll | approved or paid run | payroll expense and employer cost / payroll liabilities |
| Payroll | paid run | payroll payable / cash |
| Inventory | cost evidence consumed by an approved sale | cost of sales / inventory, plus subledger reconciliation |
| Petty cash | accepted settlement represented by an approved expense | consumed through the finance-expense contract |

POS tickets linked to a sales record are not posted independently. Internal cash transfers and
petty-cash funding are not income or expense. Inventory purchases and other non-sales inventory
movements are not auto-posted until their owner publishes an explicit payable/counter-account
contract. Unsupported source states, missing product cost, missing account mapping, and missing
exchange rates become quality findings; they are never filled with invented numbers.

Operational payment-account balances and POS cut settlement follow
`docs/pos-treasury-settlement-contract-v1.md`. That subledger is not a second source of revenue:
the accounting engine continues to post the commercial sale once, while Treasury proves where and
when each POS collection became pending or available.

## 4. Presentation and report set

Primary statements:

- Statement of financial position.
- Statement of profit or loss, with IFRS 18 management subtotals when that profile is active.
- Statement of cash flows.
- Statement of changes in equity.

Supporting schedules:

- Trial balance.
- Accounts receivable and accounts payable reconciliation.
- Inventory-to-ledger reconciliation.
- Data-quality and posting exceptions.

Comparatives use the immediately preceding equal-length period. Statement-of-financial-position
comparatives use the prior period end. Reports identify the framework snapshot, functional and
presentation currency, period status, generation time, and quality state.

## 5. Decision readiness

The API returns `decisionReady = true` only when all blocking controls pass:

- every posted entry balances;
- there are no eligible unposted source events in scope;
- foreign-currency events have valid conversion evidence;
- product-cost evidence required for cost of sales is complete;
- trial-balance totals agree;
- subledger reconciliations are within the configured tolerance;
- the selected period has a valid accounting profile and currency.

Preliminary reports remain visible with their findings. The UI must display the status prominently
and must not describe a preliminary or incomplete report as IFRS compliant.

## 6. API boundary

- `GET /api/v1/kpis/accounting-reports` reads reports and quality state.
- `GET /api/v1/kpis/accounting-reports/analytics` reads authoritative KPI comparisons, profit and
  cash bridges, a bounded 3-to-24-month trend, organization comparison, and deterministic insight
  codes. It does not persist or mutate accounting data.
- `GET /api/v1/kpis/accounting-reports/drilldown` reads the posted journal evidence for one
  allow-listed statement line or one company-owned account. Pages are zero-based and bounded to
  10-to-200 rows.
- `POST /api/v1/kpis/accounting-reports/synchronize` imports eligible source events idempotently.
- `POST /api/v1/kpis/accounting-reports/periods/{periodKey}/close` closes a ready period.
- `POST /api/v1/kpis/accounting-reports/periods/{periodKey}/reopen` reopens it with an audit reason.

Mutations require the repository CSRF mechanism. Existing entitlement, module, and
`kpis.accounting-reports` tab gates remain authoritative. The backend additionally validates tenant
ownership for every persisted object.

Analytics and drill-down requests accept only `from`, `to`, `unitId`, and `businessId` as report
scope. The company always comes from the authenticated session. A business requires its owning
unit, and both dimensions are checked against the authenticated company before reading the
ledger. Drill-down sorting uses a server allow-list; statement-line identifiers are resolved by a
server-owned accounting map and are never interpolated as SQL.

The analytics contract returns stable English codes and numeric parameters. User-visible labels,
explanations, and recommended-action copy belong to the localized frontend. KPI target status is
`NOT_CONFIGURED` until a separately approved target contract exists; the system does not invent
traffic-light thresholds. A missing ratio denominator is represented as unavailable, not zero.

### 6.1 Remastered workspace views

The accounting workspace exposes four URL-backed views without changing the public module route:

1. `overview`: financial pulse, bridges, trend, organization comparison, and up to three insights;
2. `statements`: the four primary statements and journal-evidence drill-down;
3. `trial-balance`: searchable, sortable, paginated account balances and account drill-down;
4. `close-quality`: synchronization, reconciliation, review, findings, and close/reopen controls.

Close remains an explicit confirmation. Reopen remains a standard form with a required audited
reason. Neither analytics nor drill-down changes period status.

## 7. Reference standards

The structure is designed around IFRS for SMEs, IFRS 18/IAS 1 presentation, IAS 7 cash flows, IAS 2
inventories, IAS 21 foreign currency, IFRS 15 revenue, IFRS 9 financial instruments, IAS 16 fixed
assets, and IAS 37 provisions. Licensed standard text is not copied into the product. Updates to
labels or classifications require a versioned profile and regression fixtures.

Official implementation references:

- [IFRS for SMEs Accounting Standard](https://www.ifrs.org/issued-standards/ifrs-for-smes/): the
  2025 third edition is effective for periods beginning on or after 1 January 2027; earlier
  application is permitted and the 2015 edition can remain in use until then.
- [IFRS 18 Presentation and Disclosure in Financial Statements](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-18-presentation-and-disclosure-in-financial-statements/):
  effective for annual periods beginning on or after 1 January 2027, with early application
  permitted.
- [IAS 7 Statement of Cash Flows](https://www.ifrs.org/issued-standards/list-of-standards/ias-7-statement-of-cash-flows.html/):
  operating, investing, and financing classifications and cash/cash-equivalent reconciliation.
