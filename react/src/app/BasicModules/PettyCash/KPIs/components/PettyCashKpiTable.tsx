import { useMemo } from 'react';
import { useTablePagination } from '../../../../hooks/useTablePagination';
import { PettyCashEmptyState, PettyCashPagination, PettyCashSortableHeader } from '../../components/PettyCashShared';
import type { PettyCashKpiCopy } from '../workspaceCopy';

export type KpiTableRow = { id: string; cells: string[]; values?: Array<string | number | null> };
export type KpiTableModel = { id: string; title: string; description: string; columns: string[]; rows: KpiTableRow[]; sortable: number[] };
export type KpiTablePreference = { currentPage: number; pageSize: number; sortKey: string; sortDirection: 'asc' | 'desc' };
export const defaultTablePreference: KpiTablePreference = { currentPage: 1, pageSize: 10, sortKey: '0', sortDirection: 'asc' };
export function normalizeTablePreferences(value: unknown): Record<string, KpiTablePreference> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key]) => ['units', 'funds', 'responsibles', 'statements', 'receipts', 'movements', 'balances'].includes(key)).map(([key, raw]) => {
    const row = (raw && typeof raw === 'object' ? raw : {}) as Partial<KpiTablePreference>;
    return [key, { currentPage: Number.isInteger(row.currentPage) && row.currentPage! > 0 ? row.currentPage! : 1,
      pageSize: [10, 25, 50, 100, 200].includes(row.pageSize!) ? row.pageSize! : 10,
      sortKey: typeof row.sortKey === 'string' && /^\d$/.test(row.sortKey) ? row.sortKey : '0', sortDirection: row.sortDirection === 'desc' ? 'desc' : 'asc' }];
  }));
}

export function PettyCashKpiTable({ model, copy, locale, preference = defaultTablePreference, onPreference, onSelect }: {
  model: KpiTableModel; copy: PettyCashKpiCopy; locale: string; preference?: KpiTablePreference;
  onPreference: (value: KpiTablePreference) => void; onSelect?: (id: string) => void;
}) {
  const sortIndex = model.sortable.includes(Number(preference.sortKey)) ? Number(preference.sortKey) : model.sortable[0];
  const rows = useMemo(() => [...model.rows].sort((a, b) => {
    const left = a.values?.[sortIndex] ?? a.cells[sortIndex];
    const right = b.values?.[sortIndex] ?? b.cells[sortIndex];
    const order = typeof left === 'number' && typeof right === 'number' ? left - right : String(left ?? '').localeCompare(String(right ?? ''), locale, { numeric: true });
    return order * (preference.sortDirection === 'desc' ? -1 : 1);
  }), [model.rows, sortIndex, preference.sortDirection, locale]);
  const pagination = useTablePagination({ rows, controlledCurrentPage: preference.currentPage, controlledPageSize: preference.pageSize,
    onPaginationChange: next => onPreference({ ...preference, ...next }) });
  const onSort = (key: string) => onPreference({ ...preference, currentPage: 1, sortKey: key, sortDirection: preference.sortKey === key && preference.sortDirection === 'asc' ? 'desc' : 'asc' });
  const name = (row: KpiTableRow) => onSelect ? <button type="button" onClick={() => onSelect(row.id)} className="rounded text-left font-medium text-[#147514] hover:underline focus-visible:ring-2 focus-visible:ring-[#147514] dark:text-emerald-300">{row.cells[0]}</button> : row.cells[0];
  return <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
    <div className="border-b border-slate-100 p-5 dark:border-slate-700"><h3 className="text-lg font-medium text-slate-950 dark:text-white">{model.title} <span className="ml-2 text-sm text-slate-500">({model.rows.length.toLocaleString(locale)})</span></h3><p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{model.description}</p></div>
    <div className="space-y-3 p-3 md:hidden">{pagination.paginatedRows.map(row => <article key={row.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><h4 className="text-sm font-medium text-slate-900 dark:text-white">{name(row)}</h4><dl className="mt-3 grid grid-cols-2 gap-3">{model.columns.slice(1).map((column, index) => <div key={index}><dt className="text-xs text-slate-500 dark:text-slate-400">{column}</dt><dd className="mt-1 break-words text-sm text-slate-800 dark:text-slate-200">{row.cells[index + 1]}</dd></div>)}</dl></article>)}</div>
    <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50"><tr>{model.columns.map((column, index) => model.sortable.includes(index)
      ? <PettyCashSortableHeader key={index} columnKey={String(index)} label={column} onSort={onSort} sortDirection={preference.sortDirection} sortKey={String(sortIndex)} />
      : <th key={index} className="whitespace-nowrap px-5 py-4 font-medium text-slate-500">{column}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{pagination.paginatedRows.map(row => <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">{row.cells.map((cell, index) => <td key={index} className="px-5 py-4 align-top text-slate-700 dark:text-slate-200">{index === 0 ? name(row) : cell}</td>)}</tr>)}</tbody></table></div>
    {model.rows.length === 0 ? <div className="p-5"><PettyCashEmptyState label={copy.empty} /></div> : null}
    <PettyCashPagination currentPage={pagination.currentPage} itemLabel={model.title} onPageChange={pagination.onPageChange} onPageSizeChange={pagination.onPageSizeChange} pageEnd={pagination.pageEnd} pageSize={pagination.pageSize} pageSizeOptions={pagination.pageSizeOptions} pageStart={pagination.pageStart} totalCount={pagination.totalCount} totalPages={pagination.totalPages} />
  </section>;
}
