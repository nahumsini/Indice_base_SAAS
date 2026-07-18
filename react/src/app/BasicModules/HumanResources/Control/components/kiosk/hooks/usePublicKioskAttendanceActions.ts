import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { runWithMinimumDuration } from '../../../../../../components/LoadingBarOverlay';
import { humanResourcesApi } from '../../../../../../api/humanResources';
import type {
  EvidenceMode,
  FallbackPhotoUploadResult,
  FallbackPhotoUploadState,
  KioskLocationState,
  KioskTodayActivity,
  PublicKioskBusyState,
} from '../publicKioskTypes';
import type { KioskTranslations } from '../translations';
import {
  isObjectStorageDisabledError,
  localDateString,
  localDateTimeString,
  publicKioskMinimumLoadingMs,
} from '../utils/publicKioskUtils';

interface UsePublicKioskAttendanceActionsInput {
  clearResetTimer: () => void;
  copy: KioskTranslations;
  deviceToken?: string;
  evidenceMode: EvidenceMode;
  faceVerificationSessionId: number | null;
  fallbackPhotoUpload: FallbackPhotoUploadState;
  hasIdentityEvidence: boolean;
  identificationToken: string;
  isOnline: boolean;
  locationState: KioskLocationState | null;
  resetFlow: (options?: { reason?: string; keepError?: boolean }) => void;
  setBusyState: Dispatch<SetStateAction<PublicKioskBusyState>>;
  setErrorMessage: Dispatch<SetStateAction<string>>;
  setTodayActivity: Dispatch<SetStateAction<KioskTodayActivity | null>>;
  showFailureToast: (message: string) => void;
  showSuccessToast: (message: string) => void;
}

export function usePublicKioskAttendanceActions({
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
}: UsePublicKioskAttendanceActionsInput) {
  const uploadFallbackPhoto = useCallback(async (
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
  }, [deviceToken, fallbackPhotoUpload.photo, identificationToken]);

  const handlePunch = useCallback(async (eventType: 'check_in' | 'check_out') => {
    if (!deviceToken || !identificationToken) {
      return;
    }
    if (!isOnline) {
      showFailureToast(copy.timeout);
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
        publicKioskMinimumLoadingMs,
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
  }, [
    clearResetTimer,
    copy.errors.evidenceRequired,
    copy.errors.locationRequired,
    copy.invalidDevice,
    copy.success.checkIn,
    copy.success.checkOut,
    copy.timeout,
    deviceToken,
    evidenceMode,
    faceVerificationSessionId,
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
    uploadFallbackPhoto,
  ]);

  return { handlePunch };
}
