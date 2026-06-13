import { Search, X } from 'lucide-react';
import { useMemo } from 'react';
import { useFinanceTranslations } from '../../hooks/useFinanceTranslations';

type PaymentAccountsFiltersProps = {
  filteredCount: number;
  searchTerm: string;
  statusFilter: string;
  typeFilter: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTypeChange: (value: string) => void;
};

const filterInputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const paymentTypeValues = ['bank', 'cash', 'credit_card', 'debit_card', 'digital_wallet'];

export function PaymentAccountsFilters({
  filteredCount,
  searchTerm,
  statusFilter,
  typeFilter,
  onSearchChange,
  onStatusChange,
  onTypeChange,
}: PaymentAccountsFiltersProps) {
  const t = useFinanceTranslations();
  const typeOptions = useMemo(() => [
    { value: 'all', label: t.paymentAccounts.filters.allTypes },
    ...paymentTypeValues.map(value => ({
      value,
      label: t.paymentAccounts.types[value] ?? value,
    })),
  ], [t]);
  const statusOptions = useMemo(() => [
    { value: 'all', label: t.common.all },
    { value: 'active', label: t.common.active },
    { value: 'inactive', label: t.common.inactive },
  ], [t]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t.filters.title}</h3>
        <span className="text-sm text-slate-500 dark:text-slate-400">{t.common.results(filteredCount)}</span>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[minmax(280px,1.4fr)_repeat(2,minmax(0,1fr))]">
        <SearchField placeholder={t.paymentAccounts.filters.searchPlaceholder} searchLabel={t.common.search} searchTerm={searchTerm} onSearchChange={onSearchChange} />
        <FilterSelect label={t.paymentAccounts.filters.type} value={typeFilter} onChange={onTypeChange} options={typeOptions} />
        <FilterSelect label={t.filters.status} value={statusFilter} onChange={onStatusChange} options={statusOptions} />
      </div>
    </div>
  );
}

function SearchField({ onSearchChange, placeholder, searchLabel, searchTerm }: { onSearchChange: (value: string) => void; placeholder: string; searchLabel: string; searchTerm: string }) {
  return (
    <label className="min-w-0">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{searchLabel}</span>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input type="text" value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} placeholder={placeholder} className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        {searchTerm ? <button type="button" onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"><X className="h-4 w-4" /></button> : null}
      </div>
    </label>
  );
}

function FilterSelect({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; value: string }) {
  return (
    <label>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={filterInputClass}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
