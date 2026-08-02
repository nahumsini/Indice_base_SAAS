import { useEffect, useMemo, useState } from 'react';
import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Moon,
} from 'lucide-react';
import {
  humanResourcesApi,
  type AttendanceCalendarDay,
  type AttendanceCalendarResponse,
} from '../../../../api/humanResources';
import { FailureToast } from '../../../../components/FailureToast';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../../components/LoadingBarOverlay';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Skeleton } from '../../../../components/ui/skeleton';
import { cn } from '../../../../components/ui/utils';
import { useLanguage } from '../../../../shared/context';
import { todayIsoDate, todayMonth } from '../../Attendance/utils/attendance.utils';

const copyByLanguage = {
  en: {
    title: 'My shift calendar',
    loadingTitle: 'Loading calendar',
    loadingDescription: 'Checking your assigned shifts.',
    month: 'Month',
    shift: 'Shift',
    openShift: 'Open shift',
    restDay: 'Rest day',
    noShift: 'No shift',
    selectedDay: 'Selected day',
    today: 'Today',
    details: 'Shift details',
    schedule: 'Schedule',
    start: 'Start',
    end: 'End',
    flexible: 'Flexible',
    workSite: 'Work site',
    template: 'Template',
    meal: 'Meal',
    rest: 'Rest',
    overnight: 'Overnight shift',
    notAssigned: 'No shift assigned for this day.',
    restAssigned: 'This day is marked as rest.',
    pickDay: 'No day selected.',
    minutes: 'min',
    retry: 'Unable to load your shift calendar.',
  },
  es: {
    title: 'Mi calendario de turnos',
    loadingTitle: 'Cargando calendario',
    loadingDescription: 'Revisando tus turnos asignados.',
    month: 'Mes',
    shift: 'Turno',
    openShift: 'Turno abierto',
    restDay: 'Descanso',
    noShift: 'Sin turno',
    selectedDay: 'Dia seleccionado',
    today: 'Hoy',
    details: 'Detalle del turno',
    schedule: 'Horario',
    start: 'Inicio',
    end: 'Fin',
    flexible: 'Flexible',
    workSite: 'Sitio de trabajo',
    template: 'Plantilla',
    meal: 'Comida',
    rest: 'Descanso',
    overnight: 'Turno nocturno',
    notAssigned: 'No hay turno asignado para este dia.',
    restAssigned: 'Este dia esta marcado como descanso.',
    pickDay: 'No hay dia seleccionado.',
    minutes: 'min',
    retry: 'No se pudo cargar tu calendario de turnos.',
  },
} as const;

const getCopy = (languageCode: string) => (
  languageCode.startsWith('es') ? copyByLanguage.es : copyByLanguage.en
);

const toMonthDate = (month: string) => new Date(`${month}-01T00:00:00`);

const toMonthValue = (date: Date) => {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
};

const getCalendarCells = (month: string) => {
  const date = toMonthDate(month);
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = firstDay.getDay();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
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
};

const getWeekdayLabels = (locale: string) =>
  Array.from({ length: 7 }).map((_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2026, 0, 4 + index)),
  );

const formatMonthLabel = (month: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(toMonthDate(month));

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

const formatScheduleTime = (value: string | null | undefined, locale: string) => {
  if (!value) {
    return null;
  }

  const [hourValue, minuteValue] = value.split(':').map(Number);
  if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue)) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(2026, 0, 1, hourValue, minuteValue));
};

const dateForMonthDay = (month: string, day: number) => `${month}-${`${day}`.padStart(2, '0')}`;

const hasAssignedShift = (day: AttendanceCalendarDay | null | undefined) =>
  Boolean(day?.schedule_rule && !day.schedule_rule.is_rest_day);

const isRestDay = (day: AttendanceCalendarDay | null | undefined) =>
  Boolean(day?.schedule_rule?.is_rest_day || day?.effective_status === 'rest');

const resolveWorkSiteName = (day: AttendanceCalendarDay | null | undefined) => (
  day?.active_work_site?.location_name
  || day?.active_work_site?.location?.name
  || day?.schedule_rule?.location_name
  || ''
);

const resolveTemplateName = (day: AttendanceCalendarDay | null | undefined) => (
  day?.active_work_site?.template_name
  || (day?.schedule_rule?.template_id ? `#${day.schedule_rule.template_id}` : '')
);

