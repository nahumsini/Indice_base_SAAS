# POS Paid Inventory Receipt Contract v1

Status: approved product decision, 2026-09-05
Owners: Point of Sale for the tactile receipt and payout; Sales Inventory for products, balances, and movements; Finance for non-cash account movements.

## Objective

The active POS register can receive merchandise from a provider, pay for it, and add it to the warehouse linked to that register. The flow is generic across business types and is not limited to metals or recycling.

## Product and quantity rules

- A receipt contains one or more line items. Each line records quantity, entered unit cost, tax treatment, subtotal, tax, total, and the inventory cost excluding tax.
- The operator searches existing active inventory products and eligible physical products/packages by name, SKU, or category, or creates a new product within the receipt flow. Currency filtering happens before the search limit.
- An existing physical product/package without inventory tracking requires explicit per-product consent to activate inventory in the confirmed receipt. Activation is atomic with the receipt and records its source receipt in product metadata. It preserves the product identity, packaging unit, existing quantities/reservations/costs, commercial visibility and unrelated configuration. It does not bulk-enable the catalog or reinterpret untracked services/internal operational items.
- Existing products retain their configured inventory unit. Quantities are accepted only in that unit; the receipt cannot silently convert kilograms into pieces or change the product unit.
- A newly created product records its inventory unit before the first receipt is posted.
- The destination warehouse is always derived from the active cash register and cannot be overridden by the browser.
- The backend recalculates every line and receipt total. Browser totals are previews only.

## Provider and evidence rules

- Every receipt references an active provider visible within the authenticated organizational scope.
- Quick provider creation delegates to the Finance provider owner contract and applies that same scope; the browser cannot assign another company.
- A PDF or image receipt document is optional for both cash and transfer payouts and remains linked to the receipt.

## Payment rules

- Supported payout methods are cash and transfer.
- Cash reduces the expected cash of the active shift.
- Transfer uses a company-owned payment account selected through the Finance owner contract.
- A receipt, its payout, and its inventory entry are committed atomically or not at all. Receipt creation locks the matching open shift, validates the same register/warehouse/organizational scope, and serializes against closing; an inventory transfer payout cannot race past a closed shift.
- The browser supplies a per-operation idempotency key so retries and double taps return the same receipt instead of paying and stocking twice.
- Reusing an idempotency key with different values is rejected.

## Audit and reversal

- Confirmed receipts are immutable.
- Corrections use an authorized reversal with a required reason.
- Reversal is an administrative action and is not exposed in the operational receipt modal.
- Reversal restores the financial position and removes the received quantity through append-only compensating movements; historical records are never deleted or rewritten.
- Every query and mutation is company-scoped and respects register, shift, warehouse, tab, and organizational permissions.

## Operation tickets — approved extension, 2026-09-07

- Receipt and shift closing tickets are operational thermal documents (80 mm), printed through the existing shared HTML print engine. The browser print dialog also supports saving as PDF.
- Printing follows successful persistence. The receipt ticket uses saved receipt lines, subtotal, taxes, total, payment method/reference, native currency, provider, register, shift, warehouse and receipt timestamp. New receipts snapshot printable identity metadata in the creation transaction; existing receipts use available historical data and clearly identify reversals.
- The closing ticket is retrieved from the saved cash closing, including cash in/out, safe drops, corrections, payment-method totals, expected cash, counted cash and the stored difference. It does not use the pre-close preview as the official closing.
- Reprint uses read operations only: receipt tickets are available from the current shift receipt history; closing tickets can be reprinted from Cash Closings. The operational receipt modal does not expose administrative reversal.
- A blocked/cancelled print dialog or a failed post-close read does not repeat a receipt, payout, inventory movement or closing. The saved operation remains successful and the user can retry printing/reading.
- Register labels are derived synchronously from the register of the backend open shift, never from the first register in the catalog. A register/warehouse mismatch fails closed before composing the operational context.
- There is no schema migration or bulk historical data correction for this extension.
