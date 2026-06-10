import { Search, X } from 'lucide-react';

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
const typeOptions = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'bank', label: 'Cuenta bancaria' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'credit_card', label: 'Tarjeta de crédito' },
  { value: 'debit_card', label: 'Tarjeta de débito' },
  { value: 'digital_wallet', label: 'Billetera digital' },
];

export function PaymentAccountsFilters({
  filteredCount,
  searchTerm,
  statusFilter,
  typeFilter,
  onSearchChange,
  onStatusChange,
  onTypeChange,
}: PaymentAccountsFiltersProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Filtros</h3>
        <span className="text-sm text-slate-500 dark:text-slate-400">{filteredCount} resultados</span>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[minmax(280px,1.4fr)_repeat(2,minmax(0,1fr))]">
        <SearchField searchTerm={searchTerm} onSearchChange={onSearchChange} />
        <FilterSelect label="Tipo de cuenta" value={typeFilter} onChange={onTypeChange} options={typeOptions} />
        <FilterSelect label="Estado" value={statusFilter} onChange={onStatusChange} options={[{ value: 'all', label: 'Todos' }, { value: 'active', label: 'Activas' }, { value: 'inactive', label: 'Inactivas' }]} />
      </div>
    </div>
  );
}

function SearchField({ onSearchChange, searchTerm }: { onSearchChange: (value: string) => void; searchTerm: string }) {
  return (
    <label className="min-w-0">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Buscar</span>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input type="text" value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} placeholder="Nombre, número, banco o custodio" className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
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
