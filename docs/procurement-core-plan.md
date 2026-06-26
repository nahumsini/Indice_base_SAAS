# Procurement Core Plan

## Purpose

Procurement Core is the shared purchasing backbone for Sales, Point of Sale, and Expenses.
It prevents each module from creating its own purchasing truth.

## Core Rule

Suppliers can propose. Indice validates.

Supplier data must never update inventory, finance, products, or expenses directly.
Supplier input enters as a reviewable submission.
Internal approval converts it into official product, purchase order, inventory receipt, invoice, or payable records.

## Shared Ownership

- Products: Sales owns the official product catalog.
- Providers: Finance/Expenses owns the provider directory and fiscal/payment data.
- Inventory: Sales Inventory owns warehouses, stock balances, and movements.
- Purchase Orders: Procurement Core owns the official purchasing document.
- Supplier Submissions: Procurement Core owns external supplier proposals.
- Payables/expenses: Expenses owns financial validation, budget impact, and payment workflow.
- POS: consumes purchase orders for retail replenishment and receives stock into the selected warehouse.

## Origins

Purchase order origin is separate from purchase order status.

- `INDICE`: created internally from the ERP.
- `SUPPLIER_KIOSK`: converted from a supplier submission.
- `POS_REPLENISHMENT`: created from Point of Sale replenishment.
- `SALES`: created from a commercial/product need in Sales.
- `IMPORT`: created from import or future integration.

## Supplier Submission Statuses

Supplier submissions are not official purchase orders.

- `SUPPLIER_DRAFT`: supplier is preparing the submission.
- `SUBMITTED`: supplier sent it for review.
- `IN_REVIEW`: internal team is validating products, quantities, prices, taxes, and attachments.
- `NEEDS_CLARIFICATION`: supplier or internal user must correct missing details.
- `APPROVED`: submission is accepted but not yet converted.
- `PARTIALLY_APPROVED`: some lines are accepted and others rejected or pending.
- `REJECTED`: submission will not proceed.
- `CONVERTED_TO_PURCHASE_ORDER`: official order has been generated.

## Purchase Order Statuses

Official purchase orders use operational status only.

- `DRAFT`: internal editable draft.
- `REQUESTED`: internal request for approval.
- `IN_REVIEW`: purchasing/finance is reviewing.
- `NEEDS_CLARIFICATION`: missing or conflicting details.
- `APPROVED`: approved internally.
- `ISSUED`: official order has been issued.
- `SENT`: order was sent to supplier.
- `CONFIRMED`: supplier confirmed price, quantity, and delivery.
- `PARTIALLY_RECEIVED`: partial goods/services received.
- `RECEIVED`: goods/services fully received.
- `INVOICED`: supplier invoice received.
- `VALIDATED_FOR_PAYMENT`: invoice and order are validated for payment.
- `SCHEDULED_FOR_PAYMENT`: payment is scheduled.
- `PAID`: payment completed.
- `CLOSED`: operational and financial cycle closed.
- `CANCELLED`: cancelled before completion.
- `REJECTED`: rejected and will not proceed.

Legacy statuses `APPROVED`, `SENT`, `PARTIALLY_RECEIVED`, `RECEIVED`, and `CANCELLED` remain valid.

## Supplier Kiosk Flow

1. Internal user enables supplier portal access from a provider record.
2. Supplier authenticates with a controlled PIN/link.
3. Supplier prepares product candidates, quantities, cost, currency, taxes, photos, lead time, and notes.
4. Submission enters Indice as `SUBMITTED`.
5. Internal user reviews line by line.
6. Accepted lines can become official products or update supplier-product cost relationships.
7. Approved submission converts into a purchase order with origin `SUPPLIER_KIOSK`.
8. Inventory changes only when official receipt is posted.
9. Expenses changes only when invoice/payment validation is approved.

## Safety Boundaries

- Supplier submissions do not deduct or add inventory.
- Supplier submissions do not create expenses or payables.
- Supplier submissions do not create official products without internal approval.
- Supplier submissions do not expose internal margin, stock, budgets, other providers, or customer data.
- Public kiosk endpoints must use scoped portal tokens/PINs and rate limiting before production use.

## Module Views

Sales:
- Product/provider cost context.
- Product candidate review.
- Supplier-product relationships.

Point of Sale:
- Store replenishment.
- Warehouse receiving.
- Purchase order operational status.

Expenses:
- Purchase commitments.
- Supplier invoices.
- Approval for payment.
- Budget impact and payables.

## Implemented Backend Surface

Internal POS endpoints now support the supplier submission review backbone:

- `GET /api/v1/pos/supplier-submissions`
- `GET /api/v1/pos/supplier-submissions/{submissionId}`
- `POST /api/v1/pos/supplier-submissions`
- `POST /api/v1/pos/supplier-submissions/{submissionId}/review`
- `POST /api/v1/pos/supplier-submissions/{submissionId}/convert-to-purchase-order`

Conversion creates an official purchase order with origin `SUPPLIER_KIOSK` and keeps
`source_submission_id` for traceability. Conversion only accepts submission lines linked
to real Sales catalog products; unresolved supplier-proposed products must be reviewed
before they become purchasing truth.

## Implementation Phases

1. Add origin/status foundation to purchase orders.
2. Add supplier submission and portal-access data model.
3. Expose origin in POS purchase order UI.
4. Add backend endpoints for supplier submission review and conversion.
5. Build internal review UI for supplier submissions.
6. Connect purchase order commitments to Expenses budgets/payables.
7. Build secure supplier kiosk.
8. Add product-candidate approval into Sales catalog.
