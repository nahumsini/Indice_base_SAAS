import { DataTablePagination } from '../../../../components/table/DataTablePagination';
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
  assignments: AttendanceControlAssignment[];
  currentPage: number;
  endRow: number;
  filteredCount: number;
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
          <div className="rounded-2xl border border-dashed border-[#59C3A5]/20 bg-white px-6 py-10 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            {copy.labels.noEmployees}
          </div>
        )}
      </div>

      <DataTablePagination
        currentPage={currentPage}
        itemLabel={copy.summary.employees}
        labels={{
          next: copy.timeTable.nextPage,
          page: copy.timeTable.pageLabel,
          previous: copy.timeTable.previousPage,
          rowsPerPage: copy.timeTable.pageSize,
          showing: (start, end, total) => copy.timeTable.showingRows(start, end, total),
        }}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageEnd={endRow}
        pageSize={pageSize}
        pageSizeOptions={pageSizeOptions}
        pageStart={startRow}
        totalCount={filteredCount}
        totalPages={pageCount}
      />
    </>
  );
}
