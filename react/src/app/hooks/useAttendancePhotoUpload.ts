import { useEffect, useState } from 'react';
import { humanResourcesApi, type AttendanceMediaPresignRequest } from '../api/humanResources';

export interface AttendancePhotoValue {
  previewUrl: string;
  file: Blob;
  contentType: string;
}

type UploadState = 'idle' | 'uploading' | 'uploaded' | 'error';

export function useAttendancePhotoUpload() {
  const [photo, setPhoto] = useState<AttendancePhotoValue | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadedObjectKey, setUploadedObjectKey] = useState('');
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    return () => {
      if (photo?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(photo.previewUrl);
      }
    };
  }, [photo]);

  const setCapturedPhoto = (nextPhoto: AttendancePhotoValue | null) => {
    setPhoto((currentPhoto) => {
      if (currentPhoto?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(currentPhoto.previewUrl);
      }
      return nextPhoto;
    });

    setUploadState('idle');
    setUploadedObjectKey('');
    setUploadError('');
  };

  const clearPhoto = () => {
    setCapturedPhoto(null);
  };

  const ensureUploaded = async (request: AttendanceMediaPresignRequest) => {
    if (uploadState === 'uploaded' && uploadedObjectKey) {
      return uploadedObjectKey;
    }

    if (!photo) {
      throw new Error('Attendance photo is required.');
    }

    setUploadState('uploading');
    setUploadError('');

    try {
      const presigned = await humanResourcesApi.presignAttendancePhotoUpload({
        ...request,
        content_type: photo.contentType,
      });

      await humanResourcesApi.uploadAttendancePhoto(
        presigned.upload_url,
        photo.file,
        photo.contentType,
        presigned.upload_headers ?? {},
      );

      setUploadedObjectKey(presigned.object_key);
      setUploadState('uploaded');
      return presigned.object_key;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Attendance photo upload failed.';
      setUploadError(message);
      setUploadState('error');
      throw new Error(message);
    }
  };

  const ensureUploadedForCurrentUser = async (request: Omit<AttendanceMediaPresignRequest, 'employee_id'>) => {
    if (uploadState === 'uploaded' && uploadedObjectKey) {
      return uploadedObjectKey;
    }

    if (!photo) {
      throw new Error('Attendance photo is required.');
    }

    setUploadState('uploading');
    setUploadError('');

    try {
      const presigned = await humanResourcesApi.presignMyAttendancePhotoUpload({
        ...request,
        content_type: photo.contentType,
      });

      await humanResourcesApi.uploadAttendancePhoto(
        presigned.upload_url,
        photo.file,
        photo.contentType,
        presigned.upload_headers ?? {},
      );

      setUploadedObjectKey(presigned.object_key);
      setUploadState('uploaded');
      return presigned.object_key;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Attendance photo upload failed.';
      setUploadError(message);
      setUploadState('error');
      throw new Error(message);
    }
  };

  return {
    photo,
    uploadState,
    uploadedObjectKey,
    uploadError,
    setCapturedPhoto,
    clearPhoto,
    ensureUploaded,
    ensureUploadedForCurrentUser,
  };
}
