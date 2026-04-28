import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Trash2, Users, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import {
  humanResourcesApi,
  type AttendanceCalendarDay,
  type AttendanceControlAssignment,
  type AttendanceControlRule,
} from '../../../../api/humanResources';
import { useHRLanguage } from '../../HRLanguage';

interface ScheduleOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignments: AttendanceControlAssignment[];
  date: string;
  locale: string;
  isSaving: boolean;
  onDateChange: (date: string) => void;
  onRemoveShift: (assignment: AttendanceControlAssignment, date?: string) => Promise<void> | void;
}

type ScheduleRangeMode = 'day' | 'week' | 'month';

const employeeRowsPerPage = 10;
const noUnit = 'No unit';
const noBusiness = 'No business';
const noSchedule = 'No shift set';
const noAssignedSite = 'Not assigned';
const noRule = 'No rule for this date';
const openSchedule = 'Open shift - no fixed time';
const notScheduled = 'Shift time not set';
const restDay = 'Rest day';
const attendanceLabels: Record<string, string> = {
  on_time: 'On time',
  late: 'Late',
  leave: 'Leave',
  rest: 'Rest',
  absence: 'Absent',
  pending: 'Pending',
  not_scheduled: 'Not scheduled',
};

const toTimeText = (value?: string | null) => (value ? value.slice(0, 5) : '');
const pluralize = (count: number, singular: string, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;
const padDatePart = (value: number) => `${value}`.padStart(2, '0');
const localDateString = (value: Date) =>
  `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}-${padDatePart(value.getDate())}`;
const monthValue = (value: Date) => `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}`;
const parseLocalDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};
const uniqueMonthsForRange = (startDate: Date, endDate: Date) => {
  const months = new Set<string>();
  for (let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    cursor <= endDate;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) {
    months.add(monthValue(cursor));
  }
  months.add(monthValue(endDate));
  return Array.from(months);
};

