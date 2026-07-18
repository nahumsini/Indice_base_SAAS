import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { SalesOpportunity } from '../../types';
import { formatSalesCurrencyAmount } from '../../utils/salesCurrency';
import { parseSalesKpiMoney } from '../salesKpiSelectors';
import type { SalesKpisTranslations } from '../translations';

function StatusPill({ label }: { label: string }) {
  const tone = label === 'Overdue'
    ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200'
    : label === 'Closed'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
      : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200';

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}

export function SalesProspectsPerformanceTable({
  copy,
  items,
  page,
  pageSize,
  preferredCurrency,
  totalItems,
  onPageChange,
  onPageSizeChange,
  formatPreferred,
}: {
  copy: SalesKpisTranslations;
  items: SalesOpportunity[];
  page: number;
  pageSize: number;
  preferredCurrency: string;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  formatPreferred: (value: number, currency?: string) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">{copy.prospectsTable.title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.prospectsTable.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span>{copy.pagination.rows}</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm font-semibold outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            {[10, 25, 50, 100, 200].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-normal text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr>
              <th className="px-5 py-4">{copy.prospectsTable.columns.prospect}</th>
              <th className="px-5 py-4">{copy.prospectsTable.columns.customer}</th>
              <th className="px-5 py-4">{copy.prospectsTable.columns.stage}</th>
              <th className="px-5 py-4">{copy.prospectsTable.columns.owner}</th>
              <th className="px-5 py-4">{copy.prospectsTable.columns.value}</th>
              <th className="px-5 py-4">{copy.prospectsTable.columns.nextAction}</th>
              <th className="px-5 py-4">{copy.prospectsTable.columns.status}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-5 py-4">
                  <p className="font-bold text-slate-950 dark:text-white">{item.opportunityName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.id}</p>
                </td>
                <td className="px-5 py-4 text-slate-700 dark:text-slate-200">{item.company}</td>
                <td className="px-5 py-4 text-slate-700 dark:text-slate-200">{item.stage}</td>
                <td className="px-5 py-4 text-slate-700 dark:text-slate-200">{item.owner}</td>
                <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                  <p>{formatPreferred(parseSalesKpiMoney(item.estimatedValue), item.currency)}</p>
                  {item.currency !== preferredCurrency ? (
                    <p className="text-xs font-medium text-slate-400">{copy.context.native}: {formatSalesCurrencyAmount(parseSalesKpiMoney(item.estimatedValue), item.currency)}</p>
                  ) : null}
                </td>
                <td className="px-5 py-4 text-slate-700 dark:text-slate-200">{item.nextAction} - {item.nextActionDate}</td>
                <td className="px-5 py-4">
                  <StatusPill label={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {copy.pagination.page} {page} / {totalPages} - {totalItems} {copy.pagination.records}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-9 rounded-lg border-slate-300 dark:border-slate-700" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
            {copy.pagination.previous}
          </Button>
          <Button type="button" variant="outline" className="h-9 rounded-lg border-slate-300 dark:border-slate-700" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            {copy.pagination.next}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
