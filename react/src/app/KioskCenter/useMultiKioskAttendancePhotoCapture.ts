import { useEffect, useState } from 'react';
import type { AttendancePhotoSelection } from '../components/AttendancePhotoCaptureCard';
import type { FallbackPhotoUploadState } from '../BasicModules/HumanResources/Control/components/kiosk/publicKioskTypes';

/** Presentation-only photo state for the shared attendance capture UI. */
export function useMultiKioskAttendancePhotoCapture(): FallbackPhotoUploadState {
  const [photo, setPhoto] = useState<AttendancePhotoSelection | null>(null);

  useEffect(() => () => {
    if (photo?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(photo.previewUrl);
  }, [photo]);

  const setCapturedPhoto = (nextPhoto: AttendancePhotoSelection | null) => {
    setPhoto(current => {
      if (current?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(current.previewUrl);
      return nextPhoto;
    });
  };

  const unsupportedTransport = async () => {
    throw new Error('The Multikiosco workspace owns the attendance evidence transport.');
  };

  return {
    photo,
    uploadState: 'idle',
    uploadedObjectKey: '',
    uploadError: '',
    setCapturedPhoto,
    clearPhoto: () => setCapturedPhoto(null),
    ensureUploaded: unsupportedTransport,
    ensureUploadedForCurrentUser: unsupportedTransport,
  };
}
