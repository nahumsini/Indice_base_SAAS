# Indice Printable Document Inventory

## Working Inventory

Status: Basic Modules KPI migration implemented  
Last updated: 2026-07-18

This inventory supports
[Indice Document Print Standard — Draft](./INDICE_DOCUMENT_PRINT_STANDARD_DRAFT.md).
It is intentionally incomplete until every module has been exercised in the UI.

## Inventory Fields

Each row records:

- owner module
- printable artifact
- primary category
- modifiers
- current engine
- current page contract
- migration priority
- known risks
- pilot status

Priority definitions:

- P0: legal, fiscal, payroll, or high-volume operational risk
- P1: customer-facing or decision-critical
- P2: internal operational output
- P3: low-use, legacy, or duplicate implementation

## Protected Editorial References

| Module | Artifact | Category | Engine | Status |
|---|---|---|---|---|
| Dashboard / Business Profile | Business Maturity Index (BMI) | Executive Report | React document + print CSS | Protected reference; inspect only |
| Dashboard / Personal Performance | Personal Performance Index (PPI / IRP) | Executive Report | React document + print CSS | Protected reference; inspect only |

## Initial Inventory

| Module | Artifact | Category | Modifiers | Engine | Format observed | Priority | Initial finding |
|---|---|---|---|---|---|---|---|
| Human Resources / Payroll | Payroll run | Legal Document | confidential, employee-facing, fiscal | React print portal + print CSS | CSS-controlled | P0 | Jurisdiction and privacy sensitive; pilot candidate after contract review |
| Human Resources / Records | Employee record PDF | Legal Document | confidential, internal | jsPDF | Letter | P0 | Separate generator and branding logic |
| Human Resources / Assets | Asset detail PDF | Operational Report | internal | jsPDF | Letter | P2 | Generator lives inside modal; shared primitives absent |
| Human Resources / Control | Timetable report | Operational Report | internal | HTML + browser print | A4 landscape | P1 | Shared HTML printer exists but is module-local |
| Human Resources / KPIs | HR KPI report | Operational Report | internal, analytics | HTML + browser print | A4 portrait | P1 | Pilot 1: profile-driven company name/logo in the running header, regular-weight editorial typography, discreet Indice attribution, and owned pagination; visual QA pending |
| Expenses / KPIs | Financial overview | Executive Report | confidential, multi-currency, analytics | jsPDF + AutoTable | A4 portrait | P1 | Migrated to profile identity, restrained typography/color, discreet footer, complete budget rows, and standard filename; visual QA pending |
| Petty Cash | Statement | Transaction Document | confidential, internal, multi-currency | jsPDF + AutoTable | Letter | P1 | Similar implementation to Expenses; candidate shared jsPDF pilot |
| Sales / Quotations | Quotation | Transaction Document | customer-facing, multi-currency | jsPDF + AutoTable | A4 | P1 | Customer-facing pilot candidate |
| Sales / Sales | Sale invoice/summary | Transaction Document | customer-facing, fiscal candidate | jsPDF + AutoTable | A4 | P0 | Must separate commercial summary from legally fiscal invoice claims |
| Sales / Post-sale | Post-sale report | Operational Report | customer-facing | jsPDF + AutoTable | Letter | P1 | Independent styling and footer |
| Processes / Tasks / Agenda | Task report | Operational Report | internal | jsPDF | Engine default | P2 | Minimal generator; likely inconsistent metadata and filename |
| Processes / Tasks / KPIs | KPI report | Operational Report | analytics, internal | HTML + browser print | Inherited HTML printer | P1 | Reuses HR print helper across module boundary |
| Processes / Tasks / Projects | Project tasks report | Operational Report | internal | jsPDF | Engine default | P2 | Generator embedded in large workspace component |
| Point of Sale / Cuts | Cash closing report | Operational Report | confidential, approval-required | HTML + browser print | A4 portrait | P0 | Financial control document; separate HTML template |
| Point of Sale / Sale | POS ticket | Thermal Document | customer-facing, thermal | Browser print | Device/browser controlled | P0 | Requires 58/80 mm hardware contract and reprint rules |
| Point of Sale / Customers | Account statement | Transaction Document | customer-facing, confidential | jsPDF + browser print | Engine default | P1 | Mixed generation/preview behavior |
| Sales / Inventory | Movement print | Transaction Document | internal | Browser print | CSS/browser controlled | P2 | Needs explicit page and metadata contract |
| KPI / Accounting Reports | Accounting report | Operational Report | confidential, internal | Shared HTML KPI engine | A4 portrait | P1 | Dedicated active-statement report implemented; no application chrome; visual QA pending |
| Sales / KPIs | Sales KPI report | Operational Report | analytics, internal | Shared HTML KPI engine | A4 portrait | P1 | Dedicated metrics, funnel, trend, seller, and complete opportunity report implemented; visual QA pending |
| Point of Sale / KPIs | POS KPI report | Operational Report | analytics, internal | Shared HTML KPI engine | A4 portrait | P1 | Dedicated metrics, charts, and complete cash-closing report implemented; visual QA pending |
| Work Climate / Agenda | Agenda export | Operational Report | internal | jsPDF + AutoTable | Engine default | P2 | Complementary module with isolated generator |
| Legacy HR component | Payroll export | Legal Document | confidential, legacy | jsPDF | Engine default | P3 | Determine whether reachable or duplicate before migration |

