import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { PosCashClosingSummaryRow } from '../../shared/cashClosingHistory.types';
import type { PosKpiCopy } from '../posKpiTranslations';

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function DifferencePill({ value, currency, formatCurrency }: { value: number; currency: string; formatCurrency: (amount: number, currency?: string) => string }) {
  const hasDifference = Math.abs(value) >= 1;
  const tone = hasDifference
    ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200';

  return <span className={`rounded-full border px-3 py-1 text-xs font-medium ${tone}`}>{value > 0 ? '+' : ''}{formatCurrency(value, currency)}</span>;
}

export function PosKpiCashClosingTable({
  copy,
  formatCurrency,
  items,
  locale,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: {
  copy: PosKpiCopy;
  formatCurrency: (amount: number, currency?: string) => string;
  items: PosCashClosingSummaryRow[];
  locale: string;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-950 dark:text-white">{copy.table.title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.table.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span>{copy.table.rows}</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-11 rounded-xl border border-slate-300 bg-white px-2 text-sm font-medium outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            {[10, 25, 50, 100, 200].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] text-left text-sm">
          <thead className="bg-slate-50 text-xs tracking-normal text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr>
              {copy.table.columns.map((column) => (
                <th key={column} className="px-5 py-4">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                  {copy.table.empty}
                </td>
              </tr>
            ) : items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-5 py-4">
                  <p className="font-medium text-slate-950 dark:text-white">#{item.id}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(item.closedAt, locale)}</p>
                </td>
                <td className="px-5 py-4 text-slate-700 dark:text-slate-200">{copy.common.cashRegister(item.cashRegisterId)}</td>
                <td className="px-5 py-4 text-slate-700 dark:text-slate-200">{copy.common.warehouse(item.warehouseId)}</td>
                <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">{item.ticketsCount}</td>
                <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">{formatCurrency(toNumber(item.totalSalesAmount), item.currencyCode)}</td>
                <td className="px-5 py-4 text-slate-700 dark:text-slate-200">{formatCurrency(toNumber(item.expectedCashAmount), item.currencyCode)}</td>
                <td className="px-5 py-4">
                  <DifferencePill value={toNumber(item.overShortAmount)} currency={item.currencyCode ?? 'MXN'} formatCurrency={formatCurrency} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {copy.table.pageSummary(page, totalPages, totalItems)}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-11 rounded-xl border-slate-300 dark:border-slate-700" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
            {copy.common.previous}
          </Button>
          <Button type="button" variant="outline" className="h-11 rounded-xl border-slate-300 dark:border-slate-700" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            {copy.common.next}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
