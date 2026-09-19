import { Search, Users } from 'lucide-react';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import { useTablePagination } from '../../../../hooks/useTablePagination';

export type HrEmployeeOperationsRow = {
  id: number;
  position: number;
  name: string;
  meta: string;
  attendance: string;
  permissions: number | string;
  records: number | string;
  assets: number | string;
  signalCount: number | string;
  status: 'healthy' | 'watch' | 'critical' | 'unavailable';
};

type Labels = {
  title: string;
  subtitle: string;
  employee: string;
  attendance: string;
  permissions: string;
  records: string;
  assets: string;
  readiness: string;
  noRows: string;
  focus: string;
  statuses: Record<HrEmployeeOperationsRow['status'], string>;
  pagination: { next: string; previous: string; rows: string; item: string };
};

const badgeClasses: Record<HrEmployeeOperationsRow['status'], string> = {
  healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
  watch: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  critical: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300',
  unavailable: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300',
};

export function HrEmployeeOperationsTable({
  labels,
  onFocus,
  resetKey,
  rows,
}: {
  labels: Labels;
  onFocus: (row: HrEmployeeOperationsRow) => void;
  resetKey: string;
  rows: HrEmployeeOperationsRow[];
}) {
  const pagination = useTablePagination({ rows, initialPageSize: 10, resetKey });
  const paginationCopy = labels.pagination;

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-medium text-slate-900 dark:text-white">{labels.title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{labels.subtitle}</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
          <Users className="h-4 w-4" /> {rows.length}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left">
          <thead className="bg-slate-50 text-xs font-medium text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
            <tr>
              <th className="px-5 py-4">#</th>
              <th className="px-5 py-4">{labels.employee}</th>
              <th className="px-5 py-4">{labels.readiness}</th>
              <th className="px-5 py-4">{labels.attendance}</th>
              <th className="px-5 py-4">{labels.permissions}</th>
              <th className="px-5 py-4">{labels.records}</th>
              <th className="px-5 py-4">{labels.assets}</th>
              <th className="px-5 py-4">{labels.focus}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {pagination.paginatedRows.map(row => (
              <tr key={row.id} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10">
                <td className="px-5 py-4 text-lg font-medium text-slate-800 dark:text-white">#{row.position}</td>
                <td className="px-5 py-4"><p className="font-medium text-slate-900 dark:text-white">{row.name}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{row.meta}</p></td>
                <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="font-medium text-slate-900 dark:text-white">{row.signalCount}</span><span className={`rounded-full border px-2 py-1 text-[11px] font-medium ${badgeClasses[row.status]}`}>{labels.statuses[row.status]}</span></div></td>
                <td className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">{row.attendance}</td>
                <td className="px-5 py-4 text-sm font-medium text-amber-600 dark:text-amber-300">{row.permissions}</td>
                <td className="px-5 py-4 text-sm font-medium text-rose-600 dark:text-rose-300">{row.records}</td>
                <td className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">{row.assets}</td>
                <td className="px-5 py-4"><button type="button" onClick={() => onFocus(row)} aria-label={`${labels.focus}: ${row.name}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300"><Search className="h-4 w-4" />{labels.focus}</button></td>
              </tr>
            ))}
            {pagination.totalCount === 0 ? <tr><td colSpan={8} className="px-5 py-12 text-center text-sm font-medium text-slate-500 dark:text-slate-400">{labels.noRows}</td></tr> : null}
          </tbody>
        </table>
      </div>
      <DataTablePagination
        currentPage={pagination.currentPage}
        itemLabel={paginationCopy.item}
        labels={{
          next: paginationCopy.next,
          previous: paginationCopy.previous,
          rowsPerPage: paginationCopy.rows,
          page: (current, total) => `${current} / ${total}`,
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
    </section>
  );
}
