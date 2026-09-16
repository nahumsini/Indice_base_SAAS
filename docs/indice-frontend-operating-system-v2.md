# Indice Frontend Operating System v2.0

Status: canonical frontend architecture, UI, and UX standard

Active runtime root: `react/src/app`

Related standards: `AGENTS.md`, `docs/indice-backend-operating-system-v1.md`, and
`docs/indice-public-release-security-gate.md`

## Deep UI/UX Standardization And Frontend Architecture Prompt

Act as a senior React frontend architect, SaaS UI/UX architect, enterprise design-system lead, and modular ERP frontend engineer working on Indice ERP.

Your goal is to deeply standardize the frontend experience across Indice without redesigning the product from scratch.

This is the standard for frontend architecture, UI, and UX work. When a task is explicitly limited
to presentation or frontend standardization, the following backend and behavior boundaries remain
locked. An explicitly authorized full-stack feature may evolve a contract, but it must follow the
Backend Operating System, preserve or version consumers, and include coordinated verification.

Do not modify:

- backend
- APIs
- DTOs
- routes
- payload contracts
- data contracts
- business logic
- calculations
- submit handlers
- validations
- permission behavior
- service behavior

Preserve all current functionality.

The active application and router are under `react/src/app`. The separate `react/src/modules`
directory is a dormant scaffold from an earlier architecture experiment and is not an active
production root. Do not place new production work there unless a dedicated, approved migration
activates it, updates routing/imports/tests, and retires the duplicate path.

A released or explicitly closed frontend module is behavior-locked, not code-frozen. Refactoring
may improve structure only after its affected routes, interactions, permissions, copy, API calls,
and calculations have regression protection. Structural cleanup must not silently change product
behavior.

The objective is to make every module feel like part of the same ERP: same rhythm, same structure, same controls, same table behavior, same modal behavior, same visual hierarchy, and same operational clarity.

Consistency is more important than creativity.

Never invent new patterns when an approved pattern already exists.

---

## 1. Core Product Principle

Indice is a modular SaaS ERP for SMEs in LATAM and Canada.

Every frontend decision must protect:

- modularity
- scalability
- consistency
- exportability
- maintainability
- localization
- accessibility
- operational clarity

You are not building isolated screens.

You are building a production-ready ERP frontend system.

Every module must be easy to:

- understand
- maintain
- refactor
- export
- reuse
- scale

If a module cannot be separated without breaking the system, the architecture is wrong.

---

## 2. Primary Design Reference

Human Resources is the main UI/UX reference for Indice.

When in doubt, follow Human Resources.

Use Human Resources especially for:

- module header rhythm
- tab pills
- title bars
- emoji/icon identity
- filters
- KPI placement
- insight bars
- status distribution
- table rhythm
- column configuration
- action hierarchy
- dark mode behavior
- operational spacing

Primary reference files:

- `react/src/app/BasicModules/HumanResources/HumanResources.tsx`
- `react/src/app/BasicModules/HumanResources/Employees/Employees.tsx`
- `react/src/app/BasicModules/HumanResources/Employees/components/EmployeesHeaderActions.tsx`
- `react/src/app/BasicModules/HumanResources/Employees/components/EmployeesFilters.tsx`
- `react/src/app/BasicModules/HumanResources/Employees/components/EmployeesTable.tsx`
- `react/src/app/BasicModules/HumanResources/Employees/components/EmployeesTableSection.tsx`
- `react/src/app/BasicModules/HumanResources/Employees/components/EmployeesPagination.tsx`
- `react/src/app/BasicModules/HumanResources/Employees/components/EmployeeKpiStrip/EmployeeKpiStrip.tsx`

Human Resources is the strongest visual model because it already feels like the most mature interface in the product.

---

## 3. Secondary References

### Processes And Tasks

Use for:

- Kanban views
- Agenda views
- planner behavior
- operational task boards
- status-driven work views
- date-based execution views
- workflow states

Good task/workflow patterns may be reused when a screen is not simply a table.

### Expenses

Use for:

- financial green identity
- finance KPI rhythm
- financial tables
- sorting behavior
- bulk selection behavior
- row actions
- inline selectors
- finance status styling
- money-focused operational density

Per the 2026-09-09 correction decision, Add Expense and quick capture record completed, paid
expenses using the same transactional import owner, with a stable request key, the original
expense/payment date and optional payment account. Duplicated expenses and accounts payable
remain pending. Bulk entry explicitly chooses paid (the initial selection) or pending expenses. Paid imports allow unassigned payment/accounting accounts;
when supplied, payment accounts must be eligible for that row. The import owner still records
payment evidence when the bank is unassigned, without debiting an arbitrary account. Only
pending imports capture a due date independently of the expense date. The visible status remains
a workflow result. Per the 2026-09-10 payment-action decision, pending, partial and overdue rows
expose two separate actions: Abonar opens the installment form; Pagar directly invokes the
settlement owner, which calculates the current remaining balance and uses today's company business
date. Previous installments and the original expense date remain unchanged. An unassigned account
on direct settlement records payment history without any bank movement, as with paid capture;
an assigned account is validated rather than replaced silently. The installment form retains its
account/date controls and adds Liquidar, submitting the entire displayed remaining balance through
the existing record-payment owner. Both actions accept payment without an attachment. No selector
may automatically choose the first bank. Partial-payment amount, account and date are preserved
on errors; both submit buttons share an in-flight guard and stable request identity. Bank balances
refresh from the owner after success, avoiding repeated optimistic deductions on a retry.
Registered ordinary unposted expenses expose Edit and use the versioned correction operation;
existing payments are preserved. Editing is independent of deletion eligibility. Currency changes
are unavailable for paid or budget-linked expenses, and a corrected total below recorded payments
requires correcting the excess payment first. Fund and posted sources retain their owner controls.

Selected-row Finance actions and Petty Cash filter memory follow
`docs/finance-bulk-actions-and-workspace-memory-contract-v1.md`. Their explicit classification
operations are available independently of generic draft editing; protected actions explain their
restriction instead of hiding the entire selection toolbar.

Petty Cash fund creation uses **Modal Wizard Índice**: Fund type, Configuration and Review.
External managed funds add an Owner stage before Review for recipient identity and optional
managed assets. Fund type determines the accounting links and currency determines the eligible
custody accounts; these are dependent stages. Funding origins and method lists do not belong to
fund configuration. Continue validates the current stage, Back retains the draft, and only final
review submits. Selecting an account must not silently rewrite the previously configured currency,
budget or limit. Final review states that creation starts at zero balance and does not transfer
funds. Use the shared frame, stepper, footer, validation and summary primitives. Editing existing
funds remains a standard form. Creation confirms discarded changes inline and blocks duplicate
submission, editing and dismissal while saving.
The existing-fund form exposes prospective internal/external reclassification in the same modal.
It requires the target type's fields, effective date and reason, displays any pending change, locks
competing configuration edits while it is pending and allows cancellation there. The fund list also
shows the pending target and date. Deposit capture chooses the origin for that one entry: company
accounts for both types and an additional Medios externos option only for external funds.
The Owner stage and existing-fund form support an optional ordered list of up to 50 managed
assets. Add/remove stay inside the modal; each added row requires a type and name, with an
optional reference. Back preserves all rows, and final review shows each asset. Send the full
`managedAssets` list, including `[]` when cleared. Account statements and PDFs use their own
`managedAssetsSnapshot`; never fill a historical empty list from today's fund. See
`docs/petty-cash-managed-assets-contract-v1.md`.
Petty Cash account-statement preview, download and print share one transaction-document definition
and the standard PDF engine used by Finance. The document uses a single green accent, neutral
metadata and table-first sections; decorative multicolor bands and semantic color without meaning
do not belong in this report. Preserve the statement folio, status, fund and owner identity,
historical assets, native-currency balances, entries, expenses and reconciliation in every output.
Fund forms do not show or require funding or spending method checklists. The deposit modal selects
created active accounts in the same currency for both fund types, excluding custody. External
managed funds additionally offer **Medios externos**, which reveals the named-origin field. It
preserves the chosen route across reference refreshes and derives the movement method from that
route. Funds keeps its explicit accounting classification when an external fund uses a company
source account. This follows the approved 2026-09-10 contract in
`react/src/app/BasicModules/Expenses/domain/PETTY_CASH_DOMAIN_CONTRACT.md`.
Closing a statement with a positive balance selects the return destination in that closing modal.
Both types may return to an eligible company account; external funds also offer a named **Medios
externos** destination. The action stays disabled until the selected route is complete.

Budget Control follows that contract's Budget Control extension: This month filters scheduled
budget lines; selection exposes budget-owned classification and soft deletion. Totals for filtered
and selected rows sit above pagination and retain native currency separation. These are budget
lines and must not be settled or marked paid through Expense status actions.

The 2026-09-10 monthly-obligation decision connects scheduled Budget Control lines to real payables
under `docs/budget-monthly-obligations-contract-v1.md`. Entering Expenses (including returning from
Budget Control) completes the protected synchronization request before loading expense rows.
Unresolved legacy data or generation failures remain visible; existing expenses still load on a
failure. Payables use the existing Abonar/Pagar actions, while the budget line stays a planning row.
An unpaid budget payable becomes overdue only after its due date, including a partially paid balance.
When a payment already exists, the visible row status remains **Pago parcial**; **Vencido** is a
secondary risk signal for the outstanding balance and continues to participate in overdue filters,
alerts and totals. This presentation rule applies equally to budget-generated and ordinary payables.
Calendar dates preserve their selected month across timezones; monthly recurrences clamp dates such
as January 31 to February's last day and restore the original day in March.

Expense edits use the versioned correction rules above. Removal follows the explicit 2026-09-10
owner contract in `docs/finance-bulk-actions-and-workspace-memory-contract-v1.md`: every ordinary
status except audited/closed is eligible, with received purchase-order and fund-owner protections.
The single-row action opens a reasoned confirmation; batch removal validates the whole selection.
Row actions omit duplicate and print. Print is available inside the expense dossier and reuses the
standard purchase-order PDF layout (folio/status, metadata, financial summary, item table, signatures),
retaining the expense's native currency and resolving account/user names from scoped catalogs.

Per the 2026-09-10 payment-correction and selection-print decision, Edit Expense remains a
standard-form modal and includes **Undo last payment** in its state-control section. It loads
real payment history, previews the reopened balance, and requires a reason and inline confirmation;
no nested dialog or free paid/pending status selector is introduced. Earlier installments and
evidence survive, unsaved form fields remain, and saving/closing cannot race a reversal. The
payment owner rejects stale versions, closed/audited/source-owned expenses and posted journals.
After success the same modal and table receive the saved balance/version. Reversed payments remain
visible and identified in the dossier, including reason and timestamp.

The Expenses header Actions menu also exposes **Print selection**. It opens the
`ExpenseTablePrintModal` operational workspace, following the quote preview interaction: inspect,
download PDF or print. Selected rows are the initial scope when available; otherwise use all filtered
results. The user can change between these scopes. Both preserve table order across pages and
visible data columns, exclude action controls, resolve scoped reference names, and keep native
currencies separate. Fund groups expand into their original expenses once. The company identity
must finish loading before output; an unavailable logo/name must not fabricate an issuer. This
Tab Print uses shared PDF primitives, repeatable table headers and footers, and splits exceptionally
wide column selections into readable sections. The individual expense voucher remains available.

Expense capture, payable capture and payment use searchable selectors for large reference catalogs.
Optional notes/evidence are collapsible; submitting and error states preserve captured values.
The payable draft's chosen transaction currency must survive preferred-currency changes while open.
Per the 2026-09-10 payable-capture decision, its registration date is assigned automatically on
submission using the local calendar date; only the due date is editable. Today/+7/+15/+30 shortcuts
set an explicit due date, and a past due date retains the existing overdue classification. Required
fields and save failures are explained in the modal. A failed provider creation must retain its name
for retry and must never insert or select a phantom local provider. The submit guard prevents
concurrent submissions; monetary previews and payloads use consistent cent rounding.
These presentation changes do not alter approval, tax, settlement or correction rules.

Budget capture remains a three-step Indice wizard: Cost, Schedule, Final review. Avoid repeated
section titles and explanations. Keep the accounting account visible and searchable; show unit
and business as a compact editable disclosure, and keep the optional note collapsed when empty.
The wizard's tax choices (none, included, added) map to the existing tax controls and calculations;
other forms retain their current presentation. Calendar-period shortcuts only fill the end date:
the existing recurrence generator owns the preview. Review all classification, tax, date and amount
values before submission, with links back to each step that preserve the draft. Editing an existing
line must describe that single-line operation. Summaries never imply that editing creates a series.
Keep Cancel left, progression right, and a contextual summary in the shared footer. No new API,
posting rule, permission, preferred-currency behavior or recurrence semantics are introduced by
this 2026-09-10 UI decision.

Provider capture and editing remain a standard form. Keep name, type and status visible; present
optional contact, tax details, assignment and owners as native disclosures with live summaries.
Use existing searchable reference selectors, retain unit/business scoping and preserve optional
values when sections close. Name-only creation keeps existing defaults and does not invent an
assignment. Native validation must open a collapsed section containing an invalid field before
focusing it. Save errors retain the draft; in-flight guards prevent repeated submissions. Localize
labels and feedback consistently and retain the finance/Sales modal tones. This 2026-09-10 UI
decision preserves provider payloads, backend validation, permissions and persistence behavior.

Payment Accounts uses the shared operational KPI area below its filters: one non-interactive
active-account balance, account/status counts, a thin status distribution and a scope sentence.
The balance uses the existing `PAYMENT_ACCOUNT_BALANCE` backend metric with explicit visible
active account IDs and the global preferred currency. Virtual Petty Cash rows are counted
separately and never passed as Treasury IDs or added to this balance. Label that boundary in
the scope sentence. Counts for status navigation retain the search/type scope while ignoring
the selected status facet; activating the selected status clears it. Monetary results follow
the visible status scope and refresh on same-ID balance updates. Display unavailable during
loading/failure, disclose partial conversion and provide retry. Never persist aggregates in
filter memory. This local 2026-09-10 presentation decision changes no monetary owner formula.

The accounting-account column exposes a separate classification action for an ordinary expense
that has not generated a posted journal. This action may change only the accounting account;
it does not reopen commercial, payment, or currency fields. Internal fund expenses display their
server-resolved fund name and a locked accounting account. External managed fund expenses are
excluded from the company Expenses workspace. Posted journal sources require an accounting adjustment.

The Expenses table presents authorized internal-fund receipts as one expandable row per fund and
native currency within the selected expense-date period. Apply row filters before grouping and
paginate the presentation rows, preserving the receipt-level KPI/export inputs. Summary rows are
read-only, are not selectable mutation targets, and never become persisted expenses. A partial
filter identifies matching receipts explicitly. The breakdown retains original records and their
evidence actions; multiple accounting accounts remain distinct. Summary money uses the existing
server monetary-aggregate owner, with visible loading/error/retry states and no stale or zero fallback.
The fund link opens the existing Petty Cash operation with a fund selection; it grants no extra access.

