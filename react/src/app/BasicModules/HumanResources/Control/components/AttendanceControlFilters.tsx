import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AttendanceControlCopy } from './ControlAttendanceWidgets';
import type { AttendanceFilterOption } from './EmployeeAttendanceList';

const controlInputClassName = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-none outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

function FilterField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      {children}
    </label>
  );
}

export function AttendanceControlFilters({
  allFilterValue,
  businessFilter,
  businessFilterOptions,
  controlDate,
  copy,
  onBusinessFilterChange,
  onDateChange,
  onSearchChange,
  onStatusFilterChange,
  onUnitFilterChange,
  searchQuery,
  statusFilter,
  statusFilterOptions,
  unitFilter,
  unitFilterOptions,
}: {
  allFilterValue: string;
  businessFilter: string;
  businessFilterOptions: AttendanceFilterOption[];
  controlDate: string;
  copy: AttendanceControlCopy;
  onBusinessFilterChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onUnitFilterChange: (value: string) => void;
  searchQuery: string;
  statusFilter: string;
  statusFilterOptions: AttendanceFilterOption[];
  unitFilter: string;
  unitFilterOptions: AttendanceFilterOption[];
}) {
  const formatOptionLabel = (option: AttendanceFilterOption) => (
    typeof option.count === 'number' ? `${option.label} (${option.count})` : option.label
  );

  return (
    <section className="mb-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-4 text-base font-bold text-slate-800 dark:text-white">{copy.labels.filtersTitle}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <FilterField label={copy.labels.searchLabel}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className={`${controlInputClassName} pl-10`}
            />
          </div>
        </FilterField>

        <FilterField label={copy.labels.unit}>
          <select
            value={unitFilter}
            onChange={(event) => onUnitFilterChange(event.target.value)}
            className={controlInputClassName}
          >
            <option value={allFilterValue}>{copy.labels.allUnits}</option>
            {unitFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label={copy.labels.business}>
          <select
            value={businessFilter}
            onChange={(event) => onBusinessFilterChange(event.target.value)}
            className={controlInputClassName}
          >
            <option value={allFilterValue}>{copy.labels.allBusinesses}</option>
            {businessFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label={copy.labels.period}>
          <input
            type="date"
            value={controlDate}
            onChange={(event) => onDateChange(event.target.value)}
            className={controlInputClassName}
          />
        </FilterField>

        <FilterField label={copy.labels.status}>
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
            className={controlInputClassName}
          >
            {statusFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {formatOptionLabel(option)}
              </option>
            ))}
          </select>
        </FilterField>
      </div>
    </section>
  );
}
