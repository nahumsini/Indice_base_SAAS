import { CalendarDays, ChevronRight } from 'lucide-react';
import type { PosCashClosingSummaryRow } from '../types/cashClosingHistory.types';
import { formatCurrency, formatDateLabel, formatDateTime, groupCortesByDate, toNumber } from '../utils/cortesUtils';

interface CortesDayViewProps {
  currencyCode?: string;
  rows: PosCashClosingSummaryRow[];
  onSelect: (row: PosCashClosingSummaryRow) => void;
}

export function CortesDayView({
  currencyCode = 'MXN',
  rows,
  onSelect,
}: CortesDayViewProps) {
  const groups = groupCortesByDate(rows);

  return (
    <section className="space-y-4">
      {groups.map((group) => (
        <article
          key={group.date}
          className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF6B5E]/10 text-[#FF6B5E]">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-black text-slate-950 dark:text-white">{formatDateLabel(`${group.date}T00:00:00`)}</h3>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {group.analytics.closingCount} corte(s) · {group.analytics.totalTickets} ticket(s)
                </p>
              </div>
            </div>

            <div className="grid gap-3 text-sm font-black text-slate-700 dark:text-slate-200 sm:grid-cols-3">
              <span>Ventas {formatCurrency(group.analytics.totalSales, currencyCode)}</span>
              <span>Esperado {formatCurrency(group.analytics.expectedCash, currencyCode)}</span>
              <span className={group.analytics.netDifference === 0 ? 'text-emerald-600' : 'text-amber-700'}>
                Dif. {formatCurrency(group.analytics.netDifference, currencyCode)}
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {group.rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => onSelect(row)}
                className="flex w-full flex-col gap-3 px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/40 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-black text-slate-950 dark:text-white">
                    COR-{row.id} · Caja {row.cashRegisterId} · Almacén {row.warehouseId}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {formatDateTime(row.closedAt)} · Usuario {row.closedByUserId} · Turno {row.shiftId}
                  </p>
                </div>

                <div className="grid gap-2 text-sm font-black text-slate-700 dark:text-slate-200 sm:grid-cols-4 md:min-w-[520px]">
                  <span>{row.ticketsCount} tickets</span>
                  <span>{formatCurrency(toNumber(row.totalSalesAmount), currencyCode)}</span>
                  <span>Contado {formatCurrency(toNumber(row.countedCashAmount), currencyCode)}</span>
                  <span className={toNumber(row.overShortAmount) === 0 ? 'text-emerald-600' : 'text-amber-700'}>
                    {toNumber(row.overShortAmount) > 0 ? '+' : ''}{formatCurrency(toNumber(row.overShortAmount), currencyCode)}
                  </span>
                </div>

                <ChevronRight className="hidden h-5 w-5 text-slate-400 md:block" />
              </button>
            ))}
          </div>
        </article>
      ))}

      {groups.length === 0 ? (
        <div className="rounded-[20px] border border-slate-200 bg-white px-6 py-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-lg font-black text-slate-950 dark:text-white">No hay días con cortes visibles</p>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Ajusta el periodo para consultar cierres anteriores.
          </p>
        </div>
      ) : null}
    </section>
  );
}
