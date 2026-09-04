import type { PlatformCatalog, PlatformCatalogProduct } from '../api/platformAdmin';

export function selectActiveCatalogProducts(
  catalog: PlatformCatalog | null | undefined,
): PlatformCatalogProduct[] {
  const activeVersion = catalog?.versions.find(
    (version) => version.status.trim().toUpperCase() === 'ACTIVE',
  );
  if (!activeVersion) return [];

  return (catalog?.products ?? [])
    .filter((product) => (
      product.catalog_version_id === activeVersion.id
      && product.active
      && product.commercially_available !== false
    ))
    .sort((left, right) => left.sort_order - right.sort_order);
}
