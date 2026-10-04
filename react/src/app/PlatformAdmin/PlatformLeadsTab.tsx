import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CalendarClock, Mail, Phone, RefreshCw } from 'lucide-react';
import {
  platformLeadsApi,
  type PlatformLead,
  type PlatformLeadAssignee,
  type PlatformLeadDetail,
  type PlatformLeadStatus,
} from '../api/platformLeads';

const transitions: Record<PlatformLeadStatus, PlatformLeadStatus[]> = {
  NEW: ['CONTACTED', 'DIAGNOSIS_SCHEDULED', 'NURTURE', 'LOST'],
  CONTACTED: ['DIAGNOSIS_SCHEDULED', 'NURTURE', 'LOST'],
  DIAGNOSIS_SCHEDULED: ['CONTACTED', 'DIAGNOSIS_COMPLETED', 'NURTURE', 'LOST'],
  DIAGNOSIS_COMPLETED: ['TRIAL_ACTIVE', 'PROPOSAL', 'NURTURE', 'LOST'],
  TRIAL_ACTIVE: ['PROPOSAL', 'NURTURE', 'LOST'],
  PROPOSAL: ['WON', 'LOST', 'NURTURE'],
  NURTURE: ['CONTACTED', 'DIAGNOSIS_SCHEDULED', 'LOST'],
  LOST: ['CONTACTED'],
  WON: [],
};

const strings = {
  es: {
    title: 'Prospectos', intro: 'Solicitudes de diagnóstico empresarial provenientes de la web y redes sociales.',
    search: 'Buscar nombre, empresa o correo', all: 'Todos los estados', refresh: 'Actualizar',
    empty: 'Aún no hay solicitudes en este filtro.', select: 'Selecciona un prospecto para revisar su seguimiento.',
    showing: 'Mostrando hasta 200 de', source: 'Origen', received: 'Recibido', next: 'Próxima acción',
    challenge: 'Reto principal', owner: 'Responsable', unassigned: 'Sin asignar', status: 'Estado',
    note: 'Nota de seguimiento', noteHint: 'Registra lo acordado y la siguiente acción.',
    save: 'Guardar seguimiento', saving: 'Guardando…', history: 'Historial',
    diagnosis: 'Diagnóstico completado', trial: 'Prueba guiada de 15 días',
    trialNote: 'Seguimiento sugerido durante la prueba: días 3, 7 y 15.',
    trialProvisioning: 'Este registro no activa agentes ni acceso técnico; confirma la activación por separado.',
    followup: 'Seguimiento día', campaign: 'Campaña', channel: 'Canal', plan: 'Plan de interés',
    noDate: 'Sin fecha', overdue: 'Vencida', success: 'Seguimiento guardado.',
    error: 'No se pudo cargar o guardar la solicitud. Actualiza e inténtalo de nuevo.',
    reason: 'Indica el motivo al pasar a nutrición o sin interés.',
  },
  en: {
    title: 'Leads', intro: 'Business diagnosis requests from the website and social campaigns.',
    search: 'Search name, company or email', all: 'All statuses', refresh: 'Refresh',
    empty: 'No requests match this filter yet.', select: 'Select a lead to review its follow-up.',
    showing: 'Showing up to 200 of', source: 'Source', received: 'Received', next: 'Next action',
    challenge: 'Main challenge', owner: 'Owner', unassigned: 'Unassigned', status: 'Status',
    note: 'Follow-up note', noteHint: 'Record what was agreed and the next action.',
    save: 'Save follow-up', saving: 'Saving…', history: 'History',
    diagnosis: 'Diagnosis completed', trial: '15-day guided trial',
    trialNote: 'Suggested trial follow-up: days 3, 7 and 15.',
    trialProvisioning: 'This record does not activate agents or technical access; confirm activation separately.',
    followup: 'Follow-up day', campaign: 'Campaign', channel: 'Channel', plan: 'Interested plan',
    noDate: 'No date', overdue: 'Overdue', success: 'Follow-up saved.',
    error: 'The request could not be loaded or saved. Refresh and try again.',
    reason: 'Provide a reason when moving to nurture or lost.',
  },
} as const;

