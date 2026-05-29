import { useEffect, useMemo, useState } from 'react';
import { BadgePercent, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import { cn } from '../../../../components/ui/utils';
import { getSalesModalStyles } from '../../salesModalStyles';
import type { SalesRecordsTranslations } from '../translations';
import type { CommissionStatus, SaleRecord } from '../types/salesTypes';
import { calculateCommissionAmount, formatSalesCurrency } from '../utils/salesFormatters';
import { commissionStatuses } from '../utils/salesStatuses';
import { FormField, salesFieldClassName } from './SalesModalPrimitives';

const modalStyles = getSalesModalStyles('coral');

type CommissionDraft = {
  commissionStatus: CommissionStatus;
  commissionRate: number;
  commissionAmount: number;
  commissionNotes: string;
};

function getDraft(record: SaleRecord | null): CommissionDraft {
  return {
    commissionStatus: record?.commissionStatus ?? 'pending',
    commissionRate: record?.commissionRate ?? 0,
    commissionAmount: record?.commissionAmount ?? 0,
    commissionNotes: record?.commissionNotes ?? '',
  };
}

export function CommissionManagementModal({
  open,
  record,
  t,
  onOpenChange,
  onUpdate,
}: {
  open: boolean;
  record: SaleRecord | null;
  t: SalesRecordsTranslations;
  onOpenChange: (open: boolean) => void;
  onUpdate: (saleId: string, patch: Partial<SaleRecord>) => void;
}) {
  const [draft, setDraft] = useState<CommissionDraft>(() => getDraft(record));

  useEffect(() => {
    if (open) {
      setDraft(getDraft(record));
    }
  }, [open, record]);

  const suggestedAmount = useMemo(
    () => calculateCommissionAmount(record?.totalAmount ?? 0, draft.commissionRate),
    [draft.commissionRate, record?.totalAmount],
  );

  const handleUseSuggestedAmount = () => {
    setDraft((current) => ({ ...current, commissionAmount: suggestedAmount }));
  };

  const handleSave = () => {
    if (!record) return;

    onUpdate(record.id, draft);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(modalStyles.content, 'max-w-[680px] !gap-0')} closeButtonClassName={modalStyles.close}>
        <DialogHeader className={modalStyles.header}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className={modalStyles.title}>
                <BadgePercent className="h-6 w-6" />
                {t.commissionModal.title}
              </DialogTitle>
              <DialogDescription className={modalStyles.description}>{t.commissionModal.description}</DialogDescription>
            </div>
            <Button type="button" variant="ghost" size="icon" className={modalStyles.close} onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="rounded-xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 px-4 py-3">
            <p className="text-sm font-black text-[#B63B32]">{record?.saleNumber ?? t.common.notAvailable}</p>
            <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
              {record?.customerName ?? t.common.notAvailable} · {formatSalesCurrency(record?.totalAmount ?? 0, record?.currency ?? 'MXN')}
            </p>
          </div>

          <section className="grid gap-4 md:grid-cols-2">
            <FormField label={t.modal.fields.commissionStatus}>
              <Select value={draft.commissionStatus} onValueChange={(value) => setDraft((current) => ({ ...current, commissionStatus: value as CommissionStatus }))}>
                <SelectTrigger className={salesFieldClassName}><SelectValue /></SelectTrigger>
                <SelectContent>{commissionStatuses.map((status) => <SelectItem key={status} value={status}>{t.statuses.commission[status]}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label={t.modal.fields.commissionRate}>
              <Input type="number" value={draft.commissionRate} onChange={(event) => setDraft((current) => ({ ...current, commissionRate: Number(event.target.value) }))} className={salesFieldClassName} />
            </FormField>
            <FormField label={t.modal.fields.commissionAmount}>
              <Input type="number" value={draft.commissionAmount} onChange={(event) => setDraft((current) => ({ ...current, commissionAmount: Number(event.target.value) }))} className={salesFieldClassName} />
            </FormField>
            <div className="flex items-end">
              <Button type="button" variant="outline" className="h-11 rounded-lg border-[#FF6B5E]/25 bg-white px-4 font-bold text-[#B63B32] hover:bg-[#FF6B5E]/10" onClick={handleUseSuggestedAmount}>
                {t.commissionModal.useSuggestedAmount}
              </Button>
            </div>
          </section>

          <FormField label={t.modal.fields.commissionNotes}>
            <Textarea
              value={draft.commissionNotes}
              onChange={(event) => setDraft((current) => ({ ...current, commissionNotes: event.target.value }))}
              placeholder={t.commissionModal.notesPlaceholder}
              className="min-h-28 rounded-lg border-slate-200 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20"
            />
          </FormField>
        </div>

        <DialogFooter className={modalStyles.footer}>
          <Button type="button" variant="outline" className={modalStyles.secondaryButton} onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button type="button" className={modalStyles.primaryButton} onClick={handleSave} disabled={!record}>{t.commissionModal.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
