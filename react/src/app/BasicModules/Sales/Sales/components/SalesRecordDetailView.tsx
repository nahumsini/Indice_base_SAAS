import type { ReactNode } from 'react';
import {
  Building2,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Landmark,
  PackageCheck,
  UserRound,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../../components/ui/collapsible';
import { cn } from '../../../../components/ui/utils';
import type { SalesRecordsTranslations } from '../translations';
import type { CommissionRecord } from '../types/commissions';
import type {
  SaleLifecycleSignals,
  SaleRecord,
  SaleRecordDraft,
  SalesOperationalContext,
} from '../types/salesTypes';
import { formatCommissionType } from '../utils/commissionRules';
import { formatSalesCurrency, formatSalesDate } from '../utils/salesFormatters';
import { normalizeSalesPaymentMethod } from '../utils/salesPaymentMethods';
import { SalesStatusSelectors } from './SalesStatusSelectors';

function DetailItem({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={cn('min-w-0 max-w-[65%] text-right text-sm font-medium leading-5 text-slate-950 dark:text-white', valueClassName)}>
        {value}
      </dd>
    </div>
  );
}

function SummaryItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-[#C83930] dark:bg-rose-950/40 dark:text-rose-300">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-normal leading-4 text-slate-500 dark:text-slate-400">{label}</p>
        <p className="truncate text-sm font-medium text-slate-950 dark:text-white" title={value}>{value}</p>
      </div>
    </div>
  );
}

