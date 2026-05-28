import type { PublicCatalogConfig, PublicCatalogLink } from '../types/publicCatalogTypes';

export function createPublicCatalogId() {
  return `public-catalog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getPublicCatalogTimestamp() {
  return new Date().toISOString().slice(0, 10);
}

export function createPublicCatalogLink(): PublicCatalogLink {
  const token = `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const origin = typeof window === 'undefined' ? 'http://localhost:5173' : window.location.origin;

  return {
    token,
    url: `${origin}/public-catalog/${token}`,
    generatedAt: new Date().toISOString(),
  };
}

export function createQrImageDataUrl(value: string) {
  const cells = 21;
  const cellSize = 6;
  const size = cells * cellSize;
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  const rects: string[] = [];

  for (let row = 0; row < cells; row += 1) {
    for (let column = 0; column < cells; column += 1) {
      const finder =
        (row < 7 && column < 7)
        || (row < 7 && column >= cells - 7)
        || (row >= cells - 7 && column < 7);
      const filled = finder || ((row * 17 + column * 31 + hash) % 5 < 2);

      if (filled) {
        rects.push(`<rect x="${column * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" rx="1"/>`);
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="white"/> <g fill="#0f172a">${rects.join('')}</g></svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function downloadQrImage(catalog: PublicCatalogConfig) {
  if (!catalog.qrImageDataUrl) {
    return;
  }

  const link = document.createElement('a');
  link.href = catalog.qrImageDataUrl;
  link.download = `${catalog.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'public-catalog'}-qr.svg`;
  link.click();
}
