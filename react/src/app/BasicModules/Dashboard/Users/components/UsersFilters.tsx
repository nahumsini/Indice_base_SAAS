import { ChevronDown, Filter, Search } from 'lucide-react';
import { Button } from '../../../../components/ui/button';

interface UsersFiltersProps {
  allLabel: string;
  clearLabel: string;
  filterTitle: string;
  hasActiveFilters: boolean;
  insightLabel: string;
  onClear: () => void;
  onRoleChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  roleFilter: string;
  roleLabel: string;
  roleOptions: Array<{ label: string; value: string }>;
  searchLabel: string;
  searchTerm: string;
  statusFilter: string;
  statusLabel: string;
  statusOptions: Array<{ label: string; value: string }>;
}

const controlClassName =
  'h-11 w-full rounded-xl border border-slate-300 bg-white text-sm text-slate-900 outline-none transition-colors focus:border-[var(--indice-blue)] focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white';

export function UsersFilters({
  allLabel,
  clearLabel,
  filterTitle,
  hasActiveFilters,
  insightLabel,
  onClear,
  onRoleChange,
  onSearchChange,
  onStatusChange,
  roleFilter,
  roleLabel,
  roleOptions,
  searchLabel,
  searchTerm,
  statusFilter,
  statusLabel,
  statusOptions,
}: UsersFiltersProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{filterTitle}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{insightLabel}</p>
        </div>
        {hasActiveFilters ? (
          <Button type="button" variant="outline" size="sm" onClick={onClear} className="h-9 rounded-lg">
            {clearLabel}
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{searchLabel}</span>
          <span className="relative block">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              aria-label={searchLabel}
              placeholder={searchLabel}
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              className={`${controlClassName} pl-10 pr-4`}
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{roleLabel}</span>
          <span className="relative block">
            <Filter aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              aria-label={roleLabel}
              className={`${controlClassName} cursor-pointer appearance-none pl-10 pr-10`}
              value={roleFilter}
              onChange={(event) => onRoleChange(event.target.value)}
            >
              <option value="">{allLabel}</option>
              {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{statusLabel}</span>
          <span className="relative block">
            <Filter aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              aria-label={statusLabel}
              className={`${controlClassName} cursor-pointer appearance-none pl-10 pr-10`}
              value={statusFilter}
              onChange={(event) => onStatusChange(event.target.value)}
            >
              <option value="">{allLabel}</option>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </span>
        </label>
      </div>
    </section>
  );
}
