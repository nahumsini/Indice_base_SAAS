import { ArrowRight, Image, ShoppingCart } from 'lucide-react';
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
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#FF6B5E]/35 hover:shadow-lg hover:shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-none">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-950">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt={item.thumbnailAlt || item.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]" loading="lazy" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm font-medium text-slate-400">
            <Image className="h-7 w-7" />
            <span className="line-clamp-2">{item.name}</span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {config.showStockStatus ? (
            <Badge className="rounded-full border border-white/70 bg-white/90 text-[10px] font-medium text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-200">
              {t.publicCatalog.inventoryStatus[item.publicInventoryStatus]}
            </Badge>
          ) : null}
          {config.showItemTypeBadges ? (
            <Badge className="rounded-full border border-white/70 bg-white/90 text-[10px] font-medium text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-200">
              {t.typeLabels[item.type]}
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div>
          <h3 className="line-clamp-2 text-lg font-medium text-slate-950 dark:text-white">{item.name}</h3>
          {config.showCategories && item.category ? (
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{t.categoryLabels[item.category]}</p>
          ) : null}
        </div>
        {item.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.description}</p> : null}
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.publicCatalog.publicPrice}</p>
            <p className="truncate text-xl font-medium text-slate-950 dark:text-white">
              {config.showPrices ? formatProductCurrency(item.publicPrice ?? 0, item.currency) : t.publicCatalog.pricePending}
            </p>
            {config.showWholesalePrices && item.wholesalePrice ? (
              <p className="mt-1 text-xs font-medium text-[#8a5f04]">
                {t.publicCatalog.wholesaleAvailable}: {formatProductCurrency(item.wholesalePrice, item.currency)}
              </p>
            ) : null}
          </div>
          {config.allowCart || config.allowPurchaseRequest ? (
            <Button
              type="button"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-xl bg-[#FF6B5E] text-[#222831] shadow-sm hover:bg-[#E85C50]"
              aria-label={config.allowCart ? t.publicCatalog.addToCart : t.publicCatalog.requestQuote}
              onClick={() => onAddToCart(item)}
            >
              {config.allowCart ? <ShoppingCart className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
