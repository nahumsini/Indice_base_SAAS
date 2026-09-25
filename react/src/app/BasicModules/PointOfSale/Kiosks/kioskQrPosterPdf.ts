import { escapeDocumentPrintHtml as escape, printDocumentHtml } from '../../shared/print/documentHtmlPrintEngine';
import { notifyDocumentPrintFailure } from '../../shared/print/documentPrintFeedback';
type KioskQrPosterInput = {
  kioskName: string;
  kioskCode: string;
  publicUrl: string;
  kioskType: 'self_service' | 'self_checkout';
  assignmentLabel?: string;
  locale?: string;
};

const posterCopy = {
  es: {
    scan: 'Escanea el código QR con la cámara de tu celular',
    generated: 'Material generado',
    self_service: {
      eyebrow: 'PEDIDO DE AUTOSERVICIO',
      title: 'Escanea y crea tu pedido',
      description: 'Elige tus productos desde tu celular y muestra el código de 3 dígitos en caja.',
      steps: ['1. Escanea', '2. Elige tus productos', '3. Muestra tu código en caja'],
      footer: 'El pedido no aparta inventario ni realiza el cobro. Precio y existencia se confirman en caja.',
    },
    self_checkout: {
      eyebrow: 'AUTOCOBRO MÓVIL',
      title: 'Escanea y realiza tu compra',
      description: 'Elige tus productos desde tu celular y continúa con las opciones de pago disponibles.',
      steps: ['1. Escanea', '2. Elige tus productos', '3. Finaliza tu compra'],
      footer: 'Los métodos de pago disponibles dependen de la configuración del establecimiento. Precio y existencia se validan al finalizar.',
    },
  },
  en: {
    scan: 'Scan the QR code with your phone camera',
    generated: 'Material generated',
    self_service: {
      eyebrow: 'SELF-SERVICE ORDER',
      title: 'Scan and create your order',
      description: 'Choose your products on your phone and show the 3-digit code at the register.',
      steps: ['1. Scan', '2. Choose your products', '3. Show your code at the register'],
      footer: 'The order does not reserve inventory or collect payment. Price and availability are confirmed at the register.',
    },
    self_checkout: {
      eyebrow: 'MOBILE SELF-CHECKOUT',
      title: 'Scan and complete your purchase',
      description: 'Choose products on your phone and continue with the available payment options.',
      steps: ['1. Scan', '2. Choose your products', '3. Complete your purchase'],
      footer: 'Available payment methods depend on the store configuration. Price and availability are validated at checkout.',
    },
  },
} as const;

function safeFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'kiosco';
}

