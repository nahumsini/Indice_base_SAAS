import type { CalendarWorkspace, Event, Reservation } from '../services/schedulingApi';
import { dateInput } from './dateScope';
export type CalendarActivity = {kind:'reservation';key:string;at:string;record:Reservation}|{kind:'event';key:string;at:string;event:Event};
/** Preserve both owner record types and their loaded scope; ordering is shared by grid and agenda. */
export function activitiesForDay(workspace:CalendarWorkspace,date:string):CalendarActivity[]{
  return [...workspace.items.filter(r=>dateInput(new Date(r.startAt))===date).map(record=>({kind:'reservation' as const,key:`reservation-${record.id}`,at:record.startAt,record})),
    ...workspace.events.filter(e=>dateInput(new Date(e.startAt))===date).map(event=>({kind:'event' as const,key:`event-${event.id}`,at:event.startAt,event}))]
    .sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||a.key.localeCompare(b.key));
}
