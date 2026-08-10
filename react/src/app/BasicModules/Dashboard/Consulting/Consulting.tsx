import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  Globe2,
  Handshake,
  LoaderCircle,
  Mail,
  MapPin,
  Monitor,
  Phone,
  UserRound,
  XCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { ApiClientError } from '../../../lib/apiClient';
import { useLanguage } from '../../../shared/context';
import { DashboardTitleBar } from '../components/DashboardTitleBar';
import {
  consultingApi,
  type ConsultingAppointment,
  type ConsultingWorkspace,
} from './consultingApi';
import { getConsultingTranslations } from './translations';

const TIME_OPTIONS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
const ACTIVE_STATUSES = new Set(['REQUESTED', 'PAYMENT_REQUIRED', 'CONFIRMED']);
const COUNTRY_CODES = ['MX', 'CA', 'US', 'BR', 'CO'] as const;

type BookingForm = {
  preferredDate: string;
  preferredTime: string;
  alternativeDate: string;
  alternativeTime: string;
  consultationMode: 'VIRTUAL' | 'IN_PERSON';
  countryCode: string;
  serviceLocationCode: string;
  topic: string;
  notes: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
};

const EMPTY_FORM: BookingForm = {
  preferredDate: '',
  preferredTime: '10:00',
  alternativeDate: '',
  alternativeTime: '11:00',
  consultationMode: 'VIRTUAL',
  countryCode: 'MX',
  serviceLocationCode: '',
  topic: 'ONBOARDING',
  notes: '',
  attendeeName: '',
  attendeeEmail: '',
  attendeePhone: '',
};

function nextBookableDate() {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  while ([0, 6].includes(date.getDay())) date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toInstant(date: string, time: string, timeZone: string) {
  if (!date || !time) return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let candidate = wallClockUtc;
  for (let iteration = 0; iteration < 2; iteration += 1) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(candidate));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const represented = Date.UTC(
      Number(values.year), Number(values.month) - 1, Number(values.day),
      Number(values.hour), Number(values.minute), Number(values.second),
    );
    candidate += wallClockUtc - represented;
  }
  return new Date(candidate).toISOString();
}

function isBusinessDay(date: string) {
  const value = new Date(`${date}T12:00:00`);
  return !Number.isNaN(value.getTime()) && ![0, 6].includes(value.getDay());
}

