import { CalendarDays, RotateCcw } from 'lucide-react';
import {
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
  onReset: () => void;
  warehouses: CortesFilterOption[];
}

export function CortesFiltersBar({
  cashiers,
  cashRegisters,
  filters,
  onChange,
  onReset,
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
    <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Filtros</h3>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-4">
            <SelectField
              label="Periodo"
              value={filters.period}
              options={periodOptions}
              onChange={(value) => handlePeriodChange(value as CortesPeriodFilter)}
            />
            <SelectField
              label="Almacén"
              value={filters.warehouseId || 'all'}
              options={[allOption('Todos'), ...warehouses]}
              onChange={(value) => onChange('warehouseId', value === 'all' ? '' : value)}
            />
            <SelectField
              label="Cajero"
              value={filters.userId || 'all'}
              options={[allOption('Todos'), ...cashiers]}
              onChange={(value) => onChange('userId', value === 'all' ? '' : value)}
            />
            <SelectField
              label="Caja"
              value={filters.cashRegisterId || 'all'}
              options={[allOption('Todos'), ...cashRegisters]}
              onChange={(value) => onChange('cashRegisterId', value === 'all' ? '' : value)}
            />
          </div>

          {filters.period === 'custom' ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:gap-4 xl:max-w-xl">
              <DateInput label="Desde" value={filters.dateFrom} onChange={(value) => handleCustomDateChange('dateFrom', value)} />
              <DateInput label="Hasta" value={filters.dateTo} onChange={(value) => handleCustomDateChange('dateTo', value)} />
            </div>
          ) : (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <CalendarDays className="h-4 w-4 text-[#FF6B5E]" />
              <span className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Rango</span>
              <span>{filters.dateFrom === filters.dateTo ? filters.dateFrom : `${filters.dateFrom} a ${filters.dateTo}`}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-11 w-fit shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 xl:mt-9"
        >
          <RotateCcw className="h-4 w-4" />
          Limpiar
        </button>
      </div>
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
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
      />
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
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
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
