import { useEffect, useMemo, useState } from 'react';
import type { LiveFaceChallengeCapture } from '../components/LiveFaceChallenge';
import type {
  AttendanceMediaPresignResponse,
  FaceCapturePresignResponse,
  FaceVerificationResultResponse,
  FaceVerificationSessionResponse,
  PublicKioskBootstrapResponse,
  PublicKioskPunchResponse,
} from '../api/humanResources';
import {
  multiKioskPublicApi,
  type MultiKioskChildWorkspace,
} from '../api/multiKiosks';
import { PublicKioskIdentityPanel } from '../BasicModules/HumanResources/Control/components/kiosk/PublicKioskIdentityPanel';
import { usePublicKioskViewModel } from '../BasicModules/HumanResources/Control/components/kiosk/hooks/usePublicKioskViewModel';
import type {
  EvidenceMode,
  FaceStatus,
  KioskLocationState,
  PublicKioskBusyState,
} from '../BasicModules/HumanResources/Control/components/kiosk/publicKioskTypes';
import {
  getKioskTranslations,
  resolveKioskLocale,
} from '../BasicModules/HumanResources/Control/components/kiosk/translations';
import { localDateTimeString } from '../BasicModules/HumanResources/Control/components/kiosk/utils/publicKioskUtils';
import {
  type KioskPresignedUpload,
  uploadPresignedKioskFile,
} from './multiKioskWorkspaceUploads';
import { useMultiKioskAttendancePhotoCapture } from './useMultiKioskAttendancePhotoCapture';

const capabilities = {
  photoPresign: 'attendance.photo.presign@1',
  faceBegin: 'attendance.face.verification.begin@1',
  faceCapturePresign: 'attendance.face.verification.capture.presign@1',
  faceComplete: 'attendance.face.verification.complete@1',
  punchCreate: 'attendance.punch.create@1',
} as const;

interface AttendanceMultiKioskWorkspaceProps {
  token: string;
  kioskId: number;
  workspace: MultiKioskChildWorkspace;
  locale: string;
  onAuthorizationFailure: (error: unknown) => boolean;
  onRefresh: () => Promise<void>;
}

function safeError(error: unknown, fallback: string) {
  if (!(error instanceof Error) || !error.message.trim()) return fallback;
  return /internal server|status\s*500|unexpected server|kiosk unavailable/i.test(error.message)
    ? fallback
    : error.message;
}

function csrfFor(token: string) {
  try {
    return sessionStorage.getItem(`indice.multi-kiosk.${token}.csrf`) ?? '';
  } catch {
    return '';
  }
}

