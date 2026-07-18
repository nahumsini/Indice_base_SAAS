import { ShoppingCart } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import type { ProductsTranslations } from '../translations';
import { formatProductCurrency } from '../utils/productFormatters';
import type { PublicCatalogConfig, PublicCatalogItem } from './types/publicCatalogTypes';

export function PublicCatalogCard({
  item,
  config,
  t,
  onAddToCart,
}: {
  item: PublicCatalogItem;
  config: PublicCatalogConfig;
  t: ProductsTranslations;
  onAddToCart: (item: PublicCatalogItem) => void;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-900">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt={item.thumbnailAlt || item.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm font-bold text-slate-400">
            {item.name}
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-2 text-lg font-black text-slate-950 dark:text-white">{item.name}</h3>
          {config.showCategories && item.category ? (
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{t.categoryLabels[item.category]}</p>
          ) : null}
        </div>
        {item.description ? <p className="line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.description}</p> : null}
        <div className="flex flex-wrap gap-2">
          {config.showItemTypeBadges ? <Badge variant="outline" className="rounded-full text-xs">{t.typeLabels[item.type]}</Badge> : null}
          {config.showStockStatus ? <Badge variant="outline" className="rounded-full text-xs">{t.publicCatalog.inventoryStatus[item.publicInventoryStatus]}</Badge> : null}
        </div>
        {config.showPrices ? (
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.publicCatalog.publicPrice}</p>
            <p className="text-xl font-black text-slate-950 dark:text-white">{formatProductCurrency(item.publicPrice ?? 0, item.currency)}</p>
            {config.showWholesalePrices && item.wholesalePrice ? (
              <p className="mt-1 text-xs font-semibold text-[#8a5f04]">
                {t.publicCatalog.wholesaleAvailable}: {formatProductCurrency(item.wholesalePrice, item.currency)}
              </p>
            ) : null}
          </div>
        ) : null}
        {config.allowCart || config.allowPurchaseRequest ? (
          <Button type="button" className="h-11 w-full gap-2 rounded-lg bg-[#FF6B5E] text-white hover:bg-[#E85C50]" onClick={() => onAddToCart(item)}>
            <ShoppingCart className="h-4 w-4" />
            {config.allowCart ? t.publicCatalog.addToCart : t.publicCatalog.requestQuote}
          </Button>
        ) : null}
      </div>
    </article>
  );
}
