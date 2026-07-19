import type { DocumentPageOrientation, DocumentPageSize } from './documentPrintContract';

export const escapeDocumentPrintHtml = (value: string | number | null | undefined) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const resolvePageRule = (pageSize: DocumentPageSize, orientation: DocumentPageOrientation) => {
  if (pageSize === '58mm' || pageSize === '80mm') {
    return `${pageSize} auto`;
  }
  return `${pageSize.toUpperCase()} ${orientation}`;
};
const currentApplicationStyles = () => Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
  .map((node) => node.outerHTML)
  .join('\n');

export interface DocumentHtmlPrintParams {
  bodyHtml: string;
  contentStyles?: string;
  documentTitle: string;
  includeApplicationStyles?: boolean;
  locale: string;
  orientation?: DocumentPageOrientation;
  pageSize?: DocumentPageSize;
}

export const printDocumentHtml = ({
  bodyHtml,
  contentStyles = '',
  documentTitle,
  includeApplicationStyles = false,
  locale,
  orientation = 'portrait',
  pageSize = 'a4',
}: DocumentHtmlPrintParams) => {
  if (!bodyHtml.trim()) return false;

  const htmlDocument = `<!doctype html>
<html lang="${escapeDocumentPrintHtml(locale)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeDocumentPrintHtml(documentTitle)}</title>
    ${includeApplicationStyles ? currentApplicationStyles() : ''}
    <style>
      @page { size: ${resolvePageRule(pageSize, orientation)}; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        background: #ffffff;
        color: #24272c;
        font-family: "Avenir Next", "Helvetica Neue", "Segoe UI", Arial, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      button, [data-print-exclude="true"] { display: none !important; }
      ${contentStyles}
    </style>
  </head>
  <body>${bodyHtml}</body>
</html>`;

  const blobUrl = URL.createObjectURL(new Blob([htmlDocument], { type: 'text/html;charset=utf-8' }));
  const printWindow = window.open(blobUrl, '_blank');
  if (!printWindow) {
    URL.revokeObjectURL(blobUrl);
    return false;
  }

  const cleanup = () => URL.revokeObjectURL(blobUrl);
  printWindow.addEventListener('load', () => {
    printWindow.focus();
    printWindow.print();
    window.setTimeout(cleanup, 30_000);
  }, { once: true });
  window.setTimeout(cleanup, 60_000);
  return true;
};
