import { MapPin } from 'lucide-react';
import {
  type AttendanceAccessProfile,
  type AttendanceControlAssignment,
} from '../../../../api/humanResources';
import { Button } from '../../../../components/ui/button';
import { EmployeeAccessActions } from './EmployeeAccessActions';

type FaceEnrollmentSummary = { id: number; status: string; enrolled_at?: string | null } | null;

export function EmployeeActionBar({
  selectedEmployee,
  selectedAccessProfile,
  faceEnrollment,
  assignments,
  assignLocationDisabled,
  assignLocationTitle,
  onAssignLocation,
  onFaceEnrollmentChange,
  onReload,
  onSuccess,
  onError,
}: {
  selectedEmployee: AttendanceControlAssignment;
  selectedAccessProfile: AttendanceAccessProfile | null;
  faceEnrollment: FaceEnrollmentSummary;
  assignments: AttendanceControlAssignment[];
  assignLocationDisabled: boolean;
  assignLocationTitle?: string;
  onAssignLocation: () => void;
  onFaceEnrollmentChange: (enrollment: FaceEnrollmentSummary) => void;
  onReload: () => Promise<void> | void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Action bar</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Manage the selected HR user attendance setup.</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <Button
          variant="outline"
          size="sm"
          className="h-10 justify-center gap-2 rounded-xl border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900 dark:hover:text-white"
          disabled={assignLocationDisabled}
          title={assignLocationTitle}
          onClick={onAssignLocation}
        >
          <MapPin className="h-4 w-4" />
          Assign location
        </Button>

        <EmployeeAccessActions
          selectedEmployee={selectedEmployee}
          selectedAccessProfile={selectedAccessProfile}
          faceEnrollment={faceEnrollment}
          assignments={assignments}
          actionBarLayout
          onFaceEnrollmentChange={onFaceEnrollmentChange}
          onReload={onReload}
          onSuccess={onSuccess}
          onError={onError}
        />
      </div>
    </div>
  );
}
