import { CalendarClock, Clock3, Trash2 } from 'lucide-react';
import { KioskModalFrame } from '../../../../components/kiosk-engine/KioskModalFrame';
import { KioskWorkspaceNotice } from '../../../../components/kiosk-engine/KioskToolWorkspace';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import type { EmployeeTaskAgendaCopy } from '../employeeTaskAgendaTranslations';
import { localEmployeeTaskDate } from '../hooks/useEmployeeTaskMultiKioskWorkspace';
import type { EmployeeTaskScheduleDraft } from '../hooks/useEmployeeTaskKioskEnhancements';
import type { PublicTaskKioskTask } from '../processTaskKioskApi';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function localDateTime(offsetMinutes = 0) {
  const value = new Date(Date.now() + offsetMinutes * 60_000);
  return {
    date: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    time: `${pad(value.getHours())}:${pad(Math.floor(value.getMinutes() / 5) * 5)}`,
  };
}

function tomorrowAtNine() {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  return {
    date: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    time: '09:00',
  };
}

export function EmployeeTaskScheduleDialog({
  busy,
  copy,
  draft,
  errorMessage,
  onChange,
  onClose,
  onRemove,
  onSave,
  task,
}: {
  busy: boolean;
  copy: EmployeeTaskAgendaCopy;
  draft: EmployeeTaskScheduleDraft;
  errorMessage: string;
  onChange: (next: EmployeeTaskScheduleDraft) => void;
  onClose: () => void;
  onRemove: () => void;
  onSave: () => void;
  task: PublicTaskKioskTask | null;
}) {
  if (!task) return null;
  const labels = copy.scheduleUi;
  const applyShortcut = (value: { date: string; time: string }) => onChange({
    ...draft, date: value.date, startTime: value.time,
  });
  const closeButton = <Button type="button" variant="outline" disabled={busy} onClick={onClose}>{copy.processUi.cancel}</Button>;

  return (
    <KioskModalFrame
      busy={busy}
      closeLabel={copy.processUi.cancel}
      description={labels.dialogDescription}
      footer={<Button type="button" disabled={busy || !draft.date} onClick={onSave}><CalendarClock aria-hidden="true" className="h-4 w-4" />{busy ? labels.saving : labels.save}</Button>}
      footerLeading={closeButton}
      footerSummary={draft.date ? `${draft.date}${draft.startTime ? ` · ${draft.startTime}` : ''}` : labels.noTime}
      icon={<Clock3 className="h-5 w-5" />}
      onOpenChange={open => { if (!open) onClose(); }}
      open
      size="form"
      surface="public"
      title={labels.dialogTitle}
      tone="yellow"
    >
      <div aria-busy={busy || undefined} className="space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-200">{task.folio}</p>
          <p className="mt-1 font-medium text-slate-950 dark:text-white">{task.title}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{labels.dialogDescription}</p>
        </div>

        {errorMessage ? <KioskWorkspaceNotice kind="error">{errorMessage}</KioskWorkspaceNotice> : null}

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="h-11 rounded-xl" disabled={busy} onClick={() => applyShortcut(localDateTime())}>{labels.quickNow}</Button>
          <Button type="button" variant="outline" className="h-11 rounded-xl" disabled={busy} onClick={() => applyShortcut(localDateTime(30))}>{labels.quickThirty}</Button>
          <Button type="button" variant="outline" className="h-11 rounded-xl" disabled={busy} onClick={() => applyShortcut({ date: localEmployeeTaskDate(), time: '15:00' })}>{labels.quickAfternoon}</Button>
          <Button type="button" variant="outline" className="h-11 rounded-xl" disabled={busy} onClick={() => applyShortcut(tomorrowAtNine())}>{labels.quickTomorrow}</Button>
        </div>

        <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{labels.date}</span>
            <Input type="date" disabled={busy} value={draft.date} onChange={event => onChange({ ...draft, date: event.target.value })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{labels.startTime}</span>
            <Input type="time" disabled={busy} value={draft.startTime} onChange={event => onChange({ ...draft, startTime: event.target.value })} />
          </label>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">{labels.duration}</legend>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[15, 30, 60, 90].map(minutes => (
              <button key={minutes} type="button" disabled={busy || !draft.startTime} className={`min-h-11 rounded-xl border px-2 text-xs font-medium transition disabled:opacity-40 ${draft.durationMinutes === minutes ? 'border-[#F4C84A] bg-[#F4C84A]/20 text-[#7A5204] dark:text-[#FDE68A]' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`} onClick={() => onChange({ ...draft, durationMinutes: minutes })}>
                {labels.minuteDuration(minutes)}
              </button>
            ))}
          </div>
        </fieldset>

        {(task.agenda_date || task.agenda_start_time) ? (
          <Button type="button" variant="ghost" className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-950/30" disabled={busy} onClick={onRemove}>
            <Trash2 aria-hidden="true" className="h-4 w-4" />{labels.remove}
          </Button>
        ) : null}
      </div>
    </KioskModalFrame>
  );
}
