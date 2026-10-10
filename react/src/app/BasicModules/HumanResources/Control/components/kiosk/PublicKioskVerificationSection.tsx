import {
  Camera,
  ScanFace,
} from 'lucide-react';
import { AttendancePhotoCaptureCard } from '../../../../../components/AttendancePhotoCaptureCard';
import { LiveFaceChallenge, type LiveFaceChallengeCapture } from '../../../../../components/LiveFaceChallenge';
import type { KioskTranslations } from './translations';
import type {
  EvidenceMode,
  FaceStatus,
  FallbackPhotoUploadState,
  KioskHrUser,
} from './publicKioskTypes';

interface PublicKioskVerificationSectionProps {
  personal?: boolean;
  canUseFace: boolean;
  copy: KioskTranslations;
  evidenceMode: EvidenceMode;
  faceErrorMessage: string;
  faceStatus: FaceStatus;
  faceVerificationSessionId: number | null;
  fallbackPhotoUpload: FallbackPhotoUploadState;
  identificationToken: string;
  identifiedHrUser: KioskHrUser;
  onEvidenceModeChange: (mode: EvidenceMode) => void;
  onFaceError: (message: string) => void;
  onFaceRestart: () => void;
  onFaceVerification: (captures: LiveFaceChallengeCapture[]) => Promise<void>;
  onPhotoError: (message: string) => void;
}

export function PublicKioskVerificationSection({
  personal = false,
  canUseFace,
  copy,
  evidenceMode,
  faceErrorMessage,
  faceStatus,
  faceVerificationSessionId,
  fallbackPhotoUpload,
  identificationToken,
  identifiedHrUser,
  onEvidenceModeChange,
  onFaceError,
  onFaceRestart,
  onFaceVerification,
  onPhotoError,
}: PublicKioskVerificationSectionProps) {
  return (
    <section className={`overflow-hidden border border-[#59C3A5]/30 bg-white shadow-[0_16px_40px_-34px_rgba(15,23,42,0.7)] dark:border-[#8FE0CA]/25 dark:bg-slate-950 ${personal ? 'rounded-[1.5rem]' : 'rounded-2xl'}`}>
      <div className="px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        {!personal ? <p className="text-[11px] font-medium text-[#177D66] dark:text-[#8FE0CA]">
          {copy.stepLabel} 2 · {copy.verificationMethod}
        </p> : null}
        <h2 className="mt-1.5 text-2xl font-medium tracking-tight text-slate-950 dark:text-white">
          {copy.steps.identity}
        </h2>
        <p className="mt-1 text-sm font-medium leading-5 text-slate-600 dark:text-slate-300">
          {evidenceMode === 'face' ? copy.facePending : copy.photoHint}
        </p>

        {!personal || canUseFace ? <nav
          aria-label={copy.verificationMethod}
          className={`mt-4 grid gap-1.5 rounded-xl border border-slate-200 bg-slate-100/80 p-1.5 dark:border-slate-700 dark:bg-slate-900 ${canUseFace ? 'grid-cols-2' : 'grid-cols-1'}`}
          role="tablist"
        >
          <button
            aria-selected={evidenceMode === 'photo'}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#177D66]/20 ${evidenceMode === 'photo' ? 'bg-[#177D66] text-white shadow-sm' : 'bg-white text-slate-600 hover:text-[#177D66] dark:bg-slate-950 dark:text-slate-300'}`}
            onClick={() => onEvidenceModeChange('photo')}
            role="tab"
            type="button"
          >
            <Camera aria-hidden="true" className="h-4 w-4" />
            {copy.photoVerification}
          </button>
          {canUseFace ? (
            <button
              aria-selected={evidenceMode === 'face'}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#177D66]/20 ${evidenceMode === 'face' ? 'bg-[#177D66] text-white shadow-sm' : 'bg-white text-slate-600 hover:text-[#177D66] dark:bg-slate-950 dark:text-slate-300'}`}
              onClick={() => onEvidenceModeChange('face')}
              role="tab"
              type="button"
            >
              <ScanFace aria-hidden="true" className="h-4 w-4" />
              {personal ? copy.faceRecognition : 'Face ID'}
            </button>
          ) : null}
        </nav> : null}
      </div>

      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        {evidenceMode === 'face' ? (
          <div>
            {faceVerificationSessionId ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                {copy.faceVerified}
              </div>
            ) : (
              <LiveFaceChallenge
                compact
                title="Face ID"
                helperText={copy.facePending}
                onSubmit={onFaceVerification}
                resetToken={`${identifiedHrUser.id}:${identificationToken}`}
                onRestart={onFaceRestart}
                onError={onFaceError}
                copy={copy.faceChallenge}
              />
            )}
            {faceStatus === 'failed' && !faceVerificationSessionId ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-medium text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  {faceErrorMessage || copy.faceFailed}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <AttendancePhotoCaptureCard
            title={copy.photoVerification}
            requiredText={copy.photoRequired}
            takePhotoLabel={copy.takePhoto}
            chooseFromGalleryLabel={copy.chooseFromGallery}
            retakePhotoLabel={copy.retakePhoto}
            captureLabel={copy.capturePhoto}
            cancelLabel={copy.cancelCamera}
            helperText={copy.photoHint}
            photo={fallbackPhotoUpload.photo}
            showHeader={false}
            showHelperText={!personal}
            showGalleryUpload={false}
            showEmptyPreview
            emptyPreviewLabel={personal ? '' : copy.photoHint}
            emptyPreviewIcon={personal ? <span aria-hidden="true" className="text-5xl" style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>📸</span> : undefined}
            className={personal ? 'flex flex-col gap-3' : 'rounded-xl border border-slate-200 bg-slate-50/65 p-3 shadow-none dark:border-slate-700 dark:bg-slate-900/70'}
            videoClassName="h-[min(42vh,18rem)] min-h-[13rem] w-full object-cover"
            photoClassName="mb-3 h-36 w-full rounded-xl object-cover shadow-sm"
            emptyPreviewClassName={personal ? 'order-first flex h-32 w-full items-center justify-center rounded-2xl border border-dashed border-[#59C3A5] bg-[#EFFAF6] dark:border-emerald-800 dark:bg-emerald-950/35' : 'mb-3 flex h-44 w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#59C3A5]/35 bg-white px-5 text-center text-slate-500 dark:border-[#8FE0CA]/25 dark:bg-slate-950 dark:text-slate-400'}
            actionClassName={personal ? 'grid grid-cols-1 gap-3' : 'mb-3 grid grid-cols-1 gap-3 sm:mb-4'}
            primaryButtonClassName="h-12 rounded-xl bg-[#177D66] text-white hover:bg-[#126553]"
            triggerButtonClassName={personal ? 'h-14 rounded-2xl !border-[#59C3A5] !bg-[#59C3A5] !text-[#222831] text-base hover:!bg-[#3AAE90]' : 'h-12 !border-[#177D66] !bg-[#177D66] !text-white hover:!bg-[#126553]'}
            onPhotoChange={fallbackPhotoUpload.setCapturedPhoto}
            onError={onPhotoError}
            errors={{
              cameraUnsupported: copy.errors.cameraUnsupported,
              cameraPermissionDenied: copy.errors.cameraPermissionDenied,
              cameraUnavailable: copy.errors.cameraUnavailable,
            }}
          />
        )}
      </div>
    </section>
  );
}
