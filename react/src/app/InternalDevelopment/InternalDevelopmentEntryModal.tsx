import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ChevronDown, FilePlus2, LoaderCircle, Save, SlidersHorizontal } from 'lucide-react';
import { IndiceModalFrame, IndiceModalValidation } from '../components/indice-modal';
import { internalDevelopmentApi } from './internalDevelopmentApi';
import { getInternalDevelopmentCopy } from './internalDevelopment.copy';
import type {
  InternalDevelopmentArea,
  InternalDevelopmentDetail,
  InternalDevelopmentEntry,
  InternalDevelopmentEntryPayload,
  InternalDevelopmentEntryType,
  InternalDevelopmentMember,
  InternalDevelopmentStatus,
} from './internalDevelopment.types';

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white';
const textAreaClass = `${inputClass} min-h-28 resize-y py-3`;

interface FormState {
  entryType: InternalDevelopmentEntryType;
  area: InternalDevelopmentArea;
  status: InternalDevelopmentStatus;
  title: string;
  summary: string;
  details: string;
  decisions: string;
  nextSteps: string;
  eventAt: string;
  periodStart: string;
  periodEnd: string;
  location: string;
  referenceUrl: string;
  ownerUserId: string;
  relatedEntryId: string;
  participantUserIds: number[];
}

