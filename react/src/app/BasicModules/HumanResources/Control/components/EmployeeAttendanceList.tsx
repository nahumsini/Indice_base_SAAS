import type { UIEvent } from 'react';
import { Search } from 'lucide-react';
import type { AttendanceControlAssignment } from '../../../../api/humanResources';
import { ControlAttendanceRow, type AttendanceControlCopy } from './ControlAttendanceWidgets';

export type AttendanceFilterOption = {
  value: string;
  label: string;
  count?: number;
};

export function EmployeeAttendanceList({
  copy,
  locale,
  assignments,
  selectedEmployeeId,
  searchQuery,
  unitFilter,
  businessFilter,
  statusFilter,
  unitFilterOptions,
  businessFilterOptions,
  statusFilterOptions,
  allFilterValue,
  onSearchChange,
  onUnitFilterChange,
  onBusinessFilterChange,
  onStatusFilterChange,
  onSelectAssignment,
  onScroll,
}: {
  copy: AttendanceControlCopy;
  locale: string;
  assignments: AttendanceControlAssignment[];
  selectedEmployeeId: number | null;
  searchQuery: string;
  unitFilter: string;
  businessFilter: string;
  statusFilter: string;
  unitFilterOptions: AttendanceFilterOption[];
  businessFilterOptions: AttendanceFilterOption[];
  statusFilterOptions: AttendanceFilterOption[];
  allFilterValue: string;
  onSearchChange: (value: string) => void;
  onUnitFilterChange: (value: string) => void;
  onBusinessFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSelectAssignment: (assignment: AttendanceControlAssignment) => void;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
}) {
  return (
    <>
      <div className="border-b border-[#143675]/10 bg-[#f7faff] px-5 py-4 dark:border-gray-800 dark:bg-gray-900/30">
        <div className="grid gap-3 lg:grid-cols-2">
          <label className="block lg:col-span-2">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
              {copy.labels.searchLabel}
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="h-10 w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
              {copy.labels.unit}
            </span>
            <select
              value={unitFilter}
              onChange={(event) => onUnitFilterChange(event.target.value)}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value={allFilterValue}>{copy.labels.allUnits}</option>
              {unitFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
              {copy.labels.business}
            </span>
            <select
              value={businessFilter}
              onChange={(event) => onBusinessFilterChange(event.target.value)}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value={allFilterValue}>{copy.labels.allBusinesses}</option>
              {businessFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {statusFilterOptions.map((option) => {
            const isActive = option.value === statusFilter;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onStatusFilterChange(option.value)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'border-[#143675] bg-[#143675] text-white shadow-[0_1px_2px_rgba(20,54,117,0.14)]'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-[#143675]/40 hover:text-[#143675] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-[#8bb3ff]/40 dark:hover:text-[#8bb3ff]'
                }`}
              >
                {option.label}
                {typeof option.count === 'number' ? (
                  <span className={`ml-2 rounded-full px-1.5 py-0.5 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {option.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-h-[860px] space-y-2 overflow-y-auto bg-[#f7faff]/70 p-2 dark:bg-gray-950/20" onScroll={onScroll}>
        {assignments.length > 0 ? (
          assignments.map((assignment) => (
            <ControlAttendanceRow
              key={assignment.user_company_id}
              assignment={assignment}
              copy={copy}
              locale={locale}
              selected={selectedEmployeeId === assignment.user_company_id}
              onSelect={() => onSelectAssignment(assignment)}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-[#143675]/15 bg-white px-6 py-10 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
            {copy.labels.noEmployees}
          </div>
        )}
      </div>
    </>
  );
}
