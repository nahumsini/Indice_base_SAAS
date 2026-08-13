import type { PlatformConsultingAppointment } from "../../api/platformAdmin";

export type SessionInput = {
  companyId: number;
  companyName: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  topic: string;
  mode: PlatformConsultingAppointment["consultation_mode"];
  startAt: string;
  timezone: string;
  durationMinutes: number;
  consultantName: string;
  consultantEmail: string;
  consultantPhone: string;
  meetingUrl: string;
  serviceLocationCode: string;
  serviceLocationName: string;
  countryCode: string;
};
