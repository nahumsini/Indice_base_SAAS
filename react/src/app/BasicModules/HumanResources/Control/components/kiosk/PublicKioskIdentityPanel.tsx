import {
  Check,
  LocateFixed,
  LogIn,
  LogOut,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { LiveFaceChallengeCapture } from '../../../../../components/LiveFaceChallenge';
import { KioskIdentityGate } from '../../../../../components/kiosk-engine/KioskIdentityGate';
import { Button } from '../../../../../components/ui/button';
import { deriveInitials, type KioskStepItem } from './PublicKioskComponents';
import { PublicKioskActivityCard } from './PublicKioskActivityCard';
import { PublicKioskVerificationSection } from './PublicKioskVerificationSection';
import type { KioskTranslations } from './translations';
import type {
  EvidenceMode,
  FaceStatus,
  FallbackPhotoUploadState,
  KioskHrUser,
  KioskLocationState,
  KioskTodayActivity,
} from './publicKioskTypes';

interface PublicKioskIdentityPanelProps {
  activeActivityLocation?: { name: string } | null;
  activityStateLabel: string;
  activeTodayActivity: KioskTodayActivity | null;
  busyState: 'idle' | 'identifying' | 'recording' | 'locating' | 'verifyingFace';
  canCheckIn: boolean;
  canCheckOut: boolean;
  copy: KioskTranslations;
  credentialPlaceholder: string;
  credentialValue: string;
  errorMessage: string;
  evidenceMode: EvidenceMode;
  faceErrorMessage: string;
  faceStatus: FaceStatus;
  faceVerificationSessionId: number | null;
  fallbackPhotoUpload: FallbackPhotoUploadState;
  identificationToken: string;
  identifiedHrUser: KioskHrUser | null;
  isLoading: boolean;
  kioskLocationLabel: string;
  kioskSteps: KioskStepItem[];
  locationButtonLabel: string;
  locationState: KioskLocationState | null;
  nextActionLabel: string;
  formatActivityDate: (dateValue: string) => string;
  formatActivityTime: (dateTimeValue?: string | null) => string;
  onCredentialChange: (nextValue: string) => void;
  onEvidenceModeChange: (mode: EvidenceMode) => void;
  onFaceError: (message: string) => void;
  onFaceRestart: () => void;
  onFaceVerification: (captures: LiveFaceChallengeCapture[]) => Promise<void>;
  onIdentify: () => void;
  onPhotoError: (message: string) => void;
  onPunch: (eventType: 'check_in' | 'check_out') => void;
  onRequestLocation: () => void;
  onReset: () => void;
}

export function PublicKioskIdentityPanel({
  activeActivityLocation,
  activityStateLabel,
  activeTodayActivity,
  busyState,
  canCheckIn,
  canCheckOut,
  copy,
  credentialPlaceholder,
  credentialValue,
  errorMessage,
  evidenceMode,
  faceErrorMessage,
  faceStatus,
  faceVerificationSessionId,
  fallbackPhotoUpload,
  identificationToken,
  identifiedHrUser,
  isLoading,
  kioskLocationLabel,
  kioskSteps,
  locationButtonLabel,
  locationState,
  nextActionLabel,
  formatActivityDate,
  formatActivityTime,
  onCredentialChange,
  onEvidenceModeChange,
  onFaceError,
  onFaceRestart,
  onFaceVerification,
  onIdentify,
  onPhotoError,
  onPunch,
  onRequestLocation,
  onReset,
}: PublicKioskIdentityPanelProps) {
  const hasIdentityEvidence = evidenceMode === 'face'
    ? faceVerificationSessionId !== null
    : fallbackPhotoUpload.photo !== null;
  const [verificationExpanded, setVerificationExpanded] = useState(true);

  useEffect(() => {
    setVerificationExpanded(true);
  }, [identifiedHrUser?.id]);

  useEffect(() => {
    if (hasIdentityEvidence) {
      setVerificationExpanded(false);
    }
  }, [hasIdentityEvidence]);

  if (!identifiedHrUser) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {errorMessage ? (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/50 dark:text-rose-200">
            {errorMessage}
          </div>
        ) : null}
        <KioskIdentityGate
          backspaceLabel={copy.backspaceLabel}
          clearLabel={copy.clearPinLabel}
          description={copy.identifyDescription}
          disabled={busyState !== 'idle' || isLoading}
          isSubmitting={busyState === 'identifying'}
          onPinChange={onCredentialChange}
          onSubmit={onIdentify}
          pinAriaLabel={credentialPlaceholder}
          pinLength={5}
          pinValue={credentialValue}
          privacyMessage={copy.identityPrivacy}
          submitClassName="!bg-[#177D66] !text-white hover:!bg-[#126553]"
          submitLabel={copy.identify}
          title={copy.identifyTitle}
          tone="aqua"
        />
      </div>
    );
  }

  const identityDetail = identifiedHrUser.position_title
    || identifiedHrUser.department
    || identifiedHrUser.user_code
    || copy.pointReady;
  const completedShift = Boolean(activeTodayActivity?.has_check_in && activeTodayActivity?.has_check_out);
  const nextPunchType = completedShift
    ? null
    : activeTodayActivity?.has_check_in
      ? 'check_out'
      : 'check_in';
  const nextPunchEnabled = nextPunchType === 'check_in' ? canCheckIn : canCheckOut;
  const verificationLabel = evidenceMode === 'photo' ? copy.photoCaptured : copy.faceVerified;

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-transparent p-0 dark:bg-transparent">
      {errorMessage ? (
        <div role="alert" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/50 dark:text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      <div className="space-y-3 pb-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_34px_-32px_rgba(15,23,42,0.8)] dark:border-slate-800 dark:bg-slate-950">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#59C3A5]/14 text-base font-medium text-[#177D66] dark:bg-[#8FE0CA]/12 dark:text-[#8FE0CA]">
              {deriveInitials(identifiedHrUser.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium text-[#177D66] dark:text-[#8FE0CA]">
                {copy.identifiedTitle}
              </p>
              <h2 className="mt-1 line-clamp-2 text-lg font-medium leading-tight tracking-tight text-slate-950 dark:text-white">
                {identifiedHrUser.full_name}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{identityDetail}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              aria-label={copy.reset}
              className="h-10 shrink-0 gap-2 rounded-xl border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:border-[#177D66]/30 hover:text-[#177D66] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
              onClick={onReset}
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              <span className="hidden min-[390px]:inline">{copy.reset}</span>
            </Button>
          </div>
          <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-[#177D66] dark:text-[#8FE0CA]" />
            <span className="truncate">{kioskLocationLabel}</span>
          </div>
        </section>

        <KioskProgressRail nextActionLabel={nextActionLabel} stepLabel={copy.stepLabel} steps={kioskSteps} />

        {!hasIdentityEvidence || verificationExpanded ? (
          <PublicKioskVerificationSection
            copy={copy}
            evidenceMode={evidenceMode}
            faceErrorMessage={faceErrorMessage}
            faceStatus={faceStatus}
            faceVerificationSessionId={faceVerificationSessionId}
            fallbackPhotoUpload={fallbackPhotoUpload}
            identificationToken={identificationToken}
            identifiedHrUser={identifiedHrUser}
            onEvidenceModeChange={onEvidenceModeChange}
            onFaceError={onFaceError}
            onFaceRestart={onFaceRestart}
            onFaceVerification={onFaceVerification}
            onPhotoError={onPhotoError}
          />
        ) : (
          <section className="flex items-center gap-3 rounded-xl border border-[#59C3A5]/30 bg-white p-3 shadow-sm dark:border-[#8FE0CA]/25 dark:bg-slate-950">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#59C3A5]/12 text-[#177D66] dark:bg-[#8FE0CA]/10 dark:text-[#8FE0CA]">
              <Check aria-hidden="true" className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium text-[#177D66] dark:text-[#8FE0CA]">{copy.steps.identity}</p>
              <p className="mt-0.5 truncate text-sm font-medium text-slate-950 dark:text-white">{verificationLabel}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-10 shrink-0 rounded-lg px-3 text-xs font-medium text-[#177D66] hover:bg-[#59C3A5]/10 dark:text-[#8FE0CA]"
              onClick={() => {
                if (evidenceMode === 'face') {
                  onFaceRestart();
                }
                setVerificationExpanded(true);
              }}
            >
              {evidenceMode === 'photo' ? copy.retakePhoto : copy.retry}
            </Button>
          </section>
        )}

        {hasIdentityEvidence ? (
          <section className={`rounded-2xl border bg-white p-4 shadow-[0_14px_34px_-32px_rgba(15,23,42,0.8)] dark:bg-slate-950 ${locationState ? 'border-[#59C3A5]/30 dark:border-[#8FE0CA]/25' : 'border-slate-200 dark:border-slate-800'}`}>
            <div className="flex min-w-0 items-start gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${locationState ? 'bg-[#59C3A5]/12 text-[#177D66] dark:bg-[#8FE0CA]/10 dark:text-[#8FE0CA]' : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400'}`}>
                {locationState ? <Check aria-hidden="true" className="h-5 w-5" /> : <MapPin aria-hidden="true" className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium text-[#177D66] dark:text-[#8FE0CA]">{copy.stepLabel} 3</p>
                <h2 className="mt-1 text-lg font-medium tracking-tight text-slate-950 dark:text-white">{copy.steps.location}</h2>
                <p className="mt-1 text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
                  {locationState ? copy.locationReady : copy.locationRequiredHint}
                </p>
              </div>
            </div>
            {locationState ? (
              <Button
                type="button"
                variant="ghost"
                className="mt-3 h-10 w-full gap-2 rounded-xl border border-slate-200 text-sm font-medium text-[#177D66] hover:bg-[#59C3A5]/8 dark:border-slate-700 dark:text-[#8FE0CA]"
                disabled={busyState !== 'idle'}
                onClick={onRequestLocation}
              >
                <LocateFixed aria-hidden="true" className="h-4 w-4" />
                {copy.refreshLocation}
              </Button>
            ) : (
              <Button
                type="button"
                className="mt-4 h-12 w-full gap-2 rounded-xl bg-[#177D66] text-sm font-medium text-white shadow-sm hover:bg-[#126553]"
                disabled={busyState !== 'idle'}
                onClick={onRequestLocation}
              >
                <LocateFixed aria-hidden="true" className="h-4 w-4" />
                {locationButtonLabel}
              </Button>
            )}
          </section>
        ) : null}

        {hasIdentityEvidence && locationState && activeTodayActivity ? (
          <PublicKioskActivityCard
            activeActivityLocation={activeActivityLocation}
            activityStateLabel={activityStateLabel}
            copy={copy}
            todayActivity={activeTodayActivity}
            formatActivityDate={formatActivityDate}
            formatActivityTime={formatActivityTime}
          />
        ) : null}

        <footer className="px-4 py-3 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">
          Powered by{' '}
          <a
            className="font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-[#177D66] dark:text-slate-400 dark:decoration-slate-700 dark:hover:text-[#8FE0CA]"
            href="https://www.indiceapp.com"
            rel="noreferrer"
            target="_blank"
          >
            www.indiceapp.com
          </a>
        </footer>

        {hasIdentityEvidence && locationState && nextPunchType ? (
          <div className="sticky bottom-0 z-20 -mx-3 border-t border-slate-200 bg-white/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
            <Button
              type="button"
              disabled={!nextPunchEnabled}
              className="h-14 w-full gap-2 rounded-xl bg-[#177D66] text-base font-medium text-white shadow-[0_12px_24px_-16px_rgba(23,125,102,0.8)] hover:bg-[#126553] disabled:opacity-45"
              onClick={() => onPunch(nextPunchType)}
            >
              {nextPunchType === 'check_in'
                ? <LogIn aria-hidden="true" className="h-5 w-5" />
                : <LogOut aria-hidden="true" className="h-5 w-5" />}
              {nextPunchType === 'check_in' ? copy.checkIn : copy.checkOut}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function KioskProgressRail({
  nextActionLabel,
  stepLabel,
  steps,
}: {
  nextActionLabel: string;
  stepLabel: string;
  steps: KioskStepItem[];
}) {
  const activeStepIndex = steps.findIndex((step) => step.state === 'active');
  const lastCompletedStepIndex = steps.reduce(
    (lastIndex, step, index) => step.state === 'done' ? index : lastIndex,
    0,
  );
  const currentStepIndex = activeStepIndex >= 0
    ? activeStepIndex
    : lastCompletedStepIndex;

  return (
    <section
      aria-label={`${stepLabel} ${currentStepIndex + 1}: ${steps[currentStepIndex]?.label ?? ''}`}
      aria-valuemax={steps.length}
      aria-valuemin={1}
      aria-valuenow={currentStepIndex + 1}
      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950"
      role="progressbar"
    >
      <div className="relative">
        <div aria-hidden="true" className="absolute left-[12.5%] right-[12.5%] top-4 h-px bg-slate-200 dark:bg-slate-700" />
        <div className="relative grid grid-cols-4 gap-2">
          {steps.map((step, index) => (
            <div className="flex justify-center" key={step.label}>
              <span
                aria-label={`${stepLabel} ${index + 1}: ${step.label}`}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium shadow-[0_0_0_4px_white] dark:shadow-[0_0_0_4px_#020617] ${step.state === 'done' ? 'bg-[#177D66] text-white' : step.state === 'active' ? 'border-2 border-[#177D66] bg-white text-[#177D66] dark:bg-slate-950 dark:text-[#8FE0CA]' : 'border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500'}`}
              >
                {step.state === 'done' ? <Check aria-hidden="true" className="h-4 w-4" /> : index + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 text-center">
        <p className="text-[10px] font-medium text-[#177D66] dark:text-[#8FE0CA]">
          {stepLabel} {currentStepIndex + 1} · {steps[currentStepIndex]?.label}
        </p>
        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">{nextActionLabel}</p>
      </div>
    </section>
  );
}
