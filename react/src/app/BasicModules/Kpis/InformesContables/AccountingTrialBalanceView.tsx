import { useEffect, useMemo, useState } from 'react';
import { Columns3, ExternalLink, Search } from 'lucide-react';
import { ColumnasConfigModal, type ColumnConfig } from '../../../components/rh/ColumnasConfigModal';
import { DataTablePagination } from '../../../components/table/DataTablePagination';
import {
  getIndiceTableMinimumWidth, IndiceOperationalTable, IndiceTableColGroup,
  IndiceTableHeaderRow, IndiceTableShell, type IndiceTableSortDirection,
} from '../../../components/table/IndiceTableEngine';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { TableBody, TableCell, TableRow } from '../../../components/ui/table';
import { DEFAULT_TABLE_PAGE_SIZE_OPTIONS } from '../../../hooks/useTablePagination';
import type { AccountingReportCopy } from './accountingReportTranslations';
import type { AccountingReport } from './accountingReportsApi';
import { formatAccountingMoney } from './AccountingReportViews';

type Row = AccountingReport['trialBalance'][number];
type ColumnId = 'code' | 'name' | 'type' | 'debit' | 'credit' | 'balance' | 'journals';
type SortState = { columnId: ColumnId; direction: IndiceTableSortDirection };

const baseColumns: Array<ColumnConfig & { id: ColumnId; width: number; alignment?: 'left' | 'right' }> = [
  { id: 'code', label: 'Cuenta', visible: true, locked: true, width: 135 },
  { id: 'name', label: 'Nombre', visible: true, locked: true, width: 260 },
  { id: 'type', label: 'Tipo', visible: true, width: 150 },
  { id: 'debit', label: 'Débito', visible: true, width: 150, alignment: 'right' },
  { id: 'credit', label: 'Crédito', visible: true, width: 150, alignment: 'right' },
  { id: 'balance', label: 'Saldo', visible: true, width: 165, alignment: 'right' },
  { id: 'journals', label: 'Asientos', visible: true, width: 110, alignment: 'right' },
];

