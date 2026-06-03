import { Search } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
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
  currentPage,
  endRow,
  filteredCount,
  pageCount,
  selectedEmployeeId,
  searchQuery,
  startRow,
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
  onPageChange,
  onSelectAssignment,
}: {
  copy: AttendanceControlCopy;
  locale: string;
  assignments: AttendanceControlAssignment[];
  currentPage: number;
  endRow: number;
  filteredCount: number;
  pageCount: number;
  selectedEmployeeId: number | null;
  searchQuery: string;
  startRow: number;
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
  onPageChange: (value: number) => void;
  onSelectAssignment: (assignment: AttendanceControlAssignment) => void;
}) {
  return (
    <>
      <div className="border-b border-[#59C3A5]/10 bg-[#F4FCF9] px-5 py-4 dark:border-gray-800 dark:bg-gray-900/30">
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
                className="h-10 w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
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
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
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
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
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
                    ? 'border-[#59C3A5] bg-[#59C3A5] text-white shadow-[0_1px_2px_rgba(89,195,165,0.14)]'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-[#59C3A5]/40 hover:text-[#59C3A5] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-[#8FE0CA]/40 dark:hover:text-[#8FE0CA]'
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

      <div className="space-y-2 bg-[#F4FCF9]/70 p-2 dark:bg-gray-950/20">
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
          <div className="rounded-xl border border-dashed border-[#59C3A5]/15 bg-white px-6 py-10 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
            {copy.labels.noEmployees}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-[#59C3A5]/10 bg-white px-5 py-3 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {copy.timeTable.showingRows(startRow, endRow, filteredCount)}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            {copy.timeTable.previousPage}
          </Button>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
            {copy.timeTable.pageLabel(currentPage, pageCount)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
            disabled={currentPage >= pageCount}
          >
            {copy.timeTable.nextPage}
          </Button>
        </div>
      </div>
    </>
  );
}
