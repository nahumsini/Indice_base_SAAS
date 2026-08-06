import {
  escapeDocumentPrintHtml,
  printDocumentHtml,
} from '../../../shared/print/documentHtmlPrintEngine';

export const escapePrintHtml = (value: string) => escapeDocumentPrintHtml(value);

const timeTablePrintStyles = `
  body { padding: 10mm; }
  h1, h2, p { margin: 0; }
  .report-shell { color: #24272c; }
  .document-header { border-bottom: 1px solid #cfd4d8; padding-bottom: 13px; }
  .document-topline { align-items: center; display: flex; justify-content: space-between; gap: 18px; }
  .brand-lockup { align-items: center; display: inline-flex; min-width: 0; }
  .brand-text { align-items: baseline; display: inline-flex; gap: 12px; }
  .brand-text strong, .report-id { color: #24272c; font-size: 11px; font-weight: 500; }
  .brand-text span { color: #626a73; font-size: 10px; font-weight: 400; }
  .title-block { margin-top: 20px; max-width: 720px; }
  .kicker { color: #52677d; font-size: 10px; font-weight: 400; margin-bottom: 8px; }
  .title-block h1 { color: #181b1f; font-size: 28px; font-weight: 500; line-height: 1.08; }
  .title-block::after { background: #5879ae; content: ""; display: block; height: 3px; margin-top: 15px; width: 72px; }
  .meta-grid { border-bottom: 1px solid #d7d9dc; border-top: 1px solid #d7d9dc; display: grid; gap: 24px; grid-template-columns: .8fr 1.5fr; margin-top: 18px; padding: 12px 0; }
  .meta-label { color: #6b7280; display: block; font-size: 9px; font-weight: 400; line-height: 1.3; }
  .meta-value { color: #202429; display: block; font-size: 14px; font-weight: 500; line-height: 1.25; margin-top: 5px; }
  .metrics { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; margin: 14px 0 12px; }
  .metric { border: 1px solid #d1d5db; min-height: 54px; padding: 8px 9px; }
  .metric-value { color: #283f57; font-size: 19px; font-weight: 500; line-height: 1; }
  .metric-label { color: #4b5563; font-size: 10.5px; font-weight: 400; line-height: 1.25; margin-top: 5px; }
  table { border-collapse: collapse; table-layout: auto; width: 100%; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  th, td { border-bottom: 1px solid #d8dadd; font-size: 10.5px; padding: 7px 8px; text-align: left; vertical-align: top; }
  th { background: #f6f7f7; color: #5f6670; font-size: 9px; font-weight: 500; }
  td strong { color: #202429; font-weight: 500; }
  .muted { color: #64748b; }
  .footer-note { border-top: 1px solid #d1d5db; color: #6b7280; display: flex; font-size: 9px; font-weight: 400; justify-content: space-between; margin-top: 14px; padding-top: 10px; }
`;

export const printHtmlDocument = ({
  title,
  bodyHtml,
  lang,
}: {
  title: string;
  bodyHtml: string;
  lang: string;
}) => printDocumentHtml({
  bodyHtml: `<main class="report-shell">${bodyHtml}</main>`,
  contentStyles: timeTablePrintStyles,
  documentTitle: title,
  locale: lang,
  orientation: 'landscape',
  pageSize: 'a4',
});
