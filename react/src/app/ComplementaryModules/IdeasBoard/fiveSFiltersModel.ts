import type {IdeaNode, FiveSMetadata} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import {localDateKey, matchesFiveS} from './fiveSModel';

export type FiveSStatus = NonNullable<FiveSMetadata['status']>;
export type FiveSDateFilter = 'ALL' | 'TODAY' | 'NEXT_SEVEN' | 'OVERDUE' | 'UNDATED' | 'CUSTOM' | 'REVIEWS';
export type FiveSActionFilters = {
  search: string;
  owner: string;
  status: 'ALL' | FiveSStatus;
  date: FiveSDateFilter;
  from: string;
  to: string;
};
export const defaultFiveSFilters: FiveSActionFilters = {search:'', owner:'ALL', status:'ALL', date:'ALL', from:'', to:''};
export const fiveSStatuses: FiveSStatus[] = ['PENDING', 'IN_PROGRESS', 'VERIFIED'];
const searchable = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
// Names are documentary metadata, not employee identities. Prefix values to avoid sentinel collisions.
export const fiveSOwnerValue = (name: string) => `name:${name.trim()}`;
export function fiveSOwners(actions: IdeaNode[], locale: string) {
  return [...new Set(actions.map(node => node.fiveS?.owner?.trim() ?? '').filter(Boolean))]
    .sort((a,b) => a.localeCompare(b,locale));
}
export function hasFiveSFilters(filters: FiveSActionFilters) {
  return !!filters.search.trim() || filters.owner !== 'ALL' || filters.status !== 'ALL' || filters.date !== 'ALL';
}
export function invalidFiveSRange(filters: FiveSActionFilters) {
  return filters.date === 'CUSTOM' && !!filters.from && !!filters.to && filters.from > filters.to;
}
export function filterFiveSActions(actions: IdeaNode[], filters: FiveSActionFilters, today = localDateKey()) {
  const query = searchable(filters.search.trim());
  const end = new Date(`${today}T12:00:00`);
  end.setDate(end.getDate()+6);
  const lastDay = localDateKey(end);
  return actions.filter(node => {
    const f = node.fiveS;
    if (f?.role !== 'ACTION' || invalidFiveSRange(filters)) return false;
    const owner = f.owner?.trim() ?? '';
    if (filters.owner === 'UNASSIGNED' ? !!owner : filters.owner !== 'ALL' && fiveSOwnerValue(owner) !== filters.owner) return false;
    if (filters.status !== 'ALL' && (f.status ?? 'PENDING') !== filters.status) return false;
    if (query && !searchable([node.text,f.action,owner].join(' ')).includes(query)) return false;
    switch(filters.date) {
      case 'TODAY': return f.dueDate === today;
      case 'NEXT_SEVEN': return !!f.dueDate && f.dueDate >= today && f.dueDate <= lastDay;
      case 'OVERDUE': return matchesFiveS(node,'OVERDUE',today);
      case 'UNDATED': return !f.dueDate;
      case 'REVIEWS': return matchesFiveS(node,'REVIEWS',today);
      case 'CUSTOM': return !!f.dueDate && (!filters.from || f.dueDate >= filters.from) && (!filters.to || f.dueDate <= filters.to);
      default: return true;
    }
  });
}
export function fiveSProgress(actions: IdeaNode[], filters: FiveSActionFilters, today = localDateKey()) {
  // Keep the denominator and sibling counts stable when selecting a status facet.
  const base = filterFiveSActions(actions,{...filters,status:'ALL'},today);
  const counts = {PENDING:0,IN_PROGRESS:0,VERIFIED:0};
  base.forEach(node => counts[node.fiveS?.status ?? 'PENDING']++);
  return {total:base.length, counts, percent:base.length ? Math.round(counts.VERIFIED/base.length*100) : 0};
}
