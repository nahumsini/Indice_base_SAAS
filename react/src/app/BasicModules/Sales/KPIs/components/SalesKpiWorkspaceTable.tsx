import { useMemo } from 'react';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import { useTablePagination } from '../../../../hooks/useTablePagination';
import type { SalesKpiWorkspaceCopy } from '../salesKpiWorkspaceCopy';
import type { SalesKpiTablePreference } from '../salesKpiWorkspaceSelectors';

export type SalesKpiWorkspaceTableRow = { id: string; cells: string[]; values?: Array<string | number | null> };
export type SalesKpiWorkspaceTableModel = {
  id: 'sellers' | 'units' | 'opportunities';
  title: string;
  description: string;
  columns: string[];
  rows: SalesKpiWorkspaceTableRow[];
  sortable: number[];
};

const defaultPreference: SalesKpiTablePreference = { currentPage: 1, pageSize: 10, sortKey: '0', sortDirection: 'desc' };

export function SalesKpiWorkspaceTable({ model, copy, locale, preference = defaultPreference, onPreference }: {
  model: SalesKpiWorkspaceTableModel;
  copy: SalesKpiWorkspaceCopy;
  locale: string;
  preference?: SalesKpiTablePreference;
  onPreference: (value: SalesKpiTablePreference) => void;
}) {
  const fallbackIndex = model.sortable[0] ?? 0;
  const sortIndex = model.sortable.includes(Number(preference.sortKey)) ? Number(preference.sortKey) : fallbackIndex;
  const rows = useMemo(() => [...model.rows].sort((left, right) => {
    const a = left.values?.[sortIndex] ?? left.cells[sortIndex];
    const b = right.values?.[sortIndex] ?? right.cells[sortIndex];
    const comparison = typeof a === 'number' && typeof b === 'number'
      ? a - b
      : String(a ?? '').localeCompare(String(b ?? ''), locale, { numeric: true, sensitivity: 'base' });
    const directed = preference.sortDirection === 'desc' ? -comparison : comparison;
    return directed || left.id.localeCompare(right.id, locale, { numeric: true });
  }), [locale, model.rows, preference.sortDirection, sortIndex]);
  const pagination = useTablePagination({
    rows,
    controlledCurrentPage: preference.currentPage,
    controlledPageSize: preference.pageSize,
    onPaginationChange: (next) => onPreference({ ...preference, ...next }),
  });
  const onSort = (index: number) => onPreference({
    ...preference,
    currentPage: 1,
    sortKey: String(index),
    sortDirection: preference.sortKey === String(index) && preference.sortDirection === 'desc' ? 'asc' : 'desc',
  });

  return <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
    <div className="border-b border-slate-100 p-5 dark:border-slate-700">
      <h3 className="text-lg font-medium text-slate-950 dark:text-white">{model.title} <span className="ml-2 text-sm text-slate-500">({model.rows.length.toLocaleString(locale)})</span></h3>
      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{model.description}</p>
    </div>
    <div className="space-y-3 p-3 md:hidden">
      {pagination.paginatedRows.map((row) => <article key={row.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <h4 className="text-sm font-medium text-slate-900 dark:text-white">{row.cells[0]}</h4>
        <dl className="mt-3 grid grid-cols-2 gap-3">{model.columns.slice(1).map((column, index) => <div key={column}>
          <dt className="text-xs text-slate-500 dark:text-slate-400">{column}</dt><dd className="mt-1 break-words text-sm text-slate-800 dark:text-slate-200">{row.cells[index + 1]}</dd>
        </div>)}</dl>
      </article>)}
    </div>
    <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm">
      <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50"><tr>{model.columns.map((column, index) => <th key={column} className="whitespace-nowrap px-5 py-4 font-medium text-slate-500">
        {model.sortable.includes(index) ? <button type="button" className="rounded hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-[#FF6B5E] dark:hover:text-white" onClick={() => onSort(index)}>{column}{sortIndex === index ? (preference.sortDirection === 'desc' ? ' ↓' : ' ↑') : ''}</button> : column}
      </th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">{pagination.paginatedRows.map((row) => <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">{row.cells.map((cell, index) => <td key={`${row.id}-${index}`} className="px-5 py-4 align-top text-slate-700 dark:text-slate-200">{cell}</td>)}</tr>)}</tbody>
    </table></div>
    {model.rows.length === 0 ? <p className="p-5 text-sm text-slate-500">{copy.empty}</p> : null}
    <DataTablePagination
      currentPage={pagination.currentPage}
      itemLabel={copy.pagination.records}
      labels={{ next: copy.pagination.next, previous: copy.pagination.previous, rowsPerPage: copy.pagination.rows, page: copy.pagination.page }}
      onPageChange={pagination.onPageChange}
      onPageSizeChange={pagination.onPageSizeChange}
      pageEnd={pagination.pageEnd}
      pageSize={pagination.pageSize}
      pageSizeOptions={pagination.pageSizeOptions}
      pageStart={pagination.pageStart}
      totalCount={pagination.totalCount}
      totalPages={pagination.totalPages}
    />
  </section>;
}