const periodRangeFor = (date: string, mode: ScheduleRangeMode) => {
  const selected = parseLocalDate(date);
  if (mode === 'month') {
    return {
      start: new Date(selected.getFullYear(), selected.getMonth(), 1),
      end: new Date(selected.getFullYear(), selected.getMonth() + 1, 0),
    };
  }
  if (mode === 'week') {
    const day = selected.getDay();
    const offsetToMonday = day === 0 ? -6 : 1 - day;
    const start = new Date(selected);
    start.setDate(selected.getDate() + offsetToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }
  return { start: selected, end: selected };
};

const isActiveEmployee = (assignment: AttendanceControlAssignment) =>
  (assignment.employee_status || 'active').toLowerCase() === 'active';

const hasWorkingRule = (assignment: AttendanceControlAssignment) =>
  Boolean(assignment.schedule_template_id && assignment.today_rule && !assignment.today_rule.is_rest_day);

const canRemoveShift = (assignment: AttendanceControlAssignment) =>
  Boolean((assignment.schedule_template_id || assignment.active_work_site) && !assignment.first_check_in_at && !assignment.last_check_out_at);

const assignmentUnitName = (assignment: AttendanceControlAssignment) => assignment.unit_name || noUnit;

const assignmentUnitFilterValue = (assignment: AttendanceControlAssignment) =>
  assignment.unit_id != null ? `unit:${assignment.unit_id}` : `unit-name:${assignmentUnitName(assignment)}`;

const assignmentBusinessName = (assignment: AttendanceControlAssignment) => assignment.business_name || noBusiness;

const calendarDayType = (day: AttendanceCalendarDay) => {
  if (!day.schedule_rule) {
    return 'Unassigned';
  }
  if (day.schedule_rule.is_rest_day || day.effective_status === 'rest') {
    return restDay;
  }
  return 'Working';
};

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

const scheduleRuleTimeLabel = (rule?: AttendanceControlRule | null) => {
  if (!rule) {
    return noRule;
  }
  if (rule.is_rest_day) {
    return restDay;
  }
  if (rule.schedule_mode === 'open') {
    return openSchedule;
  }

  const start = toTimeText(rule.start_time);
  const end = toTimeText(rule.end_time);
  const duration = formatScheduledDuration(scheduledMinutesForRule(rule));
  if (start && end) {
    return duration ? `${start} - ${end} (${duration})` : `${start} - ${end}`;
  }
  return notScheduled;
};

const scheduleWindow = (assignment: AttendanceControlAssignment) => {
  if (!assignment.schedule_template_id) {
    return `Today: ${noSchedule}`;
  }

  const rule = assignment.today_rule;
  if (!rule) {
    return `Today: ${noRule}`;
  }

  return `Today: ${scheduleRuleTimeLabel(rule)}`;
};

const attendanceLabel = (assignment: AttendanceControlAssignment) =>
  attendanceLabels[assignment.corrected_status ?? assignment.today_status] ?? assignment.today_status;

const periodAttendanceLabel = (days: AttendanceCalendarDay[]) => {
  const records = days.filter((day) => day.entry_registered || day.exit_registered).length;
  const late = days.filter((day) => (day.corrected_status ?? day.effective_status) === 'late').length;
  if (records === 0) {
    return late > 0 ? `${late} late` : 'No attendance recorded';
  }
  return late > 0 ? `${records} recorded, ${late} late` : `${records} recorded`;
};

const periodScheduleLabel = (days: AttendanceCalendarDay[], rangeMode: ScheduleRangeMode) => {
  const periodName = rangeMode === 'week' ? 'This week' : 'This month';
  if (days.length === 0) {
    return `${periodName}: no schedule found`;
  }

  const working = days.filter((day) => calendarDayType(day) === 'Working').length;
  const rest = days.filter((day) => calendarDayType(day) === restDay).length;
  const noShift = days.length - working - rest;
  const openShifts = days.filter((day) => day.schedule_rule && !day.schedule_rule.is_rest_day && day.schedule_rule.schedule_mode === 'open').length;
  const scheduledMinutes = days.reduce(
    (total, day) => total + scheduledMinutesForRule(day.schedule_rule),
    0,
  );
  const scheduledHours = formatScheduledDuration(scheduledMinutes);
  const primary = [
    `${periodName}: ${pluralize(working, 'working day')}`,
    scheduledHours ? `${scheduledHours} scheduled` : '',
    openShifts ? pluralize(openShifts, 'open shift') : '',
  ].filter(Boolean).join(', ');
  const secondary = [
    rest ? pluralize(rest, 'rest day') : '',
    noShift ? `${pluralize(noShift, 'day')} without shift` : '',
  ].filter(Boolean).join(', ');
  return secondary ? `${primary} (${secondary})` : primary;
};

const periodContractSiteLabel = (assignment: AttendanceControlAssignment, days: AttendanceCalendarDay[]) => {
  const siteCounts = new Map<string, number>();
  days.forEach((day) => {
    const site = day.active_work_site?.location_name;
    if (site) {
      siteCounts.set(site, (siteCounts.get(site) ?? 0) + 1);
    }
  });

  const sites = Array.from(siteCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([site]) => site);

  if (sites.length > 0) {
    return sites.slice(0, 2).join(', ');
  }
  return assignment.active_work_site?.location_name || noAssignedSite;
};

const assignmentBusinessLocationName = (assignment: AttendanceControlAssignment) => {
  const businessLocations = (assignment.business_locations ?? [])
    .map((location) => location.name);
  return businessLocations.length > 0 ? businessLocations.join(', ') : noAssignedSite;
};

const assignmentContractSiteName = (assignment: AttendanceControlAssignment) =>
  assignment.active_work_site?.location_name || noAssignedSite;

export function ScheduleOverviewModal({
  isOpen,
  onClose,
  assignments,
  date,
  locale,
  isSaving,
  onDateChange,
  onRemoveShift,
}: ScheduleOverviewModalProps) {
  const copy = useHRLanguage().attendanceControl;
  const [unitFilter, setUnitFilter] = useState('');
  const [rangeMode, setRangeMode] = useState<ScheduleRangeMode>('day');
  const [periodCalendars, setPeriodCalendars] = useState<Record<number, AttendanceCalendarDay[]>>({});
  const [isLoadingPeriod, setIsLoadingPeriod] = useState(false);
  const [periodError, setPeriodError] = useState('');
  const [employeeTablePage, setEmployeeTablePage] = useState(1);

  const periodRange = useMemo(() => periodRangeFor(date, rangeMode), [date, rangeMode]);
  const periodStartKey = useMemo(() => localDateString(periodRange.start), [periodRange]);
  const periodEndKey = useMemo(() => localDateString(periodRange.end), [periodRange]);

  const periodLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const startLabel = formatter.format(periodRange.start);
    const endLabel = formatter.format(periodRange.end);
    return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
  }, [locale, periodRange]);

  const activeAssignments = useMemo(
    () => assignments.filter(isActiveEmployee),
    [assignments],
  );

  const unitOptions = useMemo(
    () => Array.from(new Map(
      activeAssignments.map((assignment) => [
        assignmentUnitFilterValue(assignment),
        assignmentUnitName(assignment),
      ]),
    ).entries()).sort((left, right) => left[1].localeCompare(right[1])),
    [activeAssignments],
  );

  const filteredAssignments = useMemo(
    () => unitFilter
      ? activeAssignments.filter((assignment) => assignmentUnitFilterValue(assignment) === unitFilter)
      : activeAssignments,
    [activeAssignments, unitFilter],
  );

  const selectedUnitLabel = useMemo(
    () => unitOptions.find(([value]) => value === unitFilter)?.[1] ?? '',
    [unitFilter, unitOptions],
  );

  const unitCoverage = useMemo(() => {
    const groups = new Map<string, {
      unitId: string;
      unit: string;
      businesses: Map<string, number>;
      count: number;
    }>();

    activeAssignments.forEach((assignment) => {
      const unitId = assignmentUnitFilterValue(assignment);
      const unit = assignmentUnitName(assignment);
      const business = assignmentBusinessName(assignment);
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
  }, [activeAssignments]);

  const visibleUnitCoverage = useMemo(
    () => unitFilter ? unitCoverage.filter((group) => group.unitId === unitFilter) : unitCoverage,
    [unitCoverage, unitFilter],
  );

  const calendarEmployeeIdsKey = useMemo(
    () => filteredAssignments.map((assignment) => assignment.employee_id).sort((left, right) => left - right).join(','),
    [filteredAssignments],
  );

  useEffect(() => {
    if (unitFilter && !unitOptions.some(([value]) => value === unitFilter)) {
      setUnitFilter('');
    }
  }, [unitFilter, unitOptions]);

  useEffect(() => {
    if (!isOpen || rangeMode === 'day' || filteredAssignments.length === 0) {
      setPeriodCalendars({});
      setIsLoadingPeriod(false);
      setPeriodError('');
      return;
    }

    let isCurrent = true;
    setPeriodCalendars({});
    setIsLoadingPeriod(true);
    setPeriodError('');

    const months = uniqueMonthsForRange(periodRange.start, periodRange.end);
    Promise.all(filteredAssignments.map(async (assignment) => {
      const responses = await Promise.all(
        months.map((month) => humanResourcesApi.getAttendanceCalendar(assignment.employee_id, month)),
      );
      const days = responses
        .flatMap((response) => response.items)
        .filter((day) => day.date >= periodStartKey && day.date <= periodEndKey)
        .sort((left, right) => left.date.localeCompare(right.date));
      return [assignment.employee_id, days] as const;
    }))
      .then((entries) => {
        if (!isCurrent) {
          return;
        }
        setPeriodCalendars(Object.fromEntries(entries));
      })
      .catch((error) => {
        if (!isCurrent) {
          return;
        }
        setPeriodCalendars({});
        setPeriodError(error instanceof Error ? error.message : 'Could not load schedules for this period.');
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoadingPeriod(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [calendarEmployeeIdsKey, filteredAssignments, isOpen, periodEndKey, periodRange, periodStartKey, rangeMode]);

  const employeeRows = useMemo(
    () => filteredAssignments
      .map((assignment) => {
        const periodDays = rangeMode === 'day' ? [] : periodCalendars[assignment.employee_id] ?? [];
        const workingDays = rangeMode === 'day'
          ? (hasWorkingRule(assignment) ? 1 : 0)
          : periodDays.filter((day) => calendarDayType(day) === 'Working').length;
        const hasContractSite = rangeMode === 'day'
          ? Boolean(assignment.active_work_site)
          : periodDays.some((day) => day.active_work_site);

        return {
          assignment,
          workingDays,
          hasWorkSite: hasContractSite,
          schedule: rangeMode === 'day' ? scheduleWindow(assignment) : periodScheduleLabel(periodDays, rangeMode),
          attendance: rangeMode === 'day' ? attendanceLabel(assignment) : periodAttendanceLabel(periodDays),
          hasAttendance: rangeMode === 'day'
            ? Boolean(assignment.first_check_in_at || assignment.last_check_out_at)
            : periodDays.some((day) => day.entry_registered || day.exit_registered),
          businessLocation: assignmentBusinessLocationName(assignment),
          contractSite: rangeMode === 'day' ? assignmentContractSiteName(assignment) : periodContractSiteLabel(assignment, periodDays),
        };
      })
      .sort((left, right) => left.assignment.employee_name.localeCompare(right.assignment.employee_name)),
    [filteredAssignments, periodCalendars, rangeMode],
  );

  const employeeTablePageCount = Math.max(1, Math.ceil(employeeRows.length / employeeRowsPerPage));
  const currentEmployeeTablePage = Math.min(employeeTablePage, employeeTablePageCount);
  const employeeTableStartIndex = (currentEmployeeTablePage - 1) * employeeRowsPerPage;
  const paginatedEmployeeRows = employeeRows.slice(employeeTableStartIndex, employeeTableStartIndex + employeeRowsPerPage);
  const employeeTableShowingStart = employeeRows.length === 0 ? 0 : employeeTableStartIndex + 1;
  const employeeTableShowingEnd = Math.min(employeeTableStartIndex + employeeRowsPerPage, employeeRows.length);

  useEffect(() => {
    setEmployeeTablePage(1);
  }, [date, rangeMode, unitFilter]);

  useEffect(() => {
    if (employeeTablePage > employeeTablePageCount) {
      setEmployeeTablePage(employeeTablePageCount);
    }
  }, [employeeTablePage, employeeTablePageCount]);

  const organisationSummary = useMemo(
    () => ({
      totalEmployees: filteredAssignments.length,
      scheduledEmployees: employeeRows.filter((row) => row.workingDays > 0).length,
      assignedWorkSites: employeeRows.filter((row) => row.hasWorkSite).length,
      businesses: filteredAssignments.length
        ? new Set(filteredAssignments.map(assignmentBusinessName)).size
        : 0,
    }),
    [employeeRows, filteredAssignments],
  );

  const dateLabel = useMemo(() => {
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(parsed);
  }, [date, locale]);

  const scheduleMetricLabel = rangeMode === 'day'
    ? 'Scheduled today'
    : rangeMode === 'week'
      ? 'Scheduled this week'
      : 'Scheduled this month';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="max-h-[94vh] overflow-hidden bg-white p-0 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:max-w-[1320px]" hideCloseButton>
        <DialogHeader className="border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-700 dark:bg-gray-950">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <CalendarDays className="h-5 w-5 text-[#143675] dark:text-[#8bb3ff]" />
                {copy.labels.viewSchedules}
              </DialogTitle>
              <DialogDescription className="mt-2">
                Review active employees by organisation unit and date range.
              </DialogDescription>
            </div>
            <Button variant="outline" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(94vh-86px)] overflow-y-auto px-8 py-6">
          <section
            aria-labelledby="schedule-view-controls-heading"
            className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-end">
              <div>
                <h3 id="schedule-view-controls-heading" className="text-base font-semibold text-gray-900 dark:text-white">
                  Organisation schedule
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {rangeMode === 'day' ? dateLabel : periodLabel}
                </p>
                <div className="mt-4 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_280px] lg:items-end">
                  <label className="block">
                    <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                      Schedule date
                    </span>
                    <input
                      type="date"
                      value={date}
                      onChange={(event) => {
                        if (event.target.value) {
                          onDateChange(event.target.value);
                        }
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </label>

                  <div>
                    <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                      Show
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <RangeModeButton value="day" current={rangeMode} onChange={setRangeMode}>Day</RangeModeButton>
                      <RangeModeButton value="week" current={rangeMode} onChange={setRangeMode}>Week</RangeModeButton>
                      <RangeModeButton value="month" current={rangeMode} onChange={setRangeMode}>Month</RangeModeButton>
                    </div>
                  </div>

                  <FilterSelect label="Unit" value={unitFilter} onChange={setUnitFilter}>
                    <option value="">All units</option>
                    {unitOptions.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </FilterSelect>
                </div>
              </div>

              {unitFilter ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="xl:justify-self-end"
                  onClick={() => setUnitFilter('')}
                >
                  Show all units
                </Button>
              ) : null}
            </div>
          </section>

          <section
            aria-labelledby="organisation-employees-heading"
            className="mt-6 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-700 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 id="organisation-employees-heading" className="text-base font-semibold text-gray-900 dark:text-white">
                  Active employees
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {unitFilter
                    ? `${organisationSummary.totalEmployees} active employee${organisationSummary.totalEmployees === 1 ? '' : 's'} in ${selectedUnitLabel}.`
                    : `${organisationSummary.totalEmployees} active employee${organisationSummary.totalEmployees === 1 ? '' : 's'} across ${unitCoverage.length} unit${unitCoverage.length === 1 ? '' : 's'}.`}
                </p>
              </div>
              <span className="rounded-full bg-[#143675]/10 px-3 py-1 text-xs font-semibold text-[#143675] dark:bg-[#8bb3ff]/10 dark:text-[#8bb3ff]">
                {periodLabel}
              </span>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <OverviewMetric label="Active employees" value={organisationSummary.totalEmployees} />
                <OverviewMetric label={scheduleMetricLabel} value={organisationSummary.scheduledEmployees} />
                <OverviewMetric label="Assigned to contract site" value={organisationSummary.assignedWorkSites} />
                <OverviewMetric label="Businesses" value={organisationSummary.businesses} />
              </div>

              {visibleUnitCoverage.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {visibleUnitCoverage.map((group) => {
                    const isSelected = group.unitId === unitFilter;
                    return (
                      <button
                        key={group.unitId}
                        type="button"
                        onClick={() => setUnitFilter(group.unitId)}
                        className={`rounded-lg border p-4 text-left transition-colors hover:border-[#143675]/40 hover:bg-white dark:hover:border-[#8bb3ff]/50 dark:hover:bg-gray-900 ${
                          isSelected
                            ? 'border-[#143675] bg-[#143675]/5 dark:border-[#8bb3ff] dark:bg-[#8bb3ff]/10'
                            : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-gray-900 dark:text-white">{group.unit}</p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {group.businessList.length} business{group.businessList.length === 1 ? '' : 'es'}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#143675]/10 px-3 py-1 text-xs font-semibold text-[#143675] dark:bg-[#8bb3ff]/10 dark:text-[#8bb3ff]">
                            <Users className="h-3.5 w-3.5" />
                            {group.count}
                          </span>
                        </div>

                        <div className="mt-4 space-y-2">
                          {group.businessList.map((item) => (
                            <div
                              key={`${group.unitId}-${item.business}`}
                              className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
                            >
                              <span className="truncate text-gray-700 dark:text-gray-200">{item.business}</span>
                              <span className="font-semibold text-gray-900 dark:text-white">{item.count}</span>
                            </div>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <section
                aria-labelledby="selected-employees-heading"
                className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex flex-col gap-1 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/40">
                  <h4 id="selected-employees-heading" className="text-sm font-semibold text-gray-900 dark:text-white">
                    Employee list
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {unitFilter ? selectedUnitLabel : 'All units'} - {periodLabel}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1080px]">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <TableHead>Employee</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead>Business location</TableHead>
                        <TableHead>Contract site</TableHead>
                        <TableHead>Scheduled time</TableHead>
                        <TableHead>Attendance</TableHead>
                        <TableHead>Action</TableHead>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {rangeMode !== 'day' && isLoadingPeriod ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                            Loading period schedules...
                          </td>
                        </tr>
                      ) : periodError ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-10 text-center text-sm text-red-600 dark:text-red-300">
                            {periodError}
                          </td>
                        </tr>
                      ) : employeeRows.length > 0 ? (
                        paginatedEmployeeRows.map((row) => (
                          <tr key={row.assignment.employee_id} className="bg-white dark:bg-gray-800">
                            <TableCell>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white">{row.assignment.employee_name}</p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  {row.assignment.employee_number || row.assignment.position_title || row.assignment.department || '-'}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{assignmentUnitName(row.assignment)}</TableCell>
                            <TableCell>{assignmentBusinessName(row.assignment)}</TableCell>
                            <TableCell>{row.businessLocation}</TableCell>
                            <TableCell>{row.contractSite}</TableCell>
                            <TableCell>{row.schedule}</TableCell>
                            <TableCell>{row.attendance}</TableCell>
                            <TableCell>
                              {rangeMode === 'day' && canRemoveShift(row.assignment) ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 whitespace-nowrap border-rose-200 px-2.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800/50 dark:bg-gray-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
                                  disabled={isSaving}
                                  onClick={() => onRemoveShift(row.assignment, date)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Remove day
                                </Button>
                              ) : row.hasAttendance ? (
                                <span className="text-xs text-gray-500 dark:text-gray-400">Attendance recorded</span>
                              ) : (
                                <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                              )}
                            </TableCell>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                            No active employees found for this unit.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {employeeRows.length > 0 && !periodError && !(rangeMode !== 'day' && isLoadingPeriod) ? (
                  <div className="flex flex-col gap-3 border-t border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Showing {employeeTableShowingStart}-{employeeTableShowingEnd} of {employeeRows.length} employees
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentEmployeeTablePage <= 1}
                        onClick={() => setEmployeeTablePage((page) => Math.max(1, page - 1))}
                      >
                        Previous
                      </Button>
                      <span className="min-w-20 text-center text-xs font-medium uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
                        Page {currentEmployeeTablePage} of {employeeTablePageCount}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentEmployeeTablePage >= employeeTablePageCount}
                        onClick={() => setEmployeeTablePage((page) => Math.min(employeeTablePageCount, page + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      >
        {children}
      </select>
    </label>
  );
}

function OverviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/40">
      <p className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function RangeModeButton({
  value,
  current,
  onChange,
  children,
}: {
  value: ScheduleRangeMode;
  current: ScheduleRangeMode;
  onChange: (value: ScheduleRangeMode) => void;
  children: ReactNode;
}) {
  const isActive = value === current;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
        isActive
          ? 'border-[#143675] bg-[#143675] text-white dark:border-[#8bb3ff] dark:bg-[#8bb3ff] dark:text-gray-950'
          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-white dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200 dark:hover:bg-gray-900'
      }`}
    >
      {children}
    </button>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-gray-500 dark:text-gray-300">
      {children}
    </th>
  );
}

function TableCell({ children }: { children: ReactNode }) {
  return (
    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
      {children}
    </td>
  );
}
