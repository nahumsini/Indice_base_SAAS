import { Copy } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import {
  type AttendanceCalendarDay,
  type AttendanceCorrectionStatus,
} from '../../../../api/humanResources';
import {
  type AttendanceControlCopy,
  DayEvidenceCard,
  DayInfoStat,
  dayStatusPillTone,
  formatDate,
  formatTimeOnly,
  formatWorkDuration,
  resolvedDayStatus,
} from './ControlAttendanceWidgets';

export function ControlCalendarDayDialog({
  copy,
  day,
  employeeName,
  locale,
  pendingStatus,
  isSaving,
  onPendingStatusChange,
  onClose,
  onSave,
}: {
  copy: AttendanceControlCopy;
  day: AttendanceCalendarDay | null;
  employeeName: string;
  locale: string;
  pendingStatus: AttendanceCorrectionStatus | '';
  isSaving: boolean;
  onPendingStatusChange: (status: AttendanceCorrectionStatus | '') => void;
  onClose: () => void;
  onSave: (date: string, status: AttendanceCorrectionStatus | '') => Promise<boolean>;
}) {
  return (
    <Dialog
      open={Boolean(day)}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      {day ? (
        <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-[760px]">
          <DialogHeader className="border-b border-gray-200 px-6 py-5 dark:border-gray-700">
            <DialogTitle>
              {copy.labels.modifyStatusOfDay} {new Date(`${day.date}T00:00:00`).getDate()}
            </DialogTitle>
            <DialogDescription>
              {employeeName} · {formatDate(day.date, locale, day.date)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-5">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{copy.labels.systemRegistration}</p>
                  <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-medium ${dayStatusPillTone(day)}`}>
                    {copy.statuses[resolvedDayStatus(day)]}
                  </div>
                </div>
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                  {copy.labels.notModifiable}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <DayInfoStat label={copy.labels.checkIn} value={formatTimeOnly(day.first_check_in_at, locale, copy.labels.noRegistration)} />
                <DayInfoStat label={copy.labels.checkOut} value={formatTimeOnly(day.last_check_out_at, locale, copy.labels.noRegistration)} />
                <DayInfoStat label={copy.labels.totalTime} value={formatWorkDuration(day.first_check_in_at, day.last_check_out_at, copy.labels.noRegistration)} />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DayEvidenceCard
                  label={copy.labels.checkIn}
                  photoUrl={day.first_photo_url ?? null}
                  location={day.first_location?.name ?? null}
                  copy={copy}
                />
                <DayEvidenceCard
                  label={copy.labels.checkOut}
                  photoUrl={day.last_photo_url ?? null}
                  location={day.last_location?.name ?? null}
                  copy={copy}
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{copy.labels.manuallyModifyStatus}</p>
              <div className="grid gap-2">
                <Button
                  type="button"
                  disabled={isSaving}
                  className={`justify-start bg-emerald-600 text-white hover:bg-emerald-700 ${pendingStatus === 'on_time' ? 'ring-2 ring-emerald-300 ring-offset-2' : ''}`}
                  onClick={() => onPendingStatusChange('on_time')}
                >
                  {copy.labels.markAsAttendance}
                </Button>
                <Button
                  type="button"
                  disabled={isSaving}
                  className={`justify-start bg-rose-600 text-white hover:bg-rose-700 ${pendingStatus === 'absence' ? 'ring-2 ring-rose-300 ring-offset-2' : ''}`}
                  onClick={() => onPendingStatusChange('absence')}
                >
                  {copy.labels.markAsAbsent}
                </Button>
                <Button
                  type="button"
                  disabled={isSaving}
                  className={`justify-start bg-amber-500 text-white hover:bg-amber-600 ${pendingStatus === 'late' ? 'ring-2 ring-amber-300 ring-offset-2' : ''}`}
                  onClick={() => onPendingStatusChange('late')}
                >
                  {copy.labels.markAsDelay}
                </Button>
                <Button
                  type="button"
                  disabled={isSaving}
                  className={`justify-start bg-slate-500 text-white hover:bg-slate-600 ${pendingStatus === 'rest' ? 'ring-2 ring-slate-300 ring-offset-2' : ''}`}
                  onClick={() => onPendingStatusChange('rest')}
                >
                  {copy.labels.markAsRest}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  className={pendingStatus === '' ? 'border-[#1463ff] text-[#1463ff]' : ''}
                  onClick={() => onPendingStatusChange('')}
                >
                  {copy.labels.clearManualCorrection}
                </Button>
              </div>
              <div className="border-t border-gray-200 pt-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                {copy.labels.currentStatus}: {' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  {copy.statuses[resolvedDayStatus(day)]}
                </span>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" disabled={isSaving} onClick={onClose}>
                  {copy.labels.cancel}
                </Button>
                <Button
                  type="button"
                  disabled={isSaving}
                  className="bg-[#143675] text-white hover:bg-[#0f2855]"
                  onClick={async () => {
                    const didSave = await onSave(day.date, pendingStatus);
                    if (didSave) {
                      onClose();
                    }
                  }}
                >
                  {copy.labels.save}
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.labels.kioskQrTitle}</DialogTitle>
          <DialogDescription>{kioskLink || copy.labels.kioskTokenUnavailable}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={copy.labels.kioskQrTitle} className="h-72 w-72 rounded-2xl border border-gray-200 bg-white p-3" />
          ) : (
            <div className="flex h-72 w-72 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
              {copy.loading}
            </div>
          )}
          <Button type="button" variant="outline" className="w-full gap-2" onClick={onCopy}>
            <Copy className="h-4 w-4" />
            {copy.labels.copyKioskLink}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