export function AccountingTrialBalanceView({ copy, data, locale, onOpenAccount }: {
  copy: AccountingReportCopy; data: AccountingReport; locale: string; onOpenAccount: (accountId: number) => void;
}) {
  const localizedBase = useMemo(() => baseColumns.map((column) => ({ ...column, label: copy.trial[column.id] })), [copy]);
  const [columns, setColumns] = useState(localizedBase);
  const [widths, setWidths] = useState<Record<ColumnId, number>>(() => Object.fromEntries(baseColumns.map((column) => [column.id, column.width])) as Record<ColumnId, number>);
  const [sort, setSort] = useState<SortState>({ columnId: 'code', direction: 'asc' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [columnsOpen, setColumnsOpen] = useState(false);

  useEffect(() => { setColumns((current) => localizedBase.map((column) => ({ ...column, visible: current.find((item) => item.id === column.id)?.visible ?? column.visible }))); }, [localizedBase]);
  const visible = columns.filter((column) => column.visible);
  const rows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(locale);
    const filtered = query ? data.trialBalance.filter((row) => `${row.accountCode} ${row.accountName} ${row.accountType}`.toLocaleLowerCase(locale).includes(query)) : data.trialBalance;
    return [...filtered].sort((left, right) => compareRows(left, right, sort));
  }, [data.trialBalance, locale, search, sort]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = rows.slice(start, start + pageSize);
  useEffect(() => { setPage(1); }, [search, pageSize]);
  useEffect(() => { setPage((value) => Math.min(value, totalPages)); }, [totalPages]);

  const definitions = visible.map((column) => ({
    id: column.id,
    label: column.label,
    width: widths[column.id], defaultWidth: column.width, contentMinimumWidth: column.id === 'name' ? 180 : 100,
    alignment: column.alignment, sortable: true, resizeLabel: `${copy.trial.resize}: ${column.label}`,
  }));
  const minimumWidth = getIndiceTableMinimumWidth({ columns: definitions, actionsWidth: 76 });
  const toggleSort = (columnId: ColumnId) => setSort((current) => ({ columnId, direction: current.columnId === columnId && current.direction === 'asc' ? 'desc' : 'asc' }));

  return <div className="space-y-3">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.trial.search} className="h-11 rounded-xl pl-10" /></div><Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setColumnsOpen(true)}><Columns3 className="h-4 w-4" />{copy.actions.columns}</Button></div>
    <IndiceTableShell pagination={<DataTablePagination currentPage={safePage} onPageChange={setPage} onPageSizeChange={setPageSize} pageEnd={Math.min(start + pageSize, rows.length)} pageSize={pageSize} pageSizeOptions={DEFAULT_TABLE_PAGE_SIZE_OPTIONS} pageStart={rows.length ? start + 1 : 0} totalCount={rows.length} totalPages={totalPages} labels={{ rowsPerPage: copy.trial.rowsPerPage, previous: copy.actions.previous, next: copy.actions.next, page: (current, total) => `${copy.trial.page} ${current} ${copy.trial.of} ${total}` }} />}>
      <IndiceOperationalTable minimumWidth={minimumWidth}>
        <IndiceTableColGroup columns={definitions} actionsWidth={76} />
        <IndiceTableHeaderRow columns={definitions} actions={{ label: copy.common.detail, width: 76 }} tone="blue" sortState={sort} onSort={toggleSort} onResize={(id, width) => setWidths((current) => ({ ...current, [id]: width }))} />
        <TableBody>{paged.map((row) => <TableRow key={row.accountId} className="cursor-pointer" tabIndex={0} onClick={() => onOpenAccount(row.accountId)} onKeyDown={(event) => { if (event.key === 'Enter') onOpenAccount(row.accountId); }}>{visible.map((column) => <TableCell key={column.id} className={`px-4 py-3 ${column.alignment === 'right' ? 'text-right tabular-nums' : ''}`}>{renderCell(column.id, row, data.context.presentationCurrency, locale, copy)}</TableCell>)}<TableCell className="px-3 text-right"><Button type="button" variant="ghost" size="icon" aria-label={copy.trial.openDetail} onClick={(event) => { event.stopPropagation(); onOpenAccount(row.accountId); }}><ExternalLink className="h-4 w-4" /></Button></TableCell></TableRow>)}{!paged.length ? <TableRow><TableCell colSpan={visible.length + 1} className="h-28 text-center text-sm text-slate-500">{copy.trial.empty}</TableCell></TableRow> : null}</TableBody>
      </IndiceOperationalTable>
    </IndiceTableShell>
    {columnsOpen ? <ColumnasConfigModal isOpen columns={columns} defaultColumns={localizedBase} theme="platformAdmin" onClose={() => setColumnsOpen(false)} onSave={(next) => { setColumns(next as typeof columns); setColumnsOpen(false); }} /> : null}
  </div>;
}

function renderCell(id: ColumnId, row: Row, currency: string, locale: string, copy: AccountingReportCopy) {
  if (id === 'code') return <span className="font-mono text-xs text-blue-700 dark:text-blue-300">{row.accountCode}</span>;
  if (id === 'name') return <span className="font-medium text-slate-950 dark:text-white">{row.accountName}</span>;
  if (id === 'type') return copy.accountTypes[row.accountType] ?? row.accountType;
  if (id === 'journals') return row.journalCount;
  return formatAccountingMoney(row[id], currency, locale);
}

function compareRows(left: Row, right: Row, sort: SortState) {
  const values: Record<ColumnId, [string | number, string | number]> = {
    code: [left.accountCode, right.accountCode], name: [left.accountName, right.accountName],
    type: [left.accountType, right.accountType], debit: [left.debit, right.debit], credit: [left.credit, right.credit],
    balance: [left.balance, right.balance], journals: [left.journalCount, right.journalCount],
  };
  const [a, b] = values[sort.columnId];
  const result = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
  return sort.direction === 'asc' ? result : -result;
}
