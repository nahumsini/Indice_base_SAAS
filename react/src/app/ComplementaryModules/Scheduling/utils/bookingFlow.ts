export const bookingSteps = ['choose','time','contact','review'] as const;
export type BookingStep = typeof bookingSteps[number];
export type BookingProgress = { step: BookingStep; summary: string };
export type BookingContact = { attendeeName: string; attendeeEmail: string; attendeeCompany: string; attendeePhone: string; contactConsent: boolean };
export const emptyBookingContact: BookingContact = { attendeeName:'',attendeeEmail:'',attendeeCompany:'',attendeePhone:'',contactConsent:false };
export const validBookingContact = (contact: BookingContact) => Boolean(contact.attendeeName.trim()) && contact.attendeeName.length <= 180
  && /^[^\s@]+@[^\s@]+$/.test(contact.attendeeEmail.trim()) && contact.attendeeEmail.length <= 240
  && contact.attendeeCompany.length <= 180 && contact.attendeePhone.length <= 40 && contact.contactConsent;

export function slotDateBounds(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)!.value;
  const min = `${part('year')}-${part('month')}-${part('day')}`;
  const last = new Date(`${min}T00:00:00Z`); last.setUTCDate(last.getUTCDate()+90);
  return {min,max:last.toISOString().slice(0,10)};
}
