# Indice Frontend Operating System v2.0

Status: canonical frontend architecture, UI, and UX standard

Active runtime root: `react/src/app`

Related standards: `AGENTS.md`, `docs/indice-backend-operating-system-v1.md`, and
`docs/indice-public-release-security-gate.md`

Sales/POS operational behavior also follows
`docs/sales-pos-ownership-and-retry-contract-v1.md`: POS summaries are read-only in Sales,
uncertain checkout retries preserve their identity, and original-tender POS returns display
completion only after backend confirmation, never from a local activity or pending provider result.

## Scope And Reading Guide

This standard governs frontend architecture, UI, and UX across Indice. Its purpose is a consistent
experience that preserves working product behavior.

Start with the product [README](../README.md) and [documentation map](README.md). Then read the
architecture and interaction rules relevant to the affected surface. Consult the specialized
[Learning Mode](learning-mode-frontend-engine-v2.md) and [KPI tab](KPI_TAB_STANDARD.md) contracts
when those features are involved; module business meaning remains with its owner contract.

Approval of this standard does not certify adoption or deployment in every module. Use current
code and version-specific regression evidence to establish implementation status.

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
Petty Cash account-statement preview and browser print/Save as PDF share one transaction-document
definition and the quotation web-print theme adopted on 2026-09-17 in section 0 of
`docs/INDICE_DOCUMENT_PRINT_STANDARD_DRAFT.md`. Use grayscale metadata, compact tables and neutral
totals; only the company logo retains color, and no platform attribution appears. Preserve folio, status, fund and owner identity,
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
shared quotation-style web document (folio/status, metadata, financial summary, item table, signatures),
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
print or Save as PDF through the browser. Selected rows are the initial scope when available; otherwise use all filtered
results. The user can change between these scopes. Both preserve table order across pages and
visible data columns, exclude action controls, resolve scoped reference names, and keep native
currencies separate. Fund groups expand into their original expenses once. The company identity
must finish loading before output; an unavailable logo/name must not fabricate an issuer. This
Tab Print uses shared web-document primitives, repeatable table headers and a document footer, and splits exceptionally
wide column selections into readable sections. The individual expense voucher remains available.

The approved 2026-09-17 basic-module document decision is section 0 of
`docs/INDICE_DOCUMENT_PRINT_STANDARD_DRAFT.md`, tracked in
`docs/INDICE_DOCUMENT_PRINT_INVENTORY.md`. Quotation styling and browser printing are the normal
output for active basic documents, with unchanged data rules. The same-day v0.3 correction
requires company-only branding, grayscale except the company logo, portrait unless table width
requires landscape, and complete paragraphs flowing naturally across sheets. Prefer one sheet
when the content fits legibly; never cut content or shrink text to illegibility.
Quotation preview/output ownership and the operational preview modal follow
`docs/sales-quote-document-contract.md`: one commercial definition, isolated document styling,
internal review outside the customer document, and preserved binary sharing compatibility.
Binary quotation sharing and external PDFs remain supported. IME/Business Diagnosis and the
KPI maturity overview/dimensions are explicitly excluded; never apply document CSS globally.

El Corazón del Caribe tiene una excepción de marca aprobada para sus documentos operativos y
ejecutivos del administrador independiente. Conserva papel blanco, densidad documental y lectura
válida en escala de grises, pero puede usar su logotipo a color y acentos medidos de coral, turquesa
y azul en encabezados, indicadores principales, estados y cabeceras de tabla. El color nunca es la
única señal de significado, no invade fotografías ni evidencia y no modifica el contenido, el
alcance, los cálculos o la paginación del documento. Esta excepción pertenece a ese producto y no
redefine por sí sola la salida neutral de los módulos básicos de Indice.

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

Sales Funneling follows `docs/sales-funneling-contract-v1.md`: one **Create campaign** entry
captures a title and idea in a Standard Form Modal, then opens an Operational Workspace Modal
with one shared draft for the visual funnel, campaign selectors and AI prompt. Stage selection
opens its editor; action/content presets retain custom text. Suggested journey replacement needs
an explicit current/proposed review. Numeric targets are optional and existing plans retain their
texts, targets and estimates. Prepare for AI includes a campaign-owned content guide: type,
format, piece purpose, hook and optional controlled variants, with undecided choices delegated
to the user's external AI. It shares the draft and persisted campaign, including duplication and
reopening; it does not invoke a model or change the journey. Compact Funneling workspaces keep
shared footer actions visible while scrolling their body; opening/reopening a mobile panel reveals
its editor, and validation reveals the failing stage. Prompt previews have bounded internal scroll.
Copy notices follow the exact draft text, with full-text selection when clipboard access is denied.
Prompt copy/download/print reflect the same draft and request a linked calendar, developed
hooks/copy, 2–3 practical measures and a short readiness checklist in beginner-friendly language.
Manual guide variants control ad variations; unknown dates/results remain proposals or pending.
Dirty-close and
stage removal use replacement Confirmation Modals. Defining a plan does not execute campaigns
or change the opportunity pipeline.

The 2026-10-23 Funneling owner extension reorganizes the visible workspace into Campaigns,
Content and Calendar. Cards/Table and customer-journey detail stay inside Campaigns; historical
view URLs remain valid. Company information opens one shared Operational Workspace Modal with
Business, Brand and Materials sections. Its name/logo are read from the existing company owner;
its descriptive planning profile and private assets are company-owned. Content explicitly selects
an independent reference snapshot. Full instructions and optional responses use native disclosures;
no model call or automatic file transmission is implied. Calendar day selection opens the native
day-list workspace, including on the mobile month grid. Private boards and dirty-navigation recovery
remain separate and unchanged. Details and lifecycle: `docs/sales-funneling-contract-v1.md`. The approved guided-profile extension uses localized native selectors, bounded choice pills and short text, with optional details disclosed progressively. Logos have a dedicated Brand group and private light/dark previews; Materials retains photos/documents/references. Existing text, draft guards, snapshot selection and global company identity remain owned by their existing contracts.

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

Local Sales navigation decision, 2026-10-16: expose Postventa (`/sales/after-sales`)
through its existing workspace, and add Mailing (`/sales/mailing`) and Whatsapping
(`/sales/whatsapping`). Postventa retains the existing `crm.contracts` permission used by
its backend API; Whatsapping remains an initial workspace under `crm.contacts`.

Whatsapping assisted-campaign decision, 2026-10-19: the
[Sales Whatsapping contract](sales-whatsapping-contract-v1.md) replaces the initial workspace with
a durable campaign wizard, company templates/lists and a contact queue for individual WhatsApp
handoffs. Retain `crm.contacts`, the Sales coral shell and shared filters/tables/modals. Prepared,
manually confirmed sends and reported replies are distinct. The owner notification contract
provides due follow-up reminders; no automatic sending or receipt is implied.

Sales navigation organization decision, 2026-10-18: the primary module navigation follows
Clients → Opportunities → Quotes → Sales → After-sales → Tools → Indicators → Management.
Tools groups Funneling (campaign planning), Mailing (email campaigns), and Whatsapping
(explicitly marked as pending sending functionality). Management groups the existing
Commissions, Payment accounts, and Contracts workspaces. Indicators keeps the `kpis` route
and commercial calculations; the complementary Sales Board retains ownership of combined
POS/CRM analysis. Extend `IndiceModuleShell` with permission-filtered menus and opt-in
wrapping for Sales; retain the canonical pill style, keyboard navigation, active-child
breadcrumb, and vertical workbar support. Each destination keeps its existing route,
permission, provider, and persistence contract. Empty menus are hidden. Opportunities is
the initial default only when no explicit URL or remembered tab exists; existing scoped
navigation memory continues to take precedence over that default.

Email/Mailing joint remodeling, 2026-10-17: the
[Email and Mailing integration contract](email-mailing-integration-contract-v1.md) adopts the
shared blue Email shell, routed Mailbox/Accounts tabs, Standard Form account setup and the coral
Mailing sender picker with save/configure/return navigation. It supersedes the standalone Email
mock layout. The individual-mail extension adds a persistent SMTP/IMAP workspace, safe text reading,
versioned drafts and same-frame send review/result recovery. The approved completion extension adds
private attachments, safe formatted reading, background preferences and campaign delivery/results.
Cancel/Back remains left, progression/save right; template preview uses a responsive workspace.

Email reading-space decision, 2026-10-18: the folder rail may collapse to named, keyboard-accessible
icons using the existing workspace-navigation primitive's optional vertical/icon-only presentation.
Its `foldersCollapsed` layout preference is approved in company/user-scoped `email/mail` workspace
memory; it is retained when changing accounts or filters. This narrow layout preference does not
authorize persisting open drawers, menus, message selection or expanded reading. On phones, folders
open in the existing Sheet primitive and return focus to their trigger. Expanded reading temporarily
hides both navigation and the message list, preserves the selected message and list position, and
returns through an explicit control or Escape when no dialog/menu owns that key. Folder navigation,
message filters and message actions use distinct visual treatments while preserving owner APIs.

Email soft-accent refinement, 2026-10-18: blue remains the mailbox identity and selected state.
The user-approved supporting palette allows restrained lavender and brand aqua on folder icons,
correspondent avatars and secondary organization controls. Small amber accents retain their spam
and starred meanings. These are presentation accents, never delivery/authorization indicators.
Avatars use a stable correspondent-derived tint without persistence. Keep the message document
white, preserve light/dark contrast, and retain labels/icons alongside every color distinction.

Email module-composition alignment, 2026-10-18: the live Mailbox follows Sections 12 and 13 with
an unmodified shared title-bar anatomy, a descriptive subtitle, Compose as the primary action,
Refresh and Preferences as direct secondary actions, and authorized account navigation in the
neutral Actions overflow. A separate shared Filter Bar places search first, then mailbox account
and All/Unread/Starred. Clearing filters resets search/status and pagination while retaining the
account, folder and layout context. The account selector is context, not an active-filter count.
This replaces the earlier compact-title/account-search-action-toolbar composition; it retains
the approved accents, collapsible folder rail, mobile drawer and focused reading. The mailbox
remains a WorkspaceView, with its existing fixed-size API pagination and explicit current-page
count; do not invent a global total, page-size choices or business/unit filters without an owner
contract. On phones, opening a message hides the filter card until returning to the message list.

