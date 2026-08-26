import type { PublicCatalogImage, PublicCatalogItem } from '../types/publicCatalogTypes';

export function publicCatalogImages(item: PublicCatalogItem): PublicCatalogImage[] {
  const candidates = item.images?.length
    ? item.images
    : item.thumbnailUrl
      ? [{ url: item.thumbnailUrl, alt: item.thumbnailAlt || item.name }]
      : [];
  const seen = new Set<string>();

  return candidates.flatMap((image) => {
    const url = image.url?.trim();
    if (!url || seen.has(url)) return [];
    seen.add(url);
    return [{ url, alt: image.alt?.trim() || item.name }];
  });
}

export function publicCatalogCoverImage(item: PublicCatalogItem): PublicCatalogImage | null {
  const thumbnailUrl = item.thumbnailUrl?.trim();

  if (thumbnailUrl) {
    return {
      url: thumbnailUrl,
      alt: item.thumbnailAlt?.trim() || item.name,
    };
  }

  return publicCatalogImages(item)[0] ?? null;
}

export function publicCatalogDescriptionCanExpand(description: string, compact = false): boolean {
  return description.trim().length > (compact ? 85 : 110);
}