Bulk expense entry displays calendar dates as `DD/MM/YYYY`, while sending ISO dates to the API.
It accepts the existing three Excel columns and optional payment-account and accounting-account
columns with searchable selectors, followed by an Includes tax checkbox. Checked amounts are
gross: the backend separates subtotal and tax without increasing the entered total; unchecked
rows have no tax. Currency is captured from the preference when opening the modal; tax profiles
use the existing currency-associated catalog and variable profiles require an explicit rate.
Paid imports record full payment with optional payment/accounting accounts; an unassigned payment
must not move any bank balance. Pending imports only preselect the account for future payment.
Header selectors apply a payment/accounting account to all entered rows and supply defaults for
new capture; a header tax checkbox supports all/none/mixed. Explicit spreadsheet cells and row
edits override defaults. Blank rows stay excluded and clearing/reopening resets defaults.
Supplied payment accounts must match native currency. Each batch contains at most 200 used rows. Save failures keep
the capture open; creation retries reuse a request key, and bulk edits preserve existing taxes
and native currency. Selected-row status actions follow the Finance bulk owner contract: paid
records actual remaining-balance payments, while pending/overdue explicitly change the due date.

### Sales, POS, Inventory, And Receivables

Sales, Point of Sale, Inventory, and Receivables must feel like sibling modules.

They share the commercial operating language:

- customer
- product
- inventory
- provider
- quote
- sale
- order
- invoice
- payment
- discount
- credit
- balance
- due date
- collection status

They should share:

- module header behavior
- tab navigation rhythm
- title bars
- filters
- table controls
- pagination
- empty/loading/error states
- customer/product/sale visual language
- modal system
- action hierarchy

---

## 4. Module Ownership Rules

Sales owns:

- commercial pipeline
- opportunities
- quotes
- sales records
- customer-facing commercial flows

Point of Sale owns:

- checkout
- POS orders
- billing/invoicing workflow
- discounts
- cuts
- POS credit interactions
- POS customers when needed for checkout

Inventory owns:

- products
- stock
- warehouses
- providers
- purchase orders
- stock movement context

Receivables owns:

- credit sales
- accounts receivable
- installments
- payments
- credit customer policies
- collection status
- credit line visibility

Expenses owns:

- expenses
- payables
- providers when financially scoped
- finance accounts
- expense approvals and payments

Funds owns:

- purpose-bound and custodied money;
- funding, returns, statements, cuts, shortages, and carry-forward;
- the evidence-to-expense bridge without becoming a second payable ledger.

Finance owns payment accounts and their available, pending, and total balance presentation. POS
owns register settlement policy and cut operations, but its destination selectors use Finance
accounts and never expose a checkout-time account override. The approved interaction and ownership
contract is `docs/pos-treasury-settlement-contract-v1.md`.

Do not duplicate product, inventory, provider, or purchase-order interfaces inside Sales or POS if Inventory owns them.

### Quote inventory context

The Sales quote builder keeps inventory context inside its existing `Modal Wizard Índice`; it does
not introduce a nested inventory modal or a separate readiness workflow. In the item-selection
step:

- commercially usable products are shown without an abstract `requires review` filter;
- an active warehouse can be selected as the availability context;
- products configured without inventory tracking remain selectable without stock restrictions;
- inventory-tracked products display availability for the selected warehouse and keep that
  warehouse snapshot on the quote line;
- a quote does not deduct or reserve stock; availability is revalidated by the sale workflow before
  inventory is committed;
- missing price and blocking product states use actionable copy instead of implying an unowned
  approval queue.

### Quote-to-opportunity relationship

- Linking a quote to an existing opportunity, creating an opportunity from a quote, or keeping the
  quote without an opportunity must use the quote connection API and wait for server confirmation.
- The relationship dialog remains open and disables duplicate actions while the mutation is in
  progress; a failed mutation is visible and retryable.
- Approved commercial quotes create or link an open opportunity. A `closed_won` quote closes the
  linked opportunity as won in the same backend transaction and synchronizes its terminal flow.
- The editable quote lifecycle is intentionally short: Draft, Sent, Approved, Rejected, and
  Expired. Historical Viewed and Negotiation records render as Sent; historical Closed Won records
  render as Approved. Winning remains an opportunity/sale outcome, not an extra quote decision.

### Connect AI: interim ChatGPT setup

Until the public Indice app is available in ChatGPT, the visible `Connect AI` experience starts on
`How to connect` and presents ChatGPT as the only provider:

- `My connections` remains implemented but outside public navigation until the published flow
  needs it again;
- the manual guide uses the production URL `https://app.indiceapp.com/api/v1/ai/mcp`, OAuth
  authentication, and an explicit copy control;
- each step includes a simplified visual reference within the Indice design system instead of a
  screenshot that can become stale when the ChatGPT interface changes;
- the guide states that option names and locations may vary by plan and workspace, and does not
  promise availability when ChatGPT has not enabled developer mode;
- passwords, tokens, and secrets are never requested, rendered, or stored on this screen.

Do not duplicate accounts receivable logic inside Expenses if Receivables owns it.

---

## 5. Required Module Structure

Every business module must live in its own owner folder inside the active `react/src/app` runtime
tree. Use the appropriate existing category and routing convention; do not create a second module
entry point.

Example:

```txt
react/src/app/BasicModules/
  HumanResources/
  Sales/
  PointOfSale/
  Inventory/
  Receivables/
  Expenses/
  PettyCash/
  ProcessesTasks/
```

Each module must contain its own tabs or sections.

Each tab must behave as a self-contained feature.

Recommended tab structure:

```txt
TabName/
  TabName.tsx
  components/
    header/
    filters/
    table/
    modals/
    detail/
    kpis/
    charts/
  hooks/
  services/
  utils/
  adapters/
  constants/
  data/
  translations/
  types/
```

This is a responsibility map, not a requirement to create empty folders. Add a directory when the
tab actually owns that concern. Prefer cohesive local code over ceremonial layers.

Page files should mainly:

- orchestrate layout
- connect hooks
- pass props
- compose components

Business logic must not live inside JSX.

---

## 6. Exportability Rule

A module must not be tightly coupled to another module.

Allowed shared dependencies:

- auth/session context
- company/user context
- design-system components
- shared API client
- global shell/layout
- shared UI primitives
- generic utilities
- generic table utilities
- generic modal shells

Not allowed:

- importing business logic from another module
- importing tab logic from another module
- hidden dependencies on unrelated folders
- copying components instead of extracting primitives
- module-specific global translation files
- cross-module state coupling
- hardcoded module routes inside unrelated modules

If two modules need the same UI pattern, extract a shared UI primitive with no business logic.

---

## 7. Naming And Localization Rules

All code identifiers must be written in English:

- folders
- components
- variables
- hooks
- functions
- props
- state names
- types
- constants
- filenames
- translation keys

The user may communicate in Spanish.

Frontend code must use scalable SaaS naming conventions.

Good:

- `EmployeesTable`
- `AttendanceOverview`
- `ExpenseSummaryCard`
- `PayrollDetailModal`
- `CreditSalesView`
- `ReceivablesTable`

Avoid Spanish component or variable names.

Visible UI copy must not be hardcoded inside components.

Visible copy must live in local translation files.

Required locales:

- `en-CA`
- `en-US`
- `fr-CA`
- `es-MX`
- `es-CO`
- `pt-BR`
- `ko-CA`
- `zh-CA`

Fallback locale:

- `en-CA`

Never use generic locales:

- `en`
- `es`
- `fr`
- `pt`
- `ko`
- `zh`

Recommended translation structure:

```txt
translations/
  en-CA.ts
  en-US.ts
  fr-CA.ts
  es-MX.ts
  es-CO.ts
  pt-BR.ts
  ko-CA.ts
  zh-CA.ts
  types.ts
  index.ts
```

All visible copy must be localizable:

- titles
- subtitles
- buttons
- filters
- placeholders
- table columns
- badges
- states
- tooltips
- empty states
- loading states
- error states
- modal copy
- summaries
- export headers
- chart labels
- confirmation messages

Localization must be contextual, not literal.

Examples:

- Mexico: RFC, Nomina, Colaboradores
- Colombia: NIT, DIAN, Personal
- Canada: Payroll, Employees, Province
- Quebec: Employes, Paie
- Brazil: CPF, Folha, Colaboradores

---

## 8. Module Color System

Every module must keep a stable identity color.

Use these colors unless the existing module already defines a stronger approved color:

- Human Resources: aqua `#59C3A5`
- Sales: coral `#FF6B5E`
- Point of Sale: coral `#FF6B5E`
- Inventory: coral family, connected to Sales and POS
- Expenses: green `#147514`
- Receivables: green `#147514`
- Petty Cash: green finance family
- Processes And Tasks: yellow `#F4C84A`
- Dashboard: blue `#2563EB`

Use module colors for:

- active tabs
- main CTA
- soft title bar background
- icon/emoji containers
- status accents when semantically correct
- selected states
- modal headers
- modal footers
- focus rings when appropriate

Do not invent random shades per screen.

### 8.1 Indice Brand Color Hierarchy

The product-wide brand hierarchy is distinct from the module color system.

Indice uses blue as its primary product signature. Aqua remains an approved
supporting accent and the stable identity color of Human Resources. Global
product chrome must not take ownership of a module color.

#### Primary product signature

- Indice product blue: `#2563EB`
- Indice product blue hover: `#1D4ED8`
- Indice product blue pressed: `#1E40AF`
- Indice deep blue: `#143675`
- Dashboard module blue: `#2563EB`, sharing the canonical blue while retaining
  ownership through module context and composition
- Indice soft blue: `#EFF6FF`
- Indice soft blue strong: `#DBEAFE`
- Indice blue border: `#BFDBFE`

Use blue for:

- global authenticated top bar and account navigation, using Indice blue
  `#2563EB` with soft-white `#F8FAFC` foreground content
- product-level notifications, preferences, configuration, and currency tools
- authentication and other institutional product surfaces
- Dashboard module identity
- analytical and data-oriented interfaces
- charts and executive reporting
- links and functional navigation where a module accent does not apply
- institutional authority and high-trust communication
- deep-blue editorial covers and formal brand surfaces

Prefer white, graphite, and neutral backgrounds for the majority of the
interface. Use solid blue selectively for decisive product headers and actions;
soft-white text on `#2563EB` meets normal-text contrast requirements.

#### Supporting aqua accent

- Indice aqua: `#59C3A5`
- Indice aqua hover: `#3AAE90`

Use aqua for the Human Resources module identity and for deliberately approved
supporting illustrations or details. Do not use aqua as the default for global
navigation, account menus, system configuration, or product-level selection.
Do not place white text on `#59C3A5` or `#3AAE90`; use graphite `#222831` when
an approved light-aqua surface requires text.

#### Supporting brand accents

- Coral `#FF6B5E` and yellow `#F4C84A` are supporting identity accents.
- Graphite `#222831` is the default primary text color.
- Semantic success, warning, and error colors remain reserved for their actual
  meanings and must not be substituted by brand colors.

#### Decision order

When selecting a color, apply this order:

1. Use the client identity for customer-facing or white-label content.
2. Use the approved module color when the element belongs to a module.
3. Use Indice blue when the element represents the product, global navigation,
   system configuration, analytics, technology, or institutional authority.
4. Use aqua only for Human Resources or an explicitly approved supporting
   brand detail.
5. Use semantic colors only for real status, risk, warning, success, or error.

Do not replace aqua globally: module identity, semantic meaning, dark mode, and
text contrast must be audited component by component. The generic `primary`
token is not a substitute for the explicit Indice brand tokens because shared
theme behavior may redefine it by color mode.

Shared UI compatibility aliases such as `--primary`, `--ring`, and
`--sidebar-primary` must resolve to the explicit Indice blue tokens in both
light and dark mode. They provide the product-level fallback only; a
module-owned control still applies its approved module tone through its typed
presentation contract or local composition.

Authentication, invitation, authorization, and other institutional entry
surfaces use the explicit Indice blue tokens for their primary panels, actions,
focus, and selected states. A deliberate multicolor ecosystem band or product
illustration may retain the approved module accents when it represents the
catalog rather than a global action.

### 8.2 Indice Product Typography System

Indice uses a restrained enterprise typography system. The interface should
feel calm, precise, contemporary, and easy to scan. Hierarchy comes primarily
from scale, spacing, alignment, color, and dividers, not from repeatedly
increasing font weight.

The approved product model combines:

- the editorial restraint of the Indice Document Print Standard
- the mobile clarity, spacing, focus, and touch hierarchy of the Kiosk
  experience

Kiosk structure is an approved product reference. Existing heavy typography in
individual kiosk implementations is not a typography precedent.

#### Font family

Use the approved Indice sans-serif stack. Until a dedicated brand font is
formally selected, licensed, loaded, and verified across all supported scripts,
use an explicit platform-safe system stack:

