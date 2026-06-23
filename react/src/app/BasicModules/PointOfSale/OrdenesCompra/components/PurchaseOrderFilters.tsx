import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PosWarehouseSummary } from '../../Sale/services/posBackendApi';
import type { PurchaseOrderFilters } from '../hooks/usePurchaseOrderWorkspace';
import type { ProviderOption, PurchaseOrderStatus } from '../types/purchaseOrder.types';
import { purchaseOrderStatusLabels } from '../utils/purchaseOrderFormat';

const statuses: Array<PurchaseOrderStatus | 'ALL'> = [
  'ALL',
  'DRAFT',
  'REQUESTED',
  'APPROVED',
  'SENT',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED',
];

export function PurchaseOrderFiltersBar({
  filters,
  providers,
  warehouses,
  onChange,
}: {
  filters: PurchaseOrderFilters;
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
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(260px,1.4fr)_repeat(5,minmax(160px,1fr))]">
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
        <SelectField label="Estado" value={filters.status} onChange={(value) => update('status', value as PurchaseOrderFilters['status'])}>
          {statuses.map((status) => (
            <option key={status} value={status}>{status === 'ALL' ? 'Todos' : purchaseOrderStatusLabels[status]}</option>
          ))}
        </SelectField>
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