const dayTone = (day: AttendanceCalendarDay | null | undefined, isSelected: boolean, isToday: boolean) => {
  if (!day) {
    return cn(
      'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200',
      isSelected ? 'ring-2 ring-[#143675]/25 dark:ring-[#8bb3ff]/30' : '',
      isToday ? 'ring-2 ring-[#59C3A5]/35' : '',
    );
  }

  if (hasAssignedShift(day)) {
    return cn(
      'border-[#59C3A5]/35 bg-[#59C3A5]/10 text-slate-950 hover:border-[#59C3A5] dark:border-[#8FE0CA]/35 dark:bg-[#59C3A5]/20 dark:text-white',
      isSelected ? 'ring-2 ring-[#143675]/25 dark:ring-[#8bb3ff]/30' : '',
      isToday ? 'ring-2 ring-[#59C3A5]/35' : '',
    );
  }

  if (isRestDay(day)) {
    return cn(
      'border-indigo-200 bg-indigo-50 text-indigo-950 hover:border-indigo-300 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-100',
      isSelected ? 'ring-2 ring-indigo-400/35' : '',
      isToday ? 'ring-2 ring-[#59C3A5]/35' : '',
    );
  }

  return cn(
    'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400',
    isSelected ? 'ring-2 ring-slate-300 dark:ring-slate-600' : '',
    isToday ? 'ring-2 ring-[#59C3A5]/35' : '',
  );
};

