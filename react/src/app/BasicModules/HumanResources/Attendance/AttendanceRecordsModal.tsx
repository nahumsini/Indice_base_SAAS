import { CalendarDays, X } from 'lucide-react';
import { CalendarioAsistencia } from '../../../components/CalendarioAsistencia';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import type { AttendanceCalendarResponse } from '../../../api/humanResources';

interface AttendanceRecordsModalProps {
  calendar: AttendanceCalendarResponse | null;
  closeLabel: string;
  emptyMessage: string;
  isLoadingCalendar: boolean;
  isOpen: boolean;
  month: string;
  subtitle: string;
  title: string;
  onMonthChange: (month: string) => void;
  onOpenChange: (open: boolean) => void;
}

export function AttendanceRecordsModal({
  calendar,
  closeLabel,
  emptyMessage,
  isLoadingCalendar,
  isOpen,
  month,
  subtitle,
  title,
  onMonthChange,
  onOpenChange,
}: AttendanceRecordsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white p-0 text-gray-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100 sm:max-w-[1040px]"
        overlayClassName="bg-slate-950/55 backdrop-blur-sm"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 items-start justify-between gap-4 bg-[#59C3A5] px-6 py-4 text-white dark:bg-[#59C3A5]">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold tracking-tight text-white">
                {title}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-white/80">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label={closeLabel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-5 py-5 dark:bg-slate-950/40">
          {calendar ? (
            <CalendarioAsistencia
              colaboradorNombre={calendar.user.full_name}
              month={month}
              days={calendar.items}
              isLoading={isLoadingCalendar}
              onMonthChange={onMonthChange}
              displayMode="embedded"
              readOnly
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-10 text-center text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-400">
              {emptyMessage}
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end bg-[#59C3A5] px-6 py-3 dark:bg-[#59C3A5]">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/25 bg-white text-[#59C3A5] shadow-sm hover:bg-white/90 hover:text-[#59C3A5]"
          >
            {closeLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
