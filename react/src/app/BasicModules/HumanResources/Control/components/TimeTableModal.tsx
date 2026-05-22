import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarDays,
  Clock3,
  LogIn,
  LogOut,
  Printer,
  Trash2,
  Users,
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
import {
  type AttendanceControlAssignment,
  type AttendanceControlRule,
} from '../../../../api/humanResources';
import { useControlTranslations } from '../hooks/useControlTranslations';
import type { ControlTranslations } from '../translations';

interface TimeTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignments: AttendanceControlAssignment[];
  date: string;
  locale: string;
  isSaving: boolean;
  onDateChange: (date: string) => void;
  onRemoveShift: (assignment: AttendanceControlAssignment, date?: string) => Promise<void> | void;
}

type TimeTableEmployeeRow = {
  assignment: AttendanceControlAssignment;
  attendance: string;
  businessLocation: string;
  contractSite: string;
  hasAttendance: boolean;
  hasScheduleAssignment: boolean;
  hasWorkSite: boolean;
  schedule: string;
  workingDays: number;
};
type TimeTableUnitCoverage = {
  unitId: string;
  unit: string;
  count: number;
  businessList: Array<{
    business: string;
    count: number;
  }>;
};
type DailyAttendanceMetric = {
  key: string;
  icon: ReactNode;
  label: string;
  title: string;
  value: number;
  valueClassName?: string;
};
type TimeTableCopy = ControlTranslations['timeTable'];

const employeeRowsPerPage = 10;
const noUnitFilterValue = 'unit:none';
const noBusinessFilterValue = 'business:none';

const toTimeText = (value?: string | null) => (value ? value.slice(0, 5) : '');
const parseLocalDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const isActiveEmployee = (assignment: AttendanceControlAssignment) =>
  (assignment.user_status || 'active').toLowerCase() === 'active';

const hasWorkingRule = (assignment: AttendanceControlAssignment) =>
  Boolean(assignment.schedule_template_id && assignment.today_rule && !assignment.today_rule.is_rest_day);

const canRemoveShift = (assignment: AttendanceControlAssignment) =>
  Boolean((assignment.schedule_template_id || assignment.active_work_site) && !assignment.first_check_in_at && !assignment.last_check_out_at);

const assignmentUnitName = (assignment: AttendanceControlAssignment, copy: ControlTranslations) =>
  assignment.unit_name || copy.labels.noUnit;

const assignmentUnitFilterValue = (assignment: AttendanceControlAssignment) =>
  assignment.unit_id != null ? `unit:${assignment.unit_id}` : noUnitFilterValue;

const assignmentBusinessName = (assignment: AttendanceControlAssignment, copy: ControlTranslations) =>
  assignment.business_name || copy.labels.noBusiness;
const assignmentBusinessFilterValue = (assignment: AttendanceControlAssignment) =>
  assignment.business_id != null ? `business:${assignment.business_id}` : noBusinessFilterValue;

