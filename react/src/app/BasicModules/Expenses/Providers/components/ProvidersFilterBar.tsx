import { Search, X } from 'lucide-react';
import {
  providerFilterTypeOptions,
  providerStatusOptions,
  type ProviderStatus,
  type ProviderType,
} from '../useProveedoresLogic';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';

type ProvidersFilterBarProps = {
  businessFilter: string;
  businessOptions: FinanceReferenceOption[];
  businessUnitFilter: string;
  businessUnitOptions: FinanceReferenceOption[];
  filteredCount: number;
  searchTerm: string;
  statusFilter: ProviderStatus | 'all';
  typeFilter: ProviderType | 'all';
  onBusinessChange: (value: string) => void;
  onBusinessUnitChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ProviderStatus | 'all') => void;
  onTypeChange: (value: ProviderType | 'all') => void;
};

const filterInputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

export function ProvidersFilterBar(props: ProvidersFilterBarProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Filtros</h3>
        <span className="text-sm text-slate-500 dark:text-slate-400">{props.filteredCount} resultados</span>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(280px,1.4fr)_repeat(4,minmax(0,1fr))]">
        <SearchField searchTerm={props.searchTerm} onSearchChange={props.onSearchChange} />
        <FilterSelect label="Tipo de proveedor" value={props.typeFilter} options={providerFilterTypeOptions} onChange={(value) => props.onTypeChange(value as ProviderType | 'all')} />
        <FilterSelect label="Unidad" value={props.businessUnitFilter} options={props.businessUnitOptions} onChange={props.onBusinessUnitChange} />
        <FilterSelect label="Negocio" value={props.businessFilter} options={props.businessOptions} onChange={props.onBusinessChange} />
        <FilterSelect label="Estado" value={props.statusFilter} options={[{ value: 'all', label: 'Todos' }, ...providerStatusOptions]} onChange={(value) => props.onStatusChange(value as ProviderStatus | 'all')} />
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
        <input type="text" value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} placeholder="Buscar proveedor" className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        {searchTerm && <button type="button" onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"><X className="h-4 w-4" /></button>}
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
