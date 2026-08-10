import { useEffect, useState } from 'react';
import { ChevronDown, Filter, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '../../../../components/ui/button';

interface UsersFiltersProps {
  advancedActiveLabel: (count: number) => string;
  allLabel: string;
  businessFilter: string;
  businessLabel: string;
  businessOptions: Array<{ label: string; value: string }>;
  clearLabel: string;
  filterTitle: string;
  hasActiveFilters: boolean;
  hideAdvancedLabel: string;
  insightLabel: string;
  moreFiltersLabel: string;
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
  advancedActiveLabel,
  allLabel,
  businessFilter,
  businessLabel,
  businessOptions,
  clearLabel,
  filterTitle,
  hasActiveFilters,
  hideAdvancedLabel,
  insightLabel,
  moreFiltersLabel,
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
  const advancedFilterCount = [unitFilter, businessFilter, roleFilter].filter(Boolean).length;
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(advancedFilterCount > 0);

  useEffect(() => {
    if (advancedFilterCount > 0) setShowAdvancedFilters(true);
  }, [advancedFilterCount]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 lg:w-48 lg:shrink-0">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">{filterTitle}</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{insightLabel}</p>
        </div>

        <label className="block min-w-0 flex-1">
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

        <label className="block lg:w-48 lg:shrink-0">
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

        <div className="flex items-center gap-2 lg:pb-px">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={showAdvancedFilters}
            onClick={() => setShowAdvancedFilters((visible) => !visible)}
            className="h-10 gap-2 rounded-xl px-3"
          >
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            {showAdvancedFilters ? hideAdvancedLabel : moreFiltersLabel}
            {advancedFilterCount > 0 ? (
              <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] leading-none text-white">{advancedFilterCount}</span>
            ) : null}
          </Button>
          {hasActiveFilters ? (
            <Button type="button" variant="ghost" size="sm" onClick={onClear} className="h-10 rounded-xl px-3">
              {clearLabel}
            </Button>
          ) : null}
        </div>
      </div>

      {showAdvancedFilters ? (
        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
          <div className="mb-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            <span>{advancedFilterCount > 0 ? advancedActiveLabel(advancedFilterCount) : moreFiltersLabel}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <FilterSelect label={unitLabel} value={unitFilter} options={unitOptions} allLabel={allLabel} onChange={onUnitChange} />
            <FilterSelect label={businessLabel} value={businessFilter} options={businessOptions} allLabel={allLabel} onChange={onBusinessChange} />
            <FilterSelect label={roleLabel} value={roleFilter} options={roleOptions} allLabel={allLabel} onChange={onRoleChange} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function FilterSelect({
  allLabel,
  label,
  onChange,
  options,
  value,
}: {
  allLabel: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <span className="relative block">
        <Filter aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <select
          aria-label={label}
          className={`${controlClassName} cursor-pointer appearance-none pl-10 pr-10`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{allLabel}</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </span>
    </label>
  );
}
