import { PackagePlus } from 'lucide-react';
import { Badge } from '../../../../../components/ui/badge';
import { Button } from '../../../../../components/ui/button';
import { cn } from '../../../../../components/ui/utils';
import { ProductThumbnail } from '../../../Productos/components/ProductThumbnail';
import type { SalesCatalogItem } from '../../../types';
import type { QuotesTranslations } from '../../translations';
import { getProductCatalogReadiness, getProductMargin, productUsesInventory } from '../../utils/quoteCatalogAdapters';

const readinessClasses = {
  readyForSales: 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66]',
  requiresReview: 'border-[#F4C84A]/40 bg-[#F4C84A]/10 text-[#9a6b05]',
  notReadyForSales: 'border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32]',
};

export function QuoteCatalogCard({
  product,
  t,
  formatCurrency,
  onAdd,
}: {
  product: SalesCatalogItem;
  t: QuotesTranslations;
  formatCurrency: (value: number, currency?: string | null) => string;
  onAdd: () => void;
}) {
  const readiness = getProductCatalogReadiness(product);
  const margin = getProductMargin(product);
  const usesInventory = productUsesInventory(product);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex gap-3">
        <ProductThumbnail product={product} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950">{product.name}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{product.sku}</p>
            </div>
            <Button size="sm" className="h-8 rounded-lg bg-[#FF6B5E] px-3 text-white shadow-sm shadow-[#FF6B5E]/20 hover:bg-[#E85C50]" onClick={onAdd}>
              <PackagePlus className="h-3.5 w-3.5" />
              {t.builder.addProduct}
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">
              {t.productTypeLabels[product.type]}
            </Badge>
            <Badge className={cn('rounded-full border px-2 py-1 text-xs font-bold', readinessClasses[readiness])}>
              {t.catalog.readiness[readiness]}
            </Badge>
            <Badge className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">
              {usesInventory ? t.catalog.usesInventory : t.catalog.noInventory}
            </Badge>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs font-bold text-slate-500">{t.labels.unitPrice}</p>
              <p className="font-black text-slate-950">{formatCurrency(product.price, product.currency)}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs font-bold text-slate-500">{t.labels.margin}</p>
              <p className="font-black text-[#B63B32]">{margin}%</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
