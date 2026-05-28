import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../components/ui/utils';
import type { SalesCatalogItem } from '../../types';
import type { ProductsTranslations } from '../translations';
import { getProductAvailability, type ProductAvailabilityKey } from '../utils/productOperationalStatus';

const availabilityClasses: Record<ProductAvailabilityKey, string> = {
  sales: 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8]',
  pos: 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66]',
  inventory: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
  internal: 'border-slate-200 bg-slate-50 text-slate-600',
};

export function ProductOperationalChips({
  product,
  t,
  compact = false,
}: {
  product: SalesCatalogItem;
  t: ProductsTranslations;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {getProductAvailability(product).map((key) => (
        <Badge
          key={key}
          className={cn(
            'rounded-full border font-bold',
            compact ? 'px-2 py-0.5 text-[11px]' : 'px-2 py-1 text-xs',
            availabilityClasses[key],
          )}
        >
          {t.operationalAvailability[key]}
        </Badge>
      ))}
    </div>
  );
}
