# Indice Document Print Standard

## Working Draft — Not Yet Authoritative

Status: Draft for implementation discovery  
Version: 0.1  
Last updated: 2026-07-18

This document is a working extension of the
[Indice Frontend Operating System v2.0](./indice-frontend-operating-system-v2.md).
It does not become the official print standard until the pilot documents have
been implemented, visually verified, and the document is promoted to version 1.0.

When this draft conflicts with the Frontend Operating System, the Frontend
Operating System remains authoritative. Analytics exports must also comply with
[Indice KPI Tab Standard](./KPI_TAB_STANDARD.md).

---

## 1. Purpose

Indice must provide a coherent enterprise document language across every
printable artifact without forcing every artifact into one layout.

Standardize the design language, component contracts, metadata, quality checks,
and implementation boundaries. Preserve the purpose and legal requirements of
each document.

The user should recognize an Indice document through clarity, hierarchy, and
editorial quality rather than through oversized platform branding.

The client organization is the protagonist. Indice branding remains discreet.

---

## 2. Protected References

The following documents are protected editorial references:

- Business Maturity Index (BMI)
- Personal Performance Index (PPI / IRP)

Do not redesign their approved hierarchy, editorial rhythm, or visual identity
during print standardization.

Protected does not prohibit:

- accessibility fixes
- localization fixes
- data or calculation fixes authorized by a separate task
- browser and print compatibility fixes
- legal or privacy corrections
- internal refactoring that preserves verified output

Any visible change to a protected reference requires explicit approval and
before/after visual evidence.

---

## 3. Scope And Boundaries

This standard governs:

- print preview
- browser printing
- generated PDF documents
- downloadable reports
- receipts and transaction documents
- legal and fiscal document presentation
- thermal tickets and labels
- filenames and document metadata
- reusable frontend print primitives

Presentation standardization must not silently change:

- backend behavior
- APIs or DTOs
- calculations
- financial or payroll rules
- permission behavior
- source data
- fiscal payloads
- document lifecycle state

If required information is missing, record a data-contract gap. Do not invent
legal, financial, fiscal, or operational values in the presentation layer.

---

## 4. Classification Contract

Every printable artifact must declare one primary category and zero or more
modifiers before implementation.

### Primary categories

1. Executive Report
2. Operational Report
3. Tab Print
4. Transaction Document
5. Legal Document
6. Thermal Document

### Modifiers

- fiscal
- legal
- confidential
- customer-facing
- employee-facing
- internal
- approval-required
- signature-required
- multi-currency
- white-label
- thermal

Example:

```text
Primary category: Transaction Document
Modifiers: customer-facing, fiscal, multi-currency
```

The primary category determines structure. Modifiers add requirements and do
not replace the primary category.

---

## 5. Category Intent

### 5.1 Executive Report

Use for BMI, PPI, executive KPIs, financial analysis, and operational health.

Required character:

- editorial hierarchy
- executive summary
- evidence-based insights
- recommendations when supported by the product
- purposeful charts
- generous whitespace
- restrained platform branding

### 5.2 Operational Report

Use for attendance, inventory, sales, expenses, projects, and payroll operations.

Required character:

- current operational scope
- compact KPIs
- filters and period context
- tables and exceptions
- visible source and refresh context
- clear route from summary to detail

### 5.3 Tab Print

Use for a printable representation of the active application tab.

Required character:

- table-first hierarchy
- active filters preserved
- filtered result count
- visible selected columns
- no navigation, buttons, empty UI chrome, or hidden data added automatically

### 5.4 Transaction Document

Use for invoices, quotations, purchase orders, statements, and receipts.

Required character:

- fast scanning
- clear issuer and recipient
- folio and lifecycle status
- legally relevant native amounts
- subtotals, taxes, totals, and terms
- approval or signature area when required

### 5.5 Legal Document

Use for contracts, certificates, payroll receipts, and official documents.

Required character:

- compliance-first hierarchy
- immutable identifiers when available
- version and status
- complete parties and dates
- signature, certification, or verification area
- minimal decorative color

Presentation alone must never claim legal compliance. Legal requirements must be
verified separately for each jurisdiction.

### 5.6 Thermal Document

Use for POS tickets, kitchen tickets, warehouse tickets, and labels.

Required character:

