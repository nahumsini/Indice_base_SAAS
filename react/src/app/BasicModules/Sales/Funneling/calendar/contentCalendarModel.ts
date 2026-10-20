import { campaignCopy } from '../campaignCopy';
import type { CampaignBrief } from '../campaignModel';
import type { FunnelPlan } from '../funnelModel';
import { contentCalendarCopy } from './contentCalendarCopy';

export const contentFormats = ['REEL', 'STORY', 'CAROUSEL', 'POST', 'META_AD', 'SEARCH_AD'] as const;
export const contentChannels = ['INSTAGRAM', 'FACEBOOK', 'GOOGLE_SEARCH'] as const;
export const contentStatuses = ['IDEA', 'PLANNED', 'READY', 'PUBLISHED', 'CANCELLED'] as const;
export const contentPurposes = ['ATTRACT', 'TRUST', 'CONVERT', 'RETAIN'] as const;
export type ContentEntry = {
  id: string; title: string; format: typeof contentFormats[number]; channel: typeof contentChannels[number];
  status: typeof contentStatuses[number]; date: string | null; time: string | null;
  purpose: typeof contentPurposes[number]; brief: string; callToAction: string; owner: string; reference: string;
};
export type ContentSettings = {
  startDate: string; weeks: number; days: number[]; time: string;
  goal: Exclude<CampaignBrief['goal'], 'UNDECIDED'>; topic: string;
  channels: ContentEntry['channel'][]; formats: ContentEntry['format'][];
};
export type ContentDocument = { timeZone: string; settings: ContentSettings | null; entries: ContentEntry[] };
export type ContentCalendar = { content: ContentDocument; version: number; updatedAt: string | null; actorKey: string };
export type CalendarInput = { content: ContentDocument; version: number; mutationId: string };
export type CalendarMode = 'month' | 'week' | 'agenda';
export const channelNames = { INSTAGRAM: 'Instagram', FACEBOOK: 'Facebook', GOOGLE_SEARCH: 'Google Ads · Search' };
export const compatibleFormat = (channel: ContentEntry['channel'], format: ContentEntry['format']) => (channel === 'GOOGLE_SEARCH') === (format === 'SEARCH_AD');
export function validDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= '2000-01-01' && date <= '2100-12-31'
    && Number.isFinite(Date.parse(date)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
}
export function dateInZone(zone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year','month','day'].map(type => parts.find(part => part.type === type)?.value).join('-');
}
export function addDays(date: string, amount: number): string {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + amount); return d.toISOString().slice(0, 10);
}
export function shiftPeriod(date: string, mode: CalendarMode, direction: number): string {
  if (mode === 'week') return addDays(date, direction * 7);
  const d = new Date(`${date.slice(0, 7)}-01T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + direction); return d.toISOString().slice(0, 10);
}
export function calendarDays(date: string, mode: CalendarMode): string[] {
  const first = mode === 'week' ? date : `${date.slice(0, 7)}-01`;
  const weekday = new Date(`${first}T12:00:00Z`).getUTCDay();
  const start = addDays(first, -(weekday + 6) % 7);
  return Array.from({ length: mode === 'week' ? 7 : 42 }, (_, index) => addDays(start, index));
}
export function sortedEntries(entries: ContentEntry[]): ContentEntry[] {
  return [...entries].sort((a,b) => (a.date || '9999').localeCompare(b.date || '9999')
    || (a.time || '99:99').localeCompare(b.time || '99:99') || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
}
export function newContentEntry(date: string | null): ContentEntry {
  return { id: crypto.randomUUID(), title: '', format: 'REEL', channel: 'INSTAGRAM', status: date ? 'PLANNED' : 'IDEA',
    date, time: null, purpose: 'ATTRACT', brief: '', callToAction: '', owner: '', reference: '' };
}
export function validEntry(entry: ContentEntry): boolean {
  return Boolean(entry.title.trim() && entry.title.length <= 180 && compatibleFormat(entry.channel, entry.format)
    && (!entry.date ? ['IDEA','CANCELLED'].includes(entry.status) && !entry.time : validDate(entry.date))
    && (!entry.time || /^([01]\d|2[0-3]):[0-5]\d$/.test(entry.time))
    && (!entry.reference || /^https?:\/\/[^\s]+$/.test(entry.reference)));
}
export function defaultSettings(plan: FunnelPlan, today: string): ContentSettings {
  const search = plan.workshop?.channels.includes('GOOGLE_SEARCH');
  const meta = plan.workshop?.channels.includes('META_ADS');
  const onlySearch = search && plan.workshop?.channels.length === 1;
  return { startDate: today, weeks: 2, days: [1,3,5], time: '10:00',
    goal: plan.workshop?.goal && plan.workshop.goal !== 'UNDECIDED' ? plan.workshop.goal : 'INQUIRIES',
    topic: (plan.contentGuide?.topic || plan.workshop?.offer || '').slice(0,300),
    channels: onlySearch ? ['GOOGLE_SEARCH'] : search ? ['INSTAGRAM','GOOGLE_SEARCH'] : ['INSTAGRAM'],
    formats: onlySearch ? ['SEARCH_AD'] : ['REEL','STORY','CAROUSEL',...(meta ? ['META_AD' as const] : []),...(search ? ['SEARCH_AD' as const] : [])] };
}
export function validSettings(s: ContentSettings): boolean {
  return Boolean(s.topic.trim() && s.topic.length <= 300 && validDate(s.startDate) && s.weeks >= 1 && s.weeks <= 8 && Number.isInteger(s.weeks)
    && s.days.length && s.days.every(day => Number.isInteger(day) && day >= 0 && day <= 6) && new Set(s.days).size === s.days.length
    && /^([01]\d|2[0-3]):[0-5]\d$/.test(s.time) && s.channels.length && s.formats.length
    && s.channels.every(channel => s.formats.some(format => compatibleFormat(channel,format)))
    && s.formats.every(format => s.channels.some(channel => compatibleFormat(channel,format)))
    && addDays(s.startDate,s.weeks*7-1) <= '2100-12-31');
}
/** Deterministic editorial suggestions, explicitly reviewed by the user before adding. */
export function suggestContent(plan: FunnelPlan, settings: ContentSettings, locale: string): ContentEntry[] {
  if (!validSettings(settings)) return [];
  const c = contentCalendarCopy(locale), campaign = campaignCopy(locale);
  const dates = Array.from({length: settings.weeks * 7}, (_, i) => addDays(settings.startDate, i))
    .filter(date => settings.days.includes(new Date(`${date}T12:00:00Z`).getUTCDay()));
  const counts: Partial<Record<ContentEntry['channel'],number>> = {};
  return dates.map((date,index) => {
    const channel = settings.channels[index % settings.channels.length];
    const formats = settings.formats.filter(format => compatibleFormat(channel,format));
    const count = counts[channel] ?? 0; counts[channel] = count + 1;
    const format = formats[count % formats.length];
    const fraction = index / Math.max(1, dates.length - 1);
    const purpose: ContentEntry['purpose'] = settings.goal === 'RENEWALS' ? 'RETAIN'
      : settings.goal === 'AWARENESS' ? (index % 3 === 2 ? 'TRUST' : 'ATTRACT')
      : format === 'SEARCH_AD' ? 'CONVERT' : fraction < .34 ? 'ATTRACT' : fraction < .67 ? 'TRUST' : 'CONVERT';
    const theme = format === 'SEARCH_AD' ? 2 + count % 3 : purpose === 'ATTRACT' ? index % 2 : purpose === 'TRUST' ? 2 + index % 2 : purpose === 'RETAIN' ? 5 : 4;
    const context = [plan.audience,
      plan.workshop?.destinationDetail].filter(Boolean).join('\n');
    return { ...newContentEntry(date), title: `${c.themes[theme]} ${settings.topic.trim()}`.slice(0,180), channel, format, purpose,
      time: settings.time, brief: `${c.guidance[purpose]}\n\n${c.production[format]}${context ? `\n\n${context}` : ''}`.slice(0,2000),
      callToAction: campaign[`goal_${settings.goal}`] };
  });
}
