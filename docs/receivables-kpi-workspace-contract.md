# Receivables KPI workspace contract

Status: approved by the module-by-module KPI adoption request, 2026-09-15.
Owner: Cartera / Receivables. Extends `KPI_TAB_STANDARD.md` under the Frontend and
Backend Operating Systems. This is a new analytical tab, not a replacement for the
four operational tabs or their compact indicators.

## Workspace

Route `/receivables/kpis`, permission `receivables.kpis`. Green module tone,
`IndiceWorkspaceNavigation variant="views"`, and equal 24 px gaps between title,
view navigation and filters. Views:

1. Overview: eight measurements and actionable follow-up counts.
2. Analysis: instalment ageing, monthly collections, complete customer concentration table.
3. By unit: outstanding balance, overdue instalments, period collections and balance share.
4. Accounts and collections: native-currency account and payment tables, read-only
   account dossier with all instalments/payment history and authorized receipt links.

Search (customer/account), collection period, unit and business apply across views.
Organizational filters use IDs, not potentially duplicated labels. Switching views
does not reload sources or monetary queries. Filters, active view, follow-up focus,
sorting and pagination are scoped by company/user using workspace navigation memory.
`view` in the URL takes precedence. Charts mount only while Analysis is active.
PDF includes every filtered row, independent of the active view, follow-up focus or page.

## Measurement definitions

`asOfDate` comes from the backend company business timezone, never the browser clock.
Current receivable balance is a stock. The period applies only to payment dates;
selecting last month does not reconstruct a historical receivables balance.

| Measurement | Scope and definition |
| --- | --- |
| Outstanding balance | Current positive balances of non-cancelled accounts, including contractual interest. |
| Overdue instalments | Remaining positive balance of non-cancelled instalments of those accounts, due strictly before `asOfDate`. Final account maturity does not determine arrears. |
| Overdue share | Overdue instalment balance / outstanding balance in the same preferred currency. No positive denominator means no measurement base. |
| Due within 30 days | Remaining instalments due between `asOfDate` and `asOfDate + 30 days`, inclusive. |
| Collected in period | Recorded payments in the selected date interval, including settled accounts and actual receipts on cancelled contracts. This is not period sales or revenue. |
| Accounts with debt | Non-cancelled accounts with positive current balances. |
| Identified customers with debt | Unique linked contact IDs on those accounts. Accounts lacking a contact are counted separately, never merged by display name. |
| Collections with receipts | Payments with a retrievable file URL / payments in period, by record count. A file does not imply bank reconciliation. |

Ageing partitions outstanding instalments into current, 1–30, 31–60, 61–90,
91+ days and invalid/missing date. Customer concentration uses contact IDs; accounts
without a contact are separate rows. Unit comparison includes units with collections
on settled accounts. Higher volume is not labelled worse performance.

Missing schedules on an open account (no open instalments or an invalid instalment
date) make overall arrears/share/upcoming amounts unavailable. Known instalments remain
visible in the explicitly labelled ageing chart. Invalid or future payment dates are
excluded from period collection metrics with a visible count. Unavailable conversions
remain unavailable, not zero. Empty samples are distinct from a valid zero amount.

## Ownership, access and compatibility

- New read-only `GET /api/v1/finance/receivables/kpis/workspace` returns typed accounts,
  instalments, payments, company `asOfDate` and `timeZone`; it does not load sales
  candidates, simulations or credit policies.
- Existing company/unit/business-scoped owner repositories provide the records.
  Instalment-to-account joins explicitly match both company and account IDs.
- Backend monetary aggregates remain authoritative: `RECEIVABLE_BALANCE`,
  `RECEIVABLE_INSTALLMENT_BALANCE`, `RECEIVABLE_PAYMENT_AMOUNT`. The new tab may read
  these metrics; existing owners/central permissions retain their behavior. Monetary
  sums/conversion use the existing BigDecimal engine, not browser arithmetic.
- Aggregate batches honor the 100-query limit without truncating groups. The existing
  10,000-ID limit per query is unchanged; exceeding it fails visibly rather than
  publishing a partial total as complete.
- Permission added to frontend scope catalog, configurable backend tab catalog and
  route classifier. KPI permission grants read access to scoped payment receipts;
  payment creation, receipt upload, treasury account selection and credit-policy
  mutation retain their existing operational permissions and CSRF protection.
- No schema migration, credential change or permission auto-grant to individual users.
- New analytics source is independent from legacy operational mock fallbacks. Invalid
  monetary source rows or incomplete arrays fail visibly. Refresh and authorization
  changes hide previous data immediately and ignore stale asynchronous responses.
- Credit creation, payment application, idempotency, credit availability and treasury
  accounting are unchanged. Account details are read-only when invoked from KPIs.

## Limits and verification

Do not infer DSO, collection effectiveness, historical closing balances, on-time paid
instalment rates, promises kept, bank reconciliation or expected credit losses from
current remaining balances alone. These require explicit historical snapshots,
payment-allocation timing, commitments, bank matching or approved models.

Verify date boundaries, partial instalments, settled-account collections, cancelled
accounts, missing schedules, original currency, complete report scope, view switching,
source failure/retry/authorization races, and company/unit/business isolation.
This contract does not imply a production deployment or authenticated visual approval.
