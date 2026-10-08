import { apiClient, buildApiUrl } from '../../../lib/apiClient';

export type ReservationStatus = 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'PAUSED';
export type Service = { id: number; name: string; description: string; durationMinutes: number; bufferMinutes: number; noticeHours: number; active: boolean; version: number };
export type AvailabilityDay = { dayOfWeek: number; startTime: string; endTime: string };
export type Staff = { id: number; userId: number; publicName: string; timezone: string; active: boolean; version: number; days: AvailabilityDay[] };
export type PageAppearance = { brandName: string; accentColor: string; surfaceColor: string; buttonLabel: string; layout: 'cards' | 'compact' };
export type BookingPage = { id: number; alias: string; title: string; description: string; published: boolean; version: number; publicUrl: string; appearance?: PageAppearance };
export type Event = { id: number; staffId: number; title: string; description: string; startAt: string; durationMinutes: number; capacity: number; confirmedCount: number; published: boolean; status: string; version: number };
export type Reservation = { id: number; reference: string; staffId: number; serviceId: number | null; eventId: number | null; serviceName: string; staffName: string; attendeeName: string; attendeeEmail: string; attendeeCompany: string; startAt: string; durationMinutes: number; status: ReservationStatus; version: number; pausedFromStatus?: ReservationStatus | null; archivedAt?: string | null };
export type CalendarWorkspace = { items: Reservation[]; total: number; events: Event[]; eventsTotal: number };
export type Client = { id: number; companyName: string; contactPerson: string; email: string; phone: string; status: string };
export type ReservationPage = { items: Reservation[]; total: number; page: number; pageSize: number };
export type Metrics = { requests: number; confirmed: number; completed: number; noShow: number; cancelled: number; attendanceRate: number | null };
export type PublicEvent = { id: number; staffId: number; title: string; description: string; startAt: string; durationMinutes: number; availablePlaces: number };
export type BookingCatalog = { title: string; description: string; services: Pick<Service, 'id' | 'name' | 'description' | 'durationMinutes' | 'noticeHours'>[]; staff: Pick<Staff, 'id' | 'publicName' | 'timezone'>[]; events: PublicEvent[]; appearance?: PageAppearance };
export type SlotRequest = { serviceId: number; staffId: number; date: string };
export type Slots = { timezone: string; starts: string[] };
export type BookingRequest = { serviceId: number | null; eventId: number | null; staffId: number; startAt: string; attendeeName: string; attendeeEmail: string; attendeeCompany: string; attendeePhone: string; contactConsent: boolean };
export type Submission = { status: string; submissionPolicy: 'REVIEW_REQUIRED'; reference?: string };
export type Range = { from: string; to: string };
const root = '/api/v1/scheduling';
const save = <T>(path: string, body: unknown, method = 'POST') => apiClient<T>(path, { method, body: JSON.stringify(body) });
export const schedulingApi = {
  services: (signal?: AbortSignal) => apiClient<Service[]>(`${root}/services`, { signal }),
  staff: (signal?: AbortSignal) => apiClient<Staff[]>(`${root}/staff`, { signal }),
  members: (signal?: AbortSignal) => apiClient<{ id: number; name: string }[]>(`${root}/members`, { signal }),
  page: (signal?: AbortSignal) => apiClient<BookingPage | null>(`${root}/page`, { signal }),
  readiness: (signal?: AbortSignal) => apiClient<{ publicAccessEnabled: boolean }>(`${root}/readiness`, { signal }),
  links: (signal?: AbortSignal) => apiClient<{ publicUrl: string | null }>(`${root}/links`, { signal }),
  events: (signal?: AbortSignal) => apiClient<Event[]>(`${root}/events`, { signal }),
  catalog: (signal?: AbortSignal) => apiClient<BookingCatalog>(`${root}/catalog`, { signal }),
  staffOptions: (signal?: AbortSignal) => apiClient<Pick<Staff, 'id' | 'publicName' | 'timezone' | 'active'>[]>(`${root}/staff-options`, { signal }),
  clients: (search: string, page: number, pageSize: number, signal?: AbortSignal) => apiClient<{ items: Client[]; total: number; page: number; pageSize: number }>(`${root}/clients?${new URLSearchParams({ search, page: String(page), pageSize: String(pageSize) })}`, { signal }),
  calendarGrid: (range: Range, staffId?: number, status?: ReservationStatus, signal?: AbortSignal) => apiClient<CalendarWorkspace>(`${root}/calendar-grid?${new URLSearchParams({ ...range, ...(staffId ? { staffId: String(staffId) } : {}), ...(status ? { status } : {}) })}`, { signal }),
  reservations: (tab: 'calendar' | 'reservations', range: Range, page: number, pageSize: number, signal?: AbortSignal, status?: ReservationStatus, staffId?: number, includeArchived = false) =>
    apiClient<ReservationPage>(`${root}/${tab}?${new URLSearchParams({ ...range, page: String(page), pageSize: String(pageSize), ...(status ? { status } : {}), ...(staffId ? { staffId: String(staffId) } : {}), includeArchived: String(includeArchived) })}`, { signal }),
  metrics: (range: Range, signal?: AbortSignal) => apiClient<Metrics>(`${root}/metrics?${new URLSearchParams(range)}`, { signal }),
  saveService: (body: Omit<Service, 'id' | 'version'> & { version?: number }, id?: number) => save<void>(`${root}/services${id ? `/${id}` : ''}`, body, id ? 'PUT' : 'POST'),
  saveStaff: (body: Omit<Staff, 'id' | 'version'> & { version?: number }, id?: number) => save<void>(`${root}/staff${id ? `/${id}` : ''}`, body, id ? 'PUT' : 'POST'),
  savePage: (body: Omit<BookingPage, 'id' | 'version' | 'publicUrl'> & { version?: number }) => save<BookingPage>(`${root}/page`, body, 'PUT'),
  saveEvent: (body: Omit<Event, 'id' | 'version' | 'confirmedCount' | 'status'> & { version?: number }, id?: number) => save<void>(`${root}/events${id ? `/${id}` : ''}`, body, id ? 'PUT' : 'POST'),
  cancelEvent: (record: Event, reason: string) => save<void>(`${root}/events/${record.id}/cancel`, { status: 'CANCELLED', reason, version: record.version }),
  slots: (body: SlotRequest, signal?: AbortSignal) => apiClient<Slots>(`${root}/slots`, { method: 'POST', body: JSON.stringify(body), signal }),
  request: (body: BookingRequest, key: string) => apiClient<Submission>(`${root}/reservations`, { method: 'POST', body: JSON.stringify(body), headers: { 'Idempotency-Key': key } }),
  transition: (record: Reservation, status: ReservationStatus, reason: string) => save<Reservation>(`${root}/reservations/${record.id}/status`, { status, reason, version: record.version }),
  reassign: (record: Reservation, staffId: number, reason: string) => save<Reservation>(`${root}/reservations/${record.id}/assignment`, { staffId, reason, version: record.version }),
  manage: (record: Reservation, action: 'PAUSE' | 'RESUME' | 'ARCHIVE', reason: string) => save<Reservation>(`${root}/reservations/${record.id}/management`, { action, reason, version: record.version }),
};

