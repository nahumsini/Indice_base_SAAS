import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../components/ui/utils';
import type { ContactRelationshipSignal as ContactRelationshipSignalModel } from '../utils/contactTableSignals';

const relationshipStateClassNames: Record<ContactRelationshipSignalModel['state'], string> = {
  customer: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  overdue: 'border-rose-200 bg-rose-50 text-rose-700',
  activeOpportunity: 'border-blue-200 bg-blue-50 text-blue-700',
  quoted: 'border-violet-200 bg-violet-50 text-violet-700',
  noActivity: 'border-slate-200 bg-slate-50 text-slate-600',
};

export function ContactRelationshipSignal({ signal }: { signal: ContactRelationshipSignalModel }) {
  return (
    <div className="min-w-[170px] space-y-1">
      <Badge
        variant="outline"
        className={cn('rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em]', relationshipStateClassNames[signal.state])}
      >
        {signal.label}
      </Badge>
      <p className="text-xs font-medium text-slate-500">{signal.detail}</p>
    </div>
  );
}