```css
system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Do not introduce a new web font in an isolated module. A future font-family
change requires product-wide performance, localization, glyph, PDF, kiosk, and
accessibility review.

#### Approved weights

- Regular `400`: default for body copy, descriptions, table cells, form help,
  metadata, and secondary information.
- Medium `500`: titles, record names, button labels, active navigation,
  important labels, and primary values.
- Semibold `600`: exceptional emphasis only, such as a critical total, a
  decisive KPI, or a safety-critical action whose hierarchy cannot be achieved
  through position, scale, or color.
- Bold `700`, Extra Bold `800`, and Black `900`: prohibited in the operational
  product interface.

Marketing artwork or an approved campaign surface may request a documented
exception. That exception does not become a product precedent.

Do not use weight `600` merely because a component is clickable, selected, or
inside a header. Most primary actions remain weight `500`.

#### Product type scale

Use the following default ranges. Responsive adjustments may change size
without changing the semantic level.

| Role | Default size | Weight | Line height |
|---|---:|---:|---:|
| Page or module title | 26–30 px | 500 | 1.15–1.25 |
| Workspace or kiosk title | 22–24 px | 500 | 1.2–1.3 |
| Section title | 18–20 px | 500 | 1.25–1.35 |
| Card or record title | 15–16 px | 500 | 1.3–1.4 |
| Primary KPI or critical value | 20–28 px | 500; 600 by exception | 1.1–1.2 |
| Body and form input | 14–16 px | 400 | 1.45–1.65 |
| Button label | 14–16 px | 500 | 1.2–1.4 |
| Form or table label | 12–14 px | 400 or 500 | 1.35–1.5 |
| Supporting metadata | 11–12 px | 400 | 1.4–1.6 |

Do not reduce important operational copy below 12 px to force content into a
layout. Use wrapping, spacing, responsive structure, or progressive disclosure.

Public kiosk controls should normally use at least 14 px text, with 16 px for a
dominant action. Large-text accessibility mode may increase the scale while
preserving the same semantic hierarchy.

#### Hierarchy rules

- Use sentence case for titles, labels, tabs, buttons, and table headers.
- Do not force uppercase for routine labels, status names, navigation, or
  section headings.
- Small uppercase overlines are allowed only for rare editorial or legal
  context and must remain readable in every supported locale.
- Avoid wide letter spacing on ordinary interface copy.
- Use one dominant title per surface.
- A normal card should expose no more than two emphasized text levels.
- Use whitespace, alignment, neutral color, and dividers before adding weight.
- Do not bold complete paragraphs, help text, descriptions, or table rows.
- Numeric columns should use tabular numerals when the active font supports
  them.
- Critical information must not rely on weight alone.

#### Component defaults

- Page and module headers: title `500`; subtitle `400`.
- Tabs: active and inactive labels `500`; selection is expressed through
  background, border, indicator, and color.
- Buttons: `500`, including the primary action.
- Form labels: `400` by default and `500` only when the label carries necessary
  hierarchy.
- Inputs and selected values: `400`.
- Table headers: `400`; table cells `400`. The active sort uses module color, not additional weight.
- Card titles and record names: `500`; descriptions `400`.
- KPI labels: `400`; KPI values `500`, or `600` only for a documented critical
  value.
- Badges and statuses: `500` maximum; semantic meaning comes from text, icon,
  border, and color.
- Modal title: `500`; description and body `400`; actions `500`.
- Kiosk title, identity name, and dominant action: `500`.

#### New work and migration

All new or substantially refactored product components must follow this system.
Do not add `font-bold`, `font-extrabold`, or `font-black` to operational
frontend code.

Existing screens are migrated incrementally through shared primitives first,
then module-owned components. Do not perform an unreviewed global replacement
of font classes. Every migration must preserve:

- semantic hierarchy
- responsive wrapping
- localization and long strings
- light and dark mode
- large-text accessibility mode
- touch target size
- financial and safety-critical emphasis
- print and PDF behavior when shared content is exported

The first governed migration target is the shared Kiosk Engine presentation
layer. Later migrations should prioritize shared modal, header, title bar, KPI,
table, and form primitives before editing individual screens.

#### Typography acceptance checklist

- [ ] Body copy and descriptions use weight `400`.
- [ ] Titles, names, navigation, and actions normally use weight `500`.
- [ ] Every use of weight `600` has a specific hierarchy justification.
- [ ] No operational component introduces weight `700`, `800`, or `900`.
- [ ] Routine labels are not forced to uppercase.
- [ ] Hierarchy remains clear without bolding complete blocks.
- [ ] Mobile, desktop, dark mode, and large-text mode remain legible.
- [ ] Spanish, English, French, Portuguese, Korean, and Chinese content can
      wrap without clipping where those locales are supported.
- [ ] TypeScript, tests, and the production build pass.
- [ ] Representative before-and-after visual evidence is reviewed before a
      shared typography migration is closed.

---

## 9. Page And Module Header Standard

Every module should start with a consistent header.

Structure:

Left:

- module title
- module subtitle
- optional breadcrumb or sibling module navigation

Right:

- contextual selectors
- return button when applicable
- module-level actions only

Rules:

- no marketing hero sections
- no oversized banners
- no decorative panels
- no random gradients
- keep it operational and compact
- use the Human Resources module header as the default model

Example:

```txt
Human Resources
Manage employees, attendance, payroll, and team operations.
```

Example for Receivables:

```txt
Receivables
Manage credit sales, accounts receivable, payments, and customer credit policies.
```

### 9.1 Configurable Workbar Position

The authenticated Indice shell supports a personal presentation preference for
the white module workbar. The approved positions are:

- `top`: the default horizontal composition
- `left`: a desktop sidebar containing module identity, favorites, and module tabs

The blue global product header always remains at the top. Currency,
notifications, language, learning mode, and account controls must not move into
the module sidebar. Moving the workbar must not change routes, permissions,
module behavior, tab availability, or business state.

`IndiceModuleShell` and the Dashboard header are the canonical consumers.
Modules that have not adopted a canonical shell keep the top composition until
they are migrated deliberately; kiosk, terminal, billing-recovery, public, and
fullscreen workspaces retain their specialized layout contracts.

Responsive and visual rules:

- `left` becomes active at the `lg` breakpoint; smaller screens render `top`
  automatically without changing the saved preference
- the sidebar uses a neutral surface, compact spacing, an independent vertical
  scroll area, and a stable width of `18rem`
- favorites retain the owning color of every destination
- the active module tab retains the owning module tone through a soft surface
  and a visible leading accent
- dark mode, long localized labels, keyboard focus, and 44px touch targets must
  remain operable

The entry point is `Configure workbar` in the authenticated account menu. It
opens a blue product-level Standard Form Modal with preview cards for `top` and
`left`; Cancel has no effect and Apply updates the current shell without a page
reload.

This preference is scoped to the authenticated company and user. Persist it
through the existing workspace-state contract with `moduleKey=system` and
`tabKey=workbar-layout`, and keep the same scoped local envelope as the offline
cache. Validate restored values against the closed `top | left` enum. This is a
presentation preference only and never grants authority.

### 9.2 Dual Workspace Mode

The authenticated desktop shell may present two independent Indice workspaces
inside the same browser window. Users enable this mode from the Configure
workbar modal. It is available from `1280px` upward and opens the secondary
workspace on Dashboard so the user explicitly chooses its module and tab.

Runtime and security rules:

- keep one blue global product header owned by the primary shell
- render the two workspaces at equal width, with independent scrolling and
  navigation histories
- isolate the secondary route context in a fixed same-origin frame; never
  accept an arbitrary or externally supplied frame URL
- reuse the authenticated browser session without copying credentials; every
  API call remains subject to the normal backend authentication, tenant,
  entitlement, and permission checks
- the deployment frame policy must remain same-origin (`SAMEORIGIN` and
  `frame-ancestors 'self'`)
- an embedded workspace must not render another global header, payment banner,
  product analytics tracker, or recursive dual workspace; it also must not
  compete with the primary shell for persistence of the workbar preference
- collection-blocked and billing-recovery flows remain single-workspace

While dual workspace is active, canonical module shells use their horizontal
workbar even if the user's saved workbar position is `left`. This temporary
adaptation does not overwrite the preference, and closing dual workspace
restores the selected workbar position.

The modal may enable dual workspace but must not disable it. Once active, the
only product control that closes the mode is the visible `Close dual screen`
button in the secondary workspace toolbar. Closing updates the same scoped
workspace-state preference used by the workbar. The toolbar and frame require
localized accessible names, visible keyboard focus, and a loading state.

---

## 10. Tab Standard

Tabs must follow the Human Resources pill style.

Required:

- emoji or icon plus label
- rounded pill
- active state with module color
- inactive state with soft gray
- hover state using the module color softly
- responsive wrapping
- clear spacing from page header and content

Active tab:

- module color background
- white text
- subtle shadow

Inactive tab:

- gray soft background
- dark readable text
- module-color hover

Do not create underlined tabs, boxed tabs, or unrelated tab systems unless the approved reference already uses them.

### 10.1 Internal Workspace Navigation Engine

All new internal navigation must use `IndiceWorkspaceNavigation`. Do not build
local `tablist` markup for each page.

The engine has three approved variants:

- `sections`: compact pills for sibling views inside the same workspace. It is
  the default for module and administration sections.
- `views`: a compact grouped selector inspired by the Agenda Table / Kanban /
  Agenda controls. It uses a neutral bordered container, rounded rectangular
  buttons, and the owning module's active color. Use it for alternate analytical
  views; it is the required reference for new or reorganized basic-module KPI /
  Indicators tabs. It has the same keyboard behavior and safe mobile wrapping
  as `sections`.
- `workflow`: numbered steps with icon, label and short description when the
  order teaches a real operating sequence. Completed steps show their progress,
  while available steps remain directly accessible.

Shared behavior:

- the active item uses the owning module tone;
- inactive items use the same neutral surface and module-color hover;
- labels, icon sizing, radius, spacing and focus treatment are identical across
  modules;
- `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Home` and `End` move focus
  and activate the destination among available tabs;
- navigation exposes `tablist`, `tab` and `aria-selected` semantics;
- unavailable items must be disabled, not silently interactive;
- mobile layouts wrap safely instead of clipping labels;
- the owning view keeps the active state in the URL and durable workspace
  memory through `useWorkspaceNavigationMemory` when the tab represents a
  shareable or recoverable work context.

Use `workflow` only for a sequence with a clear dependency or learning value.
For ordinary peer sections, use `sections`; for the basic-module analytical
format described below, use `views`. A workflow navigator is not a modal wizard
and must not introduce Next/Back requirements unless the business flow itself
requires validation before advancing.

The approved KPI presentation (2026-09-15) generalizes the Human Resources layout
as the reference for basic modules: Overview, Charts, By unit and the owning
module's detail entity (Employees in RH). Reuse `IndiceWorkspaceNavigation` with
`variant="views"` and the owning module tone. The selector sits between the title
and one shared filter bar. A `grid min-w-0 grid-cols-1 gap-6` shell gives equal
24 px spacing between those bars; neutralize inherited title-bar bottom margins.
Keep filters and table state when switching views, and retain the existing print
scope and business calculations. The mapping, adaptation parameters, exceptions
and acceptance checklist live in [`KPI_TAB_STANDARD.md`](./KPI_TAB_STANDARD.md).
The format is implemented in RH; this decision does not imply that other modules
have already been migrated or verified.

### Platform administration: customer workspace

The approved customer-service organization (2026-09-13) uses the existing Operational Workspace
Modal as the common entry point from `/platform-admin`. Its peer sections are Summary, Users and
roles, Modules and courtesy access, Billing and collections, and Customer history. Use
`IndiceWorkspaceNavigation` for these sections. Customer and billing shortcuts open the relevant
section of this same company workspace. Preserve the customer identity and return section when a
Standard Form Modal handles a courtesy adjustment, commercial account change, distributor
assignment, trial extension, or payment request. The customer identity column remains visible
while the portfolio scrolls horizontally.

User invitations and company-role editing can be completed within the customer workspace. Keep
platform authority distinct from company roles and retain the existing backend permission gates.
The legacy commercial code `SUPER_ADMIN` is presented as Client when describing the company;
this does not rename a user's role or grant platform privileges. Public demo access, commercial
trial/courtesy validity, and billing state remain separate concepts.

Show only effective benefits as current access, with explicit dates for scheduled or expired
grants. List and detail must share the backend's operational summary. Billing and history reads
are scoped and paginated by company in the backend; the shared distributor presentation must not
implicitly gain platform-only read APIs. Invoice amounts due and paid have separate labels.
Credential recovery and identity mutations require their own approved authentication-domain
flows; a navigation change must not imply that those actions already exist.

The customer-modal clarity decision (2026-09-14) keeps one row per product in Modules, including
its effective source and validity. Administrative grant records are read-only disclosures within
that row; do not repeat the same product withdrawal in a second administrative list. Subscription
changes and administrative courtesy changes remain distinct actions when both sources exist.
Keep contract versions/prices available in the contract disclosure and retain backend previews
before confirming commercial changes. Hide an empty available-offer section.

For platform administration, Users owns the entry point for adjusting courtesy seat/storage
capacity and the list of those grants, with explicit quantities. Use a focused Standard Form
Modal for product access or capacity, an explicit expiration choice, a reason, and one submit
action. Preserve input on failure and ask before discarding edits. The Operational Workspace
retains a pending commercial review across peer sections and guards closing before confirmation.
Use the existing Confirmation Modal for withdrawals; its explanation follows the actual grant
type and backend revocation scope, including multiple stored-active product grants and future
dates. Successful mutations remain successful if a subsequent read fails. These presentation
rules do not change entitlements, subscription pricing, API contracts, or distributor authority.

### 10.2 Administrative Workspace Header

Authenticated global workspaces use `IndiceAdminWorkspaceHeader` when they need a persistent local
identity above sibling sections. It standardizes the back action, blue Índice identity, title,
subtitle, optional status/actions and the slot for `IndiceWorkspaceNavigation`.

The component owns presentation only. Each consumer continues deciding its destination, permission,
status and available navigation items. The containing page owns sticky positioning so embedded or
dual-workspace contexts can disable persistence without creating another header engine. Kiosk Center
and `Plan, people and payments` are the reference implementations: both use the same compact anatomy,
while their domain content, actions and authorization remain independent.

### 10.3 Tab And Workspace Memory Standard

Moving between module tabs must not erase a user's safe operating context. Use one shared memory
contract instead of adding unrelated `localStorage` or `sessionStorage` effects inside each view.

The contract has four distinct layers:

1. **Navigation memory** remembers the last valid module tab through `useRoutedModuleTab`. The
   active tab remains represented by the route so Back, Forward, reload, bookmarks, and direct
   links behave predictably.
2. **Workspace memory** uses `useWorkspaceNavigationMemory` for recoverable state owned by one
   tab. Its key is scoped by authenticated company, user, `moduleKey`, and `tabKey`, with the
   workspace-state API as the durable copy and scoped local storage as the offline cache.
3. **Session position** may remember scroll or another harmless return position for the current
   browser session. It is not durable business state.
4. **User preferences** such as visible columns, column order, and column widths follow Section 17.
   They remain independent from filters and are not cleared by a normal tab-memory reset.

Approved workspace-memory fields include:

- search and filter values
- period and date scope
- organization, unit, business, ownership, category, and status scope
- sort field and direction
- table or board view mode
- page size
- the current page only when the restored result scope is still valid; otherwise return to page 1
- safe analytical display choices that do not change permissions or authoritative calculations

Do not persist as tab memory:

- open modals, popovers, menus, confirmations, or disclosure-only UI state
- loading, submitting, retry, toast, error, or success state
- row selection, bulk selection, pending deletion, or another consequential transient action
- fetched records, backend totals, exchange rates, permission results, entitlements, or tenant/user
  authority
- credentials, session material, tokens, sensitive drafts, payment data, or secrets

Restore order and behavior:

1. Start from the current factory defaults.
2. Merge the newest valid durable workspace state.
3. Apply explicitly mapped URL fields last; a direct link always wins over remembered state.
4. Validate every restored enum, identifier, and dependent option against the user's current
   permissions and available data. Reset stale or unauthorized values safely.
5. When a parent scope invalidates a remembered child filter, clear the child and persist the
   corrected state.
6. If a restored secondary filter is active, open `More filters` automatically. Derive this from
   active values instead of persisting the disclosure button's open/closed state.
7. Restore scroll only after the view is ready, without stealing focus.

Operational rules:

- use stable English `moduleKey` and `tabKey` identifiers; visible localized labels are not storage
  keys
- wait for navigation memory before redirecting an absent or invalid tab route
- debounce remote saves and keep the scoped local copy usable when the backend is temporarily
  unavailable
- do not let remembered state trigger a mutation, reopen a destructive flow, or bypass current
  authorization
- `Clear filters` restores the documented factory filter state, resets pagination, persists that
  result, and leaves column preferences unchanged
- a schema or option change must normalize recognized fields and ignore unknown legacy fields; it
  must not make the tab unusable
- do not add a second tab-memory hook or module-specific storage convention when either shared hook
  covers the use case

Required regression coverage for a recoverable workspace:

- configure tab A, navigate to tab B, and return to tab A without losing tab A's filters
- reload and restore the last valid tab and its safe workspace state
- open a direct URL and confirm its mapped fields override remembered values
- confirm different companies and users never read one another's memory
- remove or revoke a remembered option and confirm the view returns to a valid state
- clear filters and confirm the factory filter state persists while column preferences remain

---

## 11. Emoji And Icon Identity Standard

Indice can use emojis, but they must feel intentional.

Use emoji/icon identity in:

- module cards
- module tabs
- title bars
- empty states
- learning mode hints

Rules:

- the emoji/icon must sit beside the label
- in title bars, place the emoji/icon inside a soft colored identity container when possible
- use the module accent color for the container border/background
- keep emoji size controlled
- do not mix many icon styles in the same section
- prefer Lucide icons inside action buttons when available

Approved title bar feel:

```txt
[soft colored icon box] Collaborators
Files, assignments, schedules, and payroll context
```

---

## 12. Title Bar Standard

Every tab or major view must have a title bar.

Reference:

- Human Resources, Collaborators title bar

Required structure:

Left:

- emoji/icon
- view title
- view subtitle

Right:

- primary CTA
- up to two frequent secondary or contextual actions
- Columns when the table has useful optional columns and the action remains direct under the
  hierarchy below

Action hierarchy and overflow:

- determine the eligible title-bar actions after applying permissions, entitlements, feature
  state, and the current view context
- when there are one to three eligible actions, render all of them directly; `Columns` remains a
  normal visible action when it is part of this set
- when there are four or more eligible actions, keep the three highest-priority actions direct
  and render a fourth neutral `Actions` overflow control
- the primary CTA always remains direct and uses the module accent; frequent contextual actions
  take the remaining direct positions
- whenever the overflow exists, place `Columns` inside it together with infrequent,
  administrative, export/import, or destructive actions as applicable; never duplicate
  `Columns` outside and inside the menu
- never create an `Actions` overflow only to hide `Columns` when the complete action set contains
  three or fewer actions
- the overflow control is a container and does not count as a fourth direct business action; the
  visible business-action limit remains one primary plus at most two secondary actions
- keep the overflow as the final control, preserve each item's permission, disabled, busy, and
  confirmation behavior, and provide keyboard navigation, focus return, and a localized label
- responsive layouts may wrap or stack the same controls, but must not change their priority or
  silently remove an action

Visual:

- full width
- rounded-lg or rounded-xl
- soft module-color background
- subtle border using module color
- compact
- operational
- no heavy shadows
- no eyebrow or accent-colour micro-label above the title; the icon, title, and subtitle
  carry the complete identity of the view

Active terminal exception:

- a full transactional terminal may replace the standard title bar only while an active
  operating session requires persistent register, operator, elapsed-time, fiscal, and
  close-session controls
- the specialized terminal header replaces the title bar; never render both and consume
  the operational workspace twice
- it must preserve a clear view identity, the active operating context, keyboard-accessible
  actions, responsive behavior, and the module accent for the primary operation
- loading, setup, empty, blocked, and no-session states still use the standard shared title bar
- document the exception beside the owning workspace; Point of Sale `Venta` uses its active
  shift header as the approved reference

Example:

```txt
Collaborators
Files, assignments, schedules, and payroll context

