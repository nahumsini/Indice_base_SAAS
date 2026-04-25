import { type ReactNode, useMemo, useState } from 'react';
import { CalendarDays, Search, Users, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { type AttendanceControlAssignment } from '../../../../api/humanResources';
import { useHRLanguage } from '../../HRLanguage';

interface ScheduleOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignments: AttendanceControlAssignment[];
  date: string;
  locale: string;
  onDateChange: (date: string) => void;
}

type DayFilter = 'all' | 'working' | 'rest' | 'unassigned';

const noUnit = 'No unit';
const noBusiness = 'No business';
const noSchedule = 'No schedule';
const noRule = 'No rule for this day';
const openSchedule = 'Open schedule';
const notScheduled = 'Not scheduled';
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

const hasWorkingRule = (assignment: AttendanceControlAssignment) =>
  Boolean(assignment.schedule_template_id && assignment.today_rule && !assignment.today_rule.is_rest_day);

const hasRestRule = (assignment: AttendanceControlAssignment) =>
  Boolean(assignment.schedule_template_id && (assignment.today_rule?.is_rest_day || assignment.today_status === 'rest'));

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

const dayStatusLabel = (assignment: AttendanceControlAssignment) => {
  if (!assignment.schedule_template_id) {
    return 'Unassigned';
  }

  if (hasRestRule(assignment)) {
    return restDay;
  }

  if (hasWorkingRule(assignment)) {
    return 'Working';
  }

  return noRule;
};

const dayStatusClass = (assignment: AttendanceControlAssignment) => {
  if (!assignment.schedule_template_id) {
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  }

  if (hasRestRule(assignment)) {
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  }

  if (hasWorkingRule(assignment)) {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200';
  }

  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200';
};

