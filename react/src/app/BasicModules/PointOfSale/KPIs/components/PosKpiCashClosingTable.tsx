import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { PosCashClosingSummaryRow } from '../../shared/cashClosingHistory.types';

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function DifferencePill({ value, formatCurrency }: { value: number; formatCurrency: (amount: number) => string }) {
  const hasDifference = Math.abs(value) >= 1;
  const tone = hasDifference
    ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200';

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>{value > 0 ? '+' : ''}{formatCurrency(value)}</span>;
}

export function PosKpiCashClosingTable({
  formatCurrency,
  items,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: {
  formatCurrency: (amount: number) => string;
  items: PosCashClosingSummaryRow[];
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">Cierres que alimentan los KPIs</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Auditoria rapida de turnos, tickets, ventas y diferencias de caja.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span>Filas</span>
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
              <th className="px-5 py-4">Cierre</th>
              <th className="px-5 py-4">Caja</th>
              <th className="px-5 py-4">Almacen</th>
              <th className="px-5 py-4">Tickets</th>
              <th className="px-5 py-4">Venta total</th>
              <th className="px-5 py-4">Efectivo esperado</th>
              <th className="px-5 py-4">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Sin cierres para mostrar en el periodo.
                </td>
              </tr>
            ) : items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-5 py-4">
                  <p className="font-bold text-slate-950 dark:text-white">#{item.id}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(item.closedAt)}</p>
                </td>
                <td className="px-5 py-4 text-slate-700 dark:text-slate-200">Caja {item.cashRegisterId}</td>
                <td className="px-5 py-4 text-slate-700 dark:text-slate-200">Almacen {item.warehouseId}</td>
                <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">{item.ticketsCount}</td>
                <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">{formatCurrency(toNumber(item.totalSalesAmount))}</td>
                <td className="px-5 py-4 text-slate-700 dark:text-slate-200">{formatCurrency(toNumber(item.expectedCashAmount))}</td>
                <td className="px-5 py-4">
                  <DifferencePill value={toNumber(item.overShortAmount)} formatCurrency={formatCurrency} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pagina {page} / {totalPages} - {totalItems} cierres
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-9 rounded-lg border-slate-300 dark:border-slate-700" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <Button type="button" variant="outline" className="h-9 rounded-lg border-slate-300 dark:border-slate-700" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
