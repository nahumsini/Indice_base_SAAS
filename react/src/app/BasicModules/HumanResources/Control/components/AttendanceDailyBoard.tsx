import type { UIEvent } from 'react';
import type { AttendanceControlAssignment } from '../../../../api/humanResources';
import type { AttendanceControlCopy } from './ControlAttendanceWidgets';
import { type AttendanceFilterOption, EmployeeAttendanceList } from './EmployeeAttendanceList';

export function AttendanceDailyBoard({
  copy,
  locale,
  controlDate,
  controlDateLabel,
  visibleCount,
  filteredCount,
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
  onDateChange,
  onSearchChange,
  onUnitFilterChange,
  onBusinessFilterChange,
  onStatusFilterChange,
  onSelectAssignment,
  onScroll,
}: {
  copy: AttendanceControlCopy;
  locale: string;
  controlDate: string;
  controlDateLabel: string;
  visibleCount: number;
  filteredCount: number;
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
  onDateChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onUnitFilterChange: (value: string) => void;
  onBusinessFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSelectAssignment: (assignment: AttendanceControlAssignment) => void;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[22px] border border-[#143675]/10 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_8px_24px_rgba(15,23,42,0.03)] dark:border-gray-800 dark:bg-gray-800">
      <div className="border-b border-[#143675]/10 px-5 py-5 dark:border-gray-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{copy.labels.dailyAttendance}</h3>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{controlDateLabel}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {visibleCount} / {filteredCount}
            </p>
          </div>
          <div className="w-full max-w-[180px]">
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
              {copy.labels.controlDate}
            </label>
            <input
              type="date"
              value={controlDate}
              onChange={(event) => onDateChange(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      <EmployeeAttendanceList
        copy={copy}
        locale={locale}
        assignments={assignments}
        selectedEmployeeId={selectedEmployeeId}
        searchQuery={searchQuery}
        unitFilter={unitFilter}
        businessFilter={businessFilter}
        statusFilter={statusFilter}
        unitFilterOptions={unitFilterOptions}
        businessFilterOptions={businessFilterOptions}
        statusFilterOptions={statusFilterOptions}
        allFilterValue={allFilterValue}
        onSearchChange={onSearchChange}
        onUnitFilterChange={onUnitFilterChange}
        onBusinessFilterChange={onBusinessFilterChange}
        onStatusFilterChange={onStatusFilterChange}
        onSelectAssignment={onSelectAssignment}
        onScroll={onScroll}
      />
    </section>
  );
}
