import { printDocumentHtml } from '../../shared/print/documentHtmlPrintEngine';
import { quotationPrintTheme } from '../../shared/print/quotationPrintTheme';
function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getDocumentHtml(element: HTMLElement, title: string) {
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join('\n');

  return `<!doctype html>
<html lang="${escapeHtml(document.documentElement.lang || 'es')}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <base href="${escapeHtml(document.baseURI)}" />
    <title>${escapeHtml(title)}</title>
    ${styles}
    <style>
      @page { size: A4 landscape; margin: 9mm; }
      html, body { background: #fff !important; color: #0f172a !important; margin: 0; min-height: 100%; }
      body { padding: 0; }
      *, *::before, *::after { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .indice-visual-document { box-shadow: none !important; margin: 0 auto !important; max-width: none !important; width: 100% !important; }
      [data-document-screen-only="true"] { display: none !important; }
      button { cursor: default !important; }
      @media print {
        html, body { height: auto; }
      }
    </style>
  </head>
  <body>${element.outerHTML}</body>
</html>`;
}

export function printVisualDocument(element: HTMLElement, title: string, quotationStyle = false, locale = 'es-MX') {
  if (quotationStyle) return printDocumentHtml({
    bodyHtml: element.outerHTML, documentTitle: title, locale, includeApplicationStyles: true,
    contentStyles: `${quotationPrintTheme}
      .indice-visual-document { min-width:0 !important; max-width:none !important; width:100% !important; overflow:visible !important; box-shadow:none !important; border-radius:0 !important; }
      .indice-visual-document [class*="overflow-"] { overflow:visible !important; }
      .indice-visual-document table { min-width:0 !important; }
      .indice-visual-document > header { padding:0 0 5mm !important; }
      .indice-visual-document > header > div:last-child { display:none; }
      .indice-visual-document > div { padding:5mm 0 !important; }
      [data-document-screen-only="true"] { display:none !important; }`,
  });
  const printWindow = window.open('', '_blank', 'width=1280,height=900');
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(getDocumentHtml(element, title));
  printWindow.document.close();
  printWindow.addEventListener('afterprint', () => printWindow.close(), { once: true });
  printWindow.addEventListener('load', () => {
    printWindow.focus();
    printWindow.print();
  }, { once: true });
  return true;
}

export function downloadVisualDocument(element: HTMLElement, title: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([getDocumentHtml(element, title)], { type: 'text/html;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.html') ? fileName : `${fileName}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
