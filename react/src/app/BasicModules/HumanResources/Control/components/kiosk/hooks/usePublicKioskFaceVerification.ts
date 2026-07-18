import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { LiveFaceChallengeCapture } from '../../../../../../components/LiveFaceChallenge';
import { runWithMinimumDuration } from '../../../../../../components/LoadingBarOverlay';
import { humanResourcesApi } from '../../../../../../api/humanResources';
import type {
  FaceStatus,
  PublicKioskBusyState,
} from '../publicKioskTypes';
import type { KioskTranslations } from '../translations';
import { publicKioskMinimumLoadingMs } from '../utils/publicKioskUtils';

interface UsePublicKioskFaceVerificationInput {
  clearFallbackPhoto: () => void;
  copy: KioskTranslations;
  deviceToken?: string;
  identificationToken: string;
  isOnline: boolean;
  setBusyState: Dispatch<SetStateAction<PublicKioskBusyState>>;
  setErrorMessage: Dispatch<SetStateAction<string>>;
  setFaceErrorMessage: Dispatch<SetStateAction<string>>;
  setFaceStatus: Dispatch<SetStateAction<FaceStatus>>;
  setFaceVerificationSessionId: Dispatch<SetStateAction<number | null>>;
  showFailureToast: (message: string) => void;
  showSuccessToast: (message: string) => void;
}

export function usePublicKioskFaceVerification({
  clearFallbackPhoto,
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
}: UsePublicKioskFaceVerificationInput) {
  const handleFaceRestart = useCallback(() => {
    setFaceVerificationSessionId(null);
    setFaceStatus('idle');
    setFaceErrorMessage('');
  }, [setFaceErrorMessage, setFaceStatus, setFaceVerificationSessionId]);

  const handleFaceError = useCallback((message: string) => {
    setFaceStatus('failed');
    setFaceErrorMessage(message);
  }, [setFaceErrorMessage, setFaceStatus]);

  const handleFaceVerification = useCallback(async (captures: LiveFaceChallengeCapture[]) => {
    if (!deviceToken || !identificationToken) {
      showFailureToast(copy.timeout);
      throw new Error(copy.timeout);
    }
    if (!isOnline) {
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
        publicKioskMinimumLoadingMs,
      );

      setFaceVerificationSessionId(sessionId);
      setFaceStatus('verified');
      clearFallbackPhoto();
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
  }, [
    clearFallbackPhoto,
    copy.faceFailed,
    copy.faceVerified,
    copy.timeout,
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
  ]);

  return {
    handleFaceError,
    handleFaceRestart,
    handleFaceVerification,
  };
}
