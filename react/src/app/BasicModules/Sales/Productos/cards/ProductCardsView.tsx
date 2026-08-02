import { useState, type ReactNode } from 'react';
import { Copy, Images, PencilLine, Power, Trash2 } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../components/ui/utils';
import type { SalesCatalogItem } from '../../types';
import type { ProductsTranslations } from '../translations';
import { ProductHealthIndicators } from '../components/ProductHealthIndicators';
import { ProductImageCarouselModal } from '../components/ProductImageCarouselModal';
import { ProductOperationalChips } from '../components/ProductOperationalChips';
import { ProductThumbnail } from '../components/ProductThumbnail';
import { ProductVisibilityBadge } from '../components/ProductVisibilityBadge';
import { formatProductCurrency, getProductMargin } from '../utils/productFormatters';
import { getCategoryLabel } from '../utils/productCategories';
import { getProductGalleryImages } from '../utils/productImages';
import { getProductProfit } from '../utils/productOperationalStatus';
import { productStatusClasses } from '../utils/productStyles';

function ProductCardAction({
  label,
  icon,
  className,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  className: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/25',
        className,
      )}
    >
      {icon}
    </button>
  );
}

export function ProductCardsView({
  products,
  t,
  onEditProduct,
  onDuplicateProduct,
  onDeleteProduct,
  onToggleProductStatus,
}: {
  products: SalesCatalogItem[];
  t: ProductsTranslations;
  onEditProduct?: (product: SalesCatalogItem) => void;
  onDuplicateProduct?: (product: SalesCatalogItem) => void;
  onDeleteProduct?: (product: SalesCatalogItem) => void;
  onToggleProductStatus?: (product: SalesCatalogItem) => void;
}) {
  const [carouselProduct, setCarouselProduct] = useState<SalesCatalogItem | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const openCarousel = (product: SalesCatalogItem, imageIndex = 0) => {
    setCarouselProduct(product);
    setCarouselIndex(imageIndex);
  };

  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-100 p-5 dark:border-slate-700">
          <h3 className="text-xl font-medium text-slate-950 dark:text-white">{t.sections.cardsTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">{t.sections.cardsDescription}</p>
        </div>

        {products.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm font-medium text-slate-500 dark:text-slate-300">{t.table.empty}</div>
        ) : (
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const galleryImages = getProductGalleryImages(product);
              const galleryCount = galleryImages.length;

              return (
                <article key={product.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-[#FF6B5E]/35 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
                  <div className="relative bg-slate-50 p-3 dark:bg-slate-800">
                    <button
                      type="button"
                      className="group block w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/30"
                      onClick={() => openCarousel(product)}
                      aria-label={t.gallery.open(product.name)}
                    >
                      <ProductThumbnail product={product} size="hero" className="aspect-[4/3] min-h-[220px] transition group-hover:scale-[1.01]" />
                      {galleryCount > 0 ? (
                        <span className="absolute bottom-5 right-5 inline-flex items-center gap-2 rounded-full border border-white/40 bg-slate-950/75 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur">
                          <Images className="h-3.5 w-3.5" />
                          {galleryCount}
                        </span>
                      ) : null}
                    </button>

                    <div className="pointer-events-none absolute left-5 top-5 flex flex-wrap gap-2">
                      <Badge className={cn('rounded-full border px-2 py-1 text-xs font-medium backdrop-blur', productStatusClasses[product.status])}>
                        {t.statusLabels[product.status]}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div>
                      <p className="text-xs font-medium tracking-normal text-slate-400">{product.sku}</p>
                      <h3 className="mt-2 text-lg font-medium text-slate-950 dark:text-white">{product.name}</h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-300">{product.description}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                        <p className="font-medium text-slate-500">{t.labels.price}</p>
                        <p className="mt-1 font-medium text-slate-950 dark:text-white">{formatProductCurrency(product.price, product.currency)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                        <p className="font-medium text-slate-500">{t.labels.profit}</p>
                        <p className="mt-1 font-medium text-[#177d66]">{formatProductCurrency(getProductProfit(product), product.currency)}</p>
                        <p className="text-xs font-medium text-[#B63B32]">{getProductMargin(product)}%</p>
                      </div>
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                        <p className="font-medium text-slate-500">{t.labels.category}</p>
                        <p className="mt-1 truncate font-medium text-slate-950 dark:text-white">{getCategoryLabel(product.category, t)}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <ProductVisibilityBadge visibility={product.visibility} t={t} compact />
                      <ProductOperationalChips product={product} t={t} />
                    </div>
                    <ProductHealthIndicators product={product} t={t} />

                    <div className="flex items-center justify-end gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 dark:border-slate-700 dark:bg-slate-800">
                      <ProductCardAction label={t.actions.viewImages} icon={<Images className="h-4 w-4" />} className="border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] hover:bg-[#FF6B5E]/15 dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/15 dark:text-[#FFB8B1] dark:hover:bg-[#FF6B5E]/25" onClick={() => openCarousel(product)} />
                      <ProductCardAction label={t.actions.edit} icon={<PencilLine className="h-4 w-4" />} className="border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => onEditProduct?.(product)} />
                      <ProductCardAction label={t.actions.duplicate} icon={<Copy className="h-4 w-4" />} className="border-[#F4C84A]/40 bg-[#F4C84A]/10 text-[#9a6b05] hover:bg-[#F4C84A]/20 dark:border-[#F4C84A]/40 dark:bg-[#F4C84A]/15 dark:text-[#F7D86B] dark:hover:bg-[#F4C84A]/25" onClick={() => onDuplicateProduct?.(product)} />
                      <ProductCardAction label={product.status === 'Active' ? t.actions.deactivate : t.actions.activate} icon={<Power className="h-4 w-4" />} className="border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66] hover:bg-[#59C3A5]/15 dark:border-[#59C3A5]/35 dark:bg-[#59C3A5]/15 dark:text-[#7DE0C4] dark:hover:bg-[#59C3A5]/25" onClick={() => onToggleProductStatus?.(product)} />
                      <ProductCardAction label={t.actions.delete} icon={<Trash2 className="h-4 w-4" />} className="border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300 dark:hover:bg-red-500/25" onClick={() => onDeleteProduct?.(product)} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <ProductImageCarouselModal
        product={carouselProduct}
        open={Boolean(carouselProduct)}
        initialIndex={carouselIndex}
        t={t}
        onOpenChange={(open) => {
          if (!open) {
            setCarouselProduct(null);
          }
        }}
      />
    </>
  );
}