export function ScheduleOverviewModal({
  isOpen,
  onClose,
  assignments,
  date,
  locale,
  onDateChange,
}: ScheduleOverviewModalProps) {
  const copy = useHRLanguage().attendanceControl;
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [businessFilter, setBusinessFilter] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');
  const [dayFilter, setDayFilter] = useState<DayFilter>('all');

  const unitOptions = useMemo(
    () => Array.from(new Map(
      assignments
        .filter((assignment) => assignment.unit_id)
        .map((assignment) => [String(assignment.unit_id), assignment.unit_name || noUnit]),
    ).entries()),
    [assignments],
  );

  const businessOptions = useMemo(
    () => Array.from(new Map(
      assignments
        .filter((assignment) => assignment.business_id)
        .map((assignment) => [String(assignment.business_id), assignment.business_name || noBusiness]),
    ).entries()),
    [assignments],
  );

  const templateOptions = useMemo(
    () => Array.from(new Map(
      assignments
        .filter((assignment) => assignment.schedule_template_id)
        .map((assignment) => [String(assignment.schedule_template_id), assignment.schedule_template_name || noSchedule]),
    ).entries()),
    [assignments],
  );

  const filteredAssignments = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return assignments.filter((assignment) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          assignment.employee_name,
          assignment.employee_number,
          assignment.position_title,
          assignment.department,
          assignment.unit_name,
          assignment.business_name,
          assignment.schedule_template_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesUnit = !unitFilter || String(assignment.unit_id ?? '') === unitFilter;
      const matchesBusiness = !businessFilter || String(assignment.business_id ?? '') === businessFilter;
      const matchesTemplate = !templateFilter || String(assignment.schedule_template_id ?? '') === templateFilter;
      const matchesDayFilter = (() => {
        switch (dayFilter) {
          case 'working':
            return hasWorkingRule(assignment);
          case 'rest':
            return hasRestRule(assignment);
          case 'unassigned':
            return !assignment.schedule_template_id;
          default:
            return true;
        }
      })();

      return matchesSearch && matchesUnit && matchesBusiness && matchesTemplate && matchesDayFilter;
    });
  }, [assignments, businessFilter, dayFilter, searchQuery, templateFilter, unitFilter]);

  const workingAssignments = filteredAssignments.filter(hasWorkingRule);
  const restAssignments = filteredAssignments.filter(hasRestRule);
  const unassignedAssignments = filteredAssignments.filter((assignment) => !assignment.schedule_template_id);

  const groupedSchedules = useMemo(() => {
    const groups = new Map<string, {
      business: string;
      schedule: string;
      time: string;
      count: number;
    }>();

    workingAssignments.forEach((assignment) => {
      const business = assignment.business_name || noBusiness;
      const schedule = assignment.schedule_template_name || noSchedule;
      const time = scheduleWindow(assignment);
      const key = `${business}|${schedule}|${time}`;
      const current = groups.get(key);

      if (current) {
        current.count += 1;
      } else {
        groups.set(key, {
          business,
          schedule,
          time,
          count: 1,
        });
      }
    });

    return Array.from(groups.values()).sort((left, right) => (
      left.business.localeCompare(right.business) ||
      left.time.localeCompare(right.time) ||
      left.schedule.localeCompare(right.schedule)
    ));
  }, [workingAssignments]);

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
      <DialogContent className="max-h-[92vh] overflow-hidden p-0 sm:max-w-[1120px]" hideCloseButton>
        <DialogHeader className="border-b border-gray-200 px-6 py-5 dark:border-gray-700">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <CalendarDays className="h-5 w-5 text-[#143675] dark:text-[#8bb3ff]" />
                {copy.labels.viewSchedules}
              </DialogTitle>
              <DialogDescription className="mt-2">
                See who is scheduled for the selected date by business, unit, schedule, and time.
              </DialogDescription>
            </div>
            <Button variant="outline" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(92vh-86px)] overflow-y-auto px-6 py-5">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                <div className="lg:w-52 lg:flex-none">
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                    Date
                  </label>
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
                </div>

                <div className="min-w-0 flex-1">
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Employee, business, unit, or schedule"
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                <FilterSelect label="Unit" value={unitFilter} onChange={setUnitFilter}>
                  <option value="">All units</option>
                  {unitOptions.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </FilterSelect>

                <FilterSelect label="Business" value={businessFilter} onChange={setBusinessFilter}>
                  <option value="">All businesses</option>
                  {businessOptions.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </FilterSelect>

                <FilterSelect label="Schedule" value={templateFilter} onChange={setTemplateFilter}>
                  <option value="">All schedules</option>
                  {templateOptions.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </FilterSelect>

                <FilterSelect label="Day type" value={dayFilter} onChange={(value) => setDayFilter(value as DayFilter)}>
                  <option value="all">All</option>
                  <option value="working">Working today</option>
                  <option value="rest">Rest day</option>
                  <option value="unassigned">Unassigned</option>
                </FilterSelect>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                Current filters
              </p>
              <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{dateLabel}</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <ScheduleStat label="Working" value={workingAssignments.length} tone="text-emerald-700 dark:text-emerald-300" />
                <ScheduleStat label="Rest" value={restAssignments.length} tone="text-slate-700 dark:text-slate-200" />
                <ScheduleStat label="Unassigned" value={unassignedAssignments.length} tone="text-gray-700 dark:text-gray-200" />
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Scheduled by business and time</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Only working days are counted here.</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#143675]/10 px-3 py-1 text-xs font-medium text-[#143675] dark:bg-[#8bb3ff]/10 dark:text-[#8bb3ff]">
                <Users className="h-3.5 w-3.5" />
                {workingAssignments.length}
              </span>
            </div>

            {groupedSchedules.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                {groupedSchedules.map((group) => (
                  <div key={`${group.business}-${group.schedule}-${group.time}`} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{group.business}</p>
                        <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{group.schedule}</p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                        {group.count}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-medium text-[#143675] dark:text-[#8bb3ff]">{group.time}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No working schedules match the current filters.
              </div>
            )}
          </div>

          <div className="mt-5 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Employee schedule detail</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Showing {filteredAssignments.length} of {assignments.length} employees.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px]">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <TableHead>Employee</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Attendance</TableHead>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAssignments.length > 0 ? (
                    filteredAssignments.map((assignment) => (
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
                        <TableCell>{assignment.schedule_template_name || noSchedule}</TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${dayStatusClass(assignment)}`}>
                            {dayStatusLabel(assignment)}
                          </span>
                        </TableCell>
                        <TableCell>{scheduleWindow(assignment)}</TableCell>
                        <TableCell>{attendanceLabels[assignment.corrected_status ?? assignment.today_status] ?? assignment.today_status}</TableCell>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No employees match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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

function ScheduleStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-center dark:bg-gray-800">
      <p className={`text-xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
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
