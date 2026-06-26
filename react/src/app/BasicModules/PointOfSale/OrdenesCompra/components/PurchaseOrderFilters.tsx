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
import {
  purchaseOrderOriginLabels,
  purchaseOrderStatusLabels,
  supplierSubmissionStatusLabels,
} from '../utils/purchaseOrderFormat';

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
  const update = <K extends keyof PurchaseOrderFilters>(key: K, value: PurchaseOrderFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Filtros</h3>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(260px,1.4fr)_repeat(6,minmax(150px,1fr))]">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Buscar</span>
          <span className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={filters.query}
              onChange={(event) => update('query', event.target.value)}
              placeholder="Folio, proveedor o almacen"
              className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            />
          </span>
        </label>
        {mode === 'orders' ? (
          <>
            <SelectField label="Estado" value={filters.status} onChange={(value) => update('status', value as PurchaseOrderFilters['status'])}>
              {statuses.map((status) => (
                <option key={status} value={status}>{status === 'ALL' ? 'Todos' : purchaseOrderStatusLabels[status]}</option>
              ))}
            </SelectField>
            <SelectField label="Origen" value={filters.origin} onChange={(value) => update('origin', value as PurchaseOrderFilters['origin'])}>
              {origins.map((origin) => (
                <option key={origin} value={origin}>{origin === 'ALL' ? 'Todos' : purchaseOrderOriginLabels[origin]}</option>
              ))}
            </SelectField>
          </>
        ) : (
          <>
            <SelectField label="Estado propuesta" value={filters.submissionStatus} onChange={(value) => update('submissionStatus', value as PurchaseOrderFilters['submissionStatus'])}>
              {submissionStatuses.map((status) => (
                <option key={status} value={status}>{status === 'ALL' ? 'Todos' : supplierSubmissionStatusLabels[status]}</option>
              ))}
            </SelectField>
            <ReadOnlyField label="Origen" value="Kiosko proveedor" />
          </>
        )}
        <SelectField label="Proveedor" value={String(filters.providerId)} onChange={(value) => update('providerId', value === 'ALL' ? 'ALL' : Number(value))}>
          <option value="ALL">Todos</option>
          {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
        </SelectField>
        <SelectField label="Almacen" value={String(filters.warehouseId)} onChange={(value) => update('warehouseId', value === 'ALL' ? 'ALL' : Number(value))}>
          <option value="ALL">Todos</option>
          {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
        </SelectField>
        <InputField label="Desde" type="date" value={filters.dateFrom} onChange={(value) => update('dateFrom', value)} />
        <InputField label="Hasta" type="date" value={filters.dateTo} onChange={(value) => update('dateTo', value)} />
      </div>
    </section>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <span className="flex h-11 items-center rounded-xl border border-orange-100 bg-orange-50 px-3 text-sm font-bold text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200">
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
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      >
        {children}
      </select>
    </label>
  );
}

function InputField({
  label,
  onChange,
  type,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type: string;
  value: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </label>
  );
}
