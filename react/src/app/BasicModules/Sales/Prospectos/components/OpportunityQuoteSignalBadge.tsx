import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../components/ui/utils';
import type { OpportunityQuoteSignal } from '../utils/prospectosQuoteSignals';

const quoteSignalClassNames: Record<OpportunityQuoteSignal['state'], string> = {
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  active: 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8]',
  draft: 'border-slate-200 bg-slate-50 text-slate-600',
  expired: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#B63B32]',
  rejected: 'border-rose-200 bg-rose-50 text-rose-700',
  none: 'border-slate-200 bg-white text-slate-500',
};

export function OpportunityQuoteSignalBadge({ signal }: { signal: OpportunityQuoteSignal }) {
  return (
    <div className="min-w-[170px] space-y-1">
      <Badge
        variant="outline"
        className={cn('rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em]', quoteSignalClassNames[signal.state])}
      >
        {signal.label}
      </Badge>
      <p className="text-xs font-medium text-slate-500">{signal.detail}</p>
    </div>
  );
}
