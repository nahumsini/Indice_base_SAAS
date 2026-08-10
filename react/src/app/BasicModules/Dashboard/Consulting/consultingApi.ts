import { apiClient } from '../../../lib/apiClient';

export type ConsultingAppointmentStatus = 'REQUESTED' | 'PAYMENT_REQUIRED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface ConsultingAppointment {
  id: number;
  attendee_name: string;
  attendee_email: string;
  attendee_phone: string | null;
  topic: string;
  notes: string | null;
  preferred_start_at: string;
  alternative_start_at: string | null;
  timezone: string;
  duration_minutes: number;
  consultation_mode: 'VIRTUAL' | 'IN_PERSON';
  country_code: string | null;
  service_location_code: string | null;
  service_location_name: string | null;
  session_kind: 'INCLUDED' | 'ADDITIONAL';
  status: ConsultingAppointmentStatus;
  payment_status: 'INCLUDED' | 'QUOTE_PENDING' | 'PENDING' | 'PAID' | 'WAIVED' | 'REFUNDED';
  amount_cents: number | null;
  currency: string;
  confirmed_start_at: string | null;
  meeting_url: string | null;
  meeting_url_configured: boolean;
  meeting_link_available: boolean;
  join_available_at: string | null;
  consultant_name: string | null;
  consultant_email: string | null;
  consultant_phone: string | null;
  notification_status: 'PENDING' | 'SENT' | 'FAILED' | 'DISABLED';
  cancelled_at: string | null;
  created_at: string;
}

export interface ConsultingWorkspace {
  duration_minutes: number;
  join_window_minutes: number;
  included_session_available: boolean;
  additional_session_amount_cents: number;
  currency: string;
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  topics: Array<{
    value: string;
    label: string;
    emoji: string;
    category: 'service' | 'module';
  }>;
  in_person_locations: Array<{
    id: number;
    location_code: string;
    country_code: string;
    country_name: string;
    region_name: string;
    city_name: string;
    timezone: string;
    active: boolean;
    in_person_fee_cents: number | null;
    currency: string;
  }>;
  appointments: ConsultingAppointment[];
}

export interface ConsultingBookingPayload {
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  topic: string;
  notes: string;
  preferredStartAt: string;
  alternativeStartAt: string | null;
  timezone: string;
  consultationMode: 'VIRTUAL' | 'IN_PERSON';
  countryCode: string | null;
  serviceLocationCode: string | null;
}

export const consultingApi = {
  workspace: () => apiClient<ConsultingWorkspace>('/api/v1/consulting/workspace'),
  create: (payload: ConsultingBookingPayload) => apiClient<ConsultingAppointment>('/api/v1/consulting/appointments', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  cancel: (appointmentId: number, reason = '') => apiClient<ConsultingAppointment>(
    `/api/v1/consulting/appointments/${appointmentId}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
  ),
};
