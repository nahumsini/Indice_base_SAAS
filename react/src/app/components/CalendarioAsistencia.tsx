import { useEffect, useMemo, useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import type { AttendanceCalendarDay } from '../api/humanResources';
import { useLanguage } from '../shared/context';

interface CalendarioAsistenciaProps {
  colaboradorNombre: string;
  month: string;
  days: AttendanceCalendarDay[];
  isLoading: boolean;
  onMonthChange: (month: string) => void;
  onUpdateStatus: (
    date: string,
    status: 'on_time' | 'late' | 'leave' | 'rest' | 'absence' | '',
  ) => Promise<void>;
}

const calendarCopy = {
  en: {
    title: 'Attendance calendar',
    subtitle: 'Review monthly history, evidence, and only apply manual corrections when needed.',
    noRecord: 'No record',
    statusLabels: {
      on_time: 'On time',
      late: 'Late',
      leave: 'Leave',
      rest: 'Rest',
      absence: 'No record',
    },
    legend: {
      entry: 'Check-in',
      exit: 'Check-out',
      today: 'Current day',
      selected: 'Selected day',
    },
    labels: {
      month: 'Month',
      recordedDays: 'Days with records',
      lateDays: 'Late days',
      correctedDays: 'Corrected days',
      noRecordDays: 'No record days',
      selectDay: 'Select a day to inspect timestamps, evidence, and any manual override.',
      dayDetails: 'Day details',
      effectiveStatus: 'Effective status',
      systemStatus: 'System status',
      manualCorrection: 'Manual correction',
      noManualCorrection: 'No manual correction',
      entry: 'Check-in',
      exit: 'Check-out',
      minutesLate: 'Minutes late',
      notes: 'Notes',
      evidence: 'Evidence',
      noEvidence: 'No photo evidence stored for this day.',
      location: 'Location',
      openLocation: 'Open in maps',
      overrideTools: 'Manual correction tools',
      overrideHint: 'Use these options only when the system result needs a back-office override.',
      clearSelection: 'Clear selection',
    },
    actions: {
      markAs: 'Mark as',
      clearCorrection: 'Clear manual correction',
    },
    badges: {
      corrected: 'Correction active',
      entryRegistered: 'Check-in recorded',
      exitRegistered: 'Check-out recorded',
    },
  },
  es: {
    title: 'Calendario de asistencia',
    subtitle: 'Revisa el historial mensual, la evidencia y usa correcciones manuales solo cuando sea necesario.',
    noRecord: 'Sin registro',
    statusLabels: {
      on_time: 'Asistencia',
      late: 'Retardo',
      leave: 'Permiso',
      rest: 'Descanso',
      absence: 'Sin registro',
    },
    legend: {
      entry: 'Entrada',
      exit: 'Salida',
      today: 'Día actual',
      selected: 'Día seleccionado',
    },
    labels: {
      month: 'Mes',
      recordedDays: 'Días con registros',
      lateDays: 'Días con retardo',
      correctedDays: 'Días corregidos',
      noRecordDays: 'Días sin registro',
      selectDay: 'Selecciona un día para revisar horas, evidencia y cualquier corrección manual.',
      dayDetails: 'Detalle del día',
      effectiveStatus: 'Estatus efectivo',
      systemStatus: 'Estatus del sistema',
      manualCorrection: 'Corrección manual',
      noManualCorrection: 'Sin corrección manual',
      entry: 'Entrada',
      exit: 'Salida',
      minutesLate: 'Minutos tarde',
      notes: 'Notas',
      evidence: 'Evidencia',
      noEvidence: 'No hay evidencia fotográfica guardada para este día.',
      location: 'Ubicación',
      openLocation: 'Abrir en mapas',
      overrideTools: 'Herramientas de corrección manual',
      overrideHint: 'Usa estas opciones solo cuando el resultado del sistema necesite un ajuste administrativo.',
      clearSelection: 'Limpiar selección',
    },
    actions: {
      markAs: 'Marcar como',
      clearCorrection: 'Limpiar corrección manual',
    },
    badges: {
      corrected: 'Corrección activa',
      entryRegistered: 'Entrada registrada',
      exitRegistered: 'Salida registrada',
    },
  },
} as const;

const statusTones: Record<
  AttendanceCalendarDay['effective_status'],
  { chip: string; buttonTone: string; subtleTone: string }
> = {
  on_time: {
    chip: 'bg-emerald-500',
    buttonTone: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    subtleTone: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
  late: {
    chip: 'bg-amber-500',
    buttonTone: 'bg-amber-600 hover:bg-amber-700 text-white',
    subtleTone: 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  },
  leave: {
    chip: 'bg-sky-500',
    buttonTone: 'bg-sky-600 hover:bg-sky-700 text-white',
    subtleTone: 'bg-sky-500/10 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  },
  rest: {
    chip: 'bg-gray-400',
    buttonTone: 'bg-gray-600 hover:bg-gray-700 text-white',
    subtleTone: 'bg-gray-500/10 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300',
  },
  absence: {
    chip: 'bg-rose-500',
    buttonTone: 'bg-rose-600 hover:bg-rose-700 text-white',
    subtleTone: 'bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  },
};

const formatMonthLabel = (month: string, locale: string) => {
  const [year, monthIndex] = month.split('-').map(Number);
  const labelDate = new Date(year, monthIndex - 1, 1);

  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(labelDate);
};

const getWeekdayLabels = (locale: string) =>
  Array.from({ length: 7 }).map((_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2026, 0, 4 + index)),
  );

const toMonthValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
};

const formatDateTime = (value: string | null | undefined, locale: string, fallback: string) => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const formatFullDate = (value: string, locale: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
};

export function CalendarioAsistencia({
  colaboradorNombre,
  month,
  days,
  isLoading,
  onMonthChange,
  onUpdateStatus,
}: CalendarioAsistenciaProps) {
  const { currentLanguage } = useLanguage();
  const copy = currentLanguage.code.startsWith('es') ? calendarCopy.es : calendarCopy.en;
  const [selectedDay, setSelectedDay] = useState<AttendanceCalendarDay | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentMonthDate = useMemo(() => new Date(`${month}-01T00:00:00`), [month]);
  const weekdayLabels = useMemo(() => getWeekdayLabels(currentLanguage.code), [currentLanguage.code]);
  const daysMap = useMemo(() => new Map(days.map((day) => [day.day, day])), [days]);
  const monthlySummary = useMemo(() => ({
    recordedDays: days.filter((day) => day.entry_registered || day.exit_registered).length,
    lateDays: days.filter((day) => day.effective_status === 'late').length,
    correctedDays: days.filter((day) => Boolean(day.corrected_status)).length,
    noRecordDays: days.filter((day) => day.effective_status === 'absence').length,
  }), [days]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1);
    const offset = firstDay.getDay();
    const daysInMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0).getDate();
    const cells: Array<number | null> = [];

    for (let index = 0; index < offset; index += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(day);
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [currentMonthDate]);

  useEffect(() => {
    setSelectedDay(null);
  }, [colaboradorNombre, month]);

  useEffect(() => {
    if (!selectedDay) {
      return;
    }

    const refreshedDay = days.find((day) => day.date === selectedDay.date);
    if (!refreshedDay) {
      setSelectedDay(null);
      return;
    }

    if (refreshedDay !== selectedDay) {
      setSelectedDay(refreshedDay);
    }
  }, [days, selectedDay]);

  const goToPreviousMonth = () => {
    const previous = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1);
    onMonthChange(toMonthValue(previous));
  };

  const goToNextMonth = () => {
    const next = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1);
    onMonthChange(toMonthValue(next));
  };

  const handleUpdateStatus = async (status: AttendanceCalendarDay['effective_status'] | '') => {
    if (!selectedDay) {
      return;
    }

    try {
      setIsSaving(true);
      await onUpdateStatus(selectedDay.date, status);
    } finally {
      setIsSaving(false);
    }
  };

  const summaryCards = [
    {
      label: copy.labels.recordedDays,
      value: monthlySummary.recordedDays,
      tone: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: copy.labels.lateDays,
      value: monthlySummary.lateDays,
      tone: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: copy.labels.correctedDays,
      value: monthlySummary.correctedDays,
      tone: 'text-[#143675] dark:text-[#8bb3ff]',
    },
    {
      label: copy.labels.noRecordDays,
      value: monthlySummary.noRecordDays,
      tone: 'text-rose-600 dark:text-rose-400',
    },
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{copy.title}</h3>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{colaboradorNombre}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{copy.subtitle}</p>
        </div>

        <div className="flex flex-col gap-2 sm:min-w-[220px]">
          <label className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
            {copy.labels.month}
          </label>
          <input
            type="month"
            value={month}
            onChange={(event) => onMonthChange(event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40"
          >
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
              {card.label}
            </p>
            <p className={`mt-3 text-2xl font-semibold ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <h4 className="text-base font-medium capitalize text-gray-900 dark:text-white">
          {formatMonthLabel(month, currentLanguage.code)}
        </h4>
      </div>

      <div className="mb-6">
        <div className="mb-2 grid grid-cols-7 gap-2">
          {weekdayLabels.map((weekday) => (
            <div key={weekday} className="py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
              {weekday}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {isLoading
            ? Array.from({ length: 35 }).map((_, index) => (
                <Skeleton key={index} className="h-[92px] rounded-lg" />
              ))
            : calendarCells.map((day, index) => {
                const dayData = day ? daysMap.get(day) : undefined;
                const statusLabel = dayData ? copy.statusLabels[dayData.effective_status] : null;
                const statusTone = dayData ? statusTones[dayData.effective_status] : null;
                const today = new Date();
                const isToday =
                  day !== null &&
                  today.getFullYear() === currentMonthDate.getFullYear() &&
                  today.getMonth() === currentMonthDate.getMonth() &&
                  today.getDate() === day;
                const isSelected = Boolean(dayData && selectedDay?.date === dayData.date);

                return (
                  <button
                    key={`${day ?? 'empty'}-${index}`}
                    type="button"
                    disabled={!dayData}
                    onClick={() => dayData && setSelectedDay(dayData)}
                    className={`min-h-[92px] rounded-lg border p-2 text-left transition-all ${
                      dayData
                        ? 'border-gray-200 hover:border-[#143675]/40 hover:shadow-sm dark:border-gray-700'
                        : 'cursor-default border-transparent bg-gray-50 dark:bg-gray-900/40'
                    } ${isToday ? 'ring-2 ring-[#143675]/35' : ''} ${isSelected ? 'border-[#143675] ring-2 ring-[#143675]/25' : ''}`}
                  >
                    {day ? (
                      <div className="flex h-full flex-col">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{day}</span>
                          {isSelected ? (
                            <span className="rounded-full bg-[#143675]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#143675] dark:bg-[#143675]/20 dark:text-[#8bb3ff]">
                              {copy.legend.selected}
                            </span>
                          ) : null}
                        </div>

                        {dayData ? (
                          <>
                            <div className="mb-2 flex gap-1">
                              {dayData.entry_registered ? (
                                <div className="h-2 w-2 rounded-full bg-emerald-500" title={copy.badges.entryRegistered} />
                              ) : null}
                              {dayData.exit_registered ? (
                                <div className="h-2 w-2 rounded-full bg-sky-500" title={copy.badges.exitRegistered} />
                              ) : null}
                            </div>

                            <div className={`w-fit rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${statusTone?.chip}`}>
                              {statusLabel}
                            </div>

                            {dayData.corrected_status ? (
                              <p className="mt-auto pt-2 text-[10px] text-[#143675] dark:text-[#8bb3ff]">
                                {copy.badges.corrected}
                              </p>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </button>
                );
              })}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 border-t border-gray-200 pt-4 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <span>{copy.legend.entry}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-sky-500" />
          <span>{copy.legend.exit}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-[#143675]" />
          <span>{copy.legend.today}</span>
        </div>
      </div>

      <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
        {selectedDay ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                    {copy.labels.dayDetails}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatFullDate(selectedDay.date, currentLanguage.code)}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDay(null)}
                  className="gap-2 self-start"
                >
                  <X className="h-4 w-4" />
                  {copy.labels.clearSelection}
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                    {copy.labels.effectiveStatus}
                  </p>
                  <div className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-sm font-medium ${statusTones[selectedDay.effective_status].subtleTone}`}>
                    {copy.statusLabels[selectedDay.effective_status]}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                    {copy.labels.systemStatus}
                  </p>
                  <div className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-sm font-medium ${statusTones[selectedDay.system_status].subtleTone}`}>
                    {copy.statusLabels[selectedDay.system_status]}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                    {copy.labels.manualCorrection}
                  </p>
                  <div className="mt-3 inline-flex rounded-full bg-[#143675]/10 px-2.5 py-1 text-sm font-medium text-[#143675] dark:bg-[#143675]/20 dark:text-[#8bb3ff]">
                    {selectedDay.corrected_status
                      ? copy.statusLabels[selectedDay.corrected_status]
                      : copy.labels.noManualCorrection}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                    {copy.labels.entry}
                  </p>
                  <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    {formatDateTime(selectedDay.first_check_in_at, currentLanguage.code, copy.noRecord)}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                    {copy.labels.exit}
                  </p>
                  <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    {formatDateTime(selectedDay.last_check_out_at, currentLanguage.code, copy.noRecord)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                  {copy.labels.minutesLate}
                </p>
                <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  {selectedDay.minutes_late}
                </p>
                {selectedDay.notes ? (
                  <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                      {copy.labels.notes}
                    </p>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{selectedDay.notes}</p>
                  </div>
                ) : null}
              </div>

              {selectedDay.first_location || selectedDay.last_location ? (
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                    {copy.labels.location}
                  </p>
                  <div className="mt-3 space-y-3">
                    {[selectedDay.first_location, selectedDay.last_location]
                      .filter((location): location is NonNullable<typeof location> => Boolean(location))
                      .map((location, index) => (
                        <div key={`${location.id}-${index}`} className="flex flex-col gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/70">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            {location.name}
                          </div>
                          <a
                            href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-xs text-[#143675] hover:underline dark:text-[#8bb3ff]"
                          >
                            <MapPin className="h-3 w-3" />
                            {copy.labels.openLocation}
                          </a>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                  {copy.labels.evidence}
                </p>

                {selectedDay.first_photo_url || selectedDay.last_photo_url ? (
                  <div className="mt-3 grid grid-cols-1 gap-3">
                    {selectedDay.first_photo_url ? (
                      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                        <img
                          src={selectedDay.first_photo_url}
                          alt={copy.labels.entry}
                          className="h-40 w-full object-cover"
                        />
                        <div className="inline-flex items-center gap-2 px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                          <Camera className="h-3.5 w-3.5" />
                          {copy.labels.entry}
                        </div>
                      </div>
                    ) : null}
                    {selectedDay.last_photo_url ? (
                      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                        <img
                          src={selectedDay.last_photo_url}
                          alt={copy.labels.exit}
                          className="h-40 w-full object-cover"
                        />
                        <div className="inline-flex items-center gap-2 px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                          <Camera className="h-3.5 w-3.5" />
                          {copy.labels.exit}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-400">
                    {copy.labels.noEvidence}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                  {copy.labels.overrideTools}
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {copy.labels.overrideHint}
                </p>

                <div className="mt-4 grid gap-2">
                  {(Object.keys(statusTones) as Array<AttendanceCalendarDay['effective_status']>).map((status) => (
                    <Button
                      key={status}
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        void handleUpdateStatus(status);
                      }}
                      className={`w-full justify-start gap-3 ${statusTones[status].buttonTone}`}
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
                      {copy.actions.markAs} {copy.statusLabels[status].toLowerCase()}
                    </Button>
                  ))}

                  {selectedDay.corrected_status ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSaving}
                      onClick={() => {
                        void handleUpdateStatus('');
                      }}
                      className="w-full"
                    >
                      {copy.actions.clearCorrection}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
            {copy.labels.selectDay}
          </div>
        )}
      </div>
    </div>
  );
}
