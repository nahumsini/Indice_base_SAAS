import type { DocumentPageOrientation, DocumentPageSize } from './documentPrintContract';
import { notifyDocumentPrintFailure } from './documentPrintFeedback';
import { quotationPrintTheme, thermalQuotationTheme } from './quotationPrintTheme';
import { getWebPrintCopy } from './webPrintCopy';
import { prepareDocumentPrintLayout } from './documentPrintLayout';

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
  notifyOnBlocked?: boolean;
  orientation?: DocumentPageOrientation;
  pageSize?: DocumentPageSize;
  targetWindow?: Window | null;
  presentation?: 'quotation' | 'preserve';
}

export const printDocumentHtml = ({
  bodyHtml,
  contentStyles = '',
  documentTitle,
  includeApplicationStyles = false,
  locale,
  notifyOnBlocked = true,
  orientation = 'portrait',
  pageSize = 'a4',
  targetWindow,
  presentation = 'quotation',
}: DocumentHtmlPrintParams) => {
  if (!bodyHtml.trim()) return false;

  const htmlDocument = `<!doctype html>
<html lang="${escapeDocumentPrintHtml(locale)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeDocumentPrintHtml(documentTitle)}</title>
    ${includeApplicationStyles ? `<base href="${escapeDocumentPrintHtml(document.baseURI)}" />` : ''}
    ${includeApplicationStyles ? currentApplicationStyles() : ''}
    <style>
      @page { size: ${resolvePageRule(pageSize, presentation === 'quotation' ? 'portrait' : orientation)}; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        background: #ffffff;
        color: #24272c;
        font-family: "Avenir Next", "Helvetica Neue", "Segoe UI", Arial, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      button { display: none !important; }
      @media print { [data-print-exclude="true"] { display: none !important; } }
      ${contentStyles}
      ${presentation === 'quotation' ? (pageSize === '80mm' || pageSize === '58mm' ? thermalQuotationTheme : quotationPrintTheme) : ''}
      @media print { body > [data-document-content] { display: block !important; } }
      ${presentation === 'quotation' && pageSize !== '80mm' && pageSize !== '58mm' ? `@page { margin: 10mm; } body { padding: 0; }` : ''}
    </style>
  </head>
  <body><aside data-print-exclude="true" style="padding:12px;font:14px/1.5 sans-serif;background:#f7f7f7;color:#222">${escapeDocumentPrintHtml(getWebPrintCopy(locale).help)}</aside><div data-document-content>${bodyHtml}</div></body>
</html>`;

  const blobUrl = URL.createObjectURL(new Blob([htmlDocument], { type: 'text/html;charset=utf-8' }));
  const printWindow = targetWindow ?? window.open(blobUrl, '_blank');
  if (!printWindow) {
    URL.revokeObjectURL(blobUrl);
    if (notifyOnBlocked) notifyDocumentPrintFailure(locale, 'popup-blocked');
    return false;
  }

  let printed = false;
  let readinessTimer: number | undefined;
  const cleanup = () => {
    window.clearInterval(readinessTimer);
    URL.revokeObjectURL(blobUrl);
  };
  const printWhenReady = async () => {
    if (printed) return;
    if (printWindow.closed) { cleanup(); return; }
    try {
      // A reserved about:blank window replaces its document during navigation.
      // Its old load listeners can disappear; observe readiness from the opener too.
      if (printWindow.location.href !== blobUrl || printWindow.document.readyState !== 'complete') return;
      printed = true;
      window.clearInterval(readinessTimer);
      // Font/image readiness is shared by every web-print adapter, including QR posters.
      await Promise.race([
        Promise.all([
          printWindow.document.fonts?.ready,
          ...Array.from(printWindow.document.images).map(image => image.complete ? Promise.resolve() : new Promise<void>(resolve => {
            image.addEventListener('load', () => resolve(), { once: true });
            image.addEventListener('error', () => { image.style.display = 'none'; resolve(); }, { once: true });
          })),
        ]),
        new Promise(resolve => window.setTimeout(resolve, 5000)),
      ]);
      if (printWindow.closed) { cleanup(); return; }
      Array.from(printWindow.document.images).filter(image => image.complete && image.naturalWidth === 0).forEach(image => { image.style.display = 'none'; });
      if (presentation === 'quotation') prepareDocumentPrintLayout(printWindow.document, pageSize);
      printWindow.focus();
      printWindow.print();
      window.setTimeout(cleanup, 30_000);
    } catch {
      cleanup();
      if (notifyOnBlocked) notifyDocumentPrintFailure(locale, 'generation');
    }
  };
  printWindow.addEventListener('load', printWhenReady, { once: true });
  readinessTimer = window.setInterval(printWhenReady, 100);
  if (targetWindow) printWindow.location.replace(blobUrl);
  window.setTimeout(cleanup, 60_000);
  return true;
};