[Columns] [Add collaborator]
```

Examples by eligible action count:

```txt
Three actions: [Kiosk] [Columns] [Create fund]

Four or more: [Kiosk] [Approve] [Create fund] [Actions v]
Actions menu: [Columns] [Export] [Deactivate]
```

---

## 13. Filter Bar Standard

Reference:

- Human Resources, Collaborators filters

Required:

- Search always first
- then Unit
- then Business
- then Period
- then Status
- then Category
- then contextual filters

Visual:

- white card
- rounded 24px
- labels above controls
- consistent input height
- responsive wrapping
- clear title: `Filters`

Input standard:

- height: 44px
- radius: 12px
- neutral border
- focus ring: module color

Operational list behavior:

- use the shared `IndiceFilterBar`, `IndiceFilterSearch`, and `IndiceFilterSelect` primitives
- keep the bar header anchored by `Filters`; a compact filtered-result count and the shared
  disclosure/clear controls may share that header, while live timestamps, notices, and refresh
  actions belong in the title bar, data context, or table footer
- expose only filters that materially narrow the current dataset
- allow an inline clear action inside search when a query is active
- debounce remote search by approximately 250-350 ms; local in-memory search may update immediately
- reset table pagination to page 1 whenever a filter changes
- when filters depend on one another, changing the parent narrows the child options and clears
  a child value that is no longer valid

Operational lists with more than four useful filters must use progressive disclosure:

- keep Search and the two or three filters used for the primary operating decision visible
- place organizational, classification, ownership, evidence, or other secondary filters behind
  a `More filters` action in the filter-bar header
- show the number of active secondary filters in the action and expose its state with
  `aria-expanded`
- automatically open the secondary area when a restored or externally applied secondary filter
  is active; never hide an active value from the user
- keep custom date inputs adjacent to the selected period control even when the secondary area is
  collapsed
- provide one clear action whenever any filter differs from the view's factory state; clearing
  restores that state, resets pagination, and collapses the secondary area
- omit controls that do not materially affect the current view; an empty or ignored selector must
  not be rendered merely to keep all sibling tabs structurally identical
- do not add `More filters` when the complete useful filter set contains four or fewer controls;
  use the normal responsive grid for that simpler case

Use the shared `IndiceFilterDisclosureActions` and `IndiceFilterAdvancedSection` presentation
primitives for this pattern. The owning module retains filter values, defaults, option derivation,
and business behavior.

Recoverable list and analytics filters follow the tab-memory contract in Section 10.3. Do not add
ad hoc browser-storage effects for new views. Remember filter values, not the open state of `More
filters`; restored active secondary values reveal that section automatically.

Analytical views may use `IndiceFilterSegmented` inside the same shared card for a small,
bounded choice such as Today, Week, Month, or All. The segmented control must keep its label,
44px minimum height, 12px radius, module focus treatment, and `aria-pressed` state. It is a
filter control, not a substitute for tabs.

Do not scatter filters across the screen.

---

## 14. KPI, Status, And Insight Standards

KPIs should be decision-oriented only.

Avoid vanity metrics.

Operational list views may replace analytical KPIs with a compact status navigator when
the user needs to find work that requires attention. These cards are optional and must:

- represent mutually understandable operational states, not decorative totals
- expose a short label, current count, semantic icon, and one-line explanation
- act as a faceted filter when the corresponding state can narrow the table
- show selection through border, color, and `aria-pressed`, without increasing font weight
- update their counts from the current base scope, such as search, organization, warehouse,
  business, unit, or date
- ignore the selected status facet when calculating sibling-card counts, so another state
  remains discoverable and selectable
- return to the unfiltered state when the selected card is activated again

A hybrid operational strip may include at most one non-clickable transactional aggregate
when it is essential to the current workflow, for example the real sales accumulated during
today's POS operation. That aggregate must come from the backend source of truth, include
open, closing, and closed-today activity as applicable, consolidate into the global preferred
currency before summing, disclose that currency, and refresh with the live operational data.
Daily transaction aggregates must use the completed transaction timestamp with half-open
day boundaries in the approved operational time zone. Do not infer a day's sales from the
opening or closing date of a shift, because one shift may span multiple calendar days.
Keep any additional sales, ticket, average, or closing analysis in the analytics tab or
selected-row detail.

For complete KPI-tab composition, analytics behavior, formulas, comparisons, charts,
rankings, responsive rules, and the implementation checklist, also follow:

- [`KPI_TAB_STANDARD.md`](./KPI_TAB_STANDARD.md)

The specialized KPI standard extends this operating system. It does not replace or
override the rules in this document.

For basic-module KPI / Indicators pages, its Section 3 defines the approved
internal-view format: title, grouped view selector, shared filters, data context
and selected content. Keep primary cards in Overview and distribute graphs,
organizational comparisons and record detail into their own views. The owning
module color remains predominant. Section 22 provides the per-module adaptation
template; Section 23 identifies RH as the visual reference and Expenses as a
financial-analysis reference. Operational KPI strips below keep their own
contract and are not converted into four-view dashboards.

KPI strip:

- lives outside dashboard cards
- uses icon, value, label
- follows Expenses visual density
- follows HR placement rhythm

Status distribution:

- use when the entity has meaningful statuses
- keep thin and operational
- use semantic colors
- skip if no status exists

Insight bar:

- one sentence
- explain the current filtered state
- tell the user what they are seeing

Example:

```txt
Showing 25 employees - 21 active - 4 inactive.
```

### Global Preferred Currency

The preferred-currency control must always remain visible in the global app header.

It is a persistent system utility, not a module-level control. Do not hide it when the
active view has no monetary fields and do not duplicate it inside module title bars.

Rules:

- saving a preferred-currency change immediately updates monetary KPIs, financial summaries,
  selected-row totals and table footers across modules
- convert every native amount to the preferred currency before summing
- never sum raw values from different currencies
- counts, percentages, dates and operational statuses are never converted
- row-level and legally relevant values preserve their native currency
- analytical KPI cards may show the preferred total as the primary value and the native
  breakdown as secondary context
- operational payment-composition bars lead with the ISO-labeled native breakdown, show
  payment methods on one converted basis, and then show a separately labeled total in the
  preferred currency; follow Section 6.2 of `KPI_TAB_STANDARD.md`
- missing or stale exchange-rate information must produce a visible warning state
- the compact header control opens the shared blue Standard Form Modal; the modal uses USD as
  the exchange-rate base
- preferred-currency and rate edits remain in modal draft state until the user saves; closing or
  cancelling the modal does not alter the active configuration
- the daily-refresh action refreshes the modal draft and may replace the current-day server cache,
  but does not change the user's active preference until save
- manual rate editing uses progressive disclosure and stays secondary to the daily reference
- every applied source shows its institution, dataset, observation date, verification status and
  a link to its published source; missing or stale data keeps a visible warning
- the user preference persists across navigation and sessions

The global control may be visually compact on non-financial views, but it remains visible
and opens the same currency and exchange-rate modal everywhere.

---

## 15. Table Standard

### 15.1 Approved reference and ownership

Normative visual and interaction reference:

- `react/src/app/BasicModules/PointOfSale/CashRegisters/CashRegistersWorkspace.tsx`
- route: `/point-of-sale/cajas`
- approved surface: `Cajas y turnos`
- executable shared contract: `react/src/app/components/table/IndiceTableEngine.tsx`
- canonical width and scroll canvas: `IndiceOperationalTable`
- canonical header renderer: `IndiceTableHeaderRow`

This reference combines the Human Resources density, the shared filter and pagination
primitives, and the approved POS action treatment. New operational tables must use this
contract unless a documented view-type or mobile constraint requires a different
presentation.

The table engine owns presentation and interaction only. The module remains owner of:

- data fetching and mutation
- permissions
- business validation
- available columns
- sorting semantics
- filters
- row actions and their consequences
- API and backend error handling

### 15.1.1 Business entity before transport records

An operational table must represent the entity the business user recognizes, not the
row shape returned by an integration or billing provider.

Rules:

- group technical variants of the same entity into one business row when they belong to
  the same decision; for example, show one product with `Monthly` and `Annual` columns
  instead of two records with repeated internal codes
- use the commercial name as the primary identity; internal codes, provider IDs and
  synchronization references belong in detail or edit views
- translate integration states into a short business state such as `Ready to sell`,
  `Requires attention`, or `Inactive`
- filters and result counters operate on the same grouped business entity shown in the
  table, never on hidden transport rows
- KPI counts use that same entity unit; one product with monthly and annual prices counts
  as one product, not as two configured price records
- preserve native variants and provider references in the underlying model so editing,
  audit, synchronization and troubleshooting remain precise

Do not expose technical identifiers merely because they are available in the API. Show
them only when they are required to complete an authorized technical action.

### 15.2 Required composition

Use this vertical order:

1. module or tab title bar
2. feedback, warning, or insight strip when useful
3. shared `IndiceFilterBar`
4. optional decision-oriented KPI strip or operational status navigator when useful
5. table shell
6. shared pagination attached to the table shell

Do not place a second title, description, search field, and segmented filters inside the
table shell. Search and contextual filters belong in the separate shared filter bar.

The table shell uses:

- full available width
- white or neutral background
- `24px` corner radius
- neutral one-pixel border
- subtle shadow only
- horizontal overflow at the table boundary, never at the whole page
- the same dark-mode hierarchy as the shared filter bar

### 15.3 Header contract

Every table header uses:

| Property | Standard |
|---|---|
| Header row height | `52px` |
| Header text | `13px` |
| Weight | `400` |
| Line height | `16px` |
| Case | Sentence case |
| Default color | Neutral slate |
| Active sort color | Module color |

Rules:

- all labels, including `Actions`, use exactly the same size and weight
- use one primary business concept per header; supporting metadata belongs below the
  primary value in the cell
- do not join independent concepts with `/`, `+`, `&`, `and`, or `y`; split them into
  separate columns only when users must compare both values independently
- a combined cell may still contain related context, for example `Quote` with the customer
  below it or `Value` with margin below it, but the header names only the primary concept
- render every operational header row through `IndiceTableHeaderRow`; modules must not
  recreate the header background, height, typography, sort control, resize handle, leading
  utility column, or `Actions` header locally
- headers align with their column data
- identity and descriptive text align left
- numeric and monetary values align right
- compact statuses may align center
- `Actions` is always the final visible column and normally aligns right
- do not rename `Actions` to `Manage`, `Controls`, or an entity-specific verb
- do not use bold text, uppercase, or smaller type to distinguish the actions header

Sortable headers:

- support ascending and descending order
- expose `aria-sort`
- use one accessible button covering the label and sort icon
- show the active direction icon persistently
- reveal an inactive sort icon on hover or keyboard focus
- change color, not font weight, for the active sort
- reset pagination when sort changes
- preserve deterministic secondary ordering when two values compare equally

### 15.4 Column width and resizing contract

Desktop operational tables with three or more data columns should support direct column
resizing when users compare records repeatedly. Small bounded tables may keep fixed widths.

#### Optional leading control column

The first narrow utility column is not mandatory. Its presence and type are selected
explicitly for each table by the product owner or by the implementation request. A table
may use:

1. an expand or collapse chevron for hierarchical rows, details, sessions, or secondary content
2. a selection checkbox for bulk operations
3. both controls only when the request explicitly requires both behaviors
4. no leading control column

Do not infer or add expansion, selection, or bulk behavior merely because another table
uses it. When an implementation request does not specify a leading control:

- preserve the existing behavior during a migration
- use no leading control for a new table
- ask only when the missing decision blocks a required workflow

Leading control rules:

- keep the utility column fixed and compact; it is not sortable or user-resizable
- use the same width and alignment in the header and every body row
- provide an accessible hidden header label for expansion controls
- show a header checkbox only when select-all is a real supported operation
- keep row alignment when a specific row cannot expand; do not shift its data columns
- use an icon button for expansion and an actual checkbox control for selection
- provide visible keyboard focus and an accessible label for every control
- both controls may share one leading area only when their targets remain clear and usable

Required resize behavior:

- drag the right boundary of the header to resize columns
- before user customization, assign every column enough minimum width to show its complete header label, sort icon, padding, and resize handle; never make a truncated header the default or minimum state
- define a useful content minimum for every resizable column and use the larger value between the content minimum and the complete-header minimum
- choose one resize mode explicitly per table: `bounded` preserves total width by resizing two adjacent columns, while `expandable` changes one column independently and lets the table grow inside its local horizontal scroll container
- use `expandable` for wide operational tables whose complete headers or comparison fields would otherwise be compressed; increasing a column must increase the table width instead of stealing space from its neighbor
- render resizable tables through `IndiceOperationalTable`; its declared width is the exact
  sum of the current column widths, including fixed leading and actions columns, so the
  browser cannot redistribute spare space and make the same definition look different
  across modules
- use only the horizontal-scroll viewport supplied by `IndiceOperationalTable`; do not wrap
  it in a second `overflow-x-auto` container
- keep structural columns such as selection or row expansion fixed when appropriate
- persist widths in browser storage with a unique, versioned table key
- restore safe defaults when stored values are missing, invalid, or from an old version
- support `ArrowLeft` and `ArrowRight` on a focused separator
- allow a larger keyboard step with `Shift`
- restore defaults with double-click or `Home`
- expose the separator role, orientation, current value, minimum, maximum, and accessible label
- show a subtle divider at rest and the module color on hover, focus, or drag

Use `table-layout: fixed` with a declared `colgroup` when the table supports resizing.
Long non-critical text may truncate, but the full value must remain available through a
tooltip, detail row, expansion, or another accessible disclosure. Never truncate a critical
amount, status, or action.

Column resizing is a presentation preference. It must never modify backend data or the
user's permission scope.

### 15.5 Row and cell typography

| Content | Size | Weight | Treatment |
|---|---:|---:|---|
| Ordinary cell | `14px` | `400` | Neutral primary text |
| Primary record identity | `14px` | `600` maximum | One line when practical |
| Supporting code or metadata | `12px` | `400` | Neutral secondary text |
| Status badge | `12px` | `500` maximum | Semantic text and tone |

Default operational rows use a minimum height of `64px`. Use consistent horizontal cell
padding. Keep a primary identity and one supporting metadata line in the same cell when
they describe the same entity, for example warehouse name plus code, unit, and business.

Do not create separate visible columns for metadata that is only useful as context. Group
it below the primary identity when that produces a clearer operational scan.

### 15.6 Status contract

Statuses use compact semantic badges with readable text. Color may reinforce meaning but
must never be the only signal. Keep labels short and operational, such as `Available`,
`Shift open`, `Closed today`, or `Register required`.

Do not use status badges as action buttons. State-changing actions belong in the final
actions group.

### 15.7 Row action group

Actions always appear in the final column inside one neutral action group, not as loose
icons distributed across the row.

Action group presentation:

- inline flex container
- neutral border and soft neutral background
- `12px` corner radius
- `6px` internal padding
- `6px` gap between buttons
- subtle shadow
- dark-mode equivalent

Desktop icon buttons use `36px` square controls with rounded corners. On touch-first or
mobile surfaces, use at least `44px` square controls. Every icon-only action requires an
accessible label and tooltip.

Use this semantic order when the actions exist:

1. primary record action such as view, select, or edit
2. document, copy, duplicate, share, or open
3. enable, pause, resume, or another state transition
4. destructive action last

Use the module tone for primary record actions, neutral or purpose-specific tones for
secondary actions, and red only for destructive actions. Destructive actions require an
`IndiceConfirmationDialog`. Disable actions that are known to be invalid and explain why
in their accessible label or tooltip. The backend remains the final authority.

The initial width of the actions column must follow its visible action count. For compact
desktop buttons, calculate it from cell padding, group padding, button width, borders, and
gaps. The approved reference is approximately:

| Visible actions | Suggested initial width |
|---:|---:|
| 1 | `74px` |
| 2 | `116px` |
| 3 | `158px` |

For four or more actions, widen the column only when all actions are frequent and
operationally necessary. Otherwise keep the most important actions visible and move safe
secondary actions into an accessible overflow menu. Never hide the destructive action in
a menu when doing so makes its presence ambiguous.

### 15.8 Required functionality

Every operational table must support:

- sorting when useful
- pagination
- page size selector
- loading state
- empty state
- error state
- row actions
- column visibility when useful
- bulk selection when useful
- responsive horizontal scroll

Mandatory pagination options:

```txt
10, 25, 50, 100, 200
```

Pagination must use the shared pagination style already applied across modules. Do not
create new pagination UI per module.

Pagination changes, filters, search, and sorting must preserve a valid page. Reset to page
one when the current page may no longer exist.

### 15.9 Responsive behavior

- filters wrap through `IndiceFilterBar` before the table begins to scroll
- the table owns its horizontal scrolling container
- do not compress text below the approved type scale to avoid scrolling
- keep selection and expansion controls compact and fixed when useful
- prefer a purpose-built mobile record card when horizontal comparison is no longer the primary task
- if the table remains on mobile, preserve readable columns, keyboard focus, and touch targets of at least `44px`

### 15.10 Shared table engine

Operational tables use the shared presentation primitives:

- `IndiceTableShell`
- `IndiceOperationalTable`
- `IndiceTableHeaderRow`
- `IndiceTableColGroup`
- `IndiceResizableTableHead`
- `IndiceTableUtilityHead`
- `IndiceTableActionsHead`
- `IndiceTableActionGroup`
- `IndiceTableActionButton`
- `DataTablePagination`
- `usePersistentColumnWidths`

`IndiceTableHeaderRow` receives typed column definitions containing the business id, label,
alignment, sort capability, current and default width, content minimum, and accessible
resize label. It is the only approved renderer for the complete operational header row.
`IndiceTableColGroup` must consume the same visible definitions so header and body widths
cannot drift apart.

`IndiceOperationalTable` receives the exact total width calculated from those definitions.
It owns `table-layout: fixed`, the rendered width, and the single local horizontal-scroll
viewport. Declaring only `min-width` on a generic full-width table is not compliant because
the browser may stretch and redistribute the columns.

These primitives must remain business-agnostic. Do not move module queries, permissions,
labels, business validation, or action handlers into the shared table engine.

### 15.11 Acceptance checklist

A table is not standardized until:

- filter controls use the approved separate filter bar
- the leading control is expand, select, both, or absent exactly as requested
- header labels share one size, weight, and vertical rhythm
- each header names one primary concept and remains complete on one line
- the complete header and `colgroup` come from the shared table engine
- the table canvas uses the exact sum of its declared columns and owns one local horizontal scrollbar
- sortable columns work in both directions and expose accessible state
- declared alignments match their cells
- row typography follows the primary, ordinary, and supporting hierarchy
- statuses use semantic text and tone
- actions are last, grouped, labelled, equipped with tooltips, and permission-aware
- destructive actions confirm before mutation
- resizable columns enforce minimums, persist safely, and reset accessibly when enabled
- pagination offers `10, 25, 50, 100, 200`
- loading, empty, error, and restricted states remain understandable
- horizontal overflow is contained locally
- mobile targets and keyboard navigation remain usable
- dark mode preserves contrast and hierarchy
- TypeScript and production build pass

Tables must not become dashboards. Do not overload visible columns. Maintain comfortable
operational density.

---

## 16. Table Toolbar Standard

When a table needs controls, use this order.

Left:

- selected count
- bulk actions
- compact insight text when useful

Right:

- columns
- export/import when applicable
- pagination controls

Do not place unrelated buttons around the table.

---

## 17. Column Configuration Standard

Reference:

- `react/src/app/components/rh/ColumnasConfigModal.tsx`
- Human Resources, Collaborators, Configure Columns

This is the approved columns modal pattern.

All `Columns` buttons across modules should open the standardized columns modal or a direct evolution of it.

Expose column configuration only when the table has useful optional fields or user-relevant order
choices. A short fixed summary, semantic reconciliation table, or table with no meaningful optional
columns must not add a `Columns` action merely for visual consistency.

Entry point:

- when the complete title-bar action set contains three or fewer actions, keep `Columns` visible in
  the title bar
- when four or more actions require the shared `Actions` overflow, place `Columns` inside that menu
  and do not duplicate it as a direct button
- when a table is embedded in a workspace without its own title bar, `Columns` may live in the table
  toolbar defined in Section 16
- every entry point opens the same approved columns modal and restores focus to its trigger on close

Column visibility, order, and width are durable user preferences under this section, not tab-filter
memory. Switching tabs or clearing filters must not reset them. `Restore defaults` inside the
columns modal resets only the column preference to the current factory preset; it does not clear
filters, navigation memory, or other workspace state.

Required:

- module-colored header
- close button in the header
- visible columns count
- search input
- Select all
- Deselect all
- Restore defaults
- draggable/reorderable rows when existing logic supports it
- checkbox
- label
- description
- drag handle when applicable
- module-colored footer
- Cancel
- Apply changes

Rules:

- do not remove column data from state
- control visibility and order only in UI
- default visible columns must be operational, not decorative
- the factory preset should expose only the identity, decision, amount, due-date, status, and
  action fields needed for the dominant workflow; secondary data remains available in the modal
- persist a user's visibility and order choices independently from the factory preset
- `Restore defaults` must restore the current Indice factory visibility and order
- when a factory preset becomes more compact, migrate only an exact recognized legacy factory
  preset; do not overwrite a real user customization, even when it contains many visible columns
- fixed/locked columns must remain visible
- do not create alternative columns modal designs
- generic shell may live in shared UI only if it contains no business logic

---

## 18. Modal System

All modals must follow the Indice modal system.

Before designing or changing a business modal, assign exactly one of these workflow types:

1. Confirmation Modal
2. Standard Form Modal
3. Modal Wizard Índice
4. Operational Workspace Modal

`ColumnsModal` remains an approved system utility, not a fifth business workflow type. A Full Workspace is an exceptional route or surface reserved for POS, kiosk, builder, or another specialized workspace.

### Mandatory modal classification checklist

Answer these questions in order and stop at the first match:

1. **Does the user only need to confirm or cancel one consequential action?** Use a Confirmation Modal.
2. **Can the task be completed as one coherent form, without dependent stages?** Use a Standard Form Modal.
3. **Does the task contain two or more dependent stages that require gated progress and a final review?** Use a Modal Wizard Índice.
4. **Must the user compare, select, configure, or reconcile dense information in parallel?** Use an Operational Workspace Modal.

Additional mandatory checks:

- if a flow only looks long, first simplify and group it before promoting it to a wizard
- if stages do not depend on each other, use a standard form with sections
- if users need a table, builder, multi-pane context, or bulk operations throughout the task, use an operational workspace
- do not use a workspace only to obtain a wider modal
- record the selected modal type in the implementation plan and final report
- deviations from the assigned type require a written UX reason

Do not create one-off modal styles.

Do not introduce new modal libraries.

Do not create random widths.

Do not create fullscreen modals unless the flow is POS, kiosk, builder, or workspace.

Avoid nested modals.

Use module color for modal header and footer.

Header and footer must feel connected.

Body remains white or neutral in light mode and dark-neutral in dark mode.

Close button must be circular and visible.

Overlay blur/dim must be consistent.

Inputs must have consistent height, border, radius, and label style.

Required fields must be clear.

Use clear section titles.

Avoid visual noise.

### Notification Center Workspace

The global notification center is an Operational Workspace Modal with the blue Indice product
identity. It preserves notification ownership and actions while presenting them as a compact,
prioritized inbox.

Rules:

- use the shared `IndiceModalFrame`; do not maintain a separate overlay, header or footer shell
- keep Inbox and Settings as one sticky segmented switch inside the workspace
- show total, unread, urgent and actionable counts in one compact summary rail; only urgent work
  receives a prominent shortcut
- keep search and status visible while module and priority filters use progressive disclosure
- group visible notifications by Today, Yesterday and Earlier without changing their source order
- distinguish unread items with the Indice blue indicator and a restrained soft surface
- keep the whole notification row openable; expose Open and Mark read directly, while Dismiss stays
  in an overflow menu
- secondary row actions may appear on hover for pointer devices but must remain visible on touch,
  keyboard focus and narrow screens
- use skeleton rows during refresh and retain explicit error and empty states

---

## 19. Modal Wizard Índice

Official visual and interaction reference:

- Sales → Nueva venta
- `react/src/app/BasicModules/Sales/Sales/components/SalesDetailModal.tsx`
- `react/src/app/BasicModules/Sales/Sales/components/SalesCreateForm.tsx`
- `react/src/app/BasicModules/Sales/components/SalesModalFrame.tsx`

As of July 17, 2026, Nueva venta is the canonical reference for new Indice wizards. Reproduce its hierarchy and interaction model before introducing module-specific variation.

Secondary implementation reference:

- `react/src/app/BasicModules/HumanResources/Employees/components/CreateEmployeeModal/CreateEmployeeModal.tsx`
- `react/src/app/BasicModules/HumanResources/Employees/components/CreateEmployeeModal/components/EmployeeModalFrame.tsx`
- `react/src/app/BasicModules/HumanResources/Employees/components/CreateEmployeeModal/components/StepProgress.tsx`

Use this pattern for:

- multi-step create flows
- onboarding
- setup flows
- guided configuration
- flows where the user must complete clear stages

Required:

- centered modal
- approximate width: Nueva venta, around `max-w-[900px]`
- rounded corners, around `rounded-[28px]`
- solid module-colored header
- header includes icon, current-step context, title, and one short description
- all copy uses natural sentence case; do not use all caps for section titles or labels
- use medium weight by default and reserve bold weight for the title, critical totals, and the primary action
- compact step progress is the first element in the body
- completed, active, and upcoming steps must be visually distinct
- grouped body sections with clean neutral background
- each step contains only the information and decisions needed at that moment
- inherited or read-only data uses a compact summary surface
- validation appears next to the current step and explains how to continue
- body may scroll while header and footer remain stable
- state must survive Back and Continue navigation
- final step provides a complete review before submission
- footer remains visible
- solid module-colored footer
- Cancel on the left
- a short live summary may sit between Cancel and the progression actions
- Back, Continue, Preview, and Create or Save remain on the right
- Preview is shown only when it is meaningful, normally on the final review step
- disabled buttons remain visually clear
- production shadow

Do not add a permanent side summary to a standard-width wizard. Use compact contextual summaries inside each step and a complete final review. An operational workspace may use a persistent side panel when parallel context is essential.

### Reusable Modal Wizard Índice components

Shared, presentation-only primitives live in:

- `react/src/app/components/indice-modal/IndiceModalWizardStepper.tsx`
- `react/src/app/components/indice-modal/IndiceModalFooter.tsx`
- `react/src/app/components/indice-modal/IndiceModalValidation.tsx`
- `react/src/app/components/indice-modal/IndiceModalSummary.tsx`
- `react/src/app/components/indice-modal/index.ts`

Responsibilities:

- `IndiceModalWizardStepper`: renders completed, active, and upcoming steps with the module accent; it does not decide whether a step is valid
- `IndiceModalFooter`: maintains Cancel or secondary content on the left, live summary in the center, and progressive actions on the right
- `IndiceModalValidation`: presents one or more accessible error, warning, or information messages
- `IndiceModalSummary`: presents inherited, read-only, operational, or final-review values at consistent density

Business modules remain responsible for:

- step definitions and order
- validation rules and error copy
- API payloads and adapters
- permission checks
- save and retry behavior
- deciding when Back, Continue, Preview, or Save is enabled

### Wizard implementation checklist

- [ ] The modal was classified as a wizard using the mandatory checklist.
- [ ] Every step has one clear objective.
- [ ] Continue validates the current step before navigation.
- [ ] Back preserves completed input.
- [ ] The final step reviews all consequential values.
- [ ] The shared stepper, footer, validation, and summary primitives are reused.
- [ ] Copy uses sentence case and restrained font weight.
- [ ] Header and footer use the module color.
- [ ] Keyboard focus, Escape behavior, disabled states, and error announcements were verified.
- [ ] Loading, empty, validation, saving, failure, and success states were reviewed.

Do not use wizard steps unless the flow truly requires multiple stages.

---

## 20. Operational Workspace Modal Standard

Reference:

- `react/src/app/BasicModules/HumanResources/Control/components/ScheduleModal.tsx`
- `react/src/app/BasicModules/HumanResources/Control/components/modals/schedule/ScheduleModalFrame.tsx`
- `react/src/app/BasicModules/HumanResources/Control/components/modals/schedule/EmployeeSelectionTable.tsx`
- `react/src/app/BasicModules/HumanResources/Control/components/modals/schedule/ScheduleBuilder.tsx`

Use this pattern for:

- operational configuration
- schedule assignment
- bulk assignment
- rule builders
- reconciliation workflows
- complex approval flows
- workspace-like assignments

Required:

- large modal width close to content area but not browser fullscreen
- approximate width: HR Edit Schedule, around `max-w-[96rem]`
- approximate height: up to `92vh`
- solid module-colored header
- two-column layout allowed
- left side: selection, table, records, entities
- right side: configuration, steps, summary, rules
- footer must be solid module color
- footer should include live summary text
- primary action stays bottom-right
- Cancel remains available
- body handles internal scroll without losing header/footer

Avoid unnecessary full-screen behavior.

---

## 21. Standard Form Modal

Reference:

- `react/src/app/BasicModules/HumanResources/Records/components/CreateRecordModal.tsx` for approximate width and clean form density only

Important:

Do not copy its old plain header/footer if it is not aligned with the Indice modal system.

Upgrade standard form modals to the Indice modal system.

Use this pattern for:

- create record
- create act
- create provider
- create customer
- create product
- standard edit forms
- small transaction forms

Required:

- module-colored header
- header includes icon, title, and short supporting description
- grouped form sections
- neutral body
- module-colored footer when possible
- primary action on the right
- Cancel always visible
- width similar to the HR Records New Record modal
- no wizard steps unless truly needed
- no excessive nested cards inside the body

---

## 22. Confirmation Modal

Reference:

- `react/src/app/components/ConfirmDeleteDialog.tsx`

Use confirmation modals for:

- delete
- cancel with data loss
- irreversible status changes
- destructive actions
- risky workflow transitions

Required:

- clear title
- clear consequence
- affected record name when available
- Cancel always visible
- destructive action clearly styled as destructive
- loading/disabled state during submission

Never use:

- `window.alert`
- `window.confirm`
- silent destructive actions

---

## 23. Modal Button Rules

Primary action:

- white button on colored footer with module-colored text
- or module-colored button when footer is white only if legacy structure requires it

Secondary action:

- transparent or outline treatment

Cancel:

- always visible
- never hidden behind icon-only controls

Destructive:

- red/destructive treatment
- must not look like a normal primary action

Do not duplicate submit buttons.

---

## 24. Modal Architecture Rules

Keep business-specific modal files inside their module/tab folder.

Generic modal shell components may live in shared UI only if they contain no business logic.

The shared `react/src/app/components/indice-modal/` primitives are the approved foundation for wizard progression, footer layout, validation feedback, and compact summaries. Extend them through typed presentation props; do not add Sales, HR, Expenses, or other module-specific rules to shared components.

Split large modals into:

- `ModalShell`
- `ModalHeader`
- `ModalBody`
- `ModalFooter`
- `FormSections`
- `SummaryPanel`
- hooks
- utils
- validation helpers
- adapters

Target file size:

- under 300 lines when realistic

Do not mix:

- modal shell
- form state
- validation
- API transformation
- submit behavior
- rendering

### 24.1 Selection and scale rules

Modal selectors must scale from a small company to a large multi-unit company.

- Sort selectable records alphabetically by their visible name unless an operational order is explicitly required.
- Do not show inactive employees, customers, providers, products, or materials for new operations.
- Historical records may display inactive linked entities as read-only references; an explicit `Include inactive` control is required for historical search.
- Use a simple selector only for small, bounded lists. Use debounced search, server pagination, and contextual filters for large catalogs.
- Search by the meaningful identifier for the entity: name, code, email, SKU, folio, or equivalent.
- Preserve the active query, filters, and selection while the modal remains open.
- When a user cannot find a permitted entity, provide a quick-create action when the workflow allows it. Return to the original modal and select the newly created entity automatically.
- Apply dependent scope in this order: company, unit, business, then the available catalog.
- Sales selectors and public catalogs use the same commercial-readiness contract: active status,
  explicit commercial visibility, and a positive price. Type labels do not contradict an enabled
  sales channel, and custom category labels fall back to the tenant-provided value when no
  translation exists.

### 24.2 Capture-minimum and currency rules

- Do not ask users to type data the system can derive from a selected entity.
- Selected entities load their relevant read-only context automatically, such as unit, availability, price reference, location, responsible user, or tax context.
- Use a selector, wizard, or operational workspace when a free-text field would duplicate known data.
- Every money-entry modal preloads the global preferred currency as the proposed transaction currency.
- The user may change the transaction currency. The selected currency becomes the transaction's native currency and is never overwritten by later global-preference changes.
- Converted values are analytical aids only. Show their rate and effective date when displayed.

### 24.3 Shared action toolbar

Business actions inside a modal must use the same action language as table actions. Footer actions remain reserved for workflow progression.

- Reuse one shared `ModalActionToolbar` presentation primitive for view, edit, duplicate, attach, download, delete, export, and print actions.
- Keep action order, icon, label, tooltip, disabled state, and destructive treatment consistent across modules.
- Use one canonical action for Excel export, one for PDF export, and one for printing; modules must not substitute unrelated icons.
- Use icon plus label when space permits; icon-only controls require an accessible tooltip and label.
- Destructive actions remain visually separated and require an `IndiceConfirmationDialog`.

### 24.4 State, evidence, and accessibility rules

- Use one pattern for saving, success, failure, retry, loading, empty, and permission-restricted states.
- Warn before closing a modal with unsaved changes.
- Reuse one attachment pattern for upload, preview, download, replace, and delete.
- Hide or disable unauthorized actions with an understandable explanation; do not expose unusable controls.
- Use consistent localized date, time, and timezone controls.
- Support keyboard navigation, focus restoration, Escape behavior, visible focus, and controls of at least 44 CSS pixels.

---

## 25. View Type System

Every tab must be classified before editing.

### Catalog View

Examples:

- Customers
- Products
- Providers
- Employees
- Credit Customers
- Assets

Required:

- module/tab title bar
- filters
- table
- columns modal
- create/edit modal
- empty state
- loading state
- error state

### Transaction View

Examples:

- Sales
- Expenses
- Purchase Orders
- POS orders
- Credit Sales
- Payments

Required:

- title bar
- filters
- KPIs when useful
- status distribution when useful
- table
- transaction modal
- row actions

### Workspace View

Examples:

- POS
- Agenda
- Kanban
- Inventory count
- Schedule builder
- Kiosk

Required:

- master/detail or workspace layout
- persistent actions
- contextual summary
- operational focus
- no dashboard-style decoration

### Kiosk Experience Branch — `KioskIdentityGate`

Public kiosks are a specialized branch of the Workspace View. This branch extends the Frontend Operating System; it does not create a separate design system and it does not turn the public experience into a modal.

Authority is divided as follows:

- this document owns frontend composition, hierarchy, responsive behavior, localization, accessibility, and reusable presentation primitives;
- [`Kiosk Standard Engine v2`](./kiosk-standard-engine-v2.md) owns public-channel architecture, identity policy, security, sessions, capabilities, audit, and module boundaries;
- the module owns business rules, API calls, validation, permissions, payloads, and the result of every operation;
- Modal Engine applies only to kiosk administration, configuration, confirmation, and other explicitly classified modal workflows.

The first approved visual reference is Caja Chica. Its PIN entry state defines the baseline for migrating other controlled kiosks without changing their backend contracts or business behavior.

#### Scope and applicability

Use `KioskIdentityGate` when a public kiosk must identify a collaborator, provider, customer, or other expected person before exposing protected information or actions.

Do not add it blindly to:

- anonymous catalogs;
- paired customer displays;
- public information-only experiences;
- any kiosk whose approved policy does not require identity.

Those surfaces continue to use `KioskPublicShell` and the relevant workspace primitives, but they enter their authorized flow without an identity gate.

#### Canonical composition

```text
KioskPublicShell
├── KioskUtilityBar
│   ├── language selector
│   └── accessibility settings
├── KioskWorkspaceHeader
│   ├── module identity
│   ├── public-safe kiosk name
│   └── connection or session context when useful
├── KioskSessionBoundary
├── KioskIdentityJourney                  conditional
│   ├── KioskIdentityGate                 PIN baseline
│   │   ├── masked PIN input
│   │   ├── KioskPinKeypad
│   │   ├── primary identify action
│   │   ├── privacy message
│   │   └── Powered by www.indiceapp.com
│   └── KioskFaceVerificationStep         optional or required by policy
├── ModuleKioskWorkspace                  shown only after authorization
├── KioskActionFeedback
└── KioskSessionControls
```

Approved shared frontend location:

```text
react/src/app/components/kiosk-engine/
  KioskPublicShell.tsx
  KioskIdentityGate.tsx
  KioskWorkspacePrimitives.tsx
  useKioskSessionBoundary.ts
