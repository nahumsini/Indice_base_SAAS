import type { ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
} from 'lucide-react';
import type { ControlTranslations } from '../../../translations';
import type {
  TimeTableEmployeeRow,
  TimeTableSortDirection,
  TimeTableSortKey,
} from '../../../types/timeTableTypes';
import {
  assignmentBusinessName,
  assignmentUnitName,
  formatAttendanceTime,
} from '../../../utils/timeTableUtils';

export function EmployeeTable({
  businessFilter,
  copy,
  dateLabel,
  employeeRows,
  locale,
  selectedBusinessLabel,
  selectedUnitLabel,
  sortDirection,
  sortKey,
  unitFilter,
  onSortChange,
}: {
  businessFilter: string;
  copy: ControlTranslations;
  dateLabel: string;
  employeeRows: TimeTableEmployeeRow[];
  locale: string;
  selectedBusinessLabel: string;
  selectedUnitLabel: string;
  sortDirection: TimeTableSortDirection;
  sortKey: TimeTableSortKey;
  unitFilter: string;
  onSortChange: (value: TimeTableSortKey) => void;
}) {
  const selectionLabel = `${unitFilter ? selectedUnitLabel : copy.timeTable.allUnits} · ${businessFilter ? selectedBusinessLabel : copy.timeTable.allBusinesses}`;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{copy.timeTable.employeeListTitle}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {selectionLabel} · {dateLabel}
          </p>
        </div>
      </div>

      <div className="max-h-[54vh] overflow-auto">
        <table className="min-w-[1320px] divide-y divide-slate-100 dark:divide-slate-800">
          <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(226,232,240,1)] dark:bg-slate-950 dark:shadow-[0_1px_0_rgba(30,41,59,1)]">
            <tr>
              <SortableTableHead activeKey={sortKey} direction={sortDirection} sortKey="employee" onSort={onSortChange}>
                {copy.timeTable.table.employee}
              </SortableTableHead>
              <SortableTableHead activeKey={sortKey} direction={sortDirection} sortKey="unit" onSort={onSortChange}>
                {copy.timeTable.table.unit}
              </SortableTableHead>
              <SortableTableHead activeKey={sortKey} direction={sortDirection} sortKey="business" onSort={onSortChange}>
                {copy.timeTable.table.business}
              </SortableTableHead>
              <SortableTableHead activeKey={sortKey} direction={sortDirection} sortKey="businessLocation" onSort={onSortChange}>
                {copy.timeTable.table.businessLocation}
              </SortableTableHead>
              <SortableTableHead activeKey={sortKey} direction={sortDirection} sortKey="contractSite" onSort={onSortChange}>
                {copy.timeTable.table.workSite}
              </SortableTableHead>
              <SortableTableHead activeKey={sortKey} direction={sortDirection} sortKey="scheduledTime" onSort={onSortChange}>
                {copy.timeTable.table.scheduledTime}
              </SortableTableHead>
              <SortableTableHead activeKey={sortKey} direction={sortDirection} sortKey="checkIn" onSort={onSortChange}>
                {copy.labels.checkIn}
              </SortableTableHead>
              <SortableTableHead activeKey={sortKey} direction={sortDirection} sortKey="checkOut" onSort={onSortChange}>
                {copy.labels.checkOut}
              </SortableTableHead>
              <SortableTableHead activeKey={sortKey} direction={sortDirection} sortKey="attendance" onSort={onSortChange}>
                {copy.timeTable.table.attendance}
              </SortableTableHead>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {employeeRows.length > 0 ? employeeRows.map((row) => {
              const scheduleIssue = !row.hasScheduleAssignment;
              const noWorkingTimeWarning = row.hasScheduleAssignment && row.workingDays === 0;
              const siteWarning = !row.hasWorkSite;
              const rowClassName = scheduleIssue
                ? 'bg-rose-50/70 dark:bg-rose-950/15'
                : noWorkingTimeWarning || siteWarning
                  ? 'bg-amber-50/70 dark:bg-amber-950/15'
                  : 'bg-white dark:bg-slate-900';

              return (
                <tr key={row.assignment.user_company_id} className={`${rowClassName} transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60`}>
                  <TableCell>
                    <div>
                      <p className="font-semibold text-slate-950 dark:text-white">{row.assignment.user_name}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {row.assignment.user_code || `EMP-${row.assignment.user_company_id}`}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{assignmentUnitName(row.assignment, copy)}</TableCell>
                  <TableCell>{assignmentBusinessName(row.assignment, copy)}</TableCell>
                  <TableCell>{row.businessLocation}</TableCell>
                  <TableCell>
                    <div>
                      <p className={siteWarning ? 'font-semibold text-amber-700 dark:text-amber-200' : undefined}>
                        {row.contractSite}
                      </p>
                      {siteWarning ? (
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{copy.timeTable.noWorkSiteAssigned}</p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className={scheduleIssue ? 'font-semibold text-rose-700 dark:text-rose-200' : noWorkingTimeWarning ? 'font-semibold text-amber-700 dark:text-amber-200' : undefined}>
                        {row.schedule}
                      </p>
                      {scheduleIssue ? (
                        <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
                          {copy.timeTable.scheduleMissingHint}
                        </p>
                      ) : null}
                      {noWorkingTimeWarning ? (
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                          {copy.timeTable.noWorkingShiftHint}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{formatAttendanceTime(row.assignment.first_check_in_at, locale)}</TableCell>
                  <TableCell>{formatAttendanceTime(row.assignment.last_check_out_at, locale)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      row.hasAttendance
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                    >
                      {row.attendance}
                    </span>
                  </TableCell>
                </tr>
              );
            }) : null}

            {employeeRows.length === 0 ? (
              <tr>
                <TableCell colSpan={9}>
                  <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-950/40">
                    <Building2 className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{copy.timeTable.noEmployeesFound}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {copy.timeTable.noEmployeesHint}
                    </p>
                  </div>
                </TableCell>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        {copy.timeTable.showingRows(employeeRows.length === 0 ? 0 : 1, employeeRows.length, employeeRows.length)}
      </div>
    </section>
  );
}

function SortableTableHead({
  activeKey,
  children,
  direction,
  sortKey,
  onSort,
}: {
  activeKey: TimeTableSortKey;
  children: ReactNode;
  direction: TimeTableSortDirection;
  sortKey: TimeTableSortKey;
  onSort: (value: TimeTableSortKey) => void;
}) {
  const isActive = activeKey === sortKey;
  const SortIcon = isActive ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-300">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-[#59C3A5] ${
          isActive ? 'text-[#59C3A5] dark:text-[#8FE0CA]' : ''
        }`}
      >
        <span>{children}</span>
        <SortIcon className="h-3.5 w-3.5" />
      </button>
    </th>
  );
}

function TableCell({ children, colSpan }: { children: ReactNode; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
      {children}
    </td>
  );
}
