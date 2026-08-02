import { Archive, Clock, Play, Trash2 } from 'lucide-react';
import type { Payment, SaleItem } from '../types/sale.types';

export interface SuspendedSale {
  id: string;
  title: string;
  items: SaleItem[];
  payments: Payment[];
  total: number;
  createdAt: Date;
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function SuspendedSalesPanel({
  suspendedSales,
  canSuspend,
  onSuspend,
  onResume,
  onDiscard,
  formatCurrency,
}: {
  suspendedSales: SuspendedSale[];
  canSuspend: boolean;
  onSuspend: () => void;
  onResume: (saleId: string) => void;
  onDiscard: (saleId: string) => void;
  formatCurrency: (amount: number) => string;
}) {
  const hasSuspendedSales = suspendedSales.length > 0;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
            <Archive className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Tickets pausados</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {hasSuspendedSales ? `${suspendedSales.length} ticket${suspendedSales.length === 1 ? '' : 's'} en espera` : 'Sin tickets en espera'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSuspend}
          disabled={!canSuspend}
          className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Pausar
        </button>
      </div>

      {hasSuspendedSales && (
        <div className="mt-3 space-y-2">
          {suspendedSales.slice(0, 3).map((sale) => (
            <div key={sale.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{sale.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="h-3 w-3" />
                    {formatTime(sale.createdAt)} · {sale.items.length} linea{sale.items.length === 1 ? '' : 's'}
                  </p>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(sale.total)}</p>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => onResume(sale.id)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900"
                >
                  <Play className="h-3.5 w-3.5" />
                  Reanudar
                </button>
                <button
                  type="button"
                  onClick={() => onDiscard(sale.id)}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-700 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                  aria-label="Descartar ticket pausado"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
