import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../components/ui/utils';
import type { QuotesTranslations } from '../translations';
import type { QuoteReadinessSignal, QuoteReadinessTableKey } from '../utils/quoteTableSignals';

const readinessClasses: Record<QuoteReadinessTableKey, string> = {
  readyToSend: 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66]',
  missingCustomer: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32]',
  missingItems: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32]',
  marginLow: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
  productRequiresReview: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
  taxesMissing: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
  validityMissing: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32]',
};

export function QuoteReadinessBadge({
  signal,
  t,
}: {
  signal: QuoteReadinessSignal;
  t: QuotesTranslations;
}) {
  const remainingIssues = Math.max(signal.issueCount - 1, 0);

  return (
    <div className="flex items-center gap-1.5">
      <Badge className={cn('rounded-full border px-2.5 py-1 text-xs font-black', readinessClasses[signal.key])}>
        {t.tableSignals.readiness[signal.key]}
      </Badge>
      {remainingIssues > 0 ? (
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-black text-slate-500">
          {t.tableSignals.readiness.moreIssues(remainingIssues)}
        </span>
      ) : null}
    </div>
  );
}
