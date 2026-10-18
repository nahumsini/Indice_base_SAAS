# Sales quotation preview and output

Owner: Sales / Quotations. Product decision: 2026-10-18.

## Document and modal boundaries

The quote preview is an **Operational Workspace Modal**, using the existing coral SalesModalFrame,
fixed actions and an internally scrolling body. The customer document is the main surface; contact
shortcuts and a collapsible internal review sit alongside it on desktop and below it on mobile.
Zoom and fit-to-width affect the viewer only. Reopening the modal starts at the top.

`buildQuoteWebDocument` owns the commercial presentation definition. Preview, the table PDF action
and Print / Save PDF consume that definition through the shared HTML document engine. The preview
opts into the same measured paper width, orientation and compact-spacing preparation. Its sandbox
allows parent layout access but no scripts. Other consumers keep the existing preview defaults.
The shared table definition optionally accepts positive relative column widths, so product text
can use adequate space without changing unrelated tables.

The definition includes the actual issuer, customer and fiscal details, currency, seller, dates,
linked opportunity, all items and conversion explanations, stored totals, notes, terms and customer
acceptance/signature lines. Missing issuer identity is not invented. Customer documents exclude
internal cost, profit, margin and recommendations. Amount presentation retains two decimal places;
this does not alter source amounts, tax or discount calculations, persistence or status.

The binary PDF sharing adapter consumes the same definition and retains the existing jsPDF library.
It wraps complete metadata and paginates long item rows, notes and terms instead of truncating them.
Its pagination/typography can differ from browser output. Browser output remains the primary path
and supports platform fonts; the binary compatibility path retains its existing built-in font limits.
The modal explicitly distinguishes device file sharing from opening an email/WhatsApp message;
those shortcuts do not automatically attach or send a document. Canceled sharing is silent, failures
are visible and pending sharing cannot be submitted twice.

Company identity and locale are passed consistently from Quotations and linked Sales/Opportunities
entry points. Quotations waits for the company identity request before output. Header/footer data
and the generation timestamp are shared within the preview session.

## Verification and handoff

Changed scope: QuotePreviewModal, quotePdf, preview copy, the three Sales entry points and opportunity
file modal, the shared StandardDocumentPreview and optional HTML table widths, focused regressions
and synthetic browser fixtures. Backend/schema/API/permission changes: N/A.

Regression coverage checks HTML equality for both output entry points, preserved fiscal/commercial
fields and centavos, internal-data exclusion, escaping, long/empty documents, binary pagination and
locale copy. Existing Sales and document regressions remain required, plus TypeScript/build.
Browser QA uses existing read-only quotes and synthetic fixtures; no business records or messages
are submitted. Final browser/printer pagination depends on paper settings and optional browser
headers/footers. Exact physical page-break parity is not promised by a continuous HTML preview.

Local closeout: 69 focused Sales/document tests passed, TypeScript passed and Vite production build
passed (existing >600 kB chunk advisory remains). `git diff --check` passed. Browser checks covered
the actual local quote, synthetic 32-item preview, zoom, mobile layout, dark mode and internal-review
disclosure. A binary PDF downloaded through the browser was rendered and inspected: the short case
fits one page with signatures. A ten-page stress case retains all 32 items and the end markers of
long notes/terms without clipping. Automated inspection of the browser's blob print window was
blocked by the browser URL policy; no bypass was attempted. Print-content equality is verified by
the HTML regression, while generated binary files were reviewed independently with Poppler.
No unresolved test/build failures remain. Physical printer and native file-sharing delivery: N/A.
