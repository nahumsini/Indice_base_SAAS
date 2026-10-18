import { opportunityNextActions, type OpportunityNextAction, type SalesOpportunity } from '../../types/opportunities';
import { formatOpportunitySchedule, getOpportunitySchedule } from './prospectosFormatters';

export type NextActionDraft = { action: OpportunityNextAction; date: string; time: string };
export type NextActionPatch = Partial<Pick<SalesOpportunity, 'nextAction' | 'nextActionDate'>>;

export function nextActionDraft(opportunity: SalesOpportunity): NextActionDraft {
  return { action: opportunity.nextAction, ...getOpportunitySchedule(opportunity) };
}

export function validateNextAction(draft: NextActionDraft) {
  if (!opportunityNextActions.includes(draft.action)) return 'chooseAction';
  if (draft.time && !draft.date) return 'chooseDate';
  if (draft.date) {
    const date = new Date(draft.date + 'T12:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== draft.date) return 'invalidDate';
  }
  if (draft.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time)) return 'invalidTime';
  return null;
}

export function nextActionPatch(initial: NextActionDraft, draft: NextActionDraft): NextActionPatch {
  const patch: NextActionPatch = {};
  if (initial.action !== draft.action) patch.nextAction = draft.action;
  // Omitting an untouched schedule preserves its saved timezone and UTC instant.
  if (initial.date !== draft.date || initial.time !== draft.time) patch.nextActionDate = formatOpportunitySchedule(draft.date, draft.time);
  return patch;
}

export function companyActionClock(timeZone: string, now = new Date()) {
  if (!timeZone) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
    const part = (type: string) => parts.find(item => item.type === type)?.value;
    return { date: `${part('year')}-${part('month')}-${part('day')}`, time: `${part('hour')}:${part('minute')}` };
  } catch { return null; }
}

export function nextActionDay(timeZone: string, days: number, now = new Date()) {
  const clock = companyActionClock(timeZone, now);
  if (!clock) return '';
  const date = new Date(clock.date + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function callReminderState(opportunity: SalesOpportunity, draft: NextActionDraft, timeZone: string, now = new Date()) {
  if (draft.action !== 'Call') return null;
  if (opportunity.status === 'Closed' || opportunity.status === 'On hold'
    || (opportunity.lifecycleStatus && opportunity.lifecycleStatus !== 'OPEN')
    || (!opportunity.lifecycleStatus && ['Won', 'Lost'].includes(opportunity.stage))) return 'callInactive';
  if (!draft.date || !draft.time || !opportunity.ownerUserCompanyId) return 'callIncomplete';
  const clock = companyActionClock(timeZone, now);
  if (clock && `${draft.date} ${draft.time}` <= `${clock.date} ${clock.time}`) return 'callPast';
  return 'callReminder';
}
