import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Clock3,
  LogIn,
  LogOut,
  Printer,
  UserX,
  X,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { useControlTranslations } from '../hooks/useControlTranslations';
import type {
  DailyAttendanceMetric,
  TimeTableEmployeeRow,
  TimeTableModalProps,
  TimeTableSortDirection,
  TimeTableSortKey,
} from '../types/timeTableTypes';
import { printDailyAttendanceReport } from '../utils/timeTablePrintReport';
import {
  assignmentBusinessFilterValue,
  assignmentBusinessLocationName,
  assignmentBusinessName,
  assignmentContractSiteName,
  assignmentUnitFilterValue,
  assignmentUnitName,
  attendanceLabel,
  compareNullableTime,
  compareText,
  hasWorkingRule,
  isAbsentAssignment,
  isActiveEmployee,
  isLateAssignment,
  parseLocalDate,
  scheduleWindow,
} from '../utils/timeTableUtils';
import {
  EmployeeTable,
  OrganizationSummary,
  TimeTableFilters,
  TimeTableKpiStrip,
} from './modals/timetable/TimeTableSections';

export function TimeTableModal({
  isOpen,
  onClose,
  assignments,
  date,
  locale,
  onDateChange,
}: TimeTableModalProps) {
  const copy = useControlTranslations();
  const [unitFilter, setUnitFilter] = useState('');
  const [businessFilter, setBusinessFilter] = useState('');
  const [sortKey, setSortKey] = useState<TimeTableSortKey>('employee');
  const [sortDirection, setSortDirection] = useState<TimeTableSortDirection>('asc');

  const dateLabel = useMemo(() => {
    const parsed = parseLocalDate(date);
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(parsed);
  }, [date, locale]);

  const activeAssignments = useMemo(
    () => assignments.filter(isActiveEmployee),
    [assignments],
  );

  const unitOptions = useMemo(
    () => Array.from(new Map(
      activeAssignments.map((assignment) => [
        assignmentUnitFilterValue(assignment),
        assignmentUnitName(assignment, copy),
      ]),
    ).entries()).sort((left, right) => left[1].localeCompare(right[1])),
    [activeAssignments, copy],
  );

  const unitFilteredAssignments = useMemo(
    () => unitFilter
      ? activeAssignments.filter((assignment) => assignmentUnitFilterValue(assignment) === unitFilter)
      : activeAssignments,
    [activeAssignments, unitFilter],
  );

  const businessOptions = useMemo(
    () => Array.from(new Map(
      unitFilteredAssignments.map((assignment) => [
        assignmentBusinessFilterValue(assignment),
        assignmentBusinessName(assignment, copy),
      ]),
    ).entries()).sort((left, right) => left[1].localeCompare(right[1])),
    [copy, unitFilteredAssignments],
  );

  const filteredAssignments = useMemo(
    () => businessFilter
      ? unitFilteredAssignments.filter((assignment) => assignmentBusinessFilterValue(assignment) === businessFilter)
      : unitFilteredAssignments,
    [businessFilter, unitFilteredAssignments],
  );

  const selectedUnitLabel = useMemo(
    () => unitOptions.find(([value]) => value === unitFilter)?.[1] ?? '',
    [unitFilter, unitOptions],
  );

  const selectedBusinessLabel = useMemo(
    () => businessOptions.find(([value]) => value === businessFilter)?.[1] ?? '',
    [businessFilter, businessOptions],
  );

  const unitCoverage = useMemo(() => {
    const groups = new Map<string, {
      unitId: string;
      unit: string;
      businesses: Map<string, number>;
      count: number;
    }>();

    filteredAssignments.forEach((assignment) => {
      const unitId = assignmentUnitFilterValue(assignment);
      const unit = assignmentUnitName(assignment, copy);
      const business = assignmentBusinessName(assignment, copy);
      const current = groups.get(unitId);

      if (current) {
        current.count += 1;
        current.businesses.set(business, (current.businesses.get(business) ?? 0) + 1);
      } else {
        groups.set(unitId, {
          unitId,
          unit,
          businesses: new Map([[business, 1]]),
          count: 1,
        });
      }
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        businessList: Array.from(group.businesses.entries())
          .map(([business, count]) => ({ business, count }))
          .sort((left, right) => left.business.localeCompare(right.business)),
      }))
      .sort((left, right) => left.unit.localeCompare(right.unit));
  }, [copy, filteredAssignments]);

  const visibleUnitCoverage = useMemo(
    () => unitCoverage,
    [unitCoverage],
  );

  useEffect(() => {
    if (unitFilter && !unitOptions.some(([value]) => value === unitFilter)) {
      setUnitFilter('');
    }
  }, [unitFilter, unitOptions]);

  useEffect(() => {
    if (businessFilter && !businessOptions.some(([value]) => value === businessFilter)) {
      setBusinessFilter('');
    }
  }, [businessFilter, businessOptions]);

  const employeeRows = useMemo<TimeTableEmployeeRow[]>(
    () => filteredAssignments
      .map((assignment) => {
        return {
          assignment,
          workingDays: hasWorkingRule(assignment) ? 1 : 0,
          hasScheduleAssignment: Boolean(assignment.schedule_template_id && assignment.today_rule),
          hasWorkSite: Boolean(assignment.active_work_site),
          schedule: scheduleWindow(assignment, copy.timeTable),
          attendance: attendanceLabel(assignment, copy),
          hasAttendance: Boolean(assignment.first_check_in_at || assignment.last_check_out_at),
          businessLocation: assignmentBusinessLocationName(assignment, copy.timeTable),
          contractSite: assignmentContractSiteName(assignment, copy.timeTable),
        };
      }),
    [copy, filteredAssignments],
  );

  const sortedEmployeeRows = useMemo(() => {
    const getComparisonValue = (row: TimeTableEmployeeRow, key: TimeTableSortKey) => {
      switch (key) {
        case 'employee':
          return row.assignment.user_name;
        case 'unit':
          return assignmentUnitName(row.assignment, copy);
        case 'business':
          return assignmentBusinessName(row.assignment, copy);
        case 'businessLocation':
          return row.businessLocation;
        case 'contractSite':
          return row.contractSite;
        case 'scheduledTime':
          return row.schedule;
        case 'attendance':
          return row.attendance;
        default:
          return '';
      }
    };

    return [...employeeRows].sort((left, right) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      if (sortKey === 'checkIn') {
        return compareNullableTime(left.assignment.first_check_in_at, right.assignment.first_check_in_at) * direction;
      }
      if (sortKey === 'checkOut') {
        return compareNullableTime(left.assignment.last_check_out_at, right.assignment.last_check_out_at) * direction;
      }
      return compareText(getComparisonValue(left, sortKey), getComparisonValue(right, sortKey)) * direction;
    });
  }, [copy, employeeRows, sortDirection, sortKey]);

  const handleSortChange = (nextSortKey: TimeTableSortKey) => {
    if (nextSortKey === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection('asc');
  };

  const organisationSummary = useMemo(
    () => ({
      totalEmployees: filteredAssignments.length,
      businesses: filteredAssignments.length
        ? new Set(filteredAssignments.map((assignment) => assignmentBusinessName(assignment, copy))).size
        : 0,
    }),
    [copy, filteredAssignments],
  );

  const dailyAttendanceSummary = useMemo(
    () => ({
      checkIns: employeeRows.filter((row) => Boolean(row.assignment.first_check_in_at)).length,
      checkOuts: employeeRows.filter((row) => Boolean(row.assignment.last_check_out_at)).length,
      activeShifts: employeeRows.filter((row) => row.workingDays > 0).length,
      noRecords: employeeRows.filter((row) => !row.assignment.first_check_in_at && !row.assignment.last_check_out_at).length,
      late: employeeRows.filter((row) => isLateAssignment(row.assignment)).length,
      absences: employeeRows.filter((row) => isAbsentAssignment(row.assignment)).length,
    }),
    [employeeRows],
  );

  const dailyAttendanceMetrics = useMemo<DailyAttendanceMetric[]>(
    () => [
      {
        key: 'checkIns',
        icon: <LogIn className="h-4 w-4" />,
        label: copy.timeTable.metrics.checkIns.label,
        title: copy.timeTable.metrics.checkIns.title,
        value: dailyAttendanceSummary.checkIns,
        valueClassName: 'text-emerald-600',
      },
      {
        key: 'checkOuts',
        icon: <LogOut className="h-4 w-4" />,
        label: copy.timeTable.metrics.checkOuts.label,
        title: copy.timeTable.metrics.checkOuts.title,
        value: dailyAttendanceSummary.checkOuts,
        valueClassName: 'text-[#59C3A5]',
      },
      {
        key: 'activeShifts',
        icon: <Activity className="h-4 w-4" />,
        label: copy.timeTable.metrics.activeShifts.label,
        title: copy.timeTable.metrics.activeShifts.title,
        value: dailyAttendanceSummary.activeShifts,
        valueClassName: 'text-[#59C3A5]',
      },
      {
        key: 'noRecords',
        icon: <Clock3 className="h-4 w-4" />,
        label: copy.timeTable.metrics.noRecords.label,
        title: copy.timeTable.metrics.noRecords.title,
        value: dailyAttendanceSummary.noRecords,
        valueClassName: 'text-blue-600',
      },
      {
        key: 'late',
        icon: <AlertTriangle className="h-4 w-4" />,
        label: copy.timeTable.metrics.late.label,
        title: copy.timeTable.metrics.late.title,
        value: dailyAttendanceSummary.late,
        valueClassName: 'text-amber-600',
      },
      {
        key: 'absences',
        icon: <UserX className="h-4 w-4" />,
        label: copy.timeTable.metrics.absences.label,
        title: copy.timeTable.metrics.absences.title,
        value: dailyAttendanceSummary.absences,
        valueClassName: 'text-rose-600',
      },
    ],
    [copy, dailyAttendanceSummary],
  );

  const handlePrintDailyAttendance = () => {
    printDailyAttendanceReport({
      businessFilter,
      copy,
      dailyAttendanceMetrics,
      dateLabel,
      locale,
      selectedBusinessLabel,
      selectedUnitLabel,
      sortedEmployeeRows,
      unitFilter,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent
        className="flex max-h-[94vh] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white p-0 text-gray-900 shadow-2xl dark:border-slate-700 dark:bg-gray-950 dark:text-gray-100 sm:max-w-[1180px]"
        overlayClassName="bg-slate-950/55 backdrop-blur-sm"
        hideCloseButton
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{copy.labels.timeTable}</DialogTitle>
          <DialogDescription>{copy.timeTable.modalDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 items-start justify-between gap-4 bg-[#59C3A5] px-6 py-4 text-white dark:bg-[#59C3A5]">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold tracking-tight text-white">
                {copy.labels.timeTable}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-white/80">
                {copy.timeTable.headerDescription}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label={copy.labels.closeModal}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-slate-50/70 px-5 py-5 dark:bg-slate-950/40">
          <TimeTableFilters
            businessFilter={businessFilter}
            businessOptions={businessOptions}
            copy={copy}
            date={date}
            unitFilter={unitFilter}
            unitOptions={unitOptions}
            onBusinessFilterChange={setBusinessFilter}
            onDateChange={onDateChange}
            onUnitFilterChange={setUnitFilter}
          />

          <TimeTableKpiStrip metrics={dailyAttendanceMetrics} />

          <OrganizationSummary
            businessFilter={businessFilter}
            copy={copy}
            dateLabel={dateLabel}
            selectedBusinessLabel={selectedBusinessLabel}
            selectedUnitLabel={selectedUnitLabel}
            totalEmployees={organisationSummary.totalEmployees}
            unitFilter={unitFilter}
            visibleUnitCoverage={visibleUnitCoverage}
            onUnitFilterChange={setUnitFilter}
          />

          <EmployeeTable
            copy={copy}
            employeeRows={sortedEmployeeRows}
            dateLabel={dateLabel}
            locale={locale}
            selectedBusinessLabel={selectedBusinessLabel}
            selectedUnitLabel={selectedUnitLabel}
            businessFilter={businessFilter}
            unitFilter={unitFilter}
            sortDirection={sortDirection}
            sortKey={sortKey}
            onSortChange={handleSortChange}
          />
        </div>

        <div className="flex shrink-0 justify-end gap-3 bg-[#59C3A5] px-6 py-3 dark:bg-[#59C3A5]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-white/25 bg-transparent text-white shadow-sm hover:bg-white/10 hover:text-white"
          >
            {copy.labels.closeModal}
          </Button>
          <Button
            type="button"
            onClick={handlePrintDailyAttendance}
            className="gap-2 border-white bg-white text-[#59C3A5] shadow-sm hover:bg-white/90 hover:text-[#59C3A5]"
          >
            <Printer className="h-4 w-4" />
            {copy.timeTable.printButton}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