```

These shared components are presentation and interaction primitives only. They must not import module services, create domain payloads, decide permissions, or contain module-specific business rules.

#### Identity flow

The canonical identity sequence is:

```text
preparing
  -> identification-required
  -> identifying
  -> identified
  -> verification-required        when policy requires it
  -> verifying
  -> authorized
  -> module workspace
```

Any state may transition to a safe error, expired, unauthorized, offline, or reset state. A timeout or completed operation must clear the PIN, biometric captures, expected identity, and sensitive module data before returning to the gate.

PIN requirements:

- render the configured number of masked positions rather than showing the PIN;
- support the on-screen numeric keypad and physical keyboard input;
- use `inputMode="numeric"`, an appropriate `enterKeyHint`, and an accessible label;
- provide Backspace and Clear without requiring the device keyboard;
- enable the single primary action only when the expected PIN length is complete;
- block duplicate submissions and show progress during identification;
- never log, persist, recover, or reveal the PIN in frontend storage or visible copy;
- let the module adapter perform authentication and map the response into the next UI state.

Facial-recognition requirements:

- determine the expected identity first; facial verification is one-to-one and never a mass search;
- render the facial step only when the bootstrap or module policy declares it optional or required;
- do not activate the camera before an explicit user action;
- explain camera purpose and provide clear retry, cancel, permission-denied, unavailable, and failure states;
- reuse the approved `LiveFaceChallenge` capture behavior until a shared presentation-only kiosk adapter replaces it;
- require explicit consent for enrollment and keep enrollment distinct from verification;
- allow fallback only when the module policy explicitly permits it;
- keep biometric templates, comparison, retention, and audit outside frontend components.

The approved first implementation of `KioskIdentityGate` covers the PIN state. Facial verification is composed as the next identity step; it must not be forced into the PIN component or duplicated independently by each kiosk.

#### Visual and content standard

The gate must feel modern, calm, and minimal:

- one centered identity card, approximately `max-w-[30rem]`;
- one clear title, one short instruction, one input, one keypad, and one primary action;
- module color is an accent for focus, completed PIN dots, and the primary action, not a large decorative background;
- neutral page and card surfaces with restrained borders and shadows;
- no dashboard decoration, KPI cards, promotional hero, or repeated organizational summary before identity;
- no large Índice logo inside the identity gate;
- no duplicated language selector or accessibility control;
- no internal database IDs, sequential business numbers, tokens, or unsafe scope values in public copy;
- show only the minimum safe module, kiosk, location, fund, or connection context needed to orient the user;
- place `Powered by www.indiceapp.com` below the identity card as subtle attribution, visually secondary to the task;
- keep all visible copy localized through the owning module's catalog.

The attribution must remain readable and keyboard accessible. It must never compete with the primary action or appear as an advertising card.

#### Mobile and responsive behavior

The identity gate is mobile first and must also remain composed on tablet and desktop.

- use `100dvh` or an equivalent safe viewport strategy;
- respect bottom safe-area insets;
- maintain touch targets of at least 44 by 44 CSS pixels, with 48 pixels preferred for primary controls;
- prevent horizontal overflow at 320 CSS pixels and above;
- keep the PIN input, primary action, and numeric keypad in the first operational reading path;
- allow vertical scrolling on short screens without hiding keypad actions;
- use a compact header and remove nonessential pre-authentication information;
- after authorization, the module workspace may expand beyond the gate width according to its view type.

#### Authorized compact workspace pattern

Controlled transaction kiosks for Caja Chica, Procesos y Tareas, Asistencia, and Cuentas por Pagar continue as compact, mobile-first workspaces after identity. Mobile-first is not mobile-only: opening the public route on tablet or desktop preserves the same PIN, session, launcher, and operational workspace without a mandatory QR interstitial. Authorization must not switch the experience into an administrative desktop dashboard.

Venta en ruta follows the same branch. Its mobile product picker uses the workspace scroll instead of
a nested catalog scroll, prioritizes in-stock and already-selected items, and exposes search, category,
availability, image, SKU, description, tax, stock, quantity, and line amount with touch-safe controls.
For card or transfer, the payment step must require an eligible Treasury bank destination and explain
that confirmation records the income there; cash custody and credit remain visibly pending workflows.

Use the following composition:

```text
KioskUtilityBar
KioskWorkspaceTitle
KioskWorkspaceTabs              when the kiosk has sections
KioskIdentityOrSessionContext   only the safe context needed to operate
KioskMetricStrip                optional, two columns
KioskFilters                    optional, one column on small phones
KioskPrimaryContent             forms or cards, never a wide table
KioskStickyPrimaryAction        when the current state has one dominant action
```

Rules:

- controlled operational workspaces use a centered mobile canvas of approximately `max-w-[30rem]`; catalogs, paired displays, and other approved media-heavy experiences may use an adaptive wider view;
- navigation belongs immediately below the public workspace title and before KPIs, filters, or long content;
- use the shared `KioskWorkspaceTabs` presentation primitive for two or three operational sections;
- tab targets are at least 56 pixels high, distribute available width evenly, expose `tablist` semantics, and remain usable at 320 CSS pixels;
- tabs may remain sticky while long forms or histories scroll, but must not hide error or session feedback;
- titles wrap to a maximum of two lines instead of being clipped to an unsafe or meaningless fragment;
- metric summaries use a two-column grid; a dominant total may span both columns;
- forms are one column on small phones and every field keeps a minimum 44-pixel target;
- primary actions prefer 48 to 56 pixels and use the bottom safe area when sticky;
- use cards or compact lists for records; do not recreate desktop tables inside the mobile canvas;
- do not let viewport breakpoints activate a desktop multi-column layout inside the centered mobile canvas. Responsive decisions inside this branch must remain safe for the canvas width, not merely for the browser window width;
- identity, navigation, filters, content, and actions must not create horizontal overflow at 320, 360, 390, 430, or 480 CSS pixels.

The approved implementation order is: Caja Chica navigation baseline, Procesos y Tareas mobile workspace, Asistencia verification journey, and Cuentas por Pagar capture forms. Routes, services, permissions, validations, payloads, and business results remain owned by their modules and are not modified by this layout pattern.

#### Canonical employee workspace family

The approved post-identification family is implemented by
`react/src/app/components/kiosk-engine/KioskToolWorkspace.tsx`. A native employee tool composes
these presentation primitives instead of creating its own card, status, evidence, empty-state, or
sticky-action language:

```text
KioskToolWorkspaceFrame
KioskWorkspaceContextBar
KioskWorkspaceTabs                  when the tool has peer sections
KioskWorkspaceSurface
  KioskWorkspaceSectionHeader
  KioskWorkspaceFieldStatus         when field-level guidance is needed
  KioskFileDropzone                 when the owner permits files
