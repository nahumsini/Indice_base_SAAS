import type { SalesCatalogItem, SalesProductImage } from '../../types';
import type { ProductMediaDraft } from '../types/productosTypes';

export function getProductGalleryImages(product: SalesCatalogItem): SalesProductImage[] {
  const images: SalesProductImage[] = [];

  if (product.imageUrl) {
    images.push({
      id: `${product.id}-primary`,
      url: product.imageUrl,
      alt: product.imageAlt || product.name,
    });
  }

  product.gallery?.forEach((image, index) => {
    if (!image.url || images.some((item) => item.url === image.url)) {
      return;
    }

    images.push({
      id: image.id || `${product.id}-gallery-${index + 1}`,
      url: image.url,
      alt: image.alt || product.imageAlt || product.name,
    });
  });

  return images;
}

export function parseProductGalleryUrls(value: string, productName: string): SalesProductImage[] | undefined {
  const images = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
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
  const uploadedGallery = uploadedImages.map((image, index) => ({
    id: image.id || `${productId}-upload-${index + 1}`,
    url: image.url,
    alt: image.alt || productName,
  }));
  const orderedImages = [
    ...uploadedGallery,
    ...urlImages,
  ];
  const firstImage = orderedImages[0];
  const fallbackPrimary = primaryImageUrl
    ? {
        id: `${productId}-primary`,
        url: primaryImageUrl,
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

  return Promise.all(fileArray.map((file, index) => new Promise<ProductMediaDraft>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id: `upload-${Date.now()}-${index}`,
        url: String(reader.result),
        alt: file.name.replace(/\.[^/.]+$/, ''),
        source: 'upload',
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  })));
}
