import { useMemo } from 'react';
import {
  BadgeCheck,
  KeyRound,
  MapPin,
  UserCheck,
} from 'lucide-react';
import type { PublicKioskBootstrapResponse } from '../../../../../../api/humanResources';
import type { KioskStepItem } from '../PublicKioskComponents';
import type {
  EvidenceMode,
  KioskHrUser,
  KioskLocationState,
  KioskTodayActivity,
  PublicKioskBusyState,
  PublicKioskType,
} from '../publicKioskTypes';
import {
  getKioskGreeting,
  getKioskMessage,
  type KioskLocale,
  type KioskTranslations,
} from '../translations';
import { localDateString } from '../utils/publicKioskUtils';

interface UsePublicKioskViewModelInput {
  bootstrap: PublicKioskBootstrapResponse | null;
  busyState: PublicKioskBusyState;
  copy: KioskTranslations;
  credentialValue: string;
  currentTime: Date;
  evidenceMode: EvidenceMode;
  faceVerificationSessionId: number | null;
  hasFallbackPhoto: boolean;
  identificationToken: string;
  identifiedHrUser: KioskHrUser | null;
  isLoading: boolean;
  locationState: KioskLocationState | null;
  selectedLocale: KioskLocale;
  todayActivity: KioskTodayActivity | null;
}

export function usePublicKioskViewModel({
  bootstrap,
  busyState,
  copy,
  credentialValue,
  currentTime,
  evidenceMode,
  faceVerificationSessionId,
  hasFallbackPhoto,
  identificationToken,
  identifiedHrUser,
  isLoading,
  locationState,
  selectedLocale,
  todayActivity,
}: UsePublicKioskViewModelInput) {
  const hasIdentityEvidence = evidenceMode === 'face'
    ? faceVerificationSessionId !== null
    : hasFallbackPhoto;
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
  const kioskMessage = getKioskMessage(copy, currentTime, selectedLocale);
  const loadingTitle = isLoading
    ? copy.loading
    : busyState === 'identifying'
      ? copy.identifying
      : busyState === 'locating'
        ? copy.captureLocation
        : busyState === 'verifyingFace'
          ? copy.faceChallenge.submitting
          : copy.recording;
  const loadingDescription = isLoading
    ? copy.loadingDescription
    : busyState === 'identifying'
      ? copy.identifyingDescription
      : busyState === 'locating'
        ? copy.locationPending
        : busyState === 'verifyingFace'
          ? copy.facePending
          : copy.recordingDescription;

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

  return {
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
  };
}
