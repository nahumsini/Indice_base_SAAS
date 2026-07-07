import { Search } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  periodFilterValues,
  type FilterState,
} from '../constants/receivables.constants';
import type { ReceivablesTranslations } from '../translations';
import type { PeriodFilter } from '../types';

interface FilterSelectProps {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}

export function FilterSelect({
  label,
  options,
  value,
  onChange,
}: FilterSelectProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface ReceivablesFiltersProps {
  businessOptions: string[];
  copy: ReceivablesTranslations;
  filters: FilterState;
  statusOptions: Array<{ value: string; label: string }>;
  unitOptions: string[];
  onChange: (filters: FilterState) => void;
}

export function ReceivablesFilters({
  businessOptions,
  copy,
  filters,
  statusOptions,
  unitOptions,
  onChange,
}: ReceivablesFiltersProps) {
  return (
    <section className="mb-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-4 text-base font-bold text-slate-800 dark:text-white">{copy.filters.title}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-2 xl:col-span-1">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.filters.search}</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              value={filters.search}
              onChange={(event) => onChange({ ...filters, search: event.target.value })}
              placeholder={copy.filters.searchPlaceholder}
              className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>
        </div>
        <FilterSelect
          label={copy.filters.period}
          value={filters.period}
          onChange={(value) => onChange({ ...filters, period: value as PeriodFilter })}
          options={periodFilterValues.map((period) => ({
            value: period,
            label: copy.filters.periodOptions[period],
          }))}
        />
        <FilterSelect
          label={copy.filters.status}
          value={filters.status}
          onChange={(value) => onChange({ ...filters, status: value })}
          options={[{ value: 'all', label: copy.filters.all }, ...statusOptions]}
        />
        <FilterSelect
          label={copy.filters.unit}
          value={filters.unit}
          onChange={(value) => onChange({ ...filters, unit: value })}
          options={[{ value: 'all', label: copy.filters.allUnits }, ...unitOptions.map((unit) => ({ value: unit, label: unit }))]}
        />
        <FilterSelect
          label={copy.filters.business}
          value={filters.business}
          onChange={(value) => onChange({ ...filters, business: value })}
          options={[{ value: 'all', label: copy.filters.all }, ...businessOptions.map((business) => ({ value: business, label: business }))]}
        />
      </div>
    </section>
  );
}
