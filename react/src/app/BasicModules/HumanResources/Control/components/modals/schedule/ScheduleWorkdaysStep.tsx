import { Checkbox } from '../../../../../../components/ui/checkbox';
import { Button } from '../../../../../../components/ui/button';
import type { ControlTranslations } from '../../../translations';
import type { HorarioDiaDraft } from '../../../types/scheduleTypes';
import { dayName, firstSharedMinutes } from '../../../utils/scheduleFormatters';

interface ScheduleWorkdaysStepProps {
  copy: ControlTranslations;
  horarios: HorarioDiaDraft[];
  isOpenSchedule: boolean;
  onCopyMondayToAllDays: () => void;
  onHorarioChange: (index: number, field: keyof HorarioDiaDraft, value: string | number | boolean) => void;
  onWorkingDayChange: (index: number, isWorkingDay: boolean) => void;
}

export function ScheduleWorkdaysStep({
  copy,
  horarios,
  isOpenSchedule,
  onCopyMondayToAllDays,
  onHorarioChange,
  onWorkingDayChange,
}: ScheduleWorkdaysStepProps) {
  return (
    <section className="space-y-4">
      <WorkingGrid
        copy={copy}
        horarios={horarios}
        isOpenSchedule={isOpenSchedule}
        onCopyMondayToAllDays={onCopyMondayToAllDays}
        onHorarioChange={onHorarioChange}
        onWorkingDayChange={onWorkingDayChange}
      />
      <BreakConfigurationCard
        copy={copy}
        horarios={horarios}
        onHorarioChange={onHorarioChange}
      />
    </section>
  );
}

function WorkingGrid({
  copy,
  horarios,
  isOpenSchedule,
  onCopyMondayToAllDays,
  onHorarioChange,
  onWorkingDayChange,
}: ScheduleWorkdaysStepProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.schedule.workdays.eyebrow}</p>
          <h3 className="mt-1 text-sm font-medium text-slate-950 dark:text-white">{copy.schedule.workdays.title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {copy.schedule.workdays.description}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onCopyMondayToAllDays}>
          {copy.schedule.workdays.copyMonday}
        </Button>
      </div>

      <div className="grid gap-2">
        {horarios.map((horario, index) => {
          const isWorkingDay = !horario.isRestDay;
          const isOvernightShift = !horario.isRestDay
            && Boolean(horario.entrada)
            && Boolean(horario.salida)
            && horario.salida < horario.entrada;

          return (
            <div
              key={horario.dayOfWeek}
              className={`rounded-lg border p-3 transition-colors ${
                isWorkingDay
                  ? 'border-emerald-100 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                  : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex min-w-0 items-center gap-3">
                  <Checkbox
                    checked={isWorkingDay}
                    onCheckedChange={(checked) => onWorkingDayChange(index, checked === true)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-950 dark:text-white">{dayName(horario.dia, copy.schedule)}</span>
                    <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      isWorkingDay
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                    >
                      {isWorkingDay ? copy.schedule.workdays.workingDay : copy.schedule.workdays.offDay}
                    </span>
                  </span>
                </label>

                {!isOpenSchedule && isWorkingDay ? (
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 sm:w-64">
                    <label>
                      <span className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">{copy.schedule.workdays.start}</span>
                      <input
                        type="time"
                        value={horario.entrada}
                        onChange={(event) => onHorarioChange(index, 'entrada', event.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none transition-colors focus:border-[#59C3A5] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </label>
                    <span className="mt-6 text-sm font-medium text-slate-400">{copy.schedule.workdays.to}</span>
                    <label>
                      <span className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">{copy.schedule.workdays.end}</span>
                      <input
                        type="time"
                        value={horario.salida}
                        onChange={(event) => onHorarioChange(index, 'salida', event.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none transition-colors focus:border-[#59C3A5] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </label>
                  </div>
                ) : null}

                {isOpenSchedule && isWorkingDay ? (
                  <p className="rounded-md border border-emerald-100 bg-white px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-slate-950 dark:text-emerald-200">
                    {copy.schedule.workdays.openAccessDay}
                  </p>
                ) : null}
              </div>
              {isOvernightShift ? (
                <p className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-300">{copy.schedule.workdays.overnightShift}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BreakConfigurationCard({
  copy,
  horarios,
  onHorarioChange,
}: {
  copy: ControlTranslations;
  horarios: HorarioDiaDraft[];
  onHorarioChange: (index: number, field: keyof HorarioDiaDraft, value: string | number | boolean) => void;
}) {
  const mealMinutes = firstSharedMinutes(horarios, 'comida');
  const breakMinutes = firstSharedMinutes(horarios, 'descanso');
  const hasMealBreak = mealMinutes > 0;
  const hasShortBreak = breakMinutes > 0;

  const updateAllWorkingDays = (field: 'comida' | 'descanso', value: number) => {
    horarios.forEach((horario, index) => {
      onHorarioChange(index, field, horario.isRestDay ? 0 : value);
    });
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.schedule.breaks.eyebrow}</p>
        <h3 className="mt-1 text-sm font-medium text-slate-950 dark:text-white">{copy.schedule.breaks.title}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {copy.schedule.breaks.description}
        </p>
      </div>

      <div className="grid gap-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-medium text-slate-950 dark:text-white">{copy.schedule.breaks.mealTitle}</span>
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{copy.schedule.breaks.mealDescription}</span>
            </span>
            <Checkbox
              checked={hasMealBreak}
              onCheckedChange={(checked) => updateAllWorkingDays('comida', checked === true ? mealMinutes || 60 : 0)}
            />
          </label>
          {hasMealBreak ? (
            <div className="mt-3 flex items-center gap-3">
              <input
                type="number"
                min="0"
                value={mealMinutes}
                onChange={(event) => updateAllWorkingDays('comida', Number(event.target.value) || 0)}
                className="h-10 w-24 rounded-md border border-slate-200 bg-white px-3 text-center text-sm text-slate-900 outline-none focus:border-[#59C3A5] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">{copy.schedule.breaks.minutes}</span>
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-medium text-slate-950 dark:text-white">{copy.schedule.breaks.shortTitle}</span>
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{copy.schedule.breaks.shortDescription}</span>
            </span>
            <Checkbox
              checked={hasShortBreak}
              onCheckedChange={(checked) => updateAllWorkingDays('descanso', checked === true ? breakMinutes || 15 : 0)}
            />
          </label>
          {hasShortBreak ? (
            <div className="mt-3 flex items-center gap-3">
              <input
                type="number"
                min="0"
                value={breakMinutes}
                onChange={(event) => updateAllWorkingDays('descanso', Number(event.target.value) || 0)}
                className="h-10 w-24 rounded-md border border-slate-200 bg-white px-3 text-center text-sm text-slate-900 outline-none focus:border-[#59C3A5] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">{copy.schedule.breaks.minutes}</span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
