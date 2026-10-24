import { useMemo, useState, type ReactNode } from 'react';
import { IndiceOperationalTable, IndiceTableHeaderRow, IndiceTableShell, type IndiceTableColumnDefinition } from '../../../../../../components/table/IndiceTableEngine';
import { getIndiceTableMinimumColumnWidth } from '../../../../../../components/table/indiceTableColumnSizing';
import { DataTablePagination } from '../../../../../../components/table/DataTablePagination';
import { TableBody, TableCell, TableRow } from '../../../../../../components/ui/table';

export interface IncidentColumn<T> { id: string; label: string; width: number; action?: boolean; value: (row: T) => string | number; render?: (row: T) => ReactNode; }

export function IncidentReportTable<T>({ columns, rows, rowKey, mobile, itemLabel }: {
  columns: IncidentColumn<T>[]; rows: T[]; rowKey: (row: T) => string | number;
  mobile: (row: T) => ReactNode; itemLabel: string;
}) {
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [sort, setSort] = useState<{ columnId: string; direction: 'asc' | 'desc' }>({ columnId: columns[0].id, direction: 'asc' });
  const [page, setPage] = useState(1); const [size, setSize] = useState(20);
  const sorted = useMemo(() => {
    const column = columns.find(c => c.id === sort.columnId) ?? columns[0];
    return [...rows].sort((a, b) => {
      const left = column.value(a); const right = column.value(b);
      const result = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), undefined, { numeric: true });
      return result * (sort.direction === 'asc' ? 1 : -1);
    });
  }, [rows, columns, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / size)); const current = Math.min(page, pages);
  const slice = sorted.slice((current - 1) * size, current * size);
  const action = columns.find(c => c.action);
  const headers: IndiceTableColumnDefinition<string>[] = columns.filter(c => !c.action).map(c => ({
    id: c.id, label: c.label, width: Math.max(widths[c.id] ?? c.width, getIndiceTableMinimumColumnWidth({ label: c.label, sortable: true, contentMinimumWidth: 100 })), defaultWidth: c.width,
    contentMinimumWidth: 100, sortable: true, resizeLabel: c.label,
  }));
  return <IndiceTableShell pagination={<DataTablePagination currentPage={current} itemLabel={itemLabel}
    onPageChange={setPage} onPageSizeChange={v => { setSize(v); setPage(1); }} pageSize={size} pageSizeOptions={[10, 20, 50, 100]}
    pageStart={rows.length ? (current - 1) * size + 1 : 0} pageEnd={Math.min(current * size, rows.length)} totalCount={rows.length} totalPages={pages} />}>
    <div className="hidden md:block [&_th:first-child]:sticky [&_th:first-child]:left-0 [&_th:first-child]:z-20 [&_th:first-child]:bg-slate-50 [&_td:first-child]:sticky [&_td:first-child]:left-0 [&_td:first-child]:z-10 [&_td:first-child]:bg-white dark:[&_th:first-child]:bg-slate-900 dark:[&_td:first-child]:bg-slate-800"><IndiceOperationalTable minimumWidth={headers.reduce((sum, c) => sum + c.width, 0) + (action?.width ?? 0)}>
      <IndiceTableHeaderRow columns={headers} tone="aqua" sortState={sort}
        actions={action ? { label: action.label, width: action.width, className: 'sticky right-0 z-20 bg-slate-50 dark:bg-slate-900' } : undefined}
        onResize={(id, width) => setWidths(w => ({ ...w, [id]: width }))}
        onSort={id => { setSort(s => ({ columnId: id, direction: s.columnId === id && s.direction === 'asc' ? 'desc' : 'asc' })); setPage(1); }} />
      <TableBody>{slice.map(row => <TableRow key={rowKey(row)}>{columns.map(c => <TableCell key={c.id} className={`px-4 py-3 whitespace-normal break-words align-top text-sm ${c.action ? 'sticky right-0 z-10 bg-white text-right dark:bg-slate-800' : ''}`}>
        {c.render ? c.render(row) : c.value(row)}
      </TableCell>)}</TableRow>)}</TableBody>
    </IndiceOperationalTable></div>
    <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-700">{slice.map(row => <article className="min-w-0 space-y-3 p-4" key={rowKey(row)}>{mobile(row)}</article>)}</div>
  </IndiceTableShell>;
}
