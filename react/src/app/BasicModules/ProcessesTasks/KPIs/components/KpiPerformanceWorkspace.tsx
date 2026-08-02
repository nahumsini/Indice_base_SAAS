import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowUpDown,
  Check,
  ChevronRight,
  Columns3,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import { cn } from '../../../../components/ui/utils';
import { useTablePagination } from '../../../../hooks/useTablePagination';
import type { AgendaTranslations } from '../../Agenda/translations';
import type {
  CollaboratorPerformanceRow,
  ProcessPerformanceRow,
  ProcessTaskKpiStatus,
  ProjectPerformanceRow,
} from '../kpisApi';
import type { KpisTranslations } from '../translations';

type WorkspaceTab = 'collaborators' | 'processes' | 'projects';
type SortDirection = 'asc' | 'desc';
type SortState = { columnId: string; direction: SortDirection };

const statusClasses: Record<ProcessTaskKpiStatus, string> = {
  healthy:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
  watch:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  critical:
    'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300',
};

const scoreBarClasses: Record<ProcessTaskKpiStatus, string> = {
  healthy: 'bg-emerald-500',
  watch: 'bg-[#F4C84A]',
  critical: 'bg-rose-500',
};

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function compareValues(left: string | number | boolean | null, right: string | number | boolean | null, locale: string) {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return Number(left) - Number(right);
  }

  return new Intl.Collator(locale, { numeric: true, sensitivity: 'base' }).compare(String(left ?? ''), String(right ?? ''));
}

function sortRows<Row>(
  rows: readonly Row[],
  sortState: SortState,
  getValue: (row: Row, columnId: string) => string | number | boolean | null,
  locale: string,
) {
  return [...rows].sort((left, right) => {
    const comparison = compareValues(getValue(left, sortState.columnId), getValue(right, sortState.columnId), locale);
    return sortState.direction === 'asc' ? comparison : comparison * -1;
  });
}

function scoreStatus(score: number): ProcessTaskKpiStatus {
  if (score >= 85) return 'healthy';
  if (score >= 70) return 'watch';
  return 'critical';
}

function formatWeighting(value: number | null, notApplicableLabel: string) {
  return value == null ? notApplicableLabel : `${value}/5`;
}

function ScoreBar({ score, status }: { score: number; status?: ProcessTaskKpiStatus }) {
  const resolvedStatus = status ?? scoreStatus(score);

  return (
    <div className="flex min-w-[130px] items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div
          className={cn('h-full rounded-full', scoreBarClasses[resolvedStatus])}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
      <span className="w-10 text-right text-sm font-medium text-slate-900 dark:text-white">{score}%</span>
    </div>
  );
}

function StatusBadge({ copy, status }: { copy: KpisTranslations; status: ProcessTaskKpiStatus }) {
  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-medium', statusClasses[status])}>
      {copy.statuses[status]}
    </span>
  );
}

function SortableHead({
  active,
  children,
  direction,
  onSort,
}: {
  active: boolean;
  children: ReactNode;
  direction: SortDirection;
  onSort: () => void;
}) {
  return (
    <TableHead className="px-4 py-3">
      <button
        type="button"
        onClick={onSort}
        className="flex min-h-8 items-center gap-2 rounded-md text-left text-xs font-medium text-slate-500 transition hover:text-[#9A6B05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C84A] focus-visible:ring-offset-2 dark:text-slate-400 dark:hover:text-[#FEF3C7] dark:focus-visible:ring-offset-slate-800"
      >
        {children}
        <ArrowUpDown className={cn('h-3.5 w-3.5', active ? 'text-[#9A6B05] dark:text-[#FEF3C7]' : 'opacity-45')} />
        <span className="sr-only">{active ? direction : ''}</span>
      </button>
    </TableHead>
  );
}

