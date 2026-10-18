import type { ContinuityItem, SaveContinuityWork } from './postSaleWorkspaceApi';
export function workDraft(item: ContinuityItem): Omit<SaveContinuityWork, 'requestKey'> {
  return { version: item.version, flowId: item.flowId, stageKey: item.kind === 'won' ? item.stageKey : 'pending',
    ownerId: item.ownerId, nextAction: item.nextAction, nextActionDate: item.nextActionDate,
    notes: item.notes, lossReason: item.lossReason, paused: item.recoveryStatus === 'paused' };
}
export function addCalendarDays(today: string, days: number) {
  const date = new Date(`${today}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10);
}
export function isContinuityDone(item: ContinuityItem) {
  return item.kind === 'won' ? item.stageKey === 'completed' : ['recovered', 'paused'].includes(item.recoveryStatus);
}
export function continuityUrgency(item: ContinuityItem, today: string) {
  if (isContinuityDone(item)) return 'done';
  if (!item.nextActionDate) return 'unscheduled';
  return item.nextActionDate < today ? 'overdue' : item.nextActionDate === today ? 'today' : 'upcoming';
}
export const continuityColors: Record<string, string> = {
  BLUE: '#3384ff', AQUA: '#59c3a5', GREEN: '#00a676', YELLOW: '#f4c84a', CORAL: '#ff6b5e', VIOLET: '#8b5cf6', SLATE: '#94a3b8',
};
export function errorStatus(error: unknown): number { return typeof error === 'object' && error && 'status' in error ? Number(error.status) : 0; }

export function formatContinuityDate(value: string, locale: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}
export function formatContinuityEventTime(value: string, locale: string, timeZone: string) {
  const date = new Date(value.endsWith('Z') ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(date);
}