export async function createKioskQrPosterPdf({
  kioskName,
  kioskCode,
  publicUrl,
  kioskType,
  assignmentLabel = '',
  locale = 'es-MX',
}: KioskQrPosterInput) {
  const [{ jsPDF }, { default: QRCode }] = await Promise.all([
    import('jspdf'),
    import('qrcode'),
  ]);
  const languageCopy = locale.toLowerCase().startsWith('es') ? posterCopy.es : posterCopy.en;
  const copy = { ...languageCopy, ...languageCopy[kioskType] };
  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    errorCorrectionLevel: 'H',
    margin: 3,
    width: 1600,
    color: { dark: '#0F172A', light: '#FFFFFF' },
  });
  const doc = new jsPDF({ format: 'a4', orientation: 'portrait', unit: 'mm' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = 174;
  const left = (pageWidth - contentWidth) / 2;

  doc.setProperties({
    title: `${copy.eyebrow} - ${kioskName}`,
    subject: kioskType === 'self_checkout'
      ? 'QR de acceso público para autocobro móvil'
      : 'QR de acceso público para autoservicio y pre-ticket',
    author: kioskName,
    creator: kioskName,
  });

  doc.setFillColor(15, 118, 110);
  doc.roundedRect(10, 10, pageWidth - 20, 52, 5, 5, 'F');
  doc.setTextColor(204, 251, 241);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(copy.eyebrow, left, 24);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text(copy.title, left, 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text(doc.splitTextToSize(copy.description, contentWidth), left, 47);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(kioskName, pageWidth / 2, 76, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  const context = [assignmentLabel, kioskCode].filter(Boolean).join('  -  ');
  if (context) doc.text(context, pageWidth / 2, 83, { align: 'center' });

  const qrSize = 112;
  const qrLeft = (pageWidth - qrSize) / 2;
  doc.setDrawColor(204, 251, 241);
  doc.setLineWidth(1.2);
  doc.roundedRect(qrLeft - 5, 90, qrSize + 10, qrSize + 10, 5, 5, 'S');
  doc.addImage(qrDataUrl, 'PNG', qrLeft, 95, qrSize, qrSize, undefined, 'FAST');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 118, 110);
  doc.text(copy.scan, pageWidth / 2, 218, { align: 'center' });

  const stepWidth = contentWidth / copy.steps.length;
  copy.steps.forEach((step, index) => {
    const x = left + index * stepWidth + stepWidth / 2;
    doc.setFillColor(240, 253, 250);
    doc.roundedRect(left + index * stepWidth + 1.5, 226, stepWidth - 3, 17, 3, 3, 'F');
    doc.setTextColor(15, 118, 110);
    doc.setFontSize(8.5);
    doc.text(doc.splitTextToSize(step, stepWidth - 8), x, 235, { align: 'center' });
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const visibleUrl = publicUrl.replace(/^https?:\/\//, '');
  doc.text(doc.splitTextToSize(visibleUrl, contentWidth - 12), pageWidth / 2, 251, { align: 'center' });

  doc.setDrawColor(226, 232, 240);
  doc.line(left, 265, left + contentWidth, 265);
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(doc.splitTextToSize(copy.footer, 132), left, 273);
  doc.setFontSize(7.5);
  doc.text(`${copy.generated}: ${new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date())}`, left + contentWidth, 273, { align: 'right' });

  return {
    doc,
    fileName: `${safeFileName(kioskName)}-qr-${kioskType === 'self_checkout' ? 'autocobro' : 'autoservicio'}.pdf`,
  };
}

export async function downloadKioskQrPosterPdf(input: KioskQrPosterInput, reservedWindow?: Window | null) {
  const targetWindow = reservedWindow === undefined ? window.open('about:blank', '_blank') : reservedWindow;
  const locale = input.locale ?? 'es-MX';
  if (!targetWindow) { notifyDocumentPrintFailure(locale, 'popup-blocked'); return false; }
  try {
    const { default: QRCode } = await import('qrcode');
    const languageCopy = locale.toLowerCase().startsWith('es') ? posterCopy.es : posterCopy.en;
    const copy = { ...languageCopy, ...languageCopy[input.kioskType] };
    const qr = await QRCode.toDataURL(input.publicUrl, { errorCorrectionLevel: 'H', margin: 3, width: 1600, color: { dark: '#000000', light: '#FFFFFF' } });
    return printDocumentHtml({
      targetWindow, locale, documentTitle: `${safeFileName(input.kioskName)}-qr-${input.kioskType}`, pageSize: 'a4',
      bodyHtml: `<article class="quotation-document">
        <header class="document-header"><div class="document-identity">${escape(input.kioskName)}</div><h1>${escape(copy.title)}</h1><div class="document-reference">${escape(input.kioskCode)}</div></header>
        <p class="document-subtitle">${escape(copy.description)}</p>
        <p>${escape(input.assignmentLabel)}</p>
        <section class="qr-poster"><img src="${escape(qr)}" alt="${escape(copy.scan)}" /><h2>${escape(copy.scan)}</h2>
        <p>${copy.steps.map(escape).join(' · ')}</p><p class="qr-url">${escape(input.publicUrl)}</p></section>
        <p class="document-notice">${escape(copy.footer)}</p>
        <footer class="document-footer">${escape(copy.generated)}: ${escape(new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date()))}</footer>
      </article>`,
      contentStyles: '.qr-poster { text-align:center; break-inside:avoid; } .qr-poster img { width:112mm; height:112mm; margin:8mm auto; display:block; } .qr-url { overflow-wrap:anywhere; font-size:8pt; }',
    });
  } catch {
    targetWindow.close();
    notifyDocumentPrintFailure(locale, 'generation');
    return false;
  }
}
