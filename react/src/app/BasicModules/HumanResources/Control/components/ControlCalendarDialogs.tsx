import { Copy, QrCode } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { IndiceModalFrame } from '../../../../components/indice-modal';
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
    <IndiceModalFrame
      description={kioskLink || copy.kiosk.card.noAccessLink}
      footer={(
        <Button type="button" onClick={onCopy}>
          <Copy className="h-4 w-4" />
          {copy.kiosk.actions.copyAccessLink}
        </Button>
      )}
      icon={<QrCode className="h-5 w-5" />}
      modalType="confirmation"
      onOpenChange={onOpenChange}
      open={isOpen}
      title={copy.kiosk.card.qrTitle}
      tone="aqua"
    >
        <div className="flex flex-col items-center gap-4">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={copy.kiosk.card.qrTitle} className="aspect-square w-full max-w-72 rounded-lg border border-gray-200 bg-white p-3" />
          ) : (
            <div className="flex aspect-square w-full max-w-72 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400">
              {copy.loading}
            </div>
          )}
        </div>
    </IndiceModalFrame>
  );
}
