import { useEffect, useState } from 'react';
import { KeyRound, ScanFace, X } from 'lucide-react';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../../components/LoadingBarOverlay';
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
import { FaceEnrollmentModal } from './FaceEnrollmentModal';
import { useControlTranslations } from '../hooks/useControlTranslations';
import type { AttendanceControlCopy } from './ControlAttendanceWidgets';

type FaceEnrollmentSummary = { id: number; status: string; enrolled_at?: string | null } | null;

interface EmployeeAccessActionsProps {
  selectedEmployee: AttendanceControlAssignment | null;
  selectedAccessProfile: AttendanceAccessProfile | null;
  faceEnrollment: FaceEnrollmentSummary;
  assignments: AttendanceControlAssignment[];
  inlineLayout?: boolean;
  actionBarLayout?: boolean;
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
  inlineLayout = false,
  actionBarLayout = false,
  onFaceEnrollmentChange,
  onReload,
  onSuccess,
  onError,
}: EmployeeAccessActionsProps) {
  const copy = useControlTranslations();
  const [isAccessProfileDialogOpen, setIsAccessProfileDialogOpen] = useState(false);
  const [editingAccessProfile, setEditingAccessProfile] = useState<AttendanceAccessProfile | null>(null);
  const [accessProfileForm, setAccessProfileForm] = useState<AttendanceAccessProfilePayload>(defaultAccessProfileForm());
  const [shouldRegeneratePin, setShouldRegeneratePin] = useState(false);
  const [isFaceEnrollmentModalOpen, setIsFaceEnrollmentModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!selectedEmployee) {
    return null;
  }

  const actionGroupClassName = actionBarLayout
    ? 'contents'
    : inlineLayout
    ? 'contents'
    : 'grid w-full grid-cols-2 gap-2 sm:w-auto sm:auto-cols-max sm:grid-flow-col sm:grid-cols-none xl:justify-end';
  const actionButtonClassName = actionBarLayout
    ? 'h-10 justify-center gap-2 rounded-xl border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900 dark:hover:text-white'
    : inlineLayout
    ? 'h-9 min-w-[8.75rem] shrink-0 justify-center whitespace-nowrap border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900 dark:hover:text-white'
    : 'whitespace-nowrap border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900 dark:hover:text-white';
  const effectiveAccessProfile = selectedAccessProfile ?? selectedEmployee.access_profile ?? null;
  const selectedPinMethod = effectiveAccessProfile?.methods.find((method) => method.method_type === 'pin') ?? null;

  const openCreateAccessProfileDialog = () => {
    setEditingAccessProfile(null);
    setAccessProfileForm({
      ...defaultAccessProfileForm(),
      employee_id: selectedEmployee.employee_id,
    });
    setShouldRegeneratePin(false);
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
    setShouldRegeneratePin(false);
    setIsAccessProfileDialogOpen(true);
  };

  const handleSaveAccessProfile = async () => {
    setIsSaving(true);
    onError('');

    try {
      await runWithMinimumDuration((async () => {
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

        if (shouldRegeneratePin) {
          const existingPinMethod = savedProfile.methods.find((method) => method.method_type === 'pin') ?? null;
          const pinPayload: AttendanceAccessMethodPayload = {
            access_profile_id: savedProfile.id,
            method_type: 'pin',
            regenerate_pin: true,
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
      })(), 850);

      setIsAccessProfileDialogOpen(false);
      setShouldRegeneratePin(false);
      onSuccess(copy.labels.accessProfileSaved);
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
      await runWithMinimumDuration(
        humanResourcesApi.deleteFaceEnrollment(selectedEmployee.employee_id),
        850,
      );
      onFaceEnrollmentChange(null);
      onSuccess(copy.labels.faceEnrollmentRemoved);
      await Promise.resolve(onReload());
    } catch (error) {
      onError(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <LoadingBarOverlay
        isVisible={isSaving}
        title={copy.labels.savingAccessChanges}
        description={copy.labels.savingAccessChangesDescription}
      />

      <div className={actionGroupClassName}>
        {actionBarLayout ? (
          <Button
            variant="outline"
            size="sm"
            className={actionButtonClassName}
            disabled={isSaving}
            title={selectedPinMethod ? copy.labels.pinConfiguredHint : undefined}
            onClick={effectiveAccessProfile ? () => openEditAccessProfileDialog(effectiveAccessProfile) : openCreateAccessProfileDialog}
          >
            <KeyRound className="h-4 w-4" />
            {copy.labels.setPin}
          </Button>
        ) : (
          <div className={inlineLayout ? 'flex h-9 shrink-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100' : 'flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100'}>
            <span className={`h-2 w-2 rounded-full ${selectedPinMethod ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {selectedPinMethod ? copy.labels.pinSet : copy.labels.noPin}
          </div>
        )}
        {!actionBarLayout ? (
          <Button
            variant="outline"
            size="sm"
            className={actionButtonClassName}
            disabled={isSaving}
            onClick={effectiveAccessProfile ? () => openEditAccessProfileDialog(effectiveAccessProfile) : openCreateAccessProfileDialog}
          >
            {effectiveAccessProfile ? copy.labels.editAccessProfile : copy.labels.addAccessProfile}
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className={actionButtonClassName}
          disabled={isSaving}
          onClick={() => setIsFaceEnrollmentModalOpen(true)}
        >
          {actionBarLayout ? <ScanFace className="h-4 w-4" /> : null}
          {faceEnrollment ? copy.labels.reEnrollFace : copy.labels.enrollFace}
        </Button>
        {faceEnrollment && !actionBarLayout ? (
          <Button
            variant="outline"
            size="sm"
            className={actionButtonClassName}
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
        currentPin={editingAccessProfile?.methods.find((method) => method.method_type === 'pin')?.pin_code ?? null}
        hasExistingPin={Boolean(editingAccessProfile?.methods.some((method) => method.method_type === 'pin'))}
        shouldRegeneratePin={shouldRegeneratePin}
        onClose={() => {
          setIsAccessProfileDialogOpen(false);
          setShouldRegeneratePin(false);
        }}
        onChange={setAccessProfileForm}
        onRegeneratePin={() => setShouldRegeneratePin(true)}
        onCancelRegeneratePin={() => setShouldRegeneratePin(false)}
        onSave={() => void handleSaveAccessProfile()}
        title={actionBarLayout ? copy.labels.setPin : editingAccessProfile ? copy.labels.editAccessProfile : copy.labels.addAccessProfile}
      />

      <FaceEnrollmentModal
        isOpen={isFaceEnrollmentModalOpen}
        employeeId={selectedEmployee.employee_id}
        employeeName={selectedEmployee.employee_name}
        onClose={() => setIsFaceEnrollmentModalOpen(false)}
        onError={onError}
        onCompleted={async () => {
          setIsSaving(true);
          onError('');
          try {
            const response = await runWithMinimumDuration(
              humanResourcesApi.getFaceEnrollment(selectedEmployee.employee_id),
              850,
            );
            onFaceEnrollmentChange(response.enrollment);
            onSuccess(copy.labels.faceEnrollmentCompleted);
          } catch (error) {
            const message = toErrorMessage(error, copy) || copy.saveError;
            onError(message);
            throw new Error(message);
          } finally {
            setIsSaving(false);
          }
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
  currentPin,
  hasExistingPin,
  shouldRegeneratePin,
  title,
  onClose,
  onChange,
  onRegeneratePin,
  onCancelRegeneratePin,
  onSave,
}: {
  copy: AttendanceControlCopy;
  isOpen: boolean;
  isSaving: boolean;
  assignments: AttendanceControlAssignment[];
  form: AttendanceAccessProfilePayload;
  currentPin?: string | null;
  hasExistingPin: boolean;
  shouldRegeneratePin: boolean;
  title: string;
  onClose: () => void;
  onChange: (value: AttendanceAccessProfilePayload) => void;
  onRegeneratePin: () => void;
  onCancelRegeneratePin: () => void;
  onSave: () => void;
}) {
  const [isPinVisible, setIsPinVisible] = useState(false);
  const canRevealPin = Boolean(currentPin);

  useEffect(() => {
    setIsPinVisible(false);
  }, [currentPin, isOpen]);

  const pinStatusDescription = !hasExistingPin
    ? 'A unique 5-digit PIN will be generated automatically when you save.'
    : canRevealPin
      ? 'A unique 5-digit PIN is saved for this employee. Reveal it when HR needs to share it.'
      : 'This employee has an older PIN. Regenerate it to create a shareable 5-digit PIN.';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        hideCloseButton
        className="max-h-[90vh] gap-0 overflow-hidden rounded-2xl border border-[#143675]/20 bg-white p-0 text-gray-900 shadow-2xl dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:max-w-[720px]"
        overlayClassName="bg-black/55"
      >
        <DialogHeader className="flex-row items-start justify-between gap-4 bg-[#143675] px-6 py-5 text-left">
          <div className="min-w-0">
            <DialogTitle className="text-xl font-semibold leading-7 text-white">{title}</DialogTitle>
            <DialogDescription className="mt-1 max-w-2xl text-sm leading-5 text-blue-100">
              {copy.labels.metadataHint}
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/85 transition hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
            aria-label={copy.labels.closeModal}
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        <div className="max-h-[calc(90vh-152px)] overflow-y-auto px-6 py-5">
          <div className="grid gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.selectedEmployee}</label>
            <select
              value={form.employee_id || ''}
              onChange={(event) => onChange({ ...form, employee_id: Number(event.target.value) })}
              className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
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
                className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
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
                className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              >
                {accessMethodOptions.map((value) => (
                  <option key={value} value={value}>
                    {copy.labels.authMethods[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">PIN status</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{pinStatusDescription}</p>
              </div>
              {hasExistingPin ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-gray-300 bg-white text-[#143675] hover:bg-[#143675] hover:text-white dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  onClick={onRegeneratePin}
                  disabled={isSaving || shouldRegeneratePin}
                >
                  Regenerate PIN
                </Button>
              ) : null}
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-lg font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                {canRevealPin && isPinVisible ? currentPin : '*****'}
              </div>
              {hasExistingPin ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPinVisible((value) => !value)}
                  disabled={isSaving || !canRevealPin}
                >
                  {isPinVisible ? copy.labels.hidePin : copy.labels.revealPin}
                </Button>
              ) : null}
            </div>

            {shouldRegeneratePin ? (
              <div className="mt-3 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
                <span>A new unique PIN will be generated when you save.</span>
                <Button type="button" variant="ghost" size="sm" onClick={onCancelRegeneratePin} disabled={isSaving}>
                  Cancel
                </Button>
              </div>
            ) : null}
          </div>
          </div>
        </div>

        <DialogFooter className="border-t border-white/10 bg-[#143675] px-6 py-4">
          <Button
            variant="outline"
            className="rounded-xl border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            {copy.labels.cancel}
          </Button>
          <Button
            className="rounded-xl bg-white text-[#143675] hover:bg-blue-50"
            onClick={onSave}
            disabled={isSaving || !form.employee_id}
          >
            {copy.labels.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
