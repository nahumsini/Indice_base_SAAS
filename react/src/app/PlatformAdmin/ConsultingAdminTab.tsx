import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Building2,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  LoaderCircle,
  Mail,
  MapPin,
  Monitor,
  Phone,
  RefreshCw,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import {
  platformAdminApi,
  type PlatformConsultingAppointment,
  type PlatformConsultingAppointmentUpdate,
  type PlatformConsultingLocation,
  type PlatformConsultingStatus,
  type PlatformConsultingWorkspace,
} from '../api/platformAdmin';

const controlClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#177D66] focus:ring-2 focus:ring-[#177D66]/10 disabled:bg-slate-100 disabled:text-slate-400';
const statuses: Array<{ value: PlatformConsultingStatus; label: string }> = [
  { value: 'REQUESTED', label: 'Por confirmar' },
  { value: 'CONFIRMED', label: 'Confirmada' },
  { value: 'COMPLETED', label: 'Completada' },
  { value: 'NO_SHOW', label: 'No asistió' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

type EditState = {
  status: PlatformConsultingStatus;
  confirmedStartAt: string;
  meetingUrl: string;
  consultantName: string;
  consultantEmail: string;
  consultantPhone: string;
  internalNotes: string;
  paymentStatus: PlatformConsultingAppointment['payment_status'];
  amount: string;
  currency: string;
  cancellationReason: string;
};

export default function ConsultingAdminTab({ canManage }: { canManage: boolean }) {
  const [workspace, setWorkspace] = useState<PlatformConsultingWorkspace | null>(null);
  const [selected, setSelected] = useState<PlatformConsultingAppointment | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const next = await platformAdminApi.getConsulting();
      setWorkspace(next);
      if (selected) {
        const updated = next.appointments.find((item) => item.id === selected.id) ?? null;
        setSelected(updated);
        setEdit(updated ? toEditState(updated) : null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las solicitudes de consultoría.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (workspace?.appointments ?? []).filter((appointment) => {
      const matchesQuery = !normalized || [
        appointment.company_name,
        appointment.attendee_name,
        appointment.attendee_email,
        appointment.attendee_phone || '',
        String(appointment.id),
      ].some((value) => value.toLowerCase().includes(normalized));
      const matchesStatus = statusFilter === 'ALL'
        || (statusFilter === 'ACTIVE' && ['REQUESTED', 'PAYMENT_REQUIRED', 'CONFIRMED'].includes(appointment.status))
        || appointment.status === statusFilter;
      const matchesMode = modeFilter === 'ALL' || appointment.consultation_mode === modeFilter;
      return matchesQuery && matchesStatus && matchesMode;
    });
  }, [modeFilter, query, statusFilter, workspace?.appointments]);

  const openAppointment = (appointment: PlatformConsultingAppointment) => {
    setSelected(appointment);
    setEdit(toEditState(appointment));
    setError('');
    setSuccess('');
  };

  const saveAppointment = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !edit || saving || !canManage) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const amount = edit.amount.trim() === '' ? null : Math.round(Number(edit.amount) * 100);
      const payload: PlatformConsultingAppointmentUpdate = {
        status: edit.status === 'PAYMENT_REQUIRED' ? 'REQUESTED' : edit.status,
        confirmedStartAt: edit.confirmedStartAt ? new Date(edit.confirmedStartAt).toISOString() : null,
        meetingUrl: edit.meetingUrl.trim(),
        consultantName: edit.consultantName.trim(),
        consultantEmail: edit.consultantEmail.trim(),
        consultantPhone: edit.consultantPhone.trim(),
        internalNotes: edit.internalNotes.trim(),
        paymentStatus: edit.paymentStatus,
        amountCents: Number.isFinite(amount) ? amount : null,
        currency: edit.currency.trim().toUpperCase() || 'USD',
        cancellationReason: edit.cancellationReason.trim(),
      };
      const updated = await platformAdminApi.updateConsultingAppointment(selected.id, payload);
      setSelected(updated);
      setEdit(toEditState(updated));
      setWorkspace((current) => current ? {
        ...current,
        appointments: current.appointments.map((item) => item.id === updated.id ? updated : item),
      } : current);
      setSuccess('La solicitud quedó actualizada y el cliente recibirá el aviso correspondiente.');
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo actualizar la solicitud.');
    } finally {
      setSaving(false);
    }
  };

  const saveLocation = async (location: PlatformConsultingLocation, active: boolean, fee: string) => {
    if (saving || !canManage) return;
    setSaving(true);
    setError('');
    try {
      const feeCents = fee.trim() === '' ? null : Math.round(Number(fee) * 100);
      const updated = await platformAdminApi.updateConsultingLocation(location.id, {
        active,
        inPersonFeeCents: Number.isFinite(feeCents) ? feeCents : null,
        currency: location.currency || 'USD',
      });
      setWorkspace((current) => current ? {
        ...current,
        locations: current.locations.map((item) => item.id === updated.id ? updated : item),
      } : current);
      setSuccess(`${updated.city_name} quedó ${updated.active ? 'disponible' : 'oculta'} para solicitudes presenciales.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo actualizar la ciudad.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-medium text-[#177D66]">Operación de consultoría</p><h2 className="mt-1 text-2xl font-medium tracking-tight text-slate-950">Solicitudes, consultores y sesiones</h2><p className="mt-1 max-w-3xl text-sm text-slate-500">Coordina horarios con el cliente, asigna consultor y publica la confirmación y el enlace desde un solo lugar.</p></div>
        <button type="button" onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</button>
      </section>

      {error ? <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}
      {success ? <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{success}</div> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={CalendarClock} label="Por confirmar" value={workspace?.totals.requested ?? 0} tone="amber" />
        <Metric icon={CalendarCheck2} label="Confirmadas" value={workspace?.totals.confirmed ?? 0} tone="blue" />
        <Metric icon={Clock3} label="Próximas" value={workspace?.totals.upcoming ?? 0} tone="mint" />
        <Metric icon={Building2} label="Solicitudes totales" value={workspace?.totals.appointments ?? 0} tone="slate" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_45px_-38px_rgba(15,23,42,0.55)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} className={`${controlClass} pl-10`} placeholder="Buscar empresa, usuario, correo, teléfono o folio" /></label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={`${controlClass} lg:w-48`}><option value="ACTIVE">Pendientes y próximas</option><option value="ALL">Todos los estados</option>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select>
          <select value={modeFilter} onChange={(event) => setModeFilter(event.target.value)} className={`${controlClass} lg:w-44`}><option value="ALL">Todas las modalidades</option><option value="VIRTUAL">Virtual</option><option value="IN_PERSON">Presencial</option></select>
        </div>
        {loading && !workspace ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin text-[#177D66]" />Cargando solicitudes…</div> : <div className="overflow-x-auto"><table className="w-full min-w-[1180px] border-collapse"><thead className="bg-slate-50"><tr>{['Folio y empresa', 'Cliente', 'Contacto', 'Modalidad', 'Horario preferido', 'Estado', 'Consultor', 'Acción'].map((label) => <th key={label} className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-slate-500">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((appointment) => <tr key={appointment.id} className="transition hover:bg-slate-50/80"><td className="px-4 py-3 text-sm"><p className="font-medium text-slate-900">#{appointment.id} · {appointment.company_name}</p><p className="mt-0.5 text-xs text-slate-500">Solicitada {formatDateTime(appointment.created_at)}</p></td><td className="px-4 py-3 text-sm"><p className="font-medium text-slate-800">{appointment.attendee_name}</p><p className="mt-0.5 max-w-56 truncate text-xs text-slate-500">{topicLabel(appointment.topic)}</p></td><td className="px-4 py-3 text-sm"><a href={`mailto:${appointment.attendee_email}`} className="flex items-center gap-1.5 text-xs text-[#143675]"><Mail className="h-3.5 w-3.5" />{appointment.attendee_email}</a>{appointment.attendee_phone ? <a href={`tel:${appointment.attendee_phone}`} className="mt-1 flex items-center gap-1.5 text-xs text-[#177D66]"><Phone className="h-3.5 w-3.5" />{appointment.attendee_phone}</a> : null}</td><td className="px-4 py-3 text-sm">{appointment.consultation_mode === 'IN_PERSON' ? <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-amber-600" />{appointment.service_location_name || appointment.country_code}</span> : <span className="inline-flex items-center gap-1.5"><Monitor className="h-4 w-4 text-blue-600" />Virtual</span>}</td><td className="px-4 py-3 text-sm"><p className="font-medium text-slate-800">{formatDateTime(appointment.preferred_start_at, appointment.timezone)}</p>{appointment.alternative_start_at ? <p className="mt-0.5 text-xs text-slate-500">Alt. {formatDateTime(appointment.alternative_start_at, appointment.timezone)}</p> : null}</td><td className="px-4 py-3"><Status status={appointment.status} /></td><td className="px-4 py-3 text-sm text-slate-600">{appointment.consultant_name || 'Sin asignar'}</td><td className="px-4 py-3"><button type="button" onClick={() => openAppointment(appointment)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-[#143675]">Administrar</button></td></tr>)}{filtered.length === 0 ? <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-500">No hay solicitudes que coincidan con los filtros.</td></tr> : null}</tbody></table></div>}
      </section>

      <LocationsPanel locations={workspace?.locations ?? []} saving={saving} canManage={canManage} onSave={saveLocation} />

      {selected && edit ? <AppointmentDrawer appointment={selected} edit={edit} saving={saving} canManage={canManage} onEdit={setEdit} onClose={() => { setSelected(null); setEdit(null); }} onSubmit={saveAppointment} /> : null}
    </div>
  );
}

function AppointmentDrawer({ appointment, edit, saving, canManage, onEdit, onClose, onSubmit }: { appointment: PlatformConsultingAppointment; edit: EditState; saving: boolean; canManage: boolean; onEdit: (value: EditState) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  const confirmed = edit.status === 'CONFIRMED';
  return <div className="fixed inset-0 z-[60] flex justify-end bg-slate-950/45" role="dialog" aria-modal="true" aria-label="Administrar consultoría"><button type="button" aria-label="Cerrar" className="min-w-0 flex-1" onClick={onClose} /><aside className="h-full w-full max-w-2xl overflow-y-auto bg-[#f4f7fb] shadow-2xl"><header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-[#177D66]">Solicitud #{appointment.id}</p><h2 className="mt-1 text-xl font-medium text-slate-950">{appointment.company_name}</h2><p className="mt-1 text-sm text-slate-500">{appointment.attendee_name} · {topicLabel(appointment.topic)}</p></div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"><X className="h-4 w-4" /></button></div></header><form onSubmit={onSubmit} className="space-y-4 p-5"><section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="font-medium text-slate-900">Contacto rápido</h3><div className="mt-3 grid gap-2 sm:grid-cols-2"><a href={`mailto:${appointment.attendee_email}`} className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm text-[#143675]"><Mail className="h-4 w-4" />{appointment.attendee_email}</a><a href={`tel:${appointment.attendee_phone || ''}`} className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-[#177D66]"><Phone className="h-4 w-4" />{appointment.attendee_phone || 'Sin teléfono'}</a></div>{appointment.notes ? <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">{appointment.notes}</p> : null}</section><section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="font-medium text-slate-900">Horario solicitado</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><Info label="Preferido" value={formatDateTime(appointment.preferred_start_at, appointment.timezone)} /><Info label="Alternativo" value={formatDateTime(appointment.alternative_start_at, appointment.timezone)} /><Info label="Modalidad" value={appointment.consultation_mode === 'IN_PERSON' ? `Presencial · ${appointment.service_location_name}` : 'Virtual'} /><Info label="Zona horaria" value={appointment.timezone} /></div></section><section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4"><h3 className="font-medium text-slate-900">Confirmación y asignación</h3><div className="grid gap-3 sm:grid-cols-2"><Field label="Estado"><select disabled={!canManage} value={edit.status === 'PAYMENT_REQUIRED' ? 'REQUESTED' : edit.status} onChange={(event) => onEdit({ ...edit, status: event.target.value as PlatformConsultingStatus })} className={controlClass}>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></Field><Field label="Fecha y hora definitiva"><input disabled={!canManage} required={confirmed} type="datetime-local" value={edit.confirmedStartAt} onChange={(event) => onEdit({ ...edit, confirmedStartAt: event.target.value })} className={controlClass} /></Field><Field label="Nombre del consultor"><input disabled={!canManage} required={confirmed} value={edit.consultantName} onChange={(event) => onEdit({ ...edit, consultantName: event.target.value })} className={controlClass} placeholder="Nombre completo" /></Field><Field label="Correo del consultor"><input disabled={!canManage} type="email" value={edit.consultantEmail} onChange={(event) => onEdit({ ...edit, consultantEmail: event.target.value })} className={controlClass} placeholder="consultor@indiceapp.com" /></Field><Field label="Teléfono del consultor"><input disabled={!canManage} value={edit.consultantPhone} onChange={(event) => onEdit({ ...edit, consultantPhone: event.target.value })} className={controlClass} /></Field>{appointment.consultation_mode === 'VIRTUAL' ? <Field label="Enlace seguro de reunión"><input disabled={!canManage} required={confirmed} type="url" value={edit.meetingUrl} onChange={(event) => onEdit({ ...edit, meetingUrl: event.target.value })} className={controlClass} placeholder="https://meet..." /></Field> : null}</div>{appointment.meeting_url ? <a href={appointment.meeting_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-[#143675]">Probar enlace <ExternalLink className="h-4 w-4" /></a> : null}</section><section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4"><h3 className="font-medium text-slate-900">Costo y seguimiento interno</h3><div className="grid gap-3 sm:grid-cols-3"><Field label="Pago"><select disabled={!canManage} value={edit.paymentStatus} onChange={(event) => onEdit({ ...edit, paymentStatus: event.target.value as EditState['paymentStatus'] })} className={controlClass}><option value="INCLUDED">Incluida</option><option value="QUOTE_PENDING">Cotización pendiente</option><option value="PENDING">Pago pendiente</option><option value="PAID">Pagada</option><option value="WAIVED">Cortesía</option><option value="REFUNDED">Reembolsada</option></select></Field><Field label="Importe"><input disabled={!canManage} min="0" step="0.01" type="number" value={edit.amount} onChange={(event) => onEdit({ ...edit, amount: event.target.value })} className={controlClass} placeholder="0.00" /></Field><Field label="Moneda"><input disabled={!canManage} maxLength={3} value={edit.currency} onChange={(event) => onEdit({ ...edit, currency: event.target.value.toUpperCase() })} className={controlClass} /></Field></div><Field label="Notas internas"><textarea disabled={!canManage} value={edit.internalNotes} onChange={(event) => onEdit({ ...edit, internalNotes: event.target.value })} className={`${controlClass} min-h-24 resize-y py-2`} placeholder="Coordinación, disponibilidad o acuerdos con el consultor" /></Field>{edit.status === 'CANCELLED' ? <Field label="Motivo de cancelación"><textarea disabled={!canManage} required value={edit.cancellationReason} onChange={(event) => onEdit({ ...edit, cancellationReason: event.target.value })} className={`${controlClass} min-h-20 resize-y py-2`} /></Field> : null}</section><div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-[#f4f7fb]/95 py-3 backdrop-blur"><button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">Cerrar</button><button disabled={!canManage || saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#143675] px-5 text-sm font-medium text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CalendarCheck2 className="h-4 w-4" />}{saving ? 'Guardando…' : 'Guardar y notificar'}</button></div></form></aside></div>;
}

function LocationsPanel({ locations, saving, canManage, onSave }: { locations: PlatformConsultingLocation[]; saving: boolean; canManage: boolean; onSave: (location: PlatformConsultingLocation, active: boolean, fee: string) => void }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_45px_-38px_rgba(15,23,42,0.55)]"><div className="border-b border-slate-100 px-5 py-4"><h3 className="font-medium text-slate-900">Cobertura presencial</h3><p className="mt-1 text-xs text-slate-500">Activa ciudades disponibles y define el costo adicional. Sin importe, la solicitud mostrará “cotización pendiente”.</p></div><div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">{locations.map((location) => <LocationCard key={location.id} location={location} saving={saving} canManage={canManage} onSave={onSave} />)}</div></section>;
}

function LocationCard({ location, saving, canManage, onSave }: { location: PlatformConsultingLocation; saving: boolean; canManage: boolean; onSave: (location: PlatformConsultingLocation, active: boolean, fee: string) => void }) {
  const [fee, setFee] = useState(location.in_person_fee_cents == null ? '' : String(location.in_person_fee_cents / 100));
  useEffect(() => setFee(location.in_person_fee_cents == null ? '' : String(location.in_person_fee_cents / 100)), [location.in_person_fee_cents]);
  return <article className={`rounded-2xl border p-4 ${location.active ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50'}`}><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-slate-900">{location.city_name}</p><p className="mt-0.5 text-xs text-slate-500">{location.region_name} · {location.country_name}</p><p className="mt-0.5 text-[11px] text-slate-400">{location.timezone}</p></div><button type="button" disabled={!canManage || saving} onClick={() => onSave(location, !location.active, fee)} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${location.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{location.active ? 'Disponible' : 'Oculta'}</button></div><label className="mt-4 block text-xs font-medium text-slate-600">Costo adicional ({location.currency})<input disabled={!canManage} min="0" step="0.01" type="number" value={fee} onChange={(event) => setFee(event.target.value)} className={`${controlClass} mt-1`} placeholder="Cotización manual" /></label><button type="button" disabled={!canManage || saving} onClick={() => onSave(location, location.active, fee)} className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-[#143675] disabled:opacity-50">Guardar tarifa</button></article>;
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof CalendarClock; label: string; value: number; tone: 'amber' | 'blue' | 'mint' | 'slate' }) { const styles = { amber: 'bg-amber-50 text-amber-700', blue: 'bg-blue-50 text-[#143675]', mint: 'bg-emerald-50 text-[#177D66]', slate: 'bg-slate-100 text-slate-600' }; return <article className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl ${styles[tone]}`}><Icon className="h-5 w-5" /></span><div><p className="text-xs text-slate-500">{label}</p><p className="mt-0.5 text-xl font-medium text-slate-950">{value}</p></div></div></article>; }
function Status({ status }: { status: PlatformConsultingStatus }) { const label = statuses.find((item) => item.value === status)?.label || status; const tone = status === 'CONFIRMED' ? 'bg-blue-50 text-blue-700' : status === 'REQUESTED' || status === 'PAYMENT_REQUIRED' ? 'bg-amber-50 text-amber-700' : status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'; return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${tone}`}>{label}</span>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-medium text-slate-800">{value}</p></div>; }
function topicLabel(value: string) { if (value === 'ONBOARDING') return 'Implementación inicial de Índice'; if (value === 'BUSINESS_CONSULTING') return 'Consultoría de negocios'; if (value === 'OTHER') return 'Otro reto de la empresa'; return value.replace(/^MODULE:/, '').replace(/[-_]/g, ' ').replace(/^./, (letter) => letter.toUpperCase()); }
function formatDateTime(value?: string | null, timeZone?: string) { if (!value) return '—'; const date = new Date(value); if (Number.isNaN(date.getTime())) return '—'; return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: timeZone || undefined }).format(date); }
function toLocalInput(value?: string | null) { if (!value) return ''; const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; const pad = (part: number) => String(part).padStart(2, '0'); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }
function toEditState(appointment: PlatformConsultingAppointment): EditState { return { status: appointment.status === 'PAYMENT_REQUIRED' ? 'REQUESTED' : appointment.status, confirmedStartAt: toLocalInput(appointment.confirmed_start_at), meetingUrl: appointment.meeting_url || '', consultantName: appointment.consultant_name || '', consultantEmail: appointment.consultant_email || '', consultantPhone: appointment.consultant_phone || '', internalNotes: appointment.internal_notes || '', paymentStatus: appointment.payment_status, amount: appointment.amount_cents == null ? '' : String(appointment.amount_cents / 100), currency: appointment.currency || 'USD', cancellationReason: appointment.cancellation_reason || '' }; }
