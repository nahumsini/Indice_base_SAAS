import { Input } from '../../../../components/ui/input';
import { useState } from 'react';
import { useLanguage } from '../../../../shared/context';
import type { SalesOpportunity } from '../../salesCrmContext';
import { getOpportunitySchedule } from '../utils/prospectosFormatters';
import { getOpportunityReminderCopy } from '../translations/opportunityReminderCopy';

export function OpportunityScheduleInlineEditor({
  opportunity,
  onScheduleChange,
}: {
  opportunity: SalesOpportunity;
  onScheduleChange: (opportunity: SalesOpportunity, date: string, time: string) => void | Promise<void>;
}) {
  const schedule = getOpportunitySchedule(opportunity);
  const [saving, setSaving] = useState(false);
  const save = async (date: string, time: string) => {
    setSaving(true);
    try { await onScheduleChange(opportunity, date, time); }
    catch { /* The Sales sync banner reports the failure; keep the confirmed schedule. */ }
    finally { setSaving(false); }
  };
  const { currentLanguage } = useLanguage();
  const reminder = getOpportunityReminderCopy(currentLanguage.code);
  const callOpen = opportunity.nextAction === 'Call' && (opportunity.lifecycleStatus ?? 'OPEN') === 'OPEN'
    && opportunity.status !== 'Closed' && opportunity.status !== 'On hold';
  const reminderReady = Boolean(schedule.date && schedule.time && opportunity.ownerUserCompanyId);

  return (
    <div className="flex max-w-full min-w-0 flex-wrap gap-2">
      <Input
        type="date"
        aria-label={reminder.date}
        disabled={saving}
        value={schedule.date}
        onChange={(event) => void save(event.target.value, schedule.time)}
        className="h-9 min-w-0 flex-[1_1_132px] rounded-full border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-none focus:border-[#2563EB] focus:ring-[#2563EB]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />
      <Input
        type="time"
        aria-label={reminder.time}
        disabled={saving || !schedule.date}
        value={schedule.time}
        onChange={(event) => void save(schedule.date, event.target.value)}
        className="h-9 min-w-0 flex-[1_1_104px] rounded-full border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-none focus:border-[#2563EB] focus:ring-[#2563EB]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />
      {callOpen ? <p className="w-full text-xs text-slate-500 dark:text-slate-400">
        {reminderReady ? reminder.ready : reminder.pending}
        {reminderReady && opportunity.nextActionTimezone ? ` · ${opportunity.nextActionTimezone}` : ''}
      </p> : null}
    </div>
  );
}
