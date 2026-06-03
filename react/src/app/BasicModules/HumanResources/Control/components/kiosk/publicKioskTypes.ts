import type { useAttendancePhotoUpload } from '../../../../../hooks/useAttendancePhotoUpload';
import type {
  PublicKioskBootstrapResponse,
  PublicKioskDayActivity,
  PublicKioskIdentifyResponse,
} from '../../../../../api/humanResources';

export type PublicKioskMethod = NonNullable<PublicKioskBootstrapResponse['auth_methods'][number]>;
export type PublicKioskType = NonNullable<PublicKioskBootstrapResponse['kiosk_type']>;
export type PublicKioskBusyState = 'idle' | 'identifying' | 'recording' | 'locating' | 'verifyingFace';
export type KioskLocationState = { latitude: number; longitude: number };
export type FaceStatus = 'idle' | 'verified' | 'failed';
export type EvidenceMode = 'face' | 'photo';
export type FallbackPhotoUploadState = ReturnType<typeof useAttendancePhotoUpload>;

export type KioskHrUser = PublicKioskIdentifyResponse['user'];
export type KioskTodayActivity = PublicKioskDayActivity;

export type FallbackPhotoUploadResult = {
  objectKey?: string;
  stored: boolean;
  storageUnavailable: boolean;
};
