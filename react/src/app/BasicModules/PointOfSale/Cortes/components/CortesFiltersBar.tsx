import { Search } from 'lucide-react';
import {
  type CortesDifferenceFilter,
  type CortesFilters,
  type CortesPeriodFilter,
  getCortesPeriodRange,
} from '../utils/cortesUtils';

export type CortesFilterOption = {
  label: string;
  value: string;
};

interface CortesFiltersBarProps {
  cashiers: CortesFilterOption[];
  cashRegisters: CortesFilterOption[];
  filters: CortesFilters;
  onChange: <Key extends keyof CortesFilters>(key: Key, value: CortesFilters[Key]) => void;
  warehouses: CortesFilterOption[];
}

export function CortesFiltersBar({
  cashiers,
  cashRegisters,
  filters,
  onChange,
  warehouses,
}: CortesFiltersBarProps) {
  const handlePeriodChange = (period: CortesPeriodFilter) => {
    onChange('period', period);

    if (period !== 'custom') {
      const range = getCortesPeriodRange(period);
      onChange('dateFrom', range.dateFrom);
      onChange('dateTo', range.dateTo);
    }
  };

  const handleCustomDateChange = (key: 'dateFrom' | 'dateTo', value: string) => {
    onChange('period', 'custom');
    onChange(key, value);
  };

  return (
    <section className="rounded-[20px] border border-[#FF6B5E]/20 bg-white p-4 shadow-sm dark:border-[#FF6B5E]/25 dark:bg-slate-900 sm:p-5">
      <div className="mb-4">
        <div>
          <h3 className="text-base font-black text-[#222831] dark:text-white">Filtros</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Filtra por jornada, contexto operativo y diferencias de caja.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        <SearchField
          value={filters.search}
          onChange={(value) => onChange('search', value)}
        />
        <SelectField
          label="Periodo"
          value={filters.period}
          options={periodOptions}
          onChange={(value) => handlePeriodChange(value as CortesPeriodFilter)}
        />
        <SelectField
          label="Diferencia"
          value={filters.difference}
          options={differenceOptions}
          onChange={(value) => onChange('difference', value as CortesDifferenceFilter)}
        />
        <SelectField
          label="Almacen"
          value={filters.warehouseId || 'all'}
          options={[allOption('Todos'), ...warehouses]}
          onChange={(value) => onChange('warehouseId', value === 'all' ? '' : value)}
        />
        <SelectField
          label="Caja"
          value={filters.cashRegisterId || 'all'}
          options={[allOption('Todos'), ...cashRegisters]}
          onChange={(value) => onChange('cashRegisterId', value === 'all' ? '' : value)}
        />
        <SelectField
          label="Cajero"
          value={filters.userId || 'all'}
          options={[allOption('Todos'), ...cashiers]}
          onChange={(value) => onChange('userId', value === 'all' ? '' : value)}
        />
      </div>

      {filters.period === 'custom' ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
          <DateInput label="Desde" value={filters.dateFrom} onChange={(value) => handleCustomDateChange('dateFrom', value)} />
          <DateInput label="Hasta" value={filters.dateTo} onChange={(value) => handleCustomDateChange('dateTo', value)} />
        </div>
      ) : null}
    </section>
  );
}

const periodOptions: Array<{ label: string; value: CortesPeriodFilter }> = [
  { label: 'Hoy', value: 'today' },
  { label: 'Ayer', value: 'yesterday' },
  { label: 'Esta semana', value: 'week' },
  { label: 'Este mes', value: 'month' },
  { label: 'Personalizado', value: 'custom' },
];

const differenceOptions: Array<{ label: string; value: CortesDifferenceFilter }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Cuadrados', value: 'balanced' },
  { label: 'Con diferencia', value: 'withDifference' },
  { label: 'Faltantes', value: 'short' },
  { label: 'Sobrantes', value: 'over' },
];

const allOption = (label: string): CortesFilterOption => ({ label, value: 'all' });

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <FilterLabel>{label}</FilterLabel>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
      />
    </label>
  );
}

function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 md:col-span-2 xl:col-span-2">
      <FilterLabel>Buscar</FilterLabel>
      <span className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Folio, caja, turno o usuario"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
      </span>
    </label>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: CortesFilterOption[];
  value: string;
}) {
  return (
    <label className="space-y-2">
      <FilterLabel>{label}</FilterLabel>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterLabel({ children }: { children: string }) {
  return (
    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
      {children}
    </span>
  );
}
