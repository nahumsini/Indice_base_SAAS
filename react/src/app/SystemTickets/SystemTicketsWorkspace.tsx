import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  Bug,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Flame,
  Lightbulb,
  LoaderCircle,
  MessageSquareText,
  Plus,
  RefreshCw,
  TicketCheck,
  UserRoundCog,
  UserRoundX,
} from 'lucide-react';
import { IndiceModalFrame, IndiceModalValidation } from '../components/indice-modal';
import { IndiceFilterBar, IndiceFilterSearch, IndiceFilterSelect, IndiceTitleBar } from '../components/frontend-os';
import { DataTablePagination } from '../components/table/DataTablePagination';
import { getSystemTicketCopy } from './translations';
import { systemTicketsApi, type SystemTicketPortal } from './systemTicketsApi';
import { SystemTicketDetailModal } from './SystemTicketDetailModal';
import type {
  SystemTicket,
  SystemTicketCreatePayload,
  SystemTicketFilters,
  SystemTicketPriority,
  SystemTicketStatus,
  SystemTicketStatusFilter,
  SystemTicketType,
  SystemTicketWorkspaceData,
} from './types';

const fieldClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#177D66] focus:ring-2 focus:ring-[#59C3A5]/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white';
const actionClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#59C3A5]/35 bg-white px-3 text-sm font-medium text-[#176B5B] transition hover:border-[#177D66]/50 hover:bg-[#59C3A5]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200';

const initialCreate: SystemTicketCreatePayload = {
  type: 'FAILURE',
  priority: 'MEDIUM',
  module: '',
  title: '',
  description: '',
};

