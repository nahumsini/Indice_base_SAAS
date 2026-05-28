import { Barcode, Boxes } from 'lucide-react';
import { Badge } from '../../../../../components/ui/badge';
import { cn } from '../../../../../components/ui/utils';
import type { SalesCatalogItem } from '../../../types';
import type { ProductsTranslations } from '../../translations';
import type { ProductFormState } from '../../types/productosTypes';
import { formatProductCurrency } from '../../utils/productFormatters';
import { getCategoryLabel } from '../../utils/productCategories';
import { getProductGalleryImages } from '../../utils/productImages';
import { productStatusClasses } from '../../utils/productStyles';
import { ProductOperationalChips } from '../ProductOperationalChips';
import { ProductThumbnail } from '../ProductThumbnail';
import { getPackagingSnapshot } from './productModalUtils';
import { getPriceBuilderSnapshot, getRoundedPercentValue } from './productPricing';
import { getUsageReadiness, type ProductUsageKey } from './productReadiness';
import { ProductReadinessBadges } from './ProductReadinessBadges';

const usageOrder: ProductUsageKey[] = ['sales', 'pos', 'inventory'];

export function ProductPreviewPanel({
  product,
  form,
  t,
}: {
  product: SalesCatalogItem;
  form: ProductFormState;
  t: ProductsTranslations;
}) {
  const galleryCount = Math.max(getProductGalleryImages(product).length, 1);
  const usage = getUsageReadiness(form);
  const { presentationPrice } = getPackagingSnapshot(form);
  const pricing = getPriceBuilderSnapshot(form);

  return (
    <aside className="min-h-0 overflow-y-auto border-l border-slate-200 bg-slate-50 p-5">
      <div className="sticky top-0 space-y-4">
        <div>
          <h3 className="text-lg font-black text-slate-950">{t.preview.title}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{t.preview.description}</p>
        </div>

        <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="relative bg-slate-50 p-3">
            <ProductThumbnail product={product} size="hero" className="aspect-[4/3] min-h-[230px]" />
            <div className="absolute left-5 top-5 flex max-w-[calc(100%-2.5rem)] flex-wrap gap-2">
              <Badge className={cn('rounded-full border px-2 py-1 text-xs font-bold backdrop-blur', productStatusClasses[product.status])}>
                {t.statusLabels[product.status]}
              </Badge>
              <ProductOperationalChips product={product} t={t} compact />
            </div>
            <span className="absolute bottom-5 right-5 rounded-full border border-white/40 bg-slate-950/75 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur">
              {galleryCount} {t.preview.images}
            </span>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{product.sku}</p>
              <h3 className="mt-2 text-lg font-black text-slate-950">{product.name}</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{product.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="font-semibold text-slate-500">{t.labels.price}</p>
                <p className="mt-1 font-black text-slate-950">{formatProductCurrency(product.price)}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="font-semibold text-slate-500">{t.labels.margin}</p>
                <p className="mt-1 font-black text-[#B63B32]">{getRoundedPercentValue(pricing.actualMargin)}%</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="font-semibold text-slate-500">{t.labels.type}</p>
                <p className="mt-1 truncate font-black text-slate-950">{t.typeLabels[product.type]}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-500">{t.labels.category}</p>
              <p className="mt-1 font-black text-slate-950">{getCategoryLabel(product.category, t)}</p>
            </div>

            {product.packaging ? (
              <div className="rounded-lg border border-[#FF6B5E]/15 bg-[#FF6B5E]/5 px-3 py-3">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#B63B32]">
                  <Boxes className="h-4 w-4" />
                  {t.packaging.previewTitle}
                </p>
                <p className="mt-2 text-sm font-black text-slate-950">
                  {t.packaging.priceSummary(formatProductCurrency(presentationPrice), t.packaging.saleUnitLabels[product.packaging.saleUnit])}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {t.packaging.contentSummary(
                    product.packaging.unitsPerSaleUnit,
                    t.packaging.baseUnitLabels[product.packaging.baseUnit],
                    t.packaging.saleUnitLabels[product.packaging.saleUnit],
                  )}
                </p>
              </div>
            ) : null}

            {product.barcode ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{t.form.fields.barcode}</p>
                <p className="mt-1 flex items-center gap-2 font-mono text-sm font-black text-slate-900">
                  <Barcode className="h-4 w-4 text-[#B63B32]" />
                  {product.barcode}
                </p>
              </div>
            ) : null}
          </div>
        </article>

        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-black text-slate-950">{t.previewSummary.title}</h4>
          <ProductReadinessBadges form={form} t={t} />
          <div className="flex flex-wrap gap-2">
            {usageOrder.map((key) => (
              <Badge
                key={key}
                className={cn(
                  'rounded-full border px-2 py-1 text-xs font-bold',
                  usage[key]
                    ? 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66]'
                    : 'border-slate-200 bg-slate-50 text-slate-500',
                )}
              >
                {t.usage.labels[key]}
              </Badge>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
