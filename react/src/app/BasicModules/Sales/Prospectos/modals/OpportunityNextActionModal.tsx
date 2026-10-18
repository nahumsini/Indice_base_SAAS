import { useEffect, useId, useRef } from 'react';
import { CalendarClock, CalendarDays, ClipboardCheck, FileText, Handshake, Mail, MessageCircle, Phone, RotateCw } from 'lucide-react';
import { Input } from '../../../../components/ui/input';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../components/ui/utils';
import { IndiceModalSummary, IndiceModalValidation } from '../../../../components/indice-modal';
import { getFormFeedbackCopy } from '../../../../components/indice-modal/formFeedbackCopy';
import { useLanguage } from '../../../../shared/context';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import { opportunityNextActions, type OpportunityNextAction, type SalesOpportunity } from '../../types/opportunities';
import type { ProspectosCopy } from '../translations';
import { getNextActionCopy } from '../translations/nextActionCopy';
import { getOpportunityReminderCopy } from '../translations/opportunityReminderCopy';
import { useNextActionDraft } from '../hooks/useNextActionDraft';
import { callReminderState, nextActionDay, nextActionDraft, type NextActionPatch } from '../utils/nextActionDraft';

const actions = getSalesModalActionClassNames('coral');
const actionIcons = { Call: Phone, WhatsApp: MessageCircle, Email: Mail, Meeting: CalendarDays,
  'Send proposal': FileText, 'Follow up': RotateCw, 'Review documents': ClipboardCheck, 'Close deal': Handshake };
const shortcutClass = 'min-h-9 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-[#FF6B5E]/50 hover:bg-[#FF6B5E]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';

