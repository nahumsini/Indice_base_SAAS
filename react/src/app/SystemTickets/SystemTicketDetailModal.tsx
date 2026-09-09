import { ticketDuration, ticketFileSize } from "./ticketFormatting";
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  LoaderCircle,
  MessageSquareText,
  Paperclip,
  Printer,
  Send,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react';
import { IndiceModalFrame, IndiceModalValidation } from '../components/indice-modal';
import { getSystemTicketCopy } from './translations';
import { printSystemTicketDetail } from './systemTicketPrint';
import { systemTicketsApi, type SystemTicketPortal } from './systemTicketsApi';
import type {
  SystemTicket,
  SystemTicketDetail,
  SystemTicketPriority,
  SystemTicketStatus,
  SystemTicketWorkspaceData,
} from './types';

const fieldClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#177D66] focus:ring-2 focus:ring-[#59C3A5]/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white';

type DetailModalProps = {
  assignees: SystemTicketWorkspaceData['assignees'];
  locale: string;
  onClose: () => void;
  onChanged: (ticket: SystemTicket) => Promise<void>;
  portal: SystemTicketPortal;
  ticket: SystemTicket | null;
};

export function SystemTicketDetailModal({ assignees, locale, onClose, onChanged, portal, ticket }: DetailModalProps) {
  const copy = getSystemTicketCopy(locale);
  const [detail, setDetail] = useState<SystemTicketDetail | null>(null);
  const [status, setStatus] = useState<SystemTicketStatus>('OPEN');
  const [priority, setPriority] = useState<SystemTicketPriority>('MEDIUM');
  const [assignee, setAssignee] = useState('');
  const [target, setTarget] = useState('');
  const [message, setMessage] = useState('');
  const [internal, setInternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = async (ticketId: number) => {
    setLoading(true);
    setError('');
    try {
      const next = await systemTicketsApi.detail(portal, ticketId);
      setDetail(next);
      setStatus(next.ticket.status);
      setPriority(next.ticket.priority);
      setAssignee(next.ticket.assigned_to_user_id ? String(next.ticket.assigned_to_user_id) : '');
      setTarget(toLocalInput(next.ticket.target_resolution_at));
    } catch (loadError) {
      setError(copy.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ticket) {
      setDetail(null);
      return;
    }
    void refresh(ticket.id);
  }, [portal, ticket?.id]);

  const current = detail?.ticket ?? ticket;
  const hasOperationalChanges = portal === 'root' && current && (
    status !== current.status
    || priority !== current.priority
    || assignee !== (current.assigned_to_user_id ? String(current.assigned_to_user_id) : '')
    || target !== toLocalInput(current.target_resolution_at)
  );

  const saveOperations = async () => {
    if (!current || portal !== 'root') return;
    setSaving(true);
    setError('');
    try {
      let updated = current;
      if (
        status !== current.status
        || priority !== current.priority
        || target !== toLocalInput(current.target_resolution_at)
      ) {
        updated = await systemTicketsApi.update(current.id, {
          status,
          priority,
          root_response: current.root_response ?? '',
          target_resolution_at: target ? new Date(target).toISOString() : current.target_resolution_at,
        });
      }
      if (assignee !== (current.assigned_to_user_id ? String(current.assigned_to_user_id) : '')) {
        updated = await systemTicketsApi.assign(current.id, assignee ? Number(assignee) : null);
      }
      await onChanged(updated);
      await refresh(current.id);
    } catch (saveError) {
      setError(copy.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const takeTicket = async () => {
    if (!current || portal !== 'root') return;
    setSaving(true);
    setError('');
    try {
      const updated = await systemTicketsApi.take(current.id);
      await onChanged(updated);
      await refresh(current.id);
    } catch (takeError) {
      setError(copy.takeFailed);
    } finally {
      setSaving(false);
    }
  };

  const sendMessage = async () => {
    if (!current || !message.trim()) return;
    setSaving(true);
    setError('');
    try {
      const next = await systemTicketsApi.addMessage(
        portal,
        current.id,
        message.trim(),
        portal === 'root' && internal ? 'INTERNAL' : 'PUBLIC',
      );
      setDetail(next);
      setMessage('');
      setInternal(false);
      await onChanged(next.ticket);
    } catch (messageError) {
      setError(copy.messageFailed);
    } finally {
      setSaving(false);
    }
  };

  const uploadEvidence = async (file: File | null) => {
    if (!current || !file) return;
    setUploading(true);
    setError('');
    try {
      const presign = await systemTicketsApi.presignAttachment(portal, current.id, file);
      await systemTicketsApi.uploadAttachment(presign.upload_url, file, presign.upload_headers);
      await systemTicketsApi.registerAttachment(portal, current.id, presign, file);
      await refresh(current.id);
    } catch (uploadError) {
      setError(copy.uploadFailed);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const printDetail = () => {
    if (!detail) return;
    printSystemTicketDetail({ detail, locale });
  };

  const footer = portal === 'root' ? (
    <>
      <button type="button" disabled={saving || uploading} onClick={onClose} className="h-10 rounded-xl border border-white/40 px-4 text-sm font-medium text-white">
        {copy.close}
      </button>
      <button type="button" disabled={saving || uploading || loading || !detail} onClick={printDetail} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/50 px-4 text-sm font-medium text-white disabled:opacity-50">
        <Printer className="h-4 w-4" />{copy.print}
      </button>
      <button type="button" disabled={saving || uploading || !hasOperationalChanges} onClick={() => void saveOperations()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-[#176B5B] disabled:opacity-50">
        {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {copy.save}
      </button>
    </>
  ) : (
    <>
      <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/40 px-4 text-sm font-medium text-white">{copy.close}</button>
      <button type="button" disabled={loading || !detail} onClick={printDetail} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-[#176B5B] disabled:opacity-50">
        <Printer className="h-4 w-4" />{copy.print}
      </button>
    </>
  );

  return (
    <IndiceModalFrame
      open={Boolean(ticket)}
      onOpenChange={(open) => !open && onClose()}
      busy={saving || uploading}
      tone="aqua"
      modalType="standard-form"
      contentClassName="h-[min(94dvh,860px)]"
      bodyClassName="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-24 [scrollbar-gutter:stable] sm:px-6 sm:py-5 sm:pb-10"
      icon={<MessageSquareText className="h-5 w-5" />}
      eyebrow={current?.folio}
      title={current?.title ?? copy.detailTitle}
      description={current ? `${current.distributor_name} · ${statusLabel(current.status, copy)}` : ''}
      footerSummary={current ? <SlaBadge ticket={current} copy={copy} locale={locale} /> : null}
      footer={footer}
    >
      {error ? <IndiceModalValidation tone="error" messages={[error]} /> : null}
      {loading && !detail ? (
        <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-5 w-5 animate-spin" />{copy.loading}
        </div>
      ) : current ? (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label={copy.distributor} value={current.distributor_name} />
            <Detail label={copy.reporter} value={`${current.reporter_name} · ${current.reporter_email}`} />
            <Detail label={copy.module} value={current.module || '—'} />
            <Detail label={copy.createdAt} value={formatDate(current.created_at, locale)} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{current.type === 'FAILURE' ? copy.failure : copy.improvement}</span>
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">{priorityLabel(current.priority, copy)}</span>
              <SlaBadge ticket={current} copy={copy} locale={locale} />
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{current.description}</p>
          </section>

          {portal === 'root' ? (
            <section className="rounded-2xl border border-[#59C3A5]/30 bg-[#59C3A5]/8 p-4 dark:border-[#59C3A5]/40 dark:bg-[#59C3A5]/10">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-950 dark:text-white">{copy.control}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{copy.controlHelp}</p>
                </div>
                {!current.assigned_to_user_id ? (
                  <button type="button" disabled={saving} onClick={() => void takeTicket()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white hover:bg-[#126553]">
                    <UserRoundCheck className="h-4 w-4" />{copy.takeTicket}
                  </button>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={copy.status}>
                  <select className={fieldClass} value={status} onChange={(event) => setStatus(event.target.value as SystemTicketStatus)}>
                    <option value="OPEN">{copy.open}</option><option value="IN_REVIEW">{copy.inReview}</option>
                    <option value="WAITING_ON_REPORTER">{copy.waitingOnReporter}</option><option value="PLANNED">{copy.planned}</option>
                    <option value="RESOLVED">{copy.resolved}</option><option value="CLOSED">{copy.closed}</option>
                  </select>
                </Field>
                <Field label={copy.priority}>
                  <select className={fieldClass} value={priority} onChange={(event) => setPriority(event.target.value as SystemTicketPriority)}>
                    <option value="LOW">{copy.priorityLow}</option><option value="MEDIUM">{copy.priorityMedium}</option>
                    <option value="HIGH">{copy.priorityHigh}</option><option value="CRITICAL">{copy.priorityCritical}</option>
                  </select>
                </Field>
                <Field label={copy.assignee}>
                  <select className={fieldClass} value={assignee} onChange={(event) => setAssignee(event.target.value)}>
                    <option value="">{copy.noAssignee}</option>
                    {assignees.map((option) => <option key={option.user_id} value={option.user_id}>{option.name}</option>)}
                  </select>
                </Field>
                <Field label={copy.target}>
                  <input className={fieldClass} type="datetime-local" value={target} onChange={(event) => setTarget(event.target.value)} />
                </Field>
              </div>
            </section>
          ) : null}

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-[#177D66]" /><h3 className="text-sm font-medium text-slate-950">{copy.conversation}</h3></div>
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {detail?.events.length ? detail.events.map((event) => (
                  <article key={event.id} className={`rounded-xl border p-3 ${event.visibility === 'INTERNAL' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium text-slate-900">{event.actor_name}{event.visibility === 'INTERNAL' ? ` · ${copy.internalNote}` : ''}</p>
                      <time className="text-[11px] text-slate-400">{formatDate(event.created_at, locale)}</time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-700">{event.note || eventLabel(event.event_type, copy)}</p>
                  </article>
                )) : <p className="py-8 text-center text-sm text-slate-500">{copy.noActivity}</p>}
              </div>
              <div className="mt-4 border-t border-slate-100 pt-4">
                <textarea className={`${fieldClass} min-h-24 resize-y py-3`} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={copy.messagePlaceholder} />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  {portal === 'root' ? (
                    <label className="inline-flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} />{copy.internalNote}</label>
                  ) : <span />}
                  <button type="button" disabled={saving || !message.trim()} onClick={() => void sendMessage()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white disabled:opacity-50">
                    <Send className="h-4 w-4" />{copy.sendMessage}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-3 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Paperclip className="h-4 w-4 text-[#177D66]" /><h3 className="text-sm font-medium text-slate-950">{copy.evidence}</h3></div><span className="text-xs text-slate-400">{detail?.attachments.length ?? 0}/10</span></div>
                <div className="space-y-2">
                  {detail?.attachments.map((attachment) => (
                    <a key={attachment.id} href={attachment.download_url ?? undefined} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm hover:border-[#59C3A5] hover:bg-[#59C3A5]/5">
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" /><span className="min-w-0 flex-1"><span className="block truncate font-medium text-slate-800">{attachment.original_filename}</span><span className="text-xs text-slate-400">{ticketFileSize(attachment.size_bytes, locale)}</span></span><Download className="h-4 w-4 text-[#177D66]" />
                    </a>
                  ))}
                </div>
                <input ref={fileInputRef} className="hidden" type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.csv,.docx,.xlsx" onChange={(event) => void uploadEvidence(event.target.files?.[0] ?? null)} />
                <button type="button" disabled={uploading || (detail?.attachments.length ?? 0) >= 10} onClick={() => fileInputRef.current?.click()} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#59C3A5]/40 text-sm font-medium text-[#176B5B] hover:bg-[#59C3A5]/10 disabled:opacity-50">
                  {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}{copy.addEvidence}
                </button>
                <p className="mt-2 text-xs leading-5 text-slate-400">{copy.uploadHelp}</p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#177D66]" /><h3 className="text-sm font-medium text-slate-950">{copy.sla}</h3></div>
                <Metric icon={<Clock3 className="h-4 w-4" />} label={copy.firstResponse} value={durationBetween(current.created_at, current.first_responded_at, locale)} />
                <Metric icon={<CalendarClock className="h-4 w-4" />} label={copy.target} value={current.target_resolution_at ? formatDate(current.target_resolution_at, locale) : '—'} />
                <Metric icon={current.overdue ? <AlertTriangle className="h-4 w-4 text-red-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />} label={copy.status} value={current.overdue ? copy.overdue : statusLabel(current.status, copy)} />
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </IndiceModalFrame>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-medium text-slate-900">{value}</p></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-2"><span className="block text-sm font-medium text-slate-700">{label}</span>{children}</label>;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="flex items-center gap-3 border-t border-slate-100 py-3 first:border-0 first:pt-0 last:pb-0"><span className="text-slate-400">{icon}</span><div><p className="text-xs text-slate-400">{label}</p><p className="mt-0.5 text-sm font-medium text-slate-800">{value}</p></div></div>;
}

function SlaBadge({ ticket, copy, locale }: { locale: string; ticket: SystemTicket; copy: ReturnType<typeof getSystemTicketCopy> }) {
  if (ticket.overdue) return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"><AlertTriangle className="h-3.5 w-3.5" />{copy.overdue}</span>;
  if (ticket.minutes_to_target == null || ['RESOLVED', 'CLOSED'].includes(ticket.status)) return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{statusLabel(ticket.status, copy)}</span>;
  return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{ticketDuration(ticket.minutes_to_target, locale)}</span>;
}

function statusLabel(status: SystemTicketStatus, copy: ReturnType<typeof getSystemTicketCopy>) {
  return { OPEN: copy.open, IN_REVIEW: copy.inReview, WAITING_ON_REPORTER: copy.waitingOnReporter, PLANNED: copy.planned, RESOLVED: copy.resolved, CLOSED: copy.closed }[status];
}

function priorityLabel(priority: SystemTicketPriority, copy: ReturnType<typeof getSystemTicketCopy>) {
  return { LOW: copy.priorityLow, MEDIUM: copy.priorityMedium, HIGH: copy.priorityHigh, CRITICAL: copy.priorityCritical }[priority];
}

function eventLabel(event: string, copy: ReturnType<typeof getSystemTicketCopy>) {
  return { CREATED: copy.createdEvent, ROOT_UPDATED: copy.statusEvent, ASSIGNED: copy.ownerEvent, PUBLIC_MESSAGE: copy.conversation, INTERNAL_NOTE: copy.internalNote, ATTACHMENT_ADDED: copy.addEvidence, REOPENED: copy.reopenedEvent }[event] ?? copy.activity;
}

function toLocalInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDate(value: string, locale: string) {
  try { return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); } catch { return value; }
}

function durationBetween(start: string, end: string | null, locale: string) {
  if (!end) return getSystemTicketCopy(locale).pending;
  const minutes = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000));
  return ticketDuration(minutes, locale);
}
