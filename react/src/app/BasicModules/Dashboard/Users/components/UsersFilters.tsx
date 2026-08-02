import { ChevronDown, Filter, Search } from 'lucide-react';
import { Button } from '../../../../components/ui/button';

interface UsersFiltersProps {
  allLabel: string;
  businessFilter: string;
  businessLabel: string;
  businessOptions: Array<{ label: string; value: string }>;
  clearLabel: string;
  filterTitle: string;
  hasActiveFilters: boolean;
  insightLabel: string;
  onBusinessChange: (value: string) => void;
  onClear: () => void;
  onRoleChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onUnitChange: (value: string) => void;
  roleFilter: string;
  roleLabel: string;
  roleOptions: Array<{ label: string; value: string }>;
  searchLabel: string;
  searchTerm: string;
  statusFilter: string;
  statusLabel: string;
  statusOptions: Array<{ label: string; value: string }>;
  unitFilter: string;
  unitLabel: string;
  unitOptions: Array<{ label: string; value: string }>;
}

const controlClassName =
  'h-10 w-full rounded-xl border border-slate-300 bg-white text-sm text-slate-900 outline-none transition-colors focus:border-[var(--indice-blue)] focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white';

export function UsersFilters({
  allLabel,
  businessFilter,
  businessLabel,
  businessOptions,
  clearLabel,
  filterTitle,
  hasActiveFilters,
  insightLabel,
  onBusinessChange,
  onClear,
  onRoleChange,
  onSearchChange,
  onStatusChange,
  onUnitChange,
  roleFilter,
  roleLabel,
  roleOptions,
  searchLabel,
  searchTerm,
  statusFilter,
  statusLabel,
  statusOptions,
  unitFilter,
  unitLabel,
  unitOptions,
}: UsersFiltersProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-4">
      <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-[minmax(135px,0.65fr)_minmax(220px,1.35fr)_minmax(150px,0.85fr)_minmax(150px,0.85fr)_minmax(130px,0.7fr)_minmax(130px,0.7fr)_auto]">
        <div className="self-center md:col-span-2 xl:col-span-1">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">{filterTitle}</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{insightLabel}</p>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">{searchLabel}</span>
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
          <span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">{unitLabel}</span>
          <span className="relative block">
            <Filter aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              aria-label={unitLabel}
              className={`${controlClassName} cursor-pointer appearance-none pl-10 pr-10`}
              value={unitFilter}
              onChange={(event) => onUnitChange(event.target.value)}
            >
              <option value="">{allLabel}</option>
              {unitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">{businessLabel}</span>
          <span className="relative block">
            <Filter aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              aria-label={businessLabel}
              className={`${controlClassName} cursor-pointer appearance-none pl-10 pr-10`}
              value={businessFilter}
              onChange={(event) => onBusinessChange(event.target.value)}
            >
              <option value="">{allLabel}</option>
              {businessOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">{roleLabel}</span>
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
          <span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">{statusLabel}</span>
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

        <div className="flex min-h-10 items-center justify-end md:col-span-2 xl:col-span-1">
          {hasActiveFilters ? (
            <Button type="button" variant="outline" size="sm" onClick={onClear} className="h-10 rounded-xl px-3">
              {clearLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