const timeTextToMinutes = (value?: string | null) => {
  const timeText = toTimeText(value);
  const [hours, minutes] = timeText.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

const scheduledMinutesForRule = (rule?: AttendanceControlRule | null) => {
  if (!rule || rule.is_rest_day || rule.schedule_mode === 'open') {
    return 0;
  }
  const start = timeTextToMinutes(rule.start_time);
  const end = timeTextToMinutes(rule.end_time);
  if (start == null || end == null || end <= start) {
    return 0;
  }
  return end - start;
};

const formatScheduledDuration = (minutes: number) => {
  if (minutes <= 0) {
    return '';
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (!hours) {
    return `${remainingMinutes}m`;
  }
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const scheduleRuleTimeLabel = (rule: AttendanceControlRule | null | undefined, copy: TimeTableCopy) => {
  if (!rule) {
    return copy.noRule;
  }
  if (rule.is_rest_day) {
    return copy.noShiftDay;
  }
  if (rule.schedule_mode === 'open') {
    return copy.openSchedule;
  }

  const start = toTimeText(rule.start_time);
  const end = toTimeText(rule.end_time);
  const duration = formatScheduledDuration(scheduledMinutesForRule(rule));
  if (start && end) {
    return duration ? `${start} - ${end} (${duration})` : `${start} - ${end}`;
  }
  return copy.notScheduled;
};

const scheduleWindow = (assignment: AttendanceControlAssignment, copy: TimeTableCopy) => {
  if (!assignment.schedule_template_id) {
    return copy.noScheduleAssigned;
  }

  const rule = assignment.today_rule;
  if (!rule) {
    return copy.noScheduleRule;
  }

  if (rule.is_rest_day) {
    return copy.noShiftAssigned;
  }

  return copy.scheduledTime(scheduleRuleTimeLabel(rule, copy));
};

const attendanceLabel = (assignment: AttendanceControlAssignment, copy: ControlTranslations) => {
  const statusKey = assignment.corrected_status ?? assignment.today_status ?? 'pending';
  return (copy.statuses as Record<string, string>)[statusKey] ?? statusKey;
};

const assignmentBusinessLocationName = (assignment: AttendanceControlAssignment, copy: TimeTableCopy) => {
  const businessLocations = (assignment.business_locations ?? [])
    .map((location) => location.name);
  return businessLocations.length > 0 ? businessLocations.join(', ') : copy.notAssigned;
};

const assignmentContractSiteName = (assignment: AttendanceControlAssignment, copy: TimeTableCopy) =>
  assignment.active_work_site?.location_name || copy.notAssigned;

const assignmentStatus = (assignment: AttendanceControlAssignment) =>
  assignment.corrected_status ?? assignment.today_status;

const isLateAssignment = (assignment: AttendanceControlAssignment) =>
  assignmentStatus(assignment) === 'late' || assignment.minutes_late > 0;

const isAbsentAssignment = (assignment: AttendanceControlAssignment) =>
  assignmentStatus(assignment) === 'absence';

const formatAttendanceTime = (value: string | null | undefined, locale: string) => {
  if (!value) {
    return '-';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return toTimeText(value) || value;
  }
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const escapePrintHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const printHtmlDocument = ({
  title,
  bodyHtml,
  lang,
}: {
  title: string;
  bodyHtml: string;
  lang: string;
}) => {
  const htmlDocument = `<!doctype html>
<html lang="${escapePrintHtml(lang)}">
  <head>
    <meta charset="utf-8" />
    <title>${escapePrintHtml(title)}</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      html, body { margin: 0; padding: 0; color: #0f172a; font-family: "Segoe UI", Tahoma, sans-serif; }
      body { padding: 14px; }
      h1, h2, p { margin: 0; }
      .header { border-bottom: 3px solid #59C3A5; margin-bottom: 14px; padding-bottom: 10px; }
      .header h1 { color: #59C3A5; font-size: 20px; margin-bottom: 4px; }
      .meta { color: #475569; font-size: 12px; margin-top: 2px; }
      .metrics { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; margin: 12px 0; }
      .metric { border: 1px solid #dbe3ee; border-radius: 8px; padding: 8px; }
      .metric-value { color: #59C3A5; font-size: 18px; font-weight: 700; }
      .metric-label { color: #475569; font-size: 11px; margin-top: 2px; }
      table { width: 100%; border-collapse: collapse; table-layout: auto; }
      th, td { border: 1px solid #dbe3ee; padding: 7px 8px; font-size: 11px; text-align: left; vertical-align: top; }
      th { background: #eef3fb; color: #0f172a; font-weight: 700; }
      .muted { color: #64748b; }
    </style>
  </head>
  <body>
    ${bodyHtml}
  </body>
</html>`;

  const blob = new Blob([htmlDocument], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const printWindow = window.open(blobUrl, '_blank');
  if (!printWindow) {
    URL.revokeObjectURL(blobUrl);
    return false;
  }
  const cleanup = () => {
    URL.revokeObjectURL(blobUrl);
  };
  printWindow.addEventListener('load', () => {
    printWindow.focus();
    printWindow.print();
    setTimeout(cleanup, 30_000);
  }, { once: true });
  setTimeout(cleanup, 60_000);
  return true;
};

export function TimeTableModal({
  isOpen,
  onClose,
  assignments,
  date,
  locale,
  isSaving,
  onDateChange,
  onRemoveShift,
}: TimeTableModalProps) {
  const copy = useControlTranslations();
  const [unitFilter, setUnitFilter] = useState('');
  const [businessFilter, setBusinessFilter] = useState('');
  const [employeeTablePage, setEmployeeTablePage] = useState(1);

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
      })
      .sort((left, right) => left.assignment.user_name.localeCompare(right.assignment.user_name)),
    [copy, filteredAssignments],
  );

  const employeeTablePageCount = Math.max(1, Math.ceil(employeeRows.length / employeeRowsPerPage));
  const currentEmployeeTablePage = Math.min(employeeTablePage, employeeTablePageCount);
  const employeeTableStartIndex = (currentEmployeeTablePage - 1) * employeeRowsPerPage;
  const paginatedEmployeeRows = employeeRows.slice(employeeTableStartIndex, employeeTableStartIndex + employeeRowsPerPage);
  const employeeTableShowingStart = employeeRows.length === 0 ? 0 : employeeTableStartIndex + 1;
  const employeeTableShowingEnd = Math.min(employeeTableStartIndex + employeeRowsPerPage, employeeRows.length);

  useEffect(() => {
    setEmployeeTablePage(1);
  }, [businessFilter, date, unitFilter]);

  useEffect(() => {
    if (employeeTablePage > employeeTablePageCount) {
      setEmployeeTablePage(employeeTablePageCount);
    }
  }, [employeeTablePage, employeeTablePageCount]);

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
    const title = copy.timeTable.printTitle(dateLabel);
    const scopeLabel = [
      copy.timeTable.unitScopeLabel(unitFilter ? selectedUnitLabel : copy.timeTable.allUnits),
      copy.timeTable.businessScopeLabel(businessFilter ? selectedBusinessLabel : copy.timeTable.allBusinesses),
    ].join(' | ');
    const metricsHtml = dailyAttendanceMetrics
      .map((metric) => `
        <div class="metric">
          <div class="metric-value">${metric.value}</div>
          <div class="metric-label">${escapePrintHtml(metric.label)}</div>
        </div>
      `)
      .join('');
    const rowsHtml = employeeRows.length > 0
      ? employeeRows.map((row) => `
        <tr>
          <td><strong>${escapePrintHtml(row.assignment.user_name)}</strong><br><span class="muted">${escapePrintHtml(row.assignment.user_code || `EMP-${row.assignment.user_company_id}`)}</span></td>
          <td>${escapePrintHtml(assignmentUnitName(row.assignment, copy))}</td>
          <td>${escapePrintHtml(assignmentBusinessName(row.assignment, copy))}</td>
          <td>${escapePrintHtml(row.businessLocation)}</td>
          <td>${escapePrintHtml(row.contractSite)}</td>
          <td>${escapePrintHtml(row.schedule)}</td>
          <td>${escapePrintHtml(formatAttendanceTime(row.assignment.first_check_in_at, locale))}</td>
          <td>${escapePrintHtml(formatAttendanceTime(row.assignment.last_check_out_at, locale))}</td>
          <td>${escapePrintHtml(row.attendance)}</td>
        </tr>
      `).join('')
      : `<tr><td colspan="9" class="muted">${escapePrintHtml(copy.timeTable.printEmptyRows)}</td></tr>`;

    printHtmlDocument({
      lang: locale,
      title,
      bodyHtml: `
        <div class="header">
          <h1>${escapePrintHtml(copy.timeTable.printReportTitle)}</h1>
          <p class="meta">${escapePrintHtml(copy.timeTable.printDateLabel)}: ${escapePrintHtml(dateLabel)}</p>
          <p class="meta">${escapePrintHtml(scopeLabel)}</p>
        </div>
        <div class="metrics">${metricsHtml}</div>
        <table>
          <thead>
            <tr>
              <th>${escapePrintHtml(copy.timeTable.table.employee)}</th>
              <th>${escapePrintHtml(copy.timeTable.table.unit)}</th>
              <th>${escapePrintHtml(copy.timeTable.table.business)}</th>
              <th>${escapePrintHtml(copy.timeTable.table.businessLocation)}</th>
              <th>${escapePrintHtml(copy.timeTable.table.workSite)}</th>
              <th>${escapePrintHtml(copy.timeTable.table.scheduledTime)}</th>
              <th>${escapePrintHtml(copy.labels.checkIn)}</th>
              <th>${escapePrintHtml(copy.labels.checkOut)}</th>
              <th>${escapePrintHtml(copy.timeTable.table.attendance)}</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      `,
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

          <TimeTableKpiStrip
            metrics={dailyAttendanceMetrics}
          />

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
            currentPage={currentEmployeeTablePage}
            date={date}
            employeeRows={employeeRows}
            endRow={employeeTableShowingEnd}
            isSaving={isSaving}
            pageCount={employeeTablePageCount}
            paginatedRows={paginatedEmployeeRows}
            dateLabel={dateLabel}
            selectedBusinessLabel={selectedBusinessLabel}
            selectedUnitLabel={selectedUnitLabel}
            startRow={employeeTableShowingStart}
            businessFilter={businessFilter}
            unitFilter={unitFilter}
            onPageChange={setEmployeeTablePage}
            onRemoveShift={onRemoveShift}
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

function TimeTableFilters({
  businessFilter,
  businessOptions,
  copy,
  date,
  unitFilter,
  unitOptions,
  onBusinessFilterChange,
  onDateChange,
  onUnitFilterChange,
}: {
  businessFilter: string;
  businessOptions: Array<[string, string]>;
  copy: ControlTranslations;
  date: string;
  unitFilter: string;
  unitOptions: Array<[string, string]>;
  onBusinessFilterChange: (value: string) => void;
  onDateChange: (date: string) => void;
  onUnitFilterChange: (value: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{copy.timeTable.filtersTitle}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {copy.timeTable.filtersDescription}
          </p>
        </div>

        <label className="block w-full xl:w-52">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            {copy.timeTable.attendanceDate}
          </span>
          <input
            type="date"
            value={date}
            onChange={(event) => {
              if (event.target.value) {
                onDateChange(event.target.value);
              }
            }}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition-colors focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </label>

        <label className="block w-full xl:w-72">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            {copy.labels.unit}
          </span>
          <select
            value={unitFilter}
            onChange={(event) => onUnitFilterChange(event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition-colors focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">{copy.timeTable.allUnits}</option>
            {unitOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="block w-full xl:w-72">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            {copy.labels.business}
          </span>
          <select
            value={businessFilter}
            onChange={(event) => onBusinessFilterChange(event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition-colors focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">{copy.timeTable.allBusinesses}</option>
            {businessOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function TimeTableKpiStrip({ metrics }: { metrics: DailyAttendanceMetric[] }) {
  return (
    <section className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {metrics.map((metric, index) => (
        <div key={metric.key} className="flex items-center gap-x-4">
          <TimeTableKpiMetric
            icon={metric.icon}
            label={metric.label}
            title={metric.title}
            value={metric.value}
            valueClassName={metric.valueClassName}
          />
          {index < metrics.length - 1 ? <KpiSeparator /> : null}
        </div>
      ))}
    </section>
  );
}

function TimeTableKpiMetric({
  icon,
  label,
  title,
  value,
  valueClassName = 'text-[#59C3A5]',
}: {
  icon: ReactNode;
  label: string;
  title: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-[145px] items-center gap-2" title={title}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#59C3A5]/10 text-[#59C3A5] dark:bg-[#8FE0CA]/15 dark:text-[#8FE0CA]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold leading-5 text-slate-950 dark:text-white">
          <span className={valueClassName}>{value}</span>
        </p>
        <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function KpiSeparator() {
  return <span aria-hidden="true" className="hidden h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 md:inline-flex" />;
}

function OrganizationSummary({
  businessFilter,
  copy,
  dateLabel,
  selectedBusinessLabel,
  selectedUnitLabel,
  totalEmployees,
  unitFilter,
  visibleUnitCoverage,
  onUnitFilterChange,
}: {
  businessFilter: string;
  copy: ControlTranslations;
  dateLabel: string;
  selectedBusinessLabel: string;
  selectedUnitLabel: string;
  totalEmployees: number;
  unitFilter: string;
  visibleUnitCoverage: TimeTableUnitCoverage[];
  onUnitFilterChange: (value: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{copy.timeTable.organizationSummaryTitle}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {copy.timeTable.organizationSummaryDescription(
              totalEmployees,
              unitFilter ? selectedUnitLabel : copy.timeTable.allUnits,
              businessFilter ? selectedBusinessLabel : copy.timeTable.allBusinesses,
            )}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-[#59C3A5]/10 px-3 py-1 text-xs font-semibold text-[#59C3A5] dark:bg-[#8FE0CA]/15 dark:text-[#8FE0CA]">
          {dateLabel}
        </span>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleUnitCoverage.length > 0 ? visibleUnitCoverage.map((group) => (
          <button
            key={group.unitId}
            type="button"
            onClick={() => onUnitFilterChange(group.unitId)}
            className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
              unitFilter === group.unitId
                ? 'border-[#59C3A5] bg-[#59C3A5]/5 shadow-sm dark:border-[#8FE0CA] dark:bg-[#8FE0CA]/10'
                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950/40'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{group.unit}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {copy.timeTable.businessCount(group.businessList.length)}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-[#59C3A5] dark:bg-slate-800 dark:text-[#8FE0CA]">
                <Users className="h-3.5 w-3.5" />
                {group.count}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {group.businessList.slice(0, 3).map((business) => (
                <div key={business.business} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900">
                  <span className="truncate font-medium text-slate-700 dark:text-slate-200">{business.business}</span>
                  <span className="font-semibold text-slate-950 dark:text-white">{business.count}</span>
                </div>
              ))}
            </div>
          </button>
        )) : (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
            {copy.timeTable.noUnitsMatch}
          </div>
        )}
      </div>
    </section>
  );
}

function EmployeeTable({
  businessFilter,
  copy,
  currentPage,
  date,
  dateLabel,
  employeeRows,
  endRow,
  isSaving,
  pageCount,
  paginatedRows,
  selectedBusinessLabel,
  selectedUnitLabel,
  startRow,
  unitFilter,
  onPageChange,
  onRemoveShift,
}: {
  businessFilter: string;
  copy: ControlTranslations;
  currentPage: number;
  date: string;
  dateLabel: string;
  employeeRows: TimeTableEmployeeRow[];
  endRow: number;
  isSaving: boolean;
  pageCount: number;
  paginatedRows: TimeTableEmployeeRow[];
  selectedBusinessLabel: string;
  selectedUnitLabel: string;
  startRow: number;
  unitFilter: string;
  onPageChange: (value: number) => void;
  onRemoveShift: (assignment: AttendanceControlAssignment, date?: string) => Promise<void> | void;
}) {
  const selectionLabel = `${unitFilter ? selectedUnitLabel : copy.timeTable.allUnits} · ${businessFilter ? selectedBusinessLabel : copy.timeTable.allBusinesses}`;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{copy.timeTable.employeeListTitle}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {selectionLabel} · {dateLabel}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-950/60">
            <tr>
              <TableHead>{copy.timeTable.table.employee}</TableHead>
              <TableHead>{copy.timeTable.table.unit}</TableHead>
              <TableHead>{copy.timeTable.table.business}</TableHead>
              <TableHead>{copy.timeTable.table.businessLocation}</TableHead>
              <TableHead>{copy.timeTable.table.workSite}</TableHead>
              <TableHead>{copy.timeTable.table.scheduledTime}</TableHead>
              <TableHead>{copy.timeTable.table.attendance}</TableHead>
              <TableHead>{copy.timeTable.table.action}</TableHead>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedRows.length > 0 ? paginatedRows.map((row) => {
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
                  <TableCell>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveShift(row.assignment, date)}
                      disabled={isSaving || !canRemoveShift(row.assignment)}
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 disabled:text-slate-400 dark:text-rose-300 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">{copy.labels.removeTimeTableDay}</span>
                    </Button>
                  </TableCell>
                </tr>
              );
            }) : null}

            {paginatedRows.length === 0 ? (
              <tr>
                <TableCell colSpan={8}>
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-950/40">
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

      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {copy.timeTable.showingRows(startRow, endRow, employeeRows.length)}
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
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
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
    </section>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-300">
      {children}
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
