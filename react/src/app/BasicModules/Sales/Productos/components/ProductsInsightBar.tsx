import { AlertTriangle } from 'lucide-react';
import type { ProductsTranslations } from '../translations';

export function ProductsInsightBar({
  activeItems,
  inventoryValueLabel,
  estimatedProfitLabel,
  readyForSales,
  t,
}: {
  activeItems: number;
  inventoryValueLabel: string;
  estimatedProfitLabel: string;
  readyForSales: number;
  t: ProductsTranslations;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 px-4 py-3 text-sm font-medium leading-6 text-slate-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B63B32]" />
      <span>
        {t.insight.summary(
          activeItems,
          inventoryValueLabel,
          estimatedProfitLabel,
          readyForSales,
        )}
      </span>
    </div>
  );
}
