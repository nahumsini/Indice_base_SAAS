import { Search } from 'lucide-react';
import {
  type CortesDifferenceFilter,
  type CortesFilters,
  type CortesPeriodFilter,
  getCortesPeriodRange,
} from '../utils/cortesUtils';
import type { CortesCopy } from '../cortesTranslations';

export type CortesFilterOption = {
  label: string;
  value: string;
};

interface CortesFiltersBarProps {
  cashiers: CortesFilterOption[];
  cashRegisters: CortesFilterOption[];
  copy: CortesCopy;
  filters: CortesFilters;
  onChange: <Key extends keyof CortesFilters>(key: Key, value: CortesFilters[Key]) => void;
  warehouses: CortesFilterOption[];
}

export function CortesFiltersBar({
  cashiers,
  cashRegisters,
  copy,
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
    <section className="rounded-2xl border border-[#FF6B5E]/20 bg-white p-4 dark:border-[#FF6B5E]/25 dark:bg-slate-900 sm:p-5">
      <div className="mb-4">
        <div>
          <h3 className="text-base font-medium text-[#222831] dark:text-white">{copy.filters.title}</h3>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            {copy.filters.description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        <SearchField
          copy={copy}
          value={filters.search}
          onChange={(value) => onChange('search', value)}
        />
        <SelectField
          label={copy.filters.period}
          value={filters.period}
          options={periodOptions(copy)}
          onChange={(value) => handlePeriodChange(value as CortesPeriodFilter)}
        />
        <SelectField
          label={copy.filters.difference}
          value={filters.difference}
          options={differenceOptions(copy)}
          onChange={(value) => onChange('difference', value as CortesDifferenceFilter)}
        />
        <SelectField
          label={copy.filters.warehouse}
          value={filters.warehouseId || 'all'}
          options={[allOption(copy.common.all), ...warehouses]}
          onChange={(value) => onChange('warehouseId', value === 'all' ? '' : value)}
        />
        <SelectField
          label={copy.filters.cashRegister}
          value={filters.cashRegisterId || 'all'}
          options={[allOption(copy.common.all), ...cashRegisters]}
          onChange={(value) => onChange('cashRegisterId', value === 'all' ? '' : value)}
        />
        <SelectField
          label={copy.filters.cashier}
          value={filters.userId || 'all'}
          options={[allOption(copy.common.all), ...cashiers]}
          onChange={(value) => onChange('userId', value === 'all' ? '' : value)}
        />
      </div>

      {filters.period === 'custom' ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
          <DateInput label={copy.filters.from} value={filters.dateFrom} onChange={(value) => handleCustomDateChange('dateFrom', value)} />
          <DateInput label={copy.filters.to} value={filters.dateTo} onChange={(value) => handleCustomDateChange('dateTo', value)} />
        </div>
      ) : null}
    </section>
  );
}

const periodOptions = (copy: CortesCopy): Array<{ label: string; value: CortesPeriodFilter }> => [
  { label: copy.filters.periods.today, value: 'today' },
  { label: copy.filters.periods.yesterday, value: 'yesterday' },
  { label: copy.filters.periods.week, value: 'week' },
  { label: copy.filters.periods.month, value: 'month' },
  { label: copy.filters.periods.custom, value: 'custom' },
];

const differenceOptions = (copy: CortesCopy): Array<{ label: string; value: CortesDifferenceFilter }> => [
  { label: copy.filters.differences.all, value: 'all' },
  { label: copy.filters.differences.balanced, value: 'balanced' },
  { label: copy.filters.differences.withDifference, value: 'withDifference' },
  { label: copy.filters.differences.short, value: 'short' },
  { label: copy.filters.differences.over, value: 'over' },
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
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
      />
    </label>
  );
}

function SearchField({
  copy,
  value,
  onChange,
}: {
  copy: CortesCopy;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 md:col-span-2 xl:col-span-2">
      <FilterLabel>{copy.filters.search}</FilterLabel>
      <span className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={copy.filters.searchPlaceholder}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
      {children}
    </span>
  );
}