const statusLabels: Record<PlatformLeadStatus, { es: string; en: string }> = {
  NEW: { es: 'Nuevo', en: 'New' },
  CONTACTED: { es: 'Contactado', en: 'Contacted' },
  DIAGNOSIS_SCHEDULED: { es: 'Diagnóstico agendado', en: 'Diagnosis scheduled' },
  DIAGNOSIS_COMPLETED: { es: 'Diagnóstico realizado', en: 'Diagnosis completed' },
  TRIAL_ACTIVE: { es: 'Prueba activa', en: 'Trial active' },
  PROPOSAL: { es: 'Propuesta', en: 'Proposal' },
  WON: { es: 'Cliente', en: 'Won' },
  LOST: { es: 'Sin interés', en: 'Lost' },
  NURTURE: { es: 'Nutrición', en: 'Nurture' },
};

function localInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function addDays(value: string, days: number) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

export function PlatformLeadsTab({ locale }: { locale: string }) {
  const language = locale.startsWith('es') ? 'es' : 'en';
  const copy = strings[language];
  const formatDate = (value: string | null) => value
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : copy.noDate;
  const [items, setItems] = useState<PlatformLead[]>([]);
  const [total, setTotal] = useState(0);
  const [assignees, setAssignees] = useState<PlatformLeadAssignee[]>([]);
  const [selected, setSelected] = useState<PlatformLeadDetail | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [status, setStatus] = useState<PlatformLeadStatus>('NEW');
  const [ownerId, setOwnerId] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [page, admins] = await Promise.all([
        platformLeadsApi.list(query, statusFilter), platformLeadsApi.assignees(),
      ]);
      setItems(page.items);
      setTotal(page.total);
      setAssignees(admins);
      setMessage('');
    } catch {
      setMessage(copy.error);
    }
  }, [query, statusFilter, copy.error]);

  useEffect(() => { void refresh(); }, [refresh]);

  const open = async (id: number) => {
    setBusy(true);
    setMessage('');
    try {
      const detail = await platformLeadsApi.detail(id);
      setSelected(detail);
      setStatus(detail.lead.status);
      setOwnerId(detail.lead.assignedAdminId?.toString() ?? '');
      setNextAction(localInput(detail.lead.nextActionAt));
      setNote('');
    } catch {
      setMessage(copy.error);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!selected || busy) return;
    if ((status === 'LOST' || status === 'NURTURE') && status !== selected.lead.status && !note.trim()) {
      setMessage(copy.reason);
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const detail = await platformLeadsApi.update(selected.lead.id, {
        status,
        assignedAdminId: ownerId === '' ? 0 : Number(ownerId),
        nextActionAt: nextAction ? new Date(nextAction).toISOString() : null,
        clearNextAction: nextAction === '' && Boolean(selected.lead.nextActionAt),
        note: note.trim(),
        version: selected.lead.version,
      });
      setSelected(detail);
      setStatus(detail.lead.status);
      setNextAction(localInput(detail.lead.nextActionAt));
      setNote('');
      await refresh();
      setMessage(copy.success);
    } catch {
      setMessage(copy.error);
    } finally {
      setBusy(false);
    }
  };

  return <section className="space-y-5">
    <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-slate-900">{copy.title}</h1><p className="mt-1 text-sm text-slate-600">{copy.intro}</p></div>
        <button type="button" onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><RefreshCw size={16} />{copy.refresh}</button>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <input aria-label={copy.search} placeholder={copy.search} value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-[220px] flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        <select aria-label={copy.status} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="">{copy.all}</option>{Object.keys(statusLabels).map((key) => <option key={key} value={key}>{statusLabels[key as PlatformLeadStatus][language]}</option>)}</select>
      </div>
      <p className="mt-3 text-xs text-slate-500">{copy.showing} {total}</p>
    </header>
    {message ? <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</p> : null}
    <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.85fr)_minmax(500px,1.15fr)]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {items.length === 0 ? <p className="p-6 text-sm text-slate-500">{copy.empty}</p> : items.map((lead) =>
          <button key={lead.id} type="button" onClick={() => void open(lead.id)} className={`flex w-full items-start justify-between gap-3 border-b border-slate-100 p-4 text-left transition hover:bg-blue-50 ${selected?.lead.id === lead.id ? 'bg-blue-50' : ''}`}>
            <span className="min-w-0"><strong className="block truncate text-sm text-slate-900">{lead.companyName}</strong><span className="block truncate text-sm text-slate-600">{lead.fullName} · {lead.email}</span><span className="mt-1 block text-xs text-slate-500">{copy.received}: {formatDate(lead.createdAt)}</span>{lead.nextActionAt ? <span className={`mt-1 block text-xs ${new Date(lead.nextActionAt).getTime() < Date.now() ? 'font-semibold text-amber-700' : 'text-slate-600'}`}>{copy.next}: {formatDate(lead.nextActionAt)}{new Date(lead.nextActionAt).getTime() < Date.now() ? ` · ${copy.overdue}` : ''}</span> : null}</span>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{statusLabels[lead.status][language]}</span>
          </button>)}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {!selected ? <p className="text-sm text-slate-500">{copy.select}</p> : <div className="space-y-5">
          <div><h2 className="text-xl font-semibold text-slate-900">{selected.lead.companyName}</h2><p className="text-sm text-slate-600">{selected.lead.fullName}</p><div className="mt-3 flex flex-wrap gap-3 text-sm"><a className="inline-flex items-center gap-1 text-blue-700" href={`mailto:${selected.lead.email}`}><Mail size={15} />{selected.lead.email}</a>{selected.lead.phone ? <a className="inline-flex items-center gap-1 text-blue-700" href={`tel:${selected.lead.phone}`}><Phone size={15} />{selected.lead.phone}</a> : null}</div></div>
          <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2"><p><strong>{copy.channel}:</strong> {selected.lead.sourceChannel}</p><p><strong>{copy.plan}:</strong> {selected.lead.planInterest === 'CONTROLA' ? 'Controla' : selected.lead.planInterest === 'ESCALA' ? 'Escala' : selected.lead.planInterest === 'CORPORATIVO' ? 'Corporativo' : '—'}</p><p><strong>{copy.campaign}:</strong> {selected.lead.utmCampaign || '—'}</p><p><strong>{copy.source}:</strong> {selected.lead.utmSource || '—'}</p><p><strong>{copy.received}:</strong> {formatDate(selected.lead.createdAt)}</p></div>
          <div><h3 className="font-semibold text-slate-900">{copy.challenge}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{selected.lead.challenge}</p></div>
          {selected.lead.diagnosisCompletedAt ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{copy.diagnosis}: {formatDate(selected.lead.diagnosisCompletedAt)}</p> : null}
          {selected.lead.trialStartedAt ? <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900"><strong>{copy.trial}</strong><p>{formatDate(selected.lead.trialStartedAt)} → {formatDate(selected.lead.trialEndsAt)}</p><p className="mt-1">{copy.trialNote}</p><p className="mt-1 text-xs">{copy.trialProvisioning}</p><div className="mt-2 flex flex-wrap gap-2">{[3, 7, 15].map((day) => <span key={day} className="rounded-lg bg-white px-2 py-1">{copy.followup} {day}: {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(addDays(selected.lead.trialStartedAt!, day))}</span>)}</div></div> : null}
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">{copy.status}<select value={status} onChange={(event) => { const nextStatus = event.target.value as PlatformLeadStatus; setStatus(nextStatus); if (nextStatus === 'TRIAL_ACTIVE' && selected.lead.status !== 'TRIAL_ACTIVE') setNextAction(''); }} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2"><option value={selected.lead.status}>{statusLabels[selected.lead.status][language]}</option>{transitions[selected.lead.status].map((value) => <option key={value} value={value}>{statusLabels[value][language]}</option>)}</select></label><label className="text-sm font-medium text-slate-700">{copy.owner}<select value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2"><option value="">{copy.unassigned}</option>{assignees.map((admin) => <option key={admin.id} value={admin.id}>{admin.name || admin.email}</option>)}</select></label></div>
          <label className="block text-sm font-medium text-slate-700"><span className="inline-flex items-center gap-1"><CalendarClock size={15} />{copy.next}</span><input type="datetime-local" value={nextAction} onChange={(event) => setNextAction(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
          <label className="block text-sm font-medium text-slate-700">{copy.note}<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={copy.noteHint} maxLength={2000} rows={3} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
          <button type="button" disabled={busy} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{busy ? copy.saving : copy.save}<ArrowRight size={16} /></button>
          <div><h3 className="font-semibold text-slate-900">{copy.history}</h3><ol className="mt-2 space-y-2">{selected.events.map((event) => <li key={event.id} className="rounded-xl border border-slate-100 p-3 text-sm"><p className="font-medium text-slate-800">{event.toStatus ? statusLabels[event.toStatus]?.[language] ?? event.eventType : event.eventType}</p><p className="text-xs text-slate-500">{formatDate(event.occurredAt)}{event.actorName ? ` · ${event.actorName}` : ''}</p>{event.note ? <p className="mt-1 whitespace-pre-wrap text-slate-700">{event.note}</p> : null}</li>)}</ol></div>
        </div>}
      </div>
    </div>
  </section>;
}
