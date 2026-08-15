import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Lightbulb,
  LoaderCircle,
  MessageSquareText,
  Plus,
  RefreshCw,
  TicketCheck,
} from 'lucide-react';
import { IndiceModalFrame, IndiceModalValidation } from '../components/indice-modal';
import { IndiceFilterBar, IndiceFilterSearch, IndiceFilterSelect, IndiceTitleBar } from '../components/frontend-os';
import { DataTablePagination } from '../components/table/DataTablePagination';
import { getSystemTicketCopy } from './translations';
import { systemTicketsApi, type SystemTicketPortal } from './systemTicketsApi';
import type {
  SystemTicket,
  SystemTicketCreatePayload,
  SystemTicketPriority,
  SystemTicketStatus,
  SystemTicketStatusFilter,
  SystemTicketType,
  SystemTicketUpdatePayload,
  SystemTicketWorkspaceData,
} from './types';

const fieldClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 dark:border-slate-600 dark:bg-slate-900 dark:text-white';
const actionClass = 'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#2563EB]/40 hover:bg-blue-50 hover:text-[#143675] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200';

const initialCreate: SystemTicketCreatePayload = {
  type: 'FAILURE',
  priority: 'MEDIUM',
  module: '',
  title: '',
  description: '',
};

export function SystemTicketsWorkspace({ portal, locale }: { portal: SystemTicketPortal; locale: string }) {
  const copy = getSystemTicketCopy(locale);
  const [data, setData] = useState<SystemTicketWorkspaceData | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SystemTicketStatusFilter>(portal === 'root' ? 'ALL' : 'ACTIVE');
  const [type, setType] = useState<'ALL' | SystemTicketType>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [selected, setSelected] = useState<SystemTicket | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await systemTicketsApi.list(portal, { query, status, type }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Request could not be completed.');
    } finally {
      setLoading(false);
    }
  }, [portal, query, status, type]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  useEffect(() => setPage(1), [query, status, type, pageSize]);

  const tickets = data?.tickets ?? [];
  const totalPages = Math.max(1, Math.ceil(tickets.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = tickets.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, tickets.length);
  const pagedTickets = tickets.slice(pageStart ? pageStart - 1 : 0, pageEnd);

  const statusOptions = useMemo(() => [
    { value: 'ALL', label: copy.all },
    { value: 'ACTIVE', label: copy.active },
    { value: 'OPEN', label: copy.open },
    { value: 'IN_REVIEW', label: copy.inReview },
    { value: 'PLANNED', label: copy.planned },
    { value: 'RESOLVED', label: copy.resolved },
    { value: 'CLOSED', label: copy.closed },
  ], [copy]);

  const typeOptions = useMemo(() => [
    { value: 'ALL', label: copy.all },
    { value: 'FAILURE', label: copy.failure },
    { value: 'IMPROVEMENT', label: copy.improvement },
  ], [copy]);

  return (
    <div className="space-y-5">
      <IndiceTitleBar
        tone="blue"
        icon={<TicketCheck className="h-5 w-5" />}
        title={copy.title}
        subtitle={portal === 'root' ? copy.rootSubtitle : copy.distributorSubtitle}
        actions={(
          <div className="flex items-center gap-2">
            {portal === 'root' ? (
              <button type="button" onClick={() => void load()} aria-label={copy.retry} className={actionClass}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            ) : null}
            <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-medium text-white transition hover:bg-[#1D4ED8]">
              <Plus className="h-4 w-4" />{copy.newTicket}
            </button>
          </div>
        )}
      />

      {feedback ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{feedback}</div> : null}
      {error ? (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</span>
          <button type="button" onClick={() => void load()} className="font-medium underline">{copy.retry}</button>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={copy.title}>
        <SummaryCard label={copy.total} value={data?.summary.total ?? 0} icon={<TicketCheck className="h-5 w-5" />} />
        <SummaryCard label={copy.active} value={data?.summary.active ?? 0} icon={<AlertTriangle className="h-5 w-5" />} accent="text-amber-700 bg-amber-50" />
        <SummaryCard label={copy.inReview} value={data?.summary.in_review ?? 0} icon={<MessageSquareText className="h-5 w-5" />} accent="text-blue-700 bg-blue-50" />
        <SummaryCard label={copy.completed} value={data?.summary.completed ?? 0} icon={<CheckCircle2 className="h-5 w-5" />} accent="text-emerald-700 bg-emerald-50" />
      </section>

      <IndiceFilterBar
        title={copy.filters}
        subtitle={copy.filterSubtitle}
        summary={`${data?.matching_tickets ?? 0} ${copy.itemLabel}`}
        gridClassName="lg:grid-cols-[minmax(18rem,2fr)_minmax(11rem,1fr)_minmax(11rem,1fr)]"
      >
        <IndiceFilterSearch label={copy.search} placeholder={copy.searchPlaceholder} tone="blue" value={query} onValueChange={setQuery} onClear={() => setQuery('')} />
        <IndiceFilterSelect label={copy.status} tone="blue" value={status} options={statusOptions} onValueChange={(value) => setStatus(value as SystemTicketStatusFilter)} />
        <IndiceFilterSelect label={copy.type} tone="blue" value={type} options={typeOptions} onValueChange={(value) => setType(value as 'ALL' | SystemTicketType)} />
      </IndiceFilterBar>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-900/60">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <TableHead>{copy.folio}</TableHead>
                {portal === 'root' ? <TableHead>{copy.distributor}</TableHead> : null}
                <TableHead>{copy.report}</TableHead>
                <TableHead>{copy.type}</TableHead>
                <TableHead>{copy.priority}</TableHead>
                <TableHead>{copy.status}</TableHead>
                <TableHead>{copy.updated}</TableHead>
                <TableHead className="text-right">{copy.actions}</TableHead>
              </tr>
            </thead>
            <tbody>
              {pagedTickets.map((ticket) => (
                <tr key={ticket.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 dark:border-slate-700 dark:hover:bg-slate-900/40">
                  <TableCell><span className="font-medium text-[#143675] dark:text-blue-300">{ticket.folio}</span><span className="mt-1 block text-xs text-slate-400">{formatDate(ticket.created_at, locale)}</span></TableCell>
                  {portal === 'root' ? <TableCell><span className="font-medium text-slate-900 dark:text-white">{ticket.distributor_name}</span><span className="mt-1 block text-xs text-slate-500">{ticket.reporter_name}</span></TableCell> : null}
                  <TableCell><span className="block max-w-[22rem] truncate font-medium text-slate-900 dark:text-white">{ticket.title}</span><span className="mt-1 block text-xs text-slate-500">{ticket.module || '—'}</span></TableCell>
                  <TableCell><TypeBadge type={ticket.type} failure={copy.failure} improvement={copy.improvement} /></TableCell>
                  <TableCell><PriorityBadge priority={ticket.priority} copy={copy} /></TableCell>
                  <TableCell><StatusBadge status={ticket.status} copy={copy} /></TableCell>
                  <TableCell>{formatDate(ticket.updated_at, locale)}</TableCell>
                  <TableCell className="text-right"><button type="button" onClick={() => setSelected(ticket)} className={actionClass} aria-label={copy.view} title={copy.view}><Eye className="h-4 w-4" /></button></TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && !data ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" />{copy.loading}</div> : null}
        {!loading && pagedTickets.length === 0 ? <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center"><ClipboardCheck className="mb-3 h-9 w-9 text-slate-300" /><p className="font-medium text-slate-800 dark:text-white">{copy.noTickets}</p><p className="mt-1 text-sm text-slate-500">{copy.noTicketsHelp}</p></div> : null}
        <DataTablePagination
          currentPage={safePage}
          itemLabel={copy.itemLabel}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageEnd={pageEnd}
          pageSize={pageSize}
          pageSizeOptions={[10, 25, 50]}
          pageStart={pageStart}
          totalCount={tickets.length}
          totalPages={totalPages}
        />
      </section>

      <CreateTicketModal
        copy={copy}
        open={createOpen}
        portal={portal}
        onOpenChange={setCreateOpen}
        onCreated={async (ticket) => {
          setFeedback(`${copy.createdMessage} ${ticket.folio}`);
          const alreadyShowingActive = status === 'ACTIVE';
          setStatus('ACTIVE');
          if (alreadyShowingActive) await load();
        }}
      />
      <TicketDetailModal
        copy={copy}
        locale={locale}
        portal={portal}
        ticket={selected}
        onClose={() => setSelected(null)}
        onUpdated={async (ticket) => {
          setSelected(ticket);
          await load();
        }}
      />
    </div>
  );
}

function CreateTicketModal({ copy, open, portal, onOpenChange, onCreated }: { copy: ReturnType<typeof getSystemTicketCopy>; open: boolean; portal: SystemTicketPortal; onOpenChange: (open: boolean) => void; onCreated: (ticket: SystemTicket) => Promise<void> }) {
  const [form, setForm] = useState<SystemTicketCreatePayload>(initialCreate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    setError('');
    try {
      const created = await systemTicketsApi.create(portal, form);
      setForm(initialCreate);
      onOpenChange(false);
      await onCreated(created);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Request could not be completed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <IndiceModalFrame
      open={open}
      onOpenChange={onOpenChange}
      busy={saving}
      tone="blue"
      modalType="standard-form"
      icon={<Plus className="h-5 w-5" />}
      title={copy.createTitle}
      description={copy.createDescription}
      footerSummary={form.title || copy.newTicket}
      footer={(
        <>
          <button type="button" disabled={saving} onClick={() => onOpenChange(false)} className="h-10 rounded-xl border border-white/40 px-4 text-sm font-medium text-white">{copy.cancel}</button>
          <button type="submit" form="system-ticket-create-form" disabled={saving || !form.title.trim() || !form.description.trim()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-[#143675] disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <TicketCheck className="h-4 w-4" />}{saving ? copy.creating : copy.create}</button>
        </>
      )}
    >
      <form id="system-ticket-create-form" className="space-y-5" onSubmit={submit}>
        {error ? <IndiceModalValidation tone="error" messages={[error]} /> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <ChoiceCard active={form.type === 'FAILURE'} icon={<Bug className="h-5 w-5" />} label={copy.failure} onClick={() => setForm((current) => ({ ...current, type: 'FAILURE' }))} />
          <ChoiceCard active={form.type === 'IMPROVEMENT'} icon={<Lightbulb className="h-5 w-5" />} label={copy.improvement} onClick={() => setForm((current) => ({ ...current, type: 'IMPROVEMENT' }))} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={copy.priority}><select className={fieldClass} value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as SystemTicketPriority }))}><option value="LOW">{copy.priorityLow}</option><option value="MEDIUM">{copy.priorityMedium}</option><option value="HIGH">{copy.priorityHigh}</option><option value="CRITICAL">{copy.priorityCritical}</option></select></Field>
          <Field label={copy.moduleLabel}><input className={fieldClass} maxLength={120} placeholder={copy.modulePlaceholder} value={form.module} onChange={(event) => setForm((current) => ({ ...current, module: event.target.value }))} /></Field>
        </div>
        <Field label={copy.titleLabel}><input className={fieldClass} required maxLength={180} placeholder={copy.titlePlaceholder} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></Field>
        <Field label={copy.descriptionLabel}><textarea className={`${fieldClass} min-h-36 resize-y py-3`} required maxLength={10_000} placeholder={copy.descriptionPlaceholder} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></Field>
      </form>
    </IndiceModalFrame>
  );
}

function TicketDetailModal({ copy, locale, portal, ticket, onClose, onUpdated }: { copy: ReturnType<typeof getSystemTicketCopy>; locale: string; portal: SystemTicketPortal; ticket: SystemTicket | null; onClose: () => void; onUpdated: (ticket: SystemTicket) => Promise<void> }) {
  const [draft, setDraft] = useState<SystemTicketUpdatePayload>({ status: 'OPEN', priority: 'MEDIUM', root_response: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ticket) return;
    setDraft({ status: ticket.status, priority: ticket.priority, root_response: ticket.root_response ?? '' });
    setError('');
  }, [ticket]);

  const save = async () => {
    if (!ticket || portal !== 'root') return;
    setSaving(true);
    setError('');
    try {
      await onUpdated(await systemTicketsApi.update(ticket.id, draft));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Request could not be completed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <IndiceModalFrame
      open={Boolean(ticket)}
      onOpenChange={(open) => !open && onClose()}
      busy={saving}
      tone="blue"
      modalType="standard-form"
      icon={<Eye className="h-5 w-5" />}
      eyebrow={ticket?.folio}
      title={copy.detailTitle}
      description={ticket?.title ?? ''}
      footerSummary={ticket ? <StatusBadge status={ticket.status} copy={copy} /> : null}
      footer={portal === 'root' ? (
        <>
          <button type="button" disabled={saving} onClick={onClose} className="h-10 rounded-xl border border-white/40 px-4 text-sm font-medium text-white">{copy.close}</button>
          <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-[#143675] disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{saving ? copy.saving : copy.save}</button>
        </>
      ) : <button type="button" onClick={onClose} className="h-10 rounded-xl bg-white px-4 text-sm font-medium text-[#143675]">{copy.close}</button>}
    >
      {ticket ? <div className="space-y-5">
        {error ? <IndiceModalValidation tone="error" messages={[error]} /> : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label={copy.distributor} value={ticket.distributor_name} />
          <Detail label={copy.reporter} value={`${ticket.reporter_name} · ${ticket.reporter_email}`} />
          <Detail label={copy.module} value={ticket.module || '—'} />
          <Detail label={copy.createdAt} value={formatDate(ticket.created_at, locale)} />
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><div className="mb-3 flex flex-wrap items-center gap-2"><TypeBadge type={ticket.type} failure={copy.failure} improvement={copy.improvement} /><PriorityBadge priority={ticket.priority} copy={copy} /></div><p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{ticket.description}</p></section>
        {portal === 'root' ? <div className="grid gap-4 sm:grid-cols-2">
          <Field label={copy.status}><select className={fieldClass} value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as SystemTicketStatus }))}><option value="OPEN">{copy.open}</option><option value="IN_REVIEW">{copy.inReview}</option><option value="PLANNED">{copy.planned}</option><option value="RESOLVED">{copy.resolved}</option><option value="CLOSED">{copy.closed}</option></select></Field>
          <Field label={copy.priority}><select className={fieldClass} value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as SystemTicketPriority }))}><option value="LOW">{copy.priorityLow}</option><option value="MEDIUM">{copy.priorityMedium}</option><option value="HIGH">{copy.priorityHigh}</option><option value="CRITICAL">{copy.priorityCritical}</option></select></Field>
          <Field label={copy.rootResponse} className="sm:col-span-2"><textarea className={`${fieldClass} min-h-32 resize-y py-3`} maxLength={10_000} placeholder={copy.rootResponsePlaceholder} value={draft.root_response} onChange={(event) => setDraft((current) => ({ ...current, root_response: event.target.value }))} /></Field>
        </div> : <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><p className="text-sm font-medium text-[#143675]">{copy.rootResponse}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{ticket.root_response || '—'}</p></section>}
      </div> : null}
    </IndiceModalFrame>
  );
}

function SummaryCard({ label, value, icon, accent = 'text-[#143675] bg-blue-50' }: { label: string; value: number; icon: ReactNode; accent?: string }) {
  return <article className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>{icon}</span><div><p className="text-xs text-slate-500">{label}</p><p className="text-2xl font-medium tabular-nums text-slate-950 dark:text-white">{value}</p></div></article>;
}

function ChoiceCard({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex min-h-20 items-center gap-3 rounded-2xl border p-4 text-left text-sm font-medium transition ${active ? 'border-[#2563EB] bg-blue-50 text-[#143675] ring-1 ring-[#2563EB]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{icon}{label}</button>;
}

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`block space-y-2 ${className}`}><span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>{children}</label>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-medium text-slate-900 dark:text-white">{value}</p></div>;
}

function TableHead({ children, className = '' }: { children: ReactNode; className?: string }) { return <th className={`whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-slate-500 ${className}`}>{children}</th>; }
function TableCell({ children, className = '' }: { children: ReactNode; className?: string }) { return <td className={`px-4 py-3 align-middle text-sm text-slate-700 dark:text-slate-200 ${className}`}>{children}</td>; }

function TypeBadge({ type, failure, improvement }: { type: SystemTicketType; failure: string; improvement: string }) {
  const isFailure = type === 'FAILURE';
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${isFailure ? 'border-red-200 bg-red-50 text-red-700' : 'border-violet-200 bg-violet-50 text-violet-700'}`}>{isFailure ? <Bug className="h-3.5 w-3.5" /> : <Lightbulb className="h-3.5 w-3.5" />}{isFailure ? failure : improvement}</span>;
}

function PriorityBadge({ priority, copy }: { priority: SystemTicketPriority; copy: ReturnType<typeof getSystemTicketCopy> }) {
  const label = { LOW: copy.priorityLow, MEDIUM: copy.priorityMedium, HIGH: copy.priorityHigh, CRITICAL: copy.priorityCritical }[priority];
  const style = { LOW: 'bg-slate-100 text-slate-600', MEDIUM: 'bg-blue-50 text-blue-700', HIGH: 'bg-amber-50 text-amber-700', CRITICAL: 'bg-red-50 text-red-700' }[priority];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>{label}</span>;
}

function StatusBadge({ status, copy }: { status: SystemTicketStatus; copy: ReturnType<typeof getSystemTicketCopy> }) {
  const label = { OPEN: copy.open, IN_REVIEW: copy.inReview, PLANNED: copy.planned, RESOLVED: copy.resolved, CLOSED: copy.closed }[status];
  const style = { OPEN: 'border-amber-200 bg-amber-50 text-amber-700', IN_REVIEW: 'border-blue-200 bg-blue-50 text-blue-700', PLANNED: 'border-violet-200 bg-violet-50 text-violet-700', RESOLVED: 'border-emerald-200 bg-emerald-50 text-emerald-700', CLOSED: 'border-slate-200 bg-slate-100 text-slate-600' }[status];
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}>{label}</span>;
}

function formatDate(value: string, locale: string) {
  try { return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); } catch { return value; }
}
