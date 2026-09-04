import { CalendarDays, Download, Loader2, MessageCircle, Plus, ShoppingCart } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import type { ProductsTranslations } from '../translations';
import { getCategoryLabel } from '../utils/productCategories';
import { formatProductCurrency } from '../utils/productFormatters';
import type { PublicCatalogConfig, PublicCatalogItem } from './types/publicCatalogTypes';
import { PublicCatalogExpandableDescription } from './PublicCatalogExpandableDescription';
import { PublicCatalogImageCover } from './PublicCatalogImageCover';
import { publicCatalogImages } from './utils/publicCatalogPresentation';
import { publicCatalogProductAnchorId } from './utils/publicCatalogSharing';

export function PublicCatalogMobileCard({
  item,
  config,
  t,
  onAddToCart,
  onCheckAvailability,
  onOpenGallery,
  onDownloadImages,
  onShareWhatsApp,
  downloadingImages,
}: {
  item: PublicCatalogItem;
  config: PublicCatalogConfig;
  t: ProductsTranslations;
  onAddToCart: (item: PublicCatalogItem) => void;
  onCheckAvailability: (item: PublicCatalogItem) => void;
  onOpenGallery: (item: PublicCatalogItem) => void;
  onDownloadImages: (item: PublicCatalogItem) => void;
  onShareWhatsApp: (item: PublicCatalogItem) => void;
  downloadingImages: boolean;
}) {
  const hasImages = publicCatalogImages(item).length > 0;

  return (
    <article
      id={publicCatalogProductAnchorId(item.id)}
      className="w-full min-w-0 scroll-mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition active:scale-[.995] target:border-[#FF6B5E] target:ring-2 target:ring-[#FF6B5E]/30 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex min-w-0 gap-3 p-3">
        <div className="h-28 w-[6.5rem] shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-950">
          <PublicCatalogImageCover item={item} t={t} compact onOpenGallery={onOpenGallery} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-base font-medium leading-5 text-slate-950 dark:text-white">{item.name}</h2>
            {config.showCategories && item.category ? (
              <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">{getCategoryLabel(item.category, t)}</p>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {config.showStockStatus ? (
              <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] font-medium">
                {t.publicCatalog.inventoryStatus[item.publicInventoryStatus]}
              </Badge>
            ) : null}
            {config.showItemTypeBadges && item.type !== 'Product' ? (
              <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] font-medium">{t.typeLabels[item.type]}</Badge>
            ) : null}
          </div>

          <div className="mt-auto pt-2">
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{t.publicCatalog.publicPrice}</p>
              <p className="truncate text-lg font-medium text-slate-950 dark:text-white">
                {config.showPrices ? formatProductCurrency(item.publicPrice ?? 0, item.currency) : t.publicCatalog.pricePending}
              </p>
            </div>
            <div className="mt-2 space-y-2">
              {item.reservable ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full min-w-0 rounded-xl px-3 text-xs font-medium text-[#9f332b]"
                  onClick={() => onCheckAvailability(item)}
                >
                  <CalendarDays className="h-4 w-4" /> {t.publicCatalog.availability.check}
                </Button>
              ) : null}
              <div className="flex items-center justify-end gap-2">
                {config.allowImageDownloads && hasImages ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-11 w-11 shrink-0 rounded-xl text-slate-600"
                    aria-label={downloadingImages ? t.publicCatalog.imageDownloads.downloading : t.publicCatalog.imageDownloads.action}
                    title={t.publicCatalog.imageDownloads.action}
                    disabled={downloadingImages}
                    onClick={() => onDownloadImages(item)}
                  >
                    {downloadingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-11 w-11 shrink-0 rounded-xl border-[#25D366]/40 text-[#168c46]"
                  aria-label={t.publicCatalog.sharing.whatsapp}
                  title={t.publicCatalog.sharing.whatsapp}
                  onClick={() => onShareWhatsApp(item)}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
                {config.allowCart || config.allowPurchaseRequest ? (
                  <Button
                    type="button"
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-xl bg-[#FF6B5E] text-[#222831] shadow-sm hover:bg-[#E85C50]"
                    aria-label={config.allowCart ? t.publicCatalog.addToCart : t.publicCatalog.requestQuote}
                    onClick={() => onAddToCart(item)}
                  >
                    {config.allowCart ? <Plus className="h-5 w-5" /> : <ShoppingCart className="h-4 w-4" />}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {item.description ? (
        <PublicCatalogExpandableDescription
          description={item.description}
          t={t}
          compact
          className="border-t border-slate-100 px-3 py-2 dark:border-slate-800"
        />
      ) : null}
    </article>
  );
}