function DetailSection({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description?: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
      <header className="flex items-start gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800 sm:px-5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-slate-950 dark:text-white">{title}</h3>
          {description ? <p className="mt-0.5 text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
      </header>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

function CollapsibleDetailSection({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description?: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Collapsible>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
        <CollapsibleTrigger className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 sm:px-5 [&[data-state=open]>svg]:rotate-180">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-slate-950 dark:text-white">{title}</span>
            {description ? <span className="mt-0.5 block text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">{description}</span> : null}
          </span>
          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform" />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-5">
          {children}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

function commercialStatusClassName(status: SaleRecordDraft['commercialStatus']) {
  if (status === 'approved') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200';
  if (status === 'rejected' || status === 'cancelled') return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200';
  return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200';
}

export function SalesRecordDetailView({
  commissionRecords,
  form,
  lifecycle,
  operationalContext,
  record,
  t,
  onStatusChange,
}: {
  commissionRecords: CommissionRecord[];
  form: SaleRecordDraft;
  lifecycle?: SaleLifecycleSignals;
  operationalContext: SalesOperationalContext;
  record: SaleRecord;
  t: SalesRecordsTranslations;
  onStatusChange: (patch: Partial<SaleRecord>) => void;
}) {
  const notAvailable = t.common.notAvailable;
  const documentReference = form.saleDocumentReference || form.saleNumber || record.saleNumber || notAvailable;
  const paymentMethod = normalizeSalesPaymentMethod(form.paymentMethod);
  const paymentMethodLabel = paymentMethod
    ? t.modal.paymentMethods[paymentMethod]
    : form.paymentMethod || notAvailable;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-sm dark:border-rose-900/60 dark:bg-slate-900/50">
        <div className="flex flex-col gap-4 bg-gradient-to-br from-rose-50 via-white to-orange-50 px-5 py-4 dark:from-rose-950/30 dark:via-slate-900 dark:to-orange-950/20 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-normal text-slate-500 dark:text-slate-400">{t.modal.fields.saleDocumentReference}</p>
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', commercialStatusClassName(form.commercialStatus))}>
                {t.statuses.commercial[form.commercialStatus]}
              </span>
            </div>
            <h3 className="mt-1 truncate text-lg font-medium text-slate-950 dark:text-white" title={documentReference}>{documentReference}</h3>
            <p className="mt-1 truncate text-sm font-normal text-slate-600 dark:text-slate-300" title={form.customerName || notAvailable}>
              {form.customerName || notAvailable}
            </p>
          </div>
          <div className="shrink-0 sm:text-right">
            <p className="text-xs font-normal text-slate-500 dark:text-slate-400">{t.modal.fields.totalAmount}</p>
            <p className="mt-1 text-2xl font-medium tracking-tight text-slate-950 dark:text-white">
              {formatSalesCurrency(form.totalAmount, form.currency)}
            </p>
          </div>
        </div>

        <div className="grid divide-y divide-slate-100 dark:divide-slate-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <SummaryItem icon={<CalendarDays className="h-4 w-4" />} label={t.modal.fields.saleDate} value={formatSalesDate(form.saleDate)} />
          <SummaryItem icon={<UserRound className="h-4 w-4" />} label={t.modal.fields.sellerName} value={form.sellerName || notAvailable} />
          <SummaryItem icon={<ClipboardCheck className="h-4 w-4" />} label={t.modal.fields.quoteReference} value={form.quoteReference || notAvailable} />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <DetailSection icon={<CircleDollarSign className="h-4 w-4" />} title={t.modal.sections.payment}>
          <dl className="divide-y divide-slate-100 dark:divide-slate-800">
            <DetailItem label={t.modal.fields.paymentMethod} value={paymentMethodLabel} />
            <DetailItem label={t.modal.fields.paymentReference} value={form.paymentReference || notAvailable} />
            <DetailItem label={t.modal.fields.paymentEvidenceStatus} value={t.statuses.paymentEvidence[form.paymentEvidenceStatus]} />
            <DetailItem label={t.modal.fields.paymentAccount} value={form.paymentAccountName || notAvailable} />
          </dl>
        </DetailSection>

        <DetailSection icon={<PackageCheck className="h-4 w-4" />} title={t.modal.sections.inventory} description={t.modal.inventoryExecutionHelper}>
          <dl className="divide-y divide-slate-100 dark:divide-slate-800">
            <DetailItem label={t.modal.fields.warehouse} value={form.warehouseName || operationalContext.defaultWarehouse || notAvailable} />
            <DetailItem label={t.modal.fields.inventoryMovementStatus} value={t.statuses.movement[form.inventoryMovementStatus]} />
            <DetailItem label={t.modal.fields.inventoryMovementReference} value={form.inventoryMovementReference || notAvailable} />
          </dl>
        </DetailSection>
      </div>

      <DetailSection icon={<ClipboardCheck className="h-4 w-4" />} title={t.modal.sections.validation}>
        <SalesStatusSelectors record={{ ...record, ...form }} t={t} onChange={onStatusChange} />
      </DetailSection>

      <CollapsibleDetailSection icon={<Building2 className="h-4 w-4" />} title={t.modal.sections.operationalContext} description={t.modal.operationalContext.helper}>
        <div className="grid gap-x-8 md:grid-cols-2">
          <dl className="divide-y divide-slate-100 dark:divide-slate-800">
            <DetailItem label={t.modal.fields.businessUnit} value={form.businessUnitName || notAvailable} />
            <DetailItem label={t.modal.fields.business} value={form.businessName || notAvailable} />
            <DetailItem label={t.modal.operationalContext.legalName} value={operationalContext.legalName} />
          </dl>
          <dl className="divide-y divide-slate-100 dark:divide-slate-800">
            <DetailItem label={t.modal.operationalContext.taxIdentifier} value={operationalContext.taxIdentifier} />
            <DetailItem label={t.modal.operationalContext.fiscalAddress} value={operationalContext.fiscalAddress} />
            <DetailItem label={t.modal.fields.currency} value={operationalContext.currency} />
          </dl>
        </div>
      </CollapsibleDetailSection>

      <CollapsibleDetailSection icon={<UserRound className="h-4 w-4" />} title={t.modal.sections.postSaleSnapshot} description={t.modal.postSaleSnapshotHelper}>
        <div className="grid gap-x-8 md:grid-cols-2">
          <dl className="divide-y divide-slate-100 dark:divide-slate-800">
            <DetailItem label={t.modal.fields.customerHealth} value={lifecycle ? t.lifecycle.health[lifecycle.health] : notAvailable} />
            <DetailItem label={t.modal.fields.relationship} value={lifecycle ? t.lifecycle.relationship[lifecycle.relationship] : notAvailable} />
            <DetailItem label={t.modal.fields.openCases} value={String(lifecycle?.openCases ?? 0)} />
          </dl>
          <dl className="divide-y divide-slate-100 dark:divide-slate-800">
            <DetailItem label={t.modal.fields.nextFollowUpDate} value={lifecycle?.nextFollowUpDate ?? notAvailable} />
            <DetailItem label={t.modal.fields.renewalDate} value={lifecycle?.renewalDate ?? notAvailable} />
            <DetailItem label={t.modal.fields.postSaleStatus} value={lifecycle?.postSaleStatus ?? t.lifecycle.noPostSaleStatus} />
          </dl>
        </div>
      </CollapsibleDetailSection>

      <CollapsibleDetailSection icon={<Landmark className="h-4 w-4" />} title={t.modal.sections.commissionBreakdown} description={t.modal.commissionBreakdownHelper}>
        {commissionRecords.length ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {commissionRecords.map((commission) => (
              <div key={commission.id} className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{commission.productName}</p>
                  <p className="mt-0.5 truncate text-xs font-normal text-slate-500 dark:text-slate-400">
                    {commission.salesRepName} · {commission.commissionRuleName} · {formatCommissionType(commission.commissionType)}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm font-medium text-slate-950 dark:text-white">{formatSalesCurrency(commission.commissionAmount, commission.currency)}</p>
                  <p className="mt-0.5 text-xs font-normal text-slate-500 dark:text-slate-400">{t.commissions.statuses[commission.status]}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-normal text-slate-500 dark:text-slate-400">{t.commissions.detail.noCommissionRecords}</p>
        )}
      </CollapsibleDetailSection>

      <DetailSection icon={<ClipboardCheck className="h-4 w-4" />} title={t.modal.sections.notes}>
        <p className="whitespace-pre-wrap text-sm font-normal leading-6 text-slate-700 dark:text-slate-200">{form.notes || notAvailable}</p>
      </DetailSection>
    </div>
  );
}
