import { Badge } from '../../../../components/ui/badge';
import type { SalesCatalogItem } from '../../types';
import type { ProductsTranslations } from '../translations';
import { getProductHealthWarnings } from '../utils/productOperationalStatus';

export function ProductHealthIndicators({
  product,
  t,
  limit = 3,
}: {
  product: SalesCatalogItem;
  t: ProductsTranslations;
  limit?: number;
}) {
  const warnings = getProductHealthWarnings(product).filter((warning) => warning !== 'requiresReview').slice(0, limit);

  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {warnings.map((warning) => (
        <Badge key={warning} className="rounded-full border border-[#F4C84A]/45 bg-[#F4C84A]/15 px-2 py-1 text-xs font-medium text-[#9a6b05]">
          {t.healthWarnings[warning]}
        </Badge>
      ))}
    </div>
  );
}
