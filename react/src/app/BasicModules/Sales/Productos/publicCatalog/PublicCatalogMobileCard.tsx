import { Plus, ShoppingCart } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import type { ProductsTranslations } from '../translations';
import { formatProductCurrency } from '../utils/productFormatters';
import type { PublicCatalogConfig, PublicCatalogItem } from './types/publicCatalogTypes';

export function PublicCatalogMobileCard({
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
    <article className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex min-w-0 gap-3 p-3">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900">
          {item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt={item.thumbnailAlt || item.name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="grid h-full place-items-center px-2 text-center text-xs font-bold text-slate-400">{item.name}</div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-base font-black leading-5 text-slate-950 dark:text-white">{item.name}</h2>
            {config.showCategories && item.category ? (
              <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{t.categoryLabels[item.category]}</p>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {config.showStockStatus ? (
              <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] font-bold">
                {t.publicCatalog.inventoryStatus[item.publicInventoryStatus]}
              </Badge>
            ) : null}
            {config.showItemTypeBadges && item.type !== 'Product' ? (
              <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] font-bold">{t.typeLabels[item.type]}</Badge>
            ) : null}
          </div>

          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t.publicCatalog.publicPrice}</p>
              <p className="truncate text-lg font-black text-slate-950 dark:text-white">
                {config.showPrices ? formatProductCurrency(item.publicPrice ?? 0, item.currency) : t.publicCatalog.pricePending}
              </p>
            </div>
            {config.allowCart || config.allowPurchaseRequest ? (
              <Button
                type="button"
                size="icon"
                className="h-11 w-11 shrink-0 rounded-xl bg-[#FF6B5E] text-white shadow-sm hover:bg-[#E85C50]"
                aria-label={config.allowCart ? t.publicCatalog.addToCart : t.publicCatalog.requestQuote}
                onClick={() => onAddToCart(item)}
              >
                {config.allowCart ? <Plus className="h-5 w-5" /> : <ShoppingCart className="h-4 w-4" />}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {item.description ? (
        <p className="line-clamp-2 border-t border-slate-100 px-3 py-2 text-xs font-medium leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {item.description}
        </p>
      ) : null}
    </article>
  );
}
