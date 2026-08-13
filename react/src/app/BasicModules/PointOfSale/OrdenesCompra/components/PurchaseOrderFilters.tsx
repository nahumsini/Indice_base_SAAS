import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PosWarehouseSummary } from '../../Sale/services/posBackendApi';
import type { PurchaseOrderFilters } from '../hooks/usePurchaseOrderWorkspace';
import type {
  ProviderOption,
  PurchaseOrderOrigin,
  PurchaseOrderStatus,
  SupplierSubmissionStatus,
} from '../types/purchaseOrder.types';
import { usePurchaseOrderTranslations } from '../hooks/usePurchaseOrderTranslations';

const statuses: Array<PurchaseOrderStatus | 'ALL'> = [
  'ALL',
  'DRAFT',
  'REQUESTED',
  'IN_REVIEW',
  'NEEDS_CLARIFICATION',
  'APPROVED',
  'ISSUED',
  'SENT',
  'CONFIRMED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'INVOICED',
  'VALIDATED_FOR_PAYMENT',
  'SCHEDULED_FOR_PAYMENT',
  'PAID',
  'CLOSED',
  'CANCELLED',
  'REJECTED',
];

const origins: Array<PurchaseOrderOrigin | 'ALL'> = [
  'ALL',
  'INDICE',
  'SUPPLIER_KIOSK',
  'POS_REPLENISHMENT',
  'SALES',
  'IMPORT',
];

const submissionStatuses: Array<SupplierSubmissionStatus | 'ALL'> = [
  'ALL',
  'SUBMITTED',
  'IN_REVIEW',
  'NEEDS_CLARIFICATION',
  'APPROVED',
  'PARTIALLY_APPROVED',
  'REJECTED',
  'CONVERTED_TO_PURCHASE_ORDER',
];

const periods: PurchaseOrderFilters['period'][] = ['ALL', 'CURRENT_MONTH', 'PREVIOUS_MONTH', 'LAST_90_DAYS', 'CURRENT_YEAR'];

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPeriodRange = (period: PurchaseOrderFilters['period']) => {
  const today = new Date();
  if (period === 'ALL') return { dateFrom: '', dateTo: '' };
  if (period === 'CURRENT_MONTH') return { dateFrom: toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)), dateTo: toDateInput(today) };
  if (period === 'PREVIOUS_MONTH') return {
    dateFrom: toDateInput(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
    dateTo: toDateInput(new Date(today.getFullYear(), today.getMonth(), 0)),
  };
  if (period === 'LAST_90_DAYS') {
    const start = new Date(today);
    start.setDate(start.getDate() - 89);
    return { dateFrom: toDateInput(start), dateTo: toDateInput(today) };
  }
  return { dateFrom: toDateInput(new Date(today.getFullYear(), 0, 1)), dateTo: toDateInput(today) };
};

export function PurchaseOrderFiltersBar({
  filters,
  mode,
  providers,
  warehouses,
  onChange,
}: {
  filters: PurchaseOrderFilters;
  mode: 'orders' | 'submissions';
  providers: ProviderOption[];
  warehouses: PosWarehouseSummary[];
  onChange: (filters: PurchaseOrderFilters) => void;
}) {
  const { copy } = usePurchaseOrderTranslations();
  const update = <K extends keyof PurchaseOrderFilters>(key: K, value: PurchaseOrderFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };
  const updatePeriod = (period: PurchaseOrderFilters['period']) => {
    onChange({ ...filters, period, ...getPeriodRange(period) });
  };

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-lg font-medium text-slate-950 dark:text-white">{copy.filters.title}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <label className="space-y-2 sm:col-span-2 xl:col-span-1">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.filters.search}</span>
          <span className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={filters.query}
              onChange={(event) => update('query', event.target.value)}
              placeholder={copy.filters.searchPlaceholder}
              className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            />
          </span>
        </label>
        <SelectField label={copy.filters.period} value={filters.period} onChange={(value) => updatePeriod(value as PurchaseOrderFilters['period'])}>
          {periods.map((period) => <option key={period} value={period}>{copy.filters.periodOptions[period]}</option>)}
        </SelectField>
        {mode === 'orders' ? (
          <SelectField label={copy.filters.status} value={filters.status} onChange={(value) => update('status', value as PurchaseOrderFilters['status'])}>
            {statuses.map((status) => (
              <option key={status} value={status}>{status === 'ALL' ? copy.common.all : copy.orderStatus[status]}</option>
            ))}
          </SelectField>
        ) : (
          <SelectField label={copy.filters.submissionStatus} value={filters.submissionStatus} onChange={(value) => update('submissionStatus', value as PurchaseOrderFilters['submissionStatus'])}>
            {submissionStatuses.map((status) => (
              <option key={status} value={status}>{status === 'ALL' ? copy.common.all : copy.submissionStatus[status]}</option>
            ))}
          </SelectField>
        )}
        <SelectField label={copy.filters.provider} value={String(filters.providerId)} onChange={(value) => update('providerId', value === 'ALL' ? 'ALL' : Number(value))}>
          <option value="ALL">{copy.common.all}</option>
          {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
        </SelectField>
        <SelectField label={copy.filters.warehouse} value={String(filters.warehouseId)} onChange={(value) => update('warehouseId', value === 'ALL' ? 'ALL' : Number(value))}>
          <option value="ALL">{copy.common.all}</option>
          {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
        </SelectField>
        {mode === 'orders' ? (
          <SelectField label={copy.filters.channel} value={filters.origin} onChange={(value) => update('origin', value as PurchaseOrderFilters['origin'])}>
            {origins.map((origin) => (
              <option key={origin} value={origin}>{origin === 'ALL' ? copy.common.all : copy.origin[origin]}</option>
            ))}
          </SelectField>
        ) : <ReadOnlyField label={copy.filters.channel} value={copy.filters.supplierKiosk} />}
      </div>
    </section>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <span className="flex h-11 items-center rounded-xl border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-3 text-sm font-medium text-[#B63B32] dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/15 dark:text-[#FFB0AA]">
        {value}
      </span>
    </label>
  );
}

function SelectField({
  children,
  label,
  onChange,
  value,
}: {
  children: ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      >
        {children}
      </select>
    </label>
  );
}
