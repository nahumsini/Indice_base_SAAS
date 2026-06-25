import { RotateCcw, Search } from 'lucide-react';
import type { CashAuditFilters, CashAuditOptions } from '../types/cashAudit.types';

interface CashAuditFiltersBarProps {
  filters: CashAuditFilters;
  options: CashAuditOptions;
  onFilterChange: <Key extends keyof CashAuditFilters>(key: Key, value: CashAuditFilters[Key]) => void;
  onReset: () => void;
}

export function CashAuditFiltersBar({
  filters,
  options,
  onFilterChange,
  onReset,
}: CashAuditFiltersBarProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))_auto]">
        <label className="relative min-w-0">
          <span className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Buscar</span>
          <Search className="absolute left-3 top-[34px] h-4 w-4 text-gray-400" />
          <input
            value={filters.search}
            onChange={(event) => onFilterChange('search', event.target.value)}
            placeholder="Buscar cierre, caja, usuario o nota"
            className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
        </label>

        <FilterSelect label="Unidad" value={filters.businessUnit} options={options.businessUnits} onChange={(value) => onFilterChange('businessUnit', value)} />
        <FilterSelect label="Sucursal" value={filters.business} options={options.businesses} onChange={(value) => onFilterChange('business', value)} />
        <FilterSelect label="Caja" value={filters.cashRegister} options={options.cashRegisters} onChange={(value) => onFilterChange('cashRegister', value)} />
        <FilterSelect label="Usuario" value={filters.user} options={options.users} onChange={(value) => onFilterChange('user', value)} />

        <button
          onClick={onReset}
          className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <RotateCcw className="h-4 w-4" />
          Limpiar
        </button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="min-w-0">
          <span className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Enfoque</span>
          <select
            value={filters.focus}
            onChange={(event) => onFilterChange('focus', event.target.value as CashAuditFilters['focus'])}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          >
            <option value="attention">Por revisar</option>
            <option value="difference">Con diferencia</option>
            <option value="reviewed">Revisados</option>
            <option value="all">Todos</option>
          </select>
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Periodo</span>
          <input
            type="month"
            value={filters.month === 'all' ? '' : filters.month}
            onChange={(event) => onFilterChange('month', event.target.value || 'all')}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Estatus</span>
          <select
            value={filters.status}
            onChange={(event) => onFilterChange('status', event.target.value as CashAuditFilters['status'])}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          >
            <option value="all">Todos</option>
            <option value="balanced">Balanceados</option>
            <option value="over">Sobrantes</option>
            <option value="short">Faltantes</option>
          </select>
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Revisión</span>
          <select
            value={filters.reviewStatus}
            onChange={(event) => onFilterChange('reviewStatus', event.target.value as CashAuditFilters['reviewStatus'])}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="in_review">En revisión</option>
            <option value="resolved">Resuelto</option>
          </select>
        </label>
        <FilterSelect label="Empresa" value={filters.company} options={options.companies} onChange={(value) => onFilterChange('company', value)} />
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
      >
        <option value="all">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
