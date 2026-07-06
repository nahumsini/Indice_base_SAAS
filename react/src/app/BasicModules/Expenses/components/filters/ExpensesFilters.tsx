import { Search, X } from 'lucide-react';
import type { Provider } from '../../types/expenses.types';
import type { ExpenseListFilters, PeriodFilter } from '../../types/expenseView.types';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import { useFinanceTranslations } from '../../hooks/useFinanceTranslations';

type ExpensesFiltersProps = {
  businessOptions: FinanceReferenceOption[];
  businessUnitOptions: FinanceReferenceOption[];
  filteredCount: number;
  filters: ExpenseListFilters;
  providers: Pick<Provider, 'id' | 'name'>[];
  onFiltersChange: (filters: ExpenseListFilters) => void;
};

const filterInputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

const updateFilter = <K extends keyof ExpenseListFilters>(
  filters: ExpenseListFilters,
  key: K,
  value: ExpenseListFilters[K],
) => ({ ...filters, [key]: value });

export function ExpensesFilters({ businessOptions, businessUnitOptions, filteredCount, filters, providers, onFiltersChange }: ExpensesFiltersProps) {
  const t = useFinanceTranslations();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t.filters.title}</h3>
        <span className="text-sm text-slate-500 dark:text-slate-400">{t.common.results(filteredCount)}</span>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(280px,1.4fr)_repeat(5,minmax(0,1fr))]">
        <SearchFilter filters={filters} placeholder={t.expenses.searchPlaceholder} searchLabel={t.common.search} onFiltersChange={onFiltersChange} />
        <SelectFilter
          label={t.filters.unit}
          value={filters.businessUnitFilter}
          onChange={(value) => onFiltersChange(updateFilter(filters, 'businessUnitFilter', value))}
          options={businessUnitOptions.map(option => [option.value, option.label])}
        />
        <SelectFilter
          label={t.filters.business}
          value={filters.businessFilter}
          onChange={(value) => onFiltersChange(updateFilter(filters, 'businessFilter', value))}
          options={businessOptions.map(option => [option.value, option.label])}
        />
        <SelectFilter
          label={t.filters.period}
          value={filters.periodFilter}
          onChange={(value) => onFiltersChange(updateFilter(filters, 'periodFilter', value as PeriodFilter))}
          options={[
            ['this_month', t.periods.thisMonth],
            ['last_month', t.periods.lastMonth],
            ['two_months_ago', t.periods.twoMonthsAgo],
            ['this_year', t.periods.thisYear],
            ['last_year', t.periods.lastYear],
            ['custom', t.periods.custom],
          ]}
        />
        <SelectFilter
          label={t.filters.status}
          value={filters.statusFilter}
          onChange={(value) => onFiltersChange(updateFilter(filters, 'statusFilter', value as ExpenseListFilters['statusFilter']))}
          options={[
            ['all', t.common.all],
            ['pending_and_overdue', `${t.statuses.pending} / ${t.statuses.overdue}`],
            ['paid', t.statuses.paid],
            ['pending', t.statuses.pending],
            ['partial', t.statuses.partial],
            ['overdue', t.statuses.overdue],
            ['audited', t.statuses.audited],
          ]}
        />
        <SelectFilter
          label={t.filters.provider}
          value={filters.providerFilter}
          onChange={(value) => onFiltersChange(updateFilter(filters, 'providerFilter', value))}
          options={providers.map(provider => [provider.id, provider.name])}
        />
      </div>
    </div>
  );
}

function SearchFilter({
  filters,
  onFiltersChange,
  placeholder,
  searchLabel,
}: Pick<ExpensesFiltersProps, 'filters' | 'onFiltersChange'> & { placeholder: string; searchLabel: string }) {
  return (
    <label className="min-w-0">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{searchLabel}</span>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={filters.searchTerm}
          onChange={(event) => onFiltersChange(updateFilter(filters, 'searchTerm', event.target.value))}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
        {filters.searchTerm && (
          <button
            onClick={() => onFiltersChange(updateFilter(filters, 'searchTerm', ''))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </label>
  );
}

function SelectFilter({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[][];
  value: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={filterInputClass}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}
