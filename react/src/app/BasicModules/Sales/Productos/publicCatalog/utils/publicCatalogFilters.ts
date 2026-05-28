import type { PublicCatalogItem } from '../types/publicCatalogTypes';

export function filterPublicCatalogItems({
  items,
  search,
  category,
  type,
}: {
  items: PublicCatalogItem[];
  search: string;
  category: string;
  type: string;
}) {
  const normalizedSearch = search.trim().toLowerCase();

  return items.filter((item) => {
    const matchesSearch = !normalizedSearch || [
      item.name,
      item.sku ?? '',
      item.category ?? '',
      item.type,
      item.description ?? '',
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
    const matchesCategory = category === 'all' || item.category === category;
    const matchesType = type === 'all' || item.type === type;

    return matchesSearch && matchesCategory && matchesType;
  });
}
