import { AlertTriangle } from 'lucide-react';
import type { ProductsTranslations } from '../translations';
import { formatProductCurrency } from '../utils/productFormatters';

export function ProductsInsightBar({
  activeItems,
  inventoryValue,
  estimatedProfit,
  readyForSales,
  t,
}: {
  activeItems: number;
  inventoryValue: number;
  estimatedProfit: number;
  readyForSales: number;
  t: ProductsTranslations;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 px-4 py-3 text-sm font-semibold leading-6 text-slate-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B63B32]" />
      <span>
        {t.insight.summary(
          activeItems,
          formatProductCurrency(inventoryValue),
          formatProductCurrency(estimatedProfit),
          readyForSales,
        )}
      </span>
    </div>
  );
}
