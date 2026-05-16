import { Copy } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { type AttendanceControlCopy } from './ControlAttendanceWidgets';

export function ControlKioskQrDialog({
  copy,
  isOpen,
  kioskLink,
  qrDataUrl,
  onOpenChange,
  onCopy,
}: {
  copy: AttendanceControlCopy;
  isOpen: boolean;
  kioskLink: string;
  qrDataUrl: string;
  onOpenChange: (open: boolean) => void;
  onCopy: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Attendance QR</DialogTitle>
          <DialogDescription>{kioskLink || 'This attendance point does not have an access link yet.'}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Attendance QR" className="h-72 w-72 rounded-2xl border border-gray-200 bg-white p-3" />
          ) : (
            <div className="flex h-72 w-72 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400">
              {copy.loading}
            </div>
          )}
          <Button type="button" variant="outline" className="w-full gap-2" onClick={onCopy}>
            <Copy className="h-4 w-4" />
            Copy access link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
