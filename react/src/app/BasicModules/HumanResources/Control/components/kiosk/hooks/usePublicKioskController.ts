import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { runWithMinimumDuration } from '../../../../../../components/LoadingBarOverlay';
import { useKioskSessionBoundary } from '../../../../../../components/kiosk-engine/useKioskSessionBoundary';
import { useAttendancePhotoUpload } from '../../../../../../hooks/useAttendancePhotoUpload';
import {
  humanResourcesApi,
  type PublicKioskBootstrapResponse,
} from '../../../../../../api/humanResources';
import type {
  EvidenceMode,
  FaceStatus,
  KioskHrUser,
  KioskLocationState,
  KioskTodayActivity,
  PublicKioskBusyState,
  PublicKioskMethod,
} from '../publicKioskTypes';
import {
  publicKioskMinimumLoadingMs,
} from '../utils/publicKioskUtils';
import { useKioskLocaleControls, useKioskTranslations } from './useKioskTranslations';
import { usePublicKioskAttendanceActions } from './usePublicKioskAttendanceActions';
import { usePublicKioskFaceVerification } from './usePublicKioskFaceVerification';
import { usePublicKioskToasts } from './usePublicKioskToasts';
import { usePublicKioskViewModel } from './usePublicKioskViewModel';

export function usePublicKioskController() {
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
  const [identifiedHrUser, setIdentifiedHrUser] = useState<KioskHrUser | null>(null);
  const [todayActivity, setTodayActivity] = useState<KioskTodayActivity | null>(null);
  const [identificationToken, setIdentificationToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [locationState, setLocationState] = useState<KioskLocationState | null>(null);
  const [evidenceMode, setEvidenceMode] = useState<EvidenceMode>('photo');
  const [faceVerificationSessionId, setFaceVerificationSessionId] = useState<number | null>(null);
  const [faceStatus, setFaceStatus] = useState<FaceStatus>('idle');
  const [faceErrorMessage, setFaceErrorMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyState, setBusyState] = useState<PublicKioskBusyState>('idle');
  const fallbackPhotoUpload = useAttendancePhotoUpload();
  const resetTimeoutRef = useRef<number | null>(null);
  const {
    clearFailureToast,
    clearFailureToastState,
    clearSuccessToast,
    failureToastMessage,
    showFailureToast,
    showSuccessToast,
    successMessage,
  } = usePublicKioskToasts({ onErrorMessageChange: setErrorMessage });

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
    clearFailureToastState();
    if (!options?.keepError) {
      setErrorMessage(options?.reason ?? '');
    } else if (options?.reason) {
      setErrorMessage(options.reason);
    }
  };
  const resetFlowRef = useRef(resetFlow);
  const timeoutCopyRef = useRef(copy.timeout);
  resetFlowRef.current = resetFlow;
  timeoutCopyRef.current = copy.timeout;
  const expireSession = useCallback(() => {
    resetFlowRef.current({ reason: timeoutCopyRef.current, keepError: true });
  }, []);
  const { isOnline, isSessionExpiring } = useKioskSessionBoundary({
    active: Boolean(identificationToken),
    expiresAt,
    inactivityTimeoutSeconds: bootstrap?.inactivity_timeout_seconds ?? 60,
    onExpire: expireSession,
  });

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
        publicKioskMinimumLoadingMs,
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
  }, []);

  useEffect(() => {
    if (!bootstrap) {
      return;
    }

    if (selectedMethod !== 'pin') {
      setSelectedMethod('pin');
    }
  }, [bootstrap, selectedMethod]);

  const {
    activeActivityLocation,
    activityStateLabel,
    activeTodayActivity,
    canCheckIn,
    canCheckOut,
    canIdentify,
    canPunch,
    credentialPlaceholder,
    formatActivityDate,
    formatActivityTime,
    hasIdentityEvidence,
    kioskGreeting,
    kioskLocationLabel,
    kioskMessage,
    kioskSteps,
    loadingDescription,
    loadingTitle,
    locationButtonLabel,
    locationHelpText,
    nextActionLabel,
    terminalSubtitle,
    verificationLocationLabel,
  } = usePublicKioskViewModel({
    bootstrap,
    busyState,
    copy,
    credentialValue,
    currentTime,
    evidenceMode,
    faceVerificationSessionId,
    hasFallbackPhoto: fallbackPhotoUpload.photo !== null,
    identificationToken,
    identifiedHrUser,
    isLoading,
    locationState,
    selectedLocale,
    todayActivity,
  });
  const {
    handleFaceError,
    handleFaceRestart,
    handleFaceVerification,
  } = usePublicKioskFaceVerification({
    clearFallbackPhoto: fallbackPhotoUpload.clearPhoto,
    copy,
    deviceToken,
    identificationToken,
    isOnline,
    setBusyState,
    setErrorMessage,
    setFaceErrorMessage,
    setFaceStatus,
    setFaceVerificationSessionId,
    showFailureToast,
    showSuccessToast,
  });
  const { handlePunch } = usePublicKioskAttendanceActions({
    clearResetTimer,
    copy,
    deviceToken,
    evidenceMode,
    faceVerificationSessionId,
    fallbackPhotoUpload,
    hasIdentityEvidence,
    identificationToken,
    isOnline,
    locationState,
    resetFlow,
    setBusyState,
    setErrorMessage,
    setTodayActivity,
    showFailureToast,
    showSuccessToast,
  });

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
        publicKioskMinimumLoadingMs,
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
    clearFailureToastState();
  };

  const handleIdentify = async () => {
    if (!deviceToken || !bootstrap) {
      return;
    }
    if (!isOnline) {
      showFailureToast(selectedLocale.startsWith('es')
        ? 'Se requiere conexión para usar este kiosko.'
        : 'An internet connection is required to use this kiosk.');
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
        publicKioskMinimumLoadingMs,
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

  return {
    activeActivityLocation,
    activityStateLabel,
    activeTodayActivity,
    bootstrap,
    busyState,
    canCheckIn,
    canCheckOut,
    canIdentify,
    copy,
    credentialPlaceholder,
    credentialValue,
    currentTime,
    detectedLocale,
    errorMessage,
    evidenceMode,
    expiresAt,
    faceErrorMessage,
    faceStatus,
    faceVerificationSessionId,
    failureToastMessage,
    fallbackPhotoUpload,
    formatActivityDate,
    formatActivityTime,
    handleEvidenceModeChange,
    handleFaceError,
    handleFaceRestart,
    handleFaceVerification,
    handleIdentify,
    handlePunch,
    hasIdentityEvidence,
    identificationToken,
    identifiedHrUser,
    isLoading,
    isOnline,
    isSessionExpiring,
    kioskGreeting,
    kioskLocationLabel,
    kioskMessage,
    kioskSteps,
    loadingDescription,
    loadingTitle,
    localeOptions,
    locationButtonLabel,
    locationHelpText,
    locationState,
    nextActionLabel,
    requestLocation,
    resetFlow,
    selectedLocale,
    selectedMethod,
    setCredentialValue,
    setKioskLocale,
    showFailureToast,
    successMessage,
    terminalSubtitle,
    verificationLocationLabel,
    clearFailureToast,
    clearSuccessToast,
  };
}
