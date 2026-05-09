import { X } from 'lucide-react';
import { useState } from 'react';
import { LiveFaceChallenge } from '../../../../components/LiveFaceChallenge';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../../components/LoadingBarOverlay';
import { Button } from '../../../../components/ui/button';
import { humanResourcesApi } from '../../../../api/humanResources';

interface FaceEnrollmentModalProps {
  isOpen: boolean;
  employeeId: number | null;
  employeeName: string;
  onClose: () => void;
  onError?: (message: string) => void;
  onCompleted?: () => Promise<void> | void;
}

export function FaceEnrollmentModal({
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
        title="Saving face enrollment"
        description="Uploading captures and completing enrollment."
        className="z-[95]"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
        <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#143675]/20 bg-white text-gray-900 shadow-2xl dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100">
          <div className="flex items-start justify-between gap-4 bg-[#143675] px-6 py-5">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold leading-7 text-white">Face enrollment</h2>
              <p className="mt-1 truncate text-sm leading-5 text-blue-100">{employeeName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/85 transition hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-6 py-5 dark:bg-gray-950">
            <LiveFaceChallenge
              title="Face enrollment"
              helperText="Keep one face centered in the frame. The app will guide the neutral, left, and right poses automatically."
              onSubmit={handleSubmit}
              onError={onError}
              resetToken={employeeId}
              copy={{
                success: 'Face enrollment completed.',
                retry: 'Retry enrollment',
              }}
            />
          </div>

          <div className="flex justify-end border-t border-white/10 bg-[#143675] px-6 py-4">
            <Button className="rounded-xl bg-white text-[#143675] hover:bg-blue-50" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
