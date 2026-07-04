import { CalendarDays, ChevronRight } from 'lucide-react';
import type { BusinessExchangeRatesPerUsd } from '../../../shared/businessCurrency';
import type { PosCashClosingSummaryRow } from '../types/cashClosingHistory.types';
import {
  formatClosingAmount,
  formatCurrency,
  formatDateLabel,
  formatDateTime,
  groupCortesByDate,
  toNumber,
} from '../utils/cortesUtils';

interface CortesDayViewProps {
  exchangeRatesPerUsd?: BusinessExchangeRatesPerUsd;
  preferredCurrency: string;
  rows: PosCashClosingSummaryRow[];
  onSelect: (row: PosCashClosingSummaryRow) => void;
}

export function CortesDayView({
  exchangeRatesPerUsd,
  preferredCurrency,
  rows,
  onSelect,
}: CortesDayViewProps) {
  const groups = groupCortesByDate(rows, preferredCurrency, exchangeRatesPerUsd);

  return (
    <section className="space-y-4">
      {groups.map((group) => (
        <article
          key={group.date}
          className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF6B5E]/10 text-[#FF6B5E]">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-black text-slate-950 dark:text-white">{formatDateLabel(`${group.date}T00:00:00`)}</h3>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {group.analytics.closingCount} corte(s) - {group.analytics.totalTickets} ticket(s)
                </p>
              </div>
            </div>

            <div className="grid gap-3 text-sm font-black text-slate-700 dark:text-slate-200 sm:grid-cols-3">
              <span>Preferida {group.analytics.convertedSalesLabel}</span>
              <span>Cobrado {group.analytics.totalSalesLabel}</span>
              <span className={group.analytics.convertedNetDifference === 0 ? 'text-emerald-600' : 'text-amber-700'}>
                Dif. {formatCurrency(group.analytics.convertedNetDifference, preferredCurrency)}
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {group.rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => onSelect(row)}
                className="flex w-full flex-col gap-3 px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/70 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-black text-slate-950 dark:text-white">
                    COR-{row.id} - Caja {row.cashRegisterId} - Almacen {row.warehouseId}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {formatDateTime(row.closedAt)} - Usuario {row.closedByUserId} - Turno {row.shiftId}
                  </p>
                </div>

                <div className="grid gap-2 text-sm font-black text-slate-700 dark:text-slate-200 sm:grid-cols-4 md:min-w-[520px]">
                  <span>{row.ticketsCount} tickets</span>
                  <span>
                    {formatClosingAmount(toNumber(row.totalSalesAmount), row, preferredCurrency, exchangeRatesPerUsd).nativeLabel}
                  </span>
                  <span>
                    Contado {formatClosingAmount(
                      toNumber(row.countedCashAmount),
                      row,
                      preferredCurrency,
                      exchangeRatesPerUsd,
                    ).nativeLabel}
                  </span>
                  <span className={toNumber(row.overShortAmount) === 0 ? 'text-emerald-600' : 'text-amber-700'}>
                    {toNumber(row.overShortAmount) > 0 ? '+' : ''}{formatClosingAmount(
                      toNumber(row.overShortAmount),
                      row,
                      preferredCurrency,
                      exchangeRatesPerUsd,
                    ).nativeLabel}
                  </span>
                </div>

                <ChevronRight className="hidden h-5 w-5 text-slate-400 md:block" />
              </button>
            ))}
          </div>
        </article>
      ))}

      {groups.length === 0 ? (
        <div className="rounded-[20px] border border-slate-200 bg-white px-6 py-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-lg font-black text-slate-950 dark:text-white">No hay dias con cortes visibles</p>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Ajusta el periodo para consultar cierres anteriores.
          </p>
        </div>
      ) : null}
    </section>
  );
}
