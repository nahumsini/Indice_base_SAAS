import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, RotateCcw, ScanFace, X } from 'lucide-react';
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
  pinLabelOverride?: string;
  showFaceAction?: boolean;
  onFaceEnrollmentChange: (enrollment: FaceEnrollmentSummary) => void;
  onReload: () => Promise<void> | void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const accessMethodOptions: Array<AttendanceAccessMethod['method_type']> = ['pin'];

const defaultAccessProfileForm = (): AttendanceAccessProfilePayload => ({
  user_company_id: 0,
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
  pinLabelOverride,
  showFaceAction = true,
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
    ? 'h-9 justify-center gap-2 rounded-md border-[#59C3A5]/25 bg-[#59C3A5]/10 text-xs font-semibold text-[#59C3A5] shadow-[0_1px_2px_rgba(89,195,165,0.08)] hover:border-[#59C3A5]/45 hover:bg-[#59C3A5]/15 hover:text-[#59C3A5] dark:border-[#8FE0CA]/25 dark:bg-[#59C3A5]/30 dark:text-[#8FE0CA] dark:hover:bg-[#59C3A5]/40'
    : inlineLayout
    ? 'h-9 min-w-[8.75rem] shrink-0 justify-center whitespace-nowrap border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900 dark:hover:text-white'
    : 'whitespace-nowrap border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900 dark:hover:text-white';
  const pinActionButtonClassName = actionBarLayout
    ? 'h-9 justify-center gap-2 rounded-md border-[#59C3A5]/30 bg-[#59C3A5]/10 text-xs font-semibold text-[#59C3A5] shadow-[0_1px_2px_rgba(89,195,165,0.10)] hover:border-[#59C3A5]/50 hover:bg-[#59C3A5]/20 hover:text-[#59C3A5] dark:border-[#8FE0CA]/30 dark:bg-[#59C3A5]/30 dark:text-[#8FE0CA] dark:hover:bg-[#59C3A5]/45'
    : actionButtonClassName;
  const faceActionButtonClassName = actionBarLayout
    ? 'h-9 justify-center gap-2 rounded-md border-[#59C3A5] bg-[#59C3A5] text-xs font-semibold text-white shadow-[0_1px_2px_rgba(89,195,165,0.22)] hover:border-[#3AAE90] hover:bg-[#3AAE90] hover:text-white dark:border-[#8FE0CA]/60 dark:bg-[#8FE0CA] dark:text-[#081a38] dark:hover:bg-[#b4ccff]'
    : actionButtonClassName;
  const effectiveAccessProfile = selectedAccessProfile ?? selectedEmployee.access_profile ?? null;
  const selectedPinMethod = effectiveAccessProfile?.methods.find((method) => method.method_type === 'pin') ?? null;
  const accessProfileFormFromProfile = (profile: AttendanceAccessProfile): AttendanceAccessProfilePayload => ({
    user_company_id: profile.user_company_id,
    status: profile.status,
    default_method: normalizeControlAccessMethod(profile.default_method),
    last_enrolled_at: profile.last_enrolled_at ?? undefined,
    metadata: profile.metadata ?? { supports_face_recognition: false },
  });
  const resolveAccessProfileForEmployee = (userCompanyId: number) => (
    assignments.find((assignment) => assignment.user_company_id === userCompanyId)?.access_profile
    ?? (selectedAccessProfile?.user_company_id === userCompanyId ? selectedAccessProfile : null)
    ?? null
  );
  const hydrateAccessProfileForEmployee = (userCompanyId: number) => {
    const nextProfile = resolveAccessProfileForEmployee(userCompanyId);
    setEditingAccessProfile(nextProfile);
    setAccessProfileForm(nextProfile
      ? accessProfileFormFromProfile(nextProfile)
      : {
          ...defaultAccessProfileForm(),
          user_company_id: userCompanyId,
        });
    setShouldRegeneratePin(false);
  };

  const openCreateAccessProfileDialog = () => {
    setEditingAccessProfile(null);
    setAccessProfileForm({
      ...defaultAccessProfileForm(),
      user_company_id: selectedEmployee.user_company_id,
    });
    setShouldRegeneratePin(false);
    setIsAccessProfileDialogOpen(true);
  };

  const openEditAccessProfileDialog = (profile: AttendanceAccessProfile) => {
    setEditingAccessProfile(profile);
    setAccessProfileForm(accessProfileFormFromProfile(profile));
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
        humanResourcesApi.deleteFaceEnrollment(selectedEmployee.user_company_id),
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
            className={pinActionButtonClassName}
            disabled={isSaving}
            title={selectedPinMethod ? copy.labels.pinConfiguredHint : undefined}
            onClick={effectiveAccessProfile ? () => openEditAccessProfileDialog(effectiveAccessProfile) : openCreateAccessProfileDialog}
          >
            <KeyRound className="h-4 w-4" />
            {pinLabelOverride ?? copy.labels.setPin}
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
        {showFaceAction ? (
          <Button
            variant="outline"
            size="sm"
            className={faceActionButtonClassName}
            disabled={isSaving}
            onClick={() => setIsFaceEnrollmentModalOpen(true)}
          >
            {actionBarLayout ? <ScanFace className="h-4 w-4" /> : null}
            {faceEnrollment ? copy.labels.reEnrollFace : copy.labels.enrollFace}
          </Button>
        ) : null}
        {showFaceAction && faceEnrollment && !actionBarLayout ? (
          <Button
            variant="outline"
            size="sm"
            className={actionButtonClassName}
            disabled={isSaving}
            onClick={() => void handleDeleteFaceEnrollment()}
          >
            {copy.labels.deleteFaceEnrollment}
          </Button>
        ) : null}
      </div>

      <AccessProfileDialog
        key={accessProfileForm.user_company_id || 'new-access-profile'}
        copy={copy}
        isOpen={isAccessProfileDialogOpen}
        isSaving={isSaving}
        assignments={assignments}
        form={accessProfileForm}
        accessProfileId={editingAccessProfile?.id ?? null}
        currentPin={editingAccessProfile?.methods.find((method) => method.method_type === 'pin')?.pin_code ?? null}
        hasExistingPin={Boolean(editingAccessProfile?.methods.some((method) => method.method_type === 'pin'))}
        shouldRegeneratePin={shouldRegeneratePin}
        onClose={() => {
          setIsAccessProfileDialogOpen(false);
          setShouldRegeneratePin(false);
        }}
        onChange={setAccessProfileForm}
        onEmployeeChange={hydrateAccessProfileForEmployee}
        onRegeneratePin={() => setShouldRegeneratePin(true)}
        onCancelRegeneratePin={() => setShouldRegeneratePin(false)}
        onPinRefreshed={onReload}
        onSave={() => void handleSaveAccessProfile()}
        title={actionBarLayout ? copy.labels.setPin : editingAccessProfile ? copy.labels.editAccessProfile : copy.labels.addAccessProfile}
      />

      {showFaceAction ? (
        <FaceEnrollmentModal
          copy={copy}
          isOpen={isFaceEnrollmentModalOpen}
          employeeId={selectedEmployee.user_company_id}
          employeeName={selectedEmployee.user_name}
          onClose={() => setIsFaceEnrollmentModalOpen(false)}
          onError={onError}
          onCompleted={async () => {
            setIsSaving(true);
            onError('');
            try {
              const response = await runWithMinimumDuration(
                humanResourcesApi.getFaceEnrollment(selectedEmployee.user_company_id),
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
      ) : null}
    </>
  );
}

function AccessProfileDialog({
  copy,
  isOpen,
  isSaving,
  assignments,
  form,
  accessProfileId,
  currentPin,
  hasExistingPin,
  shouldRegeneratePin,
  title,
  onClose,
  onChange,
  onEmployeeChange,
  onRegeneratePin,
  onCancelRegeneratePin,
  onPinRefreshed,
  onSave,
}: {
  copy: AttendanceControlCopy;
  isOpen: boolean;
  isSaving: boolean;
  assignments: AttendanceControlAssignment[];
  form: AttendanceAccessProfilePayload;
  accessProfileId?: number | null;
  currentPin?: string | null;
  hasExistingPin: boolean;
  shouldRegeneratePin: boolean;
  title: string;
  onClose: () => void;
  onChange: (value: AttendanceAccessProfilePayload) => void;
  onEmployeeChange: (userCompanyId: number) => void;
  onRegeneratePin: () => void;
  onCancelRegeneratePin: () => void;
  onPinRefreshed?: () => Promise<void> | void;
  onSave: () => void;
}) {
  const [isPinVisible, setIsPinVisible] = useState(false);
  const [revealedPin, setRevealedPin] = useState<string | null>(null);
  const [isLoadingPin, setIsLoadingPin] = useState(false);
  const [isResetPinDialogOpen, setIsResetPinDialogOpen] = useState(false);
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [pinRevealMessage, setPinRevealMessage] = useState('');
  const visiblePin = revealedPin ?? currentPin ?? null;
  const canRevealPin = Boolean(visiblePin);
  const canAttemptPinReveal = Boolean(form.user_company_id);
  const canOpenResetPin = Boolean(form.user_company_id);
  const canResetPin = Boolean(accessProfileId && form.user_company_id);

  useEffect(() => {
    setIsPinVisible(false);
    setRevealedPin(null);
    setPinRevealMessage('');
    setIsResetPinDialogOpen(false);
  }, [currentPin, form.user_company_id, isOpen]);

  const loadVisiblePin = async (forceReset: boolean) => {
    const response = await humanResourcesApi.listAttendanceAccessMethods();
    const pinMethod = response.items.find((method) => (
      method.user_company_id === form.user_company_id && method.method_type === 'pin'
    ));

    let visiblePinCode = forceReset ? null : pinMethod?.pin_code ?? null;
    if (!visiblePinCode) {
      const generatedResponse = pinMethod
        ? await humanResourcesApi.updateAttendanceAccessMethod(pinMethod.id, {
            access_profile_id: pinMethod.access_profile_id,
            method_type: 'pin',
            regenerate_pin: true,
            status: 'active',
            priority: pinMethod.priority ?? 10,
            metadata: pinMethod.metadata ?? {},
          })
        : accessProfileId
          ? await humanResourcesApi.createAttendanceAccessMethod({
              access_profile_id: accessProfileId,
              method_type: 'pin',
              auto_generate_pin: true,
              status: 'active',
              priority: 10,
              metadata: {},
            })
          : null;
      visiblePinCode = generatedResponse?.access_method.pin_code ?? null;
    }

    if (visiblePinCode) {
      setRevealedPin(visiblePinCode);
      setIsPinVisible(true);
      void Promise.resolve(onPinRefreshed?.()).catch(() => undefined);
    }

    return visiblePinCode;
  };

  const handlePinRevealToggle = async () => {
    if (isPinVisible) {
      setIsPinVisible(false);
      return;
    }

    setPinRevealMessage('');

    if (visiblePin) {
      setIsPinVisible(true);
      return;
    }

    if (!hasExistingPin && !accessProfileId) {
      onRegeneratePin();
      setPinRevealMessage(copy.labels.pinRevealUnavailable);
      return;
    }

    setIsLoadingPin(true);
    try {
      const visiblePinCode = await loadVisiblePin(false);
      if (!visiblePinCode) {
        setPinRevealMessage(copy.labels.pinRevealUnavailable);
      }
    } catch {
      setPinRevealMessage(copy.labels.pinRevealUnavailable);
    } finally {
      setIsLoadingPin(false);
    }
  };

  const handleResetPinConfirm = async () => {
    if (!canResetPin) {
      setIsResetPinDialogOpen(false);
      onRegeneratePin();
      setPinRevealMessage(copy.labels.pinResetPending);
      return;
    }

    setIsResettingPin(true);
    setPinRevealMessage('');
    try {
      const visiblePinCode = await loadVisiblePin(true);
      if (visiblePinCode) {
        setIsResetPinDialogOpen(false);
        setPinRevealMessage(copy.labels.pinResetSuccess);
      } else {
        setPinRevealMessage(copy.labels.pinRevealUnavailable);
      }
    } catch {
      setPinRevealMessage(copy.labels.pinRevealUnavailable);
    } finally {
      setIsResettingPin(false);
    }
  };

  const pinStatusDescription = !hasExistingPin
    ? accessProfileId
      ? copy.labels.pinStatusCreateNow
      : copy.labels.pinStatusCreateOnSave
    : canRevealPin
      ? copy.labels.pinStatusSaved
      : copy.labels.pinStatusLegacy;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        hideCloseButton
        className="max-h-[90vh] gap-0 overflow-hidden rounded-lg border border-[#59C3A5]/20 bg-white p-0 text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:max-w-[720px]"
        overlayClassName="bg-black/55"
      >
        <DialogHeader className="flex-row items-start justify-between gap-4 bg-[#59C3A5] px-6 py-5 text-left">
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
              value={form.user_company_id || ''}
              onChange={(event) => onEmployeeChange(Number(event.target.value))}
              className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              <option value="0">--</option>
              {assignments.map((assignment) => (
                <option key={assignment.user_company_id} value={assignment.user_company_id}>
                  {assignment.user_name}
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
                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
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
                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              >
                {accessMethodOptions.map((value) => (
                  <option key={value} value={value}>
                    {copy.labels.authMethods[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{copy.labels.pinStatus}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{pinStatusDescription}</p>
              </div>
              {canOpenResetPin ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-md border-gray-300 bg-white text-[#59C3A5] hover:bg-[#59C3A5] hover:text-white dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  onClick={() => setIsResetPinDialogOpen(true)}
                  disabled={isSaving || isLoadingPin || isResettingPin || shouldRegeneratePin || !canOpenResetPin}
                >
                  <RotateCcw className="h-4 w-4" />
                  {copy.labels.resetPin}
                </Button>
              ) : null}
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="rounded-md border border-gray-200 bg-white px-4 py-3 font-mono text-lg font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                {canRevealPin && isPinVisible ? visiblePin : '*****'}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handlePinRevealToggle()}
                disabled={isSaving || isLoadingPin || !canAttemptPinReveal}
                className="rounded-md border-[#59C3A5]/25 bg-white text-[#59C3A5] hover:border-[#59C3A5]/45 hover:bg-[#59C3A5]/10 hover:text-[#59C3A5] disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 dark:border-[#8FE0CA]/25 dark:bg-gray-950 dark:text-[#8FE0CA] dark:hover:bg-[#59C3A5]/30"
              >
                {isPinVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {isPinVisible ? copy.labels.hidePin : isLoadingPin ? copy.loading : copy.labels.revealPin}
              </Button>
            </div>
            {pinRevealMessage ? (
              <p className={`mt-2 text-xs font-medium ${pinRevealMessage === copy.labels.pinResetSuccess ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>{pinRevealMessage}</p>
            ) : null}

            {shouldRegeneratePin ? (
              <div className="mt-3 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
                <span>{copy.labels.pinResetPending}</span>
                <Button type="button" variant="ghost" size="sm" onClick={onCancelRegeneratePin} disabled={isSaving}>
                  {copy.labels.cancel}
                </Button>
              </div>
            ) : null}
          </div>
          </div>
        </div>

        <DialogFooter className="border-t border-white/10 bg-[#59C3A5] px-6 py-4">
          <Button
            variant="outline"
            className="rounded-md border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            {copy.labels.cancel}
          </Button>
          <Button
            className="rounded-md bg-white text-[#59C3A5] hover:bg-blue-50"
            onClick={onSave}
            disabled={isSaving || !form.user_company_id}
          >
            {copy.labels.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={isResetPinDialogOpen} onOpenChange={setIsResetPinDialogOpen}>
      <DialogContent
        hideCloseButton
        className="gap-0 overflow-hidden rounded-lg border border-[#59C3A5]/20 bg-white p-0 text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:max-w-[480px]"
        overlayClassName="bg-black/55"
      >
        <DialogHeader className="flex-row items-start justify-between gap-4 bg-[#59C3A5] px-6 py-5 text-left">
          <div className="min-w-0">
            <DialogTitle className="text-lg font-semibold leading-7 text-white">{copy.labels.resetPinTitle}</DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-blue-100">
              {copy.labels.resetPinSubtitle}
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={() => setIsResetPinDialogOpen(false)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/85 transition hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
            aria-label={copy.labels.closeModal}
            disabled={isResettingPin}
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        <div className="px-6 py-5">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="font-semibold">{copy.labels.resetPinWarningTitle}</p>
            <p className="mt-1 leading-5">{copy.labels.resetPinWarningDescription}</p>
          </div>
          <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
            {copy.labels.resetPinDescription}
          </p>
        </div>

        <DialogFooter className="border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <Button
            variant="outline"
            className="rounded-md border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            onClick={() => setIsResetPinDialogOpen(false)}
            disabled={isResettingPin}
          >
            {copy.labels.cancel}
          </Button>
          <Button
            className="rounded-md bg-[#59C3A5] text-white hover:bg-[#3AAE90]"
            onClick={() => void handleResetPinConfirm()}
            disabled={isResettingPin || !canOpenResetPin}
          >
            <RotateCcw className="h-4 w-4" />
            {isResettingPin ? copy.loading : copy.labels.resetPinConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
