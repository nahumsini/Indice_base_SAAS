import { Badge } from '../../../../../components/ui/badge';
import { cn } from '../../../../../components/ui/utils';
import type { ProductsTranslations } from '../../translations';
import type { ProductFormState } from '../../types/productosTypes';
import { getReadinessStates, type ProductReadinessKey } from './productReadiness';

const readinessOrder: ProductReadinessKey[] = [
  'quoteReady',
  'posReady',
  'inventoryControlled',
  'requiresReview',
];

export function ProductReadinessBadges({
  form,
  t,
}: {
  form: ProductFormState;
  t: ProductsTranslations;
}) {
  const states = getReadinessStates(form);

  return (
    <div className="flex flex-wrap gap-2">
      {readinessOrder.map((key) => {
        const active = states[key];

        return (
          <Badge
            key={key}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium',
              active
                ? key === 'requiresReview'
                  ? 'border-[#F4C84A]/40 bg-[#F4C84A]/10 text-[#9a6b05]'
                  : 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66]'
                : 'border-slate-200 bg-slate-50 text-slate-500',
            )}
          >
            {t.readiness.labels[key]}
          </Badge>
        );
      })}
    </div>
  );
}
