import { apiClient } from '../../../../lib/apiClient';
import type { CalendarInput, ContentCalendar } from './contentCalendarModel';
const path = (id: string) => `/api/v1/sales/funnels/${encodeURIComponent(id)}/content-calendar`;
export const contentCalendarApi = {
  get: (id: string, signal?: AbortSignal) => apiClient<ContentCalendar>(path(id), { signal }),
  save: (id: string, body: CalendarInput, actorKey: string) => apiClient<ContentCalendar>(path(id), {
    method: 'PUT', headers: { 'X-Content-Calendar-Actor': actorKey }, body: JSON.stringify(body),
  }),
};
