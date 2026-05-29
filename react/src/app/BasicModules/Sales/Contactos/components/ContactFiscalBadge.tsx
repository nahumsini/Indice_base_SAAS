import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../components/ui/utils';
import type { ContactFiscalSignal } from '../utils/contactTableSignals';

const fiscalStateClassNames: Record<ContactFiscalSignal['state'], string> = {
  ready: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  partial: 'border-amber-200 bg-amber-50 text-amber-700',
  missing: 'border-slate-200 bg-slate-50 text-slate-600',
};

export function ContactFiscalBadge({ signal }: { signal: ContactFiscalSignal }) {
  return (
    <div className="min-w-[150px] space-y-1">
      <Badge
        variant="outline"
        className={cn('rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em]', fiscalStateClassNames[signal.state])}
      >
        {signal.label}
      </Badge>
      <p className="text-xs font-medium text-slate-500">{signal.detail}</p>
    </div>
  );
}
