import type { ReactNode } from 'react';
import type {
  AttendanceAccessProfile,
  AttendanceControlAssignment,
} from '../../../../api/humanResources';
import type { AttendanceControlCopy } from './ControlAttendanceWidgets';
import { EmployeeActionBar } from './EmployeeActionBar';
import { EmployeeHeaderCard } from './EmployeeHeaderCard';

type FaceEnrollmentSummary = { id: number; status: string; enrolled_at?: string | null } | null;

export function EmployeeAttendanceDetailPanel({
  copy,
  selectedEmployee,
  selectedAccessProfile,
  faceEnrollment,
  assignments,
  selectedEmployeeBusyReason,
  calendar,
  quickActions,
  onAssignLocation,
  onFaceEnrollmentChange,
  onReload,
  onSuccess,
  onError,
}: {
  copy: AttendanceControlCopy;
  selectedEmployee: AttendanceControlAssignment | null;
  selectedAccessProfile: AttendanceAccessProfile | null;
  faceEnrollment: FaceEnrollmentSummary;
  assignments: AttendanceControlAssignment[];
  selectedEmployeeBusyReason: string;
  calendar: ReactNode;
  quickActions: ReactNode;
  onAssignLocation: () => void;
  onFaceEnrollmentChange: (enrollment: FaceEnrollmentSummary) => void;
  onReload: () => Promise<void> | void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  return (
    <section className="rounded-lg border border-[#59C3A5]/10 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{copy.labels.attendanceCalendar}</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {selectedEmployee ? copy.labels.employeeMonthlyAttendanceDetail : copy.labels.selectEmployeeCalendar}
          </p>
        </div>

        {selectedEmployee ? (
          <>
            <EmployeeHeaderCard
              copy={copy}
              selectedEmployee={selectedEmployee}
              accessActions={(
                <EmployeeActionBar
                  copy={copy}
                  embedded
                  selectedEmployee={selectedEmployee}
                  selectedAccessProfile={selectedAccessProfile}
                  faceEnrollment={faceEnrollment}
                  assignments={assignments}
                  assignLocationDisabled={Boolean(selectedEmployeeBusyReason)}
                  assignLocationTitle={selectedEmployeeBusyReason ? copy.labels.removeExistingShiftTooltip(selectedEmployeeBusyReason) : undefined}
                  onAssignLocation={onAssignLocation}
                  onFaceEnrollmentChange={onFaceEnrollmentChange}
                  onReload={onReload}
                  onSuccess={onSuccess}
                  onError={onError}
                />
              )}
            />
          </>
        ) : null}
      </div>

      {selectedEmployee ? (
        <div className="mt-5 space-y-5">
          {calendar}
          {quickActions}
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed border-[#59C3A5]/20 bg-[#F4FCF9] px-6 py-12 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
          {copy.labels.selectEmployeeCalendar}
        </div>
      )}
    </section>
  );
}
