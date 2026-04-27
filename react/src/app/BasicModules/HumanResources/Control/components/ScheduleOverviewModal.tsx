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

type EmployeeScheduleScope = 'day' | 'week' | 'month';

const noUnit = 'No unit';
const noBusiness = 'No business';
const noSchedule = 'No shift';
const noAssignedSite = 'Open / no assigned site';
const noRule = 'No rule for this day';
const openSchedule = 'Open shift';
const notScheduled = 'No shift time';
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
const padDatePart = (value: number) => `${value}`.padStart(2, '0');
const localDateString = (value: Date) =>
  `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}-${padDatePart(value.getDate())}`;
const monthValue = (value: Date) => `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}`;
const parseLocalDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};
const addDays = (value: Date, days: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};
const startOfWeek = (value: Date) => {
  const day = value.getDay() === 0 ? 7 : value.getDay();
  return addDays(value, 1 - day);
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

const hasWorkingRule = (assignment: AttendanceControlAssignment) =>
  Boolean(assignment.schedule_template_id && assignment.today_rule && !assignment.today_rule.is_rest_day);

const canRemoveShift = (assignment: AttendanceControlAssignment) =>
  Boolean((assignment.schedule_template_id || assignment.active_work_site) && !assignment.first_check_in_at && !assignment.last_check_out_at);

const assignmentSiteId = (assignment: AttendanceControlAssignment) =>
  assignment.active_work_site?.location_id ?? assignment.today_rule?.location_id ?? null;

const assignmentSiteName = (assignment: AttendanceControlAssignment) =>
  assignment.active_work_site?.location_name || assignment.today_rule?.location_name || noAssignedSite;

const scheduleWindow = (assignment: AttendanceControlAssignment) => {
  if (!assignment.schedule_template_id) {
    return noSchedule;
  }

  const rule = assignment.today_rule;
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
  return start && end ? `${start} - ${end}` : notScheduled;
};

const calendarDayShiftTime = (day: AttendanceCalendarDay) => {
  const rule = day.schedule_rule;
  if (!rule) {
    return noSchedule;
  }
  if (rule.is_rest_day) {
    return restDay;
  }
  if (rule.schedule_mode === 'open') {
    return openSchedule;
  }
  const start = toTimeText(rule.start_time);
  const end = toTimeText(rule.end_time);
  return start && end ? `${start} - ${end}` : notScheduled;
};

const calendarDaySite = (day: AttendanceCalendarDay) =>
  day.active_work_site?.location_name || day.schedule_rule?.location_name || noAssignedSite;

const calendarDayType = (day: AttendanceCalendarDay) => {
  if (!day.schedule_rule) {
    return 'Unassigned';
  }
  if (day.schedule_rule.is_rest_day || day.effective_status === 'rest') {
    return restDay;
  }
  return 'Working';
};

const canRemoveCalendarDay = (day: AttendanceCalendarDay) =>
  Boolean((day.schedule_rule || day.active_work_site) && !day.entry_registered && !day.exit_registered);

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
  const [siteFilter, setSiteFilter] = useState('');
  const [employeeScheduleId, setEmployeeScheduleId] = useState('');
  const [employeeScheduleScope, setEmployeeScheduleScope] = useState<EmployeeScheduleScope>('week');
  const [employeeScheduleDays, setEmployeeScheduleDays] = useState<AttendanceCalendarDay[]>([]);
  const [isLoadingEmployeeSchedule, setIsLoadingEmployeeSchedule] = useState(false);
  const [employeeScheduleError, setEmployeeScheduleError] = useState('');
  const [employeeScheduleReloadKey, setEmployeeScheduleReloadKey] = useState(0);

  const workingAssignments = useMemo(
    () => assignments.filter(hasWorkingRule),
    [assignments],
  );

  const siteOptions = useMemo(
    () => Array.from(new Map(
      workingAssignments
        .filter((assignment) => assignmentSiteId(assignment))
        .map((assignment) => [
          String(assignmentSiteId(assignment)),
          assignmentSiteName(assignment),
        ]),
    ).entries()).sort((left, right) => left[1].localeCompare(right[1])),
    [workingAssignments],
  );

  const employeeOptions = useMemo(
    () => assignments
      .map((assignment) => ({
        id: assignment.employee_id,
        label: `${assignment.employee_name}${assignment.employee_number ? ` (${assignment.employee_number})` : ''}`,
      }))
      .sort((left, right) => left.label.localeCompare(right.label)),
    [assignments],
  );

  const selectedEmployeeAssignment = useMemo(
    () => assignments.find((assignment) => String(assignment.employee_id) === employeeScheduleId) ?? null,
    [assignments, employeeScheduleId],
  );

  const employeeScheduleRange = useMemo(() => {
    const baseDate = parseLocalDate(date);
    if (employeeScheduleScope === 'day') {
      return {
        start: baseDate,
        end: baseDate,
      };
    }
    if (employeeScheduleScope === 'week') {
      const start = startOfWeek(baseDate);
      return {
        start,
        end: addDays(start, 6),
      };
    }
    return {
      start: new Date(baseDate.getFullYear(), baseDate.getMonth(), 1),
      end: new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0),
    };
  }, [date, employeeScheduleScope]);

  const employeeScheduleRangeLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const startLabel = formatter.format(employeeScheduleRange.start);
    const endLabel = formatter.format(employeeScheduleRange.end);
    return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
  }, [employeeScheduleRange.end, employeeScheduleRange.start, locale]);

  const selectedSiteLabel = useMemo(
    () => siteOptions.find(([value]) => value === siteFilter)?.[1] ?? '',
    [siteFilter, siteOptions],
  );

  const visibleWorkingAssignments = useMemo(
    () => siteFilter
      ? workingAssignments.filter((assignment) => String(assignmentSiteId(assignment) ?? '') === siteFilter)
      : workingAssignments,
    [siteFilter, workingAssignments],
  );

  const detailAssignments = siteFilter ? visibleWorkingAssignments : [];

  useEffect(() => {
    if (siteFilter && !siteOptions.some(([value]) => value === siteFilter)) {
      setSiteFilter('');
    }
  }, [siteFilter, siteOptions]);

  useEffect(() => {
    if (!isOpen || !employeeScheduleId) {
      setEmployeeScheduleDays([]);
      setIsLoadingEmployeeSchedule(false);
      setEmployeeScheduleError('');
      return;
    }

    let active = true;
    setIsLoadingEmployeeSchedule(true);
    setEmployeeScheduleError('');

    const startKey = localDateString(employeeScheduleRange.start);
    const endKey = localDateString(employeeScheduleRange.end);
    const months = uniqueMonthsForRange(employeeScheduleRange.start, employeeScheduleRange.end);

    Promise.all(months.map((month) => humanResourcesApi.getAttendanceCalendar(employeeScheduleId, month)))
      .then((responses) => {
        if (!active) {
          return;
        }
        const days = responses
          .flatMap((response) => response.items)
          .filter((day) => day.date >= startKey && day.date <= endKey)
          .sort((left, right) => left.date.localeCompare(right.date));
        setEmployeeScheduleDays(days);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setEmployeeScheduleDays([]);
        setEmployeeScheduleError(error instanceof Error ? error.message : 'Could not load the employee schedule.');
      })
      .finally(() => {
        if (active) {
          setIsLoadingEmployeeSchedule(false);
        }
      });

    return () => {
      active = false;
    };
  }, [employeeScheduleId, employeeScheduleRange.end, employeeScheduleRange.start, employeeScheduleReloadKey, isOpen]);

  const groupedSchedules = useMemo(() => {
    const groups = new Map<string, {
      siteId: string;
      site: string;
      business: string;
      time: string;
      count: number;
    }>();

    visibleWorkingAssignments.forEach((assignment) => {
      const siteId = String(assignmentSiteId(assignment) ?? '');
      const site = assignmentSiteName(assignment);
      const business = assignment.business_name || noBusiness;
      const time = scheduleWindow(assignment);
      const key = `${site}|${business}|${time}`;
      const current = groups.get(key);

      if (current) {
        current.count += 1;
      } else {
        groups.set(key, {
          siteId,
          site,
          business,
          time,
          count: 1,
        });
      }
    });

    return Array.from(groups.values()).sort((left, right) => (
      left.site.localeCompare(right.site) ||
      left.business.localeCompare(right.business) ||
      left.time.localeCompare(right.time)
    ));
  }, [visibleWorkingAssignments]);

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="max-h-[92vh] overflow-hidden bg-white p-0 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:max-w-[1120px]" hideCloseButton>
        <DialogHeader className="border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-700 dark:bg-gray-950">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <CalendarDays className="h-5 w-5 text-[#143675] dark:text-[#8bb3ff]" />
                {copy.labels.viewSchedules}
              </DialogTitle>
              <DialogDescription className="mt-2">
                Pick a date and site to see who is working. Use Employee schedule for one person by day, week, or month.
              </DialogDescription>
            </div>
            <Button variant="outline" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(92vh-86px)] overflow-y-auto px-6 py-5">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Site schedule</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{dateLabel}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[180px_minmax(240px,1fr)] lg:min-w-[540px]">
                <label className="block">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                    Date
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

                <FilterSelect label="Site" value={siteFilter} onChange={setSiteFilter}>
                  <option value="">All working sites</option>
                  {siteOptions.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </FilterSelect>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Working sites</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {siteFilter ? selectedSiteLabel : 'All sites with working employees for this date.'}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#143675]/10 px-3 py-1 text-xs font-medium text-[#143675] dark:bg-[#8bb3ff]/10 dark:text-[#8bb3ff]">
                <Users className="h-3.5 w-3.5" />
                {visibleWorkingAssignments.length}
              </span>
            </div>

            {groupedSchedules.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                {groupedSchedules.map((group) => (
                  <button
                    key={`${group.site}-${group.business}-${group.time}`}
                    type="button"
                    onClick={() => setSiteFilter(group.siteId)}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-left transition-colors hover:border-[#143675]/40 hover:bg-white dark:border-gray-700 dark:bg-gray-900/40 dark:hover:border-[#8bb3ff]/50 dark:hover:bg-gray-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{group.site}</p>
                        <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{group.business}</p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                        {group.count}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-medium text-[#143675] dark:text-[#8bb3ff]">{group.time}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No working employees for this date and site.
              </div>
            )}
          </div>

          <div className="mt-5 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Working employees</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {siteFilter
                  ? `${detailAssignments.length} employee${detailAssignments.length === 1 ? '' : 's'} working at ${selectedSiteLabel} on ${dateLabel}.`
                  : 'Select a site above to see the employees working there.'}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <TableHead>Employee</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Shift time</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Action</TableHead>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {!siteFilter ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        Select a site to load the employees working there.
                      </td>
                    </tr>
                  ) : detailAssignments.length > 0 ? (
                    detailAssignments.map((assignment) => (
                      <tr key={assignment.employee_id} className="bg-white dark:bg-gray-800">
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white">{assignment.employee_name}</p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {assignment.employee_number || assignment.position_title || assignment.department || '-'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{assignment.unit_name || noUnit}</TableCell>
                        <TableCell>{assignment.business_name || noBusiness}</TableCell>
                        <TableCell>{scheduleWindow(assignment)}</TableCell>
                        <TableCell>{attendanceLabels[assignment.corrected_status ?? assignment.today_status] ?? assignment.today_status}</TableCell>
                        <TableCell>
                          {canRemoveShift(assignment) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 whitespace-nowrap border-rose-200 px-2.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800/50 dark:bg-gray-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
                              disabled={isSaving}
                              onClick={() => onRemoveShift(assignment, date)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove day
                            </Button>
                          ) : assignment.first_check_in_at || assignment.last_check_out_at ? (
                            <span className="text-xs text-gray-500 dark:text-gray-400">Attendance recorded</span>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </TableCell>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No employees are working at this site on the selected date.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Employee schedule</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Select one employee to review that person by day, week, or month.
                  </p>
                </div>
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900/40">
                  <ScheduleScopeButton value="day" current={employeeScheduleScope} onChange={setEmployeeScheduleScope}>
                    Day
                  </ScheduleScopeButton>
                  <ScheduleScopeButton value="week" current={employeeScheduleScope} onChange={setEmployeeScheduleScope}>
                    Week
                  </ScheduleScopeButton>
                  <ScheduleScopeButton value="month" current={employeeScheduleScope} onChange={setEmployeeScheduleScope}>
                    Month
                  </ScheduleScopeButton>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <label className="block">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                    Employee
                  </span>
                  <select
                    value={employeeScheduleId}
                    onChange={(event) => setEmployeeScheduleId(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Choose employee</option>
                    {employeeOptions.map((employee) => (
                      <option key={employee.id} value={employee.id}>{employee.label}</option>
                    ))}
                  </select>
                </label>
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                  {employeeScheduleRangeLabel}
                </p>
              </div>
            </div>

            {!employeeScheduleId ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Choose an employee to see day, week, or month schedule details.
              </div>
            ) : isLoadingEmployeeSchedule ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Loading employee schedule...
              </div>
            ) : employeeScheduleError ? (
              <div className="px-4 py-8 text-center text-sm text-red-600 dark:text-red-300">
                {employeeScheduleError}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px]">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <TableHead>Date</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>Shift time</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Action</TableHead>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {employeeScheduleDays.length > 0 ? employeeScheduleDays.map((day) => (
                      <tr key={day.date} className="bg-white dark:bg-gray-800">
                        <TableCell>{new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(parseLocalDate(day.date))}</TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            calendarDayType(day) === 'Working'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                              : calendarDayType(day) === restDay
                                ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                          }`}
                          >
                            {calendarDayType(day)}
                          </span>
                        </TableCell>
                        <TableCell>{calendarDaySite(day)}</TableCell>
                        <TableCell>{calendarDayShiftTime(day)}</TableCell>
                        <TableCell>{attendanceLabels[day.corrected_status ?? day.effective_status] ?? day.effective_status}</TableCell>
                        <TableCell>
                          {selectedEmployeeAssignment && canRemoveCalendarDay(day) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 whitespace-nowrap border-rose-200 px-2.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800/50 dark:bg-gray-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
                              disabled={isSaving}
                              onClick={async () => {
                                await Promise.resolve(onRemoveShift(selectedEmployeeAssignment, day.date));
                                setEmployeeScheduleReloadKey((current) => current + 1);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove day
                            </Button>
                          ) : day.entry_registered || day.exit_registered ? (
                            <span className="text-xs text-gray-500 dark:text-gray-400">Attendance recorded</span>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </TableCell>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          No schedule days found for this range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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

function ScheduleScopeButton({
  value,
  current,
  onChange,
  children,
}: {
  value: EmployeeScheduleScope;
  current: EmployeeScheduleScope;
  onChange: (value: EmployeeScheduleScope) => void;
  children: ReactNode;
}) {
  const isActive = value === current;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
        isActive
          ? 'bg-[#143675] text-white dark:bg-[#8bb3ff] dark:text-gray-950'
          : 'text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800'
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
