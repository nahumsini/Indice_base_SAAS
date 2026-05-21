import { type ReactNode } from 'react';
import { MapPin, ScanFace, Timer } from 'lucide-react';
import {
  type AttendanceAccessProfile,
  type AttendanceCalendarDay,
  type AttendanceControlAssignment,
  type AttendanceControlRule,
  type AttendanceControlTemplate,
} from '../../../../api/humanResources';
import { statusClasses, type AttendanceControlCopy } from './ControlAttendanceWidgets';

type FaceEnrollmentSummary = { id: number; status: string; enrolled_at?: string | null } | null;

const getPrimaryStatus = (employee: AttendanceControlAssignment, copy: AttendanceControlCopy) => {
  const displayStatus = employee.corrected_status ?? employee.today_status;
  if (!employee.schedule_template_id && displayStatus === 'not_scheduled') {
    return {
      className: statusClasses.not_scheduled,
      label: copy.statuses.not_scheduled,
    };
  }

  return {
    className: statusClasses[displayStatus] ?? statusClasses.pending,
    label: copy.statuses[displayStatus] ?? displayStatus.replace(/_/g, ' '),
  };
};

function EmployeeInfoItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#59C3A5]/10 bg-white px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-gray-800 dark:bg-gray-900/40">
      <div className="flex items-center gap-2">
        <span className="text-[#59C3A5] dark:text-[#8FE0CA]">{icon}</span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{label}</p>
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-gray-900 dark:text-white" title={value}>{value}</p>
    </div>
  );
}

const timeLabel = (value?: string | null) => (value ? value.slice(0, 5) : '');

const findTemplateName = (
  rule: AttendanceControlRule | null,
  selectedEmployee: AttendanceControlAssignment,
  templates: AttendanceControlTemplate[],
) => {
  if (!rule) {
    return selectedEmployee.schedule_template_name || '';
  }

  const template = templates.find((item) => item.id === rule.template_id);
  if (template?.name) {
    return template.name;
  }

  if (selectedEmployee.schedule_template_id === rule.template_id) {
    return selectedEmployee.schedule_template_name || '';
  }

  return '';
};

const scheduleValueForDay = ({
  copy,
  day,
  selectedEmployee,
  templates,
}: {
  copy: AttendanceControlCopy;
  day: AttendanceCalendarDay | null;
  selectedEmployee: AttendanceControlAssignment;
  templates: AttendanceControlTemplate[];
}) => {
  const rule = day?.schedule_rule ?? selectedEmployee.today_rule ?? null;
  const templateName = findTemplateName(rule, selectedEmployee, templates);

  if (!rule && !templateName) {
    return copy.labels.noSchedule;
  }

  const start = timeLabel(rule?.start_time);
  const end = timeLabel(rule?.end_time);
  const scheduleParts = [templateName || copy.labels.schedule];

  if (rule?.is_rest_day) {
    scheduleParts.push(copy.labels.restDay);
  } else if (start && end) {
    scheduleParts.push(`${start} - ${end}`);
  } else if (rule?.schedule_mode === 'open') {
    scheduleParts.push(copy.labels.workingDay);
  }

  return scheduleParts.filter(Boolean).join(' · ');
};

const contractSiteValueForDay = (
  day: AttendanceCalendarDay | null,
  selectedEmployee: AttendanceControlAssignment,
  copy: AttendanceControlCopy,
) => {
  const workSite = day?.active_work_site ?? selectedEmployee.active_work_site ?? null;
  return workSite?.location_name || copy.labels.none;
};

const faceEnrollmentValue = ({
  copy,
  faceEnrollment,
  selectedAccessProfile,
  selectedEmployee,
}: {
  copy: AttendanceControlCopy;
  faceEnrollment: FaceEnrollmentSummary;
  selectedAccessProfile: AttendanceAccessProfile | null;
  selectedEmployee: AttendanceControlAssignment;
}) => {
  const enrollment =
    faceEnrollment ??
    selectedAccessProfile?.face_enrollment ??
    selectedEmployee.access_profile?.face_enrollment ??
    null;

  if (!enrollment) {
    return copy.labels.faceNotEnrolled;
  }

  if (enrollment.status === 'active') {
    return copy.statuses.active;
  }

  if (enrollment.status === 'pending') {
    return copy.statuses.pending;
  }

  return copy.statuses.inactive;
};

export function EmployeeHeaderCard({
  accessActions,
  copy,
  selectedEmployee,
  selectedCalendarDay,
  selectedAccessProfile,
  faceEnrollment,
  templates,
}: {
  accessActions?: ReactNode;
  copy: AttendanceControlCopy;
  selectedEmployee: AttendanceControlAssignment;
  selectedCalendarDay: AttendanceCalendarDay | null;
  selectedAccessProfile: AttendanceAccessProfile | null;
  faceEnrollment: FaceEnrollmentSummary;
  templates: AttendanceControlTemplate[];
}) {
  const role = selectedEmployee.position_title || selectedEmployee.department || copy.labels.noDepartment;
  const primaryStatus = getPrimaryStatus(selectedEmployee, copy);
  const scheduleValue = scheduleValueForDay({
    copy,
    day: selectedCalendarDay,
    selectedEmployee,
    templates,
  });
  const assignedWorkLocation = contractSiteValueForDay(selectedCalendarDay, selectedEmployee, copy);
  const faceStatus = faceEnrollmentValue({
    copy,
    faceEnrollment,
    selectedAccessProfile,
    selectedEmployee,
  });

  return (
    <div className="rounded-2xl border border-[#59C3A5]/10 bg-[#fbfdff] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:border-gray-800 dark:bg-gray-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold text-gray-900 dark:text-white">{selectedEmployee.user_name}</p>
          <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">{role}</p>
        </div>
        <span className={`inline-flex w-fit rounded-full px-3 py-1.5 text-sm font-semibold ${primaryStatus.className}`}>
          {primaryStatus.label}
        </span>
      </div>

      <div className="mt-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{copy.labels.selectedEmployee}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <EmployeeInfoItem
              icon={<Timer className="h-4 w-4" />}
              label={copy.labels.schedule}
              value={scheduleValue}
            />
            <EmployeeInfoItem
              icon={<MapPin className="h-4 w-4" />}
              label={copy.labels.contractSiteLabel}
              value={assignedWorkLocation}
            />
            <EmployeeInfoItem icon={<ScanFace className="h-4 w-4" />} label={copy.labels.faceEnrollmentStatus} value={faceStatus} />
          </div>
        </div>
      </div>

      {accessActions ? (
        <div className="mt-4">
          {accessActions}
        </div>
      ) : null}
    </div>
  );
}
