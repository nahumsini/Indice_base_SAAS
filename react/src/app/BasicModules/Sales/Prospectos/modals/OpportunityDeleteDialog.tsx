import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { SalesOpportunity } from '../../salesCrmContext';
import type { ProspectosCopy } from '../translations';

const deleteActionClassNames = getSalesModalActionClassNames('coral');

export function OpportunityDeleteDialog({
  copy,
  description,
  opportunity,
  onCancel,
  onConfirm,
}: {
  copy: ProspectosCopy['deleteConfirm'];
  description?: string;
  opportunity: SalesOpportunity | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <SalesModalFrame
      open={Boolean(opportunity)}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
      title={copy.title}
      description={description ?? copy.title}
      icon={<Trash2 className="h-5 w-5" />}
      contentClassName="w-[min(92vw,520px)]"
      bodyClassName="space-y-4 px-7 py-6"
      footerClassName="sm:justify-end"
      footer={(
        <>
          <Button
            type="button"
            variant="outline"
            className={deleteActionClassNames.secondary}
            onClick={onCancel}
          >
            {copy.cancel}
          </Button>
          <Button
            type="button"
            className={deleteActionClassNames.primary}
            onClick={onConfirm}
          >
            {copy.confirm}
          </Button>
        </>
      )}
    >
      <div className="rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/[0.04] p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#FF6B5E]/20 bg-white text-[#B63B32]">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="break-words text-base font-black text-slate-950">{opportunity?.opportunityName}</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-600">{opportunity?.company}</p>
          </div>
        </div>
      </div>
    </SalesModalFrame>
  );
}
