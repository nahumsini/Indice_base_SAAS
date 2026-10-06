# Lupita: Inventory, Sales and POS operational completion

Status: local operational cycles implemented and verified; prepared for APPTEST deployment.
Real client, merchant/hardware and public release acceptance remain separate gates.
Parent: [MCP Operating System](indice-mcp-operating-system-v1.md).

The user's 2026-10-06 instruction authorizes operational completion of these three modules.
This extends earlier assistant restrictions on commercial closes, inventory mutations and POS
operations through named owner use cases. It preserves current tenant, subscription, entitlement,
module, tab, role, organization, financial, retention and object ownership boundaries.

## Analysis and delivery matrix

| Area | Existing assistant coverage | Required operational cycle |
| --- | --- | --- |
| Training | RH and Processes/Tasks | Current Inventory, Sales and POS tabs, localized guides and authorized actions |
| Catalog and warehouses | Product search/detail | Scoped catalog maintenance, warehouse lifecycle, explicit inventory configuration |
| Inventory | Summary | Paginated balances/history, entry, exit, transfer, physical count and minimum stock; backend computes resulting balances |
| Procurement | No operational cycle | Draft/edit/request/approve/send/cancel, partial receipt, supplier submissions and invoices under current owner permissions |
| Commercial close | Customers/opportunities/quotes | Quote connection, authorized sale creation/edit, inventory approval, payment/collection review, cancellation and native currency totals |
| Commercial follow-up | No operational cycle | Post-sale cases, contracts, commission rules/cuts and owner reports |
| POS cash | Cash summary | Register configuration, opening, cash movements, checkout/recovery, tickets, closing, settlement and closing history |
| POS stock procurement | No operational cycle | Paid receipt, stock/payment atomicity, evidence and append-only reversal |
| POS discounts and orders | No operational cycle | Current discount owner lifecycle/evaluation, authenticated order/preticket reads and claim/release |
| POS returns and terminals | No operational cycle | Original tender bounded returns and current durable terminal payment/recovery/reconciliation operations |
| Files and reports | Seven RH/Tasks destinations | Explicit commercial owner registrations and private read/export contracts |

## Execution rules

- New writes are disabled by default and need separate explicit consent. Existing connections
  never gain these scopes through refresh.
- Preview is pure and shows current owner-derived scope, native currency, tax, stock and money
  effects. Confirmation expires after five minutes and binds the caller, connection, action,
  normalized change and current records. Changed inputs require a new preview.
- Atomic database operations persist effects, consumed confirmation, execution receipt and audit
  together. Retries use the same key and recheck current result visibility.
- Inventory quantities are deltas or explicit physical counts, never client-authoritative balances.
  Products, warehouses and balance rows are locked in deterministic order. Reserved stock and
  inventory units remain protected. Transfers conserve stock and append movement history.
- V294 widens existing stock quantities to three decimals and unit costs to four decimals. This
  retains the precision already calculated by paid POS receipts; payment and sales totals do not
  change. Existing stock valuations can consequently retain fractions previously rounded to cents.
- Manual inventory movement cancellation is limited to an unreversed assistant-owned movement.
  POS receipts, sale issues and tender returns must use their financial owner's reversal cycle.
- Sales-owned and POS-owned records retain their existing owner boundaries. Reading a POS sale
  in Sales grants no authority to edit or cancel it. Cancellation uses compensating owner records.
- Live terminal requests retain the existing durable provider reservation/dispatch protocol.
  External HTTP is outside database transactions. A lost response is recovered using its original
  request identity; the assistant cannot invent paid state, release uncertain payments or retry
  them under a new key.
- Physical employee identification, kiosk PINs, merchant OAuth credentials, supplier portal
  credentials and production activation stay in their documented channels. Guides explain those
  steps without exporting credentials or overriding owner permissions.
- No hard deletion of stock, payments, tickets, commission history or other business history.
- Tests use isolated data and mocked provider gateways. APPTEST text/voice, hardware and real
  merchant acceptance remain explicit release gates, not claims derived from local tests.

## Owner extensions implemented in this change

- Inventory's procurement tab delegates through an explicit authenticated organization port to the
  existing Purchase Order owner. This does not require an unrelated POS entitlement; every tool still
  requires Inventory entitlement, its actual tab, current role and separate consent. Provider and
  discount maintenance use the same port into Finance Providers and POS Discounts respectively.
- Supplier invoices belong to the current Inventory purchase orders tab. There is no invented
  Inventory invoices tab. Native totals derive from subtotal plus tax. Invoice review and expense
  creation do not record payment; the existing Finance payment cycle remains authoritative.
- V296 preserves superseded purchase draft lines and adds immutable previous-document revisions.
  Only DRAFT orders may change their lines. Current reads and receipt completeness exclude superseded
  lines. Old revisions and received quantities remain stored. Migrations are forward only.
- Purchase receipts reject repeated line IDs and over-receipts before stock is mutated. Existing
  receipt cost behavior is preserved. Supplier quotation conversion explicitly reviews catalog cost
  and sale price. New products are created through Inventory first and then linked, so the assistant
  cannot bypass catalog ownership by accepting a supplier's product as authoritative.
