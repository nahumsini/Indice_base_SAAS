import { MapPin } from 'lucide-react';
import {
  type AttendanceAccessProfile,
  type AttendanceControlAssignment,
} from '../../../../api/humanResources';
import { Button } from '../../../../components/ui/button';
import type { AttendanceControlCopy } from './ControlAttendanceWidgets';
import { EmployeeAccessActions } from './EmployeeAccessActions';

type FaceEnrollmentSummary = { id: number; status: string; enrolled_at?: string | null } | null;

export function EmployeeActionBar({
  copy,
  embedded = false,
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
  copy: AttendanceControlCopy;
  embedded?: boolean;
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
    <div className={embedded ? 'border-t border-[#143675]/10 pt-4 dark:border-gray-700' : 'rounded-2xl border border-[#143675]/10 bg-[#f7faff] p-3 dark:border-gray-800 dark:bg-gray-900/30'}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{copy.sections.access}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{copy.labels.metadataHint}</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <Button
          variant="outline"
          size="sm"
          className="h-9 justify-center gap-2 rounded-xl border-[#143675]/25 bg-[#143675]/10 text-xs font-semibold text-[#143675] shadow-[0_1px_2px_rgba(20,54,117,0.08)] hover:border-[#143675]/45 hover:bg-[#143675]/15 hover:text-[#143675] disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 dark:border-[#8bb3ff]/25 dark:bg-[#143675]/30 dark:text-[#8bb3ff] dark:hover:bg-[#143675]/40"
          disabled={assignLocationDisabled}
          title={assignLocationTitle}
          onClick={onAssignLocation}
        >
          <MapPin className="h-4 w-4" />
          {copy.labels.contractSiteLabel}
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