KioskWorkspaceEmptyState            when no authorized records exist
KioskStickyActionBar                when the state has a dominant action
KioskModalFrame                     only for a bounded temporary task
```

`compact` is the default frame for controlled forms, agendas, and histories. `catalog` is reserved
for product grids, restaurant stations, and other approved workspaces that benefit from a wider
adaptive canvas. Density can change by component, but anatomy, radii, neutral surfaces, spacing,
type hierarchy, state semantics, safe areas, and action order do not change by module.

The owner tone is the only primary visual variation: Human Resources uses aqua, Processes and Tasks
uses yellow, Sales and Point of Sale use coral, and Expenses/Payables and Petty Cash use green. The
tone identifies focus, selection, icon surfaces, and the primary action; success, warning, and error
retain their semantic colors. Two tools that share green remain distinct through title, icon,
localized copy, context, capability set, and business result—not through a separate design system.

The initial adopted workspaces are Human Resources, My Tasks, Route Sales, Payables, Petty Cash, and
Point of Sale. Adoption is presentational only: the owning module continues to control API payloads,
authorization, money, inventory, taxes, files, idempotency, state transitions, and audit.

Administrative deep links from the Kiosk Center use the shared kiosk navigation contract. They keep
the Engine definition ID distinct from the optional owner reference, and an owner workspace may
auto-open only a record found in its already authorized data. Human Resources and Processes and
Tasks are the first adopters. Payables and Petty Cash then resolve the owner reference, while Point
of Sale resolves the Engine definition ID; all three open only a record returned by the owning
workspace. During consolidation the owner manager remains mounted and functional;
removing a duplicated module entry is a later, feature-flagged presentation change after parity, not
permission to remove public routes, APIs, adapters, stored definitions, or compatibility behavior.

The Kiosk Center shell distinguishes inventory access from global platform administration. Root and
superadmin users retain MultiKiosk composition, people, activity, transversal audit, and global
lifecycle controls. An authorized Human Resources Control, Processes/Tasks, Expenses, Petty Cash,
or Point of Sale administrator enters
directly into Inventory, sees only owner modules allowed by the backend, and receives no global
navigation or lifecycle affordances. Frontend filtering is presentation only; the server remains the
authority for tenant and owner-module scope. Finance also requires the exact `expenses.expenses` or
`petty_cash.cash` owner tab; POS requires both its owner administration role and `pos.kiosks`.

The consolidation cohorts use the shared `legacyOwnerKioskEntryPointsEnabled` presentation flag.
Local development disables it so Human Resources, Processes/Tasks, and the Petty Cash kiosk button
are exercised through the Center. Payables has no second visible entry; the POS Kiosks tab remains
visible because it is itself the owner destination. Deployed builds default to the
compatibility-safe visible state and may disable it only after
the target environment has certified its global Center. The existing manager components remain
mounted for an exact Kiosk Center handoff and rollback.

#### Accessibility behavior

`KioskPublicShell` owns one shared accessibility entry point for the entire public workspace. The approved settings are:

- large text;
- high contrast;
- reduced motion;
- restore defaults.

Preferences may persist on the device, but identity and business data may not. The accessibility panel must use visible focus, return focus to its trigger when closed, support Escape, prevent interaction with the obscured workspace, expose state with semantic attributes, and preserve WCAG AA contrast.

The gate must also:

- remain completely keyboard operable;
- announce errors and progress without relying on color;
- retain visible focus rings;
- give every icon-only control an accessible name;
- avoid motion that cannot be disabled;
- provide understandable instructions without requiring training.

#### Error and privacy behavior

- show errors next to the identity task using `role="alert"` when immediate attention is required;
- translate technical failures into safe, actionable public copy;
- never render raw backend exception text such as `Internal server error`;
- avoid confirming whether an identity, kiosk, or grant exists when that disclosure is unsafe;
- distinguish retryable network failure, temporary lockout, expired session, disabled kiosk, and invalid input only to the level permitted by the security policy;
- clear prior errors when the user meaningfully edits the PIN or restarts the identity flow;
- keep privacy guidance short and specific to what becomes visible after authorization.

#### Module integration contract

The owning kiosk page supplies:

- localized title, description, labels, privacy copy, and error mappings;
- module tone and safe public context;
- configured PIN length and allowed identity methods;
- PIN state, submit state, and callbacks;
- backend bootstrap, identification, face verification, authorization, and session behavior;
- post-authentication workspace and reset behavior.

`KioskIdentityGate` supplies:

- consistent PIN presentation;
- masked progress;
- touch and physical-keyboard input;
- action hierarchy and disabled/loading states;
- privacy placement;
- discreet Índice attribution;
- shared responsive and accessible interaction behavior.

#### Kiosk modal branch — `KioskModalFrame`

The approved visual reference for kiosk modals is the Sales Public Catalog manager:

- `react/src/app/BasicModules/Sales/Productos/publicCatalog/PublicCatalogConfigModal.tsx`;
- `react/src/app/BasicModules/Sales/Productos/publicCatalog/PublicCatalogCardsPanel.tsx`;
- `react/src/app/BasicModules/Sales/Productos/publicCatalog/PublicCatalogListCard.tsx`;
- `react/src/app/BasicModules/Sales/components/SalesModalFrame.tsx`;
- `react/src/app/components/indice-modal/IndiceModalFrame.tsx`.

This reference is adopted for its hierarchy, precise action groups, stable header and footer, internal scrolling, clear record rows, and replacement of the parent view when a child workflow opens. Its desktop dimensions are not copied blindly into a public mobile kiosk.

The public kiosk remains a Full Workspace route. A modal is allowed only for a focused temporary task inside that workspace or for kiosk administration. It must not replace `KioskIdentityGate`, the primary workspace, navigation, or a long-running operational journey.

Use a kiosk modal for:

- creating or editing one record;
- viewing one record and performing one bounded action;
- selecting or changing one responsible identity;
- reviewing or opening attachments;
- registering a provider when the policy permits it;
- confirming reset, submission, revocation, deletion, or another consequential transition;
- administering kiosk definitions, grants, links, and lifecycle from an authenticated module.

Do not use a kiosk modal for:

- PIN or facial identification;
- the main post-authentication workspace;
- tabs, KPIs, histories, or forms that represent the normal kiosk journey;
- a flow that needs permanent comparison with the workspace behind it;
- hiding a layout that should instead be simplified for mobile.

##### Canonical anatomy

```text
KioskModalFrame
├── ModalHeader                         fixed
│   ├── module icon
│   ├── optional eyebrow
│   ├── action-oriented title
│   ├── one short description
│   └── circular close control
├── ModalFeedback                      first body element when present
├── ModalBody                          only scrolling region
│   ├── contextual summary             optional
│   ├── form sections or record list
│   ├── file selection                 optional
│   └── inline empty/loading states
└── ModalFooter                        fixed
    ├── live summary or state          optional
    ├── visible secondary action
    └── one dominant primary action
