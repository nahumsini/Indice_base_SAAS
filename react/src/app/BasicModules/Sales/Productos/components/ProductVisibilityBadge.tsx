import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../components/ui/utils';
import type { SalesProductVisibility } from '../../types';
import type { ProductsTranslations } from '../translations';

const visibilityClasses: Record<SalesProductVisibility, string> = {
  Internal: 'border-slate-200 bg-slate-50 text-slate-600',
  Commercial: 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8]',
  'POS ready': 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66]',
  'Quote only': 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
};

export function ProductVisibilityBadge({
  visibility,
  t,
  compact = false,
}: {
  visibility: SalesProductVisibility;
  t: ProductsTranslations;
  compact?: boolean;
}) {
  return (
    <Badge
      title={t.visibilityLabels[visibility]}
      className={cn(
        'rounded-full border font-bold',
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        visibilityClasses[visibility],
      )}
    >
      {t.visibilityLabels[visibility]}
    </Badge>
  );
}
