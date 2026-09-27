# Indice Printable Document Inventory

## Inventory status

Status: Source inventory reverified; safe print-contract corrections implemented; representative visual, legal, and physical-printer QA remains open

Last updated: 2026-09-17

Standard source: [Indice Document Print Standard — Draft](./INDICE_DOCUMENT_PRINT_STANDARD_DRAFT.md)

This inventory records every application-owned print or PDF generator found in the
frontend source. It distinguishes generated documents from uploaded PDFs, mock file
names, browser attachments, and backend files that the frontend only downloads.

Historical 2026-08-06 scope (not an assertion of today's reachable routes): 29 non-KPI document contracts, 8 KPI print areas on the
approved/excluded baseline, and 2 protected editorial reports (39 inventoried
artifacts or print areas in total).

The draft's section 0 is now adopted for active basic-module web printing; the rest remains a draft. A historical row marked
`Remastered` means that its code contract was migrated; it does not mean that legal,
fiscal, accessibility, or physical-printer approval has been granted.

## Active basic-module migration — 2026-09-17

Decision: quotation style + browser printing / Save as PDF; **IME unchanged**.
Same-day v0.3 correction: company-only documents, grayscale except the company logo;
portrait-first with measured table-width fallback to landscape; compact single-sheet
output when possible, whole paragraphs on the next sheet otherwise. Platform branding
is removed from owned footers, sources, fallback identity and retained quotation PDF metadata.
Functional QR/verification destinations and legally required data are not stripped.
IME remains excluded. Payroll and cut reports now use the common web output flow;
their document contents, finance calculations and access rules are unchanged.
This section supersedes the rendering/default-output classifications below, which
are retained as historical source inventory rather than proof of live routes.
No backend, API, permission, tax, payroll, accounting or lifecycle rules changed.

Paths below are relative to `react/src/app/BasicModules/` unless noted.

| Module / active documents | Current output / implementation evidence |
|---|---|
| RH: daily attendance | Existing web print, shared quotation theme through `HumanResources/Control/utils/timeTablePrintReport.ts` and `shared/print/documentHtmlPrintEngine.ts` |
| RH: payroll run and employee receipt | Existing browser portal; quotation typography/neutral panels in `HumanResources/Payroll/payrollPdf.css`; A4 landscape, line items and jurisdiction notices preserved |
| RH: administrative act, individual and selected batch | `HumanResources/Records/utils/records.pdf.ts`: escaped web definitions; selected batch opens one job with separate acts |
| RH: asset assignment and permission | `HumanResources/Assets/AssetDetailsModal.tsx`; `HumanResources/Permissions/utils/permissionPrintDocument.ts`: quotation web layout; signature fields preserved |
| RH: KPI report | `HumanResources/KPIs/utils/kpisPrintReport.ts`: existing content routed to shared web theme; remove fixed-height clipping |
| Processes/tasks: procedure, agenda task, project task | `ProcessesTasks/Processes/processPrintDocument.ts`; `ProcessesTasks/Agenda/utils/agendaTaskReportPdf.ts`; `ProcessesTasks/Projects/components/ProjectTasksWorkspace.tsx`: web documents |
| Processes/tasks: KPI report | Existing `shared/print/kpiHtmlPrintEngine.ts` adapter now uses shared web-print engine/theme |
| Sales: quotation and sale note | `Sales/Cotizacion/quotePdf.ts`; `Sales/Sales/utils/saleInvoicePdf.ts`: normal output is web; binary quotation file sharing remains |
| Sales: KPI report | Existing owner report via `shared/print/kpiHtmlPrintEngine.ts` |
| POS: sale ticket, paid-receipt ticket, shift-closing ticket | `PointOfSale/Sale/components/TicketModal.tsx`; `PointOfSale/shared/posOperationTickets.ts`: browser print, 80 mm; former ticket PDF placeholder now prints |
| POS: cut detail and cut-list report | `PointOfSale/Cortes/components/CorteDetailModal.tsx`; `PointOfSale/Cortes/utils/cortesPrintReport.ts`: web documents; existing scope and persisted amounts retained |
| POS: self-service/self-checkout QR posters | `PointOfSale/Kiosks/kioskQrPosterPdf.ts`: web poster with the actual QR, visible public URL and instructions; reserved window before async access lookup |
| POS: KPI report | Existing owner report via `shared/print/kpiHtmlPrintEngine.ts` |
| Inventory: movement act, purchase order and purchase receipt | `Sales/Inventory/components/movements/MovementPrintModal.tsx`; `PointOfSale/shared/pointOfSalePrintDocuments.ts`: shared browser output; inventory route ownership unchanged |
| Expenses: voucher and selected/filtered table | `Expenses/utils/expensePrintDocument.ts`; `Expenses/utils/expenseTablePrint.ts`: quotation web definitions; table preview and print share renderer, columns/scope/order/native totals retained |
| Expenses and petty cash: financial KPI reports | `Expenses/KPIs/financialOverviewPdf.ts`: web adapter, full owner-provided metrics/tables/alerts, no new financial calculations |
| Petty cash: fund account statement | `PettyCash/utils/pettyCashStatementPdf.ts`: same historical definition in sandboxed preview and browser output |
| Receivables: payment receipt, customer statement, aging, installment schedule and KPIs | `Receivables/utils/receivablesPrintDocuments.ts`: existing definitions now use quotation web engine |
| Central KPIs: FODA/BCG/health/profitability/inventory/connections/sources | `Kpis/components/AnalyticsDocumentPreviewModal.tsx` and `visualDocumentExport.ts`: explicit quotation-style opt-in; data exports remain unchanged |
| Central KPIs: accounting reports | `Kpis/InformesContables/InformesContables.tsx`: owner-produced tables/metrics/scope/readiness notices in shared web preview and print |
| IME: Dashboard diagnosis and KPI maturity overview/dimensions | **Preserved**, no changes to the protected document or stylesheet; analytics opt-in explicitly excludes `overview` and `sectors` |
| Production / materials | No active print output identified; none introduced |

Not part of the active migration: dormant Postventa generators, POS Clientes legacy
statement, old petty-cash vouchers, PPI/personal-performance legacy report, complementary
modules, uploaded attachments and external billing invoices. Existing generators may
remain on disk; their existence does not mean a reachable user workflow.

### Verification recorded for this change

The v0.3 follow-up uses `documentGrayscale.ts` and `documentPrintLayout.ts` in the
shared print folder, updates print-only payroll styles and active footer/source adapters,
and neutralizes only the document area of quotation, movement and specialized analytics
previews. No new application state, backend, API or data mutation was introduced.
New checks cover neutral color tokens, colored-logo exemption, measured orientation,
whole-paragraph CSS and removal of platform branding. Browser artifacts for this revision
are kept separately in `.run/print-review-monochrome-2026-09-17/`; prior counts below
describe the earlier coral version and are retained as historical evidence.

v0.3 verification: full frontend suite passed; the final focused RH/Sales/print rerun
passed 59/59, and TypeScript/build passed (only the existing bundle-size warning).
Chrome verified eight synthetic cases: portrait quotation/empty/CJK (one sheet),
125-row table (seven sheets, all rows retained), wide eight-column table (landscape),
letter with long paragraphs, 80 mm thermal, and borrowed application styles with charts.
Raster color checks, with LCD subpixel text disabled, found no colored pixels outside
the company logo; logo color was retained. Imported application print CSS did not hide
the document. Protected IME files still match the pre-change SHA-256 baseline.
Real-route, physical-printer and legal/fiscal certification remain pending.

- Local Chrome synthetic fixtures: quotation (1 page), long table (125 rows / 8 pages),
  landscape (40 rows / 4 pages), letter/signatures (2 pages), CJK (1 page), empty data
  (1 page), and 80 mm thermal output. DOM rows and horizontal overflow checked; PDFs
  generated without extra browser headers. This is renderer evidence, not production data QA.
- `react/tests/quotation-web-print.test.mjs`: escaping, image URL safety, long/empty/native-currency
  content, localization, blocked/reserved windows, readiness and IME exclusion.
- Passed: `npm.cmd run typecheck`, `npm.cmd run build`, and the frontend suite
  (`node --test --test-reporter=dot tests/*.test.mjs`). The focused print/operation/contract
  rerun passed 18/18, including the selected-HR-act regression. The build retains the
  existing non-blocking large-chunk warning. Initial stale print assertions and a
  missing import caught during verification were corrected before these successful runs.
- Protected IME source/CSS and compact maturity overview SHA-256 values match the
  pre-change baseline. Existing unrelated worktree changes were preserved; no commit,
  push, backend/data mutation or deployment was performed for this document task.
- Remaining: physical printer/paper verification, all real user routes and localized
  operational datasets, legal/fiscal approval and tagged-PDF accessibility. Existing
  report section counters are not guaranteed physical sheet counters after wrapping.

## Historical inventory and exclusions (before 2026-09-17)

### Expenses table print addition — 2026-09-10

`app/BasicModules/Expenses/utils/expenseTablePrint.ts`, presented by
`app/BasicModules/Expenses/components/modals/ExpenseTablePrintModal.tsx`, adds a **Tab Print**
with internal, confidential and multi-currency modifiers. Entry: Expenses header Actions → Print
selection. It follows quote preview interaction and uses `standardDocumentPdf` (jsPDF/AutoTable),
A4 portrait or landscape according to selected columns, 16 mm side margins and 24 mm footer reserve.
The eight default data columns fit one landscape table; wider selections use successive sections
with repeated folios when visible. Amounts align right; native-currency totals remain separate.
It retains active filters, current sort, selected IDs across pagination and visible data columns.
Original fund expenses appear once without doubling their group total. Output waits for company
identity; a missing identity remains blank. Company text is shown in the preview and PDF.
Shared optional table/header presentation props leave other document defaults unchanged.

Validation includes component interactions, three-row and 125-row generated PDF fixtures,
long concepts, native currency separation and rendered-page inspection. The accessible HTML preview
uses semantic tables. Generated PDFs inherit the shared engine's untagged output and Helvetica
glyph limits (CJK PDF font coverage is not certified). Browser and physical-printer checks remain
pending because no browser is connected in this session. This new inventory entry does not promote
the draft print standard or change protected quotation/BMI/PPI documents.

### Panel Inicial and protected editorial reports

| Module | Artifact | Generator source | Reason | Status |
|---|---|---|---|---|
| Dashboard / Business Profile | Business Maturity Index (BMI / IME) | `react/src/app/BasicModules/Dashboard/BusinessProfile/BusinessDiagnosisPdf/` | Protected editorial reference and explicitly excluded | Preserved |
| Dashboard / Personal Performance | Personal Performance Index (PPI / IRP) | `react/src/app/BasicModules/Dashboard/PersonalPerformance/PersonalPerformancePdf/` | Protected editorial reference and explicitly excluded | Preserved |

Other Panel Inicial screens do not own active print generators. Billing links that
download an existing invoice are external document retrieval, not a frontend print
template, and therefore are not remastered here.

### KPI tabs already on the approved baseline

| KPI area | Engine | Generator / action source | Status |
|---|---|---|---|
| Human Resources | Dedicated paginated HTML report | `react/src/app/BasicModules/HumanResources/KPIs/utils/kpisPrintReport.ts` | Excluded; approved baseline |
| Expenses | jsPDF + AutoTable financial overview | `react/src/app/BasicModules/Expenses/KPIs/financialOverviewPdf.ts` | Excluded; migrated |
| Processes / Tasks | Shared HTML KPI engine | `react/src/app/BasicModules/ProcessesTasks/KPIs/kpisPdf.ts` | Excluded; migrated |
| Sales | Shared HTML KPI engine | `react/src/app/BasicModules/Sales/KPIs/KPIs.tsx` | Excluded; migrated |
| Point of Sale | Shared HTML KPI engine | `react/src/app/BasicModules/PointOfSale/KPIs/KPIs.tsx` | Excluded; migrated |
| KPI / Accounting Reports | Shared HTML KPI engine | `react/src/app/BasicModules/Kpis/InformesContables/InformesContables.tsx` | Excluded; migrated |
| Petty Cash KPI | Shared HTML KPI engine | `react/src/app/BasicModules/PettyCash/KPIs/KPIs.tsx` | Excluded; migrated |
| Central KPI executive panel | Shared HTML KPI engine | `react/src/app/BasicModules/Kpis/KPIs/KPIs.tsx` | Excluded; migrated |

## Classification and priority legend

Priorities:

- P0: legal, fiscal, payroll, cash-control, or high-volume operational risk
- P1: customer-facing or decision-critical
- P2: internal operational output
- P3: legacy, low-use, or reachability not confirmed

Migration states:

- `Remastered`: shared contract applied in code; artifact-specific product gates remain in the inventory
- `Implemented`: new document and its owning UI action are present; artifact-specific product gates remain in the inventory
- `Corrected`: an audited standard violation was removed without changing source data or business logic
- `Protected`: explicitly preserved
- `External`: file is retrieved but not generated by this frontend
- `Legacy`: generator exists; product reachability still requires confirmation

## Active non-KPI print inventory

| # | Owner module | Printable artifact | Primary category | Modifiers | Engine / page contract | Priority | Migration state | Remaining limitation or gate |
|---:|---|---|---|---|---|---|---|---|
| 1A | Human Resources / Payroll | Payroll run report and employee ledger | Operational Report | confidential, internal, fiscal, multi-currency | React browser-print portal; A4 landscape; 10 mm safe margins; compact metadata, financial table, jurisdiction context, owned footer and page numbering; contract v1.0 | P0 | Remastered | Each run displays its stored country/jurisdiction, native currency, calculation mode, calculation cut-off, statutory references and exceptions. Backend cohort separation is preserved. Physical 100+ line verification, every-locale review, and jurisdiction-specific legal review remain gates |
| 1B | Human Resources / Payroll | Personal payroll calculation breakdown | Legal Document | confidential, employee-facing, fiscal | React browser-print portal; A4 landscape; 10 mm safe margins; recipient metadata, attendance strip, jurisdiction context, concept ledger, owned footer and page numbering; contract v1.0 | P0 | Remastered | This is explicitly a reference breakdown, not an official tax receipt. Company name/logo, employee code, organizational scope, native currency and stored rule/tax references are present. Employee fiscal identifiers, issuer legal/tax identity, authority folio, signature/certification and verification code are API data gaps; legal review and physical print QA remain gates |
| 2 | Human Resources / Records | Employee record / acknowledgement act | Legal Document | confidential, internal, signature-required | jsPDF; Letter portrait | P0 | Remastered | No immutable verification code; long narrative/signature visual QA pending |
| 3 | Human Resources / Assets | Asset assignment and custody act | Legal Document | internal, signature-required | jsPDF; Letter portrait | P1 | Remastered | Issuer legal identity is not exposed to the generator; long notes QA pending |
| 4 | Human Resources / Control | Daily timetable / attendance report | Operational Report | confidential, internal | HTML browser print; A4 landscape | P1 | Remastered | The selected business scope is now the text identity and the former Indice logo was removed; legal company/logo data is still not passed; browser pagination QA pending |
| 5 | Petty Cash | Statement / reconciliation document | Transaction Document | confidential, internal, multi-currency, approval-required | Shared standard jsPDF + AutoTable; A4 portrait | P0 | Remastered | Preview, download and print share one restrained, table-first definition with a single green accent. The fund business leads the document; physical signature/approval metadata is unavailable; all movements and historical assets print without silent truncation |
| 6 | Sales / Quotations | Customer quotation | Transaction Document | customer-facing, multi-currency | jsPDF + AutoTable; A4 portrait | P1 | Remastered | Issuer logo/legal identity is absent from the current context; commercial and tax review still required |
| 7 | Sales / Sales | Sale commercial summary | Transaction Document | customer-facing, multi-currency, fiscal candidate | jsPDF + AutoTable; A4 portrait | P0 | Remastered | Explicitly remains a commercial summary; presentation must not imply a legally fiscal invoice |
| 8 | Sales / Post-sale | Post-sale summary | Operational Report | customer-facing, internal | jsPDF + AutoTable; Letter portrait | P1 | Remastered | Locale is passed to the generator and the shared footer is now unit-safe for its point-based layout; company identity remains a data-contract gap |
| 9 | Processes / Tasks / Agenda | Task detail report | Operational Report | internal | jsPDF + AutoTable; A4 portrait | P2 | Remastered | Company/unit identity is not present in the task PDF contract |
| 10 | Processes / Tasks / Projects | Project task report | Operational Report | internal | jsPDF + AutoTable; A4 portrait | P2 | Remastered | Duplicated task payload remains owned by the project workspace; visual fixture pending |
| 11 | Point of Sale / Cuts | Filtered or selected cash-closing audit report | Operational Report | confidential, approval-required, multi-currency | HTML browser print; A4 portrait | P0 | Remastered | The decorative Indice issuer mark was removed and the approved attribution is used; issuer company data is still unavailable. API returns at most 200 rows and discloses partial results; multi-page browser footer remains best effort |
| 12 | Point of Sale / Cuts | Individual cash-closing detail | Transaction Document | confidential, approval-required | Scoped HTML browser print; A4 portrait | P0 | Remastered | Uses the approved attribution, localized updated timestamp, and visible blocked-popup feedback; Download-PDF remains a declared product gap |
| 13 | Point of Sale / Sale | POS sales ticket | Thermal Document | customer-facing, thermal | Scoped HTML browser print; 80 mm | P0 | Corrected | Invented RFC/address/phone and fixed MXN/16% labels were removed. Company, business, unit, register, cashier, and native currency now come from the live shift; legal address/tax identity are not exposed; PDF/email, 58 mm, and physical-printer QA remain open |
| 14 | Point of Sale / Customers | Customer account statement | Transaction Document | customer-facing, confidential | jsPDF + AutoTable; A4 portrait | P1 | Remastered | Uses current customer/transaction contract; client issuer identity and statement period selection are missing |
| 15 | Sales / Inventory | Inventory movement document / adjustment or transfer act | Transaction Document | internal, signature-required for control acts | Scoped HTML browser print; A4 portrait | P2 | Remastered / expanded | Adjustment and transfer variants include control notice, signatures, approved attribution, localized timestamp, and blocked-popup feedback; fixture with many lines and attachments pending |
| 16 | Work Climate / Agenda | Task timeline, history, and attachments report | Operational Report | internal | jsPDF + AutoTable; A4 portrait | P2 | Remastered | Complementary module uses local data; backend provenance metadata is unavailable |
| 17 | Legacy HR component | Payroll export | Legal Document | confidential, internal, legacy | jsPDF + AutoTable; Letter landscape | P3 | Legacy / remastered | Reachability and duplication with the active Payroll module must be confirmed before removal or approval |
| 18 | Receivables / Payments | Payment receipt | Transaction Document | confidential, customer-facing | Shared standard jsPDF; Letter portrait | P1 | Implemented | Operational receipt only; does not claim fiscal or bank-issued proof. Missing issuer data is left explicit instead of being replaced with Indice |
| 19 | Receivables / Credit customers | Customer credit statement | Transaction Document | confidential, customer-facing, multi-currency | Shared standard jsPDF; Letter portrait | P1 | Implemented | Issuer legal identity is limited to business/unit data; missing identity is not invented; amounts remain in native currencies |
| 20 | Receivables / Accounts receivable | Filter-aware accounts receivable aging | Operational Report | confidential, internal, multi-currency | Shared standard jsPDF + AutoTable; A4 landscape | P1 | Implemented | Filters are preserved; mixed currencies are displayed separately and never silently totaled; issuer company identity is a recorded data gap instead of an Indice fallback |
| 21 | Expenses / Expenses | Expense voucher | Transaction Document | approval-required, confidential, internal, multi-currency | Shared standard jsPDF; Letter portrait | P1 | Implemented | Internal operational voucher; missing business identity is no longer replaced with Indice; fiscal invoice and bank proof remain external records |
| 22 | Point of Sale / Purchase orders | Purchase order | Transaction Document | approval-required, customer-facing (supplier recipient), multi-currency | Shared standard jsPDF + AutoTable; Letter portrait | P1 | Implemented | Company legal name/logo are not exposed by the current purchase-order contract |
| 23 | Point of Sale / Purchase orders | Goods receipt act | Transaction Document | approval-required, internal, signature-required | Shared standard jsPDF + AutoTable; Letter portrait | P0 | Implemented | Backend does not expose an independent goods-receipt folio; document discloses that the purchase-order folio is used |
| 24 | Point of Sale / Cash audits | Cash audit act | Transaction Document | approval-required, confidential, internal, signature-required | Shared standard jsPDF + AutoTable; Letter portrait | P0 | Implemented | Source DTO does not include currency; current module presentation is explicitly identified as MXN |
| 25 | Human Resources / Permissions | Leave request and authorization | Legal Document | approval-required, confidential, employee-facing, signature-required | Shared standard jsPDF; Letter portrait | P0 | Implemented | Requires jurisdiction and internal-policy legal review before approval as an official employment document |
| 26 | Processes / Processes | Operating procedure | Operational Report | approval-required, internal | Shared standard jsPDF; A4 portrait | P1 | Implemented | Reflects the active recurring-process configuration; missing issuer identity is no longer replaced with Indice; no immutable process-version field exists |
| 27 | Petty Cash / Cash | Petty-cash expense voucher | Transaction Document | approval-required, confidential, internal, signature-required | Shared standard jsPDF; Letter portrait | P0 | Implemented | Legacy expense records do not carry currency directly; fund currency is used when available and the MXN fallback is disclosed |
| 28 | Sales / Post-sale | Delivery and acceptance act | Transaction Document | customer-facing, signature-required | Shared standard jsPDF + AutoTable; Letter portrait | P1 | Implemented | Pending deliveries are marked as preliminary; signed acceptance is still required |

## Verified source map

This map is the source-of-truth bridge between the product inventory above and the
current frontend implementation. Paths are relative to `react/src/` and are checked by
`npm run test:print`.

| Inventory ID | Generator source | Owning UI / action source |
|---|---|---|
| 1A / 1B | `app/BasicModules/HumanResources/Payroll/PayrollRunPdfDocument.tsx`; `app/BasicModules/HumanResources/Payroll/PayrollRunPrintPortal.tsx` | `app/BasicModules/HumanResources/Payroll/Payroll.tsx` |
| 2 | `app/BasicModules/HumanResources/Records/utils/records.pdf.ts` | `app/BasicModules/HumanResources/Records/Records.tsx` |
| 3 | `app/BasicModules/HumanResources/Assets/AssetDetailsModal.tsx` | Same file |
| 4 | `app/BasicModules/HumanResources/Control/utils/timeTablePrintReport.ts`; `app/BasicModules/HumanResources/Control/utils/timeTablePrint.ts` | `app/BasicModules/HumanResources/Control/components/TimeTableModal.tsx` |
| 5 | `app/BasicModules/PettyCash/utils/pettyCashStatementPdf.ts` | `app/BasicModules/PettyCash/components/PettyCashReconciliationWorkspace.tsx` |
| 6 | `app/BasicModules/Sales/Cotizacion/quotePdf.ts` | `app/BasicModules/Sales/Cotizacion/components/QuotePreviewModal.tsx`; `app/BasicModules/Sales/Cotizacion/Cotizacion.tsx` |
| 7 | `app/BasicModules/Sales/Sales/utils/saleInvoicePdf.ts` | `app/BasicModules/Sales/Sales/components/SaleSummaryPreviewModal.tsx` |
| 8 / 28 | `app/BasicModules/Sales/Postventa/utils/postSalePdf.ts`; `app/BasicModules/Sales/Postventa/utils/postSaleDeliveryAct.ts` | `app/BasicModules/Sales/Postventa/Postventa.tsx` |
| 9 | `app/BasicModules/ProcessesTasks/Agenda/utils/agendaTaskReportPdf.ts` | `app/BasicModules/ProcessesTasks/Agenda/Agenda.tsx` |
| 10 | `app/BasicModules/ProcessesTasks/Projects/components/ProjectTasksWorkspace.tsx` | Same file |
| 11 | `app/BasicModules/PointOfSale/Cortes/utils/cortesPrintReport.ts` | `app/BasicModules/PointOfSale/Cortes/Cortes.tsx` |
| 12 | `app/BasicModules/PointOfSale/Cortes/components/CorteDetailModal.tsx` | Same file; opened by `app/BasicModules/PointOfSale/Cortes/Cortes.tsx` |
| 13 | `app/BasicModules/PointOfSale/Sale/components/TicketModal.tsx` | `app/BasicModules/PointOfSale/Sale/components/SaleModals.tsx` |
| 14 | `app/BasicModules/PointOfSale/Clientes/components/AccountStatementModal.tsx` | Same file |
| 15 | `app/BasicModules/Sales/Inventory/components/movements/MovementPrintModal.tsx` | Same file |
| 16 | `app/ComplementaryModules/WorkClimate/Agenda/Agenda.tsx` | Same file |
| 17 | `app/components/rh/NominasTab.tsx` | Same file; legacy reachability unresolved |
| 18 / 19 / 20 | `app/BasicModules/Receivables/utils/receivablesPrintDocuments.ts` | `app/BasicModules/Receivables/views/PaymentsView.tsx`; `CreditCustomersView.tsx`; `AccountsReceivableView.tsx` |
| 21 | `app/BasicModules/Expenses/utils/expensePrintDocument.ts` | Expense table, mobile card, and detail actions |
| 22 / 23 / 24 | `app/BasicModules/PointOfSale/shared/pointOfSalePrintDocuments.ts` | Purchase-order detail, goods-receipt, and cash-audit detail actions |
| 25 | `app/BasicModules/HumanResources/Permissions/utils/permissionPrintDocument.ts` | `app/BasicModules/HumanResources/Permissions/components/PermissionDetailModal.tsx` |
| 26 | `app/BasicModules/ProcessesTasks/Processes/processPrintDocument.ts` | `app/BasicModules/ProcessesTasks/Processes/Processes.tsx` |
| 27 | `app/BasicModules/PettyCash/utils/pettyCashExpensePrintDocument.ts` | `app/BasicModules/PettyCash/Caja/components/PettyCashExpenseTable.tsx` |

## Shared print infrastructure introduced

| Primitive | Responsibility | Used by |
|---|---|---|
| `documentPrintContract.ts` | Typed categories, modifiers, page sizes, orientation, version contract, approved attribution, localized footer labels, and date-time formatting | Shared engines, HTML outputs, all new adapters and future generators |
| `documentPrintFeedback.ts` | Localized blocked-popup and generation-failure feedback for all six supported language families | Shared HTML/PDF engines and standard documents |
| `documentFileName.ts` | Safe, stable document filenames with folio, company, period, or print date | KPI filenames, HR, Sales, POS, Petty Cash, Processes, legacy payroll |
| `documentPdfEngine.ts` | PDF metadata, unit-safe localized footer, confidentiality/folio/version, owned page numbering, and visible blocked-popup feedback | All migrated jsPDF generators |
| `documentHtmlPrintEngine.ts` | Safe Blob print lifecycle, localized blocked-popup feedback, scoped app-style reuse, and explicit A4/Letter/thermal page declarations | POS ticket, cash-closing detail, inventory movement, attendance report |
| `standardDocumentPdf.ts` | Shared transaction/operational layout with metadata, KPI strip, sections, tables, notices, signatures, localized footer, deterministic pagination, download/print actions, and popup/generation feedback | Receivables, Expenses, Purchase orders, Cash audits, HR Permissions, Processes, Petty Cash, Post-sale |
| `useCompanyPrintIdentity.ts` | Company name/logo resolution from Config Center | Existing KPI reports; adoption by transaction/legal call sites remains a recorded data-contract task |

## Code findings corrected by this migration

- POS ticket printing previously called `window.print()` and could include the complete
  application. It now prints only the ticket with an explicit 80 mm contract.
- Individual cash-closing printing previously called `window.print()` from the modal.
  It now prints a scoped A4 document with folio and attribution.
- Inventory movement printing serialized Tailwind markup without loading application
  styles. The shared HTML engine now carries the required styles into the print document.
- Petty Cash silently truncated statement movements to 18 rows. All matching movements
  now participate in AutoTable pagination.
- Multiple PDF generators used generic or inconsistent filenames. Migrated filenames now
  include document type and stable identifiers.
- Multiple generators had first/last-page-only footers or no PDF metadata. Migrated
  jsPDF outputs now receive document metadata and page footers on every page.
- Post-sale notes could overlap the page footer after a long table. The notes block now
  moves to a new page when necessary.
- Customer account totals could overflow the last page. The totals block now checks the
  remaining safe area before rendering.
- Browser timetable output used duplicated popup lifecycle code and very heavy typography.
  It now uses the shared print lifecycle and restrained document typography.
- Cash-closing report footer claimed `Page 1 of 1` even for multipage output. The false
  total was removed; browser pagination remains an explicitly recorded limitation.
- The shared footer used the same raw offsets for millimeter- and point-based PDFs. It
  now converts its reserved distances into the active jsPDF unit, preventing clipped
  footers in the Letter post-sale summary.
- Standard documents visually substituted `Indice` when issuer data was absent. The
  fallback was removed: a missing client identity is now an explicit data-contract gap.
- POS tickets printed a sample RFC, address, telephone, fixed MXN currency, and a fixed
  16% tax label. Those invented values were removed and live shift identity/currency is
  now used.
- Operational HTML documents duplicated the old `Generated by Indice` wording or used
  a decorative Indice issuer mark. They now reuse the approved discreet attribution and
  leave unavailable client identity explicit.
- Popup blocking was silent in several shared-engine call sites. Both shared print
  engines now provide localized feedback in `es`, `en`, `fr`, `pt`, `ko`, and `zh`.
- All custom migrated jsPDF footers now expose format version `v1.0`; shared standard
  documents derive it directly from their typed contract.

## Non-generators intentionally omitted

The following matches are not application-owned printable templates:

- uploaded PDF, XML, image, DOCX, or XLSX attachments
- mock filenames ending in `.pdf`
- backend invoice or evidence downloads whose bytes are not rendered in React
- browser previews of an existing remote PDF
- PDF mentions in learning text, feature descriptions, or translations
- kiosk evidence upload MIME-type declarations

## QA matrix and current evidence

| Check | Current result |
|---|---|
| TypeScript | Passed on 2026-08-06 (`tsc --noEmit`) |
| Production build | Passed on 2026-08-06 (Vite, 4,557 modules transformed) |
| Source inventory scan | Reverified on 2026-08-06 for `window.print`, print windows, jsPDF, AutoTable, print CSS, PDF save/output calls, protected reports, and attachment-only false positives |
| Print contract regression | Passed 6/6: inventory/source map, shared attribution/feedback/units/version, custom PDF versions, live POS identity, no invented issuer fallbacks, and no prominent Indice issuer in audited operational outputs |
| One-page fixtures | Passed: Letter portrait payment receipt and long-title A4 procedure rendered without clipping, overlap, or footer collision |
| Multi-page / 100-row fixtures | Passed: A4 landscape aging report rendered 120 rows across 7 pages with 120/120 rows, repeated table headers, and 7/7 numbered footers |
| Empty and partial data | Shared engine supplies explicit empty-table messaging and missing-value placeholders; artifact-specific UI review remains a product gate |
| Client with and without logo | KPI coverage exists; non-KPI identity data gaps recorded above |
| Grayscale | Restrained PDF palette and contrast passed screen-render review; physical grayscale QA remains pending |
| Supported locales | Shared chrome maps `es`, `en`, `fr`, `pt`, `ko`, and `zh`; artifact copy follows each owner module, and CJK font embedding plus non-Spanish POS/Petty Cash/Post-sale copy remain explicit localization gates |
| Multi-currency | Existing business calculations preserved; Petty Cash, quotations, sales, account statements, and cuts need representative review |
| Physical thermal print | Pending on supported 80 mm hardware; 58 mm is not yet declared as supported |
| Accessibility | HTML outputs retain semantic markup where available; jsPDF outputs are not tagged PDFs |

Additional regression evidence:

- 2026-08-06: 28/28 focused frontend checks passed across print, POS, Petty Cash,
  Sales, Expenses, Receivables, Human Resources, and Processes / Tasks
- 2026-08-06: protected BMI/PPI source files were not modified
- 2026-08-06: no backend DTO, API, permission, calculation, tax, or accounting logic changed

- kiosk frontend regression: 3/3 tests passed
- phone validation regression: 18 positive, 6 negative, and visible-prefix assertions passed
- final branch diff contains no Panel Inicial or KPI-tab source changes
- automated browser interaction could not start because the local browser-control runtime failed during initialization; no application failure was observed, and the production build plus direct PDF artifact render were used as the delivery gates
- no backend DTO or API was expanded: every new document is generated from data already present in its owning authorized view, and the known data-contract limitations are disclosed per row above

## Approval gates before version 1.0

1. Render representative fixtures for each of the six primary categories.
2. Review P0 legal/fiscal language with the responsible product and compliance owners.
3. Provide issuer/company identity to the non-KPI transaction and legal document contexts.
4. Test POS ticket output on supported 80 mm hardware and decide whether 58 mm is required.
5. Validate multipage browser output in supported Chrome/Safari environments.
6. Decide whether the legacy `NominasTab` generator is reachable or can be deleted.
7. Record before/after visual evidence and promote the draft only through an explicit
   version 1.0 documentation change.

## POS operational tickets extension — 2026-09-07

`app/BasicModules/PointOfSale/shared/posOperationTickets.ts` provides the paid inventory receipt and individual shift closing thermal tickets (80 mm, internal operational documents, native transaction currency). Entrypoints are `PaidInventoryReceiptModal`, `ShiftClosingTicketModal`, and `CorteDetailModal`. All use the shared `documentHtmlPrintEngine`; receipt/closing reprints query saved documents and never resubmit financial or inventory commands. The engine observes document readiness from the opener so a reserved print window still prints after navigation replaces its initial document.
