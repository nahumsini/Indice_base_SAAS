import { getProductImageTargetDimensions } from '../../utils/productImageOptimization';
import type { PublicCatalogItem } from '../types/publicCatalogTypes';
import { publicCatalogImages } from './publicCatalogPresentation';

const referenceImageMaximumEdge = 1200;
const referenceImageWebpQuality = 0.65;
const maximumReferenceImages = 12;
const maximumSourceBytes = 12 * 1024 * 1024;
const downloadTimeoutMilliseconds = 15_000;

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};

export type ReferenceImageDownloadResult = {
  downloaded: number;
  skipped: number;
};

function safeFileSegment(value: string, fallback: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
  return normalized || fallback;
}

async function fetchImageBlob(url: string) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), downloadTimeoutMilliseconds);

  try {
    const response = await fetch(url, {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('Image download failed.');

    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > maximumSourceBytes) {
      await response.body?.cancel();
      throw new Error('Image is too large.');
    }

    const blob = await response.blob();
    if (!blob.type.toLowerCase().startsWith('image/') || blob.size > maximumSourceBytes) {
      throw new Error('Invalid image response.');
    }
    return blob;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function decodeImage(blob: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  image.decoding = 'async';
  image.src = objectUrl;
  try {
    await image.decode();
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

async function prepareReferenceImage(url: string) {
  const sourceBlob = await fetchImageBlob(url);
  const decoded = await decodeImage(sourceBlob);

  try {
    const dimensions = getProductImageTargetDimensions(
      decoded.width,
      decoded.height,
      referenceImageMaximumEdge,
    );
    if (dimensions.width === 0 || dimensions.height === 0) throw new Error('Invalid image dimensions.');

    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image conversion is unavailable.');

    context.drawImage(decoded.source, 0, 0, dimensions.width, dimensions.height);
    const result = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', referenceImageWebpQuality);
    });
    canvas.width = 1;
    canvas.height = 1;
    if (!result) throw new Error('Image conversion failed.');
    return result;
  } finally {
    decoded.close();
  }
}

function saveBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}

export async function downloadReferenceProductImages(
  item: PublicCatalogItem,
): Promise<ReferenceImageDownloadResult> {
  const sourceImages = publicCatalogImages(item);
  const selectedImages = sourceImages.slice(0, maximumReferenceImages);
  const prepared: Array<{ name: string; blob: Blob }> = [];
  const productName = safeFileSegment(item.name, `producto-${item.id}`);

  for (const [index, image] of selectedImages.entries()) {
    try {
      prepared.push({
        name: `${productName}-${String(index + 1).padStart(2, '0')}.webp`,
        blob: await prepareReferenceImage(image.url),
      });
    } catch {
      // A remote image without CORS support must not block the remaining downloads.
    }
  }

  const skipped = sourceImages.length - prepared.length;
  if (prepared.length === 0) throw new Error('No reference image could be prepared.');

  if (prepared.length === 1) {
    saveBlob(prepared[0].blob, prepared[0].name);
  } else {
    const { zipSync } = await import('fflate');
    const files = Object.fromEntries(await Promise.all(prepared.map(async ({ name, blob }) => (
      [name, new Uint8Array(await blob.arrayBuffer())]
    ))));
    const zip = zipSync(files, { level: 0 });
    const zipBuffer = new ArrayBuffer(zip.byteLength);
    new Uint8Array(zipBuffer).set(zip);
    saveBlob(new Blob([zipBuffer], { type: 'application/zip' }), `fotos-${productName}.zip`);
  }

  return { downloaded: prepared.length, skipped };
}
