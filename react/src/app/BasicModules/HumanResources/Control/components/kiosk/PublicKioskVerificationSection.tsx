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
    <div className="rounded-lg border border-[#59C3A5]/20 bg-white p-3 shadow-sm dark:border-[#8FE0CA]/20 dark:bg-slate-950 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#59C3A5] dark:text-[#8FE0CA]">
            {copy.verificationMethod}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white sm:text-2xl">
            {evidenceMode === 'face' ? copy.face : copy.photoVerification}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {evidenceMode === 'face' ? copy.facePending : copy.photoHint}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900 lg:min-w-[22rem]">
          <button
            type="button"
            onClick={() => onEvidenceModeChange('face')}
            aria-label={copy.faceRecognition}
            className={`flex h-11 min-w-0 items-center justify-center gap-2 rounded-md text-xs font-semibold leading-tight transition sm:h-12 sm:text-sm ${
              evidenceMode === 'face'
                ? 'bg-[#59C3A5] text-white shadow-sm'
                : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-950'
            }`}
          >
            <ScanFace className="h-4 w-4 shrink-0" />
            <span className="truncate">{copy.faceRecognition}</span>
          </button>
          <button
            type="button"
            onClick={() => onEvidenceModeChange('photo')}
            aria-label={copy.photoVerification}
            className={`flex h-11 min-w-0 items-center justify-center gap-2 rounded-md text-xs font-semibold leading-tight transition sm:h-12 sm:text-sm ${
              evidenceMode === 'photo'
                ? 'bg-[#59C3A5] text-white shadow-sm'
                : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-950'
            }`}
          >
            <Camera className="h-4 w-4 shrink-0" />
            <span className="truncate">{copy.photoVerification}</span>
          </button>
        </div>
      </div>

      <div className="mt-5">
        {evidenceMode === 'face' ? (
          <div>
            {faceVerificationSessionId ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                {copy.faceVerified}
              </div>
            ) : (
              <LiveFaceChallenge
                title={copy.face}
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
            showGalleryUpload={false}
            showEmptyPreview
            emptyPreviewLabel={copy.photoHint}
            className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 shadow-none dark:border-slate-700 dark:bg-slate-900/70 sm:p-4"
            videoClassName="h-[min(38vh,24rem)] min-h-[12rem] w-full object-cover sm:h-[min(46vh,30rem)] sm:min-h-[18rem]"
            photoClassName="mb-3 h-[min(38vh,24rem)] min-h-[12rem] w-full rounded-lg object-cover shadow-sm sm:mb-4 sm:h-[min(46vh,30rem)] sm:min-h-[18rem]"
            emptyPreviewClassName="mb-3 flex h-[min(38vh,24rem)] min-h-[12rem] w-full flex-col items-center justify-center rounded-lg border border-dashed border-[#59C3A5]/25 bg-white text-center text-slate-500 dark:border-[#8FE0CA]/25 dark:bg-slate-950 dark:text-slate-400 sm:mb-4 sm:h-[min(46vh,30rem)] sm:min-h-[18rem]"
            actionClassName="mb-3 grid grid-cols-1 gap-3 sm:mb-4"
            primaryButtonClassName="h-11 rounded-lg bg-[#59C3A5] text-white hover:bg-[#3AAE90] sm:h-12"
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
    </div>
  );
}