export function AttendanceMultiKioskWorkspace({
  token,
  kioskId,
  workspace,
  locale,
  onAuthorizationFailure,
  onRefresh,
}: AttendanceMultiKioskWorkspaceProps) {
  const selectedLocale = resolveKioskLocale(locale);
  const copy = getKioskTranslations(selectedLocale);
  const bootstrap = workspace.bootstrap;
  const fallbackPhotoUpload = useMultiKioskAttendancePhotoCapture();
  const [todayActivity, setTodayActivity] = useState(bootstrap?.today_activity ?? null);
  const [locationState, setLocationState] = useState<KioskLocationState | null>(null);
  const [evidenceMode, setEvidenceMode] = useState<EvidenceMode>('photo');
  const [faceVerificationSessionId, setFaceVerificationSessionId] = useState<number | null>(null);
  const [faceStatus, setFaceStatus] = useState<FaceStatus>('idle');
  const [faceErrorMessage, setFaceErrorMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [busyState, setBusyState] = useState<PublicKioskBusyState>('idle');

  useEffect(() => {
    setTodayActivity(bootstrap?.today_activity ?? null);
  }, [bootstrap?.today_activity]);

  useEffect(() => {
    setLocationState(null);
    setEvidenceMode('photo');
    setFaceVerificationSessionId(null);
    setFaceStatus('idle');
    setFaceErrorMessage('');
    setErrorMessage('');
    setSuccessMessage('');
    fallbackPhotoUpload.clearPhoto();
  // The child session identifies the authorized employee workspace boundary.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace.session.id]);

  const attendanceBootstrap = useMemo<PublicKioskBootstrapResponse>(() => ({
    kiosk_device: bootstrap?.kiosk_device ?? {
      id: workspace.kiosk.id,
      code: '',
      name: workspace.kiosk.name,
    },
    kiosk_type: bootstrap?.kiosk_type,
    location: bootstrap?.location,
    scope_label: bootstrap?.scope_label,
    auth_methods: ['pin'],
    inactivity_timeout_seconds: bootstrap?.inactivity_timeout_seconds ?? 180,
  }), [bootstrap, workspace.kiosk.id, workspace.kiosk.name]);

  const employee = bootstrap?.user ?? null;
  const granted = workspace.session.capabilities;
  const hasCapability = (capability: string) => granted.includes(capability);
  const canUseFace = hasCapability(capabilities.faceBegin)
    && hasCapability(capabilities.faceCapturePresign)
    && hasCapability(capabilities.faceComplete);
  const canCreatePunch = hasCapability(capabilities.punchCreate);
  const hasIdentityEvidence = evidenceMode === 'face'
    ? faceVerificationSessionId !== null
    : fallbackPhotoUpload.photo !== null;

  const viewModel = usePublicKioskViewModel({
    bootstrap: attendanceBootstrap,
    busyState,
    copy,
    credentialValue: '',
    currentTime: new Date(),
    evidenceMode,
    faceVerificationSessionId,
    hasFallbackPhoto: fallbackPhotoUpload.photo !== null,
    identificationToken: workspace.session.id,
    identifiedHrUser: employee,
    isLoading: busyState !== 'idle',
    locationState,
    selectedLocale,
    todayActivity,
  });

  const action = async <T,>(capability: string, payload: Record<string, unknown>) => {
    try {
      return await multiKioskPublicApi.action<T>(token, kioskId, capability, payload, csrfFor(token));
    } catch (error) {
      onAuthorizationFailure(error);
      throw error;
    }
  };

  const resetEvidence = () => {
    setLocationState(null);
    setEvidenceMode('photo');
    setFaceVerificationSessionId(null);
    setFaceStatus('idle');
    setFaceErrorMessage('');
    setErrorMessage('');
    fallbackPhotoUpload.clearPhoto();
  };

  const handleEvidenceModeChange = (mode: EvidenceMode) => {
    if (mode === 'face' && !canUseFace) {
      setErrorMessage(copy.faceFailed);
      return;
    }
    setEvidenceMode(mode);
    setFaceVerificationSessionId(null);
    setFaceStatus('idle');
    setFaceErrorMessage('');
    setErrorMessage('');
    setSuccessMessage('');
    fallbackPhotoUpload.clearPhoto();
  };

  const handleFaceRestart = () => {
    setFaceVerificationSessionId(null);
    setFaceStatus('idle');
    setFaceErrorMessage('');
    setErrorMessage('');
  };

  const handleFaceVerification = async (captures: LiveFaceChallengeCapture[]) => {
    if (!canUseFace) {
      setErrorMessage(copy.faceFailed);
      throw new Error(copy.faceFailed);
    }
    setBusyState('verifyingFace');
    setErrorMessage('');
    setSuccessMessage('');
    setFaceErrorMessage('');
    try {
      const verification = await action<FaceVerificationSessionResponse>(capabilities.faceBegin, {});
      for (const capture of captures) {
        const upload = await action<FaceCapturePresignResponse>(capabilities.faceCapturePresign, {
          resource_id: verification.session_id,
          step: capture.step,
          content_type: capture.photo.contentType,
        });
        await uploadPresignedKioskFile(upload, capture.photo.file, capture.photo.contentType);
      }
      const result = await action<FaceVerificationResultResponse>(capabilities.faceComplete, {
        resource_id: verification.session_id,
      });
      if (!result.matched || !result.liveness_passed) {
        throw new Error(result.failure_reason || copy.faceFailed);
      }
      setFaceVerificationSessionId(verification.session_id);
      setFaceStatus('verified');
      fallbackPhotoUpload.clearPhoto();
      setSuccessMessage(copy.faceVerified);
    } catch (error) {
      const message = safeError(error, copy.faceFailed);
      setFaceVerificationSessionId(null);
      setFaceStatus('failed');
      setFaceErrorMessage(message);
      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setBusyState('idle');
    }
  };

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setErrorMessage(copy.errors.noGeolocation);
      return null;
    }
    setBusyState('locating');
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12_000,
          maximumAge: 0,
        });
      });
      const nextLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setLocationState(nextLocation);
      return nextLocation;
    } catch (error) {
      const denied = (error as Partial<GeolocationPositionError>).code === 1;
      setErrorMessage(denied ? copy.errors.allowGeolocation : copy.errors.locationUnavailable);
      setLocationState(null);
      return null;
    } finally {
      setBusyState('idle');
    }
  };

  const uploadFallbackPhoto = async (
    eventType: 'check_in' | 'check_out',
    eventTimestamp: string,
  ) => {
    const photo = fallbackPhotoUpload.photo;
    if (!photo || !hasCapability(capabilities.photoPresign)) {
      throw new Error(copy.errors.evidenceRequired);
    }
    const upload = await action<AttendanceMediaPresignResponse>(capabilities.photoPresign, {
      event_type: eventType,
      event_timestamp: eventTimestamp,
      content_type: photo.contentType,
    });
    await uploadPresignedKioskFile(upload as KioskPresignedUpload, photo.file, photo.contentType);
    return upload.object_key;
  };

  const handlePunch = async (eventType: 'check_in' | 'check_out') => {
    if (!canCreatePunch || !hasIdentityEvidence) {
      setErrorMessage(copy.errors.evidenceRequired);
      return;
    }
    if (!locationState) {
      setErrorMessage(copy.errors.locationRequired);
      return;
    }
    setBusyState('recording');
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const eventTimestamp = localDateTimeString(new Date());
      const fallbackPhotoObjectKey = evidenceMode === 'photo'
        ? await uploadFallbackPhoto(eventType, eventTimestamp)
        : null;
      const result = await action<PublicKioskPunchResponse>(capabilities.punchCreate, {
        event_type: eventType,
        event_timestamp: eventTimestamp,
        latitude: locationState.latitude,
        longitude: locationState.longitude,
        face_verification_session_id: evidenceMode === 'face'
          ? faceVerificationSessionId ?? undefined
          : undefined,
        photo_url: fallbackPhotoObjectKey ?? undefined,
        metadata: {
          identity_evidence: evidenceMode === 'face' ? 'face_verified' : 'photo_fallback',
          evidence_mode: evidenceMode,
          location_optional: false,
          location_forced: true,
          gps_captured: true,
          photo_storage: evidenceMode === 'photo' ? 'object_storage' : undefined,
        },
      });
      setTodayActivity(result.today_activity ?? todayActivity);
      setSuccessMessage(eventType === 'check_in' ? copy.success.checkIn : copy.success.checkOut);
      setLocationState(null);
      setFaceVerificationSessionId(null);
      setFaceStatus('idle');
      setFaceErrorMessage('');
      fallbackPhotoUpload.clearPhoto();
      try {
        await onRefresh();
      } catch (error) {
        if (onAuthorizationFailure(error)) return;
        // The successful punch remains authoritative; the next workspace load reconciles the view.
      }
    } catch (error) {
      setErrorMessage(safeError(error, copy.invalidDevice));
    } finally {
      setBusyState('idle');
    }
  };

  if (!employee) {
    return (
      <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-medium text-amber-900">
        {copy.invalidDevice}
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {successMessage ? (
        <p aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {successMessage}
        </p>
      ) : null}
      <PublicKioskIdentityPanel
        activeActivityLocation={viewModel.activeActivityLocation}
        activityStateLabel={viewModel.activityStateLabel}
        activeTodayActivity={viewModel.activeTodayActivity}
        busyState={busyState}
        canCheckIn={viewModel.canCheckIn && canCreatePunch}
        canCheckOut={viewModel.canCheckOut && canCreatePunch}
        copy={copy}
        credentialPlaceholder={copy.pinPlaceholder}
        credentialValue=""
        errorMessage={errorMessage}
        evidenceMode={evidenceMode}
        faceErrorMessage={faceErrorMessage}
        faceStatus={faceStatus}
        faceVerificationSessionId={faceVerificationSessionId}
        fallbackPhotoUpload={fallbackPhotoUpload}
        identificationToken={workspace.session.id}
        identifiedHrUser={employee}
        isLoading={busyState !== 'idle'}
        kioskLocationLabel={viewModel.kioskLocationLabel}
        kioskSteps={viewModel.kioskSteps}
        locationButtonLabel={viewModel.locationButtonLabel}
        locationState={locationState}
        nextActionLabel={viewModel.nextActionLabel}
        formatActivityDate={viewModel.formatActivityDate}
        formatActivityTime={viewModel.formatActivityTime}
        onCredentialChange={() => undefined}
        onEvidenceModeChange={handleEvidenceModeChange}
        onFaceError={(message) => {
          setFaceStatus('failed');
          setFaceErrorMessage(message);
          setErrorMessage(message);
        }}
        onFaceRestart={handleFaceRestart}
        onFaceVerification={handleFaceVerification}
        onIdentify={() => undefined}
        onPhotoError={setErrorMessage}
        onPunch={(eventType) => void handlePunch(eventType)}
        onRequestLocation={() => void requestLocation()}
        onReset={resetEvidence}
      />
    </div>
  );
}