function ColumnsMenu({
  agendaCopy,
  columns,
  onToggle,
  visibleColumns,
}: {
  agendaCopy: AgendaTranslations;
  columns: Array<{ id: string; label: string }>;
  onToggle: (columnId: string) => void;
  visibleColumns: Set<string>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-2 rounded-xl border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-none hover:border-[#F4C84A]/60 hover:bg-[#F4C84A]/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <Columns3 className="h-4 w-4" />
          {agendaCopy.header.actions.columns}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{agendaCopy.header.actions.columns}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={visibleColumns.has(column.id)}
            onCheckedChange={() => onToggle(column.id)}
            onSelect={(event) => event.preventDefault()}
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Pagination({
  agendaCopy,
  copy,
  pagination,
}: {
  agendaCopy: AgendaTranslations;
  copy: KpisTranslations;
  pagination: ReturnType<typeof useTablePagination<unknown>>;
}) {
  return (
    <DataTablePagination
      currentPage={pagination.currentPage}
      labels={{
        next: agendaCopy.table.next,
        page: copy.pdf.page,
        previous: agendaCopy.table.previous,
        rowsPerPage: copy.common.rowsPerPage,
        showing: (pageStart, pageEnd, totalCount) => agendaCopy.table.showing(pageStart, pageEnd, totalCount),
      }}
      onPageChange={pagination.onPageChange}
      onPageSizeChange={pagination.onPageSizeChange}
      pageEnd={pagination.pageEnd}
      pageSize={pagination.pageSize}
      pageSizeOptions={pagination.pageSizeOptions}
      pageStart={pagination.pageStart}
      totalCount={pagination.totalCount}
      totalPages={pagination.totalPages}
    />
  );
}

function CollaboratorsTable({
  agendaCopy,
  copy,
  locale,
  onOpenAgenda,
  query,
  rows,
}: {
  agendaCopy: AgendaTranslations;
  copy: KpisTranslations;
  locale: string;
  onOpenAgenda: (params: Record<string, string>) => void;
  query: string;
  rows: CollaboratorPerformanceRow[];
}) {
  const columns = [
    { id: 'rank', label: copy.collaboratorsTable.headers.rank },
    { id: 'collaborator', label: copy.collaboratorsTable.headers.collaborator },
    { id: 'context', label: copy.collaboratorsTable.headers.context },
    { id: 'score', label: copy.collaboratorsTable.headers.score },
    { id: 'tasks', label: copy.collaboratorsTable.headers.tasks },
    { id: 'closure', label: copy.collaboratorsTable.headers.closure },
    { id: 'timeliness', label: copy.collaboratorsTable.headers.timeliness },
    { id: 'audit', label: copy.collaboratorsTable.headers.audit },
    { id: 'quality', label: copy.collaboratorsTable.headers.quality },
    { id: 'evidence', label: copy.collaboratorsTable.headers.evidence },
    { id: 'status', label: copy.collaboratorsTable.headers.status },
  ];
  const [visibleColumns, setVisibleColumns] = useState(() => new Set(['rank', 'collaborator', 'score', 'tasks', 'timeliness', 'audit', 'status']));
  const [sortState, setSortState] = useState<SortState>({ columnId: 'score', direction: 'desc' });
  const normalizedQuery = normalizeSearch(query);
  const filteredRows = useMemo(
    () => rows.filter((row) => normalizeSearch([
      row.collaboratorName,
      row.unitName,
      row.businessName,
      copy.statuses[row.status],
    ].filter(Boolean).join(' ')).includes(normalizedQuery)),
    [copy.statuses, normalizedQuery, rows],
  );
  const sortedRows = useMemo(
    () => sortRows(filteredRows, sortState, (row, columnId) => {
      switch (columnId) {
        case 'rank': return row.rank;
        case 'collaborator': return row.collaboratorName;
        case 'context': return `${row.unitName ?? ''} ${row.businessName ?? ''}`;
        case 'score': return row.productivityScore;
        case 'tasks': return row.totalTasks;
        case 'closure': return row.completionRate;
        case 'timeliness': return row.timelinessRate;
        case 'audit': return row.auditRate;
        case 'quality': return row.averageWeighting;
        case 'evidence': return row.evidenceRate;
        case 'status': return row.status;
        default: return row.rank;
      }
    }, locale),
    [filteredRows, locale, sortState],
  );
  const pagination = useTablePagination({ resetKey: `${query}:${sortState.columnId}:${sortState.direction}`, rows: sortedRows });

  const handleSort = (columnId: string) => {
    setSortState((current) => ({
      columnId,
      direction: current.columnId === columnId && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };
  const toggleColumn = (columnId: string) => {
    setVisibleColumns((current) => {
      const next = new Set(current);
      if (next.has(columnId)) {
        if (next.size > 1) next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  };

  return (
    <>
      <div className="flex justify-end border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <ColumnsMenu agendaCopy={agendaCopy} columns={columns} onToggle={toggleColumn} visibleColumns={visibleColumns} />
      </div>
      <div className="overflow-x-auto">
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/50">
              {columns.map((column) => visibleColumns.has(column.id) ? (
                <SortableHead key={column.id} active={sortState.columnId === column.id} direction={sortState.direction} onSort={() => handleSort(column.id)}>
                  {column.label}
                </SortableHead>
              ) : null)}
              <TableHead className="px-4 py-3 text-right">{agendaCopy.columns.actions.label}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.paginatedRows.map((row) => (
              <TableRow key={`${row.collaboratorId ?? 'unassigned'}-${row.rank}`} className="border-slate-100 dark:border-slate-700">
                {visibleColumns.has('rank') ? <TableCell className="px-4 py-3 font-medium">#{row.rank}</TableCell> : null}
                {visibleColumns.has('collaborator') ? (
                  <TableCell className="px-4 py-3">
                    <p className="font-medium text-slate-900 dark:text-white">{row.collaboratorName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{copy.collaboratorsTable.details.openOverdue(row.openTasks, row.overdueTasks)}</p>
                  </TableCell>
                ) : null}
                {visibleColumns.has('context') ? (
                  <TableCell className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    <p>{row.unitName ?? copy.common.noUnit}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{row.businessName ?? copy.common.noBusiness}</p>
                  </TableCell>
                ) : null}
                {visibleColumns.has('score') ? <TableCell className="px-4 py-3"><ScoreBar score={row.productivityScore} status={row.status} /></TableCell> : null}
                {visibleColumns.has('tasks') ? <TableCell className="px-4 py-3 text-sm">{row.closedTasks}/{row.totalTasks}</TableCell> : null}
                {visibleColumns.has('closure') ? <TableCell className="px-4 py-3 text-sm">{row.completionRate}%</TableCell> : null}
                {visibleColumns.has('timeliness') ? <TableCell className="px-4 py-3 text-sm">{row.timelinessRate}%</TableCell> : null}
                {visibleColumns.has('audit') ? <TableCell className="px-4 py-3 text-sm">{copy.collaboratorsTable.details.audit(row.auditRate, row.pendingAuditTasks)}</TableCell> : null}
                {visibleColumns.has('quality') ? <TableCell className="px-4 py-3 text-sm">{formatWeighting(row.averageWeighting, copy.common.notApplicable)}</TableCell> : null}
                {visibleColumns.has('evidence') ? <TableCell className="px-4 py-3 text-sm">{row.evidenceRate}%</TableCell> : null}
                {visibleColumns.has('status') ? <TableCell className="px-4 py-3"><StatusBadge copy={copy} status={row.status} /></TableCell> : null}
                <TableCell className="px-4 py-3 text-right">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={row.collaboratorId == null}
                    onClick={() => row.collaboratorId != null && onOpenAgenda({ collaborator: `user-company:${row.collaboratorId}` })}
                    className="h-9 gap-1 rounded-xl border-slate-200 px-3 text-sm font-medium shadow-none hover:border-[#F4C84A]/60 hover:bg-[#F4C84A]/10 dark:border-slate-700"
                  >
                    {agendaCopy.header.title}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {pagination.totalCount === 0 ? (
              <TableRow><TableCell colSpan={visibleColumns.size + 1} className="px-6 py-14 text-center text-sm text-slate-500 dark:text-slate-400">{copy.collaboratorsTable.empty}</TableCell></TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      <Pagination agendaCopy={agendaCopy} copy={copy} pagination={pagination} />
    </>
  );
}

function ProcessesTable({ agendaCopy, copy, locale, onOpenAgenda, query, rows }: {
  agendaCopy: AgendaTranslations;
  copy: KpisTranslations;
  locale: string;
  onOpenAgenda: (params: Record<string, string>) => void;
  query: string;
  rows: ProcessPerformanceRow[];
}) {
  const columns = [
    { id: 'process', label: copy.processesTable.headers.process },
    { id: 'score', label: copy.processesTable.headers.score },
    { id: 'tasks', label: copy.processesTable.headers.tasks },
    { id: 'audit', label: copy.processesTable.headers.audit },
    { id: 'next', label: copy.processesTable.headers.next },
    { id: 'engine', label: copy.processesTable.headers.engine },
  ];
  const [visibleColumns, setVisibleColumns] = useState(() => new Set(columns.map((column) => column.id)));
  const [sortState, setSortState] = useState<SortState>({ columnId: 'score', direction: 'desc' });
  const normalizedQuery = normalizeSearch(query);
  const filteredRows = useMemo(() => rows.filter((row) => normalizeSearch(`${row.processTitle} ${row.processFolio ?? ''}`).includes(normalizedQuery)), [normalizedQuery, rows]);
  const sortedRows = useMemo(() => sortRows(filteredRows, sortState, (row, columnId) => {
    switch (columnId) {
      case 'process': return row.processTitle;
      case 'score': return row.productivityScore;
      case 'tasks': return row.totalTasks;
      case 'audit': return row.auditRate;
      case 'next': return row.nextOccurrenceDate;
      case 'engine': return row.isActive;
      default: return row.processTitle;
    }
  }, locale), [filteredRows, locale, sortState]);
  const pagination = useTablePagination({ resetKey: `${query}:${sortState.columnId}:${sortState.direction}`, rows: sortedRows });
  const handleSort = (columnId: string) => setSortState((current) => ({ columnId, direction: current.columnId === columnId && current.direction === 'asc' ? 'desc' : 'asc' }));
  const toggleColumn = (columnId: string) => setVisibleColumns((current) => {
    const next = new Set(current);
    if (next.has(columnId)) { if (next.size > 1) next.delete(columnId); } else next.add(columnId);
    return next;
  });

  return (
    <>
      <div className="flex justify-end border-b border-slate-200 px-4 py-3 dark:border-slate-700"><ColumnsMenu agendaCopy={agendaCopy} columns={columns} onToggle={toggleColumn} visibleColumns={visibleColumns} /></div>
      <div className="overflow-x-auto">
        <Table className="min-w-[900px]">
          <TableHeader><TableRow className="border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/50">
            {columns.map((column) => visibleColumns.has(column.id) ? <SortableHead key={column.id} active={sortState.columnId === column.id} direction={sortState.direction} onSort={() => handleSort(column.id)}>{column.label}</SortableHead> : null)}
            <TableHead className="px-4 py-3 text-right">{agendaCopy.columns.actions.label}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {pagination.paginatedRows.map((row) => (
              <TableRow key={row.processId} className="border-slate-100 dark:border-slate-700">
                {visibleColumns.has('process') ? <TableCell className="px-4 py-3"><p className="font-medium text-slate-900 dark:text-white">{row.processTitle}</p><p className="text-xs text-slate-500 dark:text-slate-400">{row.processFolio ?? copy.common.noFolio}</p></TableCell> : null}
                {visibleColumns.has('score') ? <TableCell className="px-4 py-3"><ScoreBar score={row.productivityScore} status={row.status} /></TableCell> : null}
                {visibleColumns.has('tasks') ? <TableCell className="px-4 py-3 text-sm">{copy.processesTable.details.tasks(row.closedTasks, row.totalTasks, row.overdueTasks)}</TableCell> : null}
                {visibleColumns.has('audit') ? <TableCell className="px-4 py-3 text-sm">{copy.processesTable.details.audit(row.auditRate, formatWeighting(row.averageWeighting, copy.common.notApplicable))}</TableCell> : null}
                {visibleColumns.has('next') ? <TableCell className="px-4 py-3 text-sm">{row.nextOccurrenceDate ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(`${row.nextOccurrenceDate}T00:00:00`)) : copy.common.noDate}</TableCell> : null}
                {visibleColumns.has('engine') ? <TableCell className="px-4 py-3"><span className={cn('rounded-full border px-2.5 py-1 text-xs font-medium', row.isActive ? statusClasses.healthy : statusClasses.watch)}>{row.isActive ? copy.statuses.active : copy.statuses.paused}</span></TableCell> : null}
                <TableCell className="px-4 py-3 text-right"><Button type="button" variant="outline" onClick={() => onOpenAgenda({ search: row.processFolio ?? row.processTitle })} className="h-9 gap-1 rounded-xl border-slate-200 px-3 text-sm font-medium shadow-none hover:border-[#F4C84A]/60 hover:bg-[#F4C84A]/10 dark:border-slate-700">{agendaCopy.header.title}<ChevronRight className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {pagination.totalCount === 0 ? <TableRow><TableCell colSpan={visibleColumns.size + 1} className="px-6 py-14 text-center text-sm text-slate-500 dark:text-slate-400">{copy.processesTable.empty}</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </div>
      <Pagination agendaCopy={agendaCopy} copy={copy} pagination={pagination} />
    </>
  );
}

function ProjectsTable({ agendaCopy, copy, locale, onOpenAgenda, query, rows }: {
  agendaCopy: AgendaTranslations;
  copy: KpisTranslations;
  locale: string;
  onOpenAgenda: (params: Record<string, string>) => void;
  query: string;
  rows: ProjectPerformanceRow[];
}) {
  const columns = [
    { id: 'project', label: copy.projectsTable.headers.project },
    { id: 'health', label: copy.projectsTable.headers.health },
    { id: 'progress', label: copy.projectsTable.headers.progress },
    { id: 'tasks', label: copy.projectsTable.headers.tasks },
    { id: 'audit', label: copy.projectsTable.headers.audit },
    { id: 'dueDate', label: copy.projectsTable.headers.dueDate },
  ];
  const [visibleColumns, setVisibleColumns] = useState(() => new Set(columns.map((column) => column.id)));
  const [sortState, setSortState] = useState<SortState>({ columnId: 'health', direction: 'desc' });
  const normalizedQuery = normalizeSearch(query);
  const filteredRows = useMemo(() => rows.filter((row) => normalizeSearch(`${row.projectName} ${row.projectFolio ?? ''}`).includes(normalizedQuery)), [normalizedQuery, rows]);
  const sortedRows = useMemo(() => sortRows(filteredRows, sortState, (row, columnId) => {
    switch (columnId) {
      case 'project': return row.projectName;
      case 'health': return row.healthScore;
      case 'progress': return row.averageCompletion;
      case 'tasks': return row.totalTasks;
      case 'audit': return row.auditRate;
      case 'dueDate': return row.dueDate;
      default: return row.projectName;
    }
  }, locale), [filteredRows, locale, sortState]);
  const pagination = useTablePagination({ resetKey: `${query}:${sortState.columnId}:${sortState.direction}`, rows: sortedRows });
  const handleSort = (columnId: string) => setSortState((current) => ({ columnId, direction: current.columnId === columnId && current.direction === 'asc' ? 'desc' : 'asc' }));
  const toggleColumn = (columnId: string) => setVisibleColumns((current) => {
    const next = new Set(current);
    if (next.has(columnId)) { if (next.size > 1) next.delete(columnId); } else next.add(columnId);
    return next;
  });

  return (
    <>
      <div className="flex justify-end border-b border-slate-200 px-4 py-3 dark:border-slate-700"><ColumnsMenu agendaCopy={agendaCopy} columns={columns} onToggle={toggleColumn} visibleColumns={visibleColumns} /></div>
      <div className="overflow-x-auto">
        <Table className="min-w-[880px]">
          <TableHeader><TableRow className="border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/50">
            {columns.map((column) => visibleColumns.has(column.id) ? <SortableHead key={column.id} active={sortState.columnId === column.id} direction={sortState.direction} onSort={() => handleSort(column.id)}>{column.label}</SortableHead> : null)}
            <TableHead className="px-4 py-3 text-right">{agendaCopy.columns.actions.label}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {pagination.paginatedRows.map((row) => (
              <TableRow key={row.projectId} className="border-slate-100 dark:border-slate-700">
                {visibleColumns.has('project') ? <TableCell className="px-4 py-3"><p className="font-medium text-slate-900 dark:text-white">{row.projectName}</p><p className="text-xs text-slate-500 dark:text-slate-400">{row.projectFolio ?? copy.common.noFolio}</p></TableCell> : null}
                {visibleColumns.has('health') ? <TableCell className="px-4 py-3"><ScoreBar score={row.healthScore} status={row.status} /></TableCell> : null}
                {visibleColumns.has('progress') ? <TableCell className="px-4 py-3 text-sm">{row.averageCompletion}%</TableCell> : null}
                {visibleColumns.has('tasks') ? <TableCell className="px-4 py-3 text-sm">{copy.projectsTable.details.tasks(row.closedTasks, row.totalTasks, row.overdueTasks)}</TableCell> : null}
                {visibleColumns.has('audit') ? <TableCell className="px-4 py-3 text-sm">{copy.projectsTable.details.audit(row.auditRate, row.pendingAuditTasks)}</TableCell> : null}
                {visibleColumns.has('dueDate') ? <TableCell className="px-4 py-3 text-sm">{row.dueDate ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(`${row.dueDate}T00:00:00`)) : copy.common.noDate}</TableCell> : null}
                <TableCell className="px-4 py-3 text-right"><Button type="button" variant="outline" onClick={() => onOpenAgenda({ search: row.projectFolio ?? row.projectName })} className="h-9 gap-1 rounded-xl border-slate-200 px-3 text-sm font-medium shadow-none hover:border-[#F4C84A]/60 hover:bg-[#F4C84A]/10 dark:border-slate-700">{agendaCopy.header.title}<ChevronRight className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {pagination.totalCount === 0 ? <TableRow><TableCell colSpan={visibleColumns.size + 1} className="px-6 py-14 text-center text-sm text-slate-500 dark:text-slate-400">{copy.projectsTable.empty}</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </div>
      <Pagination agendaCopy={agendaCopy} copy={copy} pagination={pagination} />
    </>
  );
}

export function KpiPerformanceWorkspace({
  agendaCopy,
  collaborators,
  copy,
  onOpenAgenda,
  processes,
  projects,
}: {
  agendaCopy: AgendaTranslations;
  collaborators: CollaboratorPerformanceRow[];
  copy: KpisTranslations;
  onOpenAgenda: (params: Record<string, string>) => void;
  processes: ProcessPerformanceRow[];
  projects: ProjectPerformanceRow[];
}) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('collaborators');
  const query = '';
  const tabs: Array<{ id: WorkspaceTab; label: string; subtitle: string; count: number }> = [
    { id: 'collaborators', label: copy.collaboratorsTable.title, subtitle: copy.collaboratorsTable.subtitle, count: collaborators.length },
    { id: 'processes', label: copy.processesTable.title, subtitle: copy.processesTable.subtitle, count: processes.length },
    { id: 'projects', label: copy.projectsTable.title, subtitle: copy.projectsTable.subtitle, count: projects.length },
  ];
  const activeTabCopy = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-700 sm:px-5">
        <div>
          <div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">{activeTabCopy.label}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{activeTabCopy.subtitle}</p>
          </div>
        </div>
        <div className="mt-4 flex w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-900/70 sm:w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C84A]',
                activeTab === tab.id
                  ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white',
              )}
            >
              {activeTab === tab.id ? <Check className="h-4 w-4 text-[#9A6B05] dark:text-[#FEF3C7]" /> : null}
              {tab.label}
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-600">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'collaborators' ? <CollaboratorsTable agendaCopy={agendaCopy} copy={copy} locale={copy.locale} onOpenAgenda={onOpenAgenda} query={query} rows={collaborators} /> : null}
      {activeTab === 'processes' ? <ProcessesTable agendaCopy={agendaCopy} copy={copy} locale={copy.locale} onOpenAgenda={onOpenAgenda} query={query} rows={processes} /> : null}
      {activeTab === 'projects' ? <ProjectsTable agendaCopy={agendaCopy} copy={copy} locale={copy.locale} onOpenAgenda={onOpenAgenda} query={query} rows={projects} /> : null}
    </section>
  );
}
