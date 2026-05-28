import type { ProductsTranslations } from '../translations';
import type { PublicCatalogConfig, PublicCatalogItem } from './types/publicCatalogTypes';
import { PublicCatalogCard } from './PublicCatalogCard';

export function PublicCatalogGrid({
  items,
  config,
  t,
  onAddToCart,
}: {
  items: PublicCatalogItem[];
  config: PublicCatalogConfig;
  t: ProductsTranslations;
  onAddToCart: (item: PublicCatalogItem) => void;
}) {
  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-500">
          {t.publicCatalog.emptyCatalog}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-5 md:px-8">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <PublicCatalogCard
            key={item.id}
            item={item}
            config={config}
            t={t}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
    </section>
  );
}
