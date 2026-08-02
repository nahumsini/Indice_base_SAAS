import { useEffect, useMemo, useState } from 'react';
import { BadgePercent } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import { defaultSalesCurrency } from '../../utils/salesCurrency';
import type { SalesRecordsTranslations } from '../translations';
import type { CommissionStatus, SaleRecord } from '../types/salesTypes';
import { calculateCommissionAmount, formatSalesCurrency } from '../utils/salesFormatters';
import { commissionStatuses } from '../utils/salesStatuses';
import { FormField, salesFieldClassName } from './SalesModalPrimitives';

const actionClassNames = getSalesModalActionClassNames('coral');

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
    <SalesModalFrame
      open={open}
      onOpenChange={onOpenChange}
      icon={<BadgePercent className="h-6 w-6" />}
      title={t.commissionModal.title}
      description={t.commissionModal.description}
      closeLabel={t.common.cancel}
      modalType="standard-form"
      bodyClassName="space-y-5"
      footer={(
        <>
          <Button type="button" variant="outline" className={actionClassNames.secondary} onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button type="button" className={actionClassNames.primary} onClick={handleSave} disabled={!record}>{t.commissionModal.save}</Button>
        </>
      )}
    >
      <div className="rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 px-4 py-3">
        <p className="text-sm font-medium text-[#B63B32]">{record?.saleNumber ?? t.common.notAvailable}</p>
        <p className="mt-1 text-sm font-normal text-slate-600 dark:text-slate-300">
          {record?.customerName ?? t.common.notAvailable} · {formatSalesCurrency(record?.totalAmount ?? 0, record?.currency ?? defaultSalesCurrency)}
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
          <Button type="button" variant="outline" className="h-11 rounded-lg border-[#FF6B5E]/25 bg-white px-4 font-medium text-[#B63B32] hover:bg-[#FF6B5E]/10 dark:border-[#FF6B5E]/30 dark:bg-slate-950 dark:text-[#FFB0AA]" onClick={handleUseSuggestedAmount}>
            {t.commissionModal.useSuggestedAmount}
          </Button>
        </div>
      </section>

      <FormField label={t.modal.fields.commissionNotes}>
        <Textarea
          value={draft.commissionNotes}
          onChange={(event) => setDraft((current) => ({ ...current, commissionNotes: event.target.value }))}
          placeholder={t.commissionModal.notesPlaceholder}
          className="min-h-28 rounded-lg border-slate-200 bg-white shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </FormField>
    </SalesModalFrame>
  );
}
