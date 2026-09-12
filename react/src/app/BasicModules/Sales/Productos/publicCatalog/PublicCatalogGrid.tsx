import type { ProductsTranslations } from '../translations';
import type { PublicCatalogConfig, PublicCatalogItem } from './types/publicCatalogTypes';
import { PublicCatalogCard } from './PublicCatalogCard';
import { publicCatalogLayoutClass } from './utils/publicCatalogExperience';

export function PublicCatalogGrid({
  items,
  config,
  t,
  onAddToCart,
  onCheckAvailability,
  onOpenGallery,
  onDownloadImages,
  onShareWhatsApp,
  downloadingItemIds,
}: {
  items: PublicCatalogItem[];
  config: PublicCatalogConfig;
  t: ProductsTranslations;
  onAddToCart: (item: PublicCatalogItem) => void;
  onCheckAvailability: (item: PublicCatalogItem) => void;
  onOpenGallery: (item: PublicCatalogItem) => void;
  onDownloadImages: (item: PublicCatalogItem) => void;
  onShareWhatsApp: (item: PublicCatalogItem) => void;
  downloadingItemIds: ReadonlySet<string>;
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
      <div className={`grid gap-4 ${publicCatalogLayoutClass[config.layoutStyle]}`}>
        {items.map((item) => (
          <PublicCatalogCard
            key={item.id}
            item={item}
            config={config}
            t={t}
            onAddToCart={onAddToCart}
            onCheckAvailability={onCheckAvailability}
            onOpenGallery={onOpenGallery}
            onDownloadImages={onDownloadImages}
            onShareWhatsApp={onShareWhatsApp}
            downloadingImages={downloadingItemIds.has(item.id)}
          />
        ))}
      </div>
    </section>
  );
}
