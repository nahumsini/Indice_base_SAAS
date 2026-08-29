import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  CalendarCheck2, CalendarDays, CircleAlert, ClipboardCheck, Eye, FileClock,
  FilePlus2, LoaderCircle, Printer, RefreshCw, RotateCcw, Users,
} from 'lucide-react';
import { notifyDocumentPrintFailure } from '../BasicModules/shared/print/documentPrintFeedback';
import {
  IndiceFilterBar,
  IndiceFilterField,
  IndiceFilterSearch,
  IndiceFilterSelect,
  IndiceTitleBar,
  getIndiceFilterControlClassName,
} from '../components/frontend-os';
import { DataTablePagination } from '../components/table/DataTablePagination';
import {
  getIndiceTableMinimumWidth,
  IndiceOperationalTable,
  IndiceTableActionGroup,
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  IndiceTableShell,
  type IndiceTableColumnDefinition,
} from '../components/table/IndiceTableEngine';
import { TableBody, TableCell, TableRow } from '../components/ui/table';
import { usePersistentColumnWidths } from '../hooks/usePersistentColumnWidths';
import { InternalDevelopmentDetailModal } from './InternalDevelopmentDetailModal';
import { InternalDevelopmentEntryModal } from './InternalDevelopmentEntryModal';
import { internalDevelopmentApi } from './internalDevelopmentApi';
import { getInternalDevelopmentCopy } from './internalDevelopment.copy';
import { printInternalDevelopmentDetail } from './internalDevelopmentPrint';
import type {
  InternalDevelopmentDetail,
  InternalDevelopmentEntry,
  InternalDevelopmentFilters,
  InternalDevelopmentWorkspaceData,
} from './internalDevelopment.types';

type ColumnId = 'date' | 'type' | 'record' | 'owner' | 'participants' | 'status';

const defaultFilters: InternalDevelopmentFilters = {
  query: '', entryType: 'ALL', area: 'ALL', status: 'ALL', ownerUserId: '', from: '', to: '',
};
const defaultWidths: Record<ColumnId, number> = { date: 180, type: 190, record: 360, owner: 210, participants: 190, status: 150 };
const minimumWidths: Record<ColumnId, number> = { date: 150, type: 160, record: 260, owner: 170, participants: 150, status: 130 };
const maximumWidths: Record<ColumnId, number> = { date: 260, type: 300, record: 560, owner: 320, participants: 320, status: 240 };
const actionsWidth = 132;

