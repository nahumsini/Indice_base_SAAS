# Sales commission reporting

Status: active owner contract for the commission reporting correction.

Sales owns persisted commission amounts and immutable calculation components. Reporting never
recalculates historical commission policies, changes a commission status, creates a cut or posts
payments. `/api/v1/sales/commission-summary` is a read-only POST accepting preferred currency and
sale/component selections, with limits and validation. Company and organizational scope come from
the authenticated session. The route requires Sales entitlement and the `crm.sales` tab; it uses
the existing KPI access service and is explicitly permitted in delegated read-only consultation.

Selections contain identifiers only. The backend reloads every sale under company and organizational
scope, rejects unavailable or changed selections and deduplicates repeated components. Cancelled,
rejected and voided sales stay visible in the operational list but contribute no commission totals.
The selected component amounts form the numerator; each selected sale contributes its sales amount
to the denominator exactly once, including when a sale has several commission components.

Every monetary aggregate uses the central KPI currency engine and verified daily rate evidence.
Native operations remain unchanged. The commission rate uses numerator and denominator converted
on the same currency basis. Missing conversion evidence or inconsistent snapshots withhold the
complete total/rate and display a warning. Native amounts remain available in the operational list.
Unfiltered totals reconcile with the central `SALES_COMMISSION` metric for the same sales and rates.

Legacy JSON decimal strings are normalized at the frontend API boundary. Missing or invalid component
amounts display as unavailable and are validated again by the backend. New requests for a different
currency, selection or observed snapshot cannot display results from an earlier request.

Commission render errors stay inside the tab with a retry action, preserving the workspace and
authentication. The global error fallback distinguishes stale asset errors from application errors.
This contract does not change commission policy authoring, payroll transfers or existing cuts.
