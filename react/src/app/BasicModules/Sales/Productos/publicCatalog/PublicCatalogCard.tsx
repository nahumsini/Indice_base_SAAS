import { ArrowRight, CalendarDays, Download, Loader2, MessageCircle, ShoppingCart } from 'lucide-react';
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
import { publicCatalogCardClass, publicCatalogImageRatioClass } from './utils/publicCatalogExperience';

export function PublicCatalogCard({
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
      className={`group flex h-full min-w-0 scroll-mt-6 flex-col overflow-hidden border bg-white transition duration-200 target:border-[var(--catalog-accent)] target:ring-2 target:ring-[var(--catalog-accent-border)] dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-none ${publicCatalogCardClass[config.cardStyle]}`}
    >
      <div className={`relative overflow-hidden bg-slate-100 dark:bg-slate-950 ${publicCatalogImageRatioClass[config.imageRatio]}`}>
        <PublicCatalogImageCover item={item} t={t} onOpenGallery={onOpenGallery} />
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
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{getCategoryLabel(item.category, t)}</p>
          ) : null}
        </div>
        {item.description ? <PublicCatalogExpandableDescription description={item.description} t={t} className="mt-3" /> : null}
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
          <div className="flex shrink-0 flex-col items-end gap-2">
            {item.reservable ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl px-3 text-xs font-medium text-[var(--catalog-accent-ink)] hover:bg-[var(--catalog-accent-soft)]"
                onClick={() => onCheckAvailability(item)}
              >
                <CalendarDays className="h-4 w-4" /> {t.publicCatalog.availability.check}
              </Button>
            ) : null}
            <div className="flex items-center gap-2">
              {config.allowImageDownloads && hasImages ? (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-11 w-11 shrink-0 rounded-xl text-slate-600 hover:border-[var(--catalog-accent-border)] hover:bg-[var(--catalog-accent-soft)] hover:text-[var(--catalog-accent-ink)]"
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
                className="h-11 w-11 shrink-0 rounded-xl border-[#25D366]/40 text-[#168c46] hover:border-[#25D366] hover:bg-[#25D366]/10 hover:text-[#126f39]"
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
                  className="h-11 w-11 shrink-0 rounded-xl bg-[var(--catalog-accent)] text-[var(--catalog-accent-contrast)] shadow-sm hover:bg-[var(--catalog-accent-hover)]"
                  aria-label={config.allowCart ? t.publicCatalog.addToCart : t.publicCatalog.requestQuote}
                  onClick={() => onAddToCart(item)}
                >
                  {config.allowCart ? <ShoppingCart className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
