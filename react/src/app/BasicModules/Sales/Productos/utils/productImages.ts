import type { SalesCatalogItem, SalesProductImage } from '../../types';
import { salesApi } from '../../salesApi';
import type { ProductMediaDraft } from '../types/productosTypes';
import {
  isSupportedProductImageType,
  optimizeProductImageFile,
} from './productImageOptimization';
import { deduplicateProductImages, mergeProductImageCandidates } from './productImageIdentity';

export { productImageFileAccept } from './productImageOptimization';

export function isPersistableProductImageUrl(value?: string | null): boolean {
  const normalized = (value ?? '').trim().toLowerCase();
  return Boolean(normalized) && !normalized.startsWith('data:') && !normalized.startsWith('blob:');
}

export function isTransientProductImageUrl(value?: string | null): boolean {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized.startsWith('blob:') || normalized.startsWith('data:');
}

export function getProductGalleryImages(
  product: Pick<SalesCatalogItem, 'name' | 'imageUrl' | 'imageAlt'>
    & Partial<Pick<SalesCatalogItem, 'id' | 'gallery'>>,
  options: { includeTransient?: boolean } = {},
): SalesProductImage[] {
  const productId = product.id ?? 'product';

  const isUsableUrl = (value?: string | null) => isPersistableProductImageUrl(value)
    || (Boolean(options.includeTransient) && isTransientProductImageUrl(value));

  const primaryImage = isUsableUrl(product.imageUrl)
    ? {
      id: `${productId}-primary`,
      url: product.imageUrl!,
      alt: product.imageAlt || product.name,
    }
    : undefined;
  const galleryImages = (product.gallery ?? []).flatMap((image, index) => {
    if (!isUsableUrl(image.url)) return [];
    return [{
      id: image.id || `${productId}-gallery-${index + 1}`,
      url: image.url,
      alt: image.alt || product.imageAlt || product.name,
      objectKey: image.objectKey,
      fileName: image.fileName,
      contentType: image.contentType,
      sizeBytes: image.sizeBytes,
    }];
  });

  // Gallery entries carry the durable object key. Treat the top-level image URL as
  // a presentation fallback so expiring signed URLs cannot replace that identity.
  return mergeProductImageCandidates(primaryImage, galleryImages);
}

export function parseProductGalleryUrls(value: string, productName: string): SalesProductImage[] | undefined {
  const images = value
    .split('\n')
    .map((line) => line.trim())
    .filter(isPersistableProductImageUrl)
    .map((url, index) => ({
      id: `gallery-${index + 1}`,
      url,
      alt: `${productName} ${index + 2}`,
    }));

  return images.length > 0 ? images : undefined;
}

export function createProductImageGallery({
  productId,
  primaryImageUrl,
  primaryImageAlt,
  galleryUrls,
  uploadedImages,
  productName,
  includeTransientUploads = false,
}: {
  productId: string;
  primaryImageUrl?: string;
  primaryImageAlt?: string;
  galleryUrls?: string;
  uploadedImages: ProductMediaDraft[];
  productName: string;
  includeTransientUploads?: boolean;
}): { imageUrl?: string; imageAlt?: string; gallery: SalesProductImage[] } {
  const urlImages = parseProductGalleryUrls(galleryUrls ?? '', productName) ?? [];
  const uploadedGallery = uploadedImages
    .filter((image) => image.objectKey
      || isPersistableProductImageUrl(image.url)
      || (includeTransientUploads && isTransientProductImageUrl(image.url)))
    .map((image, index) => ({
      id: image.id || `${productId}-upload-${index + 1}`,
      url: image.url,
      alt: image.alt || productName,
      objectKey: image.objectKey,
      fileName: image.fileName,
      contentType: image.contentType,
      sizeBytes: image.sizeBytes,
    }));
  const orderedImages = deduplicateProductImages([
    ...uploadedGallery,
    ...urlImages,
  ]);
  const fallbackPrimary = isPersistableProductImageUrl(primaryImageUrl)
    ? {
        id: `${productId}-primary`,
        url: primaryImageUrl!,
        alt: primaryImageAlt || productName,
      }
    : undefined;
  const gallery = deduplicateProductImages([
    ...orderedImages,
    ...(fallbackPrimary ? [fallbackPrimary] : []),
  ]);
  const firstImage = gallery[0];

  return {
    imageUrl: firstImage?.url,
    imageAlt: firstImage?.alt,
    gallery,
  };
}

export async function readProductImageFiles(files: FileList | File[]): Promise<ProductMediaDraft[]> {
  const fileArray = Array.from(files).filter((file) => isSupportedProductImageType(file.type));
  const drafts: ProductMediaDraft[] = [];

  for (const [index, originalFile] of fileArray.entries()) {
    const file = await optimizeProductImageFile(originalFile);
    drafts.push({
      id: `upload-${Date.now()}-${index}`,
      url: URL.createObjectURL(file),
      alt: originalFile.name.replace(/\.[^/.]+$/, ''),
      source: 'upload',
      file,
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    });
  }

  return drafts;
}

export async function persistProductImageDrafts(images: ProductMediaDraft[]): Promise<ProductMediaDraft[]> {
  const persistedImages: ProductMediaDraft[] = [];

  for (const image of images) {
    if (!image.file) {
      persistedImages.push(image);
      continue;
    }

    const upload = await salesApi.createProductImageUpload({
      fileName: image.file.name,
      contentType: image.file.type || 'application/octet-stream',
      sizeBytes: image.file.size,
    });
    const uploadUrl = upload.uploadUrl ?? upload.upload_url;
    const objectKey = upload.objectKey ?? upload.object_key;
    const uploadHeaders = upload.uploadHeaders ?? upload.upload_headers;

    if (!uploadUrl || !objectKey) {
      throw new Error('Product image upload URL was not returned.');
    }

    await salesApi.uploadProductImageFile(uploadUrl, image.file, uploadHeaders);

    persistedImages.push({
      ...image,
      objectKey,
      fileName: upload.fileName ?? image.file.name,
      contentType: upload.contentType ?? image.file.type,
      sizeBytes: upload.sizeBytes ?? image.file.size,
      file: undefined,
    });
  }

  return persistedImages;
}

export async function registerPersistedProductImages(productId: number | string, images: ProductMediaDraft[]) {
  const imagesToRegister = images.filter((image) => image.source === 'upload' && image.objectKey);

  await Promise.all(imagesToRegister.map((image) => salesApi.registerProductImage(productId, {
    objectKey: image.objectKey!,
    fileName: image.fileName,
    contentType: image.contentType,
    sizeBytes: image.sizeBytes,
    alt: image.alt,
  })));
}
