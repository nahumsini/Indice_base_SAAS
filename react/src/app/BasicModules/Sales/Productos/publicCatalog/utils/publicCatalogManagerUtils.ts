import QRCode from 'qrcode';
import type { PublicCatalogConfig } from '../types/publicCatalogTypes';

export function createPublicCatalogId() {
  return `public-catalog-${crypto.randomUUID()}`;
}

export function getPublicCatalogTimestamp() {
  return new Date().toISOString().slice(0, 10);
}

export function createQrImageDataUrl(value: string) {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 720,
    color: { dark: '#0f172a', light: '#ffffff' },
  });
}

export function downloadQrImage(catalog: PublicCatalogConfig) {
  if (!catalog.qrImageDataUrl) {
    return;
  }

  const link = document.createElement('a');
  link.href = catalog.qrImageDataUrl;
  link.download = `${catalog.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'public-catalog'}-qr.png`;
  link.click();
}