- monochrome-first output
- 58 mm, 80 mm, or explicitly configured label size
- high contrast
- short lines and safe wrapping
- device-safe QR or barcode sizing
- duplicate/reprint status when applicable

### 5.7 Approved KPI Report Baseline

The Human Resources KPI report is the approved pilot for standard KPI reports.
Until a later governed revision replaces it, KPI reports in Basic Modules must
follow this baseline:

- A4 portrait with explicit page containers and internal margins
- client company identity in the running header
- company name and corporate-office logo loaded from the Config Center company profile
- report title as secondary header information
- no period label in the running header
- no Indice logo or promotional block in the header or report body
- `Powered by www.indiceapp.com` as discreet footer attribution
- localized dynamic `Updated` timestamp in the footer
- owned page numbering on every page
- filename structure `document-type_company_print-date.pdf`
- regular typography at weight 400 and medium typography at weight 500 only
- no forced uppercase and no typographic weights of 600 or greater
- hierarchy created through scale, spacing, alignment, and dividers rather than bold text
- color used sparingly, primarily in charts and small semantic status indicators
- desaturated colors suitable for professional printing and grayscale interpretation
- complete data with no silent truncation

If the company logo is unavailable, render the company name without reserving an
empty logo area. The print action must not become available until company identity
loading has completed or failed safely.

The approved footer pattern is:

```text
Powered by www.indiceapp.com · Updated: <localized date and time>
```

---

## 6. Branding Priority

For customer-facing and white-label documents, use this priority:

1. Client logo
2. Client legal or commercial name
3. Client contact and fiscal information required by the document
4. Document identity
5. Discreet Indice attribution

When the client logo is missing or cannot be loaded, render a stable text fallback.
Never leave a broken image or an unexplained empty area.

Suggested platform attribution:

```text
Generated by Indice
```

The final legal copy and platform URL must come from approved configuration. Do
not hardcode marketing claims into every generator.

---

## 7. Color Rules

Color depends on category:

- Executive reports use the approved Indice editorial palette.
- Operational reports and tab prints may use the module accent.
- Customer-facing transaction documents prioritize client identity.
- Legal documents use restrained color and must remain clear in grayscale.
- Thermal documents are monochrome-first.
- Semantic colors are reserved for real status, risk, warning, and success.

All Indice-owned documents must follow the brand hierarchy defined in
`Indice Frontend Operating System v2.0`, section 8.1:

- aqua `#59C3A5` is the primary distinctive brand signature
- dark aqua `#177D66` is the accessible aqua action color for white text
- blue `#2563EB` is the structural and analytical color
- deep blue `#143675` is the institutional and executive color
- coral `#FF6B5E` and yellow `#F4C84A` are supporting accents
- graphite `#222831` is the primary text color

Use aqua sparingly for brand recognition, soft highlights, small dividers, and
identity details. Do not use white text on `#59C3A5` or `#3AAE90`. Use graphite
text on light aqua or white text on dark aqua `#177D66`.

Blue remains an approved Indice editorial accent for analytics, executive
reporting, functional navigation, and institutional authority. It is not a
mandatory replacement for aqua, module, client, legal, or thermal requirements.

Customer-facing and white-label documents continue to prioritize the client
identity over the Indice palette.

Never rely on color alone to communicate meaning.

---

## 8. Page Format Decision Matrix

Choose page format from document purpose and jurisdiction, not from generator
defaults.

| Category | Default | Alternative |
|---|---|---|
| Executive Report | A4 or Letter portrait | Landscape for justified analytics |
| Operational Report | A4 or Letter portrait | Landscape for wide tables |
| Tab Print | Portrait | Landscape based on approved visible columns |
| Transaction Document | Jurisdiction/product default | Explicit business override |
| Legal Document | Jurisdiction default | Only when legally acceptable |
| Thermal Document | 80 mm | 58 mm or configured label size |

Every generator must declare:

- page size
- orientation
- units
- margins
- printable safe area
- footer reservation

Do not switch to landscape only because one optional column is wide. First apply
column priority, wrapping, and density rules.

---

## 9. Required Document Metadata

Each document contract must determine whether it requires:

- issuer company
- unit and business
- recipient
- document title
- folio or unique identifier
- period or effective date
- generated timestamp
- timezone
- locale
- native currency
- display currency and conversion context
- document status
- data source or refresh time
- generated-by user
- confidentiality level
- format version

Do not display irrelevant metadata merely to fill space.

