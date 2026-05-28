import { Badge } from '../../../../../components/ui/badge';
import { cn } from '../../../../../components/ui/utils';
import type { QuotesTranslations } from '../../translations';
import type { QuoteHealthKey, QuoteHealthState } from '../../types/quoteBuilderTypes';

const healthOrder: QuoteHealthKey[] = [
  'readyToSend',
  'missingCustomer',
  'missingItems',
  'marginLow',
  'productRequiresReview',
  'validityMissing',
  'taxesConfigured',
  'taxesMissing',
];

export function QuoteHealthBadges({
  health,
  t,
}: {
  health: QuoteHealthState;
  t: QuotesTranslations;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {healthOrder.filter((key) => health[key]).map((key) => (
        <Badge
          key={key}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-bold',
            key === 'readyToSend' || key === 'taxesConfigured'
              ? 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66]'
              : key === 'marginLow' || key === 'taxesMissing'
                ? 'border-[#F4C84A]/40 bg-[#F4C84A]/10 text-[#9a6b05]'
                : 'border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32]',
          )}
        >
          {t.health.labels[key]}
        </Badge>
      ))}
    </div>
  );
}