```

The shared implementation is:

```text
react/src/app/components/kiosk-engine/KioskModalFrame.tsx
react/src/app/components/kiosk-engine/KioskAdminPrimitives.tsx
react/src/app/components/kiosk-engine/useKioskQrCode.ts
```

`KioskModalFrame` must be a typed presentation wrapper over `IndiceModalFrame`; it must not recreate the Radix dialog, focus trap, overlay, header, footer, or busy-close behavior. It may standardize kiosk-safe dimensions, safe-area padding, module tone, action layout, and public-versus-administration density.

The wrapper must not import a module API, dispatch an Engine action, decide capabilities, transform payloads, authorize an identity, or own business validation.

Canonical presentation props:

```ts
type KioskModalSurface = 'public' | 'administration';

type KioskModalFrameProps = {
  open: boolean;
  surface: KioskModalSurface;
  size: 'compact' | 'form' | 'wizard' | 'workspace';
  tone: IndiceModalTone;
  title: ReactNode;
  description: ReactNode;
  icon: ReactNode;
  busy?: boolean;
  footerSummary?: ReactNode;
  footer?: ReactNode;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};
```

##### Workflow classification

| Kiosk task | Required modal type |
|---|---|
| Confirm reset, submit, revoke, delete, or irreversible transition | Confirmation Modal |
| Create task, payable, provider, expense, income, or edit one record | Standard Form Modal |
| Enrollment or setup with dependent identity, scope, capability, and review stages | Modal Wizard Índice |
| Manage many kiosk definitions, grants, rules, requests, or links in parallel | Operational Workspace Modal |

Classification follows the existing Modal System. `KioskModalFrame` is a specialization of the approved shell, not a fifth modal type.

##### Dimensions and responsive behavior

| Surface and type | Mobile | Tablet and desktop |
|---|---|---|
| Public confirmation | Bottom-aligned or centered safe sheet; width `100%` | Centered, approximately `max-w-[28rem]` |
| Public standard form or record detail | Full safe width and, when needed, `100dvh` | Centered, approximately `max-w-[30rem]`, `max-h-[92dvh]` |
| Public wizard | Full safe width and height | Centered, at most `max-w-[48rem]` unless the workflow proves it needs more |
| Administration standard form | Full safe width and height | Existing `standard-form` width, approximately `max-w-[48rem]` |
| Administration operational workspace | Full safe width and height | Existing workspace width, at most `96vw` and `92dvh` |

Mandatory responsive rules:

- at 320–639 CSS pixels, no fixed desktop width, two-column form, or horizontal action strip may be assumed;
- public kiosk modals remain constrained by the mobile kiosk canvas even when the browser window is wide;
- header and footer remain visible while only the body scrolls;
- use `100dvh`, top and bottom safe-area insets, and `overscroll-contain` where needed;
- primary and secondary controls are at least 48 pixels high on the public surface;
- icon-only public actions are at least 44 by 44 pixels;
- the software keyboard must not hide the active field or primary action;
- no horizontal overflow is allowed at 320, 360, 390, 430, or 480 CSS pixels.

##### Visual hierarchy

- Use the module color as a confident header and footer identity, as in the catalog manager.
- Keep the body white or neutral and reserve tinted surfaces for selected, informational, warning, or validation states.
- The header contains one icon, one title, and one short description; it is not a second navigation bar.
- Use sentence case and medium weight for most copy. Reserve bold weight for the title, critical value, record name, and primary action.
- Body sections use restrained borders and shadows. Do not nest cards repeatedly merely to create decoration.
- A record list row presents identity and status first, safe context second, and actions last.
- Status is expressed with text and semantic tone, never by color alone.
- Dark mode, high contrast, large text, reduced motion, and visible focus remain mandatory.

##### Precise action standard

Every modal state has at most one dominant primary action. The footer keeps the secondary action visible and the primary action at the final visual position; on mobile both actions may use full width.

For compact record actions, use this semantic order when the actions exist:

1. primary record action such as Edit or Select;
2. copy or share link;
3. open external/public view;
4. enable or disable;
5. destructive action last.

Rules:

- icon-only actions require `aria-label`, localized `title`, visible focus, and disabled state;
- inside a dialog, compact actions must not depend on a portaled dropdown that escapes the active focus boundary; use direct actions or suspend the manager and open one replacement child view;
- a compact kiosk row should normally expose only Edit, Open, Share, and More; lifecycle, audit, and destructive operations belong to the internal More view;
- when a public token is intentionally display-once, the row must distinguish `Liga disponible ahora` from `Liga protegida`; Open or Share must lead to the link view and offer explicit replacement instead of appearing inert;
- use familiar Lucide icons and never rely on an icon to communicate an unfamiliar business action;
- public kiosk actions prioritize touch size over desktop density;
- disable/revoke/delete never shares the normal primary treatment;
- destructive actions open a Confirmation Modal and state the affected record and consequence;
- do not duplicate the submit action in the body and footer;
- while `busy`, block duplicate submission, Escape, outside dismissal, and conflicting actions;
- a retry is explicit and reuses the current safe form state without replaying a completed command.

##### Modal navigation and view replacement

Avoid nested open dialogs. When a manager opens Create, Edit, Link, Requests, or Confirmation:

1. hide or suspend the parent modal;
2. open exactly one child workflow;
3. preserve the parent query, filters, scroll, and safe draft state;
4. return focus to the originating action after the child closes;
5. refresh only the affected record after a successful child action.

This is the approved behavior already demonstrated by the Public Catalog manager. A modal must never render another active overlay above itself merely to move to the next screen.

##### State, files, and Engine handoff

The visual state machine is:

```text
closed -> opening -> ready -> validating -> submitting -> success -> closed
                              |              |
                              -> invalid     -> recoverable-error -> ready
                                             -> session-expired -> reset