- Closing settlement calculations subtract refunds from their original tender. Cash refunds already
  affect the cash movements/count; they must not reduce card, transfer or wallet settlement. Total
  refunds and gross sales remain visible and unchanged in closing history.
- Original tender return inspection checks accounting periods, posting, original payment evidence,
  historical stock movements and their cost/currency before requesting confirmation. Preparing a
  return does not itself return money or stock. Manual cash/transfer confirmation requires physical
  cash confirmation or original transfer evidence. Card refunds retain the provider protocol.
- Commercial approval cannot implicitly collect a legacy draft previously marked finance-approved.
  Such records retain their original combined financial review. Confirming credit requires an existing
  receivable, preventing an approved sale from creating untracked debt.

## Deployment handoff

The completion report must contain the final owner/action matrix, test evidence, workflow,
configuration and migrations, deployment/rollback sequence, and remaining external acceptance
gates. This task prepares deployment; it does not authorize deployment to production.

## Completed owner contracts and operational boundaries

- Commercial commission cuts use native recipient, currency and payroll application rules. Preview
  reads the existing daily exchange-rate cache without external HTTP or writes. Execution requires
  both Sales commission authority and HR incentive management consent. Creating a cut applies
  incentives once; it does not pay payroll. Schedule activation preserves the owner's calendar.
- Authenticated preticket and restaurant order claim/release uses current register, shift and
  operator authority. Checkout completes the original source once. Result replay checks current
  scoped ownership even after the source is completed. Public kiosk tokens and claim codes stay
  private. POS ticket history paginates and counts in SQL beyond the browser's legacy 300-row limit.
- Terminal confirmation first commits a durable assistant execution reservation, then invokes the
  existing provider owner outside SQL transactions, then stores the execution receipt. Financial
  retries reuse the same confirmation/key and original provider identity; uncertain outcomes are
  recovered explicitly. A provider approval without its POS ticket is a recovery case, not a
  completed sale. Backend-owned request identities cannot be replaced by client input.
- Full card returns support Square and Mexico/MXN Mercado Pago Point through the original tender
  owner. V298 preserves provider, original intent and native refund request identity. Active or
  completed physical returns block a separate provider refund; prior provider refunds block a
  physical return. Point requires zero previous refund baseline, full original amount, verified
  REFUNDED payment and immutable native reversal evidence. Pending/unknown outcomes restore no
  stock. Confirmed provider evidence survives an inventory failure, enabling completion without
  refunding again. Closed/posting financial periods retain their original Finance reconciliation gate.
- Five named commerce attachment destinations extend the existing staged-file workflow. Private
  PDF/JPEG/PNG/WebP files have a 10 MB limit; product photographs require an image. Sales and POS
  objects use their original private storage bucket and quota. V297 adds append-only supplier
  invoice attachments. Registered assistant file downloads verify the original SHA-256 as well as
  content length/type. Signed browser URLs are not assistant attachment contracts or approval proofs.
- Before collection, payment evidence enters the existing review cycle without recording a payment.
  After financial approval, the assistant appends a `payment_supplement` document while preserving
  that approval and all financial entries. Existing browser evidence behavior remains compatible.
  Attaching supplier invoices, contracts and paid receipt documents does not approve, pay or sign them.
- CSV/PDF exports cover ten explicit commerce reports, use authorized native owner rows in one
  read-only snapshot and retain native currencies. POS reports require their original shift/closing.
  Exports fail closed over 5,000 rows or 10 MB; unsupported filters are rejected. CSV protects against
  spreadsheet formula execution. PDF uses the existing PDFBox formatter; CSV preserves full Unicode.
  No external mail, legal signing, arbitrary URL intake, aggregate currency conversion or new fiscal
  authority is introduced.
- Register previews normalize explicit destination rules through the existing settlement owner,
  including deferred bank cash/card/wallet and review requirements. They do not provision accounts.
  Stock/catalog costs retain four decimals; sale/payment prices retain native two-decimal money.
- Terminal and refund inspections use nonlocking reads in read-only transactions. Native execution
  retains its locks and financial reservations. Point REJECTED/NOT_SUBMITTED outcomes preserve
  stock and allow cancellation of the failed preparation; unknown outcomes remain recoverable.
- Base Compose, APPTEST Compose and host-network startup forward the existing Square properties
  and protected application/webhook secret files. Activation remains off by default. Existing
  token encryption keys must be preserved when upgrading, including the current kiosk-key fallback.

Delivery: [operating workflow](lupita-commerce-operating-workflow-v1.md),
[exact tool/owner matrix](lupita-commerce-tool-matrix-v1.md) and
[verification and deployment handoff](validation/2026-10-06-lupita-commerce-cycles.md).
The extension adds 61 reads and 83 confirmed actions (227 tools). The complete SDK catalog has
459 tools; discovery still filters each connection's current authority and consent.