export default function Consulting() {
  const { currentLanguage } = useLanguage();
  const copy = useMemo(() => getConsultingTranslations(currentLanguage.code), [currentLanguage.code]);
  const locale = currentLanguage.code || 'es-MX';
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Monterrey';
  const [workspace, setWorkspace] = useState<ConsultingWorkspace | null>(null);
  const [form, setForm] = useState<BookingForm>(EMPTY_FORM);
  const [showAlternative, setShowAlternative] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadWorkspace = useCallback(() => {
    setIsLoading(true);
    setErrorMessage('');
    consultingApi.workspace()
      .then((response) => {
        setWorkspace(response);
        setForm((current) => ({
          ...current,
          topic: response.topics.some((topic) => topic.value === current.topic)
            ? current.topic
            : response.topics[0]?.value || 'ONBOARDING',
          attendeeName: current.attendeeName || response.contact.name,
          attendeeEmail: current.attendeeEmail || response.contact.email,
          attendeePhone: current.attendeePhone || response.contact.phone,
        }));
      })
      .catch(() => setErrorMessage(copy.errorDescription))
      .finally(() => setIsLoading(false));
  }, [copy.errorDescription]);

  useEffect(() => loadWorkspace(), [loadWorkspace]);

  const activeAppointment = useMemo(() => workspace?.appointments.find((appointment) => (
    ACTIVE_STATUSES.has(appointment.status)
  )) ?? null, [workspace]);

  const selectedLocation = useMemo(() => workspace?.in_person_locations.find(
    (location) => location.location_code === form.serviceLocationCode,
  ) ?? null, [form.serviceLocationCode, workspace?.in_person_locations]);
  const appointmentTimezone = form.consultationMode === 'IN_PERSON' && selectedLocation
    ? selectedLocation.timezone
    : browserTimezone;
  const countryLocations = useMemo(() => (workspace?.in_person_locations ?? []).filter(
    (location) => location.country_code === form.countryCode && location.active,
  ), [form.countryCode, workspace?.in_person_locations]);
  const inPersonUnavailable = form.consultationMode === 'IN_PERSON' && countryLocations.length === 0;

  const topicLabel = (value: string) => workspace?.topics.find((topic) => topic.value === value)?.label
    || copy.topics[value]
    || value.replace(/^MODULE:/, '').replace(/[-_]/g, ' ');

  const updateForm = <Key extends keyof BookingForm>(key: Key, value: BookingForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrorMessage('');
    setSuccessMessage('');
  };

  const chooseMode = (mode: BookingForm['consultationMode']) => {
    setForm((current) => ({
      ...current,
      consultationMode: mode,
      serviceLocationCode: mode === 'VIRTUAL' ? '' : current.serviceLocationCode,
    }));
    setErrorMessage('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    const preferredStartAt = toInstant(form.preferredDate, form.preferredTime, appointmentTimezone);
    const alternativeStartAt = showAlternative
      ? toInstant(form.alternativeDate, form.alternativeTime, appointmentTimezone)
      : null;
    if (!form.attendeeName.trim() || !form.attendeeEmail.trim() || !form.attendeePhone.trim() || !form.topic || !preferredStartAt) {
      setErrorMessage(copy.requiredMessage);
      return;
    }
    if (form.consultationMode === 'IN_PERSON' && (!selectedLocation || form.serviceLocationCode === 'OTHER')) {
      setErrorMessage(copy.locationRequiredMessage);
      return;
    }
    if (!isBusinessDay(form.preferredDate) || (showAlternative && !isBusinessDay(form.alternativeDate))) {
      setErrorMessage(copy.invalidDateMessage);
      return;
    }
    if (new Date(preferredStartAt).getTime() < Date.now() + (24 * 60 * 60 * 1000)) {
      setErrorMessage(copy.invalidDateMessage);
      return;
    }
    setIsSaving(true);
    try {
      const appointment = await consultingApi.create({
        attendeeName: form.attendeeName.trim(),
        attendeeEmail: form.attendeeEmail.trim(),
        attendeePhone: form.attendeePhone.trim(),
        topic: form.topic,
        notes: form.notes.trim(),
        preferredStartAt,
        alternativeStartAt,
        timezone: appointmentTimezone,
        consultationMode: form.consultationMode,
        countryCode: form.consultationMode === 'IN_PERSON' ? form.countryCode : null,
        serviceLocationCode: form.consultationMode === 'IN_PERSON' ? form.serviceLocationCode : null,
      });
      setSuccessMessage(appointment.notification_status === 'FAILED'
        ? copy.notificationWarning
        : copy.successDescription);
      setForm((current) => ({
        ...EMPTY_FORM,
        attendeeName: current.attendeeName,
        attendeeEmail: current.attendeeEmail,
        attendeePhone: current.attendeePhone,
      }));
      setShowAlternative(false);
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(friendlyApiError(error, copy.requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async (appointment: ConsultingAppointment) => {
    if (!window.confirm(copy.cancelAction)) return;
    setCancellingId(appointment.id);
    setErrorMessage('');
    try {
      await consultingApi.cancel(appointment.id);
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(friendlyApiError(error, copy.errorDescription));
    } finally {
      setCancellingId(null);
    }
  };

  const formatDateTime = (value: string | null, timezone = browserTimezone) => value
    ? new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone,
    }).format(new Date(value))
    : '—';

  const formatMoney = (amountCents: number | null, currency: string) => amountCents == null
    ? ''
    : new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'code' }).format(amountCents / 100);

  const sessionLabel = (appointment: ConsultingAppointment) => {
    if (appointment.consultation_mode === 'IN_PERSON') {
      return appointment.amount_cents == null
        ? copy.inPersonQuoteBadge
        : formatMoney(appointment.amount_cents, appointment.currency);
    }
    return appointment.session_kind === 'INCLUDED'
      ? copy.includedBadge
      : `${copy.benefitAdditional} · ${formatMoney(appointment.amount_cents, appointment.currency)}`;
  };

  const statusLabel = (status: ConsultingAppointment['status']) => ({
    REQUESTED: copy.requested,
    PAYMENT_REQUIRED: copy.paymentRequired,
    CONFIRMED: copy.confirmed,
    CANCELLED: copy.cancelled,
    COMPLETED: copy.completed,
    NO_SHOW: copy.cancelled,
  })[status];

  return (
    <div className="space-y-5">
      <DashboardTitleBar emoji="🤝" subtitle={copy.subtitle} title={copy.title} />

      {isLoading ? (
        <section className="flex min-h-40 items-center justify-center gap-3 rounded-2xl border border-blue-200 bg-blue-50/60 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-200">
          <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />{copy.loading}
        </section>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-200" role="alert">
          <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">{errorMessage}</span>
          {!workspace ? <button className="font-medium underline" type="button" onClick={loadWorkspace}>{copy.retry}</button> : null}
        </div>
      ) : null}

      {!isLoading && successMessage ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200" role="status">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <div><p className="font-medium">{copy.successTitle}</p><p className="mt-0.5">{successMessage}</p></div>
        </div>
      ) : null}

      {!isLoading && workspace ? (
        <>
          <section className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-emerald-50 shadow-sm dark:border-blue-900 dark:from-blue-950/30 dark:via-slate-900 dark:to-emerald-950/20">
            <div className="grid gap-4 px-5 py-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-200"><Handshake className="h-6 w-6" /></span>
              <div>
                <h2 className="font-medium text-slate-950 dark:text-white">{copy.brandPromiseTitle}</h2>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.brandPromiseDescription}</p>
                <div className="mt-3 border-t border-blue-100 pt-3 dark:border-blue-900/70">
                  <p className="text-sm font-medium text-slate-950 dark:text-white">
                    {workspace.included_session_available
                      ? copy.benefitIncluded
                      : `${copy.benefitAdditional} · ${formatMoney(workspace.additional_session_amount_cents, workspace.currency)}`}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy.pendingNotice}</p>
                  <p className="mt-2 text-xs font-medium text-blue-700 dark:text-blue-300">{copy.consultantChangeNote}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white/80 px-4 py-3 text-sm font-medium text-blue-700 dark:border-blue-900 dark:bg-slate-800/80 dark:text-blue-200"><Clock3 className="h-4 w-4" />{copy.duration}</div>
            </div>
          </section>

          {activeAppointment ? (
            <AppointmentCard
              appointment={activeAppointment}
              cancelling={cancellingId === activeAppointment.id}
              copy={copy}
              formatDateTime={formatDateTime}
              onCancel={handleCancel}
              sessionLabel={sessionLabel}
              statusLabel={statusLabel}
              topicLabel={topicLabel}
            />
          ) : (
            <form className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800" onSubmit={handleSubmit}>
              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                <h2 className="font-medium text-slate-950 dark:text-white">{copy.scheduleTitle}</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy.scheduleDescription}</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {[copy.stepTime, copy.stepSession, copy.stepContext].map((label, index) => (
                    <span key={label} className={`rounded-lg border px-3 py-2 text-xs font-medium ${index === 0 ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200' : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300'}`}>{label}</span>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
                <div className="space-y-6">
                  <section>
                    <h3 className="flex items-center gap-2 text-sm font-medium text-slate-950 dark:text-white"><CalendarDays className="h-4 w-4 text-blue-600" />{copy.stepTime}</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Field label={copy.preferredDate}><input required min={nextBookableDate()} type="date" value={form.preferredDate} onChange={(event) => updateForm('preferredDate', event.target.value)} className={controlClass} /></Field>
                      <Field label={copy.preferredTime}><select value={form.preferredTime} onChange={(event) => updateForm('preferredTime', event.target.value)} className={controlClass}>{TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}</select></Field>
                    </div>
                    {showAlternative ? (
                      <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3 dark:border-blue-900 dark:bg-blue-950/10">
                        <div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-blue-800 dark:text-blue-200">{copy.alternativeTitle}</p><button type="button" className="text-xs font-medium text-red-600" onClick={() => { setShowAlternative(false); updateForm('alternativeDate', ''); }}>{copy.removeAlternative}</button></div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <Field label={copy.preferredDate}><input required min={nextBookableDate()} type="date" value={form.alternativeDate} onChange={(event) => updateForm('alternativeDate', event.target.value)} className={controlClass} /></Field>
                          <Field label={copy.preferredTime}><select value={form.alternativeTime} onChange={(event) => updateForm('alternativeTime', event.target.value)} className={controlClass}>{TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}</select></Field>
                        </div>
                      </div>
                    ) : <button type="button" className="mt-3 text-sm font-medium text-blue-700 hover:underline dark:text-blue-300" onClick={() => setShowAlternative(true)}>+ {copy.addAlternative}</button>}
                    <p className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><Clock3 className="h-3.5 w-3.5" />{copy.timezone}: {appointmentTimezone}</p>
                  </section>

                  <section>
                    <h3 className="text-sm font-medium text-slate-950 dark:text-white">{copy.consultationMode}</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <ModeCard active={form.consultationMode === 'VIRTUAL'} icon={Monitor} title={copy.virtualMode} description={copy.virtualDescription} onClick={() => chooseMode('VIRTUAL')} />
                      <ModeCard active={form.consultationMode === 'IN_PERSON'} icon={Building2} title={copy.inPersonMode} description={copy.inPersonDescription} onClick={() => chooseMode('IN_PERSON')} />
                    </div>
                    {form.consultationMode === 'IN_PERSON' ? (
                      <div className="mt-3 space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                        <p className="text-xs leading-5 text-amber-800 dark:text-amber-200">{copy.inPersonCost}</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label={copy.country}><select value={form.countryCode} onChange={(event) => setForm((current) => ({ ...current, countryCode: event.target.value, serviceLocationCode: '' }))} className={controlClass}>{COUNTRY_CODES.map((country) => <option key={country} value={country}>{countryName(country, locale)}</option>)}</select></Field>
                              <Field label={copy.city}><select disabled={inPersonUnavailable} required value={form.serviceLocationCode} onChange={(event) => updateForm('serviceLocationCode', event.target.value)} className={controlClass}><option value="">{copy.cityPlaceholder}</option>{countryLocations.map((location) => <option key={location.location_code} value={location.location_code}>{location.city_name}{location.region_name ? ` · ${location.region_name}` : ''}</option>)}<option value="OTHER">{copy.otherCity}</option></select></Field>
                        </div>
                        {inPersonUnavailable || form.serviceLocationCode === 'OTHER' ? <div className="flex gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-900 dark:bg-slate-900 dark:text-amber-200"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>{copy.unsupportedCountry} {copy.useVirtualInstead}</span></div> : null}
                      </div>
                    ) : null}
                  </section>
                </div>

                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-900/30">
                  <Field label={copy.topic}><select value={form.topic} onChange={(event) => updateForm('topic', event.target.value)} className={controlClass}>{workspace.topics.map((topic) => <option key={topic.value} value={topic.value}>{topic.emoji} {copy.topics[topic.value] || topic.label}</option>)}</select></Field>
                  <Field label={copy.notes}><textarea maxLength={2000} rows={4} value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} placeholder={copy.notesPlaceholder} className={`${controlClass} min-h-24 resize-y py-2.5`} /></Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={copy.attendeeName}><div className="relative"><UserRound className={iconClass} /><input required value={form.attendeeName} onChange={(event) => updateForm('attendeeName', event.target.value)} className={`${controlClass} pl-9`} /></div></Field>
                    <Field label={copy.attendeeEmail}><div className="relative"><Mail className={iconClass} /><input required type="email" value={form.attendeeEmail} onChange={(event) => updateForm('attendeeEmail', event.target.value)} className={`${controlClass} pl-9`} /></div></Field>
                  </div>
                  <Field label={copy.attendeePhone}><div className="relative"><Phone className={iconClass} /><input required type="tel" value={form.attendeePhone} onChange={(event) => updateForm('attendeePhone', event.target.value)} className={`${controlClass} pl-9`} /></div></Field>
                  <Button disabled={isSaving || inPersonUnavailable || form.serviceLocationCode === 'OTHER'} className="min-h-11 w-full gap-2 bg-blue-600 text-white hover:bg-blue-700" type="submit">{isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}{isSaving ? copy.submitting : copy.submit}</Button>
                  <p className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.confirmationNote}</p>
                </div>
              </div>
            </form>
          )}

          <History appointments={workspace.appointments} copy={copy} formatDateTime={formatDateTime} sessionLabel={sessionLabel} statusLabel={statusLabel} topicLabel={topicLabel} />
        </>
      ) : null}
    </div>
  );
}