/** Public kiosk requests never load or replace the authenticated ERP session/CSRF cache. */
async function publicRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(buildApiUrl(path), { cache: 'no-store', credentials: 'include', ...init,
    headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('scheduling_unavailable');
  return response.json() as Promise<T>;
}
export const publicSchedulingApi = {
  resolve: (alias: string, signal?: AbortSignal) => publicRequest<{ token: string }>(`/api/v1/public/scheduling/${encodeURIComponent(alias)}`, { signal }),
  bootstrap: async (token: string, signal?: AbortSignal) => {
    const result = await publicRequest<{ data: BookingCatalog & { csrfToken: string } }>(`/api/v2/kiosks/public/${encodeURIComponent(token)}/bootstrap`, { signal });
    return result.data;
  },
  slots: async (token: string, csrf: string, body: SlotRequest, signal?: AbortSignal) => {
    const result = await publicRequest<{ data: Slots }>(`/api/v2/kiosks/public/${encodeURIComponent(token)}/actions/scheduling.slots.read@1`,
      { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: JSON.stringify(body), signal });
    return result.data;
  },
  request: async (token: string, csrf: string, body: BookingRequest, idempotencyKey: string) => {
    const result = await publicRequest<{ data: Submission }>(`/api/v2/kiosks/public/${encodeURIComponent(token)}/actions/scheduling.reservation.request@1`,
      { method: 'POST', headers: { 'X-CSRF-Token': csrf, 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(body) });
    return result.data;
  },
};
