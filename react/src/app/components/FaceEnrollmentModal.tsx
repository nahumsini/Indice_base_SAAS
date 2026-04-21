import { X } from 'lucide-react';
import { LiveFaceChallenge } from './LiveFaceChallenge';
import { Button } from './ui/button';
import { humanResourcesApi } from '../api/humanResources';

interface FaceEnrollmentModalProps {
  isOpen: boolean;
  employeeId: number | null;
  employeeName: string;
  onClose: () => void;
  onCompleted?: () => Promise<void> | void;
}

export function FaceEnrollmentModal({
  isOpen,
  employeeId,
  employeeName,
  onClose,
  onCompleted,
}: FaceEnrollmentModalProps) {
  if (!isOpen || !employeeId) {
    return null;
  }

  const handleSubmit = async (captures: Array<{ step: string; photo: { file: Blob; contentType: string } }>) => {
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between bg-[#143675] p-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Face enrollment</h2>
            <p className="mt-1 text-sm text-blue-100">{employeeName}</p>
          </div>
          <button onClick={onClose} className="text-white/80 transition-colors hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <LiveFaceChallenge
            title="Face enrollment"
            helperText="Keep one face centered in the frame. The app will guide the neutral, left, and right poses automatically."
            onSubmit={handleSubmit}
            onCancel={onClose}
            resetToken={employeeId}
            copy={{
              success: 'Face enrollment completed.',
              retry: 'Retry enrollment',
              cancel: 'Close',
            }}
          />
        </div>

        <div className="flex justify-end border-t border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900/50">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
