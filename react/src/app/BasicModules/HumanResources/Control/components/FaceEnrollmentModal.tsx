import { X } from 'lucide-react';
import { useState } from 'react';
import { LiveFaceChallenge } from '../../../../components/LiveFaceChallenge';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../../components/LoadingBarOverlay';
import { Button } from '../../../../components/ui/button';
import { humanResourcesApi } from '../../../../api/humanResources';
import type { AttendanceControlCopy } from './ControlAttendanceWidgets';

interface FaceEnrollmentModalProps {
  copy: AttendanceControlCopy;
  isOpen: boolean;
  employeeId: number | null;
  employeeName: string;
  onClose: () => void;
  onError?: (message: string) => void;
  onCompleted?: () => Promise<void> | void;
}

export function FaceEnrollmentModal({
  copy,
  isOpen,
  employeeId,
  employeeName,
  onClose,
  onError,
  onCompleted,
}: FaceEnrollmentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !employeeId) {
    return null;
  }

  const handleSubmit = async (captures: Array<{ step: string; photo: { file: Blob; contentType: string } }>) => {
    setIsSubmitting(true);

    try {
      await runWithMinimumDuration((async () => {
        const session = await humanResourcesApi.createFaceEnrollmentSession(employeeId);

        for (const capture of captures) {
          const presigned = await humanResourcesApi.presignFaceEnrollmentCapture(session.id, capture.step, capture.photo.contentType);
          await humanResourcesApi.uploadAttendancePhoto(
            presigned.upload_url,
            capture.photo.file,
            capture.photo.contentType,
            presigned.upload_headers ?? {},
          );
        }

        await humanResourcesApi.completeFaceEnrollmentSession(session.id);
        await Promise.resolve(onCompleted?.());
      })(), 850);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <LoadingBarOverlay
        isVisible={isSubmitting}
        title={copy.labels.savingFaceEnrollment}
        description={copy.labels.savingFaceEnrollmentDescription}
        className="z-[95]"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
        <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-[#59C3A5]/30 bg-white text-gray-900 shadow-2xl dark:border-[#59C3A5]/25 dark:bg-gray-950 dark:text-gray-100">
          <div className="flex items-start justify-between gap-4 bg-[#59C3A5] px-6 py-5">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold leading-7 text-white">{copy.labels.faceEnrollmentStatus}</h2>
              <p className="mt-1 truncate text-sm leading-5 text-blue-100">{employeeName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/85 transition hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
              aria-label={copy.labels.closeModal}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-6 py-5 dark:bg-gray-950">
            <LiveFaceChallenge
              title={copy.labels.faceEnrollmentStatus}
              helperText={copy.labels.faceEnrollmentHelper}
              onSubmit={handleSubmit}
              onError={onError}
              resetToken={employeeId}
              copy={{
                success: copy.labels.faceEnrollmentCompleted,
                retry: copy.labels.retryFaceEnrollment,
              }}
            />
          </div>

          <div className="flex justify-end border-t border-white/10 bg-[#59C3A5] px-6 py-4">
            <Button className="rounded-md bg-white text-[#59C3A5] hover:bg-blue-50" onClick={onClose}>
              {copy.labels.closeModal}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