## Engine Findings

### HTML and browser print

Observed strengths:

- flexible editorial layout
- accessible HTML potential
- good chart and CSS support

Observed risks:

- popup blocking
- inconsistent total page counts
- browser-dependent pagination
- duplicated HTML escaping and print-window lifecycle

### jsPDF and AutoTable

Observed strengths:

- deterministic downloadable PDF
- explicit page dimensions
- repeatable table pagination

Observed risks:

- duplicated brand and footer helpers
- manual vertical-position calculations
- limited semantic accessibility
- inconsistent A4/Letter defaults

### React print portals and document components

Observed strengths:

- component composition
- close relationship to application data
- strong protected editorial references

Observed risks:

- print CSS fragmentation
- browser-specific output
- potential mismatch between preview and printed result

## Proposed Pilots

| Category | Proposed pilot | Reason | Status |
|---|---|---|---|
| Executive Report | Expenses financial overview | Exercises KPIs, charts/tables, multi-currency, and jsPDF without modifying BMI/PPI | Implemented; visual QA pending |
| Operational Report | HR KPI report | Existing mature structure and HTML print implementation | In progress: executive redesign complete; in-app visual QA pending |
| Tab Print | Sales KPI screen | Exposes direct-window-print weaknesses and scoped print needs | Replaced by dedicated report; visual QA pending |
| Transaction Document | Sales quotation | Customer-facing, A4, multi-currency, and commercially important | Proposed |
| Legal Document | Payroll run | Highest sensitivity; begin with contract audit before visual changes | Proposed |
| Thermal Document | POS ticket | Establishes 58/80 mm and physical-printer requirements | Proposed |

## Basic Modules KPI Migration Matrix

| KPI area | Current print behavior | Current engine | Target | Migration status |
|---|---|---|---|---|
| Human Resources | Dedicated paginated report | HTML + browser print | Approved KPI baseline and shared engine reference | Pilot implemented; identity and filename primitives extracted |
| Expenses | Dedicated financial overview download | jsPDF + AutoTable | Preserve financial semantics; adopt identity, typography, footer, and filename contract | Migrated; visual QA pending |
| Processes / Tasks | Dedicated KPI report using the shared engine | HTML + browser print | Shared KPI engine with complete collaborators, processes, and projects | Migrated; visual QA pending |
| Sales | Dedicated KPI report | Shared HTML KPI engine | Dedicated KPI report through shared engine | Migrated; visual QA pending |
| Point of Sale | Dedicated KPI report | Shared HTML KPI engine | Dedicated KPI report through shared engine | Migrated; visual QA pending |
| KPI / Accounting Reports | Dedicated active-statement report | Shared HTML KPI engine | Dedicated statement report or approved accounting-document adapter | Migrated; visual QA pending |
| Petty Cash | Dedicated KPI report | Shared HTML KPI engine | KPI report covering all funds and movements; statement PDF remains separate | Migrated; visual QA pending |
| Central KPI executive panel | Dedicated executive KPI report | Shared HTML KPI engine | Consolidated report of visible filters, indicators, charts, units, and alerts | Migrated; visual QA pending |

Migration order:

1. Extract the approved Human Resources shell into a shared KPI print engine.
2. Migrate Processes / Tasks because it already produces structured HTML.
3. Adapt Sales and Point of Sale from direct screen print to dedicated reports.
4. Adapt Expenses without weakening its financial and multi-currency rules.
5. Add dedicated print actions to Accounting Reports, Petty Cash, and the central
   KPI panel.

All five migration steps are implemented. The remaining gate is representative-data
visual QA in the authenticated application and correction of any browser-specific
pagination findings.

## Shared Opportunities

Initial candidates for reusable infrastructure:

- document classification types
- print metadata contract
- page-size and orientation tokens
- client branding resolver
- filename sanitizer and formatter
- locale/date/money helpers
- HTML print-window lifecycle
- safe HTML escaping
- jsPDF page footer and numbering
- Indice/client mark rendering
- table density and header tokens
- status and watermark treatment
- print error and popup-blocked feedback

Do not extract shared components until at least two real documents demonstrate the
same stable requirement.

## Open Questions

- Which countries require Letter versus A4 for each legal document?
- Is there an approved legal name and URL for Indice attribution?
- Which client branding fields are guaranteed by current APIs?
- Are invoices in the current Sales module legally fiscal documents or commercial summaries?
- Which thermal printer widths and models are officially supported?
- Must downloaded PDFs be accessible/tagged, or is an accessible HTML alternative acceptable?
- Which existing print flows are reachable and which are legacy duplicates?
- Which artifacts require immutable audit identifiers or reprint watermarks?

## Next Discovery Actions

1. Render the proposed pilots with representative data.
2. Capture current output dimensions and visible inconsistencies.
3. Confirm document ownership and legal intent with product requirements.
4. Approve or replace each pilot.
5. Implement one shared primitive only after the first pilot exposes a stable need.
