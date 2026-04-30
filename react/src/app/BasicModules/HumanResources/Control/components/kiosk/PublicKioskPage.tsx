import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, Camera, CheckCircle2, KeyRound, LocateFixed, MapPin, RefreshCw, ScanFace } from 'lucide-react';
import { useParams } from 'react-router';
import { AttendancePhotoCaptureCard } from '../../../../../components/AttendancePhotoCaptureCard';
import { FailureToast } from '../../../../../components/FailureToast';
import { LiveFaceChallenge, type LiveFaceChallengeCapture } from '../../../../../components/LiveFaceChallenge';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../../../components/SuccessToast';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { useAttendancePhotoUpload } from '../../../../../hooks/useAttendancePhotoUpload';
import {
  humanResourcesApi,
  type PublicKioskBootstrapResponse,
  type PublicKioskDayActivity,
  type PublicKioskIdentifyResponse,
} from '../../../../../api/humanResources';
import { useLanguage } from '../../../../../shared/context';
import { useHRLanguage } from '../../../HRLanguage';

const padDatePart = (value: number) => `${value}`.padStart(2, '0');
const localDateString = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
const localDateTimeString = (date: Date) =>
  `${localDateString(date)}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`;
const KIOSK_MINIMUM_LOADING_MS = 2000;

function deriveInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '??';
  }

  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  return initials || '??';
}

type PublicKioskMethod = NonNullable<PublicKioskBootstrapResponse['auth_methods'][number]>;
type KioskLocationState = { latitude: number; longitude: number };
type FaceStatus = 'idle' | 'verified' | 'failed';
type EvidenceMode = 'face' | 'photo';

