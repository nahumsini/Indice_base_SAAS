import { BadgePercent, X } from 'lucide-react';
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
import { getSalesModalStyles } from '../../salesModalStyles';
import type { SalesRecordsTranslations } from '../translations';
import type { CommissionRecord } from '../types/commissions';
import { formatCommissionType } from '../utils/commissionRules';
import { formatCommissionRate, formatSalesCurrency, formatSalesDate } from '../utils/salesFormatters';
import { CommissionStatusBadge } from './CommissionTable';

const modalStyles = getSalesModalStyles('coral');

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

export function CommissionDetailModal({
  open,
  record,
  t,
  onOpenChange,
}: {
  open: boolean;
  record: CommissionRecord | null;
  t: SalesRecordsTranslations;
  onOpenChange: (open: boolean) => void;
}) {
  const fields = t.commissions.detail.fields;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(modalStyles.content, 'max-h-[90vh] max-w-4xl !gap-0')} closeButtonClassName={modalStyles.close}>
        <DialogHeader className={modalStyles.header}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className={modalStyles.title}>
                <BadgePercent className="h-6 w-6" />
                {t.commissions.detail.title}
              </DialogTitle>
              <DialogDescription className={modalStyles.description}>{t.commissions.detail.description}</DialogDescription>
            </div>
            <Button type="button" variant="ghost" size="icon" className={modalStyles.close} onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className={cn(modalStyles.body, 'space-y-5')}>
          <section>
            <h3 className="mb-3 text-sm font-black uppercase tracking-[0.14em] text-slate-500">{t.commissions.detail.sections.summary}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <DetailField label={fields.salesRep} value={record?.salesRepName ?? t.common.notAvailable} />
              <DetailField label={fields.customer} value={record?.customerName ?? t.common.notAvailable} />
              <DetailField label={fields.sale} value={record?.saleCode ?? t.common.notAvailable} />
              <DetailField label={fields.product} value={record?.productName ?? t.common.notAvailable} />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-black uppercase tracking-[0.14em] text-slate-500">{t.commissions.detail.sections.ruleApplied}</h3>
            <div className="grid gap-3 md:grid-cols-4">
              <DetailField label={fields.ruleName} value={record?.commissionRuleName ?? t.common.notAvailable} />
              <DetailField label={fields.commissionType} value={record ? formatCommissionType(record.commissionType) : t.common.notAvailable} />
              <DetailField label={fields.ruleValue} value={record ? (record.commissionType.startsWith('percentage') ? formatCommissionRate(record.commissionValue) : formatSalesCurrency(record.commissionValue)) : t.common.notAvailable} />
              <DetailField label={fields.priority} value={t.common.notAvailable} />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-black uppercase tracking-[0.14em] text-slate-500">{t.commissions.detail.sections.financial}</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <DetailField label={fields.saleAmount} value={formatSalesCurrency(record?.saleAmount ?? 0)} />
              <DetailField label={fields.commissionAmount} value={formatSalesCurrency(record?.commissionAmount ?? 0)} />
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{fields.status}</p>
                <div className="mt-2">{record ? <CommissionStatusBadge status={record.status} t={t} /> : t.common.notAvailable}</div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-black uppercase tracking-[0.14em] text-slate-500">{t.commissions.detail.sections.timeline}</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <DetailField label={fields.created} value={record?.createdDate ? formatSalesDate(record.createdDate) : t.common.notAvailable} />
              <DetailField label={fields.approved} value={record?.approvedDate ? formatSalesDate(record.approvedDate) : t.common.notAvailable} />
              <DetailField label={fields.paid} value={record?.paidDate ? formatSalesDate(record.paidDate) : t.common.notAvailable} />
            </div>
          </section>
        </div>

        <DialogFooter className={modalStyles.footer}>
          <Button type="button" className={modalStyles.primaryButton} onClick={() => onOpenChange(false)}>
            {t.common.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
