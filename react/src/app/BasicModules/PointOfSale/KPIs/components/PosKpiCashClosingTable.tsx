import { ArrowDown, ArrowUp, ArrowUpDown, Eye } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PointOfSaleTablePagination } from '../../shared/components/PointOfSaleTablePagination';
import type { PosKpiCopy } from '../posKpiTranslations';
import type { PosKpiPerformanceRow } from '../utils/posKpiAnalytics';

type SortKey = 'sales' | 'tickets' | 'averageTicket' | 'closings' | 'cashAccuracy' | 'refunds' | 'lastClosingAt';
type SortDirection = 'asc' | 'desc';

function sortRows(rows: PosKpiPerformanceRow[], key: SortKey, direction: SortDirection) {
  return [...rows].sort((first, second) => {
    const firstValue = key === 'lastClosingAt' ? new Date(first.lastClosingAt).getTime() : first[key] ?? -1;
    const secondValue = key === 'lastClosingAt' ? new Date(second.lastClosingAt).getTime() : second[key] ?? -1;
    const result = Number(firstValue) - Number(secondValue);
    return direction === 'asc' ? result : -result;
  });
}

export function PosKpiCashClosingTable({
  copy,
  dateFrom,
  dateTo,
  formatCurrency,
  locale,
  rows,
}: {
  copy: PosKpiCopy;
  dateFrom: string;
  dateTo: string;
  formatCurrency: (amount: number) => string;
  locale: string;
  rows: PosKpiPerformanceRow[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>('sales');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const sortedRows = useMemo(() => sortRows(rows, sortKey, sortDirection), [rows, sortDirection, sortKey]);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = sortedRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, sortedRows.length);
  const visibleRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
    setPage(1);
  };

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <header className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h3 className="text-lg font-medium text-slate-950 dark:text-white">{copy.table.title}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.table.subtitle}</p>
      </header>
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="min-w-[1260px] table-fixed divide-y divide-slate-200 text-sm leading-5 dark:divide-slate-700">
          <colgroup>
            <col className="w-[260px]" />
            <col className="w-[130px]" />
            <col className="w-[110px]" />
            <col className="w-[150px]" />
            <col className="w-[110px]" />
            <col className="w-[140px]" />
            <col className="w-[130px]" />
            <col className="w-[200px]" />
            <col className="w-[110px]" />
          </colgroup>
          <thead className="bg-slate-50 text-[13px] font-normal leading-4 text-slate-500 dark:bg-slate-950/60 dark:text-slate-300">
            <tr className="h-[56px]">
              <th className="px-5 text-left font-normal">{copy.table.columns.register}</th>
              <SortableHead label={copy.table.columns.sales} column="sales" active={sortKey} direction={sortDirection} onSort={handleSort} align="right" />
              <SortableHead label={copy.table.columns.tickets} column="tickets" active={sortKey} direction={sortDirection} onSort={handleSort} align="right" />
              <SortableHead label={copy.table.columns.averageTicket} column="averageTicket" active={sortKey} direction={sortDirection} onSort={handleSort} align="right" />
              <SortableHead label={copy.table.columns.closings} column="closings" active={sortKey} direction={sortDirection} onSort={handleSort} align="right" />
              <SortableHead label={copy.table.columns.accuracy} column="cashAccuracy" active={sortKey} direction={sortDirection} onSort={handleSort} align="right" />
              <SortableHead label={copy.table.columns.refunds} column="refunds" active={sortKey} direction={sortDirection} onSort={handleSort} align="right" />
              <SortableHead label={copy.table.columns.lastClosing} column="lastClosingAt" active={sortKey} direction={sortDirection} onSort={handleSort} />
              <th className="px-4 text-right font-normal">{copy.table.columns.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700 dark:bg-slate-800">
            {visibleRows.map((row) => (
              <tr key={row.cashRegisterId} className="h-[76px] hover:bg-slate-50/80 dark:hover:bg-slate-700/40">
                <td className="px-5">
                  <p className="font-medium text-slate-950 dark:text-white">{row.cashRegisterName}</p>
                  <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{row.cashRegisterCode} · {row.warehouseName}</p>
                </td>
                <td className="px-4 text-right tabular-nums text-slate-800 dark:text-slate-100">{formatCurrency(row.sales)}</td>
                <td className="px-4 text-right tabular-nums text-slate-800 dark:text-slate-100">{row.tickets}</td>
                <td className="px-4 text-right tabular-nums text-slate-800 dark:text-slate-100">{formatCurrency(row.averageTicket)}</td>
                <td className="px-4 text-right tabular-nums text-slate-800 dark:text-slate-100">{row.closings}</td>
                <td className="px-4 text-right">
                  <AccuracyPill value={row.cashAccuracy} unavailable={copy.common.unavailable} />
                </td>
                <td className="px-4 text-right tabular-nums text-slate-800 dark:text-slate-100">{formatCurrency(row.refunds)}</td>
                <td className="px-4 text-slate-600 dark:text-slate-300">{dateFormatter.format(new Date(row.lastClosingAt))}</td>
                <td className="px-4 text-right">
                  <div className="inline-flex items-center justify-end rounded-xl border border-slate-200 bg-slate-50/80 p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
                    <a
                      href={`/point-of-sale/cortes?warehouseId=${row.warehouseId}&cashRegisterId=${row.cashRegisterId}&dateFrom=${dateFrom}&dateTo=${dateTo}`}
                      aria-label={copy.table.viewClosings(row.cashRegisterName)}
                      title={copy.table.viewClosings(row.cashRegisterName)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#B63B32] transition hover:bg-[#FF6B5E]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/35 dark:text-[#FFB0AA]"
                    >
                      <Eye className="h-4 w-4" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">{copy.table.empty}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <PointOfSaleTablePagination
        attached
        currentPage={currentPage}
        itemLabel={copy.table.itemLabel}
        onPageChange={setPage}
        onPageSizeChange={(nextSize) => {
          setPageSize(nextSize);
          setPage(1);
        }}
        pageEnd={pageEnd}
        pageSize={pageSize}
        pageStart={pageStart}
        totalCount={sortedRows.length}
        totalPages={totalPages}
      />
    </section>
  );
}

function SortableHead({
  active,
  align = 'left',
  column,
  direction,
  label,
  onSort,
}: {
  active: SortKey;
  align?: 'left' | 'right';
  column: SortKey;
  direction: SortDirection;
  label: string;
  onSort: (key: SortKey) => void;
}) {
  const Icon = active !== column ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={`px-4 font-normal ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap font-normal transition hover:text-[#B63B32] ${align === 'right' ? 'justify-end' : ''} ${active === column ? 'text-[#B63B32]' : ''}`}
      >
        {label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </th>
  );
}

function AccuracyPill({ unavailable, value }: { unavailable: string; value: number | null }) {
  if (value === null) {
    return <span className="text-sm text-slate-400">{unavailable}</span>;
  }
  const tone = value >= 99.5
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
    : value >= 98
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${tone}`}>{value.toFixed(1)}%</span>;
}
