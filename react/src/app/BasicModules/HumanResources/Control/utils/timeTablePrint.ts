export const escapePrintHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const printHtmlDocument = ({
  title,
  bodyHtml,
  lang,
}: {
  title: string;
  bodyHtml: string;
  lang: string;
}) => {
  const htmlDocument = `<!doctype html>
<html lang="${escapePrintHtml(lang)}">
  <head>
    <meta charset="utf-8" />
    <title>${escapePrintHtml(title)}</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      html, body { margin: 0; padding: 0; color: #111827; font-family: "Segoe UI", Arial, Helvetica, sans-serif; }
      body { background: #ffffff; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      h1, h2, p { margin: 0; }
      .report-shell { padding: 18px 18px 20px; }
      .document-header { border-bottom: 1px solid #d1d5db; padding-bottom: 13px; }
      .document-topline { align-items: center; display: flex; justify-content: space-between; gap: 18px; }
      .brand-lockup { align-items: center; display: inline-flex; gap: 11px; min-width: 0; }
      .indice-mark { align-items: end; display: inline-grid; gap: 3px; grid-template-columns: repeat(4, 7px); height: 25px; }
      .indice-mark span { border-radius: 7px 7px 3px 3px; display: block; width: 7px; }
      .indice-mark span:nth-child(1) { background: #ff6b5e; height: 11px; }
      .indice-mark span:nth-child(2) { background: #f4c84a; height: 15px; }
      .indice-mark span:nth-child(3) { background: #59c3a5; height: 20px; }
      .indice-mark span:nth-child(4) { background: #2563eb; height: 25px; }
      .brand-text { align-items: baseline; display: inline-flex; gap: 12px; }
      .brand-text strong,
      .report-id { color: #111827; font-size: 11px; font-weight: 850; letter-spacing: 0.14em; text-transform: uppercase; }
      .brand-text span { color: #4b5563; font-size: 10px; font-weight: 750; letter-spacing: 0.1em; text-transform: uppercase; }
      .title-block { margin-top: 22px; max-width: 720px; }
      .kicker { color: #1f3a5f; font-size: 10px; font-weight: 850; letter-spacing: 0.14em; margin-bottom: 8px; text-transform: uppercase; }
      .title-block h1 { color: #111827; font-size: 28px; font-weight: 850; letter-spacing: 0; line-height: 1.08; }
      .title-block::after {
        background: linear-gradient(90deg, #ff6b5e 0 25%, #f4c84a 25% 50%, #59c3a5 50% 75%, #2563eb 75% 100%);
        content: "";
        display: block;
        height: 3px;
        margin-top: 15px;
        width: 96px;
      }
      .meta-grid { border-bottom: 1px solid #d1d5db; border-top: 1px solid #d1d5db; display: grid; gap: 24px; grid-template-columns: 0.8fr 1.5fr; margin-top: 18px; padding: 12px 0; }
      .meta-label { color: #6b7280; display: block; font-size: 9px; font-weight: 850; letter-spacing: 0.1em; line-height: 1.3; text-transform: uppercase; }
      .meta-value { color: #111827; display: block; font-size: 14px; font-weight: 800; line-height: 1.25; margin-top: 5px; }
      .metrics { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; margin: 14px 0 12px; }
      .metric { border: 1px solid #d1d5db; min-height: 54px; padding: 8px 9px; }
      .metric-value { color: #1f3a5f; font-size: 19px; font-weight: 850; line-height: 1; }
      .metric-label { color: #4b5563; font-size: 10.5px; font-weight: 700; line-height: 1.25; margin-top: 5px; }
      table { width: 100%; border-collapse: collapse; table-layout: auto; }
      th, td { border: 1px solid #d1d5db; padding: 7px 8px; font-size: 10.5px; text-align: left; vertical-align: top; }
      th { background: #f3f4f6; color: #111827; font-size: 9px; font-weight: 850; letter-spacing: 0.08em; text-transform: uppercase; }
      td strong { color: #111827; font-weight: 850; }
      .muted { color: #64748b; }
      .footer-note { border-top: 1px solid #d1d5db; color: #6b7280; display: flex; font-size: 9px; font-weight: 750; justify-content: space-between; letter-spacing: 0.06em; margin-top: 14px; padding-top: 10px; text-transform: uppercase; }
    </style>
  </head>
  <body>
    <main class="report-shell">${bodyHtml}</main>
  </body>
</html>`;

  const blob = new Blob([htmlDocument], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const printWindow = window.open(blobUrl, '_blank');
  if (!printWindow) {
    URL.revokeObjectURL(blobUrl);
    return false;
  }
  const cleanup = () => {
    URL.revokeObjectURL(blobUrl);
  };
  printWindow.addEventListener('load', () => {
    printWindow.focus();
    printWindow.print();
    setTimeout(cleanup, 30_000);
  }, { once: true });
  setTimeout(cleanup, 60_000);
  return true;
};
