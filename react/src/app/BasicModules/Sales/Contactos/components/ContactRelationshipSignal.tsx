import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../components/ui/utils';
import type { ContactCopy } from '../translations';
import type { ContactRelationshipSignal as ContactRelationshipSignalModel } from '../utils/contactTableSignals';

const relationshipStateClassNames: Record<ContactRelationshipSignalModel['state'], string> = {
  customer: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  overdue: 'border-rose-200 bg-rose-50 text-rose-700',
  activeOpportunity: 'border-blue-200 bg-blue-50 text-blue-700',
  quoted: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32]',
  noActivity: 'border-slate-200 bg-slate-50 text-slate-600',
};

export function ContactRelationshipSignal({
  copy,
  signal,
}: {
  copy: ContactCopy['signals']['relationship'];
  signal: ContactRelationshipSignalModel;
}) {
  return (
    <div className="min-w-0 max-w-full space-y-1.5">
      <Badge
        variant="outline"
        className={cn('h-auto max-w-full whitespace-normal rounded-full px-3 py-1 text-xs font-black uppercase tracking-normal', relationshipStateClassNames[signal.state])}
      >
        {copy.labels[signal.state]}
      </Badge>
      <p className="break-words text-xs font-medium leading-5 text-slate-500">
        {copy.details[signal.state](signal.opportunityCount, signal.quoteCount)}
      </p>
    </div>
  );
}