---

## 10. Approved Component Families

Build documents from approved component contracts:

- Cover
- Executive Header
- Document Header
- Continuation Header
- Metadata Strip
- Executive Summary
- KPI Strip
- Editorial KPI Strip
- Insight Card
- Recommendation Card
- Alert Block
- Comparison Block
- Timeline
- Operational Table
- Financial Table
- Compact Table
- Chart Block
- Signature Block
- Approval Block
- QR or Barcode Block
- Legal Footer
- Certification Footer
- White-label Footer
- Appendix

Use approved components before creating a new layout. A new component requires a
documented use case, reusable contract, visual QA, and approval before becoming a
shared primitive.

Shared print primitives contain presentation only. Business formulas, permissions,
and payload construction remain in the owning module.

---

## 11. Header Contract

A document header must support:

- client logo with text fallback
- issuer identity
- document title
- folio and status
- period or date
- optional recipient context

The first-page header may be richer. Continuation headers must be compact.

Avoid:

- oversized logos
- duplicated company names
- decorative marketing heroes
- headers taller than the information requires

---

## 12. Footer Contract

The footer may contain:

- page X of Y when supported by the engine
- document folio
- confidentiality or legal notice
- generated timestamp
- discreet Indice attribution
- verification code or URL

Browser printing may not reliably support total page count. Treat `Page X of Y`
as required for deterministic PDF engines and best effort for browser print.

---

## 13. Typography

Use the approved brand font when it can be embedded or reliably loaded. Always
define platform-safe fallbacks.

Required behavior:

- sentence case for titles and labels unless legal convention requires otherwise
- tabular numerals for financial columns when supported
- minimum readable size appropriate to output device
- restrained weight hierarchy
- consistent line height
- no text encoded as images
- glyph coverage for every supported locale

Thermal output must prioritize device legibility over brand typography.

---

## 14. KPI Rules

Executive reports use editorial KPIs with large typography and minimal framing.

Operational reports use compact KPI strips. Use no more than six KPIs in one
printed row, and do not invent weak metrics to fill space.

Each KPI must include enough context to understand:

- metric name
- value and unit
- period
- comparison or target when relevant
- status meaning

Analytics exports must preserve the active scope defined by the KPI tab.

---

## 15. Table Rules

Required:

- light borders
- restrained alternating rows when useful
- repeated headers across pages when supported
- text aligned left
- numeric, percentage, and currency values aligned right
- consistent date alignment
- native currency retained for legally relevant rows
- clear subtotal and total hierarchy
- no unexplained truncation
- no row split when the engine can prevent it
- explicit empty-state message

Uppercase column headers are permitted only when readability remains strong and
the selected locale supports the treatment.

When a table is too wide, apply this order:

1. Remove nonessential columns for the document contract.
2. Wrap approved text columns.
3. Use compact density.
4. Switch to landscape.
5. Split into a primary table and appendix.

Never scale text below a readable size to force all columns onto one page.

---

## 16. Chart Rules

Approved chart families:

- bar
- line
- pie or donut for limited part-to-whole comparisons
- radar when dimensions share a valid scale
- timeline
- heatmap

Every chart must include:

- decision-oriented title
- period
- unit and scale
- legend when needed
- source or data context
- readable grayscale behavior
- table or textual alternative for critical values

Do not use 3D charts. Do not use a pie chart for many categories or precise
comparisons.

---

## 17. Pagination And Content Flow

Required:

- avoid empty pages
- avoid isolated headings at page bottoms
- keep signatures and their labels together
- repeat table headers when supported
- reserve footer space
- prohibit browser-generated headers, timestamps, local URLs, and `blob:` references
- give browser-printed reports explicit page containers, internal margins, and owned page numbering
- force page breaks only for major sections or legal boundaries
- use continuation labels when a section spans pages
- prevent nearly empty final pages when possible

Long content must be tested with realistic maximum data, not only demo records.

---

## 18. Localization, Dates, And Money

Every document must use its active locale for:

- date order and month names
- decimal and group separators
- translated labels
- pluralization
- page-size defaults when applicable

Always distinguish:

- native transaction currency
- preferred display currency
- converted total
- exchange-rate source and effective date when conversion is shown

Do not total mixed currencies without an explicit conversion contract.

---

## 19. Privacy And Security

Before rendering, verify that the active user may access every included field.