function friendlyApiError(error: unknown, fallback: string) {
  if (error instanceof ApiClientError && error.status >= 500) return fallback;
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function AppointmentCard({ appointment, cancelling, copy, formatDateTime, onCancel, sessionLabel, statusLabel, topicLabel }: {
  appointment: ConsultingAppointment;
  cancelling: boolean;
  copy: ReturnType<typeof getConsultingTranslations>;
  formatDateTime: (value: string | null, timezone?: string) => string;
  onCancel: (appointment: ConsultingAppointment) => void;
  sessionLabel: (appointment: ConsultingAppointment) => string;
  statusLabel: (status: ConsultingAppointment['status']) => string;
  topicLabel: (topic: string) => string;
}) {
  const confirmed = appointment.status === 'CONFIRMED';
  const progressStep = confirmed ? 2 : 1;
  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm dark:border-emerald-900 dark:bg-slate-800">
      <div className="flex flex-col gap-4 border-b border-emerald-100 bg-emerald-50/60 px-5 py-4 dark:border-emerald-900 dark:bg-emerald-950/20 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-300"><CalendarDays className="h-5 w-5" /></span><div><h2 className="font-medium text-slate-950 dark:text-white">{copy.upcomingTitle}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{statusLabel(appointment.status)}</p></div></div>
        <span className="w-fit rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-200">{appointment.consultation_mode === 'IN_PERSON' ? `📍 ${appointment.service_location_name}` : `💻 ${copy.virtualMode}`}</span>
      </div>
      <div className="p-5">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.requestFlow}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[copy.flowRequested, copy.flowConfirmed, copy.flowSession].map((label, index) => {
            const completed = index < progressStep;
            const current = index === progressStep;
            return <div key={label} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${completed ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200' : current ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-200' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400'}`}>{completed ? <Check className="h-3.5 w-3.5" /> : <span className="grid h-4 w-4 place-items-center rounded-full border text-[10px]">{index + 1}</span>}{label}</div>;
          })}
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Detail label={confirmed ? copy.confirmed : copy.preferredLabel} value={formatDateTime(appointment.confirmed_start_at || appointment.preferred_start_at, appointment.timezone)} />
            {!confirmed && appointment.alternative_start_at ? <Detail label={copy.alternativeLabel} value={formatDateTime(appointment.alternative_start_at, appointment.timezone)} /> : null}
            <Detail label={copy.topic} value={topicLabel(appointment.topic)} />
            <Detail label={copy.consultantLabel} value={appointment.consultant_name || copy.requested} />
            <Detail label={copy.duration} value={sessionLabel(appointment)} />
          </div>
          <div className="flex max-w-sm flex-col gap-2 lg:items-end">
            {appointment.meeting_link_available && appointment.meeting_url ? <Button asChild className="gap-2 bg-emerald-600 hover:bg-emerald-700"><a href={appointment.meeting_url} rel="noreferrer" target="_blank">{copy.meetingLink}<ExternalLink className="h-4 w-4" /></a></Button> : null}
            {confirmed && appointment.consultation_mode === 'VIRTUAL' && !appointment.meeting_link_available ? <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-200"><p>{copy.meetingPending}</p>{appointment.join_available_at ? <p className="mt-1 font-medium">{copy.meetingAvailableAt}: {formatDateTime(appointment.join_available_at, appointment.timezone)}</p> : null}</div> : null}
            <Button disabled={cancelling} variant="outline" className="gap-2 text-red-600" onClick={() => onCancel(appointment)}>{cancelling ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}{cancelling ? copy.cancelling : copy.cancelAction}</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function History({ appointments, copy, formatDateTime, sessionLabel, statusLabel, topicLabel }: {
  appointments: ConsultingAppointment[];
  copy: ReturnType<typeof getConsultingTranslations>;
  formatDateTime: (value: string | null, timezone?: string) => string;
  sessionLabel: (appointment: ConsultingAppointment) => string;
  statusLabel: (status: ConsultingAppointment['status']) => string;
  topicLabel: (topic: string) => string;
}) {
  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700"><h2 className="font-medium text-slate-950 dark:text-white">{copy.historyTitle}</h2></div>{appointments.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">{copy.historyEmpty}</p> : <div className="divide-y divide-slate-100 dark:divide-slate-700">{appointments.map((appointment) => <div key={appointment.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-950 dark:text-white">{topicLabel(appointment.topic)}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(appointment.confirmed_start_at || appointment.preferred_start_at, appointment.timezone)} · {appointment.consultation_mode === 'IN_PERSON' ? `📍 ${appointment.service_location_name}` : `💻 ${copy.virtualMode}`}</p></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-200">{statusLabel(appointment.status)}</span><span className="max-w-xs truncate rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">{sessionLabel(appointment)}</span></div></div>)}</div>}</section>;
}

function ModeCard({ active, icon: Icon, title, description, onClick }: { active: boolean; icon: typeof Monitor; title: string; description: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex min-h-28 items-start gap-3 rounded-xl border p-4 text-left transition ${active ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100 dark:border-blue-500 dark:bg-blue-950/25 dark:ring-blue-950' : 'border-slate-200 bg-white hover:border-blue-200 dark:border-slate-700 dark:bg-slate-900/30'}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}><Icon className="h-4 w-4" /></span><span><span className="flex items-center gap-2 text-sm font-medium text-slate-950 dark:text-white">{title}{active ? <CheckCircle2 className="h-4 w-4 text-blue-600" /> : null}</span><span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</span></span></button>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 text-sm font-medium text-slate-950 dark:text-white">{value}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-200"><span>{label}</span>{children}</label>; }
function countryName(code: string, locale: string) { const names: Record<string, { es: string; en: string }> = { MX: { es: '🇲🇽 México', en: '🇲🇽 Mexico' }, CA: { es: '🇨🇦 Canadá', en: '🇨🇦 Canada' }, US: { es: '🇺🇸 Estados Unidos', en: '🇺🇸 United States' }, BR: { es: '🇧🇷 Brasil', en: '🇧🇷 Brazil' }, CO: { es: '🇨🇴 Colombia', en: '🇨🇴 Colombia' } }; return names[code]?.[locale.toLowerCase().startsWith('es') ? 'es' : 'en'] || code; }

const controlClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-950 dark:focus:ring-blue-950';
const iconClass = 'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400';
