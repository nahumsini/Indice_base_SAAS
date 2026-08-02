import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../components/ui/utils';
import type { ProspectosCopy } from '../translations';
import type { OpportunityQuoteSignal } from '../utils/prospectosQuoteSignals';

const quoteSignalClassNames: Record<OpportunityQuoteSignal['state'], string> = {
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  active: 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8]',
  draft: 'border-slate-200 bg-slate-50 text-slate-600',
  expired: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#B63B32]',
  rejected: 'border-rose-200 bg-rose-50 text-rose-700',
  none: 'border-slate-200 bg-white text-slate-500',
};

export function OpportunityQuoteSignalBadge({
  signal,
  copy,
}: {
  signal: OpportunityQuoteSignal;
  copy: ProspectosCopy['quoteSignal'];
}) {
  const detail = signal.quoteCount > 0
    ? copy.countDetail(signal.quoteCount, signal.totalQuotedValueLabel)
    : copy.noDocument;

  return (
    <div className="min-w-0 max-w-full space-y-1.5">
      <p className="break-words text-sm font-medium text-slate-950">
        {copy.countDetail(signal.quoteCount, signal.totalQuotedValueLabel)}
      </p>
      <Badge
        variant="outline"
        className={cn('h-auto max-w-full whitespace-normal rounded-full px-3 py-1 text-xs font-medium tracking-normal', quoteSignalClassNames[signal.state])}
      >
        {copy.labels[signal.state]}
      </Badge>
      {signal.quoteCount === 0 ? (
        <p className="text-xs font-medium text-slate-500">{detail}</p>
      ) : null}
    </div>
  );
}