```

The owning kiosk module must:

- check the capability before exposing the action;
- validate the form and map safe localized errors;
- create one idempotency key per logical mutation;
- dispatch through its Kiosk Engine adapter with the current session and CSRF context;
- keep server authorization authoritative even when a button is hidden;
- scrub sensitive draft, selected files, previews, and record context on reset or session expiration;
- surface the successful result in the workspace after the modal closes.

For files, the modal provides selection, camera capture when permitted, filename/size/type feedback, removal, progress, retry, and partial-failure presentation. The module and Engine retain ownership of presign, upload, registration, adoption, limits, authorization, and audit. A selected browser file is not evidence until the backend completes the approved adoption contract.

##### Initial kiosk adoption matrix

| Kiosk | Modal | Classification | Migration intention |
|---|---|---|---|
| Procesos y Tareas | Create task | Standard Form | Replace the hand-built overlay; preserve fields, evidence, idempotency, and create command |
| Procesos y Tareas | Task detail and completion | Standard Form | Keep detail, progress, evidence, note, and complete action in one bounded flow |
| Procesos y Tareas | Change responsible | Standard Form | Keep one selector and one save action; return to task detail without stacked dialogs |
| Caja Chica | Attachment viewer | Standard Form | Adopt `KioskModalFrame`; preserve secure download behavior |
| Caja Chica | Consequential movement confirmation | Confirmation | Add only where policy requires explicit review; do not move the primary capture workspace into a modal |
| Cuentas por Pagar | Provider registration | Standard Form | Preserve review policy and registration API |
| Cuentas por Pagar | Payable or attachment detail | Standard Form | Preserve employee/provider scope and file authorization |
| RH Asistencia | Restart or cancel consequential flow | Confirmation | Keep camera, face, GPS, and attendance journey inline in the Full Workspace |
| Kiosk administration | Definition/grant/link manager | Operational Workspace | Reuse catalog-manager hierarchy with the owning module tone |
| Kiosk administration | Create/edit definition | Standard Form or Wizard | Choose by dependency of identity, scope, capabilities, and review |

##### Administrative adoption status — 2026-07-20

| Owner | Manager | Child views | Status |
|---|---|---|---|
| Procesos y Tareas | Operational Workspace | Create/Edit, Link, QR, Options, Access/Audit | Adopted |
| RH Asistencia | Operational Workspace | Create/Edit, Link, QR, Options, Delete confirmation | Adopted |
| Caja Chica | Operational Workspace | Create/Edit, Link, QR, Options, Delete confirmation | Adopted |
| Expenses / Cuentas por Pagar | Operational Workspace | Create/Edit, Link, QR, Options, provider access, lifecycle confirmations | Adopted |
| Punto de Venta | No change in this adoption pass | Existing flows remain authoritative | Explicitly excluded from the 2026-07-20 scope |

The four compact manager actions are **Edit**, **Open**, **Share**, and **More**. Module APIs, permission checks, lifecycle semantics, display-once behavior, provider/employee boundaries, and deletion consequences remain owned by each feature. Shared primitives contain presentation only.

##### Kiosk modal acceptance checklist

- [ ] The task was classified as confirmation, standard form, wizard, or operational workspace.
- [ ] The main kiosk remains a Full Workspace route.
- [ ] `KioskModalFrame` extends `IndiceModalFrame` instead of recreating dialog behavior.
- [ ] Header, body, footer, actions, and module tone follow the approved anatomy.
- [ ] The body is the only scrolling region and the footer remains reachable above the safe area and keyboard.
- [ ] One primary action dominates and destructive actions are separated.
- [ ] Compact row actions have labels, semantic order, focus, and touch-safe dimensions.
- [ ] Parent/child modal workflows use view replacement rather than stacked dialogs.
- [ ] Busy, validation, retry, partial file failure, success, offline, and session-expired states were tested.
- [ ] Capability, CSRF, idempotency, session, file ownership, and audit remain enforced by the Engine/module boundary.
- [ ] Focus trap, focus restoration, Escape, screen-reader names, large text, contrast, and reduced motion were verified.
- [ ] The modal was reviewed at 320, 360, 390, 430, and 480 CSS pixels and at its approved desktop maximum.
- [ ] All visible copy and accessible labels are localized.

#### Migration sequence

Migrate incrementally and preserve the existing route and service contract at every step:

| Order | Kiosk | Identity composition | Migration note |
|---:|---|---|---|
| 1 | Caja Chica | PIN | Approved visual and component baseline |
| 2 | Procesos y Tareas | PIN | Replace duplicated PIN surface, preserve task filters and commands |
| 3 | Asistencia | PIN, then face when configured | Preserve location, attendance state, timeout, and facial policy |
| 4 | Cuentas por Pagar | PIN or registration, then face when configured | Preserve provider review, enrollment, files, and financial privacy |

After these migrations, audit other controlled kiosks individually. Anonymous and paired-display experiences are not part of this identity migration unless their access policy changes through an approved backend decision.

#### Kiosk branch acceptance checklist

- [ ] The public surface is a Full Workspace route, not a modal.
- [ ] `KioskPublicShell` provides exactly one language selector and one accessibility entry point.
- [ ] `KioskIdentityGate` is reused for the approved PIN state instead of recreating it locally.
- [ ] The module's route, APIs, payloads, permissions, validations, and business results are unchanged.
- [ ] The PIN works with touch, physical keyboard, Enter, Backspace, and Clear.
- [ ] Duplicate submission is blocked and progress is visible.
- [ ] Facial verification occurs only after expected identity and according to declared policy.
- [ ] Camera permission, retry, fallback, consent, and failure states were reviewed when face is enabled.
- [ ] No raw backend error, token, internal ID, PIN, or sensitive context is exposed.
- [ ] Identity and sensitive workspace state reset on expiration, completion, or kiosk restart.
- [ ] The layout was reviewed at 320 px, mobile, tablet, and desktop widths without overlap or horizontal overflow.
- [ ] Light mode, dark mode, large text, high contrast, reduced motion, keyboard, and visible focus were reviewed.
- [ ] All visible copy is localized.
- [ ] `Powered by www.indiceapp.com` remains discreet, readable, and secondary.
- [ ] Kiosk-specific tests, TypeScript, and the production build pass.

### Finance View

Examples:

- Expenses
- Petty Cash
- Receivables
- Accounts Receivable

Required:

- finance color identity
- money formatting consistency
- status clarity
- due/overdue visibility
- balance visibility
- decision-first layout

### Analytics View

Examples:

- KPIs
- Reports
- BMI
- PPI
- Forecasting

Required:

- decision-first dashboard
- operational insights
- recommended actions
- no vanity-only metrics

Analytics tabs must also follow the specialized
[`KPI Tab Standard`](./KPI_TAB_STANDARD.md).

---

## 26. Master Detail Rule

Operational modules should prioritize master/detail architecture when selection and details matter.

Left side:

- list
- filters
- table
- records

Right side:

- detail
- actions
- status
- timeline
- history
- next steps

The user should always understand:

- where they are
- what they selected
- what to do next

---

## 27. Kanban And Agenda Standards

Processes And Tasks is the approved reference.

Kanban requires:

- status columns
- count badges
- operational cards
- compact actions
- empty states
- horizontal scroll
- no dashboard-style Kanban

Agenda requires:

- date navigation
- day/week/list or approved modes
- pending work area
- summary indicators
- planner behavior
- readable time slots

Agenda must help execution, not only display dates.

---

## 28. Learning Mode Standard

Every module should be understandable without training.

Each tab should answer internally:

- What is this?
- Why does it matter?
- What should I do next?

Do not overload the UI with explanatory text.

Use:

- subtitle
- empty states
- insight bars
- contextual labels
- recommended next action

### 28.1 Compact module learning companion

The module standard validated in Human Resources uses a compact companion below the module tabs, with an inline `Aprender más` expansion. It supports a reactivatable first journey and ongoing contextual assistance, never blocks module work, and keeps learning progress private to the current user and company.

The 2026-09-06 visual adjustment keeps the original tab title bar and its actions visible when Learning Mode is on. The companion does not replace that surface. When expanded, the logical journey uses one compact, sticky, horizontally scrollable step rail; the mission checklist, detailed instructions, and real case remain collapsed until requested so the active tool objective stays clear without consuming unnecessary vertical space.

The collapsed companion still exposes the module's complete logical flow as one horizontally scrollable line. Learning concepts and areas use colorful emoji, while instructional copy stays approachable, action-oriented, and grounded in real business decisions and consequences.

Every migrated module keeps its original title bar and actions visible. The collapsed companion exposes the full logical module flow; the expanded companion pins only the horizontal journey rail and presents one primary objective, optional instructions, and an optional real business case. Concepts use colorful emoji, and the copy teaches in direct language while retaining real operational consequences.

Point of Sale does not render the companion inside its transactional `Sale` tab. Inventory must explicitly teach `Product → Warehouse → Inventory → Provider → Purchase order → Receipt/movement` and must not conflate catalog identity, physical location, and on-hand quantity.

`Panel Inicial` remains part of the Dashboard learning journey but does not render an internal learning guide. The Dashboard keeps its approved six-section structure while its learning presentation follows the same compact, colorful, instructional language.

The detailed state, content, exception, responsive, and migration rules live in `docs/learning-mode-frontend-engine-v2.md`, section 29. That specialized contract controls module learning within the repository-wide accessibility, localization, permission, and behavior-preservation rules in this document.

### 28.2 Global learning settings

The graduation-cap action in the global header opens the shared blue standard-form modal for `Modo aprendiz`; it is not a direct toggle. The modal provides one explicit save boundary for the existing global state:

- enable or disable contextual guidance across compatible modules;
- show or hide the six-stage journey on `Panel Inicial` independently from the global mode;
- review the current journey stage and reset it to the first stage without deleting the selected business case.

Opening or cancelling the modal must not change stored preferences. Saving updates the user-and-company-scoped browser preference atomically. Turning the mode off restores the normal operational UI without deleting journey progress or the selected business case. The header keeps a visible active treatment when guidance is enabled, while the action retains dialog semantics instead of toggle-button semantics.

---

## 29. State System

Every view and action must handle:

- loading
- success
- error
- empty
- disabled
- permission restricted
- saving/submitting

Never perform silent actions.

Never use browser alerts.

Never use `window.confirm`.

Empty states must explain:

- what happened
- what the user can do next

---

## 30. Responsive Standard

Breakpoints:

- Desktop: `>=1280`
- Tablet: `768-1279`
- Mobile: `<768`

Rules:

- filters wrap
- tabs wrap
- title bar actions stack
- buttons stack when needed
- tables scroll horizontally
- modals adapt to smaller screens
- no text overflow
- no overlapping controls
- fixed-format UI elements must have stable dimensions

### 30.1 Discoverable horizontal scrolling

Horizontal overflow must remain usable with a standard mouse that has no
horizontal wheel or trackpad gesture. Deliberately horizontal desktop surfaces
must use the shared `IndiceHorizontalScrollControls` when their content can
overflow, including:

- Dashboard KPI and module carousels
- compact favorites and module-tab navigation
- the single viewport owned by the canonical table engine
- another explicitly horizontal comparison strip that cannot wrap safely

The controls:

- appear only from the tablet/desktop breakpoint and only while content exists
  beyond the corresponding edge
- use translucent neutral circular buttons over the local scroll boundary
- move a useful portion of the current viewport and respect reduced-motion
  preferences
- expose localized accessible labels and visible keyboard focus
- update after scrolling, resizing, column resizing, and dynamic content changes
- preserve touch, trackpad, Shift-plus-wheel, and native scrollbar behavior

Do not add page-wide horizontal scrolling or controls when wrapping, a responsive
grid, or a mobile record view communicates the content more clearly. Each arrow
must control only its nearest horizontal viewport.

---

## 31. Dark Mode Standard

Dark mode is required.

Use neutral dark surfaces:

- Page: `#111827`
- Card: `#1F2937`
- Border: `#374151`
- Primary text: `#F9FAFB`
- Secondary text: `#D1D5DB`

Rules:

- do not use pure black
- do not invert module colors
- maintain module identity
- avoid neon/glowing effects
- preserve contrast
- support tables, modals, filters, tabs, KPIs, and empty states

Every new component must work in light and dark mode.

---

## 32. Accessibility Standard

Required:

- minimum WCAG AA contrast
- visible focus states
- accessible labels for icon buttons
- keyboard reachable controls
- no hidden-only critical actions
- table actions discoverable
- modal close accessible
- form errors tied to fields when realistic

Never sacrifice readability for aesthetics.

---

## 33. Component Reuse Rule

Before creating a new component:

1. Search for an existing approved component.
2. If one exists, reuse it.
3. If several modules duplicate the same pattern, extract a shared component.
4. Only create local components for truly module-specific behavior.

Preferred shared components:

- `ModuleHeader`
- `ModuleTabs`
- `ModuleTitleBar`
- `FilterBar`
- `KpiStrip`
- `StatusDistributionBar`
- `InsightBar`
- `TableShell`
- `DataTablePagination`
- `ColumnsModal`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `ConfirmationModal`
- `IndiceModalWizardStepper`
- `IndiceModalFooter`
- `IndiceModalValidation`
- `IndiceModalSummary`
- `WorkspaceModal`
- `KioskPublicShell`
- `KioskIdentityGate`
- `KioskPinKeypad`

Do not keep duplicating the same UI manually in every module.

---

## 34. Frontend Engineering Rules

Use clean React architecture.

Required:

- functional components
- typed props
- modular hooks
- minimal state
- memoization when needed
- reusable UI primitives
- isolated frontend logic
- constants for static config
- adapters for API transformations
- utils for pure formatting/calculation
- services for API access

Avoid:

- giant components
- duplicated calculations
- business logic inside JSX
- circular imports
- inline heavy logic
- hardcoded arrays inside render
- deeply nested render conditions
- recreating objects per render
- rebuilding translated arrays unnecessarily

Use `useMemo`, `useCallback`, and `memo` only when they actually help.

Target maximum:

- 300 lines per file when realistic

If a file approaches or exceeds 300 lines:

- split it
- modularize it
- extract logic
- create folders

---

## 35. Scope Control

Only modify files inside the requested module unless:

- creating an approved shared component
- updating a shared style/token utility
- fixing a direct broken dependency
- the user explicitly approved cross-module changes

Never touch unrelated modules casually.

When shared changes are required, explain why.

Do not refactor unrelated code just because it looks messy.

---

## 36. Implementation Order

For each module or tab:

1. Audit the current screen.
2. Identify its view type.
3. Identify the approved reference pattern.
4. Identify shared components that already exist.
5. Preserve backend/API/service behavior.
6. Refactor UI into small components if needed.
7. Apply module header, tabs, title bar, filters, table, pagination, modals, and states.
8. Localize visible copy.
9. Validate responsive behavior.
10. Validate dark mode.
11. Run typecheck and build.
12. Report changed files and remaining inconsistencies.

---

## 37. Acceptance Checklist

A tab is not complete until:

- it follows the correct view type
- it has module header alignment
- it has Human Resources style tab rhythm
- it has a title bar with emoji/icon identity
- it has filters in the approved structure
- it has table pagination with `10, 25, 50, 100, 200`
- it has loading state
- it has empty state
- it has error state
- it has permission-restricted behavior when applicable
- it supports dark mode
- it does not break existing functionality
- it does not touch backend/API contracts
- it passes TypeScript
- it passes production build

Required validation:

```bash
npm run typecheck --prefix react
npm run build --prefix react
```

For visual changes, review the target route in browser when the dev server is available.

---

## 38. Required Response Format

When proposing or implementing frontend work, always provide:

1. Folder structure.
2. Files to create or modify.
3. Component responsibilities.
4. Hook/state architecture.
5. Exportability explanation.
6. What will not be changed.
7. Verification steps.

If refactoring, also explain:

- what was extracted
- why it was split
- how complexity was reduced

If standardizing modals, final report must include:

- list of modals updated
- modal type assigned to each one
- completed mandatory classification checklist or concise decision rationale
- official reference used and any justified deviations
- files changed
- files created
- behavior preserved
- APIs/backend untouched
- typecheck result
- remaining modal inconsistencies

If standardizing public kiosks, final report must include:

- kiosks migrated
- identity methods and policy preserved for each kiosk
- shared kiosk primitives reused or created
- route, API, payload, permission, and business behavior preservation
- responsive and accessibility review performed
- kiosk test, typecheck, and build results
- remaining kiosks or identity states not yet migrated

---

## 39. Forbidden Practices

Never:

- invent new layout systems
- invent new table systems
- invent new Kanban systems
- invent new Agenda systems
- invent new modal styles
- create giant files
- hardcode visible copy
- duplicate module logic
- couple modules unnecessarily
- change backend contracts without explicit approval
- create hidden dependencies
- create giant global translation files
- overload dashboards
- use UX patterns inconsistent with the system
- prioritize aesthetics over operational clarity
- use `window.alert`
- use `window.confirm`
- create silent actions

If the user needs to think too much, the frontend is failing.

---

## 40. Golden Rule

Indice is an operational ERP.

The UI must help the user decide and act.

If information does not help a decision, remove it.

If an action is unclear, redesign it.

If a screen needs training to understand, simplify it.

Build a system.

Not isolated screens.

Every module must be:

- modular
- exportable
- localized
- scalable
- easy to understand
- easy to maintain
- easy to refactor
- operationally clear

Every tab must function as a self-contained operational unit.

Every file should remain small enough to understand quickly.

The final product must feel like Human Resources, Processes And Tasks, Expenses, Sales, POS, Inventory, Receivables, Petty Cash, Dashboard, BMI, and PPI can all grow independently without turning Indice into chaos.
