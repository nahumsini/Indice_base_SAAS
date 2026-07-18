import { buildKpiPrintDocumentTitle } from './kpiPrintFileName';
import type { CompanyPrintIdentity } from './useCompanyPrintIdentity';

export const escapeKpiPrintHtml = (value: string | number | null | undefined) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const resolvePrintImageUrl = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return '';

  try {
    const resolvedUrl = new URL(trimmedValue, window.location.origin);
    if (resolvedUrl.protocol === 'data:' && !trimmedValue.toLowerCase().startsWith('data:image/')) {
      return '';
    }
    return ['http:', 'https:', 'data:', 'blob:'].includes(resolvedUrl.protocol) ? resolvedUrl.href : '';
  } catch {
    return '';
  }
};

const updatedLabelForLocale = (locale: string) => {
  const language = locale.toLowerCase().split('-')[0];
  return ({
    en: 'Updated',
    es: 'Actualizado',
    fr: 'Mis à jour',
    ko: '업데이트',
    pt: 'Atualizado',
    zh: '更新',
  } as Record<string, string>)[language] ?? 'Updated';
};

export interface KpiHtmlPrintReportParams {
  companyIdentity: CompanyPrintIdentity;
  contentStyles?: string;
  documentName: string;
  locale: string;
  pageBodies: string[];
  reportTitle: string;
  updatedAt: Date;
}

export const printKpiHtmlReport = ({
  companyIdentity,
  contentStyles = '',
  documentName,
  locale,
  pageBodies,
  reportTitle,
  updatedAt,
}: KpiHtmlPrintReportParams) => {
  const companyName = companyIdentity.name.trim();
  const companyLogoUrl = resolvePrintImageUrl(companyIdentity.logoUrl);
  const documentTitle = buildKpiPrintDocumentTitle({ companyName, documentName, printedAt: updatedAt });
  const updatedValue = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(updatedAt);
  const companyIdentityHtml = companyLogoUrl || companyName
    ? `
      <div class="company-identity">
        ${companyLogoUrl ? `<img class="company-logo" src="${escapeKpiPrintHtml(companyLogoUrl)}" alt="${escapeKpiPrintHtml(companyName)}" />` : ''}
        ${companyName ? `<span class="company-name">${escapeKpiPrintHtml(companyName)}</span>` : ''}
      </div>`
    : '';
  const pages = pageBodies.length > 0 ? pageBodies : [''];
  const reportHtml = pages.map((pageBody, index) => `
    <section class="report-page">
      <header class="page-header">
        ${companyIdentityHtml}
        <p class="page-report-title">${escapeKpiPrintHtml(reportTitle)}</p>
      </header>
      <div class="page-body">${pageBody}</div>
      <footer class="page-footer">
        <span>Powered by www.indiceapp.com · ${escapeKpiPrintHtml(updatedLabelForLocale(locale))}: ${escapeKpiPrintHtml(updatedValue)}</span>
        <span>${index + 1} / ${pages.length}</span>
      </footer>
    </section>
  `).join('');

  const htmlDocument = `<!doctype html>
<html lang="${escapeKpiPrintHtml(locale)}">
  <head>
    <meta charset="utf-8" />
    <title>${escapeKpiPrintHtml(documentTitle)}</title>
    <style>
      @page { size: A4 portrait; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; color: #24272c; font-family: "Avenir Next", "Helvetica Neue", "Segoe UI", Arial, sans-serif; }
      body { background: #eef1f4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      h1, h2, h3, p { margin: 0; }
      strong { font-weight: 500; }
      .report-shell { margin: 0; padding: 0; }
      .report-page { background: #ffffff; display: flex; flex-direction: column; height: 297mm; overflow: hidden; padding: 12mm 14mm 10mm; width: 210mm; }
      .report-page:not(:last-child) { break-after: page; page-break-after: always; }
      .page-header { align-items: center; border-bottom: 1.5px solid #cfd4d8; display: flex; flex: 0 0 auto; gap: 14px; justify-content: space-between; min-height: 12mm; padding-bottom: 9px; }
      .company-identity { align-items: center; display: flex; gap: 10px; min-width: 0; }
      .company-logo { display: block; flex: 0 0 auto; max-height: 10mm; max-width: 27mm; object-fit: contain; }
      .company-name { color: #202328; font-size: 14px; font-weight: 500; line-height: 1.15; max-width: 88mm; overflow-wrap: anywhere; }
      .page-report-title { color: #646b73; flex: 0 0 auto; font-size: 9px; font-weight: 400; max-width: 45mm; text-align: right; }
      .page-header > .page-report-title:only-child { margin-left: auto; }
      .page-body { flex: 1 1 auto; min-height: 0; padding-top: 14px; }
      .page-footer { align-items: center; border-top: 1px solid #d8dadd; color: #7a8088; display: flex; flex: 0 0 auto; font-size: 8px; font-weight: 400; justify-content: space-between; margin-top: 10px; padding-top: 7px; }
      .report-title-block { margin-bottom: 14px; }
      .report-kicker { color: #686e76; font-size: 9px; font-weight: 400; margin-bottom: 7px; }
      .report-title { color: #181b1f; font-size: 34px; font-weight: 500; letter-spacing: -0.04em; line-height: 1.06; }
      .report-title-block::after { background: #2f7d73; content: ""; display: block; height: 3px; margin-top: 13px; width: 64px; }
      .report-meta { border-bottom: 1px solid #d7d9dc; border-top: 1px solid #d7d9dc; display: grid; gap: 10px 18px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 13px; padding: 9px 0; }
      .meta-label { color: #6b7280; display: block; font-size: 9px; font-weight: 400; line-height: 1.3; }
      .meta-value { color: #172033; display: block; font-size: 12px; font-weight: 400; line-height: 1.25; margin-top: 3px; }
      .metrics { display: grid; gap: 9px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 12px 0; }
      .metric { background: #fcfcfb; border: 1px solid #cfd4d8; border-radius: 3px; min-height: 72px; padding: 12px 13px; }
      .metric-value { color: #171a1e; font-size: 25px; font-weight: 500; line-height: 1; }
      .metric-label { color: #475569; font-size: 11px; font-weight: 400; line-height: 1.25; margin-top: 7px; }
      .report-section { margin-top: 12px; }
      .section-heading { align-items: end; border-bottom: 2px solid #363b40; display: flex; justify-content: space-between; margin-bottom: 13px; padding-bottom: 8px; }
      .section-heading h2 { color: #202429; font-size: 22px; font-weight: 500; letter-spacing: -0.02em; }
      table { border-collapse: collapse; width: 100%; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; page-break-inside: avoid; }
      th, td { border-bottom: 1px solid #e1e4e7; font-size: 9px; font-weight: 400; line-height: 1.25; padding: 7px 8px; text-align: left; vertical-align: top; }
      th { background: #f6f7f7; color: #6b7280; }
      .muted { color: #64748b; }
      ${contentStyles}
      @media print {
        html, body { background: #ffffff; height: auto; }
        .report-page { margin: 0; }
      }
    </style>
  </head>
  <body><main class="report-shell">${reportHtml}</main></body>
</html>`;

  const blob = new Blob([htmlDocument], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const printWindow = window.open(blobUrl, '_blank');
  if (!printWindow) {
    URL.revokeObjectURL(blobUrl);
    return false;
  }

  const cleanup = () => URL.revokeObjectURL(blobUrl);
  printWindow.addEventListener('load', () => {
    printWindow.focus();
    printWindow.print();
    setTimeout(cleanup, 30_000);
  }, { once: true });
  setTimeout(cleanup, 60_000);
  return true;
};
