/** Document-only tokens derived from the quotation. Never inject into the application or IME. */
export const quotationPrintTheme = `
  body { font-family: "Avenir Next", "Helvetica Neue", "Segoe UI", Arial, sans-serif; color: #272727; }
  h1, h2, h3, p { overflow-wrap: anywhere; }
  h1 { font-size: 17pt; font-weight: 500; letter-spacing: -.02em; }
  h2 { font-size: 12pt; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }
  th, td { border: 1px solid #dcdcdc; padding: 1.8mm 2mm; font-size: 9pt; line-height: 1.4; text-align: left; vertical-align: top; overflow-wrap: anywhere; white-space: pre-wrap; }
  th { background: #f8f8f8; color: #272727; font-weight: 500; }
  tbody tr:nth-child(even) { background: #f8f8f8; }
  tr, .document-signature, .document-totals { break-inside: avoid; }
  h2, h3 { break-after: avoid; }
  .quotation-document .document-header { display: grid; grid-template-columns: 1fr 1.4fr 1fr; align-items: start; gap: 5mm; padding-bottom: 3mm; border-bottom: 1px solid #dcdcdc; }
  .quotation-document .document-header h1 { text-align: center; margin: 0; }
  .document-identity { font-size: 10pt; white-space: pre-wrap; overflow-wrap: anywhere; }
  .document-logo { max-width: 32mm; max-height: 12mm; object-fit: contain; display: block; margin-bottom: 2mm; }
  .document-reference { text-align: right; font-size: 9pt; overflow-wrap: anywhere; }
  .document-subtitle { font-size: 10pt; color: #727272; }
  .document-metadata { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3mm; background: #f8f8f8; border: 1px solid #dcdcdc; border-radius: 3mm; padding: 3mm; margin: 3mm 0; }
  .document-field { min-width: 0; break-inside: avoid; }
  .document-field dt { color: #727272; font-size: 8pt; }
  .document-field dd { margin: 1mm 0 0; font-size: 10pt; white-space: pre-wrap; overflow-wrap: anywhere; }
  .document-section { margin-top: 3mm; }
  .document-section h2 { border-bottom: 1px solid #dcdcdc; padding-bottom: 2mm; }
  .document-section p, .document-notice { white-space: pre-wrap; font-size: 10pt; line-height: 1.5; }
  .document-totals { background: #f5f5f5; border: 1px solid #d2d2d2; border-radius: 3mm; padding: 4mm; margin: 5mm 0 5mm auto; max-width: 95mm; }
  .document-total { display: flex; justify-content: space-between; gap: 5mm; font-size: 10pt; margin: 2mm 0; }
  .document-total strong, .numeric { text-align: right; font-variant-numeric: tabular-nums; }
  .document-total strong { font-weight: 500; overflow-wrap: anywhere; }
  .document-signatures { display: flex; flex-wrap: wrap; gap: 8mm; margin-top: 8mm; }
  .document-signature { flex: 1 1 45mm; border-top: 1px solid #727272; padding-top: 3mm; font-size: 9pt; white-space: pre-wrap; }
  .document-footer { margin-top: 5mm; border-top: 1px solid #dcdcdc; padding-top: 3mm; font-size: 8pt; color: #727272; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 3mm; }
  .document-notice { border-left: 2px solid #8a8a8a; padding-left: 3mm; }
  body[data-print-density="compact"] .document-metadata { margin:2mm 0; padding:2mm; gap:2mm; }
  body[data-print-density="compact"] th, body[data-print-density="compact"] td { padding:1mm 1.5mm; }
  body[data-print-density="compact"] .document-section { margin-top:2mm; }
  body[data-print-density="compact"] .document-section h2 { margin:2mm 0; }
  body[data-print-density="compact"] .document-totals { padding:2mm; margin:2mm 0 2mm auto; }
  body[data-print-density="compact"] .document-total { margin:1mm 0; }
  body[data-print-density="compact"] .document-signatures { margin-top:6mm; }
  body[data-print-density="compact"] .document-footer { margin-top:3mm; padding-top:2mm; }
  /* Existing HTML report adapters retain their complete content and section boundaries. */
  .report-page { height: auto !important; min-height: 0 !important; overflow: visible !important; width: auto !important; padding: 0 !important; display: block !important; }
  .report-page, .report-page:not(:last-child), .report-page + .report-page { break-before: auto !important; break-after: auto !important; page-break-before: auto !important; page-break-after: auto !important; }
  .report-page + .report-page { margin-top: 4mm; }
  .report-page:not(:first-child) .page-header, .report-page:not(:last-child) .page-footer { display: none; }
  p, li, .document-notice, .document-total { break-inside: avoid-page; orphans: 3; widows: 3; }
  [data-print-oversized="true"] { break-inside: auto !important; page-break-inside: auto !important; }
  .document-section h2 { break-after: avoid-page; }
  img:not([data-company-logo]):not(.company-logo):not(.document-logo):not(.prpdf-company-logo), canvas { filter: grayscale(1); }
  .document-logo, [data-company-logo] { filter: none; }
  /* Existing payroll pages are logical content sections; physical pagination is natural. */
  .prpdf-landscape-page, .prpdf-page-card { width: auto !important; height:auto !important; min-height:0 !important; padding:0 !important; overflow:visible !important; break-after:auto !important; page-break-after:auto !important; }
  .prpdf-document-header { grid-template-columns: minmax(0,1fr) minmax(0,1.4fr) minmax(0,1fr) !important; }
  .prpdf-report-shell .prpdf-table-frame { overflow:visible !important; }
  .prpdf-report-shell .prpdf-landscape-page + .prpdf-landscape-page .prpdf-document-header { display:none; }
  .prpdf-report-shell .prpdf-landscape-page:not(:last-child) .prpdf-document-footer { display:none; }
  .page-header, .print-header { border-bottom: 1px solid #dcdcdc !important; padding-bottom: 4mm; }
  .page-report-title { color: #272727 !important; font-size: 12pt !important; }
  .report-title, .title-block h1 { font-size: 19pt !important; letter-spacing: -.02em !important; }
  .report-title-block::after, .title-block::after { display: none !important; }
  .report-meta, .meta-grid { background: #f8f8f8; border: 1px solid #dcdcdc !important; border-radius: 3mm; padding: 4mm !important; }
  .metric, .kpi-card { background: #f5f5f5 !important; border: 1px solid #d2d2d2 !important; border-radius: 3mm !important; min-height: 0 !important; }
  .metric-value, .card-value { font-size: 19pt !important; }
  .section-heading { border-bottom: 1px solid #dcdcdc !important; }
  .section-heading h2 { font-size: 12pt !important; }
  .page-body { min-height: auto !important; }
  .page-footer { position: static !important; margin-top: 5mm; }
  @media print { .report-page { margin: 0 !important; } body > [data-document-content] { display:block !important; } }
`;

export const thermalQuotationTheme = `
  body { font-family: "Segoe UI", Arial, sans-serif; font-variant-numeric: tabular-nums; }
  header { border-bottom: 1px solid #111; padding-bottom: 3mm; }
  h1 { font-size: 15px; } h2 { font-size: 13px; }
  p, span, strong { overflow-wrap: anywhere; }
  section, footer { border-color: #111; }
`;
