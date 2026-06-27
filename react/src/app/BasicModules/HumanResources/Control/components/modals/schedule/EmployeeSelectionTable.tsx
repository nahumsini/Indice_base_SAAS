import { useMemo, useState } from 'react';
import { ArrowUpDown, CheckCircle2, ChevronDown, ChevronUp, Info, Search, UserCheck } from 'lucide-react';
import { Button } from '../../../../../../components/ui/button';
import { Checkbox } from '../../../../../../components/ui/checkbox';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../../../../../components/ui/pagination';
import type { AttendanceControlAssignment } from '../../../../../../api/humanResources';
import type { ControlTranslations } from '../../../translations';
import { getScheduleBlockReason, isScheduleAssignable } from '../../../utils/scheduleValidation';

type EmployeeSelectionSortKey = 'employee' | 'department' | 'schedule';
type EmployeeSelectionSortDirection = 'asc' | 'desc';

interface EmployeeSelectionTableProps {
  allVisibleSelected: boolean;
  assignmentEffectiveStartDate: string;
  availabilityDate: string;
  businessOptions: ReadonlyArray<readonly [string, string]>;
  candidateBusyCount: number;
  candidateTotalCount: number;
  changePage: (page: number) => void;
  copy: ControlTranslations;
  currentPage: number;
  isLoadingCandidates: boolean;
  negocioFilter: string;
  paginatedAssignments: AttendanceControlAssignment[];
  paginationEnd: number;
  paginationItems: Array<number | 'ellipsis'>;
  paginationStart: number;
  searchQuery: string;
  selectedEmployeeIds: number[];
  setEmployeeSelection: (employeeId: number, shouldSelect: boolean) => void;
  setSearchQuery: (value: string) => void;
  todayDate: string;
  toggleAll: () => void;
  toggleEmployee: (employeeId: number) => void;
  totalPages: number;
  unidadFilter: string;
  unitOptions: ReadonlyArray<readonly [string, string]>;
  visibleAssignableEmployeeIds: number[];
  onApplySearchFilters: () => void;
  onAvailabilityDateChange: (value: string) => void;
  onBusinessFilterChange: (value: string) => void;
  onUnitFilterChange: (value: string) => void;
}

