import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../components/ui/utils';
import type { ContactCopy } from '../translations';
import type { ContactFiscalSignal } from '../utils/contactTableSignals';

const fiscalStateClassNames: Record<ContactFiscalSignal['state'], string> = {
  ready: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  partial: 'border-amber-200 bg-amber-50 text-amber-700',
  missing: 'border-slate-200 bg-slate-50 text-slate-600',
};

export function ContactFiscalBadge({
  copy,
  signal,
  country,
}: {
  copy: ContactCopy['signals']['fiscal'];
  signal: ContactFiscalSignal;
  country?: string | null;
}) {
  return (
    <div className="min-w-0 max-w-full space-y-1.5">
      <Badge
        variant="outline"
        className={cn('h-auto max-w-full whitespace-normal rounded-full px-3 py-1 text-xs font-black uppercase tracking-normal', fiscalStateClassNames[signal.state])}
      >
        {copy.labels[signal.state]}
      </Badge>
      <p className="break-words text-xs font-medium leading-5 text-slate-500">{copy.details[signal.state](country)}</p>
    </div>
  );
}
