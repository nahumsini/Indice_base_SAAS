import { useMemo, useState } from 'react';
import { PackagePlus } from 'lucide-react';
import { Switch } from '../../../../../components/ui/switch';
import type { SalesCatalogItem } from '../../../types';
import type { QuotesTranslations } from '../../translations';
import { isProductReadyForQuote } from '../../utils/quoteCatalogAdapters';
import { QuoteCatalogCard } from './QuoteCatalogCard';

export function QuoteCatalogSection({
  products,
  t,
  formatCurrency,
  onAddProduct,
}: {
  products: SalesCatalogItem[];
  t: QuotesTranslations;
  formatCurrency: (value: number, currency?: string | null) => string;
  onAddProduct: (product: SalesCatalogItem) => void;
}) {
  const [showNotReady, setShowNotReady] = useState(false);
  const visibleProducts = useMemo(
    () => products.filter((product) => showNotReady || isProductReadyForQuote(product)),
    [products, showNotReady],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-[#FF6B5E]/15 bg-[#FF6B5E]/5 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-medium text-slate-950">
            <PackagePlus className="h-5 w-5 text-[#B63B32]" />
            {t.sections.catalogTitle}
          </h3>
          <p className="mt-1 text-sm font-normal leading-6 text-slate-500">{t.catalog.description}</p>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <Switch
            checked={showNotReady}
            className="data-[state=checked]:bg-[#FF6B5E]"
            onCheckedChange={setShowNotReady}
          />
          {t.catalog.showNotReady}
        </label>
      </div>

      {visibleProducts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
          {t.catalog.empty}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visibleProducts.map((product) => (
            <QuoteCatalogCard
              key={product.id}
              product={product}
              t={t}
              formatCurrency={formatCurrency}
              onAdd={() => onAddProduct(product)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
