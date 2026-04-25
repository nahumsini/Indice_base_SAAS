import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { ApiClientError } from '../../../../lib/apiClient';
import {
  type AttendanceAccessMethod,
  type AttendanceAccessMethodPayload,
  type AttendanceAccessProfile,
  type AttendanceAccessProfilePayload,
  type AttendanceControlAssignment,
  humanResourcesApi,
} from '../../../../api/humanResources';
import { useHRLanguage } from '../../HRLanguage';
import { FaceEnrollmentModal } from './FaceEnrollmentModal';

type AttendanceControlCopy = ReturnType<typeof useHRLanguage>['attendanceControl'];
type FaceEnrollmentSummary = { id: number; status: string; enrolled_at?: string | null } | null;

interface EmployeeAccessActionsProps {
  selectedEmployee: AttendanceControlAssignment | null;
  selectedAccessProfile: AttendanceAccessProfile | null;
  faceEnrollment: FaceEnrollmentSummary;
  assignments: AttendanceControlAssignment[];
  onFaceEnrollmentChange: (enrollment: FaceEnrollmentSummary) => void;
  onReload: () => Promise<void> | void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const accessMethodOptions: Array<AttendanceAccessMethod['method_type']> = ['pin'];

const defaultAccessProfileForm = (): AttendanceAccessProfilePayload => ({
  employee_id: 0,
  status: 'active',
  default_method: 'pin',
  metadata: {
    supports_face_recognition: false,
  },
});

const normalizeControlAccessMethod = (method: AttendanceAccessMethod['method_type']) =>
  accessMethodOptions.includes(method) ? method : 'pin';

const toErrorMessage = (error: unknown, copy: AttendanceControlCopy) => {
  if (error instanceof ApiClientError) {
    if (error.status === 404) {
      return copy.notFound;
    }
    if (error.status === 401) {
      return copy.unauthorized;
    }
    return error.message || copy.genericError;
  }

  return error instanceof Error ? error.message : copy.genericError;
};

export function EmployeeAccessActions({
  selectedEmployee,
  selectedAccessProfile,
  faceEnrollment,
  assignments,
  onFaceEnrollmentChange,
  onReload,
  onSuccess,
  onError,
}: EmployeeAccessActionsProps) {
  const copy = useHRLanguage().attendanceControl;
  const [isAccessProfileDialogOpen, setIsAccessProfileDialogOpen] = useState(false);
  const [editingAccessProfile, setEditingAccessProfile] = useState<AttendanceAccessProfile | null>(null);
  const [accessProfileForm, setAccessProfileForm] = useState<AttendanceAccessProfilePayload>(defaultAccessProfileForm());
  const [accessProfilePin, setAccessProfilePin] = useState('');
  const [isFaceEnrollmentModalOpen, setIsFaceEnrollmentModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!selectedEmployee) {
    return null;
  }

  const openCreateAccessProfileDialog = () => {
    setEditingAccessProfile(null);
    setAccessProfileForm({
      ...defaultAccessProfileForm(),
      employee_id: selectedEmployee.employee_id,
    });
    setAccessProfilePin('');
    setIsAccessProfileDialogOpen(true);
  };

  const openEditAccessProfileDialog = (profile: AttendanceAccessProfile) => {
    setEditingAccessProfile(profile);
    setAccessProfileForm({
      employee_id: profile.employee_id,
      status: profile.status,
      default_method: normalizeControlAccessMethod(profile.default_method),
      last_enrolled_at: profile.last_enrolled_at ?? undefined,
      metadata: profile.metadata ?? { supports_face_recognition: false },
    });
    setAccessProfilePin('');
    setIsAccessProfileDialogOpen(true);
  };

  const handleSaveAccessProfile = async () => {
    setIsSaving(true);
    onError('');

    try {
      const profilePayload = {
        ...accessProfileForm,
        default_method: 'pin' as const,
      };
      let savedProfile: AttendanceAccessProfile;
      if (editingAccessProfile) {
        const response = await humanResourcesApi.updateAttendanceAccessProfile(editingAccessProfile.id, profilePayload);
        savedProfile = response.access_profile;
      } else {
        const response = await humanResourcesApi.createAttendanceAccessProfile(profilePayload);
        savedProfile = response.access_profile;
      }

      const nextPin = accessProfilePin.trim();
      if (nextPin) {
        const existingPinMethod = savedProfile.methods.find((method) => method.method_type === 'pin') ?? null;
        const pinPayload: AttendanceAccessMethodPayload = {
          access_profile_id: savedProfile.id,
          method_type: 'pin',
          credential_ref: '',
          secret: nextPin,
          status: 'active',
          priority: existingPinMethod?.priority ?? 10,
          metadata: existingPinMethod?.metadata ?? {},
        };

        if (existingPinMethod) {
          await humanResourcesApi.updateAttendanceAccessMethod(existingPinMethod.id, pinPayload);
        } else {
          await humanResourcesApi.createAttendanceAccessMethod(pinPayload);
        }
      }

      setIsAccessProfileDialogOpen(false);
      setAccessProfilePin('');
      onSuccess(copy.labels.editAccessProfile);
      await Promise.resolve(onReload());
    } catch (error) {
      onError(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFaceEnrollment = async () => {
    setIsSaving(true);
    onError('');

    try {
      await humanResourcesApi.deleteFaceEnrollment(selectedEmployee.employee_id);
      onFaceEnrollmentChange(null);
      onSuccess('Face enrollment removed.');
      await Promise.resolve(onReload());
    } catch (error) {
      onError(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:auto-cols-max sm:grid-flow-col sm:grid-cols-none xl:justify-end">
        <Button
          variant="outline"
          size="sm"
          className="whitespace-nowrap"
          disabled={isSaving}
          onClick={selectedAccessProfile ? () => openEditAccessProfileDialog(selectedAccessProfile) : openCreateAccessProfileDialog}
        >
          {selectedAccessProfile ? copy.labels.editAccessProfile : copy.labels.addAccessProfile}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="whitespace-nowrap"
          disabled={isSaving}
          onClick={() => setIsFaceEnrollmentModalOpen(true)}
        >
          {faceEnrollment ? 'Re-enroll face' : 'Enroll face'}
        </Button>
        {faceEnrollment ? (
          <Button
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            disabled={isSaving}
            onClick={() => void handleDeleteFaceEnrollment()}
          >
            Delete face
          </Button>
        ) : null}
      </div>

      <AccessProfileDialog
        copy={copy}
        isOpen={isAccessProfileDialogOpen}
        isSaving={isSaving}
        assignments={assignments}
        form={accessProfileForm}
        pin={accessProfilePin}
        hasExistingPin={Boolean(editingAccessProfile?.methods.some((method) => method.method_type === 'pin'))}
        onClose={() => setIsAccessProfileDialogOpen(false)}
        onChange={setAccessProfileForm}
        onPinChange={setAccessProfilePin}
        onSave={() => void handleSaveAccessProfile()}
        title={editingAccessProfile ? copy.labels.editAccessProfile : copy.labels.addAccessProfile}
      />

      <FaceEnrollmentModal
        isOpen={isFaceEnrollmentModalOpen}
        employeeId={selectedEmployee.employee_id}
        employeeName={selectedEmployee.employee_name}
        onClose={() => setIsFaceEnrollmentModalOpen(false)}
        onCompleted={async () => {
          const response = await humanResourcesApi.getFaceEnrollment(selectedEmployee.employee_id);
          onFaceEnrollmentChange(response.enrollment);
          onSuccess('Face enrollment completed.');
        }}
      />
    </>
  );
}

function AccessProfileDialog({
  copy,
  isOpen,
  isSaving,
  assignments,
  form,
  pin,
  hasExistingPin,
  title,
  onClose,
  onChange,
  onPinChange,
  onSave,
}: {
  copy: AttendanceControlCopy;
  isOpen: boolean;
  isSaving: boolean;
  assignments: AttendanceControlAssignment[];
  form: AttendanceAccessProfilePayload;
  pin: string;
  hasExistingPin: boolean;
  title: string;
  onClose: () => void;
  onChange: (value: AttendanceAccessProfilePayload) => void;
  onPinChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{copy.labels.metadataHint}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.selectedEmployee}</label>
            <select
              value={form.employee_id || ''}
              onChange={(event) => onChange({ ...form, employee_id: Number(event.target.value) })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="0">--</option>
              {assignments.map((assignment) => (
                <option key={assignment.employee_id} value={assignment.employee_id}>
                  {assignment.employee_name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.accessProfileStatus}</label>
              <select
                value={form.status}
                onChange={(event) => onChange({ ...form, status: event.target.value as 'active' | 'inactive' })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="active">{copy.statuses.active}</option>
                <option value="inactive">{copy.statuses.inactive}</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.defaultMethod}</label>
              <select
                value={normalizeControlAccessMethod(form.default_method)}
                onChange={() => onChange({ ...form, default_method: 'pin' })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {accessMethodOptions.map((value) => (
                  <option key={value} value={value}>
                    {copy.labels.authMethods[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.pinCode}</label>
            <input
              type="password"
              value={pin}
              onChange={(event) => onPinChange(event.target.value)}
              placeholder={copy.labels.pinPlaceholder}
              inputMode="numeric"
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{copy.labels.cancel}</Button>
          <Button onClick={onSave} disabled={isSaving || !form.employee_id || (!hasExistingPin && !pin.trim())}>{copy.labels.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
