import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  CheckCircle2,
  CircleDot,
  Clock3,
  Globe2,
  KeyRound,
  LocateFixed,
  MapPin,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  Sparkles,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
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
import { useKioskLocaleControls, useKioskTranslations } from './hooks/useKioskTranslations';
import {
  getKioskGreeting,
  getKioskMessage,
  type KioskLocale,
  type KioskTranslations,
} from './translations';

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
type PublicKioskType = NonNullable<PublicKioskBootstrapResponse['kiosk_type']>;
type KioskLocationState = { latitude: number; longitude: number };
type FaceStatus = 'idle' | 'verified' | 'failed';
type EvidenceMode = 'face' | 'photo';
type FallbackPhotoUploadResult = {
  objectKey?: string;
  stored: boolean;
  storageUnavailable: boolean;
};
type KioskStepState = 'done' | 'active' | 'pending';
type KioskStepItem = {
  label: string;
  state: KioskStepState;
  Icon: LucideIcon;
};
type PinKeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'backspace';

const isObjectStorageDisabledError = (error: unknown) =>
  error instanceof Error && /object storage is not enabled/i.test(error.message);

function KioskStepGuide({ stepLabel, steps }: { stepLabel: string; steps: KioskStepItem[] }) {
  return (
    <div className="space-y-3">
      {steps.map(({ label, state, Icon }, index) => (
        <div
          key={label}
          className={`flex items-center gap-3 rounded-2xl border px-3 py-3 transition ${
            state === 'done'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-200'
              : state === 'active'
                ? 'border-[#59C3A5]/35 bg-[#59C3A5]/8 text-[#59C3A5] shadow-[0_2px_10px_rgba(89,195,165,0.08)] dark:border-[#8FE0CA]/35 dark:bg-[#8FE0CA]/10 dark:text-[#8FE0CA]'
                : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-400'
          }`}
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
              state === 'done'
                ? 'bg-emerald-500 text-white'
                : state === 'active'
                  ? 'bg-[#59C3A5] text-white dark:bg-[#8FE0CA] dark:text-slate-950'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {state === 'done' ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">{stepLabel} {index + 1}</p>
            <p className="mt-0.5 text-sm font-semibold">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function KioskStatusMetric({
  label,
  value,
  Icon,
  isStrong = false,
}: {
  label: string;
  value: string;
  Icon: LucideIcon;
  isStrong?: boolean;
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${isStrong ? 'border-[#59C3A5]/25 bg-[#59C3A5]/8 dark:border-[#8FE0CA]/25 dark:bg-[#8FE0CA]/10' : 'border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-950/75'}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className={`mt-2 text-base font-semibold ${isStrong ? 'text-[#59C3A5] dark:text-[#8FE0CA]' : 'text-slate-950 dark:text-white'}`}>
        {value}
      </p>
    </div>
  );
}

function KioskLanguageSelector({
  copy,
  detectedLocale,
  locale,
  localeOptions,
  onLocaleChange,
}: {
  copy: KioskTranslations;
  detectedLocale: KioskLocale | null;
  locale: KioskLocale;
  localeOptions: ReadonlyArray<{ code: KioskLocale; label: string }>;
  onLocaleChange: (locale: KioskLocale) => void;
}) {
  return (
    <label className="flex min-w-[13rem] items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950/75 dark:text-slate-200">
      <Globe2 className="h-4 w-4 shrink-0 text-[#59C3A5] dark:text-[#8FE0CA]" />
      <span className="sr-only">{copy.language.selectorLabel}</span>
      <select
        value={locale}
        onChange={(event) => onLocaleChange(event.target.value as KioskLocale)}
        aria-label={copy.language.selectorLabel}
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
      >
        {localeOptions.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
      {detectedLocale === locale ? (
        <span
          title={copy.language.autoDetected}
          className="hidden rounded-full bg-[#59C3A5]/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#59C3A5] dark:bg-[#8FE0CA]/10 dark:text-[#8FE0CA] sm:inline"
        >
          {copy.language.autoBadge}
        </span>
      ) : null}
    </label>
  );
}

function KioskFlowStepper({ stepLabel, steps }: { stepLabel: string; steps: KioskStepItem[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {steps.map(({ label, state, Icon }, index) => (
        <div
          key={label}
          className={`relative overflow-hidden rounded-[22px] border px-4 py-3 transition ${
            state === 'done'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-200'
              : state === 'active'
                ? 'border-[#59C3A5]/35 bg-white text-[#59C3A5] shadow-[0_12px_34px_-26px_rgba(89,195,165,0.7)] dark:border-[#8FE0CA]/35 dark:bg-slate-950 dark:text-[#8FE0CA]'
                : 'border-slate-200 bg-white/80 text-slate-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-400'
          }`}
        >
          {state === 'active' ? <div className="absolute inset-y-0 left-0 w-1 bg-[#59C3A5] dark:bg-[#8FE0CA]" /> : null}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                state === 'done'
                  ? 'bg-emerald-500 text-white'
                  : state === 'active'
                    ? 'bg-[#59C3A5] text-white dark:bg-[#8FE0CA] dark:text-slate-950'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {state === 'done' ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">{stepLabel} {index + 1}</p>
              <p className="mt-0.5 truncate text-sm font-semibold">{label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function KioskPinKeypad({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (nextValue: string) => void;
}) {
  const keys: PinKeypadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'backspace', '0'];

  const handleKey = (key: PinKeypadKey) => {
    if (disabled) {
      return;
    }

    if (key === 'backspace') {
      onChange(value.slice(0, -1));
      return;
    }

    onChange(`${value}${key}`.replace(/\D/g, '').slice(0, 5));
  };

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => handleKey(key)}
          className={`flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl font-semibold text-slate-950 shadow-sm transition hover:border-[#59C3A5]/35 hover:bg-[#59C3A5]/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-[#8FE0CA]/35 dark:hover:bg-[#8FE0CA]/10 ${
            key === '0' ? 'col-start-2' : ''
          }`}
        >
          {key === 'backspace' ? <span className="text-sm font-bold uppercase tracking-wide">Del</span> : key}
        </button>
      ))}
    </div>
  );
}

export default function Kiosk() {
  const { deviceToken } = useParams();
  const copy = useKioskTranslations();
  const {
    detectedLocale,
    localeOptions,
    selectedLocale,
    setKioskLocale,
  } = useKioskLocaleControls();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [bootstrap, setBootstrap] = useState<PublicKioskBootstrapResponse | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PublicKioskMethod>('pin');
  const [credentialValue, setCredentialValue] = useState('');
  const [identifiedHrUser, setIdentifiedHrUser] = useState<PublicKioskIdentifyResponse['user'] | null>(null);
  const [todayActivity, setTodayActivity] = useState<PublicKioskDayActivity | null>(null);
  const [identificationToken, setIdentificationToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [locationState, setLocationState] = useState<KioskLocationState | null>(null);
  const [evidenceMode, setEvidenceMode] = useState<EvidenceMode>('photo');
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
    setIdentifiedHrUser(null);
    setTodayActivity(null);
    setIdentificationToken('');
    setExpiresAt('');
    setLocationState(null);
    setEvidenceMode('photo');
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
  const kioskType: PublicKioskType = bootstrap?.kiosk_type ?? 'business_unit';
  const isOpenAttendanceKiosk = kioskType === 'open_attendance';
  const canIdentify = credentialValue.trim().length > 0 && busyState === 'idle' && !isLoading;
  const canPunch = identifiedHrUser !== null
    && identificationToken.length > 0
    && locationState !== null
    && hasIdentityEvidence
    && busyState === 'idle';
  const credentialPlaceholder = copy.pinPlaceholder;
  const activeTodayActivity = identifiedHrUser
    ? todayActivity ?? {
      attendance_date: localDateString(new Date()),
      status: 'pending' as const,
      corrected_status: null,
      first_check_in_at: null,
      last_check_out_at: null,
      first_location: null,
      last_location: null,
      minutes_late: 0,
      has_check_in: false,
      has_check_out: false,
      has_active_check_in: false,
    }
    : null;
  const kioskLocationLabel = bootstrap?.location?.name
    ?? (isOpenAttendanceKiosk ? copy.deviceGpsRequired : bootstrap?.scope_label)
    ?? '—';
  const hasActiveCheckIn = Boolean(
    activeTodayActivity?.has_active_check_in
      ?? (activeTodayActivity?.has_check_in && !activeTodayActivity?.has_check_out),
  );
  const hasCompletedShift = Boolean(activeTodayActivity?.has_check_in && activeTodayActivity?.has_check_out);
  const canCheckIn = canPunch && !activeTodayActivity?.has_check_in;
  const canCheckOut = canPunch && hasActiveCheckIn;
  const activeActivityLocation = hasCompletedShift
    ? activeTodayActivity?.last_location
    : activeTodayActivity?.first_location;
  const activityStateLabel = activeTodayActivity?.corrected_status
    ? `${copy.hrMarked}: ${copy.activityStatusLabels[activeTodayActivity.corrected_status]}`
    : hasActiveCheckIn
      ? copy.alreadyCheckedIn
      : hasCompletedShift
        ? copy.checkedOutForDay
        : copy.readyToCheckIn;
  const nextActionLabel = !identifiedHrUser
    ? copy.waitingForPin
    : !hasIdentityEvidence
      ? copy.completeVerification
      : !locationState
        ? copy.locationPending
        : copy.readyToRegister;
  const kioskSteps = useMemo<KioskStepItem[]>(() => [
    {
      label: copy.steps.pin,
      state: identifiedHrUser ? 'done' : 'active',
      Icon: KeyRound,
    },
    {
      label: copy.steps.identity,
      state: identifiedHrUser ? hasIdentityEvidence ? 'done' : 'active' : 'pending',
      Icon: UserCheck,
    },
    {
      label: copy.steps.location,
      state: !identifiedHrUser ? 'pending' : locationState ? 'done' : hasIdentityEvidence ? 'active' : 'pending',
      Icon: MapPin,
    },
    {
      label: copy.steps.attendance,
      state: canPunch ? 'active' : hasCompletedShift ? 'done' : 'pending',
      Icon: BadgeCheck,
    },
  ], [
    canPunch,
    copy.steps.attendance,
    copy.steps.identity,
    copy.steps.location,
    copy.steps.pin,
    hasCompletedShift,
    hasIdentityEvidence,
    identifiedHrUser,
    locationState,
  ]);
  const terminalSubtitle = identifiedHrUser
    ? copy.identifiedHint
    : copy.terminalSubtitle;
  const verificationLocationLabel = locationState
    ? copy.locationReady
    : copy.locationPending;
  const locationButtonLabel = locationState
    ? copy.refreshLocation
    : copy.captureLocation;
  const locationHelpText = locationState
    ? `${copy.locationReady}: ${locationState.latitude.toFixed(5)}, ${locationState.longitude.toFixed(5)}`
    : copy.locationRequiredHint;
  const kioskGreeting = getKioskGreeting(copy, currentTime);
  const kioskMessage = getKioskMessage(copy, currentTime);

  const formatActivityDate = (dateValue: string) => {
    const [year, month, day] = dateValue.split('-').map(Number);
    if (!year || !month || !day) {
      return dateValue;
    }

    return new Date(year, month - 1, day).toLocaleDateString(selectedLocale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatActivityTime = (dateTimeValue?: string | null) => {
    if (!dateTimeValue) {
      return copy.notRecorded;
    }

    return new Date(dateTimeValue).toLocaleTimeString(selectedLocale, {
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
    if (mode === evidenceMode) {
      return;
    }

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

  const uploadFallbackPhoto = async (
    eventType: 'check_in' | 'check_out',
    eventTimestamp: string,
  ): Promise<FallbackPhotoUploadResult | null> => {
    if (!deviceToken || !identificationToken || !fallbackPhotoUpload.photo) {
      return null;
    }

    try {
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
      return {
        objectKey: presigned.object_key,
        stored: true,
        storageUnavailable: false,
      };
    } catch (error) {
      if (isObjectStorageDisabledError(error)) {
        return {
          stored: false,
          storageUnavailable: true,
        };
      }
      throw error;
    }
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
        humanResourcesApi.identifyPublicKioskHrUser(deviceToken, {
          auth_method: 'pin',
          credential_payload: credentialValue.trim(),
        }),
        KIOSK_MINIMUM_LOADING_MS,
      );
      setIdentifiedHrUser(response.user);
      setTodayActivity(response.today_activity ?? null);
      setIdentificationToken(response.identification_token);
      setExpiresAt(response.expires_at);
      setCredentialValue('');
      setLocationState(null);
      setEvidenceMode('photo');
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
    if (!deviceToken || !identificationToken) {
      return;
    }
    if (!hasIdentityEvidence) {
      showFailureToast(copy.errors.evidenceRequired);
      return;
    }
    if (!locationState) {
      showFailureToast(copy.errors.locationRequired);
      return;
    }

    setBusyState('recording');
    setErrorMessage('');

    try {
      const response = await runWithMinimumDuration(
        (async () => {
          const eventTimestamp = localDateTimeString(new Date());
          const fallbackPhotoResult = evidenceMode === 'photo'
            ? await uploadFallbackPhoto(eventType, eventTimestamp)
            : null;

          return humanResourcesApi.punchPublicKiosk(deviceToken, {
            identification_token: identificationToken,
            event_type: eventType,
            event_timestamp: eventTimestamp,
            ...(locationState
              ? {
                  latitude: locationState.latitude,
                  longitude: locationState.longitude,
                }
              : {}),
            face_verification_session_id: evidenceMode === 'face' ? faceVerificationSessionId ?? undefined : undefined,
            photo_url: fallbackPhotoResult?.objectKey,
            metadata: {
              identity_evidence: evidenceMode === 'face' ? 'face_verified' : 'photo_fallback',
              evidence_mode: evidenceMode,
              location_optional: false,
              location_forced: true,
              gps_captured: true,
              face_verification_failed: evidenceMode === 'photo',
              photo_capture_confirmed: evidenceMode === 'photo',
              photo_storage: evidenceMode === 'photo'
                ? fallbackPhotoResult?.stored
                  ? 'object_storage'
                  : 'unavailable'
                : undefined,
            },
          });
        })(),
        KIOSK_MINIMUM_LOADING_MS,
      );

      setTodayActivity(response.today_activity ?? {
        attendance_date: localDateString(new Date()),
        status: response.status,
        corrected_status: null,
        first_check_in_at: response.first_check_in_at ?? null,
        last_check_out_at: response.last_check_out_at ?? null,
        first_location: response.location ?? null,
        last_location: response.event_kind === 'check_out' ? response.location ?? null : null,
        minutes_late: 0,
        has_check_in: Boolean(response.first_check_in_at),
        has_check_out: Boolean(response.last_check_out_at),
        has_active_check_in: Boolean(response.first_check_in_at && !response.last_check_out_at),
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

      <main className="min-h-dvh bg-[linear-gradient(135deg,_#e8f0f7_0%,_#f8fbfd_44%,_#e7f5f0_100%)] px-3 py-3 text-slate-900 dark:bg-[linear-gradient(135deg,_#020617_0%,_#0f172a_54%,_#06201a_100%)] dark:text-slate-100 sm:px-5 lg:overflow-hidden">
        <div className="mx-auto flex max-w-[92rem] flex-col gap-3 lg:h-[calc(100dvh-1.5rem)]">
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_28px_90px_-46px_rgba(89,195,165,0.55)] dark:border-slate-700/80 dark:bg-slate-950 dark:shadow-[0_28px_90px_-48px_rgba(0,0,0,0.85)]">
            <div className="shrink-0 border-b border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950 sm:px-7">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#59C3A5] text-white shadow-sm dark:bg-[#8FE0CA] dark:text-slate-950">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">indice</p>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#59C3A5] dark:text-[#8FE0CA]">
                        {copy.terminalBadge}
                      </p>
                    </div>
                  </div>
                  <KioskLanguageSelector
                    copy={copy}
                    detectedLocale={detectedLocale}
                    locale={selectedLocale}
                    localeOptions={localeOptions}
                    onLocaleChange={setKioskLocale}
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[34rem]">
                  <KioskStatusMetric
                    label={copy.kioskDevice}
                    value={bootstrap?.kiosk_device.name ?? '—'}
                    Icon={CircleDot}
                    isStrong
                  />
                  <KioskStatusMetric
                    label={copy.location}
                    value={kioskLocationLabel}
                    Icon={MapPin}
                  />
                  <KioskStatusMetric
                    label={copy.currentTime}
                    value={currentTime.toLocaleTimeString(selectedLocale, { hour: '2-digit', minute: '2-digit' })}
                    Icon={Clock3}
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.74fr)]">
                <div className="rounded-[28px] border border-[#59C3A5]/10 bg-[linear-gradient(135deg,_#ffffff_0%,_#F0FBF7_58%,_#effaf5_100%)] p-5 dark:border-[#8FE0CA]/15 dark:bg-[linear-gradient(135deg,_#020617_0%,_#0f172a_62%,_#08251d_100%)]">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#59C3A5] ring-1 ring-[#59C3A5]/10 dark:bg-slate-950/70 dark:text-[#8FE0CA] dark:ring-[#8FE0CA]/15">
                    <Sparkles className="h-4 w-4" />
                    {kioskGreeting}
                  </div>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                    {copy.terminalTitle}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {terminalSubtitle}
                  </p>
                </div>

                <div className="rounded-[28px] border border-pink-100 bg-[linear-gradient(135deg,_#fff7ed_0%,_#fff1f2_100%)] p-5 shadow-[0_14px_34px_-30px_rgba(244,114,182,0.6)] dark:border-pink-900/40 dark:bg-[linear-gradient(135deg,_#1f1020_0%,_#2b1320_100%)]">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#59C3A5] shadow-sm dark:bg-slate-950 dark:text-[#8FE0CA]">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-950 dark:text-white">{kioskMessage.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{kioskMessage.body}</p>
                      <p className="mt-2 text-sm font-semibold text-[#59C3A5] dark:text-[#8FE0CA]">{kioskMessage.note}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <KioskFlowStepper stepLabel={copy.stepLabel} steps={kioskSteps} />
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-5 overflow-hidden bg-slate-50/70 px-5 py-5 dark:bg-slate-900/55 sm:px-7 lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
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
                  <Button type="button" variant="outline" className="h-11 rounded-2xl gap-2" onClick={() => resetFlow()}>
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
                        onChange={(event) => setCredentialValue(event.target.value.replace(/\D/g, '').slice(0, 5))}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleIdentify();
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
                        onClick={() => void handleIdentify()}
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
                        onChange={setCredentialValue}
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

                    <div className="rounded-[30px] border border-[#59C3A5]/20 bg-white p-5 shadow-[0_18px_44px_-32px_rgba(89,195,165,0.7)] dark:border-[#8FE0CA]/20 dark:bg-slate-950">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#59C3A5] dark:text-[#8FE0CA]">
                            {copy.verificationMethod}
                          </p>
                          <h3 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                            {evidenceMode === 'face' ? copy.face : copy.photoVerification}
                          </h3>
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {evidenceMode === 'face' ? copy.facePending : copy.photoHint}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900 lg:min-w-[22rem]">
                          <button
                            type="button"
                            onClick={() => handleEvidenceModeChange('face')}
                            className={`flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
                              evidenceMode === 'face'
                                ? 'bg-[#59C3A5] text-white shadow-sm'
                                : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-950'
                            }`}
                          >
                            <ScanFace className="h-4 w-4" />
                            {copy.faceRecognition}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEvidenceModeChange('photo')}
                            className={`flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
                              evidenceMode === 'photo'
                                ? 'bg-[#59C3A5] text-white shadow-sm'
                                : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-950'
                            }`}
                          >
                            <Camera className="h-4 w-4" />
                            {copy.photoVerification}
                          </button>
                        </div>
                      </div>

                      <div className="mt-5">
                        {evidenceMode === 'face' ? (
                          <div>
                            {faceVerificationSessionId ? (
                              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                                {copy.faceVerified}
                              </div>
                            ) : (
                              <LiveFaceChallenge
                                title={copy.face}
                                helperText={copy.facePending}
                                onSubmit={handleFaceVerification}
                                resetToken={`${identifiedHrUser.id}:${identificationToken}`}
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
                            )}
                            {faceStatus === 'failed' && !faceVerificationSessionId ? (
                              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-medium text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
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
                            className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-4 shadow-none dark:border-slate-700 dark:bg-slate-900/70"
                            videoClassName="h-[min(46vh,30rem)] min-h-[18rem] w-full object-cover"
                            photoClassName="mb-4 h-[min(46vh,30rem)] min-h-[18rem] w-full rounded-[22px] object-cover shadow-sm"
                            emptyPreviewClassName="mb-4 flex h-[min(46vh,30rem)] min-h-[18rem] w-full flex-col items-center justify-center rounded-[22px] border border-dashed border-[#59C3A5]/25 bg-white text-center text-slate-500 dark:border-[#8FE0CA]/25 dark:bg-slate-950 dark:text-slate-400"
                            actionClassName="mb-4 grid grid-cols-1 gap-3"
                            primaryButtonClassName="h-12 rounded-2xl bg-[#59C3A5] text-white hover:bg-[#3AAE90]"
                            onPhotoChange={fallbackPhotoUpload.setCapturedPhoto}
                            onError={showFailureToast}
                            errors={{
                              cameraUnsupported: copy.errors.cameraUnsupported,
                              cameraPermissionDenied: copy.errors.cameraPermissionDenied,
                              cameraUnavailable: copy.errors.cameraUnavailable,
                            }}
                          />
                        )}
                      </div>
                    </div>

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
                        <Button type="button" variant="outline" className="h-12 rounded-2xl gap-2 sm:min-w-[13rem]" onClick={() => void requestLocation()}>
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
                        onClick={() => void handlePunch('check_in')}
                      >
                        {copy.checkIn}
                      </Button>
                      <Button
                        type="button"
                        disabled={!canCheckOut}
                        className="h-16 rounded-[22px] bg-emerald-600 text-lg font-semibold text-white shadow-[0_14px_26px_-18px_rgba(5,150,105,0.8)] hover:bg-emerald-700 disabled:opacity-45"
                        onClick={() => void handlePunch('check_out')}
                      >
                        {copy.checkOut}
                      </Button>
                    </div>

                    {activeTodayActivity ? (
                      <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 px-4 py-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                              {copy.todayActivity}
                            </p>
                            <p className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
                              {formatActivityDate(activeTodayActivity.attendance_date)}
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                              {activityStateLabel}
                            </p>
                          </div>
                          <div className="inline-flex w-fit items-center rounded-full bg-[#59C3A5]/10 px-3 py-1 text-xs font-semibold text-[#59C3A5] dark:bg-[#8FE0CA]/10 dark:text-[#8FE0CA]">
                            {copy.activityStatus}: {copy.activityStatusLabels[activeTodayActivity.status]}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-950">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.firstCheckIn}</p>
                            <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                              {formatActivityTime(activeTodayActivity.first_check_in_at)}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-950">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.lastCheckOut}</p>
                            <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                              {formatActivityTime(activeTodayActivity.last_check_out_at)}
                            </p>
                          </div>
                          {activeActivityLocation ? (
                            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-950 sm:col-span-2 xl:col-span-1">
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.activeLocation}</p>
                              <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{activeActivityLocation.name}</p>
                            </div>
                          ) : null}
                        </div>

                        {!activeTodayActivity.has_check_in && !activeTodayActivity.has_check_out ? (
                          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{copy.noActivityToday}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )}
              </section>

              <aside className="min-h-0 overflow-y-auto rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_-24px_rgba(89,195,165,0.45)] dark:border-slate-800 dark:bg-slate-950">
                <div className="rounded-[24px] border border-[#59C3A5]/20 bg-[#59C3A5]/6 p-4 dark:border-[#8FE0CA]/20 dark:bg-[#8FE0CA]/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#59C3A5] dark:text-[#8FE0CA]">
                        {copy.pointStatus}
                      </p>
                      <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">
                        {bootstrap?.kiosk_device.name ?? copy.kioskDevice}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {copy.pointActive}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 dark:border-slate-700 dark:bg-slate-950/70">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{copy.location}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{kioskLocationLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 dark:border-slate-700 dark:bg-slate-950/70">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#59C3A5]/10 text-[#59C3A5] dark:bg-[#8FE0CA]/10 dark:text-[#8FE0CA]">
                        <BadgeCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{copy.accessPoint}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{copy.pointReady}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 dark:border-slate-700 dark:bg-slate-950/70">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <Clock3 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{copy.currentTime}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                          {currentTime.toLocaleTimeString(selectedLocale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                      {copy.nextAction}
                    </p>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#59C3A5] ring-1 ring-slate-200 dark:bg-slate-950 dark:text-[#8FE0CA] dark:ring-slate-700">
                      <CircleDot className="h-3.5 w-3.5" />
                      {nextActionLabel}
                    </div>
                  </div>
                  <KioskStepGuide stepLabel={copy.stepLabel} steps={kioskSteps} />
                </div>

              </aside>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
