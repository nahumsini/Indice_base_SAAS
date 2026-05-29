import { FileText } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { cn } from '../../../../components/ui/utils';
import type { SalesOpportunity } from '../../salesCrmContext';
import { getSalesModalStyles } from '../../salesModalStyles';
import type { ProspectosCopy } from '../translations/prospectosTranslations';

const opportunityModalStyles = getSalesModalStyles('coral');

export function OpportunityFilesModal({
  copy,
  opportunity,
  onClose,
}: {
  copy: ProspectosCopy['filesModal'];
  opportunity: SalesOpportunity | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(opportunity)} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className={cn(opportunityModalStyles.content, 'max-w-2xl')} closeButtonClassName={opportunityModalStyles.close}>
        <DialogHeader className={opportunityModalStyles.header}>
          <DialogTitle className={opportunityModalStyles.title}>{copy.title}</DialogTitle>
          <DialogDescription className={opportunityModalStyles.description}>
            {copy.description}
          </DialogDescription>
        </DialogHeader>

        <div className={cn(opportunityModalStyles.body, 'space-y-4')}>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="font-bold text-slate-950">{opportunity?.opportunityName}</p>
            <p className="mt-1 text-sm text-slate-600">{opportunity?.company}</p>
          </div>

          <div className="space-y-3">
            {opportunity?.files.length ? opportunity.files.map((file) => (
              <div key={file} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
                <span className="inline-flex items-center gap-3 text-sm font-semibold text-slate-800">
                  <FileText className="h-4 w-4 text-[#FF6B5E]" />
                  {file}
                </span>
                <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-slate-600">{copy.local}</Badge>
              </div>
            )) : (
              <div className="rounded-lg border border-dashed border-slate-200 px-6 py-10 text-center text-sm font-medium text-slate-400">
                {copy.empty}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className={opportunityModalStyles.footer}>
          <Button className={opportunityModalStyles.primaryButton} onClick={onClose}>
            {copy.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
