import type { AttendanceControlAssignment } from '../../../../api/humanResources';
import type { AttendanceControlCopy } from './ControlAttendanceWidgets';
import { EmployeeAttendanceList } from './EmployeeAttendanceList';

export function AttendanceDailyBoard({
  copy,
  locale,
  controlDateLabel,
  visibleCount,
  filteredCount,
  assignments,
  currentPage,
  endRow,
  pageCount,
  pageSize,
  pageSizeOptions,
  selectedEmployeeId,
  startRow,
  onPageChange,
  onPageSizeChange,
  onSelectAssignment,
}: {
  copy: AttendanceControlCopy;
  locale: string;
  controlDateLabel: string;
  visibleCount: number;
  filteredCount: number;
  assignments: AttendanceControlAssignment[];
  currentPage: number;
  endRow: number;
  pageCount: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  selectedEmployeeId: number | null;
  startRow: number;
  onPageChange: (value: number) => void;
  onPageSizeChange: (value: number) => void;
  onSelectAssignment: (assignment: AttendanceControlAssignment) => void;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-[#59C3A5]/10 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="border-b border-[#59C3A5]/10 px-5 py-5 dark:border-gray-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{copy.labels.dailyAttendance}</h3>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{controlDateLabel}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {visibleCount} / {filteredCount}
            </p>
          </div>
        </div>
      </div>

      <EmployeeAttendanceList
        copy={copy}
        locale={locale}
        assignments={assignments}
        currentPage={currentPage}
        endRow={endRow}
        pageSize={pageSize}
        pageSizeOptions={pageSizeOptions}
        selectedEmployeeId={selectedEmployeeId}
        filteredCount={filteredCount}
        pageCount={pageCount}
        startRow={startRow}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        onSelectAssignment={onSelectAssignment}
      />
    </section>
  );
}
