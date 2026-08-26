export const productImageFileAccept = 'image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif';
export const productImageMaximumEdge = 1920;
const productImageWebpQuality = 0.82;
const optimizableProductImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export function isSupportedProductImageType(contentType: string) {
  return productImageFileAccept.split(',').includes(contentType.toLowerCase());
}

export function getProductImageTargetDimensions(width: number, height: number, maximumEdge = productImageMaximumEdge) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || maximumEdge <= 0) {
    return { width: 0, height: 0 };
  }

  const scale = Math.min(1, maximumEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function optimizeProductImageFile(file: File): Promise<File> {
  if (!optimizableProductImageTypes.has(file.type.toLowerCase()) || typeof document === 'undefined' || typeof createImageBitmap !== 'function') {
    return file;
  }

  let bitmap: ImageBitmap | null = null;

  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const dimensions = getProductImageTargetDimensions(bitmap.width, bitmap.height);
    if (dimensions.width === 0 || dimensions.height === 0) return file;

    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);
    const optimizedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', productImageWebpQuality);
    });
    canvas.width = 1;
    canvas.height = 1;

    if (!optimizedBlob) return file;
    const wasResized = dimensions.width !== bitmap.width || dimensions.height !== bitmap.height;
    if (!wasResized && optimizedBlob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^/.]+$/, '').trim() || 'product-image';
    return new File([optimizedBlob], `${baseName}.webp`, {
      type: 'image/webp',
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