/** Standard Form Modal: a single action/schedule draft, using the existing Sales save contract. */
export function OpportunityNextActionModal({ opportunity, businessTimezone, copy, onSave, onClose }: {
  opportunity: SalesOpportunity; businessTimezone: string; copy: ProspectosCopy;
  onSave: (id: string, patch: NextActionPatch) => Promise<unknown>; onClose: () => void;
}) {
  const { currentLanguage } = useLanguage();
  const labels = getNextActionCopy(currentLanguage.code);
  const reminder = getOpportunityReminderCopy(currentLanguage.code);
  const feedback = getFormFeedbackCopy(currentLanguage.code);
  const editor = useNextActionDraft(opportunity, onSave, onClose, labels.saveFailed);
  const { draft } = editor;
  const id = useId();
  const returnFocus = useRef(typeof document === 'undefined' ? null : document.activeElement as HTMLElement | null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const trigger = returnFocus.current;
      window.requestAnimationFrame(() => { if (!mounted.current && trigger?.isConnected) trigger.focus({ preventScroll: true }); });
    };
  }, []);
  const initial = nextActionDraft(opportunity);
  const scheduleChanged = draft.date !== initial.date || draft.time !== initial.time;
  const timeZone = scheduleChanged ? businessTimezone : opportunity.nextActionTimezone || businessTimezone;
  const reminderState = callReminderState(opportunity, draft, timeZone);
  const dateLabel = draft.date && !editor.validation
    ? new Intl.DateTimeFormat(currentLanguage.code, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(draft.date + 'T12:00:00Z')) : labels.unscheduled;
  const summary = [copy.options.nextActions[draft.action], dateLabel, draft.date ? draft.time || labels.dateOnly : ''].filter(Boolean).join(' · ');

  return <SalesModalFrame open onOpenChange={open => { if (!open) editor.close(); }}
    title={copy.agenda.nextAction} description={labels.description} icon={<CalendarClock className="h-5 w-5" />}
    modalType="standard-form" busy={editor.saving} closeLabel={copy.modal.cancel}
    bodyClassName="space-y-4" footerSummary={<div className="space-y-1"><p>{summary}</p>{!editor.dirty ? <p className="text-xs">{labels.noChanges}</p> : null}</div>}
    footer={<>
      <Button type="button" variant="outline" className={actions.secondary} disabled={editor.saving} onClick={editor.close}>{copy.modal.cancel}</Button>
      <Button type="submit" form={id} className={actions.primary} disabled={editor.saving || !editor.dirty || Boolean(editor.validation)}>{editor.saving ? feedback.saving : copy.modal.saveChanges}</Button>
    </>}>
    <IndiceModalSummary title={opportunity.opportunityName} variant="muted" columns={2} items={[
      { label: copy.modal.fields.contact, value: opportunity.contactPerson || opportunity.company },
      { label: copy.modal.fields.owner, value: opportunity.owner || '—' },
    ]} />
    <form id={id} className="space-y-4" onSubmit={event => { event.preventDefault(); void editor.save(); }}>
      <IndiceModalValidation messages={editor.error ? [editor.error] : []} />
      <fieldset disabled={editor.saving} className="space-y-2.5">
        <legend className="text-sm font-medium text-slate-800 dark:text-slate-100">{labels.type}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {opportunityNextActions.map((action: OpportunityNextAction) => {
            const Icon = actionIcons[action];
            return <label key={action} className="min-w-0 cursor-pointer">
              <input type="radio" name={id + '-action'} value={action} checked={draft.action === action} autoFocus={initial.action === action} onChange={() => editor.update({ action })} className="peer sr-only" />
              <span className={cn('flex min-h-12 h-full items-center gap-2 rounded-xl border px-3 py-2 text-sm leading-5 peer-focus-visible:ring-2 peer-focus-visible:ring-[#FF6B5E] peer-disabled:opacity-50',
                draft.action === action ? 'border-[#FF6B5E] bg-[#FF6B5E]/10 text-[#b63b32] dark:text-[#ff9c93]' : 'border-slate-200 bg-white text-slate-600 hover:border-[#FF6B5E]/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300')}>
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />{copy.options.nextActions[action]}
              </span>
            </label>;
          })}
        </div>
      </fieldset>
      <fieldset disabled={editor.saving} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <legend className="px-1 text-sm font-medium text-slate-800 dark:text-slate-100">{labels.when}</legend>
        <div className="flex flex-wrap gap-2">
          {([{ days: 0, label: labels.today }, { days: 1, label: labels.tomorrow }, { days: 7, label: labels.nextWeek }]).map(shortcut => <button key={shortcut.days} type="button" className={shortcutClass} disabled={!nextActionDay(businessTimezone, shortcut.days)} onClick={() => editor.update({ date: nextActionDay(businessTimezone, shortcut.days) })}>{shortcut.label}</button>)}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><label htmlFor={id + '-date'} className="text-sm font-medium text-slate-700 dark:text-slate-200">{reminder.date}</label>
            <Input id={id + '-date'} type="date" value={draft.date} aria-invalid={editor.validation === 'invalidDate' || editor.validation === 'chooseDate'} aria-describedby={id + '-schedule-help'} onChange={event => editor.update({ date: event.target.value, ...(!event.target.value ? { time: '' } : {}) })} />
          </div>
          <div className="space-y-1.5"><label htmlFor={id + '-time'} className="text-sm font-medium text-slate-700 dark:text-slate-200">{reminder.time}</label>
            <Input id={id + '-time'} type="time" step={60} value={draft.time} disabled={!draft.date || editor.saving} aria-invalid={editor.validation === 'invalidTime'} aria-describedby={id + '-schedule-help'} onChange={event => editor.update({ time: event.target.value })} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">{['09:00', '12:00', '16:00'].map(time => <button key={time} type="button" disabled={!draft.date} aria-pressed={draft.time === time} className={cn(shortcutClass, draft.time === time && 'border-[#FF6B5E] text-[#b63b32]')} onClick={() => editor.update({ time })}>{time}</button>)}
          <button type="button" className={shortcutClass} disabled={!draft.time} onClick={() => editor.update({ time: '' })}>{labels.clearTime}</button>
          <button type="button" className={cn(shortcutClass, 'sm:ml-auto')} disabled={!draft.date && !draft.time} onClick={() => editor.update({ date: '', time: '' })}>{labels.clearDate}</button>
        </div>
        <p id={id + '-schedule-help'} className="text-xs leading-5 text-slate-500 dark:text-slate-400">{timeZone ? `${labels.timezone} · ${timeZone}` : labels.timezonePending}</p>
      </fieldset>
      <IndiceModalValidation messages={editor.validation ? [labels[editor.validation]] : []} />
      {reminderState ? <IndiceModalValidation tone={reminderState === 'callReminder' ? 'info' : 'warning'} messages={[labels[reminderState]]} /> : null}
    </form>
  </SalesModalFrame>;
}
