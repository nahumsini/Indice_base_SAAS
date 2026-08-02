import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../components/ui/utils';
import type { QuotesTranslations } from '../translations';
import type { QuoteExpirationSignal, QuoteExpirationTableKey } from '../utils/quoteTableSignals';

const expirationClasses: Record<QuoteExpirationTableKey, string> = {
  valid: 'border-slate-200 bg-slate-50 text-slate-600',
  expiringSoon: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
  expired: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32]',
  missing: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32]',
  closed: 'border-slate-200 bg-slate-50 text-slate-500',
};

function getExpirationLabel(signal: QuoteExpirationSignal, t: QuotesTranslations) {
  if (signal.key === 'expiringSoon') {
    return t.tableSignals.expiration.expiringSoon(Math.max(signal.daysUntil ?? 0, 0));
  }

  return t.tableSignals.expiration[signal.key];
}

export function QuoteExpirationBadge({
  expirationDate,
  signal,
  t,
}: {
  expirationDate: string;
  signal: QuoteExpirationSignal;
  t: QuotesTranslations;
}) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-slate-700">{expirationDate || t.common.unassigned}</p>
      {signal.key !== 'valid' ? (
        <Badge className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', expirationClasses[signal.key])}>
          {getExpirationLabel(signal, t)}
        </Badge>
      ) : null}
    </div>
  );
}