export function SystemTicketsWorkspace({ portal, locale, initialFolio = '' }: { portal: SystemTicketPortal; locale: string; initialFolio?: string }) {
  const copy = getSystemTicketCopy(locale);
  const [data, setData] = useState<SystemTicketWorkspaceData | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SystemTicketStatusFilter>(portal === 'root' || initialFolio ? 'ALL' : 'ACTIVE');
  const [type, setType] = useState<'ALL' | SystemTicketType>('ALL');
  const [priority, setPriority] = useState<'ALL' | SystemTicketPriority>('ALL');
  const [assignee, setAssignee] = useState<SystemTicketFilters['assignee']>('ALL');
  const [module, setModule] = useState('ALL');
  const [distributor, setDistributor] = useState('ALL');
  const [overdue, setOverdue] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [selected, setSelected] = useState<SystemTicket | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const openedInitialTicket = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await systemTicketsApi.list(portal, {
        query,
        status,
        type,
        priority,
        assignee,
        module: module === 'ALL' ? '' : module,
        distributor: distributor === 'ALL' ? '' : distributor,
        overdue,
        from: from ? new Date(`${from}T00:00:00`).toISOString() : '',
        to: to ? new Date(`${to}T23:59:59.999`).toISOString() : '',
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Request could not be completed.');
    } finally {
      setLoading(false);
    }
  }, [assignee, distributor, from, module, overdue, portal, priority, query, status, to, type]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  useEffect(() => setPage(1), [assignee, distributor, from, module, overdue, priority, query, status, to, type, pageSize]);

  const tickets = data?.tickets ?? [];
  const totalPages = Math.max(1, Math.ceil(tickets.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = tickets.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, tickets.length);
  const pagedTickets = tickets.slice(pageStart ? pageStart - 1 : 0, pageEnd);

  useEffect(() => {
    if (!initialFolio || openedInitialTicket.current || !data) return;
    const requested = data.tickets.find((ticket) => ticket.folio === initialFolio);
    if (requested) setSelected(requested);
    openedInitialTicket.current = true;
  }, [data, initialFolio]);

  const statusOptions = useMemo(() => [
    { value: 'ALL', label: copy.all },
    { value: 'ACTIVE', label: copy.active },
    { value: 'OPEN', label: copy.open },
    { value: 'IN_REVIEW', label: copy.inReview },
    { value: 'WAITING_ON_REPORTER', label: copy.waitingOnReporter },
    { value: 'PLANNED', label: copy.planned },
    { value: 'RESOLVED', label: copy.resolved },
    { value: 'CLOSED', label: copy.closed },
  ], [copy]);

  const typeOptions = useMemo(() => [
    { value: 'ALL', label: copy.all },
    { value: 'FAILURE', label: copy.failure },
    { value: 'IMPROVEMENT', label: copy.improvement },
  ], [copy]);

  const priorityOptions = useMemo(() => [
    { value: 'ALL', label: copy.all },
    { value: 'CRITICAL', label: copy.priorityCritical },
    { value: 'HIGH', label: copy.priorityHigh },
    { value: 'MEDIUM', label: copy.priorityMedium },
    { value: 'LOW', label: copy.priorityLow },
  ], [copy]);

  const assigneeOptions = useMemo(() => [
    { value: 'ALL', label: copy.allAssignees },
    { value: 'UNASSIGNED', label: copy.unassigned },
    ...(data?.assignees ?? []).map((option) => ({ value: String(option.user_id), label: option.name })),
  ], [copy, data?.assignees]);

  const moduleOptions = useMemo(() => [
    { value: 'ALL', label: copy.allModules },
    ...(data?.modules ?? []).map((value) => ({ value, label: value })),
  ], [copy, data?.modules]);

  const distributorOptions = useMemo(() => [
    { value: 'ALL', label: copy.allDistributors },
    ...(data?.distributors ?? []),
  ], [copy, data?.distributors]);

  const clearFilters = () => {
    setQuery('');
    setStatus(portal === 'root' ? 'ALL' : 'ACTIVE');
    setType('ALL');
    setPriority('ALL');
    setAssignee('ALL');
    setModule('ALL');
    setDistributor('ALL');
    setOverdue(false);
    setFrom('');
    setTo('');
  };

  return (
    <div className="space-y-5">
      <IndiceTitleBar
        tone="aqua"
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
            <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white transition hover:bg-[#126553]">
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
        {portal === 'root' ? (
          <>
            <SummaryCard active={assignee === 'UNASSIGNED'} label={copy.unassigned} value={data?.summary.unassigned ?? 0} icon={<UserRoundX className="h-5 w-5" />} onClick={() => setAssignee((value) => value === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED')} />
            <SummaryCard active={priority === 'CRITICAL'} label={copy.critical} value={data?.summary.critical ?? 0} icon={<Flame className="h-5 w-5" />} accent="text-red-700 bg-red-50" onClick={() => setPriority((value) => value === 'CRITICAL' ? 'ALL' : 'CRITICAL')} />
            <SummaryCard active={overdue} label={copy.overdue} value={data?.summary.overdue ?? 0} icon={<CalendarClock className="h-5 w-5" />} accent="text-amber-700 bg-amber-50" onClick={() => setOverdue((value) => !value)} />
            <SummaryCard active={status === 'WAITING_ON_REPORTER'} label={copy.waitingOnReporter} value={data?.summary.waiting_on_reporter ?? 0} icon={<MessageSquareText className="h-5 w-5" />} accent="text-violet-700 bg-violet-50" onClick={() => setStatus((value) => value === 'WAITING_ON_REPORTER' ? 'ALL' : 'WAITING_ON_REPORTER')} />
          </>
        ) : (
          <>
            <SummaryCard active={status === 'ACTIVE'} label={copy.active} value={data?.summary.active ?? 0} icon={<AlertTriangle className="h-5 w-5" />} accent="text-amber-700 bg-amber-50" onClick={() => setStatus((value) => value === 'ACTIVE' ? 'ALL' : 'ACTIVE')} />
            <SummaryCard active={status === 'IN_REVIEW'} label={copy.inReview} value={data?.summary.in_review ?? 0} icon={<MessageSquareText className="h-5 w-5" />} onClick={() => setStatus((value) => value === 'IN_REVIEW' ? 'ALL' : 'IN_REVIEW')} />
            <SummaryCard active={status === 'WAITING_ON_REPORTER'} label={copy.waitingOnReporter} value={data?.summary.waiting_on_reporter ?? 0} icon={<CalendarClock className="h-5 w-5" />} accent="text-violet-700 bg-violet-50" onClick={() => setStatus((value) => value === 'WAITING_ON_REPORTER' ? 'ALL' : 'WAITING_ON_REPORTER')} />
            <SummaryCard active={status === 'RESOLVED'} label={copy.completed} value={data?.summary.completed ?? 0} icon={<CheckCircle2 className="h-5 w-5" />} accent="text-emerald-700 bg-emerald-50" onClick={() => setStatus((value) => value === 'RESOLVED' ? 'ALL' : 'RESOLVED')} />
          </>
        )}
      </section>

      <IndiceFilterBar
        title={copy.filters}
        subtitle={copy.filterSubtitle}
        summary={`${data?.matching_tickets ?? 0} ${copy.itemLabel}`}
        gridClassName="md:grid-cols-2 xl:grid-cols-4"
      >
        <IndiceFilterSearch label={copy.search} placeholder={copy.searchPlaceholder} tone="aqua" value={query} onValueChange={setQuery} onClear={() => setQuery('')} />
        <IndiceFilterSelect label={copy.status} tone="aqua" value={status} options={statusOptions} onValueChange={(value) => setStatus(value as SystemTicketStatusFilter)} />
        <IndiceFilterSelect label={copy.priority} tone="aqua" value={priority} options={priorityOptions} onValueChange={(value) => setPriority(value as 'ALL' | SystemTicketPriority)} />
        <IndiceFilterSelect label={copy.type} tone="aqua" value={type} options={typeOptions} onValueChange={(value) => setType(value as 'ALL' | SystemTicketType)} />
        {portal === 'root' ? <IndiceFilterSelect label={copy.assignee} tone="aqua" value={assignee} options={assigneeOptions} onValueChange={(value) => setAssignee(value as SystemTicketFilters['assignee'])} /> : null}
        <IndiceFilterSelect label={copy.module} tone="aqua" value={module} options={moduleOptions} onValueChange={setModule} />
        {portal === 'root' ? <IndiceFilterSelect label={copy.distributor} tone="aqua" value={distributor} options={distributorOptions} onValueChange={setDistributor} /> : null}
        <label className="block space-y-2"><span className="block text-sm font-medium text-slate-700">{copy.from}</span><input className={fieldClass} type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label className="block space-y-2"><span className="block text-sm font-medium text-slate-700">{copy.to}</span><input className={fieldClass} type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        <div className="flex items-end gap-3">
          <label className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"><input type="checkbox" checked={overdue} onChange={(event) => setOverdue(event.target.checked)} />{copy.onlyOverdue}</label>
          <button type="button" onClick={clearFilters} className={actionClass}>{copy.clearFilters}</button>
        </div>
      </IndiceFilterBar>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-900/60">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <TableHead>{copy.folio}</TableHead>
                {portal === 'root' ? <TableHead>{copy.distributor}</TableHead> : null}
                <TableHead>{copy.report}</TableHead>
                <TableHead>{copy.priority}</TableHead>
                <TableHead>{copy.status}</TableHead>
                <TableHead>{copy.assignee}</TableHead>
                <TableHead>{copy.target}</TableHead>
                <TableHead className="text-right">{copy.actions}</TableHead>
              </tr>
            </thead>
            <tbody>
              {pagedTickets.map((ticket) => (
                <tr key={ticket.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/70 dark:border-slate-700 dark:hover:bg-slate-900/40 ${ticket.overdue ? 'bg-red-50/45' : ''}`}>
                  <TableCell><span className="font-medium text-[#176B5B]">{ticket.folio}</span><span className="mt-1 block text-xs text-slate-400">{formatDate(ticket.created_at, locale)}</span></TableCell>
                  {portal === 'root' ? <TableCell><span className="font-medium text-slate-900 dark:text-white">{ticket.distributor_name}</span><span className="mt-1 block text-xs text-slate-500">{ticket.reporter_name}</span></TableCell> : null}
                  <TableCell><span className="block max-w-[22rem] truncate font-medium text-slate-900 dark:text-white">{ticket.title}</span><span className="mt-1 flex items-center gap-2 text-xs text-slate-500"><TypeBadge type={ticket.type} failure={copy.failure} improvement={copy.improvement} />{ticket.module || '—'}</span></TableCell>
                  <TableCell><PriorityBadge priority={ticket.priority} copy={copy} /></TableCell>
                  <TableCell><StatusBadge status={ticket.status} copy={copy} /></TableCell>
                  <TableCell>{ticket.assignee_name ? <span className="inline-flex items-center gap-2 font-medium text-slate-800"><UserRoundCog className="h-4 w-4 text-[#177D66]" />{ticket.assignee_name}</span> : <span className="text-amber-700">{copy.unassigned}</span>}</TableCell>
                  <TableCell><TargetBadge ticket={ticket} copy={copy} locale={locale} /></TableCell>
                  <TableCell className="text-right"><button type="button" onClick={() => setSelected(ticket)} className={actionClass}>{portal === 'root' ? copy.attend : copy.view}</button></TableCell>
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
          pageSizeOptions={[10, 25, 50, 100, 200]}
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
      <SystemTicketDetailModal
        assignees={data?.assignees ?? []}
        locale={locale}
        portal={portal}
        ticket={selected}
        onClose={() => setSelected(null)}
        onChanged={async (ticket) => {
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
      tone="aqua"
      modalType="standard-form"
      icon={<Plus className="h-5 w-5" />}
      title={copy.createTitle}
      description={copy.createDescription}
      footerSummary={form.title || copy.newTicket}
      footer={(
        <>
          <button type="button" disabled={saving} onClick={() => onOpenChange(false)} className="h-10 rounded-xl border border-white/40 px-4 text-sm font-medium text-white">{copy.cancel}</button>
          <button type="submit" form="system-ticket-create-form" disabled={saving || !form.title.trim() || !form.description.trim()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-[#176B5B] disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <TicketCheck className="h-4 w-4" />}{saving ? copy.creating : copy.create}</button>
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

function SummaryCard({ active, label, value, icon, onClick, accent = 'text-[#176B5B] bg-[#59C3A5]/12' }: { active: boolean; label: string; value: number; icon: ReactNode; onClick: () => void; accent?: string }) {
  return <button type="button" onClick={onClick} className={`flex items-center gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition dark:bg-slate-800 ${active ? 'border-[#177D66] ring-2 ring-[#59C3A5]/25' : 'border-slate-200 hover:border-[#59C3A5]'}`}><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>{icon}</span><div><p className="text-xs text-slate-500">{label}</p><p className="text-2xl font-medium tabular-nums text-slate-950 dark:text-white">{value}</p></div></button>;
}

function ChoiceCard({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex min-h-20 items-center gap-3 rounded-2xl border p-4 text-left text-sm font-medium transition ${active ? 'border-[#177D66] bg-[#59C3A5]/10 text-[#176B5B] ring-1 ring-[#177D66]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{icon}{label}</button>;
}

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`block space-y-2 ${className}`}><span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>{children}</label>;
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
  const label = { OPEN: copy.open, IN_REVIEW: copy.inReview, WAITING_ON_REPORTER: copy.waitingOnReporter, PLANNED: copy.planned, RESOLVED: copy.resolved, CLOSED: copy.closed }[status];
  const style = { OPEN: 'border-amber-200 bg-amber-50 text-amber-700', IN_REVIEW: 'border-blue-200 bg-blue-50 text-blue-700', WAITING_ON_REPORTER: 'border-violet-200 bg-violet-50 text-violet-700', PLANNED: 'border-cyan-200 bg-cyan-50 text-cyan-700', RESOLVED: 'border-emerald-200 bg-emerald-50 text-emerald-700', CLOSED: 'border-slate-200 bg-slate-100 text-slate-600' }[status];
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}>{label}</span>;
}

function TargetBadge({ ticket, copy, locale }: { ticket: SystemTicket; copy: ReturnType<typeof getSystemTicketCopy>; locale: string }) {
  if (!ticket.target_resolution_at) return <span className="text-slate-400">—</span>;
  if (['RESOLVED', 'CLOSED'].includes(ticket.status)) return <span className="text-sm text-slate-500">{formatDate(ticket.target_resolution_at, locale)}</span>;
  return (
    <span className={`inline-flex flex-col rounded-xl border px-2.5 py-1.5 text-xs ${ticket.overdue ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
      <span className="font-medium">{ticket.overdue ? copy.overdue : formatRemaining(ticket.minutes_to_target)}</span>
      <span className="mt-0.5 opacity-75">{formatDate(ticket.target_resolution_at, locale)}</span>
    </span>
  );
}

function formatRemaining(value: number | null) {
  if (value == null) return '—';
  const absolute = Math.max(0, value);
  if (absolute < 60) return `${absolute} min`;
  if (absolute < 1440) return `${Math.round(absolute / 60)} h`;
  return `${Math.round(absolute / 1440)} d`;
}

function formatDate(value: string, locale: string) {
  try { return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); } catch { return value; }
}
