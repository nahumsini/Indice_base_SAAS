import { History } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../components/ui/utils';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { SalesOpportunity } from '../../salesCrmContext';
import type { ProspectosCopy } from '../translations';
import { buildOpportunityHistory } from '../utils/prospectosMetrics';

const detailActionClassNames = getSalesModalActionClassNames('coral');

export function OpportunityDetailModal({
  copy,
  opportunity,
  onClose,
}: {
  copy: ProspectosCopy['detailModal'];
  opportunity: SalesOpportunity | null;
  onClose: () => void;
}) {
  return (
    <SalesModalFrame
      open={Boolean(opportunity)}
      onOpenChange={(open) => {
      if (!open) onClose();
      }}
      title={copy.title}
      description={copy.description}
      icon={<History className="h-5 w-5" />}
      closeLabel={copy.close}
      modalType="standard-form"
      bodyClassName="space-y-5"
      footerClassName="sm:justify-end"
      footer={(
        <Button className={detailActionClassNames.primary} onClick={onClose}>
          {copy.close}
        </Button>
      )}
    >
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="font-semibold text-slate-950">{opportunity?.opportunityName}</p>
            <p className="mt-1 text-sm text-slate-600">{opportunity?.company} · {opportunity?.contactPerson}</p>
          </div>

          <div className="space-y-3">
            {opportunity ? buildOpportunityHistory(opportunity).map((entry) => (
              <div key={entry.id} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[14px_minmax(0,1fr)_150px] sm:items-start">
                <span
                  className={cn(
                    'mt-1 h-3.5 w-3.5 rounded-full',
                    entry.tone === 'blue' && 'bg-[#2563EB]',
                    entry.tone === 'green' && 'bg-[#59C3A5]',
                    entry.tone === 'yellow' && 'bg-[#F4C84A]',
                    entry.tone === 'coral' && 'bg-[#FF6B5E]',
                    entry.tone === 'slate' && 'bg-slate-400',
                  )}
                />
                <div>
                  <p className="font-medium text-slate-950">{entry.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{entry.description}</p>
                </div>
                <p className="text-sm font-medium text-slate-500 sm:text-right">{entry.timestamp}</p>
              </div>
            )) : null}
          </div>
    </SalesModalFrame>
  );
}
