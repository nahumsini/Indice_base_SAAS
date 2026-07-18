import { CalendarDays } from 'lucide-react';
import { CalendarioAsistencia } from '../../../components/CalendarioAsistencia';
import { Button } from '../../../components/ui/button';
import { IndiceModalFrame } from '../../../components/indice-modal';
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
    <IndiceModalFrame
      closeLabel={closeLabel}
      contentClassName="sm:max-w-[1040px]"
      description={subtitle}
      footer={<Button type="button" onClick={() => onOpenChange(false)}>{closeLabel}</Button>}
      icon={<CalendarDays className="h-5 w-5" />}
      modalType="operational-workspace"
      onOpenChange={onOpenChange}
      open={isOpen}
      title={title}
      tone="aqua"
    >
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
    </IndiceModalFrame>
  );
}
