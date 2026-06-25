import type { SalesCatalogItem, SalesProductImage } from '../../types';
import { salesApi } from '../../salesApi';
import type { ProductMediaDraft } from '../types/productosTypes';

export function isPersistableProductImageUrl(value?: string | null): boolean {
  const normalized = (value ?? '').trim().toLowerCase();
  return Boolean(normalized) && !normalized.startsWith('data:') && !normalized.startsWith('blob:');
}

export function getProductGalleryImages(product: SalesCatalogItem): SalesProductImage[] {
  const images: SalesProductImage[] = [];

  if (isPersistableProductImageUrl(product.imageUrl)) {
    images.push({
      id: `${product.id}-primary`,
      url: product.imageUrl,
      alt: product.imageAlt || product.name,
    });
  }

  product.gallery?.forEach((image, index) => {
    if (!isPersistableProductImageUrl(image.url) || images.some((item) => item.url === image.url)) {
      return;
    }

    images.push({
      id: image.id || `${product.id}-gallery-${index + 1}`,
      url: image.url,
      alt: image.alt || product.imageAlt || product.name,
      objectKey: image.objectKey,
      fileName: image.fileName,
      contentType: image.contentType,
      sizeBytes: image.sizeBytes,
    });
  });

  return images;
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
}: {
  productId: string;
  primaryImageUrl?: string;
  primaryImageAlt?: string;
  galleryUrls?: string;
  uploadedImages: ProductMediaDraft[];
  productName: string;
}): { imageUrl?: string; imageAlt?: string; gallery?: SalesProductImage[] } {
  const urlImages = parseProductGalleryUrls(galleryUrls ?? '', productName) ?? [];
  const uploadedGallery = uploadedImages
    .filter((image) => image.objectKey || isPersistableProductImageUrl(image.url))
    .map((image, index) => ({
      id: image.id || `${productId}-upload-${index + 1}`,
      url: image.url,
      alt: image.alt || productName,
      objectKey: image.objectKey,
      fileName: image.fileName,
      contentType: image.contentType,
      sizeBytes: image.sizeBytes,
    }));
  const orderedImages = [
    ...uploadedGallery,
    ...urlImages,
  ];
  const firstImage = orderedImages[0];
  const fallbackPrimary = isPersistableProductImageUrl(primaryImageUrl)
    ? {
        id: `${productId}-primary`,
        url: primaryImageUrl!,
        alt: primaryImageAlt || productName,
      }
    : undefined;
  const imageUrl = firstImage?.url || fallbackPrimary?.url;
  const imageAlt = firstImage?.alt || fallbackPrimary?.alt;
  const gallery = [
    ...orderedImages,
    ...(fallbackPrimary && fallbackPrimary.url !== imageUrl ? [fallbackPrimary] : []),
  ].filter((image, index, images) => images.findIndex((item) => item.url === image.url) === index);

  return {
    imageUrl,
    imageAlt,
    gallery: gallery.length > 0 ? gallery : undefined,
  };
}

export function readProductImageFiles(files: FileList | File[]): Promise<ProductMediaDraft[]> {
  const fileArray = Array.from(files).filter((file) => file.type.startsWith('image/'));

  return Promise.resolve(fileArray.map((file, index) => ({
    id: `upload-${Date.now()}-${index}`,
    url: URL.createObjectURL(file),
    alt: file.name.replace(/\.[^/.]+$/, ''),
    source: 'upload' as const,
    file,
    fileName: file.name,
    contentType: file.type,
    sizeBytes: file.size,
  })));
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
