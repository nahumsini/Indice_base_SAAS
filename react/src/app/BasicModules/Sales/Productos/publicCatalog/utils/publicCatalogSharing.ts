export function publicCatalogProductAnchorId(itemId: string) {
  return `producto-${itemId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

export function buildPublicCatalogProductUrl(baseUrl: string, itemId: string) {
  const url = new URL(baseUrl, window.location.origin);
  url.searchParams.set('product', itemId);
  url.hash = publicCatalogProductAnchorId(itemId);
  return url.toString();
}

export function buildWhatsAppShareUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
