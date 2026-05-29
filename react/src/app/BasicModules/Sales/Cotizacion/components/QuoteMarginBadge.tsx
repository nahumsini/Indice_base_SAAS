import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../components/ui/utils';
import type { QuotesTranslations } from '../translations';
import type { QuoteMarginSignal, QuoteMarginTableKey } from '../utils/quoteTableSignals';

const marginClasses: Record<QuoteMarginTableKey, string> = {
  healthy: 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66]',
  lowMargin: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
  costMissing: 'border-slate-200 bg-slate-50 text-slate-600',
};

export function QuoteMarginBadge({
  signal,
  t,
}: {
  signal: QuoteMarginSignal;
  t: QuotesTranslations;
}) {
  const marginValue = `${Math.round(signal.value)}%`;
  const shouldShowValue = signal.key !== 'costMissing';

  return (
    <div className="space-y-1">
      <Badge className={cn('rounded-full border px-2.5 py-1 text-xs font-black', marginClasses[signal.key])}>
        {shouldShowValue ? marginValue : t.tableSignals.margin.costMissing}
      </Badge>
      {shouldShowValue ? (
        <p className="text-xs font-bold text-slate-500">{t.tableSignals.margin[signal.key]}</p>
      ) : null}
    </div>
  );
}