Email commercial-composition and operational KPI extension, 2026-10-22: user-authorized
refinement retains the mailbox WorkspaceView. After the shared filter bar, show four actionable
cards: Unread, Starred, Drafts and Sends to review. The Email owner endpoint computes totals for
the current private account and search across all cached pages, independently of the selected
folder/status. Unread and Starred cover the current synchronized Inbox only; Drafts and review
cover local draft/send states. Explain this scope; never infer reply obligations, recipient opens,
delivery or sales revenue. A card selects its folder/status and resets page/selection; toggling
it off returns to Inbox/All while preserving account/search. Failed/loading counts show no stale
numbers. Keep Compose primary, Refresh/Preferences secondary, and Expand/Restore plus authorized
account navigation in the final Actions overflow. Mailbox and composer expansion preserve draft
and selection state; phone composition uses a full-height frame with independently scrolling
content and reachable actions. Shared template management keeps IndiceTableEngine and its existing
server pagination/sorting. Rich-text editing is shared presentation; Sales still owns templates
and audiences, Email owns private drafts/signatures/transport. See the current
[email owner contract](email-mailing-integration-contract-v1.md#professional-composition-and-operational-kpis--2026-10-22).

Email/Mailing reusable-template correction, 2026-10-22: the
[persistence and attachment contract](email-mailing-integration-contract-v1.md#persistent-templates-and-reusable-attachments--2026-10-22)
adopts verified files in the existing template form, saved server-version reconciliation, explicit
retry after uncertain saves and attachment previews in campaign/individual send review. Reuse
preserves the existing modal/table engines and owner permissions. File/image preparation blocks
Save/close while active; errors retain user input. Limits are five files, 10 MiB per file and in
total. The same company library serves Email and Mailing; private mailbox files are never
published implicitly.

Email image-picker reliability, 2026-10-23: the shared mail editor keeps a labeled
Insert image action outside the horizontally scrolling formatting toolbar. Image
preparation retains the owner busy/close guard, then synchronously releases it before
the native insertion command. Preserve caret, native undo, draft/template persistence
and error recovery. PNG/JPEG optimization remains local and must fit the existing
three-image, 100 KiB decoded-per-image server contract; transparent PNGs keep alpha.
This changes neither backend authority nor attachment limits, routes or transport.

Template-library compact refinement, 2026-10-23: the user adopts a content-sized
**Operational Workspace Modal** for the shared Email/Sales template library. The
typed shared frame uses a `max-w-6xl` cap instead of the large default: this small
directory does not need the schedule builder's full width. Keep a compact directory
beside one un-nested message/attachment preview. Group template name, subject, status
and localized update time in each selectable row; the shared table primitives/shell
remain the owner presentation foundation. Retain server search, status, all three
sort fields and both directions through a visible sort selector, and one shared
pagination across the workspace with the existing size options. On phones, selection
opens the preview inside the same frame; Back restores filters and row focus, even
after the directory has refreshed. Email stays blue and Sales coral. Create/edit
remains a Standard Form, and archive/discard replace it with Confirmation. Existing
permissions, save/retry identities, attachments, payloads and API ownership stay intact.

Template editing scroll/layout correction, 2026-10-23: retain the Standard Form and
its shared 48rem cap. The owner-scoped frame clips programmatic overflow so native
focus/caret scrolling cannot move its header/footer or leave a blank area below
the actions. The shared body remains the scroll owner, including compact viewports.
Group name and subject on desktop, retain a single column on phones, and make the
duplicated safe preview a native disclosure closed by default. Keep compact reusable
attachments below the editor, existing translations and all save/discard/busy guards.
The Sales wrapper only forwards the engine's existing bodyRef; no new shell is added.

Template attachment recovery, 2026-10-23: retain content on failure, display the
owner's stable content/storage error in the user's language, and distinguish transfer
from verification. Content rejection asks for a supported replacement; transient
verification retry reuses the upload identity without repeating a completed transfer.
PDFs with unsupported automatic actions request a static copy. By the owner's later
same-file decision, PDFs with embedded files are prepared automatically during intake;
the six-language attachment help explains their removal. Display the returned prepared
size and retain the original selected filename and draft content.
The backend remains authoritative for content, access, quotas and attachment limits.


Mailing operational workspace, 2026-10-19: the [campaign workspace contract](sales-mailing-contract-v1.md#campaign-operating-workspace--2026-10-19)
adopts the standard title/filter/status/table composition for the campaign list. Keep recipient lists,
templates and new campaign directly accessible, with administrative actions in the final overflow.
Status counts cover the searched/account-filtered dataset across pages. Draft selection counts and
launched delivery counts must remain visibly distinct; never label SMTP acceptance as confirmed
delivery. The existing four-step wizard hands its persisted draft to delivery review when requested.
Standalone recipient-list management reuses the existing shared modal and audience selection owner.

Mailing direct recipient selection, 2026-10-19: the [current delivery decision](sales-mailing-contract-v1.md#direct-recipient-selection--2026-10-19)
replaces the manual consent gate. Delivery review offers Select all across every page and individual
selection of currently eligible contacts. Checkboxes govern the actual launch audience. Show selected,
unselected and excluded counts before the explicit send/schedule confirmation. Invalid/duplicate
addresses and recorded unsubscribes remain excluded. Do not create consent evidence from selection.

Mailing contact audiences, 2026-10-18: the [audience extension](sales-mailing-contract-v1.md#contact-audiences-and-campaign-history--2026-10-18)
keeps the four-step campaign wizard. Its recipient stage uses shared filters, the canonical table,
server sorting/pagination, explicit all-results selection, eligibility counts and reusable static
lists. Search and eligibility are primary; source, salesperson and tag use progressive disclosure.
List forms and archive confirmation stay inline in the same frame. Contact forms expose a lazy,
permission-gated campaign-history section. Campaign execution remains an explicit action. The current direct-recipient-selection decision above removes the separate consent-recording step.

Mailing draft-pilot decision, 2026-10-17: use the dedicated `crm.mailing` permission,
with `crm.contacts` additionally required for audience selection and campaign detail.
The [draft-pilot contract](sales-mailing-contract-v1.md) governs persistent drafts, the
four-step campaign wizard and plain-text preview. The Email/Mailing integration contract now extends
it with test review, launch/scheduling, pause/cancel and recipient results. Existing Sales APIs and transaction-email services keep their permissions
and behavior.

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

- `My connections` remains accessible beside the guide so users can inspect activity and revoke
  unused connections when their active connection capacity is exhausted. Revocation uses the
  existing authenticated API and the canonical confirmation dialog; history is preserved;
- creating a connection from this workspace returns to the OAuth setup guide and does not expose
  manual access tokens;
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
- Scheduling (Agenda and events): coral `#FF6B5E`, including its complementary-module shell
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

The Corazón del Caribe operational workspace adopts the already bundled Inter
variable font as its documented product family, followed by the platform-safe
stack. This exception applies consistently to traveler, agent, and owner modes;
Manrope remains limited to public marketing and editorial surfaces. The
workspace must preserve the weight, localization, performance, and
accessibility rules below. Its exact implementation tokens, component mapping,
rollout order, and acceptance criteria live in
`docs/corazon-workspace-ui-system-v1.md`.

Its operational analytics follow the same hierarchy: one bounded title and tab
header, a primary filter row with advanced criteria behind progressive
disclosure, four compact decision metrics on one desktop row, and one result
surface that can switch between summary and daily detail. Sortable columns act
on the loaded filtered result, expose `aria-sort`, compare money as exact minor
units, and keep unavailable values last in either direction.

The Corazón owner Account family applies the same bounded hierarchy to its AI
assistant, business units, team, plan, and organization directory. Team
management is a full route with focused permission and invitation edits in the
existing modal engine. Organization search and ordering stay visible; status,
role, and attention filters use progressive disclosure. This presentation rule
does not change membership, authorization, entitlement, or billing ownership.

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
inside the same browser window. Users enable this mode from the Personalize navigation modal. It is available from `1280px` upward and opens the secondary
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
button in the secondary workspace toolbar. Closing waits for confirmation from the same scoped
workspace-state preference used by the workbar; failures keep the workspace open with a retryable error. The toolbar and frame require
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

### Platform administration: acquisition and commercial flow

The main platform navigation retains the Website visits section and its `PLATFORM_ROOT` gate.
Its workspace exposes Commercial overview, Campaigns and plans, and Website traffic through
the shared view navigation. Saved lead reporting belongs to the Leads owner and follows
[`platform-commercial-acquisition-kpi-contract.md`](./platform-commercial-acquisition-kpi-contract.md).
Use server aggregates and paginated drilldowns, not the limited inbox, for commercial counts.
The four primary cards and history-based stage distribution are a documented domain exception
to the basic-module eight-card grid. Pending follow-up spans all intake dates; the funnel uses
the selected intake cohort. Remember view, period and lead market with the existing navigation
memory engine. A detail action opens the authorized existing lead follow-up; it does not create
another editor or grant a permission.

Website traffic remains global, with a date filter and explicit connector availability. The
lead market and customer account filters do not apply to anonymous traffic. Unavailable traffic
uses an unavailable state, not fabricated zero visits. Submission-event session rate is not
visitor-to-confirmed-lead conversion. Website ingestion remains governed by
`docs/product-analytics-security-contract.md` and the deployment release gate; this workspace
does not enable collection.

### Platform administration: module shell and commercial journey

`/platform-admin` uses the institutional blue identity for its module header, primary
navigation, tab title bars and principal actions. Its workbar follows the saved top/left
preference; the left position becomes a scrollable sidebar on desktop, while narrow
screens retain horizontal navigation. The same configuration dialog is available from
the platform header. The customer account workspace retains its own aqua identity once
opened; the platform-level Customers tab remains blue.

The primary sections follow the operator journey: acquisition (website visits and
leads), conversion (commercial operations), accounts (customers, companies and
billing), delivery (consulting and system tickets), then control (catalog,
usage/audit and internal development). This is navigation order, not a new business
status, entitlement or automated handoff. Preserve the existing landing section,
URL memory and permission gates for each section.

### Administrative workspace refinement (2026-10-19)

The five system tools retain their existing routes, owner permissions and navigation order.
Use a compact shared administrative identity, clear tab-specific titles, restrained blue surfaces,
and 44px actions. The customer account workspace retains its approved aqua identity.

- AI connections owns its refresh/connect title actions and a name/status filter bar. Filtering
  never revokes access; an empty search is distinct from having no connections.
- Multi-kiosks exposes refresh/create in the title bar. A quick status selection clears the
  conflicting detailed status; clear filters restores the whole list. Lifecycle failures stay
  inside their open confirmation, with retry and busy-close protection.
- Subscription keeps one draft across Plan, People, Payment and Invoices/receipts navigation.
  These controls scroll to and focus the owning section; filtering the catalog never removes
  selected products or recalculates charges in the browser.
- Platform Customers follows the three-direct-action rule, with Columns in overflow only when
  needed. Simple account forms keep their existing validation and show required-reason guidance.
- Training uses the current view title, one refresh action and an activity search/status bar
  within the selected stage. Progress totals and exams use the full curriculum, regardless of
  visible activities. No zero-progress summary is shown before the first successful load.

Recoverable connection, kiosk, catalog and training filters use the existing scoped workspace
memory; they store presentation preferences only. Training also remembers the selected stage.

### Training: independent learning centre

`/training` owns the learning presentation outside `/platform-admin`. The ERP profile
menu and distributor portal link to this workspace; training is not a platform-admin
tab. Reuse the shared workspace header and existing training curriculum, exams,
resources and certificates. Support all eight runtime locales and narrow screens.

The route must authenticate and authorize against the existing training backend before
rendering. Distributor sessions use only `/api/v1/distributor-portal/training`, whose
active distributor membership policy remains authoritative. Existing platform viewers
retain `/api/v1/platform-admin/training` and its `PLATFORM_VIEW` requirement. Do not
fall back from a denied distributor to platform authority, accept a portal from URL
parameters, grant platform roles, or request platform-management context to open
distributor training. Public demo sessions cannot enter. Menu visibility is only UX.

Redirect explicit legacy `/platform-admin?section=training` and
`/distributor-portal?tab=training` links to the new protected route before loading the
old workspace. A saved platform navigation preference of `training` resets to
`customers`, without redirecting every subsequent administrator visit. Progress stays
keyed by learner/program/version; API shapes, CSRF, assessment ownership, certificate
verification and platform-only audience summaries remain unchanged. This separation
does not grant access to ordinary distributor staff or ordinary Índice company members.

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

System-tool navigation alignment decision, 2026-10-18: administrative primary sections use
`IndiceWorkspaceNavigation` with `variant="workbar"`: the same pill geometry, module emoji
artwork, selected accent, horizontal slider controls and mobile touch targets as module tabs.
Keep this navigation in the owning administrative header. Kiosk and Platform Administration
retain their specialized headers, scopes and role filters; Platform retains its desktop sidebar.
Training's four primary sections move into its learning-centre header; curriculum and exams stay
inside their owning sections. Conectar IA promotes Connections, Guide and Ideas to its existing
Home Panel workbar while retaining `config_center.integrations` authority. Billing's Plan,
People and Payment pills remain anchors within the same draft, so navigation never saves or
executes a commercial action. Existing deep links remain valid. Section URL parameters describe
presentation only and never select a training portal, tenant, role or entitlement.

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

### Sales active opportunity flow (product decision, 2026-10-18)

Opportunities presents its active flow in a compact coral context strip immediately below its
standard title bar and before Table/Kanban/Agenda and filters. The selector shows the full flow
name, wrapping on narrow screens, with a localized opportunity count alongside it. Flow management
opens the existing workspace from this strip; users without management capability retain read-only
catalogue access and the existing editor restrictions. The title bar retains Create quote and Create
opportunity directly, with Columns and New sale in Actions. This is the explicit contextual
distribution for this view; do not duplicate flow controls in Actions or the filter bar.

The active flow remains part of the existing company/user-scoped `sales/prospects` workspace
memory. Returning from another module and reloading restore the last accessible flow; an explicit
`flow` URL parameter takes precedence. Validate restored IDs against the current catalogue and
fall back to an accessible default when needed. Selection changes only the user's view; it must
not reassign opportunities or change the company default. Preserve business routes, owner-visible
counts, flow-stage semantics and the shared memory engine.

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

The preferred-currency entry lives inside the global header's profile/avatar menu on desktop and
mobile. Show its localized label and the current ISO currency code in that menu; do not reserve
a separate currency button in the header action row.

It remains a persistent system utility available from every view, including views without
monetary fields. Do not duplicate it inside module title bars.

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
- the profile-menu entry closes the menu and opens the shared blue Standard Form Modal outside
  the dropdown lifecycle; the modal uses USD as
  the exchange-rate base
- preferred-currency and rate edits remain in modal draft state until the user saves; closing or
  cancelling the modal does not alter the active configuration
- the daily-refresh action refreshes the modal draft and may replace the current-day server cache,
  but does not change the user's active preference until save
- manual rate editing uses progressive disclosure and stays secondary to the daily reference
- every applied source shows its institution, dataset, observation date, verification status and
  a link to its published source; missing or stale data keeps a visible warning
- the user preference persists across navigation and sessions

The avatar-menu entry opens the same currency and exchange-rate modal everywhere. Opening a new
modal session initializes its draft from the active preference; Cancel discards only that draft.

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
- authenticated phone workspaces expose four authorized primary destinations and a **More** control in a bottom navigation bar; the bar derives from the existing navigation model and never grants authority
- fixed mobile navigation respects safe-area insets and the content reserves enough bottom space to remain fully reachable
- dense mobile records show identity, state, the daily value and the primary action first; secondary analysis opens progressively per record

### Mobile list controls (product decision, 2026-10-18)

Keep the existing mobile record views and each table's single horizontal canvas.
Shared filter inputs and selectors stay at 44px, including Radix trigger data-size
variants; mobile input text uses 16px to avoid focus zoom. Filter cards reduce
only mobile padding, disclosure/reset controls wrap at 44px, and search-clear
controls reserve a separate 44px target. Long selector options wrap within the
screen. Existing secondary-filter ownership, automatic reveal, defaults, query
semantics and persistence do not change.

On phones and tablets below md, shared pagination presents previous / current
page of total / next, plus the existing page-size selector and record range.
Desktop keeps numbered pages. Both presentations call the same guarded callbacks;
disabled boundary links are removed from tab order. This prevents long page-number
strips from widening a phone screen. Scrollable tables remain keyboard focusable,
retain native vertical scrolling and contain horizontal overscroll. Sort targets
are 44px on mobile. HR mobile cards place metadata and actions below their identity
header, with readable 12px labels and independent 44px selection/action targets.
No permissions, monetary values, column-width preferences or business mutations
are changed by this presentation decision.

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

Expenses persists its applied column visibility and order through the existing authenticated
workspace-state store, in the separate `expenses` / `expenses-columns` entry scoped to company
and user. This preference has no expiry; the 90-day retention for navigation entries is unchanged.
The browser copy is a scoped cache, not the only durable copy. Apply waits for server confirmation;
a failed save keeps the draft open for retry. Background table refreshes must not discard a draft.

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

Global Messages and Platform/Distributor Customer Care follow
`docs/messaging-and-customer-care-contract.md`. Messages uses the shared blue Operational Workspace
Modal, responsive list/detail navigation, localized labels and explicit send/retry states.
The 2026-10-18 Messages refinement retains that shared modal engine, with a compact inbox,
actor-visible last-message previews, an actions popover and one blue conversation header on phones.
The repeated footer is omitted. Its module-scoped compact-viewport rule keeps only the history
scrolling, so the composer remains visible when the keyboard reduces height. Photos and private
PDF/Word/Excel documents share removable drafts, clear upload states and expiry-aware retries;
ERP first-message attachments follow the owner contract and advertised context capability.
No attachment or draft content is persisted in browser storage.

The messaging workspace must be remounted on account/company changes. Customer Care preserves
existing system tickets and distinguishes internal notes from customer replies.

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


The 2026-10-18 mobile notification refinement retains this Operational Workspace Modal and
all owner-generated routes, query parameters, permissions and APIs. Phone summary metrics use
two compact columns; progressive filters scroll with the content on phones instead of covering
notification rows. Row controls and menu actions have 44px touch targets. The preview menu is
bounded by its available viewport, with independently scrolling rows and a reachable footer.

Notification lists refresh while visible and on return/focus/reconnection. Background refresh
keeps the current inbox, counters and filters; a recoverable failure shows a localized retry
without erasing the last successful list. Mutation failures retain the row and open surface,
prevent duplicate taps, and allow retry. Opening an unread item waits for its read acknowledgement;
only then does it close the notification surface and follow the owner destination. Mark-read,
mark-all-read and dismiss do not navigate. Dismiss does not bubble to the row's Open action.
A retried dismiss that returns 404 is reconciled as already absent, so a lost acknowledgement
does not trap the user in a permanent retry state.
Missing or non-ERP destinations show the notice details without silently marking them read.

The launcher remounts per authenticated user/company/membership. Late list/mutation responses
cannot restore another account's notifications or navigate the new workspace. This is an in-app
inbox, not an OS push-notification implementation. Personal preference persistence is defined below.

---

### Phone modal viewport (product decision, 2026-10-18)

Preserve the Indice modal types, module colors, artwork, validation and action
callbacks. The shared Dialog and AlertDialog surfaces observe the visible viewport
only while mounted, including keyboard resize/offset changes, with frame-coalesced
listeners cleaned up on close. Phone bounds use safe-area-aware margins and retain
44px close/footer targets and 16px field text. Headers and body padding become
compact without removing descriptions or fields. Footer actions wrap, keep the
secondary action before the final primary action, and never use fixed widths that
clip a translated label. Wizard step buttons retain accessible full step names.

At a visible height below 520px (keyboard/landscape), the entire dialog scrolls,
including its footer, rather than reducing the body to an unusable sliver. At normal
heights, the existing independent body scroll keeps the header/footer available.
Custom workspace bodies can retain their typed presentation overrides. Incentive
column selection reuses IndiceModalFrame with unchanged immediate toggle behavior.
The mobile task-detail footer participates in flex layout instead of covering the
last record fields with a fixed overlay. Desktop modal widths and workflow ownership
remain unchanged; viewport testing must not submit business records.

### Phone form feedback (product decision, 2026-10-18)

Forms retain their owning validators, payloads, persistence and permissions.
Required controls have associated labels and readable error descriptions, including
HR custom select controls; native shared inputs propose email, telephone or decimal
keyboards unless the owner explicitly chooses another input mode. New shared error
summaries reveal themselves only when clipped, without moving focus while the user
types. RH invalid-step attempts focus the first visible, enabled control already
marked invalid by the owning validator.

Gastos, task capture and opportunity capture keep their existing disabled-save rules
and explain their unmet requirements in the footer using localized field names.
Amount helpers describe the existing positive/non-negative constraints rather than
silently changing an entered amount. HR final save retains the draft on failure,
shows the existing safe owner error inside the modal, blocks duplicate pending saves
and conflicting navigation, and permits an explicit retry after failure. Task capture
uses the same synchronous pending latch for its existing full and quick handlers.
No success is displayed until the owning save operation completes. Regression tests
must cover failure, retry, duplicate attempts and safe field retention without creating
business records in the user's browser.

### Phone module journey (product decision, 2026-10-18)

Panel Inicial uses the same compact phone title, Home and expandable Favorites
controls as the module shell, preserving desktop navigation and the horizontal
rail. Phone tab changes reset only the module content scroll to its heading;
filters, record state and desktop scroll behavior remain owned by the module.
The active navigation item is revealed by scrolling only its horizontal rail,
including direct entry and browser history changes. Do not move keyboard focus or
scroll an ancestor page to reveal a tab. Deferred reveal frames are canceled on
navigation or unmount. Plain modal footer buttons visibly dim when disabled, as
shared Button controls already do. Profile fields keep 16px text and 44px targets
on phones and expose their existing localized labels and autofill purposes.

### Confirmed modal persistence (product decision, 2026-10-18)

Warehouse capture exposes identity, organization assignment and review, and awaits
its owner promise before clearing a draft. Creation/deletion callbacks use a
synchronous pending latch and show failures inside the modal. Required scope is
validated against the provided unit/business catalogs. Existing layout and sliders
remain unchanged.

Contact file/phone import reconciles existing server contacts before each attempt,
awaits the existing contact creation owner sequentially, counts only acknowledged
writes, and retains only failed drafts for retry. Confirmed or existing duplicate
contacts are not resubmitted. Progress is visible and pending import blocks close,
repeat submission and replacement of the selection.

Inventory receipt capture retains File objects in transient component memory only.
The stock operation commits once; private evidence is then reserved, uploaded,
verified and registered against its first persisted movement. A partial attachment
failure explicitly states that stock is already saved. Retrying never posts the
stock operation again and keeps the approved upload reference for registration
retry. File selection is limited to 10 nonempty PDF/JPEG/PNG/WebP files of 10 MiB
each. Legacy file names are not presented as uploaded content. Movement Files
provides authorized listing, additional uploads and fresh download URLs. No file
body or presigned URL is stored in database JSON or workspace memory.

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
| Administration confirmation | Centered safe sheet sized to content, with 16px margins | Existing confirmation width, approximately `max-w-md` |
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

Sales **Modo vendedor / Seller mode** extends the native fullscreen workspace with a daily contact
queue, published flow scripts and teleprompter, conversation notes/results, actual contact history
and transactional follow-up. Its owner contract is [Sales seller workspace](sales-seller-workspace-contract.md).
Use the existing workspace navigation, resizable panels and Sales modal primitives. Script reading
is an operational typography exception with a user-adjustable 18–40 px text size. Standard Kanban,
financial ownership, stage transitions and reminder rules remain unchanged.

Processes And Tasks is the approved reference.

Kanban requires:

- status columns
- count badges
- operational cards
- compact actions
- empty states
- horizontal scroll
- no dashboard-style Kanban

Sales Opportunities applies this standard to dense portfolios: compact cards identify the
estimated amount and next action; details and editing reuse the existing Sales modals. Desktop
columns have stable headers and independently scrollable bodies, with the shared horizontal
scroll controls. Mobile shows one selected stage with native page scrolling. Stage movement by
menu and drag both use the existing domain transition, including the sale requirement for Won.
Attention filters expose overdue and unscheduled work with visible filtered/total counts; terminal
or paused opportunities are not presented as overdue work. Sorting by estimate groups currencies
without inventing exchange-rate conversions. The optional full-screen workspace uses the browser
Fullscreen API on the board itself, retaining active-flow context and search. Its columns fill the
remaining monitor height and scroll independently, including on mobile. Escape, the exit button,
or leaving the workspace restore the regular view; denied/unsupported requests show an inline error.
Full-screen state follows browser events and is never inferred from a renamed button or hidden filters.
Shared Select and DropdownMenu portals adopt the active fullscreen element, matching Dialog, so
sorting, stage menus and existing Sales editors remain usable without a second modal system.
Clicking a Sales card's next-action panel opens a dedicated **Standard Form Modal** using
`SalesModalFrame`: localized action choices, company-date shortcuts, optional date/time, and a
call-reminder explanation. Contact and owner are read-only context. The draft is ephemeral and
Cancel discards it; only changed action/schedule fields reach the existing awaited Sales update.
An untouched schedule retains its saved timezone/instant. No reminder is promised for incomplete,
past, closed or on-hold calls. Pending saves block duplicate submission and closing; failed saves
retain the draft and explain how to retry. The full opportunity editor remains a separate action.
Board sort, attention filters and mobile stage use `useWorkspaceNavigationMemory` under the Sales
child workspace `prospects-kanban-{flowId}`, scoped to the authenticated company and user. Full-screen
mode is transient; per-column and horizontal positions are session-only and use the same company,
user and flow scope. No opportunity data is cached in the position memory.

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

`Panel Inicial` remains part of the Dashboard learning journey but does not render an internal learning guide. The Dashboard keeps its approved six-stage learning journey while its learning presentation follows the same compact, colorful, instructional language. In normal mode, it shows KPIs, favorites, basic modules, and complementary modules. Product decision (2026-10-09): remove the standalone `Inteligencia artificial / Módulos de IA` section from the Dashboard in all modes.

The detailed state, content, exception, responsive, and migration rules live in `docs/learning-mode-frontend-engine-v2.md`, section 29. That specialized contract controls module learning within the repository-wide accessibility, localization, permission, and behavior-preservation rules in this document.

### Dashboard learning presentation (product decision, 2026-10-18)

The learning dashboard retains the same six stages and stage selection preference.
Saved backend chapter progress is the sole visible learning-progress reference:
a compact summary offers Continue Learning, the next mission, and optional
per-stage details. The stage selector is a horizontal rail with the shared 3D
artwork and an Exploring state; browsing does not imply completion and no second
percentage is calculated from selected stages. The tools section presents only
the selected stage's accessible module cards in the established slider, with a
localized empty state and no fallback link to unavailable modules. Business case
selection remains intact and collapses to a compact summary after selection.
Complementary modules and System Tools keep their current layout and access
rules. Chapter updates, backend persistence and module learning companions are
unchanged.

### Beginner learning examples (product decision, 2026-10-18)

Dashboard stage descriptions use plain actions and everyday terms, with Step
rather than Session. All six stages offer localized read-only See/Do/Check
examples: company/branches, person/role/workplace, task/owner/due date,
expense/payment, product/price/quantity, and area/signal/source/missing data.
Each example has a short question with local corrective feedback; it never changes
chapter completion, business records or payment state. Empty accounts can use the
fictional example without creating test data. Dashboard entries check both module
visibility and the destination tab permission before opening the existing route.
Tasks, Expenses, Human Resources/Collaborators, Inventory/Products and KPIs reuse
the example in their existing expandable companion. Panel Inicial retains its
exception: its example appears only on the Dashboard, without an internal guide.
The established geometry, chapter versions and authoritative evidence rules remain
unchanged. Translations cover current locales and remain subject to language review.
All six practice examples follow the existing user/company-scoped selected case:
Emily/cafés (CAD), Juanito/supermarkets (MXN), Camila/auto parts (COP).
Fictional people, stock checks, purchases, products, amounts, questions and feedback
resolve together from localized templates and case facts. The dashboard uses its
live case selection; module companions read the same saved preference. No separate
case setting is introduced. With no selection, Emily remains the example fallback.
Changing case, stage or language clears only the local practice answer; it does
not mark a chapter understood or applied, or change business records.

### Module learning clarity (product decision, 2026-10-18)

The expanded companion keeps its existing horizontal journey rail. Where a beginner
practice exists, show one lesson body at a time: Practical example (default) or
Tab tools. The original tool slider, detailed instructions, real cases and RH
employee mission remain available in Tab tools. Selecting a presentation never
marks a chapter reviewed/applied or creates business records. The normal module
header and actions remain visible. Guide decoration reuses the shared 3D artwork.
Reviewed-topic counts describe the existing understood/applied count; opening a
lesson does not increase it. Spanish uses “Modo aprendiz” consistently.
Sales learning names match Customers and Opportunities in the current tabs.
The Indicators practice follows Matrices → Diagnosis → area/signal → Sources,
distinguishing missing data from a detected problem. Plain-language web summaries
sit above the unchanged detailed curriculum requirements; chapter versions and
operation evidence rules are unchanged.

### Remaining basic learning modules (product decision, 2026-10-18)

Petty Cash, Receivables and POS administration adopt the same beginner presentation.
Owner tab labels remain authoritative in all locales. Funds, Accounts receivable,
Registers and Closings provide fictional See/Do/Check practices tied to the saved
Emily/Juanito/Camila case. Amounts are fixed examples: cash plus documented spending,
partial customer payment, and counted versus expected cash. They never simulate
transactions against tenant data or infer blame from a cash difference. Empty
workspaces can practise without creating funds, credit, payments, shifts or closings.
All administrative tabs receive plain web summaries above their unchanged detailed
curriculum. POS Sale remains free of the companion and learning controls.
Complementary modules are outside this change.

### Mobile learning usability (product decision, 2026-10-18)

On narrow screens the collapsed journey caption sits above, rather than beside,
the horizontal rail. Journey and tool sliders remain horizontal, touch-scrollable,
and respect reduced motion; their mobile targets and primary learning actions
have at least 44 CSS pixels of height. Practice/tool selection uses two flexible
columns. Practices display one See/Do/Check step at a time below the medium
breakpoint, with the question and feedback on Check. Desktop keeps the established
three columns and visible question. Step selection is local presentation only,
never learning completion. Secondary decorative tool previews are hidden below
the small breakpoint to keep the real content closer. RH retains its mission,
selector and exceptions. POS Sale retains its no-companion exception.

### Mobile header and navigation (product decision, 2026-10-18)

The blue header keeps three primary mobile actions: messages, notifications and
profile. User and active-company names remain visible. Existing company selection,
language, appearance and learning settings are reachable from the mobile account
menu using the same owner callbacks and permission rules. Desktop keeps its action
row. No new navigation destinations, authority or persisted preferences are added.
The mobile module header puts Dashboard and a favorites disclosure beside its
two-line module/tab identity. Favorites open as the existing horizontal slider;
the main tab rail stays horizontal and touch-scrollable, including modules that
wrap tabs on desktop. Primary touch targets are 44px. Desktop workbar layouts,
module colors, custom artwork, access filtering and routes are preserved.

### 28.2 Global learning settings

The graduation-cap action in the global header opens the shared blue standard-form modal for `Modo aprendiz`; it is not a direct toggle. The modal provides one explicit save boundary for the existing global state:

- enable or disable contextual guidance across compatible modules;
- show or hide the six-stage journey on `Panel Inicial` independently from the global mode;
- review the current journey stage and reset it to the first stage without deleting the selected business case.

Opening or cancelling the modal must not change stored preferences. Saving confirms the user-and-company-scoped account preference atomically through `system/learning-mode` in the existing workspace-state API. This preference has no automatic expiry; the browser stores only a cache and a one-time migration source. Closing a session still clears browser data without deleting the account preference. First entry defaults to enabled only when no saved preference exists. Loading must complete before edits are accepted, and failed saves retain the modal draft with a visible retry path. Turning the mode off restores the normal operational UI without deleting journey progress or the selected business case. The header keeps a visible active treatment when guidance is enabled, while the action retains dialog semantics instead of toggle-button semantics.

The secondary workspace follows the same light/dark theme as the main workspace. Theme updates synchronize between same-origin documents without a newly mounted pane persisting a stale default. Session or company changes invalidate in-flight learning preference loads and queued saves; a stale response must not restore another account’s state.

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

### Dashboard section headings (product decision, 2026-10-17)

The main Dashboard retains its horizontal KPI and module carousels, original
module-card dimensions and borders. Product decision (2026-10-17): main Dashboard
KPI cards adopt the approved slightly portrait 11:12 proportion at compact
slider widths (200px on desktop, up to 220px on mobile; reduced padding and
artwork retain readable titles and complete status text), white/dark neutral surfaces, a pale module-colour wash, floating
3D artwork, a localized module label, a prominent value, and a separated status
footer. Existing metric values, availability, comparison text, and trend/tone
semantics remain authoritative; no decorative charts or invented trends. Other
compact KPI consumers keep their existing presentation. All
sections share aligned margins and a common title treatment: a 32px artwork
slot, a restrained count, a short localized description, and aligned actions.
The approved Dashboard section-title exception uses semibold up to 28px;
module workspaces keep the canonical typography scale. Selection, ordering,
access filtering, navigation, and the stage-based learning journey remain
unchanged. Do not replace the Dashboard sliders with desktop grids. Dashboard
slider viewports share the same desktop gutters; bottom shadow clearance does
not add extra section spacing. Controls use the same inset, shadow, and card-centred
position. Header actions align to the title row and supporting copy uses readable
secondary contrast. The Favorites heading uses the custom transparent 3D star.


### Dashboard touch interaction (product decision, 2026-10-18)

Mobile retains the approved KPI portrait proportions and original module-card
sizes, artwork, borders and horizontal sliders. Snap and scroll padding belong
to the actual overflow viewport, so each swipe settles on a card without creating
page-wide overflow; vertical page scrolling remains native. KPI status copy uses
12px/16px on mobile and keeps complete authoritative comparison text. The KPI
configuration trigger and module favorite controls have 44px mobile touch targets.
Favorite stars are visible without hover on mobile, expose their pressed state,
and remain separate from each module's native navigation button. Desktop card
sizes and mouse scroll controls remain unchanged. Routes, ordering, permissions,
metric calculations and stored selections remain owned by their existing flows.

### Dashboard system tools (product decision, 2026-10-17)

The Dashboard ends with a localized System Tools section containing Connect AI,
Kiosk Centre, Manage Subscription, Platform Administration and Training Centre
in the established module-card slider. These shortcuts move out of the profile
menu without changing their routes or authorization. Non-demo admin sessions
may discover billing; integrations and kiosks retain their existing tab/centre
checks. Platform Administration retains the previous admin-plus-root rule
(PLATFORM_ROOT context or root session role). Training retains its independent
canDiscoverTraining contract, including distributor admins and platform viewers.
Platform context resolves asynchronously and is tied to the authorization
revision so old-company or old-session responses cannot expose shortcuts.
The section disappears when no tool is allowed. These are shortcuts, not entries
added to the backend module registry or favourites. Backend route and API guards
remain authoritative. Other profile actions remain unchanged.

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

Treat this as a review signal, not a mechanical limit. If a file grows, identify distinct
responsibilities and extract only cohesive components, hooks, or services. Do not create empty
layers, arbitrary fragments, or folders merely to reduce a line count. Preserve regression
coverage and public behavior as required by AGENTS.md.

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

## 39.1 Platform Administration commercial operations

`PlatformAdmin/CommercialOperations` owns the `pending`, `MX` and `CA` account views. Country is
the recorded `country_code`, never inferred from currency or language and never used to grant a
service entitlement. Mexico and Canada journey lists are reference guides, not saved account
progress. Pending items are suggestions from access/billing issues, active trial expiry or missing
country. Historical/permanent trials must not generate expiry suggestions.

This frontend uses existing account APIs. Search is server-side; market, attention, distributor
and expiry filters apply to explicitly counted loaded records (50 per page). Partial coverage,
loading, failure and revoked access must remain distinguishable. Stale responses cannot replace
a newer search, and permission changes discard loaded records.

The account detail is an **Operational Workspace Modal** using the blue shared shell. It presents
real owner/contact, contract, distributor and trial data plus existing account history. Close it
before opening another account workspace. Customer-care and consulting handoffs prefill a visible
company-name search; these are search aids, not authorization scopes or assigned commercial tasks.

The separate Leads section now owns consented website intake, persisted commercial
stages, assignments, notes and next-action dates under
[`platform-lead-diagnosis-flow-v1.md`](./platform-lead-diagnosis-flow-v1.md). These lead
records do not automatically provision a customer account, subscription, agents or
entitlements. Commercial Operations remains the account-based reference and handoff
workspace; it must not simulate lead writes in browser storage. Current billing prices
and consulting entitlements remain governed by their existing contracts.

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

Operational report modules use one shared module frame: a bounded header with
one title, current scope, one primary action and local tabs; one progressive
filter surface; one compact row of four decision KPIs; and one visible result
surface. Routine filters stay visible while analytical filters use an explicit
advanced disclosure inside the same form and query. Local tabs and table views
reuse already loaded data. Comparable columns sort ascending and descending,
announce their state, compare money in exact minor units and keep unavailable
values last. A secondary or historical result remains hidden until selected.

When a module offers **Imprimir selección**, printing includes the module title
and the currently visible result table only. Navigation, filters, KPI strips,
view controls and interactive actions are excluded from print. This is the
canonical application pattern for the provider Summary, Multicalendar,
Reservations, Cleanings, Maintenance, Bracelets and capacity, Vehicles and
maintenance, Assigned services, Products, Finance and occupancy, Cuts, Expenses, Pricing
and Channels; domain authorization, calculations, API contracts and persistence
remain owned by their modules.

Within the provider Pricing and Channels workspace, **Tarifas**, **Canales**,
**Cálculo Airbnb / Booking** and **Motor diario** are route-backed sibling tabs.
The channel calculator reads the official monthly target from Finance and the
contract model, fixed costs and management commission from Cuts. It persists only
property-specific channel, tax and operating assumptions. Editing a target from
this surface opens one monthly planning modal for the Finance sales and occupancy
targets plus the property's optional break-even override. The Finance target owner
remains authoritative for goals; when the break-even override is empty, the
calculator continues to derive it from the contract and fixed costs owned by Cuts.
The recommendation treats the Finance target and break-even as required owner net,
uses the greater monthly amount, divides it by expected nights and reverses all
configured deductions to obtain each channel's public price. Booking commission stays unconfigured until the
property supplies its actual contract percentage. The daily engine remains a
separate reviewable proposal and requires explicit confirmation before applying
prices. Neither surface may create a client-side pricing authority.

The channel calculation modal keeps the fiscal profile as its shared control, then
presents separate Airbnb and Booking configuration panels because each channel has
different commission and collection inputs. Each panel pairs the public nightly rate with
the estimated owner deposit after all configured deductions and keeps the monthly Finance
target, break-even and required net per night visible. Fiscal details remain available in
a collapsed disclosure, with a live non-authoritative preview. A separate **Estancia y
limpieza** modal owns expected occupied nights, minimum stay and cleaning; this keeps
operating rules out of the tax modal and prevents those property-specific values from being
copied accidentally with a shared channel profile.
Known Airbnb Mexico schemes enforce their documented host percentages;
only the custom scheme accepts a manual Airbnb rate. Effective VAT withholding is
the lodging VAT rate multiplied by the retained portion and participates in the
server-owned net calculation. The Mexico presets distinguish a person with RFC, a
person without RFC and a legal entity; only a custom profile permits manual withholding
percentages. For 2026, the legal-entity preset with a valid RFC applies the federal
platform withholding of 2.5 percent ISR and 50 percent of the 16 percent lodging IVA;
the displayed effective IVA withholding is therefore 8 percent. A provider may apply shared fiscal and channel
assumptions to selected accommodations in one revision-checked atomic command;
property nights, cleaning, minimum stay, Finance targets and break-even remain
property-specific.

When Booking commission VAT is marked as additional, the calculator applies Mexico's
16 percent VAT to the contractual commission independently from the accommodation's own
VAT configuration. The owner deposit subtracts channel commission, commission VAT when
applicable, payment charge, ISR withholding, effective lodging VAT withholding and Cuts
administration. Booking also records whether payment is collected through Booking.com or
directly by the accommodation. Platform tax withholding participates in the estimate only
when the platform collects payment; the contractual commission still participates in both
models. The recommendation must leave at least the greater of the Finance target or
break-even after those deductions. Cleaning remains an explicit operating charge and does
not subsidize the nightly target because average stay length is not authoritative; the UI
warns that channels can include cleaning and other extras in their commission base.

The Airbnb and Booking columns each pair the public nightly price to configure
with the server-calculated owner net per night after channel charges, effective
VAT withholding, ISR, payment charges and contract administration. The interface
labels the result as an estimate and never presents it as a reconciled or
withdrawable balance.

Corazón workspace printing builds an isolated document from a fresh authorized
result or explicit selection; it does not print the live application shell. The
shared document frame owns only paper presentation: brand, title, scope, issue
time, page geometry and footer. Each module still owns its fields, calculations,
privacy rules and snapshot/version semantics. A4 portrait is the default, A4
landscape is used for wider operational tables, and A3 landscape is reserved for
dense cleaning grids or established executive reports. Prefer one sheet when the
result remains legible; otherwise paginate with repeated table headings and intact
rows instead of shrinking or clipping information.

The paper palette is neutral: white background, dark ink, gray rules and one
restrained structural accent. Color is never required to interpret a state. The
company logo and evidence photographs keep their original content. Browser-native
URL/date headers remain controlled by the print dialog and are not part of the
application document.

Platform administration must follow the same rule. An executive landing page
may aggregate decision-ready counts and priorities, but every value must link to
its owning workflow. Related approval queues may share one tabbed surface while
preserving their domain endpoints, authorization checks, actions, and legacy
routes. Role switching belongs in the account menu rather than duplicated
topbar or sidebar controls.

Every file should remain small enough to understand quickly.

The final product must feel like Human Resources, Processes And Tasks, Expenses, Sales, POS, Inventory, Receivables, Petty Cash, Dashboard, BMI, and PPI can all grow independently without turning Indice into chaos.
## Official community chat

Authenticated workspaces expose Chat as a primary destination for travelers, agents, owners and
platform customer service. In the owner mobile navigation, Chat occupies the former Operations
shortcut; operational modules remain available through the complete module menu. The owner desktop
navigation includes Chat under Communication. ROOT operators appear inside conversations as
**Corazón · Customer service**, without exposing the operator's personal identity.

The inbox is a searchable queue with unread work first. Inbox and active thread are separate,
route-backed views at every breakpoint: the inbox owns keyword, unread and conversation-type
filters, while the thread uses the full message workspace and always exposes a direct return to the
inbox. Search matches normalized words across the conversation title, channel label, type and stable
reference. Advanced fields remain collapsed under **More filters** until requested.

On phones the chat workspace fills the area between the fixed top bar and primary navigation. Only
the message history scrolls; the thread header and composer remain anchored inside that workspace.
Every message includes a server-derived text label for customer service, owner, travel agent or
traveler. Role color is a restrained border or label outline over the standard surface, including in
dark mode; it never fills the message with a light theme color and is never the only identity cue.
The browser cannot supply or override the sender role.

Progressive filter shells have one grid owner. Their direct children always use `min-width: 0`,
advanced fields stay collapsed by default, and legacy module filter selectors cannot redefine the
shell. Phone layouts use one column below 520 px and may use two equal columns only when both controls
fit without overflow.

Navigation does not expand the audience contract. Owners see only organization-scoped service and
case conversations already authorized for their membership and product scope. Agents retain current
assignment and consent limits, travelers retain trip ownership and participation limits, and ROOT
reads remain mediated and audited.

## Unified account entry

`/account.html` is the standard sign-in surface and `/workspace.html` is the standard authenticated
landing for members, agents, owners, staff, distributors and platform direction. Every general
account enters the traveler context first. Agent, owner and direction tools are explicit mode
switches shown only when the authenticated profile is authorized for them; the role must never
silently choose a different visual application at login.

The retired `/admin/` entry is a compatibility redirect, not a user interface. Without a session it
returns to `/account.html`; with a general authenticated session it returns to `/workspace.html`.
Driver kiosk and host portal accounts keep their documented specialized entry points. Public access
links must target `/account.html`, and remembered continuations must not accept the retired entry.
The local `npm run dev` command enables this commercial workspace; a server that serves the shell
while returning `COMMERCE_UNAVAILABLE` from its workspace APIs is not a valid local preview.

### ERP scheduling complementary pilot

The native ERP `scheduling` pilot lives under `react/src/app/ComplementaryModules/Scheduling`,
not the dormant modules scaffold and not PlatformAdmin. Follow
[Scheduling module contract v1](scheduling-module-contract-v1.md): one Agenda/reservations tab,
Events, Clients and Indicators. Services, Team/availability and Public agenda are title-bar modal
actions, not separate configuration tabs. It reuses the
canonical configurable module shell, title/filter/table/modal and workspace-navigation primitives,
eight locales, coral identity (`#FF6B5E`, graphite foreground on primary actions), colored identity
emojis, light/dark surfaces and explicit operator permissions. Product chrome stays blue and saved
public-page business colors remain independent. KPI drilldowns
preserve period/status; an unavailable attendance denominator is not zero.

Calendar/Table views share period and collaborator filters. Day/week/month presentation adopts the
existing calendar rhythm without adding a scheduling engine; owner APIs scope all company agendas
or an operator's own staff. The 2026-10-23 owner decision adopts Meeting control as the calendar UI/UX
reference: compact full-width grid, matching period/navigation controls and explicit date selection
opening Agenda del día in the native Standard Form Modal with coral header/footer. No permanent day
sidebar remains. Reservation review/capture replaces day consultation and returns to the same day;
closing consultation restores focus to its date. Chronological reservation/event identities, loaded-
scope warnings, empty/filter/error states, read-only access and day capture rules remain with Scheduling.
Services and Team/availability open operational-workspace modals;
their standard create/edit form replaces the list frame instead of nesting another modal. Public
agenda opens an Operational Workspace Modal for saved agendas, search, publication state,
sharing, preview and unpublishing. New/Edit replaces it with a separate three-stage Modal Wizard
Índice (Content, Design, Review and publish), returning to administration after save/cancel. This
2026-10-22 owner decision supports several independent named agendas and links per company, adopting the
Public Catalog editor reference: editable public identity/text, palettes/custom colors, Cards/Compact
presentation, desktop/mobile preview and saved public/personalized links. See the 2026-10-22
Scheduling owner decision. The underlying agenda filters/view stay intact. Legacy reservation
links preserve their filters and open Table in the unified tab; backend permission scopes stay
independent despite the visual union.
The 2026-10-23 public-presentation refinement removes duplicate heading/description layers, keeps
one current-step heading and compact progress, and reserves space for mobile public bottom actions.
Per-agenda logo selection/change/removal belongs to the same Design wizard stage and inert preview;
it does not open another modal, modify global company branding or save before final review.
The title bar follows the shared three-direct-action limit: New request, Team/availability and
Public agenda remain direct for a fully authorized operator; Services and Refresh are in Actions.
With fewer eligible actions, the shell exposes the permitted actions directly according to Section 12.
Filters use the shared white card and 44px coral-focus controls, with adjacent From/To, Status and
Collaborator. Do not invent a search field unsupported by the owner query. Table-only archived
records live under More filters, restored active values reveal it, and Clear restores factory filters
without changing the selected view. Timezone is data context, not a filter-header notice.
Reservation commands use native reasoned forms/confirmations for reassignment, pause/resume and
soft archive. Clients embeds the actual Sales Contactos workspace/provider/data boundary, with
the same data, forms and actions. It requires native Sales module access and the contacts permission
in addition to Scheduling clients access; without them it shows an explicit access message, not
an empty CRM or a permission grant. The earlier narrow read-only endpoint remains compatible.
Removed records retain their history.

`/book/:alias` is a public Kiosk Engine presentation and must not mount private financial/favorites
providers or fetch ERP credentials. Public requests visibly require manual confirmation; no email
delivery, CRM conversion or confirmed reservation is inferred from submission. Contact drafts and
public tokens remain in memory only. The compact pilot Learning Mode companion remembers expansion
through the existing scoped hook without pretending a visit is applied business progress.

A stale traveler import route without its local purchase draft returns to `#traveler/trips`. A valid
draft keeps the import workflow. This prevents bookmarks or interrupted browser storage from
presenting a failed workspace after a successful login.

### ERP meeting control complementary pilot

`react/src/app/ComplementaryModules/MinutesControl` is the active native workspace for the existing
`minutes-control` route / `control_minutas` slug, not the former mock entry. See
[Meeting control module contract v1](meeting-control-module-contract-v1.md).
Identity is corporate blue with 📝; tabs follow Juntas → Sala de junta → Acuerdos → Indicadores. Sala de junta is a derivative
view of the meetings scope; the other tabs retain independent native permissions. Calendar/Table share search and period; status/responsible use More filters.
Title actions are New, Flows and series, and Refresh. All operational tables use the canonical header, expandable
resizing, backend allowlisted sorting and shared 10/25/50/100/200 pagination. Safe filters, widths,
view and page use existing company/user-scoped workspace memory; no record content is persisted.
Record detail, planning, minutes, transitions and discard replace one native modal frame, never
nest another. Cancellation is a reasoned confirmation that retains evidence. The compact learning
companion uses the native scoped expansion hook without pretending business progress was completed.
Eight localized operational indicators link to matching backend-filtered attention records. No
unit ranking, synthetic chart, financial formula or corporate Root record is reused. The module
remains a local pilot, with no public links, automatic invitations or platform administration grant.

The approved local planning extension classifies Junta única as a grouped Standard Form Modal;
flow/series as a Modal Wizard Índice (purpose/people, schedule, backend date review); flows/series
management as an Operational Workspace Modal; and archive, pause/resume, future cancellation
and discard as Confirmation Modals. All use the existing frame, module-blue header/footer and
native wizard components. Drafts survive Back, errors and retries in memory only. People selection
shows coordinator/minutes responsibility without implying access grants or external invitations.
Review distinguishes overlapping dates, finite recurrence and human-confirmed evidence. Editing
explicitly separates one meeting from future planned occurrences, preserving existing history.
Internal reminders have localized generic inbox labels and scoped deep links, not private text.

### Adopted Agenda and Meetings operational extension — 2026-10-08

Agenda capture uses the canonical wizard stepper with four steps (selection, time, contact, review)
and native stable footer actions inside the private modal. Review precedes the only submission.
Phone, rescheduling history and paginated event participants are private owner views. Weekly staff
configuration supports multiple nonoverlapping windows, unavailable dates and service eligibility.
Events with participants permit metadata/capacity editing while protecting host/time/duration.
The Sales picker requires native Sales/contacts plus Scheduling capture permissions, preserves
Sales ownership and requires explicit consent. KPI deep links reset hidden collaborator/pagination
filters and include archives to match the calculated population.

Agreements open with explicit meeting context across due dates; general Open/Overdue views are not
limited to the current month. Search/pagination replaces the truncated meeting selector. Detail,
edit, progress notes, closed-minutes addenda and native task linking use one modal frame and scoped
owner APIs. Series follow-up reuses original open commitments. Record drafts remain in memory.
Print reuses the shared document engine; `.ics` downloads export one authorized occurrence without
inviting anyone or claiming synchronization. Generic staff notifications use localized module copy.
These owner extensions preserve native module/tab permissions and pilot release status.

### Verified customer entry MX/CA

The public `/start` route follows the
[customer entry owner contract](public-customer-entry-mx-ca-contract-v1.md): business/consented
lead, email verification/account, and confirmed demo access. It reuses the institutional blue
login-site header/footer and native controls, with one-column touch-safe mobile presentation
and visible retryable errors. Market selection is independent from the eight ERP languages.
The route does not mount private Favorites or Petty Cash providers. Credentials, continuation,
OTP and drafts remain in memory, never in URLs or persistent browser storage. Failed verification
keeps the pending challenge for retry; account retries cannot restart the demo or duplicate a lead.
The demo checkbox is not payment consent. Public-disabled and payment-not-ready states are
explicit; no price, payment readiness, diagnosis completion or paid access is invented by UI.

Native `/billing` routes the regional cohort to its quoted plan/mandate workspace while keeping
historical and delegated account review in the existing workspace. It uses the shared institutional
header, blue identity, eight-language copy, native CSRF/API client, mobile/dark layouts and an
unchecked payment checkbox. Quote changes reset consent. AFTER_TRIAL and post-expiry IMMEDIATE
mandates are distinct; pending setup and saved method never render as paid access. Redirects
require the exact HTTPS Stripe host. Invoice/portal recovery remains native. Backend errors
fail closed rather than falling back to USD or treating callback query parameters as financial proof.

The primary Dashboard has a Billing-owned account notice outside its six operational sections,
only for the server-verified owner of an unconverted regional trial. It shows the original deadline,
display-only remaining days and a native `/billing` action. It makes no payment mutation, chooses no
plan and accepts no mandate. Pending setup and saved methods remain review-only, not paid access.
Unknown/non-owner/delegated/historical/converted contexts hide the notice; authorization and network
failures discard its snapshot. Company, user and authorization revision scope all async responses.
The embedded workspace renders no second notice. Native `trial_expired` denial can use the same
owner-confirmed recovery presentation; other restrictions keep their existing screen. The blocked
ERP uses a single workspace. Browser countdowns never grant, deny or extend access, and unavailable
payment is explicit in active and expired states. Eight-language, mobile and neutral-dark copy/UI
are required. See the customer entry owner contract for the financial and release boundaries.

### Maintenance operational pilot (2026-10-09)

The active `/maintenance` runtime follows
[Maintenance module contract v1](maintenance-module-contract-v1.md). Its six permission-filtered
tabs are Requests, Work orders, Assets and locations, Preventive, Indicators and Configuration.
It adopts `IndiceModuleShell`, native filters/table/pagination, workspace navigation memory,
calendar/view navigation, modal engine and the remembered compact learning companion. The
shared table and modal engines admit an additive gray tone; their existing tone behavior is preserved.

Operational lists sort through backend allowlists with deterministic pagination; column widths,
safe filters and view preference are remembered without persisting record drafts. Order views are
Table, Kanban and deadline Calendar, each with explicit server pagination. Preventive indicator
drilldowns preserve their original-deadline range and exclude cancelled work. Current backlog
drilldowns clear the period so old work remains visible. Costs display estimated, incurred and
paid service amounts separately, grouped by currency, with explicit unavailable/limit states.

Capture/progress/cost forms, a three-step preventive wizard, technical dossiers and reasoned
confirmations use one active frame and busy/unsaved-change protection. HR assets, technicians,
units, businesses, inventory and expenses use bounded searchable owner selectors. QR deep links
require normal authorization; private print/PDF and `.ics` downloads do not grant access or
invite recipients. All eight ERP locales and mobile layouts are supported. The module remains
a pilot pending the public release gate, without changing existing subscriptions.

### Employee kiosk personal workspace (2026-10-09)

The 2026-10-10 messaging extension is shared with the ERP messenger: direct chats without subject,
named groups, participant/read indicators and compact personal-task capture follow
`messaging-and-customer-care-contract.md`. Team composition defaults to direct chat; care retains
its subject and workflow. Navy message bubbles, decorative color emojis and readable mobile
controls use the existing operational workspace. Task capture replaces the thread body inside
the same frame, preserves the composer draft and uses its existing navigation guard. No nested
modal or second task/messaging engine is introduced.

The approved employee Multikiosk extension follows §34 of `kiosk-standard-engine-v2.md` and the
employee boundary in `messaging-and-customer-care-contract.md`. `EmployeeKioskPortal` owns stable
Today/Tools/Messages navigation: bottom navigation on mobile, compact top navigation on desktop.
Today renders owner-projected attendance and assigned task counts; errors are explicit and unavailable
counts are never presented as zero. Tools retain authorized order, compact brand cards and search state.
Module workspaces load lazily. Task controls use progressive disclosure and retain all existing views,
filters, capture and process actions. The shared header remains one row at 320px.

`MessagingWorkspace` accepts a module-owned transport context. The kiosk provides only the PIN-bound
transport, including photo reads/uploads, and never falls back to ERP identity. Desktop uses two panes;
mobile uses list/detail replacement with a keyboard-aware visual viewport. Hidden panes stop thread
polling/read acknowledgements. Personal state is memory-only and unmounts on session loss or logout.
`KioskNavigationBoundary` is a navigation guard signal, not a new modal or authorization engine.
Owners report dirty/busy state; public form/wizard frames also guard navigation while open. Confirmations
reuse `IndiceConfirmationDialog`; forms retain `KioskModalFrame` / `IndiceModalFrame` behavior.
The new navigation and Today copy cover all supported language families, with existing accessible
large-text, contrast and reduced-motion preferences. Verify with `test:kiosk-employee-browser` plus
the kiosk/messaging regressions, TypeScript and build.

### Sales Board analytical pilot — 2026-10-17

The complementary `sales_board` module adopts the shared coral module shell, title, internal view
navigation, progressive filters, table, pagination, modal and scoped workspace-memory engines.
Its Overview / Trends / Origins and Channels / Sales views follow the analytical composition
contract in [sales-board-contract-v1.md](./sales-board-contract-v1.md). Registered sales, collections
and accounting revenue remain distinct. Native module and tab permission control entry; no local
fallback module catalog or alternate authorization is introduced.

### Sales next-action scheduling — 2026-10-18

The opportunity column uses **Siguiente acción / Next action**. Table and Agenda share the existing
inline date/time pattern and authoritative server persistence. Show the business timezone and the
automatic one-hour call reminder policy without introducing a separate scheduling engine.
Details and compatibility rules: [Sales opportunity reminders](sales-opportunity-reminders-contract.md).


### Audit and HR modal feedback (2026-10-18)

Task auditing in Agenda and Projects shares the 0–5 score parser with the audit
dialog. Blank or whitespace input is missing, never an implicit zero; an explicit
zero remains valid. Announcement save failures appear inside the existing modal,
retain its draft, and permit an explicit retry. Pending submissions block duplicate
clicks, field edits and dismissal. Employee creation/update distinguishes the
confirmed record write from document/schedule follow-ups and list refresh: a
refresh failure closes the saved form with a localized warning rather than asking
the operator to create the same employee again. An actual write failure keeps the
form open. Routes, authorization, APIs and visual composition remain unchanged.


## Sales post-sale continuity

The Postventa entry point uses Ganadas and Perdidas, configurable service stages, the shared Sales modal primitives, and existing workspace navigation memory. Customer history remains reachable. Scheduling a lost prospect is distinct from explicit manual recovery.

The adopted domain contract is [Sales post-sale continuity](sales-post-sale-continuity-contract.md).


### Mobile entry, capture and save follow-through (2026-10-18)

The active shared Sales/POS contact form awaits confirmed create/update commands,
keeps the draft and localized error visible on failure, and blocks duplicate
submission and dismissal while pending. Labels retain their visual treatment and
associate with their controls. Inline row notes and other existing CRM commands
retain their separate contracts. The catalog product wizard remembers a confirmed
product identity while image registration is pending; an explicit retry updates
that same product, never creates another one. Successful image registration closes
the capture form before a follow-up catalog refresh; the shared sync notice owns
refresh failures. Existing field validations, routes and permissions are unchanged.

Dashboard module loading is distinct from a confirmed empty selection and from a
failed permissions/catalog request. The KPI section keeps its horizontal slider
with non-numeric loading placeholders, blocks configuration until loading resolves,
and offers a localized retry for a catalog failure. Stale authorization responses
remain ignored and no fallback modules are admitted. Actual KPI cards, module cards,
sliders, colors and desktop composition retain their approved design.


### Persisted personal notification settings — 2026-10-18

Notification settings retain the existing cards, switches and shared Operational Workspace Modal.
The server returns allowed event keys and saved choices for the authenticated user/company;
the browser has no localStorage authority for preferences. Inventory stock and purchase switches
appear in their owner's group. Loading failures do not create enabled defaults; a localized retry
is available. Each switch saves with the confirmed version, shows saving/confirmed/error state,
and blocks overlapping edits. An uncertain save retains the intended choice and exact retry;
reloading fetches server authority. Conflicts require reloading rather than overwriting another
window. Acknowledged changes refresh the inbox and bell count. User/company remount boundaries
discard late requests. Quiet mode explains its actual informational-only filtering. This changes
neither source workflows nor the dashboard's sliders, card layouts or navigation design.


The approved [basic notification catalogue](basic-module-notifications-contract-v1.md) extends
the same settings and notice components with actual owner event keys for the operational basic
modules. New groups are Funds, Receivables and KPIs; HR permission, task/process, cash-closing and
Sales call switches use the existing per-user/company save flow. Each unavailable setting is
filtered by the server, and new Spanish copy states the next action plainly. Existing cards,
sliders, colors, modal shell and touch targets retain their design. Inert expense-submission and
sales-order/invoice switches are no longer offered; collections use Receivables authority.


### Account preferences and menu clarity (2026-10-18)

- Preferred display currency and informational/manual reference rates use the existing private
  workspace-state owner: `moduleKey=system`, `tabKey=business-currency`. They are stored together
  after server acknowledgement, scoped to the authenticated user and company, with no expiry.
- Old global browser currency/rate keys cannot establish ownership and must not seed another
  account. A missing account preference starts with MXN and the existing daily reference; loading
  failures or unsupported remote data block writes and expose retry, without overwriting defaults.
- The expected `X-Workspace-Actor` is a race guard, never authority; the server derives user/company
  from its authenticated session and rejects mismatches. Daily refresh is staged until Save;
  automatic daily reference updates never replace a manual selection or a newer explicit save.
- `Company settings` / `Configuración de empresa` points to the existing business structure tab.
  Account menu destinations honor the existing role, module and tab permissions. Personal currency
  and navigation preferences remain personal, and do not grant company configuration rights.
- `Personalize navigation` / `Personalizar navegación` retains top/left previews, mobile horizontal
  navigation, dual-screen rules and the existing modal engine.
- Learning settings show dependent journey controls off and disabled while guidance is off, without
  deleting the saved journey choice. The six-stage position is labelled Current stage, not completed
  work. Saving, cancellation and private learning progress keep their existing contracts.
- The blue modal design, emojis, sliders and shared mobile footer/body scrolling are preserved.


### Durable navigation and adaptive dual workspace (2026-10-18)

- `system/workbar-layout` is a non-expiring explicit preference for the authenticated user and
  company. Apply saves top/left and dual-screen choice together and only updates the shell after
  server acknowledgement. Cancel discards the modal draft. Load/save errors are visible and retryable.
- The expected `X-Workspace-Actor` prevents pending requests crossing a session switch. It never
  selects authority. User/company still come from the server session; mutations require CSRF.
- Confirmed server state takes precedence over local timestamps. A valid legacy value, either the
  old unversioned server record or a cache for this exact user/company, is migrated once. Unscoped
  browser values are ignored. Failed reads and unsupported data cannot overwrite account defaults.
- The scoped cache may keep the bar presentation available offline; Apply and opening a secondary
  workspace wait for a successful account load. The frame never reads/writes the parent's preference.
- Dual screen starts at 1280 px. A fresh small-screen session never preloads it. Once opened, a
  temporary resize pauses and hides the existing frame without deleting its route or unfinished
  input. Returning to desktop restores it. This does not change the user's saved top/left choice.
- Disabling dual screen from its visible Close button waits for a durable acknowledgement. The
  modal retains the existing enable-only rule. On mobile, a saved desktop choice is labelled as saved
  for a larger window rather than active. Closing restores the saved bar position.
- User/company changes, closing, and collection/subscription/billing restrictions destroy the old
  frame. Each new frame starts at the fixed same-origin Dashboard route, with its own history and
  scrolling. It never renders a recursive dual workspace or a second global product header.
- Secondary loading failures provide Reload and keep Close accessible. The existing blue modal,
  preview cards, emojis and horizontal sliders remain unchanged.


Legacy workbar records also expose the optional `expiresAt` workspace response metadata. An old
navigation expiry, including an elapsed one, does not erase an explicit user/company preference:
the owner returns only that actor's record and the client confirms it once with non-expiring
retention. Other workspace expiry rules remain unchanged.


### Confirmed personal-profile editing (2026-10-19)

Mi perfil keeps the existing blue title, identity/contact cards, security disclosure and module sliders.
The personal identity remains user-owned across company memberships. Residence and each phone's
country are separate choices; editing residence never rewrites existing international numbers.
The global header retains ownership of the visible language selector. Profile saves use the current
UI language and never restore an older stored language over a newer header choice.
The sign-in email remains read-only and is labelled accordingly.

- The existing Config Center owner API loads and saves names, residence, language, photo metadata
  and up to ten normalized phones. The first non-empty phone remains the legacy primary projection.
  Explicit removal is durable; optional dial-code-only placeholders are not sent as contacts.
- Account/company changes remount the form. Reads, writes and photo processing ignore late results
  from a former scope. `X-Profile-Actor` binds each browser request to its expected account; it never
  selects authority. Header updates accept only the current user's acknowledged profile.
- A synchronous pending latch blocks duplicate saves. Fields and discard are disabled during a save
  or upload. Load failures expose Retry; save failures retain the draft. No raw infrastructure error
  is shown. Field feedback identifies and focuses the invalid name, phone or password, revealing the
  security disclosure when needed. Password values are not trimmed or written to browser storage.
- Photo upload success creates a staged preview; Save links it to the profile. Failed replacement
  uploads preserve an earlier staged photo, and Discard restores the confirmed photo. Stale uploads
  cannot publish into another account. Missing images fall back to initials.
- On phones, the same Save/Discard controls and confirmed result appear at the bottom of the form;
  desktop keeps its existing title actions. Controls retain 44px targets and 16px field text on phones.
  Long email addresses wrap. Browser refresh/close warns about unfinished edits.
- Flow tests exercise the real Header/Profile components in Chromium and WebKit, mobile, landscape,
  desktop, dark mode, all eight UI locales, storage failures, account changes, and persistence retries.


### Company settings editing and confirmed saves (2026-10-19)

The existing `home-panel/business-structure` screen preserves its operation-type, identity,
corporate-office and units layout. Both company and structure reads must succeed before editing;
a failed or incomplete load exposes retry and cannot seed a writable empty form. Editing honors
the existing account-tab permission and the server's corporate-scope `can_edit` capability.

The existing debounced auto-save submits identity and organization together to the structure
owner. Only an acknowledged receipt establishes the baseline and updates company branding.
Typing during a pending save survives; failures retain the draft, show localized errors and allow
retry/discard. Unit/business edits preserve their database identifiers, including automatic unit
headquarters when their unit is renamed. Modals show their own errors and block cancellation
while saving. Logos validate their format, readability and 1 MB limit before replacing a preview.
Coordinate lookups cannot overwrite newer input or another account's screen. Mobile controls use
readable input sizes and touch targets, with the shared modal's scrolling body and visible footer.


### Confirmed user administration and invitations (2026-10-19)

Users preserves its existing cards, blue wizard, module/tab picker, kiosk picker and shared
scrolling modal. The initial users/catalog and current-profile reads must succeed before editing;
a failed load exposes Retry. Administrative actions rely on server capabilities and never infer
grants from missing metadata. User/company or authorization changes remount this editor; stale
responses cannot publish into another account. `X-Users-Actor` binds requests to the expected
session actor without selecting authority.

Role, organization, modules, tabs and exact kiosk assignments save together. Explicit null scope
clears the former business/unit. Existing Root and grandfathered module/tab grants are preserved
when unchanged. A synchronous pending latch blocks repeated submissions and closing during a
mutation. Errors remain inside the active modal with the draft; raw provider/database messages
are replaced with localized feedback. Name/email limits match their existing database columns.

A confirmed invitation link remains visible even if email delivery is unavailable or the later
list refresh fails. An uncertain acknowledgement requires refreshing before repeating creation;
a matching pending invitation opens the resend action without sending automatically. Committed
mutations and refresh failures have separate feedback. Deactivation/cancellation close only after
acknowledgement. Phones retain readable fields, touch targets and visible modal actions.

The public invitation page accepts only pending links. Cancelled/unknown links expose no password
form. Existing accounts use their exact current password; new accounts use the existing minimum
length. Submission locks fields, blocks duplicates and ignores late results after a token change.
No new navigation, modal engine, entitlement or invitation-delivery channel is introduced.


### Invitation acceptance to authenticated workspace (2026-10-19)

The existing `/invite/:token` page distinguishes an unavailable link from a temporary loading
failure; temporary failures expose Reload. Password fields show readable, associated validation
after blur, retain exact characters and reject oversized new passwords before submission. Unknown
errors use safe localized copy. An uncertain acknowledgement checks the token status without
automatically accepting again; a consumed link offers sign-in.

On the explicit sign-in action after acceptance, confirm logout before navigating so a pre-existing
account cannot redirect the invitee into another company/account. A failed logout stays on the
confirmation and allows retry. The existing Login page receives company/email through navigation
state, never a URL query; no password or invitation token is carried to sign-in. Password entry,
MFA policy, company authentication and backend-derived module/tab/scope grants remain unchanged.
The existing public layout, modal design, brand and sliders remain in place.


### Password recovery through confirmed sign-in (2026-10-19)

The existing Login recovery action uses the shared dialog primitive while preserving its brand
header and form. It has labelled inputs, focus containment, safe localized generic request feedback
and a synchronous submission latch. Pending requests disable edit/close; a confirmed request is
not submitted again until the email changes or the user deliberately opens a new request. The
body scrolls, actions remain available, and short keyboard viewports compact the heading.

The existing `/reset-password/:token` page retains its blue/white layout and uses all eight UI
locales. Validity must explicitly be true; a network failure offers retry instead of claiming the
link is invalid. New-password validation preserves exact characters, enforces minimum length and
BCrypt capacity, and presents associated field errors. Saving locks the form and cannot double
submit. Token changes remount the editor; late results cannot publish into another link.

Only an acknowledged success shows completion. A lost acknowledgement checks link usability:
a still-valid link permits retry; an unavailable/uncheckable link shows uncertainty and offers
sign-in or a new request without claiming the password changed. The explicit sign-in action first
ends any prior session; failure remains visible and retryable. An invalid link can open the existing
Login recovery dialog directly. No password or reset token is transferred to login or browser storage.


### Login and verification-code interaction (2026-10-19)

Keep the public login card, brand panels, site header/footer and existing password/reset contract.
The existing OTP step uses the selected language for all guidance and errors, one numeric text
input with `one-time-code` autocomplete, six-digit paste normalization, and touch targets of at
least 44 px. Focus moves to the verification heading without opening the mobile keyboard.

Login, verify and resend share a synchronous pending latch. Pending controls and account changes
are disabled; results after leaving the page do not navigate or replace its state. Deadlines use
elapsed time and refresh on focus/visibility, including after backgrounding a mobile browser.
Expired or unavailable challenges offer the existing return-to-login path. Wrong-code, expired,
locked, delivery-failed and uncertain-response feedback stays localized and excludes provider
messages. A cooldown acknowledgement preserves the entered code and never claims a new send.
An uncertain sign-in offers a full reload through the existing authenticated-session loader; it
does not assume that a timed-out verification succeeded or automatically reuse a consumed code.

Authentication destinations must be internal absolute paths without a leading double slash,
backslash or control/space character. Valid OAuth authorization continuations remain supported.
The adapter retains typed API errors. No new session, permission or browser-storage mechanism is
introduced. `test:login-verification-browser` exercises real LoginPage/auth adapter rendering with
synthetic HTTP responses, mobile/landscape sizes, the eight supported locales, resend outcomes,
single submission, lost acknowledgement and OAuth continuation.


### Sales Funneling creative canvas extension — 2026-10-19

The product owner authorized a freeform private idea board within Funneling **My ideas**. This
bounded extension uses native DOM/SVG pointer controls for notes, photos, shapes and arrows;
it does not replace the native Sales shell, view pills, table, campaign cards or shared modal
engine. Text/caption editors and conflict review use `SalesModalFrame`. Compact viewport bodies
scroll while shared footer actions remain visible, including landscape. Board content belongs to
the authenticated user/company, with visible autosave/retry/conflict handling. Local pan/zoom,
expanded view, keyboard controls and undo are scoped to this surface. The domain/API, retention
limits, acceptance evidence and rollback are owned by `docs/sales-funneling-contract-v1.md`.


### Funneling content generation entry — 2026-10-19

The user-authorized Content generation view exposes the existing campaign-owned content guide and
prompt tools directly within the native coral view selector. Reuse those guide/export components,
the campaign Save API and shared confirmation modal; do not fork the content engine, prompt rules,
modal system or campaign ownership. Guide/response choices save with the selected campaign using
its expected version; private-board content remains separate. Dirty navigation protection applies
to the view's native controls. Two-column/stacked presentation, bounded prompt scrolling and
44px wrapping save/export controls follow the existing Sales vocabulary. Behavior/acceptance and
limitations are recorded in `docs/sales-funneling-contract-v1.md`.

### Funneling content calendar — 2026-10-19

The product owner approved **Content calendar** as a fifth Funneling view. It is a campaign-owned
editorial planner, with month/week/agenda presentation and a compact agenda fallback. The existing
Sales title, filters, coral view navigation and modal engine remain authoritative. A piece uses a
Standard Form Modal; **Suggested content** uses an Operational Workspace Modal because channel,
format and cadence choices are reviewed beside a selectable proposal. Unsaved dismissal replaces
the editor with a Confirmation Modal. Shared calendar preferences, localized 44px controls,
light/dark surfaces and restrained format colors follow the existing Sales vocabulary.

Calendar drafts have their own tenant-scoped, versioned API so saving a calendar cannot overwrite
the campaign brief, content guide or private idea board. Suggestions are editable rules-based
proposals and require explicit addition and saving. Scheduled/ready/published are planning and
manual-reference states; no social publishing, ad spending or operational sales KPIs are implied.
Existing prompt copy/download/print tools can include the same calendar draft as reference.
Domain validation, ownership, history retention and acceptance belong to
`docs/sales-funneling-contract-v1.md`.


The Funneling creative canvas extension includes its own lower-right DOM/SVG minimap, with a
current-view rectangle and scoped pointer/touch/keyboard camera navigation. It remains a Sales
surface, not a global navigation engine. Camera-only conflicts may recover conservatively against
known identical idea content; real content conflicts still retain the local draft and require
explicit recovery. The owner contract records the comparison rules and action/mobile evidence.


### Complementary personal ideas board — 2026-10-20

The approved [personal ideas board contract](personal-ideas-board-contract-v1.md) exposes the
existing creative canvas as an independently authorized complementary pilot. Technical canvas
reuse is bounded by fixed API ports and server-controlled owner scopes; Sales business ownership,
data, routes and existing permissions remain intact. The new owner has separate user/company
records, private photos, audit, entitlement and tab permission. No company or billing grants are
created by the registry migration.


### Personal diagnostic workspace and saved projects — 2026-10-20

The adopted extension in [personal ideas board contract](personal-ideas-board-contract-v1.md)
adds the clockwise four-area system map and immutable named snapshot consultation. Both remain
private to the authenticated user/company and use the existing personal workspace permission.
Technical canvas validation, save-queue comparisons and decorative minimap bounds are explicitly
exported without transferring Sales ownership or changing its routes, payloads or workflows.


### Personal canvas formatting exception — 2026-10-20

The [personal ideas board contract](personal-ideas-board-contract-v1.md) authorizes seven bounded
local font stacks, 8–96 px sizes and optional bold/italic/underline only for user-authored personal
canvas content. UI chrome retains canonical typography. Native per-element color pickers and
independent-axis resizing extend Mi pizarra and Tablero Índice, including images and saved-project
consultation. Existing modal frames, 44 px targets, inner mobile scrolling, history and autosave
conflict protection remain authoritative. The original Sales canvas controls stay unchanged.

### Pizarra personal: paridad de herramientas (2026-10-20)
Mi pizarra y Tablero Índice usan el mismo IdeasBoard y la misma paleta de símbolos, edición directa, fotos, figuras, conexiones, tamaño, historial, zoom y guardado. SystemBoard solo configura el lienzo dividido en cuatro áreas y su navegación; no mantiene una segunda barra ni otro editor. Los datos anteriores se presentan sin reescribirlos. Los proyectos siguen siendo consultas inmutables. Las opciones del módulo complementario son opt-in y no alteran el tablero de Ventas.

### Archivos en los pizarrones personales (2026-10-20)
Ambos editores personales muestran Nuevo, Abrir, Guardar proyecto y Pantalla completa con texto y controles táctiles. El módulo complementario posee el selector/archivo de proyectos; el editor compartido solo exporta captura y reemplazo protegido del contenido. Abrir crea una copia editable de una versión del mismo tipo, preservando la consulta inmutable de Mis proyectos. Nuevo y Abrir protegen trabajo no archivado mediante un guardado con nombre antes de sustituirlo. Se conservan historial, CAS, privacidad y contenido en fallos/cancelación. Pantalla completa usa la API nativa y ampliación del lienzo como alternativa; los diálogos conservan el portal del elemento en pantalla completa y sus acciones visibles en celular. El tablero predeterminado de Ventas no se habilita para estas acciones.

### Plumón e impresión en lienzos personales (2026-10-20)
El contrato personal autoriza DRAWING como elemento seleccionable, editable y persistente en ambos editores, con puntos tipados normalizados y gesto táctil cancelable. Se reutilizan historia, resize, selección, minimapa, guardado y consulta. El color se actualiza con entrada continua. La impresión exporta todo el contenido como una instantánea DOM/SVG aislada mediante documentHtmlPrintEngine, A4 horizontal y Guardar PDF del navegador. El layout dividido aporta regiones y presentación de símbolos anteriores; no posee otro editor. Los controles nuevos son opt-in del módulo complementario y no cambian Ventas. Véase personal-ideas-board-contract-v1.md para límites y verificación.

### Jerarquía creativa y accesos de diagnóstico (2026-10-20)
El contrato personal de pizarrones adopta el orden Mi pizarra, Tablero Índice, Mis proyectos. Tablero Índice retira Abrir por decisión expresa del usuario; Mi pizarra conserva la apertura protegida. La acción principal Guardar proyecto, utilidades compactas y grupos de herramientas reducen saturación mediante espacios y contornos, sin tipografía pesada. El editor común recibe exclusivamente puertos de presentación/creación/campos del dueño; Personas, Procesos, Productos y Finanzas se crean y editan con el mismo historial, formato, fotos privadas y guardado. Los modales personales usan el motor azul de Índice con nombre/ejemplo/icono y formato progresivo; en móvil se conserva desplazamiento local y superficie útil. La hoja de presentación se importa al final desde el dueño complementario y se limita a su opt-in. No se cambia el tablero de Ventas ni los permisos o documentos. Véase personal-ideas-board-contract-v1.md.

### Edición creativa directa de pizarrones personales (2026-10-20)
El contrato personal adopta Post-it, Texto sobre el lienzo sin modal, siete geometrías agrupadas con creación por arrastre y multimedia privada reproducible. Figuras/post-it usan Standard Form Modal; Texto es una excepción explícita del constructor con confirmación en blur/Listo y cancelación con Escape. Se preservan el editor común, formato, historial, límites, guardado, selección, accesibilidad y herramientas idénticas en ambos tableros. La interfaz de Ventas permanece sin habilitar estas interacciones. El tablero de diagnóstico reduce el indicador central y subdivide visualmente PRODUCT en canales arriba y productos/servicios abajo, con iconos y colocación manual explícita. La consulta y PDF reutilizan la presentación; video/audio se imprimen como tarjetas estáticas. Véase personal-ideas-board-contract-v1.md.


### Catálogos gráficos y detalle de procesos del tablero personal — 2026-10-20
La extensión complementaria añade cinco accesos de diagnóstico sobre cuatro regiones. Catálogos categorizados y buscables conservan el Standard Form Modal: proceso con pasos opcionales numerados/reordenables; Producto/Servicio independiente del giro; Canales de venta explícito; Finanzas con el inventario de reportes existentes. Los accesos mantienen desplazamiento horizontal en celular. Los pasos se consultan también en proyectos inmutables y se imprimen en anexos legibles. Los puertos opcionales editor.isValid, renderNode(node,onEdit) y printDetails son presentación técnica; los catálogos y metadatos de diagnóstico permanecen en el propietario complementario. Ventas conserva el comportamiento predeterminado. Contrato: `docs/personal-ideas-board-contract-v1.md`.


### Flechas personales continuas y bidireccionales — 2026-10-20
Los dos lienzos complementarios comparten un menú nativo Conectar con Flecha sencilla y Flecha doble, objetivos táctiles de 48 px e instrucciones localizadas. El modo permanece activo y encadena el último destino como origen hasta cambiar de herramienta. Su selección de tipo conserva la cadena. Conexiones existentes pueden cambiar de sentido en el Standard Form Modal. El editor, visor de proyectos e impresión muestran ambas puntas. Funneling no activa esta interacción. La representación opcional direction, comparación CAS, compatibilidad y aceptación pertenecen a `docs/personal-ideas-board-contract-v1.md`.


### Captura en vivo y margen exterior de Tablero Índice — 2026-10-20
El contrato personal autoriza una superficie más alta/ancha y un Standard Form Modal de hasta 1088 px solo en los editores personales. La captura de diagnóstico admite hasta tres nombres visibles con detalle independiente; confirma una única edición completa y valida todos los nombres/pasos antes de guardar. Los puertos opcionales batchLimit/nameManaged no afectan Ventas. El layout personal aporta límites por elemento y un margen exterior para post-its libres; conserva las coordenadas de los cuatro cuadros, minimapa/consulta/impresión y herramientas comunes. Móvil mantiene slider local, campos completos y pie de acciones visible. La decisión y sus límites están en `docs/personal-ideas-board-contract-v1.md`.


### Texto libre sin caja en los pizarrones personales — 2026-10-20
Por decisión expresa del usuario, el editor directo de Texto personal muestra únicamente letras y caret sobre el lienzo, sin fondo/borde/outline. Un espejo DOM mide el contenido con su tipografía real y ajusta la caja dentro de límites vigentes; confirmar cierra la selección. La edición, consulta de proyectos e impresión comparten alineación superior sin padding de tarjeta. Conserva foco accesible, Listo/Cancelar, IME, Escape, Cmd/Ctrl+Enter, historial y guardado. Post-its, diagnóstico y Funneling conservan su interacción. La excepción del constructor y su verificación se documentan en `docs/personal-ideas-board-contract-v1.md`.


### Composición del módulo creativo personal — 2026-10-20
Por decisión expresa del usuario, Mi pizarra, Tablero Índice y Mis proyectos adoptan IndiceTitleBar. El editor personal ubica Herramientas en la posición de los filtros y Construye tu tablero en la de los KPIs cuando aplica; no inventa filtros/indicadores. Acciones del proyecto permanecen en el título (primaria Guardar y hasta dos secundarias), mientras PDF/pantalla completa viven como utilidades de herramientas. Los controles creativos usan la familia original de emojis y SVG local decorativo a color; esta excepción sustituye la preferencia por Lucide solo en el módulo personal. Preserva textos accesibles, sliders, foco, permisos, gestos y herramientas idénticas. Ventas no activa la composición. Contrato y aceptación: `docs/personal-ideas-board-contract-v1.md`.


### Cabecera persistente del módulo creativo personal — 2026-10-20
Mi pizarra y Tablero Índice refuerzan su única IndiceTitleBar coral y mantienen título/Guardar proyecto visibles dentro del contenedor de desplazamiento del módulo, también en pantalla completa. La cabecera compacta agrupa acciones secundarias en el dropdown nativo Más opciones sin duplicar controles de archivo; conserva los manejadores, permisos, estados de error/conflicto y confirmaciones. En móvil arranca compacta, mide su altura real, preserva objetivos táctiles de 44 px y sliders locales. Herramientas y Construye tu tablero reducen espacio sin retirar funciones. Excepción de presentación solicitada por el usuario, limitada al owner personal; Funneling no cambia. BoardFileContext.compact es opcional y no cambia contratos HTTP. Detalle, aceptación y rollback: `docs/personal-ideas-board-contract-v1.md`.


### Herramientas persistentes del pizarrón personal — 2026-10-20
La aclaración del usuario extiende el bloque fijo a las herramientas y a Construye tu tablero, además de título/Guardar proyecto, en ambos lienzos personales. Se reutilizan las mismas instancias y acciones; la presentación compacta conserva sliders, foco, nombres accesibles y objetivos táctiles. La compensación de altura vive fuera del bloque sticky para mantenerlo visible incluso al final del contenedor. Móvil y pantallas bajas arrancan compactos; pantalla completa reserva superficie útil. Es presentación opt-in del módulo personal: no cambia Funneling ni los contratos HTTP, guardado o permisos. Aceptación y rollback en `docs/personal-ideas-board-contract-v1.md`.


### Gestión privada y compartida de proyectos de pizarrón — 2026-10-20
El usuario autoriza administración de versiones y colaboración limitada a consulta/copia. La biblioteca personal mantiene tarjetas e incorpora menú por proyecto, scopes propios/recibidos/papelera, nombre, copia, enlace y selección explícita de personas. Usa IndiceModalFrame, dropdown y controles existentes, con traducciones, 44 px, scroll local y sliders móviles. Los permisos de UI proceden del resumen del servidor; no reemplazan su autorización. El enlace identifica propietario y proyecto sin dar acceso. Usar en mi pizarrón reutiliza el reemplazo protegido de BoardFileControls y no modifica el snapshot original ni introduce otro editor. Los archivos de consulta usan URL privada del proyecto; el archivo independiente creado pertenece al receptor. API, aceptación y límites en `docs/personal-ideas-board-contract-v1.md`.


Agenda uses the approved employee/Inventory integration, guided publication and inline Sales client capture described in `docs/scheduling-module-contract-v1.md` (2026-10-21). Native modal controls, eight locales, phone footer/body containment and the calendar/table sliders remain the presentation contract.


### Control de juntas: live execution owner extension — 2026-10-21

Control de juntas retains native blue title/filter surfaces, sliders, tab access, calendar/table
and shared modal engine. Its detail workspace adds actual attendance and a meeting-context
agreement preview, with responsive columns on desktop and vertical cards on phones. Attendance
starts unmarked, saves explicitly and has a discard guard; reading invitations never marks
attendance. Planning defaults the minutes writer to coordinator and exposes a separate writer
only when requested. Available-time suggestions are explicit actions and stale results disappear
when people/time/authorization change. Agreement creation inside a meeting fixes that meeting,
uses action/assignee/date and configurable internal follow-up, then returns to its origin.
Concluding shows decisions, attendance and authorized agreement status; open agreements remain
open. Headers and footer actions fit 390px and short 640px viewports with internal body scroll.
The new copy covers en-CA/en-US/es-MX/es-CO/fr-CA/pt-BR/ko-CA/zh-CA. These owner extensions add no
new visual engine, implicit access, external invitation or automatic task completion. Full domain
and API details remain in `meeting-control-module-contract-v1.md`.


### Agenda y reservas: daily agenda alignment — 2026-10-22
The approved Meeting control calendar arrangement is repeated in Agenda using its native coral
identity: grouped period controls, compact shared calendar, responsive daily panel, informative
empty/filter states and date-prefilled private capture. Agenda del día includes both reservations
and events with chronological order and explicit loaded subtotals. Existing scope, truncation,
slot/consent/review workflow and public appearance remain owned by Scheduling. This introduces no
new visual engine, access grant or automatic reservation. Details: `scheduling-module-contract-v1.md`.


### Control de juntas: selected-day planning — 2026-10-22
The approved selected-day refinement retains shared blue title/filters and calendar/table sliders.
The calendar header groups period navigation. The subsequent user refinement removes the persistent
selected-day panel: the calendar uses the available width and date/overflow selection opens the native
blue Standard Form Modal with a chronological daily agenda. One coherent consultation list needs no
parallel workspace. Its header/footer remain visible with local body scrolling on phones; the parent
replaces this frame with detail/planning and returns to the day when closed, never stacking dialogs.
Empty filtered days distinguish missing matches from an unfiltered empty day and expose contextual
recovery. Loading, retry, truncation and timezone stay explicit. Schedule meeting opens
the existing planning modal with the selected date; save, availability, permissions and lifecycle
remain with the owner. Day mode reuses the single-day calendar and the same consultation modal.
Calendar compact density is opt-in; other
consumers retain their default. Scope and timing: `meeting-control-module-contract-v1.md`.


### Weighted meeting decisions — 2026-10-21
The native blue meeting detail adds Decisiones y votaciones, a two-step wizard (proposal/functions/
team/rules → review/open), and one-frame vote/close workspace. Function points are explicit,
initial assignments are equal, and reuse from the same meeting requires review. Personal radio
choices save explicitly; discard protection retains edits, and stale counts require refresh.
Weighted yes/no/abstention cards show participation and fixed approval/quorum points. Closed
results stay in minutes/print; approved proposals can explicitly prefill an existing agreement
editor with assignee/date/save. Eight locales, permission-driven actions, 44px controls, local
sliders and small-phone pinned footers reuse the current engine. No new tab or automatic action
is introduced. Domain/API/integrity details: `docs/meeting-control-module-contract-v1.md`.


### Control de juntas: guided creation — 2026-10-22
New Single meeting and Flow/series creation use the approved Modal Wizard Índice with Purpose,
Team, Date and agenda, and Review. This user decision replaces the long single-form creation
exception. Each step has one objective; Back retains the draft, and final native preview precedes
explicit scheduling. Blue shared frame/compact stepper/validation/summary/pinned footer remain the
visual engine. Mobile keeps the step name and progression visible with local body scrolling.
Editing, recurrence rules, native authorization and API contracts remain owned by Meetings.
Details: `meeting-control-module-contract-v1.md`.


### Native meeting room workspace — 2026-10-22

Control de juntas adds the user-requested Sala de junta tab, scoped to the existing meetings
permission. Its native blue title and explicit Save minutes stay visible during room scrolling.
Native section navigation organizes agenda, inline minutes/decisions, actual attendance, authorized
agreements and existing weighted voting. The writing area and agenda align on desktop and stack
through local section navigation on phones. No second modal/navigation/data engine is introduced.
Native router blocking and the existing Confirmation Modal protect unsaved minutes/attendance;
requests and native editors block navigation until complete. Failed or stale writes preserve the
draft, with explicit copy/reload instead of silent overwrite. The domain contract documents this
derivative tab and preserved lifecycle, object authorization and eight-locale behavior.


### Personal ideas board and project-library adoption — 2026-10-22

The user-approved personal owner contract extends the existing five construction catalogs to Mi
pizarra through the shared canvas editor and owner layout adapter. The free canvas retains its
geometry; Diagnóstico empresarial is the display name for the existing SYSTEM tab and route.
Mis proyectos adopts the shared title, filters, view states and pagination while retaining the
approved immutable-project cards and lifecycle. Server filters precede counts/pagination; native
workspace memory remains scoped by user/company. No second editor, modal, table or state engine
is introduced. Default Sales canvas behavior remains unchanged. Details and regression evidence:
`personal-ideas-board-contract-v1.md`, decision 2026-10-22.


### Meeting commitment execution refinement — 2026-10-23

Control de juntas detail is a compact Operational Workspace Modal using the shared blue frame,
neutral body and native footer. Show preparation/agenda/participants before agreements/results.
Use one footer primary (Open meeting / Continue meeting / View minutes); keep planning, print and
calendar in More options and cancellation separate. Meeting execution remains in the approved native
room route, preserving inline minute drafts, attendance guards, weighted voting and independent tabs.
The room uses preparation, topics/notes, participants and agreements/results language. Delegation and
agreement fulfilment are Standard Form Modals replacing the detail, with explicit saves and no stacked
overlay. Creating a task reviews assignee and date; changes require a reason. Show the linked native
agenda action, immutable original date, deadline/reassignment history and confirmed result.

The approved meeting punctuality score is authoritative backend data from the Meetings owner;
render its denominator, timezone, future/cancelled/unverifiable counts and Pending evaluation state.
Never compute a different percentage in React or equate task completion with agreement fulfilment.
Contract: `docs/meeting-control-module-contract-v1.md`, Agreement delegation and punctuality.

## Sales Conversations runtime extension (2026-10-22)

[sales-conversations-contract-v1.md](sales-conversations-contract-v1.md) governs `/sales/conversations`
and `/sales/whatsapp-settings` under active `react/src/app`. Native shell/title/filter/view states and
modal engine apply; the lazy inbox bypasses the unrelated CRM collection preload. New scope tabs and
explicit channel grants are required; a frontend flag grants no authority. Keep customer replies,
internal notes and external evidence visually distinct. Real onboarding remains unavailable.

### Company files system tool — 2026-10-23

The user approved an independent Files system tool (`/files`) for active internal company accounts,
without granting access to existing business modules. Reuse the native title, navigation, filters,
table/pagination and modal engines. Folder, upload, private preview, sharing and recoverable trash
flows follow `docs/company-file-library-contract-v1.md`; inherited grants are shown explicitly.

### Files adopts the canonical module shell — 2026-10-23

By explicit user request, the Files system tool adopts `IndiceModuleShell` with the institutional
blue identity, native Dashboard/favorites, remembered workbar position, mobile scope navigation and
original folder artwork. Its scope title, view selector, filters, table/pagination and modal frames
use the existing engines. `IndiceModuleTab.disabled` is optional for owner-controlled busy states;
it does not change permission filtering. The `/files?view=...&folder=...` contract, active internal
account access, private file ACLs and all backend behavior remain unchanged. Owner acceptance and
rollback: `company-file-library-contract-v1.md`, Índice module presentation.

### Sales flow administration and personal stage colors (2026-10-23)

The Opportunities flow catalogue uses a content-sized Sales Operational Workspace Modal. Stage
editing uses a stage list and focused detail panel, with a horizontal stage picker on phones.
Company configuration and personal colors have distinct native workspace views and explicit save
actions. The immutable factory view uses readable values and a create-copy action instead of a
full disabled form. The color palette offers large swatches, custom color and hex entry, a board
preview and restore-originals draft action. Personal decoration uses existing scoped workspace-state
persistence at `sales/opportunity-colors-{flowId}` and never changes shared stage tokens or filters.
Unknown colors are ignored, badge foregrounds preserve contrast, and labels remain visible alongside
color. Deletion replaces the frame with a two-step destination/mapping review; uncertain submissions
retain their command and cannot be edited or dismissed until their result can be checked safely.
