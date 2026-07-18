import { ScanFace } from 'lucide-react';
import { useState } from 'react';
import { LiveFaceChallenge } from '../../../../components/LiveFaceChallenge';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../../components/LoadingBarOverlay';
import { Button } from '../../../../components/ui/button';
import { IndiceModalFrame } from '../../../../components/indice-modal';
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
      <IndiceModalFrame
        busy={isSubmitting}
        closeLabel={copy.labels.closeModal}
        contentClassName="sm:max-w-3xl"
        description={employeeName}
        footer={(
          <Button type="button" onClick={onClose} disabled={isSubmitting}>
            {copy.labels.closeModal}
          </Button>
        )}
        icon={<ScanFace className="h-5 w-5" />}
        modalType="wizard"
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        open
        title={copy.labels.faceEnrollmentStatus}
        tone="aqua"
      >
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
      </IndiceModalFrame>
    </>
  );
}
