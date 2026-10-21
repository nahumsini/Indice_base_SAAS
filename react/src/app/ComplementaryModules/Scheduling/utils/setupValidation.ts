import type { AvailabilityDay } from '../services/schedulingApi';
/** Compare local wall times, never browser-zone instants. Windows can touch but cannot overlap. */
export function validWeeklyHours(days: AvailabilityDay[]) {
  if(days.length>28)return false;
  const ordered=[...days].sort((a,b)=>a.dayOfWeek-b.dayOfWeek||a.startTime.localeCompare(b.startTime));
  return ordered.every((row,i)=>row.dayOfWeek>=1&&row.dayOfWeek<=7&&/^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(row.startTime)&&/^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(row.endTime)&&row.startTime.slice(0,5)<row.endTime.slice(0,5)&&(!i||ordered[i-1].dayOfWeek!==row.dayOfWeek||ordered[i-1].endTime.slice(0,5)<=row.startTime.slice(0,5)));
}
export class SchedulingValidationError extends Error { constructor(public code:string){super(code);} }
