import {
  ArrowRight,
  Camera,
  CheckCircle2,
  KeyRound,
  LocateFixed,
  MapPin,
  RefreshCw,
  ScanFace,
} from 'lucide-react';
import type { LiveFaceChallengeCapture } from '../../../../../components/LiveFaceChallenge';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import {
  deriveInitials,
  KioskPinKeypad,
} from './PublicKioskComponents';
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
  PublicKioskMethod,
} from './publicKioskTypes';

interface PublicKioskIdentityPanelProps {
  activeActivityLocation?: { name: string } | null;
  activityStateLabel: string;
  activeTodayActivity: KioskTodayActivity | null;
  busyState: 'idle' | 'identifying' | 'recording' | 'locating' | 'verifyingFace';
  canCheckIn: boolean;
  canCheckOut: boolean;
  canIdentify: boolean;
  copy: KioskTranslations;
  credentialPlaceholder: string;
  credentialValue: string;
  errorMessage: string;
  evidenceMode: EvidenceMode;
  expiresAt: string;
  faceErrorMessage: string;
  faceStatus: FaceStatus;
  faceVerificationSessionId: number | null;
  fallbackPhotoUpload: FallbackPhotoUploadState;
  hasIdentityEvidence: boolean;
  identificationToken: string;
  identifiedHrUser: KioskHrUser | null;
  isLoading: boolean;
  kioskLocationLabel: string;
  locationButtonLabel: string;
  locationHelpText: string;
  locationState: KioskLocationState | null;
  nextActionLabel: string;
  selectedLocale: string;
  selectedMethod: PublicKioskMethod;
  verificationLocationLabel: string;
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
  canIdentify,
  copy,
  credentialPlaceholder,
  credentialValue,
  errorMessage,
  evidenceMode,
  expiresAt,
  faceErrorMessage,
  faceStatus,
  faceVerificationSessionId,
  fallbackPhotoUpload,
  hasIdentityEvidence,
  identificationToken,
  identifiedHrUser,
  isLoading,
  kioskLocationLabel,
  locationButtonLabel,
  locationHelpText,
  locationState,
  nextActionLabel,
  selectedLocale,
  selectedMethod,
  verificationLocationLabel,
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
  return (
    <section className="min-h-0 overflow-y-auto rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_-24px_rgba(89,195,165,0.45)] dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            {identifiedHrUser ? copy.identifiedTitle : copy.identifyTitle}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
            {identifiedHrUser ? identifiedHrUser.full_name : copy.waitingForPin}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {identifiedHrUser ? nextActionLabel : copy.identifyDescription}
          </p>
        </div>
        <Button type="button" variant="outline" className="h-11 rounded-2xl gap-2" onClick={onReset}>
          <RefreshCw className="h-4 w-4" />
          {copy.reset}
        </Button>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/50 dark:text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      {!identifiedHrUser ? (
        <div className="mt-7 rounded-[28px] border border-[#59C3A5]/20 bg-[#59C3A5]/6 p-4 shadow-[0_16px_40px_-30px_rgba(89,195,165,0.65)] dark:border-[#8FE0CA]/20 dark:bg-[#8FE0CA]/10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#59C3A5] dark:text-[#8FE0CA]">
                {copy.steps.pin}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {copy.methods[selectedMethod]}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#59C3A5] text-white shadow-sm dark:bg-[#8FE0CA] dark:text-slate-950">
              <KeyRound className="h-6 w-6" />
            </div>
          </div>

          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            {copy.credentialLabel}
          </label>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_12rem]">
            <Input
              type="password"
              value={credentialValue}
              onChange={(event) => onCredentialChange(event.target.value.replace(/\D/g, '').slice(0, 5))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onIdentify();
                }
              }}
              placeholder={credentialPlaceholder}
              inputMode="numeric"
              maxLength={5}
              autoFocus
              autoComplete="off"
              enterKeyHint="done"
              className="h-20 rounded-[24px] border-[#59C3A5]/25 bg-white text-center text-3xl font-semibold tracking-[0.42em] text-slate-950 shadow-inner outline-none placeholder:tracking-normal dark:border-[#8FE0CA]/25 dark:bg-slate-950 dark:text-white sm:h-24 sm:text-4xl"
            />
            <Button
              type="button"
              disabled={!canIdentify}
              className="h-20 rounded-[24px] bg-[#59C3A5] px-6 text-base font-semibold text-white shadow-[0_14px_26px_-18px_rgba(89,195,165,0.8)] hover:bg-[#3AAE90] disabled:opacity-45 dark:bg-[#8FE0CA] dark:text-slate-950 dark:hover:bg-[#a9c7ff] sm:h-24"
              onClick={onIdentify}
            >
              <KeyRound className="h-5 w-5" />
              {copy.identify}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
          <div className="mt-4 max-w-xl">
            <KioskPinKeypad
              value={credentialValue}
              disabled={busyState !== 'idle' || isLoading}
              backspaceLabel={copy.backspaceLabel}
              onChange={onCredentialChange}
            />
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="rounded-[26px] border border-emerald-200 bg-emerald-50/85 p-4 dark:border-emerald-800/50 dark:bg-emerald-950/35">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#59C3A5] text-xl font-semibold text-white shadow-sm dark:bg-[#8FE0CA] dark:text-slate-950">
                  {deriveInitials(identifiedHrUser.full_name)}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
                    {copy.identifiedTitle}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{identifiedHrUser.full_name}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {identifiedHrUser.user_code || identifiedHrUser.position_title || identifiedHrUser.department || '—'}
                  </p>
                </div>
              </div>
              {expiresAt ? (
                <div className="rounded-2xl border border-emerald-200 bg-white/80 px-4 py-3 text-right text-xs text-slate-500 dark:border-emerald-800/50 dark:bg-slate-950/65 dark:text-slate-400">
                  <p className="font-semibold uppercase tracking-[0.18em]">{copy.nextAction}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                    {new Date(expiresAt).toLocaleTimeString(selectedLocale, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm dark:border-emerald-800/50 dark:bg-slate-950">
              <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
                {copy.identify}
              </div>
            </div>
            <div className={`rounded-2xl border px-4 py-3 text-sm ${hasIdentityEvidence ? 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-800/50 dark:bg-slate-950 dark:text-emerald-300' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`}>
              <div className="flex items-center gap-2 font-semibold">
                {evidenceMode === 'face' ? <ScanFace className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                {hasIdentityEvidence
                  ? evidenceMode === 'face' ? copy.faceVerified : copy.photoCaptured
                  : evidenceMode === 'face' ? copy.faceRecognition : copy.photoVerification}
              </div>
            </div>
            <div className={`rounded-2xl border px-4 py-3 text-sm ${locationState ? 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-800/50 dark:bg-slate-950 dark:text-emerald-300' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`}>
              <div className="flex items-center gap-2 font-semibold">
                <LocateFixed className="h-5 w-5" />
                {verificationLocationLabel}
              </div>
            </div>
          </div>

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

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{copy.location}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{kioskLocationLabel}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{locationHelpText}</p>
                </div>
              </div>
              <Button type="button" variant="outline" className="h-12 rounded-2xl gap-2 sm:min-w-[13rem]" onClick={onRequestLocation}>
                <LocateFixed className="h-4 w-4" />
                {locationButtonLabel}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Button
              type="button"
              disabled={!canCheckIn}
              className="h-16 rounded-[22px] bg-[#59C3A5] text-lg font-semibold text-white shadow-[0_14px_26px_-18px_rgba(89,195,165,0.8)] hover:bg-[#3AAE90] disabled:opacity-45"
              onClick={() => onPunch('check_in')}
            >
              {copy.checkIn}
            </Button>
            <Button
              type="button"
              disabled={!canCheckOut}
              className="h-16 rounded-[22px] bg-emerald-600 text-lg font-semibold text-white shadow-[0_14px_26px_-18px_rgba(5,150,105,0.8)] hover:bg-emerald-700 disabled:opacity-45"
              onClick={() => onPunch('check_out')}
            >
              {copy.checkOut}
            </Button>
          </div>

          {activeTodayActivity ? (
            <PublicKioskActivityCard
              activeActivityLocation={activeActivityLocation}
              activityStateLabel={activityStateLabel}
              copy={copy}
              todayActivity={activeTodayActivity}
              formatActivityDate={formatActivityDate}
              formatActivityTime={formatActivityTime}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
