import { type ReactNode } from 'react';
import {
  type AttendanceControlAssignment,
} from '../../../../api/humanResources';
import { statusClasses, type AttendanceControlCopy } from './ControlAttendanceWidgets';

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

export function EmployeeHeaderCard({
  accessActions,
  copy,
  selectedEmployee,
}: {
  accessActions?: ReactNode;
  copy: AttendanceControlCopy;
  selectedEmployee: AttendanceControlAssignment;
}) {
  const role = selectedEmployee.position_title || selectedEmployee.department || copy.labels.noDepartment;
  const primaryStatus = getPrimaryStatus(selectedEmployee, copy);

  return (
    <div className="rounded-lg border border-[#59C3A5]/10 bg-[#fbfdff] p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold text-gray-900 dark:text-white">{selectedEmployee.user_name}</p>
          <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">{role}</p>
        </div>
        <span className={`inline-flex w-fit rounded-full px-3 py-1.5 text-sm font-semibold ${primaryStatus.className}`}>
          {primaryStatus.label}
        </span>
      </div>

      {accessActions ? (
        <div className="mt-4">
          {accessActions}
        </div>
      ) : null}
    </div>
  );
}