export function EmployeeSelectionTable({
  allVisibleSelected,
  assignmentEffectiveStartDate,
  availabilityDate,
  businessOptions,
  candidateBusyCount,
  candidateTotalCount,
  changePage,
  copy,
  currentPage,
  isLoadingCandidates,
  negocioFilter,
  paginatedAssignments,
  paginationEnd,
  paginationItems,
  paginationStart,
  searchQuery,
  selectedEmployeeIds,
  setEmployeeSelection,
  setSearchQuery,
  todayDate,
  toggleAll,
  toggleEmployee,
  totalPages,
  unidadFilter,
  unitOptions,
  visibleAssignableEmployeeIds,
  onApplySearchFilters,
  onAvailabilityDateChange,
  onBusinessFilterChange,
  onUnitFilterChange,
}: EmployeeSelectionTableProps) {
  const [sortKey, setSortKey] = useState<EmployeeSelectionSortKey>('employee');
  const [sortDirection, setSortDirection] = useState<EmployeeSelectionSortDirection>('asc');

  const sortedAssignments = useMemo(() => {
    const getSortValue = (assignment: AttendanceControlAssignment) => {
      if (sortKey === 'department') {
        return assignment.department || assignment.position_title || '';
      }

      if (sortKey === 'schedule') {
        return assignment.schedule_template_name || copy.schedule.noScheduleSaved;
      }

      return assignment.user_name;
    };

    return [...paginatedAssignments].sort((left, right) => {
      const leftValue = getSortValue(left).toLocaleLowerCase();
      const rightValue = getSortValue(right).toLocaleLowerCase();
      const comparison = leftValue.localeCompare(rightValue, undefined, {
        numeric: true,
        sensitivity: 'base',
      });

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [copy.schedule.noScheduleSaved, paginatedAssignments, sortDirection, sortKey]);

  const toggleSort = (nextSortKey: EmployeeSelectionSortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection('asc');
  };

  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{copy.schedule.filters.applySchedule}</p>
            <h3 className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{copy.schedule.filters.effectiveDate}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {copy.schedule.filters.effectiveDescription}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 self-start rounded-full bg-[#59C3A5]/10 px-3 py-1 text-xs font-semibold text-[#59C3A5] dark:bg-[#8FE0CA]/15 dark:text-[#8FE0CA] sm:self-auto">
            <UserCheck className="h-3.5 w-3.5" />
            {copy.schedule.selectedCount(selectedEmployeeIds.length)}
          </span>
        </div>
        <input
          type="date"
          value={availabilityDate}
          min={todayDate}
          onChange={(event) => onAvailabilityDateChange(event.target.value)}
          className="mt-4 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition-colors focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:max-w-56"
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 id="available-hr-users-heading" className="text-sm font-semibold text-slate-950 dark:text-white">
              {copy.schedule.filters.selectHrUsers}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {copy.schedule.newScheduleStartsOn(assignmentEffectiveStartDate)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {copy.schedule.shownCount(candidateTotalCount)}
            </span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200">
              {copy.schedule.selectedCount(selectedEmployeeIds.length)}
            </span>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60 lg:grid-cols-[minmax(0,1fr)_10rem_10rem_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onApplySearchFilters();
                }
              }}
              placeholder={copy.schedule.filters.searchPlaceholder}
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <select
            aria-label={copy.schedule.filters.filterByUnit}
            value={unidadFilter}
            onChange={(event) => onUnitFilterChange(event.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">{copy.schedule.filters.allUnits}</option>
            {unitOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            aria-label={copy.schedule.filters.filterByBusiness}
            value={negocioFilter}
            onChange={(event) => onBusinessFilterChange(event.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">{copy.schedule.filters.allBusinesses}</option>
            {businessOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <Button
            type="button"
            variant="outline"
            onClick={onApplySearchFilters}
            className="h-10 gap-2 rounded-md border-slate-200 bg-white px-3 text-[#59C3A5] shadow-sm hover:bg-blue-50 hover:text-[#59C3A5] dark:border-slate-700 dark:bg-slate-950 dark:text-[#8FE0CA] dark:hover:bg-blue-950/20"
          >
            <Search className="h-4 w-4" />
            {copy.schedule.filters.filter}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              <tr>
                <th className="w-10 px-3 py-2 text-left">
                  <Checkbox
                    checked={allVisibleSelected}
                    disabled={isLoadingCandidates || visibleAssignableEmployeeIds.length === 0}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <SortableHeader
                  isActive={sortKey === 'employee'}
                  label={copy.schedule.table.employee}
                  sortDirection={sortDirection}
                  onSort={() => toggleSort('employee')}
                />
                <SortableHeader
                  isActive={sortKey === 'department'}
                  label={copy.schedule.table.department}
                  sortDirection={sortDirection}
                  onSort={() => toggleSort('department')}
                />
                <SortableHeader
                  isActive={sortKey === 'schedule'}
                  label={copy.schedule.table.currentSchedule}
                  sortDirection={sortDirection}
                  onSort={() => toggleSort('schedule')}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
              {isLoadingCandidates ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    {copy.schedule.filters.loadingHrUsers}
                  </td>
                </tr>
              ) : candidateTotalCount === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    {copy.schedule.filters.noHrUsers}
                  </td>
                </tr>
              ) : (
                sortedAssignments.map((assignment) => {
                  const isSelected = selectedEmployeeIds.includes(assignment.user_company_id);
                  const hasScheduleNotice = !isScheduleAssignable(assignment);
                  const lockedReason = getScheduleBlockReason(assignment) || copy.schedule.existingScheduleOrSite;
                  const isAttendanceLocked = lockedReason.toLowerCase().includes('attendance');
                  const currentScheduleName = assignment.schedule_template_name || copy.schedule.noScheduleSaved;
                  const statusTooltip = hasScheduleNotice
                    ? `${lockedReason}. ${copy.schedule.chooseAnotherDate}`
                    : assignment.schedule_template_name
                      ? copy.schedule.existingScheduleWillReplace
                      : copy.schedule.canReceiveSchedule;

                  return (
                    <tr
                      key={assignment.user_company_id}
                      title={statusTooltip}
                      className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 ${
                        isSelected ? 'bg-blue-50/70 ring-1 ring-inset ring-blue-100 dark:bg-blue-950/20 dark:ring-blue-900/40' : ''
                      }`}
                      onClick={() => toggleEmployee(assignment.user_company_id)}
                    >
                      <td className="px-3 py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => setEmployeeSelection(assignment.user_company_id, checked === true)}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </td>
                      <td className="px-3 py-3 text-sm font-medium text-slate-950 dark:text-white">
                        {assignment.user_name}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {assignment.department || assignment.position_title || '-'}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          title={statusTooltip}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            hasScheduleNotice
                              ? isAttendanceLocked
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200'
                          }`}
                        >
                          {hasScheduleNotice ? <Info className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          {currentScheduleName}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoadingCandidates && candidateTotalCount > 0 ? (
          <div className="flex flex-col gap-4 border-t border-slate-100 px-4 py-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {copy.schedule.showingRows(paginationStart, paginationEnd, candidateTotalCount)}
              </p>
              {candidateBusyCount > 0 ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {copy.schedule.filters.busyContext(candidateBusyCount)}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.schedule.pageLabel(currentPage, totalPages)}</p>
              <Pagination className="mx-0 w-auto justify-start md:justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        changePage(currentPage - 1);
                      }}
                      aria-disabled={currentPage === 1}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
                    />
                  </PaginationItem>
                  {paginationItems.map((item, index) => (
                    item === 'ellipsis' ? (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={item}>
                        <PaginationLink
                          href="#"
                          isActive={item === currentPage}
                          onClick={(event) => {
                            event.preventDefault();
                            changePage(item);
                          }}
                        >
                          {item}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        changePage(currentPage + 1);
                      }}
                      aria-disabled={currentPage === totalPages}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : undefined}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}

function SortableHeader({
  isActive,
  label,
  sortDirection,
  onSort,
}: {
  isActive: boolean;
  label: string;
  sortDirection: EmployeeSelectionSortDirection;
  onSort: () => void;
}) {
  const Icon = !isActive ? ArrowUpDown : sortDirection === 'asc' ? ChevronUp : ChevronDown;

  return (
    <th className="px-3 py-2 text-left">
      <button
        type="button"
        onClick={onSort}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
          isActive
            ? 'text-[#59C3A5] dark:text-[#8FE0CA]'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        {label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </th>
  );
}
