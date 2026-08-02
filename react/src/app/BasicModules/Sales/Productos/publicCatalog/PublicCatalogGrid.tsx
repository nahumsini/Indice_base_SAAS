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
      <section>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          {t.publicCatalog.emptyCatalog}
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
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
