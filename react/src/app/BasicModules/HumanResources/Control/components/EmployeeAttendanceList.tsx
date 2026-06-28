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
  startRow,
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
  startRow: number;
  onPageChange: (value: number) => void;
  onSelectAssignment: (assignment: AttendanceControlAssignment) => void;
}) {
  return (
    <>
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
          <div className="rounded-lg border border-dashed border-[#59C3A5]/15 bg-white px-6 py-10 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
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