function localDateTime(value?: string) {
  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function currentWeek() {
  const today = new Date();
  const day = today.getDay() || 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const asDate = (value: Date) => {
    const offset = value.getTimezoneOffset() * 60_000;
    return new Date(value.getTime() - offset).toISOString().slice(0, 10);
  };
  return { start: asDate(monday), end: asDate(sunday) };
}

function initialForm(entry: InternalDevelopmentEntry | null, members: InternalDevelopmentMember[], currentUserId?: number): FormState {
  const week = currentWeek();
  if (entry) {
    return {
      entryType: entry.entryType,
      area: entry.area,
      status: entry.status,
      title: entry.title,
      summary: entry.summary,
      details: entry.details ?? '',
      decisions: entry.decisions ?? '',
      nextSteps: entry.nextSteps ?? '',
      eventAt: localDateTime(entry.eventAt),
      periodStart: entry.periodStart ?? '',
      periodEnd: entry.periodEnd ?? '',
      location: entry.location ?? '',
      referenceUrl: entry.referenceUrl ?? '',
      ownerUserId: String(entry.ownerUserId),
      relatedEntryId: entry.relatedEntryId ? String(entry.relatedEntryId) : '',
      participantUserIds: entry.participants.map((participant) => participant.id),
    };
  }
  const owner = members.find((member) => member.id === currentUserId) ?? members[0];
  return {
    entryType: 'WEEKLY_REPORT', area: 'DEVELOPMENT', status: 'RECORDED', title: '', summary: '',
    details: '', decisions: '', nextSteps: '', eventAt: localDateTime(), periodStart: week.start,
    periodEnd: week.end, location: '', referenceUrl: '', ownerUserId: owner ? String(owner.id) : '',
    relatedEntryId: '', participantUserIds: owner ? [owner.id] : [],
  };
}

export function InternalDevelopmentEntryModal({
  english,
  entries,
  entry,
  currentUserId,
  members,
  onOpenChange,
  onSaved,
  open,
}: {
  english: boolean;
  entries: InternalDevelopmentEntry[];
  entry: InternalDevelopmentEntry | null;
  currentUserId?: number;
  members: InternalDevelopmentMember[];
  onOpenChange: (open: boolean) => void;
  onSaved: (detail: InternalDevelopmentDetail) => Promise<void>;
  open: boolean;
}) {
  const copy = getInternalDevelopmentCopy(english);
  const [form, setForm] = useState<FormState>(() => initialForm(entry, members, currentUserId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const isWeekly = form.entryType === 'WEEKLY_REPORT';
  const isMeeting = form.entryType === 'BOARD_MEETING' || form.entryType === 'WORKING_MEETING';

  useEffect(() => {
    if (open) {
      setForm(initialForm(entry, members, currentUserId));
      setError('');
      setAdvancedOpen(false);
    }
  }, [currentUserId, entry, members, open]);

  const canSubmit = Boolean(
    form.title.trim() && form.summary.trim() && form.eventAt && form.ownerUserId
    && (!isWeekly || (form.periodStart && form.periodEnd)),
  );
  const relatedOptions = useMemo(
    () => entries.filter((candidate) => candidate.id !== entry?.id),
    [entries, entry?.id],
  );
  const ownerName = members.find((member) => String(member.id) === form.ownerUserId)?.name;
  const optionalDetailCount = [
    form.details,
    form.decisions,
    form.nextSteps,
    form.referenceUrl,
    form.relatedEntryId,
    form.participantUserIds.some((userId) => String(userId) !== form.ownerUserId) ? 'participants' : '',
  ].filter(Boolean).length;
  const titlePlaceholder = english
    ? isWeekly ? 'e.g. Development progress for this week' : isMeeting ? 'e.g. Product follow-up meeting' : 'e.g. New module contribution'
    : isWeekly ? 'Ej. Avances de desarrollo de esta semana' : isMeeting ? 'Ej. Junta de seguimiento de producto' : 'Ej. Contribución al nuevo módulo';

  const setType = (entryType: InternalDevelopmentEntryType) => {
    setForm((current) => ({
      ...current,
      entryType,
      status: entryType === 'BOARD_MEETING' || entryType === 'WORKING_MEETING'
        ? 'PLANNED'
        : current.status === 'PLANNED' ? 'RECORDED' : current.status,
    }));
  };

  const toggleParticipant = (userId: number) => {
    setForm((current) => ({
      ...current,
      participantUserIds: current.participantUserIds.includes(userId)
        ? current.participantUserIds.filter((id) => id !== userId)
        : [...current.participantUserIds, userId],
    }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);
    setError('');
    try {
      const payload: InternalDevelopmentEntryPayload = {
        entryType: form.entryType,
        area: form.area,
        status: form.status,
        title: form.title.trim(),
        summary: form.summary.trim(),
        details: form.details.trim() || null,
        decisions: form.decisions.trim() || null,
        nextSteps: form.nextSteps.trim() || null,
        eventAt: new Date(form.eventAt).toISOString(),
        periodStart: isWeekly ? form.periodStart : null,
        periodEnd: isWeekly ? form.periodEnd : null,
        location: isMeeting ? form.location.trim() || null : null,
        referenceUrl: form.referenceUrl.trim() || null,
        ownerUserId: Number(form.ownerUserId),
        relatedEntryId: form.relatedEntryId ? Number(form.relatedEntryId) : null,
        participantUserIds: form.participantUserIds,
        version: entry?.version,
      };
      const detail = entry
        ? await internalDevelopmentApi.update(entry.id, payload)
        : await internalDevelopmentApi.create(payload);
      onOpenChange(false);
      await onSaved(detail);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : (english ? 'The record could not be saved.' : 'No se pudo guardar el registro.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <IndiceModalFrame
      open={open}
      onOpenChange={onOpenChange}
      busy={saving}
      eyebrow={entry ? entry.folio : (english ? 'New corporate evidence' : 'Nueva evidencia corporativa')}
      title={entry ? (english ? 'Edit internal record' : 'Editar registro interno') : copy.newEntry}
      description={english ? 'Complete the essentials now. Add detailed traceability only when it brings value.' : 'Completa lo esencial ahora. Agrega trazabilidad detallada solo cuando aporte valor.'}
      icon={<FilePlus2 className="h-5 w-5" />}
      modalType="standard-form"
      tone="aqua"
      footerSummary={entry ? `${entry.folio} · v${entry.version}` : (english ? 'Quick capture · optional traceability' : 'Captura rápida · trazabilidad opcional')}
      footer={(
        <>
          <button type="button" disabled={saving} onClick={() => onOpenChange(false)} className="h-10 rounded-xl border border-white/40 px-4 text-sm font-medium text-white">
            {english ? 'Cancel' : 'Cancelar'}
          </button>
          <button type="submit" form="internal-development-entry-form" disabled={saving || !canSubmit} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-[#176B5B] disabled:opacity-50">
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? (english ? 'Saving…' : 'Guardando…') : (english ? 'Save record' : 'Guardar registro')}
          </button>
        </>
      )}
    >
      <form id="internal-development-entry-form" className="space-y-5" onSubmit={submit}>
        {error ? <IndiceModalValidation tone="error" messages={[error]} /> : null}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-4 dark:border-slate-800">
            <h3 className="text-base font-medium text-slate-900 dark:text-white">{english ? 'Quick record' : 'Registro rápido'}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {english ? 'Complete the essential information. Everything else is optional.' : 'Completa la información esencial. Todo lo demás es opcional.'}
            </p>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={copy.type}>
                <select className={inputClass} value={form.entryType} onChange={(event) => setType(event.target.value as InternalDevelopmentEntryType)}>
                  {Object.entries(copy.types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label={copy.area}>
                <select className={inputClass} value={form.area} onChange={(event) => setForm((current) => ({ ...current, area: event.target.value as InternalDevelopmentArea }))}>
                  {Object.entries(copy.areas).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
            </div>

            <Field label={english ? 'What are you recording?' : '¿Qué estás registrando?'}>
              <input className={inputClass} required maxLength={180} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder={titlePlaceholder} />
            </Field>
            <Field label={english ? 'Brief result or progress' : 'Resultado o avance breve'}>
              <textarea
                className={textAreaClass}
                required
                maxLength={700}
                value={form.summary}
                onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                placeholder={english ? 'Summarize what was done, achieved or left pending.' : 'Resume qué se hizo, qué se logró o qué quedó pendiente.'}
              />
            </Field>

            {isWeekly ? (
              <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 dark:border-slate-800">
                <Field label={english ? 'Week starts' : 'Semana desde'}><input type="date" className={inputClass} required value={form.periodStart} onChange={(event) => setForm((current) => ({ ...current, periodStart: event.target.value }))} /></Field>
                <Field label={english ? 'Week ends' : 'Semana hasta'}><input type="date" className={inputClass} required value={form.periodEnd} onChange={(event) => setForm((current) => ({ ...current, periodEnd: event.target.value }))} /></Field>
              </div>
            ) : null}

            {isMeeting ? (
              <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 dark:border-slate-800">
                <Field label={english ? 'Meeting date and time' : 'Fecha y hora de la junta'}>
                  <input type="datetime-local" className={inputClass} required value={form.eventAt} onChange={(event) => setForm((current) => ({ ...current, eventAt: event.target.value }))} />
                </Field>
                <Field label={english ? 'Location or channel' : 'Lugar o canal'}>
                  <input className={inputClass} maxLength={180} value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder={english ? 'Board room, Meet link…' : 'Sala, enlace de Meet…'} />
                </Field>
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/30">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {english ? 'It will be saved as' : 'Se guardará como'} <span className="font-medium text-slate-700 dark:text-slate-200">{copy.statuses[form.status]}</span>
              {' · '}{english ? 'Responsible' : 'Responsable'}: <span className="font-medium text-slate-700 dark:text-slate-200">{ownerName ?? '—'}</span>
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#59C3A5]/45 bg-white dark:bg-slate-900">
          <button
            type="button"
            aria-expanded={advancedOpen}
            aria-controls="internal-development-advanced-fields"
            onClick={() => setAdvancedOpen((current) => !current)}
            className="flex min-h-16 w-full items-center gap-3 p-4 text-left transition hover:bg-[#59C3A5]/8"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#59C3A5]/15 text-[#176B5B]"><SlidersHorizontal className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-900 dark:text-white">{english ? 'Add details and traceability' : 'Agregar detalles y trazabilidad'}</span>
              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{english ? 'Evidence, participants, decisions and next steps.' : 'Evidencia, participantes, decisiones y siguientes pasos.'}</span>
            </span>
            <span className="rounded-full bg-[#59C3A5]/15 px-2.5 py-1 text-xs font-medium text-[#176B5B]">
              {optionalDetailCount > 0
                ? (english ? `${optionalDetailCount} details` : `${optionalDetailCount} detalles`)
                : (english ? 'Optional' : 'Opcional')}
            </span>
            <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${advancedOpen ? 'rotate-180' : ''}`} />
          </button>

          {advancedOpen ? (
            <div id="internal-development-advanced-fields" className="space-y-6 border-t border-[#59C3A5]/30 p-4">
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">{english ? 'Control information' : 'Información de control'}</h3>
                <p className="mt-1 text-xs text-slate-500">{english ? 'Adjust only when the default values do not apply.' : 'Ajústala únicamente cuando los valores automáticos no correspondan.'}</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label={copy.status}>
                    <select className={inputClass} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as InternalDevelopmentStatus }))}>
                      {Object.entries(copy.statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </Field>
                  <Field label={copy.owner}>
                    <select className={inputClass} required value={form.ownerUserId} onChange={(event) => setForm((current) => ({ ...current, ownerUserId: event.target.value }))}>
                      <option value="">{english ? 'Select a Root user' : 'Selecciona un usuario Root'}</option>
                      {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                    </select>
                  </Field>
                  {!isMeeting ? (
                    <Field label={english ? 'Record date and time' : 'Fecha y hora del registro'}>
                      <input type="datetime-local" className={inputClass} required value={form.eventAt} onChange={(event) => setForm((current) => ({ ...current, eventAt: event.target.value }))} />
                    </Field>
                  ) : null}
                  <Field label={english ? 'Related record' : 'Registro relacionado'}>
                    <select className={inputClass} value={form.relatedEntryId} onChange={(event) => setForm((current) => ({ ...current, relatedEntryId: event.target.value }))}>
                      <option value="">{english ? 'No related record' : 'Sin registro relacionado'}</option>
                      {relatedOptions.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.folio} · {candidate.title}</option>)}
                    </select>
                  </Field>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">{english ? 'Evidence' : 'Evidencia'}</h3>
                <div className="mt-4 space-y-4">
                  <Field label={english ? 'Detailed evidence' : 'Detalle adicional'}><textarea className={textAreaClass} maxLength={20_000} value={form.details} onChange={(event) => setForm((current) => ({ ...current, details: event.target.value }))} placeholder={english ? 'Add context, metrics or relevant facts.' : 'Agrega contexto, métricas o hechos relevantes.'} /></Field>
                  <Field label={english ? 'Evidence link' : 'Enlace de evidencia'}><input type="url" className={inputClass} maxLength={700} value={form.referenceUrl} onChange={(event) => setForm((current) => ({ ...current, referenceUrl: event.target.value }))} placeholder="https://" /></Field>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">{copy.participants}</h3>
                <p className="mt-1 text-xs text-slate-500">{english ? 'The responsible person is included automatically.' : 'La persona responsable se incluye automáticamente.'}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {members.map((member) => {
                    const checked = form.participantUserIds.includes(member.id) || form.ownerUserId === String(member.id);
                    return (
                      <label key={member.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${checked ? 'border-[#59C3A5] bg-[#59C3A5]/10 text-[#176B5B]' : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}>
                        <input type="checkbox" checked={checked} disabled={form.ownerUserId === String(member.id)} onChange={() => toggleParticipant(member.id)} className="h-4 w-4 accent-[#177D66]" />
                        <span className="min-w-0"><span className="block truncate font-medium">{member.name}</span><span className="block truncate text-xs opacity-70">{member.email}</span></span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">{english ? 'Outcome and continuity' : 'Resultado y continuidad'}</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label={english ? 'Decisions' : 'Decisiones'}><textarea className={textAreaClass} maxLength={20_000} value={form.decisions} onChange={(event) => setForm((current) => ({ ...current, decisions: event.target.value }))} placeholder={english ? 'What was approved or defined?' : '¿Qué se aprobó o definió?'} /></Field>
                  <Field label={english ? 'Next steps' : 'Siguientes pasos'}><textarea className={textAreaClass} maxLength={20_000} value={form.nextSteps} onChange={(event) => setForm((current) => ({ ...current, nextSteps: event.target.value }))} placeholder={english ? 'Action, owner and expected date.' : 'Acción, responsable y fecha esperada.'} /></Field>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </form>
    </IndiceModalFrame>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200"><span className="block">{label}</span>{children}</label>;
}
