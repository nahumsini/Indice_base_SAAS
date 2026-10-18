import type { OpportunityFlowStage, SalesOpportunity } from '../../types/opportunities';
import { parseMoney } from '../utils/prospectosFormatters';

export type KanbanSort = 'next_action' | 'newest' | 'oldest' | 'amount';
export type KanbanAttention = 'all' | 'overdue' | 'unscheduled';
export type KanbanTiming = ReturnType<typeof getKanbanTiming>;

function wallNow(now: Date, timezone: string) {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  } catch {
    formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  }
  const parts = Object.fromEntries(formatter.formatToParts(now).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function getKanbanTiming(opportunity: SalesOpportunity, stage: OpportunityFlowStage | undefined, now: Date, timezone: string) {
  const match = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/.exec(opportunity.nextActionDate.trim());
  const date = match?.[1] ?? '';
  const time = match?.[2] ?? '';
  const current = wallNow(now, opportunity.nextActionTimezone || timezone);
  const instant = opportunity.nextActionScheduledAt ? Date.parse(opportunity.nextActionScheduledAt) : NaN;
  const lifecycle = stage?.type ?? opportunity.lifecycleStatus;
  const closed = lifecycle === 'WON' || lifecycle === 'LOST' || opportunity.status === 'Closed';
  const paused = opportunity.status === 'On hold';
  const missingSchedule = !date || !time;
  const overdue = !closed && !paused && Boolean(date) && (Number.isFinite(instant)
    ? instant < now.getTime()
    : date < current.date || (date === current.date && Boolean(time) && time < current.time));
  const state = closed ? 'closed' : paused ? 'paused' : overdue ? 'overdue'
    : missingSchedule ? 'unscheduled' : date === current.date ? 'today' : 'scheduled';
  return {
    state, date, time, today: date === current.date,
    unscheduled: !closed && !paused && missingSchedule,
    order: { overdue: 0, today: 1, unscheduled: 2, scheduled: 3, paused: 4, closed: 5 }[state],
    timestamp: Number.isFinite(instant) ? instant : date ? Date.parse(`${date}T${time || '23:59'}:00Z`) : Infinity,
  };
}

export function matchesKanbanAttention(timing: KanbanTiming, attention: KanbanAttention) {
  return attention === 'all' || (attention === 'overdue' ? timing.state === 'overdue' : timing.unscheduled);
}

export function sortKanbanOpportunities(opportunities: SalesOpportunity[], sort: KanbanSort, timings: Map<string, KanbanTiming>) {
  return [...opportunities].sort((a, b) => {
    let difference = 0;
    if (sort === 'next_action') {
      const left = timings.get(a.id)!; const right = timings.get(b.id)!;
      difference = left.order - right.order || left.timestamp - right.timestamp;
    } else if (sort === 'amount') {
      // Different currencies are separate groups, never a fabricated converted ranking.
      difference = (a.currency || '').localeCompare(b.currency || '') || parseMoney(b.estimatedValue) - parseMoney(a.estimatedValue);
    } else {
      const left = Date.parse(a.createdAt || ''); const right = Date.parse(b.createdAt || '');
      if (!Number.isFinite(left) || !Number.isFinite(right)) {
        difference = Number.isFinite(left) ? -1 : Number.isFinite(right) ? 1 : 0;
      } else difference = sort === 'newest' ? right - left : left - right;
    }
    return difference || a.id.localeCompare(b.id, undefined, { numeric: true });
  });
}

export const kanbanWorkspaceDefaults = { sort: 'next_action' as KanbanSort, attention: 'all' as KanbanAttention, attentionStage: '', mobileStage: '' };
export function validateKanbanWorkspace(value: typeof kanbanWorkspaceDefaults, stages: OpportunityFlowStage[]) {
  const validStage = (key: string) => stages.some(stage => stage.key === key);
  return {
    sort: (['next_action', 'newest', 'oldest', 'amount'].includes(value.sort) ? value.sort : 'next_action') as KanbanSort,
    attention: (['all', 'overdue', 'unscheduled'].includes(value.attention) ? value.attention : 'all') as KanbanAttention,
    attentionStage: validStage(value.attentionStage) ? value.attentionStage : '',
    mobileStage: validStage(value.mobileStage) ? value.mobileStage : stages[0]?.key ?? '',
  };
}
