import type {
  AttendanceControlAssignment,
  AttendanceControlRule,
} from '../../../../api/humanResources';
import type { ControlTranslations } from '../translations';
import type { TimeTableCopy } from '../types/timeTableTypes';

export const noUnitFilterValue = 'unit:none';
export const noBusinessFilterValue = 'business:none';

const toTimeText = (value?: string | null) => (value ? value.slice(0, 5) : '');

export const parseLocalDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const isActiveEmployee = (assignment: AttendanceControlAssignment) =>
  (assignment.user_status || 'active').toLowerCase() === 'active';

export const hasWorkingRule = (assignment: AttendanceControlAssignment) =>
  Boolean(assignment.schedule_template_id && assignment.today_rule && !assignment.today_rule.is_rest_day);

export const assignmentUnitName = (assignment: AttendanceControlAssignment, copy: ControlTranslations) =>
  assignment.unit_name || copy.labels.noUnit;

export const assignmentUnitFilterValue = (assignment: AttendanceControlAssignment) =>
  assignment.unit_id != null ? `unit:${assignment.unit_id}` : noUnitFilterValue;

export const assignmentBusinessName = (assignment: AttendanceControlAssignment, copy: ControlTranslations) =>
  assignment.business_name || copy.labels.noBusiness;

export const assignmentBusinessFilterValue = (assignment: AttendanceControlAssignment) =>
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

export const formatWorkedDuration = (checkIn?: string | null, checkOut?: string | null) => {
  if (!checkIn || !checkOut) {
    return '-';
  }

  const checkInTime = new Date(checkIn).getTime();
  const checkOutTime = new Date(checkOut).getTime();
  if (!Number.isFinite(checkInTime) || !Number.isFinite(checkOutTime) || checkOutTime <= checkInTime) {
    return '-';
  }

  return formatScheduledDuration(Math.round((checkOutTime - checkInTime) / 60000)) || '-';
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

export const scheduleWindow = (assignment: AttendanceControlAssignment, copy: TimeTableCopy) => {
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

export const attendanceLabel = (assignment: AttendanceControlAssignment, copy: ControlTranslations) => {
  const statusKey = assignment.corrected_status ?? assignment.today_status ?? 'pending';
  return (copy.statuses as Record<string, string>)[statusKey] ?? statusKey;
};

export const assignmentBusinessLocationName = (assignment: AttendanceControlAssignment, copy: TimeTableCopy) => {
  const businessLocations = (assignment.business_locations ?? [])
    .map((location) => location.name);
  return businessLocations.length > 0 ? businessLocations.join(', ') : copy.notAssigned;
};

export const assignmentContractSiteName = (assignment: AttendanceControlAssignment, copy: TimeTableCopy) =>
  assignment.active_work_site?.location_name || copy.notAssigned;

const assignmentStatus = (assignment: AttendanceControlAssignment) =>
  assignment.corrected_status ?? assignment.today_status;

export const isLateAssignment = (assignment: AttendanceControlAssignment) =>
  assignmentStatus(assignment) === 'late' || assignment.minutes_late > 0;

export const isAbsentAssignment = (assignment: AttendanceControlAssignment) =>
  assignmentStatus(assignment) === 'absence';

export const formatAttendanceTime = (value: string | null | undefined, locale: string) => {
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

export const compareText = (left: string, right: string) => left.localeCompare(right, undefined, {
  numeric: true,
  sensitivity: 'base',
});

export const compareNullableTime = (left?: string | null, right?: string | null) => {
  if (!left && !right) {
    return 0;
  }
  if (!left) {
    return 1;
  }
  if (!right) {
    return -1;
  }
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
    return leftTime - rightTime;
  }
  return compareText(left, right);
};