Sensitive categories include:

- payroll and salary
- banking information
- employee records
- personal identifiers
- fiscal information
- customer credit information

Support when required:

- field redaction
- confidential watermark
- draft/copy/reprint watermark
- expiring verification link
- safe QR payload

Never embed private access tokens, internal storage URLs, or credentials in a
document or QR code.

---

## 20. Thermal Rules

Thermal documents must:

- declare 58 mm, 80 mm, or label dimensions
- use monochrome-safe contrast
- avoid background fills that reduce print quality
- wrap long product and customer names safely
- keep totals visually dominant
- preserve barcode and QR quiet zones
- distinguish original, copy, reprint, and canceled states
- support printer-safe margins and cut spacing

Test on physical hardware before approving a thermal template.

---

## 21. Engine-Neutral Architecture

The standard applies regardless of implementation engine.

Current engines may include:

- browser print with HTML and CSS
- jsPDF and AutoTable
- React print portals
- specialized PDF document components

Each engine should use adapters for shared tokens and contracts. Do not duplicate
brand marks, footer wording, filenames, date formatting, or page rules in every
module when a reusable implementation is possible.

Engine-specific behavior must remain behind typed utilities.

---

## 22. Filename Contract

Downloaded filenames must be:

- meaningful
- localized only when safe for filesystem compatibility
- free of unsafe characters
- stable enough for audit workflows
- inclusive of folio or period when useful

Recommended structure:

```text
document-type_identifier_period.pdf
```

For client-branded reports without an immutable folio, use:

```text
document-type_company_print-date.pdf
```

Do not use generic names such as `report.pdf` or `document.pdf`.

---

## 23. Required States

The print flow must account for:

- preparing
- ready
- empty
- partial data
- blocked popup
- missing logo or font
- generation failure
- retry
- canceled generation
- oversized document

Do not open a blank window without feedback. Do not silently generate an empty
document.

---

## 24. Accessibility

Required where supported by the engine:

- semantic headings
- logical reading order
- meaningful image alternatives
- sufficient contrast
- non-color status indicators
- legible font size
- keyboard-accessible preview actions
- descriptive document title
- language metadata

If an engine cannot generate tagged accessible PDFs, record the limitation in the
document inventory and provide an accessible HTML or data alternative when the
document is a critical user workflow.

---

## 25. Quality Assurance Matrix

Every migrated template must be checked with:

- one-page data
- multi-page data
- empty data
- partial data
- long names and descriptions
- 100 or more table rows when applicable
- client with and without logo
- portrait and justified landscape output
- grayscale printing
- every supported locale
- native and multi-currency data
- browser preview
- downloaded PDF
- physical print when legally or operationally important
- mobile initiation when supported

Verify:

- no clipped content
- no overlapping footer
- no blank pages
- repeated headers
- correct totals
- correct active filters
- readable signatures and QR codes
- stable filename

---

## 26. Implementation Workflow

1. Add the document to the print inventory.
2. Assign primary category and modifiers.
3. Record current engine, page format, and risks.
4. Define the document contract and required metadata.
5. Select approved components.
6. Preserve business logic and source data.
7. Implement presentation changes.
8. Validate TypeScript and production build.
9. Render representative fixtures.
10. Perform visual QA against this draft.
11. Record remaining limitations and exceptions.

Do not migrate all documents at once. Approve one pilot per category before broad
rollout.

---

## 27. Pilot Exit Criteria

A pilot is approved when:

- classification is documented
- required metadata is present or a data gap is recorded
- shared primitives are reused where appropriate
- no business calculation changed
- visual QA passes representative data cases
- accessibility limitations are recorded
- TypeScript and production build pass
- output is reviewed in its intended page size or hardware
- before/after evidence is available

---

## 28. Final Report Contract

For every migrated document report:

- category and modifiers
- engine
- page format
- components used
- visual improvements
- business logic left untouched
- accessibility status
- localization status
- compatibility status
- remaining data or engine limitations
- changed files

---

## 29. Governance Before Version 1.0

This draft becomes version 1.0 only after:

1. The inventory is reviewed.
2. One pilot per active category is approved.
3. Shared token and component boundaries are validated.
4. BMI and PPI remain visually protected.
5. Exceptions discovered during pilots are incorporated.
6. The draft label is removed through an explicit documentation change.

Until then, record decisions and exceptions in the print inventory.
