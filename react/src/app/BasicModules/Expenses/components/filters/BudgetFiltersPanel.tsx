import { Search, X } from 'lucide-react';
import { getIndiceFilterControlClassName } from '../../../../components/frontend-os';
import type { Provider } from '../../types/expenses.types';
import type { BudgetFutureFilter } from '../../Budgets/useBudgetLogic';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import { useBudgetsTranslations } from '../../Budgets/hooks/useBudgetsTranslations';

type BudgetFiltersPanelProps = {
  accountingAccountFilter: string;
  accountingAccountOptions: FinanceReferenceOption[];
  businessOptions: FinanceReferenceOption[];
  businessFilter: string;
  businessUnitFilter: string;
  businessUnitOptions: FinanceReferenceOption[];
  customEndDate: string;
  customStartDate: string;
  futureFilter: BudgetFutureFilter;
  providerFilter: string;
  providers: Provider[];
  resultCount: number;
  searchTerm: string;
  onAccountingAccountChange: (value: string) => void;
  onBusinessChange: (value: string) => void;
  onBusinessUnitChange: (value: string) => void;
  onCustomEndDateChange: (value: string) => void;
  onCustomStartDateChange: (value: string) => void;
  onFutureFilterChange: (value: BudgetFutureFilter) => void;
  onProviderChange: (value: string) => void;
  onSearchChange: (value: string) => void;
};

const filterInputClass = getIndiceFilterControlClassName('green');

export function BudgetFiltersPanel({
  accountingAccountFilter,
  accountingAccountOptions,
  businessOptions,
  businessFilter,
  businessUnitFilter,
  businessUnitOptions,
  customEndDate,
  customStartDate,
  futureFilter,
  providerFilter,
  providers,
  resultCount,
  searchTerm,
  onAccountingAccountChange,
  onBusinessChange,
  onBusinessUnitChange,
  onCustomEndDateChange,
  onCustomStartDateChange,
  onFutureFilterChange,
  onProviderChange,
  onSearchChange,
}: BudgetFiltersPanelProps) {
  const t = useBudgetsTranslations();

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-950 dark:text-white">{t.filters.title}</h3>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{t.budgets.filters.defaultHelp}</p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-[#147514]/15 bg-[#147514]/10 px-3 py-1 text-xs font-bold text-[#147514] dark:border-emerald-900/50 dark:bg-emerald-400/10 dark:text-emerald-300">{t.common.results(resultCount)}</span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{t.common.search}</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} placeholder={t.budgets.filters.searchPlaceholder} className={`${filterInputClass} pl-10 pr-10`} />
            {searchTerm && (
              <button type="button" onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300" aria-label={t.budgets.filters.clearSearch}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <Select label={t.filters.unit} value={businessUnitFilter} onChange={onBusinessUnitChange} options={businessUnitOptions.map(option => [option.value, option.label])} />
        <Select label={t.filters.business} value={businessFilter} onChange={onBusinessChange} options={businessOptions.map(option => [option.value, option.label])} />

        <Select label={t.budgets.filters.futurePeriod} value={futureFilter} onChange={(value) => onFutureFilterChange(value as BudgetFutureFilter)} options={[
          ['next_month', t.budgets.filters.nextMonth],
          ['next_quarter', t.budgets.filters.nextQuarter],
          ['custom', t.budgets.filters.customFutureRange],
        ]} />

        {futureFilter === 'custom' && (
          <>
            <DateField label={t.budgets.filters.from} value={customStartDate} onChange={onCustomStartDateChange} />
            <DateField label={t.budgets.filters.to} value={customEndDate} onChange={onCustomEndDateChange} />
          </>
        )}

        <Select label={t.filters.provider} value={providerFilter} onChange={onProviderChange} options={[['all', t.common.all], ...providers.map(provider => [provider.id, provider.name])]} />
        <Select label={t.budgets.filters.accountingAccount} value={accountingAccountFilter} onChange={onAccountingAccountChange} options={accountingAccountOptions.map(option => [option.value, option.label])} />
      </div>
    </section>
  );
}

function DateField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</label>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className={filterInputClass} />
    </div>
  );
}

function Select({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[][]; value: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={filterInputClass}>
        {options.map(([optionValue, labelText]) => <option key={optionValue} value={optionValue}>{labelText}</option>)}
      </select>
    </div>
  );
}
