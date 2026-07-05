import { CalendarDays, CalendarPlus, MapPin } from "lucide-react";
import {
  type AttendanceAccessProfile,
  type AttendanceControlAssignment,
} from "../../../../api/humanResources";
import { Button } from "../../../../components/ui/button";
import type { AttendanceControlCopy } from "./ControlAttendanceWidgets";
import { EmployeeAccessActions } from "./EmployeeAccessActions";

type FaceEnrollmentSummary = {
  id: number;
  status: string;
  enrolled_at?: string | null;
} | null;

export function EmployeeActionBar({
  copy,
  embedded = false,
  selectedEmployee,
  selectedAccessProfile,
  faceEnrollment,
  assignments,
  assignLocationDisabled,
  assignLocationTitle,
  isCalendarBulkSelectionMode,
  selectedCalendarDayCount,
  onAssignLocation,
  onOpenRestPlanner,
  onToggleCalendarBulkSelectionMode,
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
  isCalendarBulkSelectionMode: boolean;
  selectedCalendarDayCount: number;
  onAssignLocation: () => void;
  onOpenRestPlanner: () => void;
  onToggleCalendarBulkSelectionMode: () => void;
  onFaceEnrollmentChange: (enrollment: FaceEnrollmentSummary) => void;
  onReload: () => Promise<void> | void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  return (
    <div
      className={
        embedded
          ? "border-t border-[#59C3A5]/10 pt-4 dark:border-gray-700"
          : "rounded-lg border border-[#59C3A5]/10 bg-[#F4FCF9] p-3 dark:border-gray-800 dark:bg-gray-900/30"
      }
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {copy.sections.access}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {copy.labels.metadataHint}
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Button
          variant="outline"
          size="sm"
          className="h-9 justify-center gap-2 rounded-lg border-[#59C3A5]/25 bg-[#59C3A5]/10 text-xs font-semibold text-[#59C3A5] shadow-sm hover:border-[#59C3A5]/45 hover:bg-[#59C3A5]/15 hover:text-[#59C3A5] disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 dark:border-[#8FE0CA]/25 dark:bg-[#59C3A5]/30 dark:text-[#8FE0CA] dark:hover:bg-[#59C3A5]/40"
          disabled={assignLocationDisabled}
          title={assignLocationTitle}
          onClick={onAssignLocation}
        >
          <MapPin className="h-4 w-4" />
          {copy.labels.contractSiteLabel}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-9 justify-center gap-2 rounded-lg border-[#59C3A5]/25 bg-white text-xs font-semibold text-[#237c67] shadow-sm hover:border-[#59C3A5]/45 hover:bg-[#F4FCF9] hover:text-[#237c67] dark:border-[#8FE0CA]/25 dark:bg-slate-900 dark:text-[#8FE0CA]"
          title={copy.labels.restPlannerActionDescription}
          onClick={onOpenRestPlanner}
        >
          <CalendarPlus className="h-4 w-4" />
          {copy.labels.restPlannerAction}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className={`h-9 justify-center gap-2 rounded-md border-[#F2C94C]/45 text-xs font-semibold shadow-[0_1px_2px_rgba(242,201,76,0.12)] transition ${
            isCalendarBulkSelectionMode
              ? "bg-[#F2C94C] text-slate-950 hover:bg-[#e5b932] hover:text-slate-950"
              : "bg-[#F2C94C]/15 text-[#9a7400] hover:border-[#F2C94C]/65 hover:bg-[#F2C94C]/25 hover:text-[#7a5c00] dark:text-[#F2C94C]"
          }`}
          title={copy.labels.bulkCalendarDescription}
          onClick={onToggleCalendarBulkSelectionMode}
        >
          <CalendarDays className="h-4 w-4" />
          {isCalendarBulkSelectionMode && selectedCalendarDayCount > 0
            ? copy.labels.bulkCalendarSelectedLabel(selectedCalendarDayCount)
            : copy.labels.bulkCalendarAction}
        </Button>

        <EmployeeAccessActions
          selectedEmployee={selectedEmployee}
          selectedAccessProfile={selectedAccessProfile}
          faceEnrollment={faceEnrollment}
          assignments={assignments}
          actionBarLayout
          showPinAction={false}
          onFaceEnrollmentChange={onFaceEnrollmentChange}
          onReload={onReload}
          onSuccess={onSuccess}
          onError={onError}
        />
      </div>
    </div>
  );
}
