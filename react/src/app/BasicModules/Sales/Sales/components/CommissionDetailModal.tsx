import { BadgePercent } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { SalesRecordsTranslations } from '../translations';
import type { CommissionRecord } from '../types/commissions';
import { formatCommissionType } from '../utils/commissionRules';
import { formatCommissionRate, formatSalesCurrency, formatSalesDate } from '../utils/salesFormatters';
import { CommissionStatusBadge } from './CommissionTable';
import { DetailField } from './SalesModalPrimitives';

const actionClassNames = getSalesModalActionClassNames('coral');

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
    <SalesModalFrame
      open={open}
      onOpenChange={onOpenChange}
      icon={<BadgePercent className="h-6 w-6" />}
      title={t.commissions.detail.title}
      description={t.commissions.detail.description}
      closeLabel={t.common.close}
      modalType="standard-form"
      bodyClassName="space-y-5"
      footer={(
        <Button type="button" className={actionClassNames.primary} onClick={() => onOpenChange(false)}>
          {t.common.close}
        </Button>
      )}
    >
      <section>
        <h3 className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400">{t.commissions.detail.sections.summary}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <DetailField label={fields.salesRep} value={record?.salesRepName ?? t.common.notAvailable} />
          <DetailField label={fields.customer} value={record?.customerName ?? t.common.notAvailable} />
          <DetailField label={fields.sale} value={record?.saleCode ?? t.common.notAvailable} />
          <DetailField label={fields.product} value={record?.productName ?? t.common.notAvailable} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400">{t.commissions.detail.sections.ruleApplied}</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <DetailField label={fields.ruleName} value={record?.commissionRuleName ?? t.common.notAvailable} />
          <DetailField label={fields.commissionType} value={record ? formatCommissionType(record.commissionType) : t.common.notAvailable} />
          <DetailField label={fields.ruleValue} value={record ? (record.commissionType.startsWith('percentage') ? formatCommissionRate(record.commissionValue) : formatSalesCurrency(record.commissionValue, record.currency)) : t.common.notAvailable} />
          <DetailField label={fields.priority} value={t.common.notAvailable} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400">{t.commissions.detail.sections.financial}</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <DetailField label={fields.saleAmount} value={formatSalesCurrency(record?.saleAmount ?? 0, record?.currency)} />
          <DetailField label={fields.commissionAmount} value={formatSalesCurrency(record?.commissionAmount ?? 0, record?.currency)} />
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{fields.status}</p>
            <div className="mt-2">{record ? <CommissionStatusBadge status={record.status} t={t} naturalCase /> : t.common.notAvailable}</div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400">{t.commissions.detail.sections.timeline}</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <DetailField label={fields.created} value={record?.createdDate ? formatSalesDate(record.createdDate) : t.common.notAvailable} />
          <DetailField label={fields.approved} value={record?.approvedDate ? formatSalesDate(record.approvedDate) : t.common.notAvailable} />
          <DetailField label={fields.paid} value={record?.paidDate ? formatSalesDate(record.paidDate) : t.common.notAvailable} />
        </div>
      </section>
    </SalesModalFrame>
  );
}
