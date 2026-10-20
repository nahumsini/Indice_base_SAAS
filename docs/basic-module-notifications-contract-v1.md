# Basic module notification contract

Status: approved by the user's 2026-10-18 request to complete necessary basic-module notices.
Extends the Backend and Frontend Operating Systems and personal notification preferences (V328).

## Operational coverage

| Module | Configurable events | Authority and destination |
| --- | --- | --- |
| Human Resources | Published/urgent/reminder announcements; pending permission review; response to one's request | Announcements retain their audience owner. Permission reviewers need the management tab and current HR organizational scope; only the requester receives the decision. Opens Permissions. |
| Processes and tasks | Assignment/reassignment, today/overdue, review/audit, team contribution, process started/attention/completed/completed with incidents | Existing task/process producers and recipient assignment remain authoritative. Calendar and Processes permissions are distinct. |
| Sales | Quote follow-up, post-sale follow-up, scheduled opportunity call | Existing Sales producers own recipients, time and destinations. Quotes, Post-sale and Opportunities keep independent tabs. |
| Point of Sale | Current open shift, recent clean closing, closing with cash difference | Native POS context/scope; non-managers receive only their own shifts. Cash closings permission. Clean and difference signals are mutually exclusive. |
| Inventory | Low stock and purchase/supplier invoice pending | Existing Inventory signals and module/tab authority, including legacy POS-owned source names. Opens the canonical Inventory destination. |
| Expenses | Pending approval, payment due, paid expense | Existing Expenses recipient/scope rules and signals; personal switches remain compatible. |
| Petty cash | Native LOW_BALANCE fund, attached receipt pending authorization | Native Finance context and organizational scope; administrators or the responsible person; Cash and Control tabs respectively. No new threshold, balance calculation or approval is invented. |
| Receivables | Installment due today or overdue with a positive balance | Native Finance organizational scope; Accounts receivable tab. Both account and installment must remain eligible, non-cancelled and unpaid. Uses the company business timezone, not final account maturity or browser time. |
| KPIs | Own report ready; own automatic rule paused with REVIEW_REQUIRED | Native automatic report permission plus underlying executive/accounting report permission and unchanged organizational scope. Never exposes another author's report or any snapshot content in the notice. |

Panel Initial is a configuration entry point, not a second source of operational alerts. No
generic setup warning or duplicate dashboard KPI alert is added. Placeholder switches for
`expense_submitted`, `sales_order_ready` and `sales_invoice_overdue` are removed from the available
catalogue; saved legacy keys are retained in storage. Customer collections belong to Receivables.

## Delivery and privacy

New HR permission, Funds, Receivables, Shift and Report sources implement the narrow
`NotificationSignalSource` owner projection. Owners query only tenant-scoped records, check native
module/tab and organization authority, and return bounded notification metadata. Source ownership
and current eligibility are rechecked when listing, reading or dismissing each such notice. A
resolved pending request, authorized receipt, replenished fund or paid/cancelled installment no
longer appears as an active pending notice. Read/dismiss never changes the source operation.

`BasicNotificationDispatcher` traverses active company memberships by keyset in batches of fifty,
resuming after the last membership and resetting at the end. Every source/recipient has an isolated
transaction through `BasicNotificationDelivery`, with current `SessionAuthService.scheduledActor`
identity. One failing owner does not stop the remaining modules or recipients. Initial delay is
15 seconds and delay between batches is 30 seconds; larger companies take a traversal to reach all
recipients. Domain projections return at most 200 recent/current signals per event per batch.
This is the authenticated in-application inbox and does not add email, SMS or OS push delivery.

Observation keys are durable per source/event/record (and due date or report version where
applicable). `publishOnce` inserts without resetting existing read or dismissed state. Repeated
scans do not duplicate or resurrect a deliberately dismissed notice. Existing Expense, Inventory
and Sales recurring syncs likewise preserve dismissal. No business workflow or financial record
is mutated by collection. New delivery does not run from a notification GET.

New historical decision discovery covers the last thirty days; clean/difference closings and
ready report discovery cover the last seven days. Current pending permissions, low funds, pending
receipts, open shifts and due collections are state-driven. Existing delivered decision/report
history retains owner access checks without the discovery time cutoff. HR notice metadata excludes
request reasons, review notes, diagnoses and leave details. Financial notices contain references
without copying amounts, customer data or report snapshots.

## Personal configuration and presentation

The existing settings cards, switches, blue modal, mobile layout and sliders are unchanged.
All actual event keys are configured through the same V328 user/company preference API. Owners
decide whether a setting is available; unavailable module/tab settings cannot be saved. Quiet
mode also hides informational permission answers, process starts/completions and ready reports,
while incident, overdue and review-required alerts stay actionable unless explicitly muted.
New notice and setting labels are localized; Spanish descriptions use a short practical next step.
Native destinations retain their independent authorization. Funds links retain `fundId`.

## Validation and local rollout

No schema migration or new grants are required. Deploy backend owner projections, dispatcher and
catalogue with the matching frontend event catalogue. Existing preference records and deliveries
are preserved. Rollback may stop the new dispatcher and remove the extra client options while
retaining V328 and all delivery history; retain the corrected source permission boundary.

Database regressions use isolated `indice_test_db`: HR audience/decision privacy, fund state and
responsibility, company timezone, paid/cancelled installments, organizational scope, mutually
exclusive POS events, private report authority, repeat/dismiss handling, inactive members and
preference persistence/revocation. Browser regressions use synthetic transport and real components
in Chromium and WebKit across small phone, landscape and desktop viewports. Existing inbox and
preference regression coverage remains applicable. Physical-device push delivery is not claimed.