export default function Kiosk() {
  const { deviceToken } = useParams();
  const { currentLanguage } = useLanguage();
  const copy = useHRLanguage().publicKiosk;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [bootstrap, setBootstrap] = useState<PublicKioskBootstrapResponse | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PublicKioskMethod>('pin');
  const [credentialValue, setCredentialValue] = useState('');
  const [identifiedEmployee, setIdentifiedEmployee] = useState<PublicKioskIdentifyResponse['employee'] | null>(null);
  const [todayActivity, setTodayActivity] = useState<PublicKioskDayActivity | null>(null);
  const [identificationToken, setIdentificationToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [locationState, setLocationState] = useState<KioskLocationState | null>(null);
  const [evidenceMode, setEvidenceMode] = useState<EvidenceMode>('face');
  const [faceVerificationSessionId, setFaceVerificationSessionId] = useState<number | null>(null);
  const [faceStatus, setFaceStatus] = useState<FaceStatus>('idle');
  const [faceErrorMessage, setFaceErrorMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyState, setBusyState] = useState<'idle' | 'identifying' | 'recording' | 'locating' | 'verifyingFace'>('idle');
  const fallbackPhotoUpload = useAttendancePhotoUpload();
  const successTimeoutRef = useRef<number | null>(null);
  const failureTimeoutRef = useRef<number | null>(null);
  const resetTimeoutRef = useRef<number | null>(null);

  const resetFlow = (options?: { reason?: string; keepError?: boolean }) => {
    setCredentialValue('');
    setIdentifiedEmployee(null);
    setTodayActivity(null);
    setIdentificationToken('');
    setExpiresAt('');
    setLocationState(null);
    setEvidenceMode('face');
    setFaceVerificationSessionId(null);
    setFaceStatus('idle');
    setFaceErrorMessage('');
    fallbackPhotoUpload.clearPhoto();
    setBusyState('idle');
    if (failureTimeoutRef.current !== null) {
      window.clearTimeout(failureTimeoutRef.current);
      failureTimeoutRef.current = null;
    }
    setFailureToastMessage('');
    if (!options?.keepError) {
      setErrorMessage(options?.reason ?? '');
    } else if (options?.reason) {
      setErrorMessage(options.reason);
    }
  };

  const clearResetTimer = () => {
    if (resetTimeoutRef.current !== null) {
      window.clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
  };

  const scheduleAutoReset = (reason?: string) => {
    clearResetTimer();
    const timeoutMs = Math.max((bootstrap?.inactivity_timeout_seconds ?? 60) * 1000, 15000);
    resetTimeoutRef.current = window.setTimeout(() => {
      resetFlow({ reason });
      resetTimeoutRef.current = null;
    }, timeoutMs);
  };

  const showSuccessToast = (message: string) => {
    if (successTimeoutRef.current !== null) {
      window.clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    if (failureTimeoutRef.current !== null) {
      window.clearTimeout(failureTimeoutRef.current);
      failureTimeoutRef.current = null;
    }

    setErrorMessage('');
    setFailureToastMessage('');
    setSuccessMessage('');
    successTimeoutRef.current = window.setTimeout(() => {
      setSuccessMessage(message);
      successTimeoutRef.current = null;
    }, 10);
  };

  const showFailureToast = (message: string) => {
    if (successTimeoutRef.current !== null) {
      window.clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    if (failureTimeoutRef.current !== null) {
      window.clearTimeout(failureTimeoutRef.current);
      failureTimeoutRef.current = null;
    }

    setSuccessMessage('');
    setErrorMessage(message);
    setFailureToastMessage('');
    failureTimeoutRef.current = window.setTimeout(() => {
      setFailureToastMessage(message);
      failureTimeoutRef.current = null;
    }, 10);
  };

  const loadBootstrap = async () => {
    if (!deviceToken) {
      setBootstrap(null);
      showFailureToast(copy.invalidDevice);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await runWithMinimumDuration(
        humanResourcesApi.getPublicKioskBootstrap(deviceToken),
        KIOSK_MINIMUM_LOADING_MS,
      );
      setBootstrap(response);
      setSelectedMethod('pin');
      if (!response.auth_methods.includes('pin')) {
        showFailureToast(copy.missingMethods);
      }
    } catch (error) {
      setBootstrap(null);
      showFailureToast(error instanceof Error ? error.message : copy.invalidDevice);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBootstrap();
  }, [deviceToken]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => {
    clearResetTimer();
    if (successTimeoutRef.current !== null) {
      window.clearTimeout(successTimeoutRef.current);
    }
    if (failureTimeoutRef.current !== null) {
      window.clearTimeout(failureTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!bootstrap) {
      return;
    }

    if (selectedMethod !== 'pin') {
      setSelectedMethod('pin');
    }
  }, [bootstrap, selectedMethod]);

  const hasIdentityEvidence = evidenceMode === 'face'
    ? faceVerificationSessionId !== null
    : fallbackPhotoUpload.photo !== null;
  const canIdentify = credentialValue.trim().length > 0 && busyState === 'idle' && !isLoading;
  const canPunch = identifiedEmployee !== null
    && identificationToken.length > 0
    && locationState !== null
    && hasIdentityEvidence
    && busyState === 'idle';
  const credentialPlaceholder = copy.pinPlaceholder;
  const activeTodayActivity = identifiedEmployee
    ? todayActivity ?? {
      attendance_date: localDateString(new Date()),
      status: 'pending' as const,
      first_check_in_at: null,
      last_check_out_at: null,
      minutes_late: 0,
      has_check_in: false,
      has_check_out: false,
    }
    : null;

  const formatActivityDate = (dateValue: string) => {
    const [year, month, day] = dateValue.split('-').map(Number);
    if (!year || !month || !day) {
      return dateValue;
    }

    return new Date(year, month - 1, day).toLocaleDateString(currentLanguage.code, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatActivityTime = (dateTimeValue?: string | null) => {
    if (!dateTimeValue) {
      return copy.notRecorded;
    }

    return new Date(dateTimeValue).toLocaleTimeString(currentLanguage.code, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      showFailureToast(copy.errors.noGeolocation);
      return null;
    }

    setBusyState('locating');
    setErrorMessage('');

    try {
      const position = await runWithMinimumDuration(
        new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 0,
          });
        }),
        KIOSK_MINIMUM_LOADING_MS,
      );
      const nextLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setLocationState(nextLocation);
      return nextLocation;
    } catch (error) {
      const geolocationError = error as Partial<GeolocationPositionError>;
      if (geolocationError.code === 1) {
        showFailureToast(copy.errors.allowGeolocation);
      } else {
        showFailureToast(copy.errors.locationUnavailable);
      }
      setLocationState(null);
      return null;
    } finally {
      setBusyState('idle');
    }
  };

  const handleEvidenceModeChange = (mode: EvidenceMode) => {
    setEvidenceMode(mode);
    setFaceVerificationSessionId(null);
    setFaceStatus('idle');
    setFaceErrorMessage('');
    fallbackPhotoUpload.clearPhoto();
    setErrorMessage('');
    if (failureTimeoutRef.current !== null) {
      window.clearTimeout(failureTimeoutRef.current);
      failureTimeoutRef.current = null;
    }
    setFailureToastMessage('');
  };

  const handleFaceVerification = async (captures: LiveFaceChallengeCapture[]) => {
    if (!deviceToken || !identificationToken) {
      showFailureToast(copy.timeout);
      throw new Error(copy.timeout);
    }

    setFaceErrorMessage('');
    setErrorMessage('');
    setBusyState('verifyingFace');

    try {
      const sessionId = await runWithMinimumDuration(
        (async () => {
          const session = await humanResourcesApi.createPublicKioskFaceVerificationSession(deviceToken, identificationToken);
          for (const capture of captures) {
            const presigned = await humanResourcesApi.presignPublicKioskFaceVerificationCapture(
              deviceToken,
              session.session_id,
              identificationToken,
              capture.step,
              capture.photo.contentType,
            );
            await humanResourcesApi.uploadAttendancePhoto(
              presigned.upload_url,
              capture.photo.file,
              capture.photo.contentType,
              presigned.upload_headers ?? {},
            );
          }

          const result = await humanResourcesApi.completePublicKioskFaceVerificationSession(
            deviceToken,
            session.session_id,
            identificationToken,
          );

          if (!result.matched || !result.liveness_passed) {
            throw new Error(result.failure_reason || copy.faceFailed);
          }

          return session.session_id;
        })(),
        KIOSK_MINIMUM_LOADING_MS,
      );

      setFaceVerificationSessionId(sessionId);
      setFaceStatus('verified');
      fallbackPhotoUpload.clearPhoto();
      showSuccessToast(copy.faceVerified);
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.faceFailed;
      setFaceVerificationSessionId(null);
      setFaceStatus('failed');
      setFaceErrorMessage(message);
      showFailureToast(message);
      throw new Error(message);
    } finally {
      setBusyState('idle');
    }
  };

  const uploadFallbackPhoto = async (eventType: 'check_in' | 'check_out', eventTimestamp: string) => {
    if (!deviceToken || !identificationToken || !fallbackPhotoUpload.photo) {
      return undefined;
    }

    const presigned = await humanResourcesApi.presignPublicKioskAttendancePhotoUpload(deviceToken, {
      identification_token: identificationToken,
      event_type: eventType,
      event_timestamp: eventTimestamp,
      content_type: fallbackPhotoUpload.photo.contentType,
    });
    await humanResourcesApi.uploadAttendancePhoto(
      presigned.upload_url,
      fallbackPhotoUpload.photo.file,
      fallbackPhotoUpload.photo.contentType,
      presigned.upload_headers ?? {},
    );
    return presigned.object_key;
  };

  const handleIdentify = async () => {
    if (!deviceToken || !bootstrap) {
      return;
    }
    if (!bootstrap.auth_methods.includes('pin')) {
      showFailureToast(copy.unsupportedMethod);
      return;
    }
    if (credentialValue.trim().length === 0) {
      return;
    }

    setBusyState('identifying');
    setErrorMessage('');

    try {
      const response = await runWithMinimumDuration(
        humanResourcesApi.identifyPublicKioskEmployee(deviceToken, {
          auth_method: 'pin',
          credential_payload: credentialValue.trim(),
        }),
        KIOSK_MINIMUM_LOADING_MS,
      );
      setIdentifiedEmployee(response.employee);
      setTodayActivity(response.today_activity ?? null);
      setIdentificationToken(response.identification_token);
      setExpiresAt(response.expires_at);
      setCredentialValue('');
      setLocationState(null);
      setEvidenceMode('face');
      setFaceVerificationSessionId(null);
      setFaceStatus('idle');
      setFaceErrorMessage('');
      fallbackPhotoUpload.clearPhoto();
      scheduleAutoReset(copy.timeout);
    } catch (error) {
      showFailureToast(error instanceof Error ? error.message : copy.invalidDevice);
    } finally {
      setBusyState('idle');
    }
  };

  const handlePunch = async (eventType: 'check_in' | 'check_out') => {
    if (!deviceToken || !identificationToken || !locationState) {
      return;
    }
    if (!hasIdentityEvidence) {
      showFailureToast(copy.errors.evidenceRequired);
      return;
    }

    setBusyState('recording');
    setErrorMessage('');

    try {
      const response = await runWithMinimumDuration(
        (async () => {
          const eventTimestamp = localDateTimeString(new Date());
          const fallbackPhotoObjectKey = evidenceMode === 'photo'
            ? await uploadFallbackPhoto(eventType, eventTimestamp)
            : undefined;

          return humanResourcesApi.punchPublicKiosk(deviceToken, {
            identification_token: identificationToken,
            event_type: eventType,
            event_timestamp: eventTimestamp,
            latitude: locationState.latitude,
            longitude: locationState.longitude,
            face_verification_session_id: evidenceMode === 'face' ? faceVerificationSessionId ?? undefined : undefined,
            photo_url: fallbackPhotoObjectKey,
            metadata: {
              identity_evidence: evidenceMode === 'face' ? 'face_verified' : 'photo_fallback',
              evidence_mode: evidenceMode,
              face_verification_failed: evidenceMode === 'photo',
            },
          });
        })(),
        KIOSK_MINIMUM_LOADING_MS,
      );

      setTodayActivity(response.today_activity ?? {
        attendance_date: localDateString(new Date()),
        status: response.status,
        first_check_in_at: response.first_check_in_at ?? null,
        last_check_out_at: response.last_check_out_at ?? null,
        minutes_late: 0,
        has_check_in: Boolean(response.first_check_in_at),
        has_check_out: Boolean(response.last_check_out_at),
      });
      showSuccessToast(eventType === 'check_in' ? copy.success.checkIn : copy.success.checkOut);
      clearResetTimer();
      resetFlow();
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.invalidDevice;
      if (/expired/i.test(message)) {
        resetFlow({ reason: copy.timeout, keepError: true });
        showFailureToast(copy.timeout);
      } else {
        showFailureToast(message);
      }
    } finally {
      setBusyState('idle');
    }
  };

  return (
    <>
      <LoadingBarOverlay
        isVisible={isLoading || busyState !== 'idle'}
        title={
          isLoading
            ? copy.loading
            : busyState === 'identifying'
              ? copy.identifying
              : busyState === 'locating'
                ? copy.captureLocation
                : busyState === 'verifyingFace'
                  ? copy.faceChallenge.submitting
                  : copy.recording
        }
        description={
          isLoading
            ? copy.loadingDescription
            : busyState === 'identifying'
              ? copy.identifyingDescription
              : busyState === 'locating'
                ? copy.locationPending
                : busyState === 'verifyingFace'
                  ? copy.facePending
                  : copy.recordingDescription
        }
      />

      <SuccessToast
        isVisible={Boolean(successMessage)}
        message={successMessage}
        onClose={() => setSuccessMessage('')}
        className="top-5 bottom-auto left-1/2 right-auto z-[120] block w-auto min-w-0 max-w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 p-3 sm:bottom-auto sm:right-auto"
        durationMs={2600}
      />

      <FailureToast
        isVisible={Boolean(failureToastMessage)}
        message={failureToastMessage}
        onClose={() => setFailureToastMessage('')}
        className="top-5 bottom-auto left-1/2 right-auto z-[120] block w-auto min-w-0 max-w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 p-3 sm:bottom-auto sm:right-auto"
        durationMs={4200}
      />

      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,54,117,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.14),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eaf1f7_100%)] px-4 py-8 text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(139,179,255,0.14),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.10),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] dark:text-slate-100">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 shadow-[0_24px_80px_-40px_rgba(20,54,117,0.45)] backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/92 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.8)]">
            <div className="border-b border-slate-200/80 px-6 py-5 dark:border-slate-700/80 sm:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#143675]/10 px-3 py-1 text-sm font-medium text-[#143675] dark:bg-[#8bb3ff]/10 dark:text-[#8bb3ff]">
                    <BadgeCheck className="h-4 w-4" />
                    {copy.title}
                  </div>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{copy.title}</h1>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.subtitle}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-right shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{copy.kioskDevice}</p>
                  <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{bootstrap?.kiosk_device.name ?? '—'}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{copy.location}</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{bootstrap?.location.name ?? '—'}</p>
                  <p className="mt-3 text-sm font-semibold text-[#143675] dark:text-[#8bb3ff]">
                    {currentTime.toLocaleTimeString(currentLanguage.code, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{copy.identifyTitle}</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                      {identifiedEmployee ? copy.identifiedTitle : copy.identifyTitle}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {identifiedEmployee ? copy.identifiedHint : copy.identifyDescription}
                    </p>
                  </div>
                  <Button type="button" variant="outline" className="gap-2" onClick={() => resetFlow()}>
                    <RefreshCw className="h-4 w-4" />
                    {copy.reset}
                  </Button>
                </div>

                {errorMessage ? (
                  <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/50 dark:text-rose-200">
                    {errorMessage}
                  </div>
                ) : null}

                {!identifiedEmployee ? (
                  <div className="mt-6 space-y-5">
                    <div className="rounded-2xl border border-[#143675]/15 bg-[#143675]/6 px-4 py-3 text-sm font-medium text-[#143675] dark:border-[#8bb3ff]/20 dark:bg-[#8bb3ff]/10 dark:text-[#8bb3ff]">
                      {copy.methods[selectedMethod]}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{copy.credentialLabel}</label>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                          type="text"
                          value={credentialValue}
                          onChange={(event) => setCredentialValue(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              void handleIdentify();
                            }
                          }}
                          placeholder={credentialPlaceholder}
                          inputMode="text"
                          autoFocus
                          autoComplete="off"
                          enterKeyHint="done"
                          className="h-12 rounded-2xl border-slate-200 bg-white text-base dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:flex-1"
                        />
                        <Button
                          type="button"
                          disabled={!canIdentify}
                          className="h-12 rounded-2xl bg-[#143675] px-6 text-white hover:bg-[#0f2855] sm:w-auto"
                          onClick={() => void handleIdentify()}
                        >
                          <KeyRound className="h-4 w-4" />
                          {copy.identify}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 space-y-6">
                    <div className="flex items-center gap-4 rounded-3xl border border-emerald-200 bg-emerald-50/90 p-5 dark:border-emerald-800/50 dark:bg-emerald-950/40">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#143675] text-xl font-semibold text-white">
                        {deriveInitials(identifiedEmployee.full_name)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">{copy.identifiedTitle}</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{identifiedEmployee.full_name}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          {identifiedEmployee.employee_number || identifiedEmployee.position_title || identifiedEmployee.department || '—'}
                        </p>
                        {expiresAt ? (
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            {new Date(expiresAt).toLocaleTimeString(currentLanguage.code, { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm dark:border-emerald-800/50 dark:bg-slate-950">
                        <div className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-4 w-4" />
                          {copy.identify}
                        </div>
                      </div>
                      <div className={`rounded-2xl border px-4 py-3 text-sm ${hasIdentityEvidence ? 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-800/50 dark:bg-slate-950 dark:text-emerald-300' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`}>
                        <div className="flex items-center gap-2 font-medium">
                          {evidenceMode === 'face' ? <ScanFace className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                          {hasIdentityEvidence
                            ? evidenceMode === 'face' ? copy.faceVerified : copy.photoCaptured
                            : evidenceMode === 'face' ? copy.faceRecognition : copy.photoVerification}
                        </div>
                      </div>
                      <div className={`rounded-2xl border px-4 py-3 text-sm ${locationState ? 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-800/50 dark:bg-slate-950 dark:text-emerald-300' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`}>
                        <div className="flex items-center gap-2 font-medium">
                          <LocateFixed className="h-4 w-4" />
                          {locationState ? copy.locationReady : copy.locationPending}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Button
                        type="button"
                        disabled={!canPunch}
                        className="h-16 rounded-3xl bg-[#143675] text-lg font-semibold text-white hover:bg-[#0f2855]"
                        onClick={() => void handlePunch('check_in')}
                      >
                        {copy.checkIn}
                      </Button>
                      <Button
                        type="button"
                        disabled={!canPunch}
                        className="h-16 rounded-3xl bg-emerald-600 text-lg font-semibold text-white hover:bg-emerald-700"
                        onClick={() => void handlePunch('check_out')}
                      >
                        {copy.checkOut}
                      </Button>
                    </div>

                    {activeTodayActivity ? (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-950">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                              {copy.todayActivity}
                            </p>
                            <p className="mt-1 font-semibold text-slate-950 dark:text-white">
                              {formatActivityDate(activeTodayActivity.attendance_date)}
                            </p>
                          </div>
                          <div className="inline-flex w-fit items-center rounded-full bg-[#143675]/10 px-3 py-1 text-xs font-semibold text-[#143675] dark:bg-[#8bb3ff]/10 dark:text-[#8bb3ff]">
                            {copy.activityStatus}: {copy.activityStatusLabels[activeTodayActivity.status]}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.firstCheckIn}</p>
                            <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                              {formatActivityTime(activeTodayActivity.first_check_in_at)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.lastCheckOut}</p>
                            <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                              {formatActivityTime(activeTodayActivity.last_check_out_at)}
                            </p>
                          </div>
                        </div>

                        {!activeTodayActivity.has_check_in && !activeTodayActivity.has_check_out ? (
                          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{copy.noActivityToday}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )}
              </section>

              <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                {identifiedEmployee ? (
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        {copy.verificationMethod}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950">
                        <button
                          type="button"
                          onClick={() => handleEvidenceModeChange('face')}
                          className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
                            evidenceMode === 'face'
                              ? 'bg-[#143675] text-white shadow-sm'
                              : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900'
                          }`}
                        >
                          <ScanFace className="h-4 w-4" />
                          {copy.faceRecognition}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEvidenceModeChange('photo')}
                          className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
                            evidenceMode === 'photo'
                              ? 'bg-[#143675] text-white shadow-sm'
                              : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900'
                          }`}
                        >
                          <Camera className="h-4 w-4" />
                          {copy.photoVerification}
                        </button>
                      </div>
                    </div>

                    {evidenceMode === 'face' ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{copy.face}</p>
                        {faceVerificationSessionId ? (
                          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                            {copy.faceVerified}
                          </div>
                        ) : (
                          <div className="mt-3">
                            <LiveFaceChallenge
                              title={copy.face}
                              helperText={copy.facePending}
                              onSubmit={handleFaceVerification}
                              resetToken={`${identifiedEmployee.id}:${identificationToken}`}
                              onRestart={() => {
                                setFaceVerificationSessionId(null);
                                setFaceStatus('idle');
                                setFaceErrorMessage('');
                              }}
                              onError={(message) => {
                                setFaceStatus('failed');
                                setFaceErrorMessage(message);
                              }}
                              copy={copy.faceChallenge}
                            />
                          </div>
                        )}
                        {faceStatus === 'failed' && !faceVerificationSessionId ? (
                          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
                            <div className="flex items-center gap-2">
                              <Camera className="h-4 w-4" />
                              {faceErrorMessage || copy.faceFailed}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-950/70">
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
                          onPhotoChange={fallbackPhotoUpload.setCapturedPhoto}
                          onError={showFailureToast}
                          errors={{
                            cameraUnsupported: copy.errors.cameraUnsupported,
                            cameraPermissionDenied: copy.errors.cameraPermissionDenied,
                            cameraUnavailable: copy.errors.cameraUnavailable,
                          }}
                        />
                      </div>
                    )}

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-950/70">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{copy.location}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{bootstrap?.location.name ?? '—'}</p>
                        </div>
                      </div>
                      <Button type="button" variant="outline" className="mt-4 w-full gap-2" onClick={() => void requestLocation()}>
                        <LocateFixed className="h-4 w-4" />
                        {locationState ? copy.refreshLocation : copy.captureLocation}
                      </Button>
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        {locationState
                          ? `${copy.locationReady}: ${locationState.latitude.toFixed(5)}, ${locationState.longitude.toFixed(5)}`
                          : copy.locationPending}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{copy.location}</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{bootstrap?.location.name ?? '—'}</p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
                      <p className="font-medium text-slate-900 dark:text-white">{copy.kioskDevice}</p>
                      <p className="mt-1">{bootstrap?.kiosk_device.name ?? '—'}</p>
                      <p className="mt-4 font-medium text-slate-900 dark:text-white">{copy.location}</p>
                      <p className="mt-1">{bootstrap?.location.name ?? '—'}</p>
                    </div>

                    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
                      <p className="font-medium text-slate-900 dark:text-white">{copy.identifyTitle}</p>
                      <ul className="mt-3 space-y-2">
                        <li>1. {copy.credentialLabel}</li>
                        <li>2. {copy.face}</li>
                        <li>3. {copy.location}</li>
                      </ul>
                    </div>
                  </>
                )}
              </aside>
            </div>
          </section>

          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {copy.loadingDescription}
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}
