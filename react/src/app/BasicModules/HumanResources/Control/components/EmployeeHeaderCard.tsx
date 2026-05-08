import { type ReactNode } from 'react';
import { MapPin, ScanFace, Timer } from 'lucide-react';
import { type AttendanceControlAssignment } from '../../../../api/humanResources';
import { statusClasses } from './ControlAttendanceWidgets';

type FaceEnrollmentSummary = { id: number; status: string; enrolled_at?: string | null } | null;

const statusLabelByValue: Record<string, string> = {
  absence: 'Absent',
  late: 'Late',
  leave: 'Leave',
  not_scheduled: 'No schedule',
  on_time: 'On time',
  pending: 'Pending',
  rest: 'Rest day',
};

const getPrimaryStatus = (employee: AttendanceControlAssignment) => {
  const displayStatus = employee.corrected_status ?? employee.today_status;
  if (!employee.schedule_template_id && displayStatus === 'not_scheduled') {
    return {
      className: statusClasses.not_scheduled,
      label: 'No schedule',
    };
  }

  return {
    className: statusClasses[displayStatus] ?? statusClasses.pending,
    label: statusLabelByValue[displayStatus] ?? displayStatus.replace(/_/g, ' '),
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
    <div className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
      <div className="flex items-center gap-2">
        <span className="text-[#143675] dark:text-[#8bb3ff]">{icon}</span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{label}</p>
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

export function EmployeeHeaderCard({
  selectedEmployee,
  faceEnrollment,
}: {
  selectedEmployee: AttendanceControlAssignment;
  faceEnrollment: FaceEnrollmentSummary;
}) {
  const role = selectedEmployee.position_title || selectedEmployee.department || 'No role assigned';
  const primaryStatus = getPrimaryStatus(selectedEmployee);
  const faceStatus = faceEnrollment?.status === 'active' ? 'Face ID active' : 'Not enrolled';
  const assignedWorkLocation =
    selectedEmployee.active_work_site?.location_name
    ?? selectedEmployee.business_locations?.[0]?.name
    ?? 'No work location assigned';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-2xl font-semibold text-gray-900 dark:text-white">{selectedEmployee.employee_name}</p>
          <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">{role}</p>
        </div>
        <span className={`inline-flex w-fit rounded-full px-3 py-1.5 text-sm font-semibold ${primaryStatus.className}`}>
          {primaryStatus.label}
        </span>
      </div>

      <div className="mt-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">Employee setup</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <EmployeeInfoItem
              icon={<Timer className="h-4 w-4" />}
              label="Schedule"
              value={selectedEmployee.schedule_template_name || 'No schedule'}
            />
            <EmployeeInfoItem
              icon={<MapPin className="h-4 w-4" />}
              label="Assigned work location"
              value={assignedWorkLocation}
            />
            <EmployeeInfoItem icon={<ScanFace className="h-4 w-4" />} label="Face ID status" value={faceStatus} />
          </div>
        </div>
      </div>
    </div>
  );
}
