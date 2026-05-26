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
import { buildOpportunityHistory } from '../utils/prospectosMetrics';

const opportunityModalStyles = getSalesModalStyles('coral');

export function OpportunityDetailModal({
  opportunity,
  onClose,
}: {
  opportunity: SalesOpportunity | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(opportunity)} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className={cn(opportunityModalStyles.content, 'max-w-3xl')} closeButtonClassName={opportunityModalStyles.close}>
        <DialogHeader className={opportunityModalStyles.header}>
          <DialogTitle className={opportunityModalStyles.title}>Historial de oportunidad</DialogTitle>
          <DialogDescription className={opportunityModalStyles.description}>
            Registro operativo de eventos comerciales, seguimiento, archivos y cambios relevantes.
          </DialogDescription>
        </DialogHeader>

        <div className={cn(opportunityModalStyles.body, 'space-y-5')}>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="font-bold text-slate-950">{opportunity?.opportunityName}</p>
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
                  <p className="font-bold text-slate-950">{entry.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{entry.description}</p>
                </div>
                <p className="text-sm font-semibold text-slate-500 sm:text-right">{entry.timestamp}</p>
              </div>
            )) : null}
          </div>
        </div>

        <DialogFooter className={opportunityModalStyles.footer}>
          <Button className={opportunityModalStyles.primaryButton} onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