export function SelfShiftCalendar() {
  const { currentLanguage } = useLanguage();
  const locale = currentLanguage.code;
  const copy = getCopy(locale);
  const [calendarMonth, setCalendarMonth] = useState(todayMonth());
  const [selectedDate, setSelectedDate] = useState(todayIsoDate());
  const [calendar, setCalendar] = useState<AttendanceCalendarResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const calendarCells = useMemo(() => getCalendarCells(calendarMonth), [calendarMonth]);
  const weekdayLabels = useMemo(() => getWeekdayLabels(locale), [locale]);
  const dayByDate = useMemo(
    () => new Map((calendar?.items ?? []).map((day) => [day.date, day])),
    [calendar?.items],
  );
  const selectedDay = selectedDate ? dayByDate.get(selectedDate) ?? null : null;
  const selectedHasShift = hasAssignedShift(selectedDay);
  const selectedIsRest = isRestDay(selectedDay);
  const selectedWorkSiteName = resolveWorkSiteName(selectedDay);
  const selectedTemplateName = resolveTemplateName(selectedDay);
  const selectedStartTime = formatScheduleTime(selectedDay?.schedule_rule?.start_time, locale);
  const selectedEndTime = formatScheduleTime(selectedDay?.schedule_rule?.end_time, locale);
  const selectedScheduleLabel = selectedHasShift
    ? `${selectedStartTime ?? copy.flexible} - ${selectedEndTime ?? copy.flexible}`
    : null;

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setErrorMessage('');

    void runWithMinimumDuration(humanResourcesApi.getMyAttendanceCalendar(calendarMonth))
      .then((response) => {
        if (active) {
          setCalendar(response);
        }
      })
      .catch((error) => {
        if (active) {
          setCalendar(null);
          setErrorMessage(error instanceof Error ? error.message : copy.retry);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [calendarMonth, copy.retry]);

  const shiftMonth = (direction: -1 | 1) => {
    const current = toMonthDate(calendarMonth);
    const nextMonth = toMonthValue(new Date(current.getFullYear(), current.getMonth() + direction, 1));
    setCalendarMonth(nextMonth);
    setSelectedDate((currentDate) => (
      currentDate.startsWith(nextMonth) ? currentDate : `${nextMonth}-01`
    ));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#143675]/10 text-[#143675] dark:bg-[#8bb3ff]/15 dark:text-[#8bb3ff]">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-medium text-slate-950 dark:text-white">{copy.title}</h2>
              {calendar?.user.full_name ? (
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">{calendar.user.full_name}</p>
              ) : null}
            </div>
          </div>
        </div>

        <label className="flex flex-col gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 sm:min-w-[220px]">
          {copy.month}
          <input
            type="month"
            value={calendarMonth}
            onChange={(event) => {
              const nextMonth = event.target.value;
              if (!nextMonth) {
                return;
              }
              setCalendarMonth(nextMonth);
              setSelectedDate(`${nextMonth}-01`);
            }}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-950 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </label>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-base font-medium capitalize text-slate-950 dark:text-white">
              {formatMonthLabel(calendarMonth, locale)}
            </h3>
            <Button variant="outline" size="icon" onClick={() => shiftMonth(1)} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {weekdayLabels.map((weekday) => (
              <div key={weekday} className="py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                {weekday}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {Array.from({ length: 35 }).map((_, index) => (
                <Skeleton key={index} className="h-[72px] rounded-lg sm:h-[96px]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {calendarCells.map((dayNumber, index) => {
                if (dayNumber === null) {
                  return <div key={`empty-${index}`} className="h-[72px] sm:h-[96px]" />;
                }

                const date = dateForMonthDay(calendarMonth, dayNumber);
                const day = dayByDate.get(date) ?? null;
                const today = date === todayIsoDate();
                const selected = date === selectedDate;
                const dayHasShift = hasAssignedShift(day);
                const dayIsRest = isRestDay(day);

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      'min-h-[72px] rounded-lg border p-2 text-left transition hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#59C3A5]/30 sm:min-h-[96px]',
                      dayTone(day, selected, today),
                    )}
                  >
                    <div className="flex h-full flex-col">
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-sm font-medium">{dayNumber}</span>
                        {today ? (
                          <span className="rounded-full bg-[#59C3A5]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#217f6b] dark:text-[#8FE0CA]">
                            {copy.today}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-auto space-y-1 pt-2">
                        {dayHasShift ? (
                          <>
                            <span className="block truncate text-xs font-medium">{copy.shift}</span>
                            <span className="block truncate text-[11px] text-slate-600 dark:text-slate-300">
                              {formatScheduleTime(day?.schedule_rule?.start_time, locale) ?? copy.flexible}
                            </span>
                          </>
                        ) : dayIsRest ? (
                          <span className="block truncate text-xs font-medium">{copy.restDay}</span>
                        ) : (
                          <span className="block truncate text-xs">{copy.noShift}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {copy.selectedDay}
              </p>
              <h3 className="mt-1 text-lg font-medium text-slate-950 dark:text-white">
                {selectedDate ? formatFullDate(selectedDate, locale) : copy.pickDay}
              </h3>
            </div>
            {selectedHasShift ? (
              <Badge className="bg-[#59C3A5]/15 text-[#217f6b] dark:bg-[#59C3A5]/20 dark:text-[#8FE0CA]">
                {selectedDay?.schedule_rule?.schedule_mode === 'open' ? copy.openShift : copy.shift}
              </Badge>
            ) : selectedIsRest ? (
              <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200">
                {copy.restDay}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-slate-500 dark:text-slate-300">
                {copy.noShift}
              </Badge>
            )}
          </div>

          {selectedHasShift ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-950 dark:text-white">
                  <Clock3 className="h-4 w-4 text-[#143675] dark:text-[#8bb3ff]" />
                  {copy.schedule}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.start}</p>
                    <p className="mt-1 font-medium text-slate-950 dark:text-white">{selectedStartTime ?? copy.flexible}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.end}</p>
                    <p className="mt-1 font-medium text-slate-950 dark:text-white">{selectedEndTime ?? copy.flexible}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{selectedScheduleLabel}</p>
              </div>

              {selectedWorkSiteName ? (
                <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-[#59C3A5]" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.workSite}</p>
                      <p className="mt-1 text-sm font-medium text-slate-950 dark:text-white">{selectedWorkSiteName}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {selectedTemplateName ? (
                <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="flex items-start gap-2">
                    <BriefcaseBusiness className="mt-0.5 h-4 w-4 text-[#143675] dark:text-[#8bb3ff]" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.template}</p>
                      <p className="mt-1 text-sm font-medium text-slate-950 dark:text-white">{selectedTemplateName}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.meal}</p>
                  <p className="mt-1 text-sm font-medium text-slate-950 dark:text-white">
                    {selectedDay?.schedule_rule?.meal_minutes ?? 0} {copy.minutes}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.rest}</p>
                  <p className="mt-1 text-sm font-medium text-slate-950 dark:text-white">
                    {selectedDay?.schedule_rule?.rest_minutes ?? 0} {copy.minutes}
                  </p>
                </div>
              </div>

              {selectedDay?.schedule_rule?.is_overnight ? (
                <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-100">
                  <Moon className="h-4 w-4" />
                  {copy.overnight}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
              {selectedIsRest ? copy.restAssigned : selectedDate ? copy.notAssigned : copy.pickDay}
            </div>
          )}
        </aside>
      </div>

      <LoadingBarOverlay
        isVisible={isLoading}
        title={copy.loadingTitle}
        description={copy.loadingDescription}
      />
      <FailureToast
        isVisible={Boolean(errorMessage)}
        message={errorMessage}
        onClose={() => setErrorMessage('')}
      />
    </div>
  );
}