export function InternalDevelopmentWorkspace({ locale }: { locale: string }) {
  const english = locale.startsWith('en');
  const copy = getInternalDevelopmentCopy(english);
  const [filters, setFilters] = useState<InternalDevelopmentFilters>(defaultFilters);
  const [data, setData] = useState<InternalDevelopmentWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<InternalDevelopmentEntry | null>(null);
  const [detail, setDetail] = useState<InternalDevelopmentDetail | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [printLoadingId, setPrintLoadingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = useCallback(async (nextFilters: InternalDevelopmentFilters, silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      setData(await internalDevelopmentApi.workspace(nextFilters));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : (english ? 'The corporate history could not be loaded.' : 'No se pudo cargar el historial corporativo.'));
    } finally {
      setLoading(false);
    }
  }, [english]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(filters), 220);
    return () => window.clearTimeout(timeout);
  }, [filters, load]);

  useEffect(() => setPage(1), [filters, pageSize]);

  const entries = data?.entries ?? [];
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = entries.length ? (safePage - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(entries.length, safePage * pageSize);
  const pagedEntries = entries.slice((safePage - 1) * pageSize, safePage * pageSize);

  const openDetail = async (entryId: number) => {
    setDetailLoadingId(entryId);
    setError('');
    try {
      setDetail(await internalDevelopmentApi.detail(entryId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : (english ? 'The record could not be opened.' : 'No se pudo abrir el registro.'));
    } finally {
      setDetailLoadingId(null);
    }
  };

  const printEntry = (entryId: number) => {
    const targetWindow = window.open('', '_blank');
    if (!targetWindow) {
      notifyDocumentPrintFailure(locale, 'popup-blocked');
      return;
    }
    targetWindow.document.title = english ? 'Preparing document…' : 'Preparando documento…';
    targetWindow.document.body.textContent = english ? 'Preparing document…' : 'Preparando documento…';
    Object.assign(targetWindow.document.body.style, {
      color: '#475569', fontFamily: 'Arial, sans-serif', fontSize: '14px', padding: '32px',
    });
    setPrintLoadingId(entryId);
    setError('');
    void internalDevelopmentApi.detail(entryId)
      .then((fullDetail) => {
        printInternalDevelopmentDetail({ detail: fullDetail, english, locale, targetWindow });
      })
      .catch((loadError) => {
        targetWindow.close();
        setError(loadError instanceof Error ? loadError.message : (english ? 'The record could not be prepared for printing.' : 'No se pudo preparar el registro para imprimir.'));
      })
      .finally(() => setPrintLoadingId(null));
  };

  const handleSaved = async (saved: InternalDevelopmentDetail) => {
    setDetail(saved);
    await load(filters, true);
  };

  const startEdit = () => {
    if (!detail) return;
    setEditingEntry(detail.entry);
    setDetail(null);
    setEditorOpen(true);
  };

  const labels: Record<ColumnId, string> = {
    date: copy.dateFolio, type: copy.type, record: copy.record, owner: copy.owner,
    participants: copy.participants, status: copy.status,
  };
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<ColumnId>({
    defaults: defaultWidths,
    headerLabels: labels,
    maxWidths: maximumWidths,
    minWidths: minimumWidths,
    sortableColumnIds: [],
    storageKey: 'indice-internal-development-columns-v1',
  });
  const columns: Array<IndiceTableColumnDefinition<ColumnId>> = (Object.keys(defaultWidths) as ColumnId[]).map((id) => ({
    id, label: labels[id], width: columnWidths[id], defaultWidth: defaultWidths[id],
    contentMinimumWidth: minimumWidths[id], maxWidth: maximumWidths[id], sortable: false,
    resizeLabel: english ? `Resize ${labels[id]} column` : `Ajustar columna ${labels[id]}`,
  }));
  const tableWidth = getIndiceTableMinimumWidth({ columns, actionsWidth });

  return (
    <div className="space-y-5">
      <IndiceTitleBar
        tone="aqua"
        eyebrow={copy.eyebrow}
        icon={<FileClock className="h-5 w-5" />}
        title={copy.title}
        subtitle={copy.subtitle}
        actions={(
          <>
            <button type="button" onClick={() => void load(filters)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#59C3A5]/50 bg-white px-4 text-sm font-medium text-[#176B5B] transition hover:bg-[#59C3A5]/10 dark:bg-slate-900">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{copy.refresh}
            </button>
            <button type="button" onClick={() => { setEditingEntry(null); setEditorOpen(true); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#126D59]">
              <FilePlus2 className="h-4 w-4" />{copy.newEntry}
            </button>
          </>
        )}
      />

      {error ? (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="flex items-center gap-2"><CircleAlert className="h-4 w-4 shrink-0" />{error}</span>
          <button type="button" onClick={() => void load(filters)} className="font-medium underline">{copy.retry}</button>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<ClipboardCheck className="h-5 w-5" />} label={copy.submitted} value={data?.summary.weeklyReportsSubmitted ?? 0} detail={data ? `${data.summary.weeklyReportsSubmitted}/${data.summary.activeRootMembers}` : '—'} />
        <SummaryCard icon={<Users className="h-5 w-5" />} label={copy.pending} value={data?.summary.weeklyReportsPending ?? 0} detail={data?.summary.pendingWeeklyMemberNames.length ? `${copy.pendingNames}: ${data.summary.pendingWeeklyMemberNames.join(', ')}` : (english ? 'Everyone is up to date' : 'Todos están al corriente')} tone="amber" />
        <SummaryCard icon={<CalendarCheck2 className="h-5 w-5" />} label={copy.upcoming} value={data?.summary.upcomingMeetings ?? 0} detail={english ? 'Planned board and working meetings' : 'Juntas de consejo y trabajo programadas'} tone="blue" />
        <SummaryCard icon={<CalendarDays className="h-5 w-5" />} label={copy.thisMonth} value={data?.summary.recordsThisMonth ?? 0} detail={english ? 'Preserved corporate evidence' : 'Evidencia corporativa conservada'} tone="slate" />
      </section>

      <IndiceFilterBar
        title={copy.filters}
        subtitle={copy.filtersSubtitle}
        summary={`${data?.matchingEntries ?? 0} ${copy.records}`}
        gridClassName="lg:grid-cols-12"
      >
        <IndiceFilterSearch className="lg:col-span-4" label={copy.search} placeholder={copy.searchPlaceholder} tone="aqua" value={filters.query} onValueChange={(query) => setFilters((current) => ({ ...current, query }))} onClear={() => setFilters((current) => ({ ...current, query: '' }))} />
        <IndiceFilterSelect className="lg:col-span-2" label={copy.type} tone="aqua" value={filters.entryType} onValueChange={(entryType) => setFilters((current) => ({ ...current, entryType: entryType as InternalDevelopmentFilters['entryType'] }))} options={[{ value: 'ALL', label: copy.allTypes }, ...Object.entries(copy.types).map(([value, label]) => ({ value, label }))]} />
        <IndiceFilterSelect className="lg:col-span-2" label={copy.area} tone="aqua" value={filters.area} onValueChange={(area) => setFilters((current) => ({ ...current, area: area as InternalDevelopmentFilters['area'] }))} options={[{ value: 'ALL', label: copy.allAreas }, ...Object.entries(copy.areas).map(([value, label]) => ({ value, label }))]} />
        <IndiceFilterSelect className="lg:col-span-2" label={copy.status} tone="aqua" value={filters.status} onValueChange={(status) => setFilters((current) => ({ ...current, status: status as InternalDevelopmentFilters['status'] }))} options={[{ value: 'ALL', label: copy.allStatuses }, ...Object.entries(copy.statuses).map(([value, label]) => ({ value, label }))]} />
        <IndiceFilterSelect className="lg:col-span-2" label={copy.owner} tone="aqua" value={filters.ownerUserId || 'ALL'} onValueChange={(ownerUserId) => setFilters((current) => ({ ...current, ownerUserId: ownerUserId === 'ALL' ? '' : ownerUserId }))} options={[{ value: 'ALL', label: copy.allOwners }, ...(data?.members ?? []).map((member) => ({ value: String(member.id), label: member.name }))]} />
        <IndiceFilterField className="lg:col-span-3" label={copy.from}><input type="date" className={getIndiceFilterControlClassName('aqua')} value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} /></IndiceFilterField>
        <IndiceFilterField className="lg:col-span-3" label={copy.to}><input type="date" className={getIndiceFilterControlClassName('aqua')} value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} /></IndiceFilterField>
        <div className="flex items-end lg:col-span-3"><button type="button" onClick={() => setFilters(defaultFilters)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:border-[#59C3A5] hover:text-[#176B5B] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"><RotateCcw className="h-4 w-4" />{copy.clear}</button></div>
      </IndiceFilterBar>

      <section className="rounded-2xl border border-[#59C3A5]/40 bg-[#59C3A5]/8 px-5 py-4">
        <p className="text-sm font-medium text-[#176B5B]">{english ? 'Corporate rule' : 'Regla corporativa'}</p>
        <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{english ? 'Record outcomes, not activity noise. Every entry must make ownership, evidence and the next decision clear.' : 'Registra resultados, no ruido de actividad. Cada entrada debe dejar claros el responsable, la evidencia y la siguiente decisión.'}</p>
      </section>

      <div>
        <div className="mb-3 flex items-end justify-between gap-4"><div><h3 className="text-lg font-medium text-slate-950 dark:text-white">{copy.tableTitle}</h3><p className="mt-1 text-sm text-slate-500">{data?.matchingEntries ?? 0} {copy.records}</p></div>{loading ? <LoaderCircle className="h-5 w-5 animate-spin text-[#177D66]" /> : null}</div>
        <IndiceTableShell pagination={<DataTablePagination currentPage={safePage} itemLabel={copy.records} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} pageEnd={pageEnd} pageSize={pageSize} pageSizeOptions={[10, 25, 50]} pageStart={pageStart} totalCount={entries.length} totalPages={totalPages} />}>
          <IndiceOperationalTable minimumWidth={tableWidth}>
            <IndiceTableColGroup columns={columns} actionsWidth={actionsWidth} />
            <IndiceTableHeaderRow actions={{ label: copy.actions, width: actionsWidth }} columns={columns} onResize={resizeColumn} tone="aqua" />
            <TableBody>
              {pagedEntries.map((entry) => (
                <TableRow key={entry.id} className="border-slate-200 hover:bg-[#59C3A5]/5 dark:border-slate-700">
                  <Cell width={columnWidths.date}><p className="font-medium text-slate-900 dark:text-white">{formatDate(entry.eventAt, locale)}</p><p className="mt-1 text-xs text-slate-500">{entry.folio}</p></Cell>
                  <Cell width={columnWidths.type}><TypeBadge label={copy.types[entry.entryType]} type={entry.entryType} /><p className="mt-2 text-xs text-slate-500">{copy.areas[entry.area]}</p></Cell>
                  <Cell width={columnWidths.record}><button type="button" onClick={() => void openDetail(entry.id)} className="block w-full text-left"><span className="block truncate font-medium text-slate-900 hover:text-[#177D66] dark:text-white">{entry.title}</span><span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500">{entry.summary}</span></button></Cell>
                  <Cell width={columnWidths.owner}><p className="truncate font-medium text-slate-800 dark:text-slate-100">{entry.ownerName}</p><p className="mt-1 truncate text-xs text-slate-500">{entry.ownerEmail}</p></Cell>
                  <Cell width={columnWidths.participants}><p className="font-medium text-slate-800 dark:text-slate-100">{entry.participants.length}</p><p className="mt-1 truncate text-xs text-slate-500">{entry.participants.map((participant) => participant.name).join(', ') || '—'}</p></Cell>
                  <Cell width={columnWidths.status}><StatusBadge label={copy.statuses[entry.status]} status={entry.status} /></Cell>
                  <TableCell className="px-4 py-3 text-right">
                    <IndiceTableActionGroup>
                      <button type="button" disabled={detailLoadingId === entry.id} onClick={() => void openDetail(entry.id)} aria-label={`${copy.view} ${entry.folio}`} title={copy.view} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#177D66] text-white transition hover:bg-[#126D59] disabled:opacity-50">
                        {detailLoadingId === entry.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button type="button" disabled={printLoadingId === entry.id} onClick={() => printEntry(entry.id)} aria-label={`${english ? 'Print' : 'Imprimir'} ${entry.folio}`} title={english ? 'Print' : 'Imprimir'} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#59C3A5] bg-white text-[#177D66] transition hover:bg-[#59C3A5]/10 disabled:opacity-50 dark:bg-slate-900">
                        {printLoadingId === entry.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                      </button>
                    </IndiceTableActionGroup>
                  </TableCell>
                </TableRow>
              ))}
              {!pagedEntries.length && !loading ? <TableRow><TableCell colSpan={columns.length + 1} className="px-6 py-14 text-center"><div className="flex flex-col items-center gap-2 text-sm text-slate-500"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#59C3A5]/12 text-[#177D66]"><FileClock className="h-5 w-5" /></span>{copy.noRecords}</div></TableCell></TableRow> : null}
            </TableBody>
          </IndiceOperationalTable>
        </IndiceTableShell>
      </div>

      <InternalDevelopmentEntryModal english={english} entries={entries} entry={editingEntry} currentUserId={data?.currentUserId} members={data?.members ?? []} open={editorOpen} onOpenChange={(open) => { setEditorOpen(open); if (!open) setEditingEntry(null); }} onSaved={handleSaved} />
      <InternalDevelopmentDetailModal detail={detail} english={english} locale={locale} open={Boolean(detail)} onOpenChange={(open) => { if (!open) setDetail(null); }} onEdit={startEdit} />
    </div>
  );
}

function SummaryCard({ detail, icon, label, tone = 'aqua', value }: { detail: string; icon: ReactNode; label: string; tone?: 'aqua' | 'amber' | 'blue' | 'slate'; value: number }) {
  const styles = { aqua: 'bg-[#59C3A5]/12 text-[#177D66]', amber: 'bg-amber-50 text-amber-700', blue: 'bg-blue-50 text-blue-700', slate: 'bg-slate-100 text-slate-600' }[tone];
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="flex items-start justify-between gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl ${styles}`}>{icon}</span><strong className="text-2xl font-medium tabular-nums text-slate-950 dark:text-white">{value}</strong></div><p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">{label}</p><p className="mt-1 line-clamp-2 min-h-8 text-xs leading-4 text-slate-500">{detail}</p></article>;
}

function Cell({ children, width }: { children: ReactNode; width: number }) {
  return <TableCell className="px-4 py-3 align-middle text-sm text-slate-700 dark:text-slate-200" style={{ width, minWidth: width, maxWidth: width }}>{children}</TableCell>;
}

function TypeBadge({ label, type }: { label: string; type: InternalDevelopmentEntry['entryType'] }) {
  const style = type === 'WEEKLY_REPORT' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : type.includes('MEETING') ? 'border-blue-200 bg-blue-50 text-blue-700' : type === 'MINUTES' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-amber-200 bg-amber-50 text-amber-700';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}>{label}</span>;
}

function StatusBadge({ label, status }: { label: string; status: InternalDevelopmentEntry['status'] }) {
  const style = { DRAFT: 'border-slate-200 bg-slate-100 text-slate-600', PLANNED: 'border-blue-200 bg-blue-50 text-blue-700', RECORDED: 'border-emerald-200 bg-emerald-50 text-emerald-700', CLOSED: 'border-violet-200 bg-violet-50 text-violet-700', CANCELLED: 'border-red-200 bg-red-50 text-red-700' }[status];
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}>{label}</span>;
}

function formatDate(value: string, locale: string) {
  try { return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); } catch { return value; }
}
